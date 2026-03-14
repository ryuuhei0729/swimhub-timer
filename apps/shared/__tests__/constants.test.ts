import { describe, expect, it } from "vitest";
import {
  BEEP_FREQUENCY_RANGE,
  FFT_HOP_SIZE,
  FFT_WINDOW_SIZE,
  SUPPORTED_VIDEO_TYPES,
} from "../constants";

describe("SUPPORTED_VIDEO_TYPES", () => {
  it("includes mp4", () => {
    expect(SUPPORTED_VIDEO_TYPES).toContain("video/mp4");
  });

  it("includes quicktime", () => {
    expect(SUPPORTED_VIDEO_TYPES).toContain("video/quicktime");
  });

  it("includes webm", () => {
    expect(SUPPORTED_VIDEO_TYPES).toContain("video/webm");
  });

  it("includes m4v", () => {
    expect(SUPPORTED_VIDEO_TYPES).toContain("video/x-m4v");
  });

  it("has exactly 4 types", () => {
    expect(SUPPORTED_VIDEO_TYPES).toHaveLength(4);
  });
});

describe("BEEP_FREQUENCY_RANGE", () => {
  it("has low frequency of 800", () => {
    expect(BEEP_FREQUENCY_RANGE.low).toBe(800);
  });

  it("has high frequency of 3500", () => {
    expect(BEEP_FREQUENCY_RANGE.high).toBe(3500);
  });

  it("low is less than high", () => {
    expect(BEEP_FREQUENCY_RANGE.low).toBeLessThan(BEEP_FREQUENCY_RANGE.high);
  });
});

describe("FFT constants", () => {
  it("FFT_WINDOW_SIZE is a power of 2", () => {
    expect(Math.log2(FFT_WINDOW_SIZE) % 1).toBe(0);
  });

  it("FFT_WINDOW_SIZE is 2048", () => {
    expect(FFT_WINDOW_SIZE).toBe(2048);
  });

  it("FFT_HOP_SIZE is 512", () => {
    expect(FFT_HOP_SIZE).toBe(512);
  });

  it("FFT_HOP_SIZE is less than FFT_WINDOW_SIZE", () => {
    expect(FFT_HOP_SIZE).toBeLessThan(FFT_WINDOW_SIZE);
  });
});
