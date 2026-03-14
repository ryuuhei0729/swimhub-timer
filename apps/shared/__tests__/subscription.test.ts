import { describe, expect, it } from "vitest";
import { getAvailableResolutions, getMaxSplitCount, shouldShowWatermark } from "../utils/subscription";
import type { UserPlan } from "../types/auth";

const plans: UserPlan[] = ["guest", "free", "premium"];

describe("getAvailableResolutions", () => {
  it("returns only 720 for guest", () => {
    expect(getAvailableResolutions("guest")).toEqual(["720"]);
  });

  it("returns all resolutions for free", () => {
    expect(getAvailableResolutions("free")).toEqual(["720", "1080", "original"]);
  });

  it("returns all resolutions for premium", () => {
    expect(getAvailableResolutions("premium")).toEqual(["720", "1080", "original"]);
  });

  it("always includes 720 for all plans", () => {
    for (const plan of plans) {
      expect(getAvailableResolutions(plan)).toContain("720");
    }
  });
});

describe("getMaxSplitCount", () => {
  it("returns 1 for guest", () => {
    expect(getMaxSplitCount("guest")).toBe(1);
  });

  it("returns Infinity for free", () => {
    expect(getMaxSplitCount("free")).toBe(Infinity);
  });

  it("returns Infinity for premium", () => {
    expect(getMaxSplitCount("premium")).toBe(Infinity);
  });
});

describe("shouldShowWatermark", () => {
  it("shows watermark for guest", () => {
    expect(shouldShowWatermark("guest")).toBe(true);
  });

  it("shows watermark for free", () => {
    expect(shouldShowWatermark("free")).toBe(true);
  });

  it("does not show watermark for premium", () => {
    expect(shouldShowWatermark("premium")).toBe(false);
  });
});
