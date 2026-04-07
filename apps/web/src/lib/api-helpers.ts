import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerComponentClient } from "@/lib/supabase/server";

export interface VerifyAuthResult {
  uid: string;
  email: string | undefined;
  supabase: SupabaseClient;
}

type VerifyAuthSuccess = { result: VerifyAuthResult };
type VerifyAuthFailure = { error: NextResponse };

async function verifyBearerToken(
  accessToken: string,
): Promise<VerifyAuthSuccess | VerifyAuthFailure> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      error: NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 },
      ),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 },
      ),
    };
  }

  return {
    result: { uid: user.id, email: user.email, supabase },
  };
}

/**
 * Verify the Supabase session.
 * Supports both cookie-based auth (web) and Bearer token auth (mobile).
 */
export async function verifyAuth(
  request: NextRequest,
): Promise<VerifyAuthSuccess | VerifyAuthFailure> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const accessToken = authHeader.substring(7);
    return verifyBearerToken(accessToken);
  }

  const supabase = await createServerComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 },
      ),
    };
  }

  return {
    result: { uid: user.id, email: user.email, supabase },
  };
}
