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
