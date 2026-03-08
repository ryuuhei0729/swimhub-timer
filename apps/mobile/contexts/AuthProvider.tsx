import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import type { UserPlan } from "@swimhub-timer/core";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  plan: UserPlan;
  signOut: () => Promise<{ error: Error | null }>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<UserPlan>("guest");
  const [guestMode, setGuestMode] = useState(false);

  const fetchPlan = React.useCallback(async (userId: string) => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("plan")
        .eq("id", userId)
        .single<{ plan: string }>();
      if (data?.plan === "premium") {
        setPlan("premium");
      } else {
        setPlan("free");
      }
    } catch {
      setPlan("free");
    }
  }, []);

  const signOut = React.useCallback(async () => {
    if (!supabase) {
      return {
        error: new Error("Supabaseクライアントが初期化されていません"),
      };
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Network failure: fall back to local-only sign out
        await supabase.auth.signOut({ scope: "local" });
      }
      setPlan("guest");
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

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      console.error("Supabaseクライアントが初期化されていません");
      setLoading(false);
      return;
    }

    // タイムアウト設定（10秒後にloadingをfalseにする）
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading((prev) => {
          if (prev) {
            console.warn("認証状態の確認がタイムアウトしました");
            return false;
          }
          return prev;
        });
      }
    }, 10000);

    // 認証状態の変更を監視（INITIAL_SESSION イベントで初期セッションも処理される）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      clearTimeout(timeoutId);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      if (newSession?.user) {
        setGuestMode(false);
        fetchPlan(newSession.user.id);
      } else {
        setPlan("guest");
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchPlan]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user || guestMode,
    plan,
    signOut,
    continueAsGuest,
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
