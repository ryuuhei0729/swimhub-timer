import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { UserPlan } from "@swimhub-timer/shared";
import type { TimerMobileAuthContextType } from "@swimhub-timer/shared/types/auth";
import { useAuthState } from "@swimhub-timer/shared/hooks";

export type AuthContextType = TimerMobileAuthContextType;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, loading } = useAuthState(supabase);
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

  // user が変わったらプランを取得
  useEffect(() => {
    if (user) {
      setGuestMode(false);
      fetchPlan(user.id);
    } else {
      setPlan("guest");
    }
  }, [user, fetchPlan]);

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
