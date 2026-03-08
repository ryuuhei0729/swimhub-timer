export type UserPlan = "guest" | "free" | "premium";

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  plan: UserPlan;
  avatarUrl?: string;
}
