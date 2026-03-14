import type { UserPlan, SubscriptionStatus } from "../types/auth";
import type { ExportResolution } from "../types/video";

export function isActivePremium(plan: UserPlan, status: SubscriptionStatus | null): boolean {
  return plan === "premium" && (status === "active" || status === "trialing");
}

export function getAvailableResolutions(plan: UserPlan): ExportResolution[] {
  return plan === "guest" ? ["720"] : ["720", "1080", "original"];
}

/** Maximum number of split times a user can record. `Infinity` means unlimited. */
export function getMaxSplitCount(plan: UserPlan): number {
  if (plan === "guest") return 1;
  return Infinity;
}

/** Whether the exported video should include the SwimHub Timer watermark. */
export function shouldShowWatermark(plan: UserPlan): boolean {
  return plan !== "premium";
}
