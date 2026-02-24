import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supportedLocales, defaultLocale } from "@swimhub-timer/i18n";

function resolveLocale(request: NextRequest): string {
  // 1. Check OAuth state parameter
  const state = new URL(request.url).searchParams.get("state");
  if (state && (supportedLocales as readonly string[]).includes(state)) {
    return state;
  }

  // 2. Check locale cookie
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (localeCookie && (supportedLocales as readonly string[]).includes(localeCookie)) {
    return localeCookie;
  }

  // 3. Check Accept-Language header
  const acceptLang = request.headers.get("Accept-Language");
  if (acceptLang) {
    const preferred = acceptLang
      .split(",")
      .map((part) => part.split(";")[0].trim().substring(0, 2).toLowerCase())
      .find((lang) => (supportedLocales as readonly string[]).includes(lang));
    if (preferred) {
      return preferred;
    }
  }

  return defaultLocale;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const locale = resolveLocale(request);

  if (!code) {
    return NextResponse.redirect(requestUrl.origin + `/${locale}/login?error=missing_code`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(requestUrl.origin + `/${locale}/login?error=config_error`);
  }

  type CookieToSet = {
    name: string;
    value: string;
    options?: Record<string, unknown>;
  };
  const cookiesToSet: CookieToSet[] = [];

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const storeCookies = cookieStore.getAll();
          const requestCookies = request.cookies.getAll().map((c) => ({
            name: c.name,
            value: c.value || "",
          }));

          const cookieMap = new Map(storeCookies.map((c) => [c.name, c.value]));
          requestCookies.forEach((c) => {
            if (!cookieMap.has(c.name)) {
              cookieMap.set(c.name, c.value);
            }
          });

          return Array.from(cookieMap.entries()).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(cookies: CookieToSet[]) {
          cookiesToSet.push(...cookies);
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback error:", error);
      const errorResponse = NextResponse.redirect(
        requestUrl.origin + `/${locale}/login?error=auth_failed`,
      );
      applyCookies(errorResponse, cookiesToSet);
      return errorResponse;
    }

    const successResponse = NextResponse.redirect(requestUrl.origin + `/${locale}`);
    applyCookies(successResponse, cookiesToSet);
    return successResponse;
  } catch (error) {
    console.error("OAuth callback error:", error);
    const catchResponse = NextResponse.redirect(
      requestUrl.origin + `/${locale}/login?error=auth_failed`,
    );
    applyCookies(catchResponse, cookiesToSet);
    return catchResponse;
  }
}

function applyCookies(
  response: NextResponse,
  cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
) {
  cookiesToSet.forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      ...(cookie.options as Record<string, string | boolean | number | Date>),
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  });
}
