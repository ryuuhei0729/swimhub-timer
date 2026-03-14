import { makeRedirectUri } from "expo-auth-session";

/**
 * リダイレクトURIを生成
 * カスタムスキーム(swimhubtimer://)を使用
 */
export const getRedirectUri = (): string => {
  return makeRedirectUri({
    scheme: "swimhubtimer",
    path: "auth/callback",
    native: "swimhubtimer://auth/callback",
  });
};

/**
 * コールバックURLからトークンを抽出
 * Supabaseは認証成功後、フラグメント(#)でトークンを返す
 */
export interface ExtractedTokens {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenType: string | null;
  error: string | null;
}

export const extractTokensFromUrl = (url: string): ExtractedTokens => {
  try {
    const urlObj = new URL(url);
    const hashParams = new URLSearchParams(urlObj.hash.substring(1));

    const error = hashParams.get("error_description") || hashParams.get("error");
    if (error) {
      return {
        accessToken: null,
        refreshToken: null,
        expiresIn: null,
        tokenType: null,
        error,
      };
    }

    return {
      accessToken: hashParams.get("access_token"),
      refreshToken: hashParams.get("refresh_token"),
      expiresIn: hashParams.get("expires_in") ? parseInt(hashParams.get("expires_in")!, 10) : null,
      tokenType: hashParams.get("token_type"),
      error: null,
    };
  } catch {
    return {
      accessToken: null,
      refreshToken: null,
      expiresIn: null,
      tokenType: null,
      error: "URLの解析に失敗しました",
    };
  }
};
