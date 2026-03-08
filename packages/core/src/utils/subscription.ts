import type { UserPlan } from "../types/auth";
import type { ExportResolution } from "../types/video";

export function getAvailableResolutions(plan: UserPlan): ExportResolution[] {
  return plan === "guest" ? ["720"] : ["720", "1080", "original"];
}

/** Maximum number of split times a user can record. `Infinity` means unlimited. */
export function getMaxSplitCount(plan: UserPlan): number {
  return plan === "premium" ? Infinity : 1;
}

/** Whether the exported video should include the SwimHub Timer watermark. */
export function shouldShowWatermark(plan: UserPlan): boolean {
  return plan !== "premium";
}
