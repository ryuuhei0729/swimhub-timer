import { describe, expect, it } from "vitest";
import {
  getAvailableResolutions,
  getEffectivePlan,
  getMaxSplitCount,
  isActivePremium,
  shouldShowWatermark,
} from "../utils/subscription";
import type { SubscriptionInfo } from "../types/auth";
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

  it("returns 3 for free", () => {
    expect(getMaxSplitCount("free")).toBe(3);
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

describe("getEffectivePlan", () => {
  const sub = (overrides: Partial<SubscriptionInfo>): SubscriptionInfo => ({
    plan: "premium",
    status: "active",
    cancelAtPeriodEnd: false,
    premiumExpiresAt: null,
    trialEnd: null,
    ...overrides,
  });

  it("returns guest in guest mode, whatever the subscription", () => {
    expect(getEffectivePlan(sub({}), true)).toBe("guest");
    expect(getEffectivePlan(null, true)).toBe("guest");
  });

  it("returns free when there is no subscription", () => {
    expect(getEffectivePlan(null, false)).toBe("free");
  });

  it("returns premium for an active or trialing Premium subscription", () => {
    expect(getEffectivePlan(sub({ status: "active" }), false)).toBe("premium");
    expect(getEffectivePlan(sub({ status: "trialing" }), false)).toBe("premium");
  });

  it("returns free when plan is premium but the status is not active", () => {
    expect(getEffectivePlan(sub({ status: "past_due" }), false)).toBe("free");
    expect(getEffectivePlan(sub({ status: "expired" }), false)).toBe("free");
    expect(getEffectivePlan(sub({ status: null }), false)).toBe("free");
  });

  it("returns free once premiumExpiresAt has passed", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(getEffectivePlan(sub({ premiumExpiresAt: past }), false)).toBe("free");
    expect(getEffectivePlan(sub({ premiumExpiresAt: future, cancelAtPeriodEnd: true }), false)).toBe(
      "premium",
    );
  });
});
