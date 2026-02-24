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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<UserPlan>("free");

  const fetchPlan = React.useCallback(async (userId: string) => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("plan")
        .eq("user_id", userId)
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
        return { error };
      }
      setPlan("free");

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
      console.error("Sign out error:", error);
      return { error: error as Error };
    }
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

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      clearTimeout(timeoutId);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      if (newSession?.user) {
        fetchPlan(newSession.user.id);
      } else {
        setPlan("free");
      }
    });

    // 初期セッションを明示的に取得（フォールバック）
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (isMounted) {
          clearTimeout(timeoutId);
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setLoading(false);

          if (initialSession?.user) {
            fetchPlan(initialSession.user.id);
          }
        }
      })
      .catch((error) => {
        console.error("初期セッション取得エラー:", error);
        if (isMounted) {
          clearTimeout(timeoutId);
          setLoading(false);
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
    isAuthenticated: !!user,
    plan,
    signOut,
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
