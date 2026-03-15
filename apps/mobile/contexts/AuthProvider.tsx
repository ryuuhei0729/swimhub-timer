import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { UserPlan, SubscriptionInfo } from "@swimhub-timer/shared";
import type { TimerMobileAuthContextType } from "@swimhub-timer/shared/types/auth";
import { useAuthState } from "@swimhub-timer/shared/hooks";
import {
  initRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  addCustomerInfoUpdateListener,
} from "../lib/revenucat";

export type AuthContextType = TimerMobileAuthContextType;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, loading } = useAuthState(supabase);
  const [plan, setPlan] = useState<UserPlan>("guest");
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [guestMode, setGuestMode] = useState(false);

  // RevenueCat SDK 初期化（1回のみ）
  useEffect(() => {
    initRevenueCat();
  }, []);

  const fetchSubscription = React.useCallback(async (userId: string) => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("plan, status, cancel_at_period_end, premium_expires_at, trial_end")
        .eq("id", userId)
        .single<{
          plan: string;
          status: string | null;
          cancel_at_period_end: boolean;
          premium_expires_at: string | null;
          trial_end: string | null;
        }>();

      if (data) {
        const info: SubscriptionInfo = {
          plan: data.plan === "premium" ? "premium" : "free",
          status: (data.status as SubscriptionInfo["status"]) ?? null,
          cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
          premiumExpiresAt: data.premium_expires_at ?? null,
          trialEnd: data.trial_end ?? null,
        };
        setSubscription(info);
        setPlan(info.plan);
      } else {
        setSubscription(null);
        setPlan("free");
      }
    } catch {
      setSubscription(null);
      setPlan("free");
    }
  }, []);

  // サブスクリプション情報を再取得する公開メソッド
  const refreshSubscription = React.useCallback(async () => {
    if (user) {
      await fetchSubscription(user.id);
    }
  }, [user, fetchSubscription]);

  const signOut = React.useCallback(async () => {
    if (!supabase) {
      return {
        error: new Error("Supabaseクライアントが初期化されていません"),
      };
    }
    try {
      // RevenueCat からログアウト
      await logoutRevenueCat();

      const { error } = await supabase.auth.signOut();
      if (error) {
        // Network failure: fall back to local-only sign out
        await supabase.auth.signOut({ scope: "local" });
      }
      setPlan("guest");
      setSubscription(null);
      setGuestMode(false);

      // Clear all MMKV caches
      try {
        const { createMMKV } = require("react-native-mmkv");
        const settingsStorage = createMMKV({ id: "swimhub-timer-settings" });
        settingsStorage.clearAll();
        const authStorage = createMMKV({ id: "supabase-auth" });
        authStorage.clearAll();
      } catch {
        // Expo Go fallback: no MMKV available
      }

      return { error: null };
    } catch (error) {
      // Network failure in try block: fall back to local-only sign out
      try {
        await supabase.auth.signOut({ scope: "local" });
        setPlan("guest");
        setSubscription(null);

        try {
          const { createMMKV } = require("react-native-mmkv");
          const settingsStorage = createMMKV({ id: "swimhub-timer-settings" });
          settingsStorage.clearAll();
          const authStorage = createMMKV({ id: "supabase-auth" });
          authStorage.clearAll();
        } catch {
          // Expo Go fallback: no MMKV available
        }

        return { error: null };
      } catch (localError) {
        console.error("Sign out error:", localError);
        return { error: localError as Error };
      }
    }
  }, []);

  const continueAsGuest = React.useCallback(() => {
    setPlan("guest");
    setGuestMode(true);
  }, []);

  // user が変わったらプランを取得 & RevenueCat にログイン
  useEffect(() => {
    if (user) {
      setGuestMode(false);
      fetchSubscription(user.id);
      loginRevenueCat(user.id);
    } else {
      setPlan("guest");
      setSubscription(null);
    }
  }, [user, fetchSubscription]);

  // RevenueCat の顧客情報更新リスナー
  useEffect(() => {
    const unsubscribe = addCustomerInfoUpdateListener(() => {
      // RevenueCat 側で購入/更新が発生したら Supabase から再取得
      if (user) {
        fetchSubscription(user.id);
      }
    });
    return unsubscribe;
  }, [user, fetchSubscription]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user || guestMode,
    plan,
    subscription,
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
