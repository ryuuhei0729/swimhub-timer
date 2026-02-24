"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { SwimHubTimerIcon } from "@/components/icons/SwimHubTimerIcon";

const PASSWORD_MIN_LENGTH = 6;

export default function LoginPage() {
  const { t } = useTranslation();
  const {
    user,
    loading,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params.locale as string) || "ja";

  const [error, setError] = useState<string | null>(
    searchParams.get("error")
      ? t("auth.errors.generic")
      : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(`/${locale}`);
    }
  }, [user, loading, router, locale]);

  const handleGoogleSignIn = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await signInWithGoogle();
    } catch {
      setError(t("auth.errors.generic"));
      setSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await signInWithApple();
    } catch {
      setError(t("auth.errors.generic"));
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(t("auth.errors.passwordTooShort", { minLength: PASSWORD_MIN_LENGTH }));
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      setConfirmationSent(false);
      if (isSignUp) {
        const success = await signUpWithEmail(email, password);
        if (success) {
          setConfirmationSent(true);
        }
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "";
      if (message.includes("Invalid login credentials")) {
        setError(t("auth.errors.invalidCredentials"));
      } else if (message.includes("already registered")) {
        setError(t("auth.errors.alreadyRegistered"));
      } else {
        setError(t("auth.errors.generic"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-6 bg-card p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl">
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <SwimHubTimerIcon className="w-9 h-9 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-2">
            {t("common.appName")}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("import.subtitle")}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg">
            <div className="text-sm leading-relaxed text-center">{error}</div>
          </div>
        )}

        {confirmationSent && (
          <div className="p-4 bg-primary/10 border border-primary/30 text-primary rounded-lg">
            <div className="text-sm leading-relaxed text-center">
              {t("auth.confirmationSent")}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t("auth.loginMethod.withGoogle")}
          </button>

          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            {t("auth.loginMethod.withApple")}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-muted-foreground">
              {t("auth.or")}
            </span>
          </div>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            required
            disabled={submitting}
            className="w-full py-3 px-4 border border-border rounded-lg text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.passwordPlaceholder")}
            required
            disabled={submitting}
            className="w-full py-3 px-4 border border-border rounded-lg text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
          >
            {isSignUp ? t("auth.signUp") : t("auth.signIn")}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setConfirmationSent(false);
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition"
          >
            {isSignUp
              ? t("auth.switchToSignIn")
              : t("auth.switchToSignUp")}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {(() => {
            const full = t("auth.termsAgree");
            const terms = t("auth.terms");
            const privacy = t("privacy.title");
            const parts = full.split(new RegExp(`(${terms}|${privacy})`));
            return parts.map((part, i) => {
              if (part === terms) {
                return (
                  <Link
                    key={i}
                    href={`/${locale}/terms`}
                    className="text-primary underline hover:text-primary/80"
                  >
                    {terms}
                  </Link>
                );
              }
              if (part === privacy) {
                return (
                  <Link
                    key={i}
                    href={`/${locale}/privacy`}
                    className="text-primary underline hover:text-primary/80"
                  >
                    {privacy}
                  </Link>
                );
              }
              return part;
            });
          })()}
        </p>
      </div>
    </div>
  );
}
