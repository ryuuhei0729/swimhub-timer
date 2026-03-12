"use client";

import {
  createContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { UserPlan, SubscriptionStatus } from "@swimhub-timer/core";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEditorStore } from "@/stores/editor-store";
import { clear as clearIdb } from "idb-keyval";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  plan: UserPlan;
  subscriptionStatus: SubscriptionStatus | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<UserPlan>("guest");
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  const fetchPlan = useCallback(async (userId: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("user_subscriptions")
        .select("plan, status")
        .eq("id", userId)
        .single<{ plan: string; status: string | null }>();
      const status = (data?.status ?? null) as SubscriptionStatus | null;
      setSubscriptionStatus(status);
      if (data?.plan === "premium" && (status === "active" || status === "trialing")) {
        setPlan("premium");
      } else {
        setPlan("free");
      }
    } catch {
      setPlan("free");
      setSubscriptionStatus(null);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth
      .getUser()
      .then(({ data: { user: currentUser } }: { data: { user: User | null } }) => {
        setUser(currentUser);
        setLoading(false);
        if (currentUser) {
          fetchPlan(currentUser.id);
        }
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchPlan(session.user.id);
      } else {
        setPlan("guest");
        setSubscriptionStatus(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchPlan]);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) throw error;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) throw error;
    return !!data.user;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut({ scope: "local" });
    setPlan("guest");
    setSubscriptionStatus(null);

    // Clear all caches
    useEditorStore.getState().reset();
    await clearIdb().catch(() => {});
    delete window.__supabase_timer_client__;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, plan, subscriptionStatus, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
