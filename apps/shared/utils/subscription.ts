import type { UserPlan, SubscriptionStatus } from "../types/auth";
import type { ExportResolution } from "../types/video";

export function isActivePremium(
  plan: UserPlan,
  status: SubscriptionStatus | null,
  premiumExpiresAt?: string | null,
): boolean {
  if (plan !== "premium") return false;
  if (status !== "active" && status !== "trialing") return false;
  if (premiumExpiresAt && new Date(premiumExpiresAt) <= new Date()) return false;
  return true;
}

export function getAvailableResolutions(plan: UserPlan): ExportResolution[] {
  return plan === "premium" ? ["720", "1080", "original"] : ["720"];
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
