import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase, clearMmkvCaches } from "../lib/supabase";
import type { SubscriptionInfo } from "@swimhub-timer/shared";
import type { TimerMobileAuthContextType } from "@swimhub-timer/shared/types/auth";
import { useAuthState } from "@swimhub-timer/shared/hooks";
import {
  initRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  addCustomerInfoUpdateListener,
} from "../lib/revenucat";
import { setPasswordRecoveryPending } from "../lib/passwordRecovery";

export type AuthContextType = TimerMobileAuthContextType;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, loading } = useAuthState(supabase);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  // プランが確定したユーザーの ID。user オブジェクトはトークン更新のたびに作り直される
  // ことがあるため、真偽値ではなく ID で持ち、別ユーザーに切り替わったら自動で未確定に戻す。
  const [resolvedForUserId, setResolvedForUserId] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  currentUserIdRef.current = user?.id ?? null;
  const [guestMode, setGuestMode] = useState(false);

  // RevenueCat SDK 初期化（1回のみ）
  useEffect(() => {
    initRevenueCat();
  }, []);

  // Supabase の user_subscriptions テーブルからサブスクリプション情報を直接取得する
  // API 経由だと Bearer token の有効期限切れで 401 になる問題があったため、
  // Supabase クライアントを直接使う（token refresh が内蔵されている）
  //
  // 戻り値: 取得できた → SubscriptionInfo / 行が無い（= 無料扱い）→ "missing" /
  // 取得失敗（オフライン等）→ null。"missing" と null を区別しないと、通信失敗中の
  // 課金ユーザーを「無料」と確定させてしまう。
  const fetchSubscription = React.useCallback(async (
    userId: string,
  ): Promise<SubscriptionInfo | "missing" | null> => {
    if (!supabase) return null;
    try {
      const { data, error } = (await supabase
        .from("user_subscriptions")
        .select("plan, status, cancel_at_period_end, premium_expires_at, trial_end")
        .eq("id", userId)
        .maybeSingle()) as {
        data: {
          plan: string;
          status: string | null;
          cancel_at_period_end: boolean | null;
          premium_expires_at: string | null;
          trial_end: string | null;
        } | null;
        error: unknown;
      };
      if (error) return null;
      if (!data) return "missing";
      return {
        plan: data.plan as "free" | "premium",
        status: (data.status as SubscriptionInfo["status"]) ?? null,
        cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
        premiumExpiresAt: data.premium_expires_at ?? null,
        trialEnd: data.trial_end ?? null,
      };
    } catch {
      return null;
    }
  }, []);

  // 取得結果を state に反映する。取得中にユーザーが切り替わっていたら古い結果は捨てる。
  // 取得失敗（null）では subscription も確定状態も変えない（直前の値を保つ）。
  const loadSubscription = React.useCallback(
    async (userId: string) => {
      const result = await fetchSubscription(userId);
      if (result === null || currentUserIdRef.current !== userId) return;
      setSubscription(result === "missing" ? null : result);
      setResolvedForUserId(userId);
    },
    [fetchSubscription],
  );

  // サブスクリプション情報を再取得する公開メソッド
  const refreshSubscription = React.useCallback(async () => {
    if (user?.id) {
      await loadSubscription(user.id);
    }
  }, [user?.id, loadSubscription]);

  const signOut = React.useCallback(async () => {
    if (!supabase) {
      return {
        error: new Error("Supabaseクライアントが初期化されていません"),
      };
    }
    try {
      await logoutRevenueCat();

      const { error } = await supabase.auth.signOut();
      if (error) {
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (localError) {
        console.error("Sign out error:", localError);
        return { error: localError as Error };
      }
    } finally {
      setSubscription(null);
      setGuestMode(false);
      // サインアウト後に stale なリカバリー保留フラグが残ると、次に別アカウント
      // で通常ログインした際 AuthGate が誤って reset-password へ誘導してしまう。
      setPasswordRecoveryPending(false);
      clearMmkvCaches();

      try {
        const { useEditorStore } = await import("../stores/editor-store");
        useEditorStore.getState().reset();
      } catch {
        // ストアがまだ読み込まれていない場合は無視
      }
    }
    return { error: null };
  }, []);

  const continueAsGuest = React.useCallback(() => {
    setGuestMode(true);
  }, []);

  // user が変わったらサブスクリプションを取得 & RevenueCat にログイン
  useEffect(() => {
    if (user) {
      setGuestMode(false);
      void loadSubscription(user.id);
      loginRevenueCat(user.id);
    } else {
      setSubscription(null);
    }
  }, [user, loadSubscription]);

  // RevenueCat の顧客情報更新リスナー
  useEffect(() => {
    const unsubscribe = addCustomerInfoUpdateListener(() => {
      // RevenueCat 側で購入/更新が発生したら Supabase から再取得
      if (user?.id) {
        void loadSubscription(user.id);
      }
    });
    return unsubscribe;
  }, [user, loadSubscription]);

  const subscriptionResolved = guestMode || (!!user && resolvedForUserId === user.id);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    subscription,
    subscriptionResolved,
    guestMode,
    signOut,
    continueAsGuest,
    refreshSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
