import type { UserPlan, SubscriptionStatus, SubscriptionInfo } from "../types/auth";
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

// swim-hub の checkIsPremium と同一ロジック・同一シグネチャ
export function checkIsPremium(subscription: SubscriptionInfo | null): boolean {
  if (!subscription) return false;
  return isActivePremium(subscription.plan, subscription.status, subscription.premiumExpiresAt);
}

/**
 * The plan whose limits apply right now. Premium only while the subscription is
 * actually active (`checkIsPremium`: status active/trialing and not past
 * `premiumExpiresAt`) — `subscription.plan` alone stays "premium" after a lapse
 * or a billing failure. Same rule as the web app and SwimHub.
 */
export function getEffectivePlan(
  subscription: SubscriptionInfo | null,
  guestMode: boolean,
): UserPlan {
  if (guestMode) return "guest";
  return checkIsPremium(subscription) ? "premium" : "free";
}

export function getAvailableResolutions(plan: UserPlan): ExportResolution[] {
  return plan === "premium" ? ["720", "1080", "original"] : ["720"];
}

/**
 * Maximum number of split times (laps, excluding the finish) a user can record.
 * `Infinity` means unlimited. The free limit matches SwimHub's
 * `FREE_PLAN_LIMITS.SPLIT_TIMES_PER_RECORD`, so a race measured here fits in a
 * SwimHub record on the same plan.
 */
export function getMaxSplitCount(plan: UserPlan): number {
  if (plan === "guest") return 1;
  if (plan === "free") return 3;
  return Infinity;
}

/** Whether the exported video should include the SwimHub Timer watermark. */
export function shouldShowWatermark(plan: UserPlan): boolean {
  return plan !== "premium";
}
