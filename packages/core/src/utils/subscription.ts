import type { UserPlan } from "../types/auth";
import type { ExportResolution } from "../types/video";

export function getAvailableResolutions(plan: UserPlan): ExportResolution[] {
  return plan === "premium" ? ["720", "1080", "original"] : ["720", "1080"];
}
