import type { User, Session } from "@supabase/supabase-js";

// =============================================================================
// 1. 3アプリ共通の認証ベース型 (AuthState / AuthActions / AuthContextValue)
// =============================================================================

/** 3アプリ共通の認証状態 */
export type BaseAuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

/** 3アプリ共通の認証アクション */
export type BaseAuthActions = {
  signOut: () => Promise<void>;
};

/** 3アプリ共通の認証コンテキスト値 */
export type BaseAuthContextValue = BaseAuthState & BaseAuthActions;

// =============================================================================
// 2. サブスクリプション型定義 (3アプリ共通)
// =============================================================================

export type UserPlan = "guest" | "free" | "premium";
export type SubscriptionStatus = "trialing" | "active" | "canceled" | "expired" | "past_due";

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  plan: UserPlan;
  subscriptionStatus: SubscriptionStatus | null;
  avatarUrl?: string;
}

// =============================================================================
// 3. サブスクリプション詳細情報 (3アプリ共通)
// =============================================================================

export interface SubscriptionInfo {
  plan: UserPlan;
  status: SubscriptionStatus | null;
  cancelAtPeriodEnd: boolean;
  premiumExpiresAt: string | null;
  trialEnd: string | null;
}

// =============================================================================
// 4. timer web 用の認証コンテキスト型
// =============================================================================

export interface TimerWebAuthContextValue {
  user: User | null;
  loading: boolean;
  plan: UserPlan;
  subscriptionStatus: SubscriptionStatus | null;
  subscription: SubscriptionInfo | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

// =============================================================================
// 5. timer mobile 用の認証コンテキスト型
// =============================================================================

export interface TimerMobileAuthContextType extends BaseAuthState {
  isAuthenticated: boolean;
  subscription: SubscriptionInfo | null;
  /**
   * 現在のユーザーのプラン（Premium かどうか）が確定しているか。
   * ゲストは常に true。ログイン中は Supabase からの取得が成功（または行なし＝無料）
   * したときに true になり、取得中・取得失敗中は false のまま。
   * false の間に subscription=null を「無料」と決めつけると、課金ユーザーに広告や
   * 制限を出してしまうため、広告まわりはこの値を見て判定を保留する。
   */
  subscriptionResolved: boolean;
  guestMode: boolean;
  signOut: () => Promise<{ error: Error | null }>;
  continueAsGuest: () => void;
  refreshSubscription: () => Promise<void>;
}
