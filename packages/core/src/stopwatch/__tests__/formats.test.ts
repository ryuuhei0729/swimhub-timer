import { describe, expect, it } from "vitest";
import { formatTime } from "../formats";

describe("formatTime", () => {
  it("formats zero seconds", () => {
    expect(formatTime(0)).toBe("00.00");
  });

  it("formats seconds under 10", () => {
    expect(formatTime(5.25)).toBe("05.25");
  });

  it("formats seconds between 10 and 60", () => {
    expect(formatTime(30.5)).toBe("30.50");
  });

  it("formats exactly 60 seconds with minutes", () => {
    expect(formatTime(60)).toBe("1:00.00");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(65.2)).toBe("1:05.20");
  });

  it("formats 10+ minutes with padded minutes", () => {
    expect(formatTime(600)).toBe("10:00.00");
  });

  it("formats large times", () => {
    expect(formatTime(754.32)).toBe("12:34.32");
  });

  it("clamps negative values to zero", () => {
    expect(formatTime(-5)).toBe("00.00");
  });

  it("formats centiseconds correctly", () => {
    expect(formatTime(1.01)).toBe("01.01");
  });

  it("formats 59.99 seconds without minutes", () => {
    expect(formatTime(59.99)).toBe("59.99");
  });

  it("truncates sub-centisecond precision", () => {
    // 1.999 => Math.floor(199.9) = 199 centiseconds => 01.99
    expect(formatTime(1.999)).toBe("01.99");
  });
});
