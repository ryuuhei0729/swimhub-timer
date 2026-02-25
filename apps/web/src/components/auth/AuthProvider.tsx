"use client";

import {
  createContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { UserPlan } from "@swimhub-timer/core";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEditorStore } from "@/stores/editor-store";
import { clear as clearIdb } from "idb-keyval";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  plan: UserPlan;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<UserPlan>("free");

  const fetchPlan = useCallback(async (userId: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
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

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth
      .getUser()
      .then(({ data: { user: currentUser } }) => {
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchPlan(session.user.id);
      } else {
        setPlan("free");
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

  const signInWithApple = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
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
    setPlan("free");

    // Clear all caches
    useEditorStore.getState().reset();
    await clearIdb().catch(() => {});
    delete window.__supabase_timer_client__;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, plan, signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
