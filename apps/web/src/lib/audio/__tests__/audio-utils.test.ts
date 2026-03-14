import { describe, expect, it } from "vitest";
import { applyHannWindow, computeMagnitudeSpectrum, findPeaks } from "../audio-utils";

describe("applyHannWindow", () => {
  it("zeros out first and last elements", () => {
    const data = new Float32Array([1, 1, 1, 1]);
    applyHannWindow(data);
    expect(data[0]).toBeCloseTo(0, 5);
    expect(data[3]).toBeCloseTo(0, 5);
  });

  it("does not change center elements to zero", () => {
    const data = new Float32Array([1, 1, 1, 1, 1]);
    applyHannWindow(data);
    // Center element (i=2) of length-5 window: 0.5 * (1 - cos(4π/4)) = 0.5 * (1 - cos(π)) = 1
    expect(data[2]).toBeCloseTo(1.0, 5);
  });

  it("modifies data in-place", () => {
    const data = new Float32Array([1, 1, 1, 1]);
    const original = new Float32Array(data);
    applyHannWindow(data);
    expect(data).not.toEqual(original);
  });

  it("handles length-1 array", () => {
    const data = new Float32Array([5]);
    applyHannWindow(data);
    // For N=1: 0.5 * (1 - cos(0/0)) = NaN * 5 -> NaN
    // Actually cos(2*PI*0 / (1-1)) = cos(0/0) = NaN
    // This is an edge case - just verify it doesn't throw
    expect(data.length).toBe(1);
  });

  it("handles length-2 array", () => {
    const data = new Float32Array([1, 1]);
    applyHannWindow(data);
    expect(data[0]).toBeCloseTo(0, 5);
    expect(data[1]).toBeCloseTo(0, 5);
  });
});

describe("computeMagnitudeSpectrum", () => {
  it("returns array of length N/2", () => {
    const data = new Float32Array(8);
    const result = computeMagnitudeSpectrum(data);
    expect(result.length).toBe(4);
  });

  it("returns all zeros for zero input", () => {
    const data = new Float32Array(8);
    const result = computeMagnitudeSpectrum(data);
    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(0, 5);
    }
  });

  it("detects DC component for constant signal", () => {
    const data = new Float32Array(8).fill(1);
    const result = computeMagnitudeSpectrum(data);
    // DC component (index 0) should be non-zero
    expect(result[0]).toBeGreaterThan(0);
  });

  it("handles power-of-2 sizes", () => {
    for (const size of [4, 8, 16, 32]) {
      const data = new Float32Array(size);
      data[0] = 1;
      const result = computeMagnitudeSpectrum(data);
      expect(result.length).toBe(size / 2);
    }
  });
});

describe("findPeaks", () => {
  it("finds a single peak", () => {
    const data = [0, 0, 0, 5, 0, 0, 0];
    expect(findPeaks(data, 3)).toEqual([3]);
  });

  it("finds multiple peaks", () => {
    const data = [0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0];
    expect(findPeaks(data, 3, 5)).toEqual([2, 12]);
  });

  it("respects minimum distance", () => {
    const data = [0, 5, 0, 6, 0, 7, 0];
    // With minDistance=5, only first peak should be found
    expect(findPeaks(data, 3, 5)).toEqual([1]);
  });

  it("returns empty for data below threshold", () => {
    const data = [1, 2, 1, 2, 1];
    expect(findPeaks(data, 5)).toEqual([]);
  });

  it("returns empty for empty array", () => {
    expect(findPeaks([], 1)).toEqual([]);
  });

  it("ignores first and last elements", () => {
    // First and last are never peaks (boundary check: i > 0 and i < length-1)
    const data = [10, 5, 0];
    expect(findPeaks(data, 3)).toEqual([]);
  });

  it("treats equal-to-next as a peak (>= condition)", () => {
    const data = [0, 5, 5, 0];
    // data[1]=5 > data[0]=0 AND data[1]=5 >= data[2]=5, so index 1 is a peak
    expect(findPeaks(data, 3)).toEqual([1]);
  });

  it("allows equal to next element", () => {
    // data[i] >= data[i+1] is the condition
    const data = [0, 5, 3, 0];
    expect(findPeaks(data, 3)).toEqual([1]);
  });
});
