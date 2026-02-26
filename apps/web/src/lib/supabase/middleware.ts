import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect locale-less public paths to default locale
  const publicPaths = ["/terms", "/privacy"];
  if (publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL(`/ja${pathname}`, request.url));
  }

  // Locale prefix detection: /ja, /en, etc.
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : "ja";
  const rawPathWithoutLocale = localeMatch
    ? pathname.slice(localeMatch[0].length - (localeMatch[2] === "/" ? 1 : 0))
    : pathname;
  const pathWithoutLocale =
    rawPathWithoutLocale === "" ? "/" : rawPathWithoutLocale;

  // Not logged in + accessing protected route → redirect to login
  if (
    !user &&
    pathWithoutLocale !== "/login" &&
    pathname !== "/" &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith(`/${locale}/privacy`) &&
    !pathname.startsWith(`/${locale}/terms`)
  ) {
    return NextResponse.redirect(
      new URL(`/${locale}/login`, request.url),
    );
  }

  // Logged in + accessing login → redirect to home
  if (user && pathWithoutLocale === "/login") {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return response;
}
