import { useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import { getRedirectUri, extractTokensFromUrl } from "../lib/google-auth";
import { supabase } from "../lib/supabase";
import { localizeAuthError } from "../utils/authErrorLocalizer";

WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResult {
  success: boolean;
  error?: Error | null;
}

export interface UseGoogleAuthReturn {
  signInWithGoogle: () => Promise<GoogleAuthResult>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useGoogleAuth = (): UseGoogleAuthReturn => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = useCallback(async (): Promise<GoogleAuthResult> => {
    if (!supabase) {
      const msg = t("auth.errors.notInitialized");
      setError(msg);
      return { success: false, error: new Error(msg) };
    }

    setLoading(true);
    setError(null);

    try {
      const redirectUri = getRedirectUri();

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          scopes: "openid email profile",
          skipBrowserRedirect: true,
        },
      });

      if (oauthError || !data.url) {
        const errorMessage = oauthError
          ? localizeAuthError(oauthError.message, t)
          : t("auth.errors.oauthError");
        setError(errorMessage);
        return {
          success: false,
          error: oauthError || new Error(errorMessage),
        };
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === "success" && result.url) {
        const tokens = extractTokensFromUrl(result.url);

        if (tokens.error) {
          const localizedError = localizeAuthError(tokens.error, t);
          setError(localizedError);
          return { success: false, error: new Error(tokens.error) };
        }

        if (tokens.accessToken && tokens.refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          });

          if (sessionError) {
            setError(localizeAuthError(sessionError.message, t));
            return { success: false, error: sessionError };
          }

          return { success: true };
        }

        const msg = t("auth.errors.invalidToken");
        setError(msg);
        return { success: false, error: new Error(msg) };
      }

      if (result.type === "cancel" || result.type === "dismiss") {
        const msg = t("auth.errors.cancelled");
        setError(msg);
        return { success: false, error: new Error(msg) };
      }

      const msg = t("auth.errors.generic");
      setError(msg);
      return { success: false, error: new Error(msg) };
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "";
      const localizedMessage = localizeAuthError(rawMessage, t);
      setError(localizedMessage);
      return {
        success: false,
        error: err instanceof Error ? err : new Error(rawMessage),
      };
    } finally {
      setLoading(false);
    }
  }, [t]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signInWithGoogle,
    loading,
    error,
    clearError,
  };
};
