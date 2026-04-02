import { useState, useCallback } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { localizeAuthError } from "../utils/authErrorLocalizer";

export interface AppleAuthResult {
  success: boolean;
  error?: Error | null;
}

type AppleAuthErrorCode =
  | "ERR_REQUEST_CANCELED"
  | "ERR_REQUEST_FAILED"
  | "ERR_REQUEST_INVALID"
  | "ERR_REQUEST_NOT_HANDLED"
  | "ERR_REQUEST_UNKNOWN";

type AppleAuthError = Error & { code?: AppleAuthErrorCode };

export interface UseAppleAuthReturn {
  signInWithApple: () => Promise<AppleAuthResult>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  isAvailable: boolean;
}

export const useAppleAuth = (): UseAppleAuthReturn => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = Platform.OS === "ios";

  const signInWithApple = useCallback(async (): Promise<AppleAuthResult> => {
    if (!isAvailable) {
      const msg = t("auth.errors.providerNotEnabled");
      setError(msg);
      return { success: false, error: new Error(msg) };
    }

    if (!supabase) {
      const msg = t("auth.errors.notInitialized");
      setError(msg);
      return { success: false, error: new Error(msg) };
    }

    setLoading(true);
    setError(null);

    const APPLE_AUTH_TIMEOUT_MS = 60000;
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError(t("auth.errors.timeout"));
    }, APPLE_AUTH_TIMEOUT_MS);

    try {
      const isAppleAuthAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAppleAuthAvailable) {
        const msg = t("auth.errors.providerNotEnabled");
        setError(msg);
        return { success: false, error: new Error(msg) };
      }

      // nonce生成（リプレイ攻撃防止）
      const rawNonce = Crypto.getRandomValues(new Uint8Array(32)).reduce(
        (acc, val) => acc + val.toString(16).padStart(2, "0"),
        "",
      );
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        const msg = t("auth.errors.invalidToken");
        setError(msg);
        return { success: false, error: new Error(msg) };
      }

      const fullName = credential.fullName;
      const displayName = fullName
        ? [fullName.familyName, fullName.givenName].filter(Boolean).join(" ")
        : undefined;

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (signInError) {
        setError(localizeAuthError(signInError.message, t));
        return { success: false, error: signInError };
      }

      if (displayName) {
        await supabase.auth.updateUser({
          data: { name: displayName },
        });
      }

      return { success: true };
    } catch (e) {
      const err = e as AppleAuthError;

      if (
        err.code === "ERR_REQUEST_CANCELED" ||
        (err.code === "ERR_REQUEST_UNKNOWN" &&
          err.message?.toLowerCase().includes("authorization attempt failed"))
      ) {
        const msg = t("auth.errors.cancelled");
        setError(msg);
        return { success: false, error: new Error(msg) };
      }

      const localizedMessage = localizeAuthError(err.message || "", t);
      setError(localizedMessage);
      return { success: false, error: err };
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [isAvailable, t]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signInWithApple,
    loading,
    error,
    clearError,
    isAvailable,
  };
};
