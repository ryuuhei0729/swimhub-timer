"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import SubscriptionSettings from "@/components/settings/SubscriptionSettings";

export default function SettingsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const locale = (params.locale as string) || "ja";
  const { user, loading, refreshSubscription } = useAuth();

  // Checkout 完了後に subscription を再取得
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("session_id")) {
      // Stripe Checkout 完了後 — subscription 情報を最新化
      refreshSubscription();
      // URL から session_id を除去（ブラウザ履歴を汚さない）
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [refreshSubscription]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("auth.errors.sessionNotFound")}</p>
          <Link
            href={`/${locale}/login`}
            className="text-primary hover:underline"
          >
            {t("auth.login")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t("subscription.settings")}</h1>
          <Link
            href={`/${locale}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("subscription.backToHome")}
          </Link>
        </div>

        <SubscriptionSettings />
      </div>
    </div>
  );
}
