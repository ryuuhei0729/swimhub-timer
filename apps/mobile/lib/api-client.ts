/**
 * Web API クライアント
 * Bearer token認証でtimer.swim-hub.appのAPIを呼び出す
 */
import { supabase } from "./supabase";

const API_BASE_URL = "https://timer.swim-hub.app";

export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

async function getAccessToken(): Promise<string> {
  if (!supabase) {
    throw new ApiError("Supabaseクライアントが初期化されていません", "UNAUTHORIZED", 401);
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new ApiError("認証が必要です", "UNAUTHORIZED", 401);
  }
  return session.access_token;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorBody: { error?: string; code?: string };
    try {
      errorBody = (await response.json()) as { error?: string; code?: string };
    } catch {
      throw new ApiError("サーバーエラーが発生しました", "API_ERROR", response.status);
    }
    throw new ApiError(
      errorBody.error || "サーバーエラーが発生しました",
      errorBody.code || "API_ERROR",
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export async function deleteAccount(): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>("/api/user/delete", {
    method: "DELETE",
  });
}
