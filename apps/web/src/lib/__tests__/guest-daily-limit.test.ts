import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canGuestUseToday,
  getGuestTodayCount,
  markGuestUsedToday,
} from "../guest-daily-limit";

const STORAGE_KEY = "swimhub_guest_daily_usage_timer";

/**
 * Helper: get the date string that getTodayJST() returns internally.
 * We derive it by calling markGuestUsedToday and reading what was stored.
 */
function getInternalTodayDate(): string {
  const tempKey = "swimhub_guest_daily_usage_scanner";
  const before = localStorage.getItem(tempKey);
  markGuestUsedToday("scanner");
  const raw = localStorage.getItem(tempKey);
  // Restore original state
  if (before) {
    localStorage.setItem(tempKey, before);
  } else {
    localStorage.removeItem(tempKey);
  }
  return JSON.parse(raw!).date;
}

describe("guest-daily-limit", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T03:00:00Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("canGuestUseToday", () => {
    it("returns true when no usage recorded", () => {
      expect(canGuestUseToday("timer")).toBe(true);
    });

    it("returns false after usage is recorded today", () => {
      markGuestUsedToday("timer");
      expect(canGuestUseToday("timer")).toBe(false);
    });

    it("returns true when usage is from a different day", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: "1999-01-01", count: 1 })
      );
      expect(canGuestUseToday("timer")).toBe(true);
    });

    it("isolates scanner and timer usage", () => {
      markGuestUsedToday("timer");
      expect(canGuestUseToday("scanner")).toBe(true);
    });

    it("returns true when localStorage throws", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("Storage error");
      });
      expect(canGuestUseToday("timer")).toBe(true);
    });
  });

  describe("markGuestUsedToday", () => {
    it("creates usage entry on first use", () => {
      markGuestUsedToday("timer");
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const usage = JSON.parse(raw!);
      expect(usage.count).toBe(1);
    });

    it("increments count on repeated use", () => {
      markGuestUsedToday("timer");
      markGuestUsedToday("timer");
      const raw = localStorage.getItem(STORAGE_KEY);
      const usage = JSON.parse(raw!);
      expect(usage.count).toBe(2);
    });

    it("resets count on new day", () => {
      markGuestUsedToday("timer");
      const firstRaw = localStorage.getItem(STORAGE_KEY);
      const firstDate = JSON.parse(firstRaw!).date;

      // Move to next day
      vi.setSystemTime(new Date("2026-03-13T03:00:00Z"));
      markGuestUsedToday("timer");
      const raw = localStorage.getItem(STORAGE_KEY);
      const usage = JSON.parse(raw!);
      expect(usage.count).toBe(1);
      expect(usage.date).not.toBe(firstDate);
    });
  });

  describe("getGuestTodayCount", () => {
    it("returns 0 when no usage recorded", () => {
      expect(getGuestTodayCount("timer")).toBe(0);
    });

    it("returns 0 when usage is from different day", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: "1999-01-01", count: 3 })
      );
      expect(getGuestTodayCount("timer")).toBe(0);
    });

    it("returns correct count after marking usage", () => {
      // Get the internal date string by observing what markGuestUsedToday stores
      const today = getInternalTodayDate();

      // Now set up known data with that date
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: today, count: 5 })
      );
      expect(getGuestTodayCount("timer")).toBe(5);
    });

    it("returns 0 when localStorage throws", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("Storage error");
      });
      expect(getGuestTodayCount("timer")).toBe(0);
    });
  });
});
