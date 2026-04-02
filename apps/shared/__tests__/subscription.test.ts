import { describe, expect, it } from "vitest";
import { getAvailableResolutions, getMaxSplitCount, isActivePremium, shouldShowWatermark } from "../utils/subscription";
import type { UserPlan } from "../types/auth";

const plans: UserPlan[] = ["guest", "free", "premium"];

describe("getAvailableResolutions", () => {
  it("returns only 720 for guest", () => {
    expect(getAvailableResolutions("guest")).toEqual(["720"]);
  });

  it("returns only 720 for free", () => {
    expect(getAvailableResolutions("free")).toEqual(["720"]);
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

describe("isActivePremium", () => {
  it("returns false for free plan", () => {
    expect(isActivePremium("free", "active")).toBe(false);
  });

  it("returns false for guest plan", () => {
    expect(isActivePremium("guest", "active")).toBe(false);
  });

  it("returns true for premium with active status", () => {
    expect(isActivePremium("premium", "active")).toBe(true);
  });

  it("returns true for premium with trialing status", () => {
    expect(isActivePremium("premium", "trialing")).toBe(true);
  });

  it("returns false for premium with canceled status", () => {
    expect(isActivePremium("premium", "canceled")).toBe(false);
  });

  it("returns false for premium with null status", () => {
    expect(isActivePremium("premium", null)).toBe(false);
  });

  it("returns true when premiumExpiresAt is undefined (no expiry check)", () => {
    expect(isActivePremium("premium", "active", undefined)).toBe(true);
  });

  it("returns true when premiumExpiresAt is null (no expiry check)", () => {
    expect(isActivePremium("premium", "active", null)).toBe(true);
  });

  it("returns false when premiumExpiresAt is in the past", () => {
    const pastDate = new Date(Date.now() - 86_400_000).toISOString();
    expect(isActivePremium("premium", "active", pastDate)).toBe(false);
  });

  it("returns true when premiumExpiresAt is in the future", () => {
    const futureDate = new Date(Date.now() + 86_400_000).toISOString();
    expect(isActivePremium("premium", "active", futureDate)).toBe(true);
  });
});
