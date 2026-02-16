import type { DetectedSignal } from "@split-sync/core";
import { BEEP_FREQUENCY_RANGE, FFT_WINDOW_SIZE, FFT_HOP_SIZE } from "@split-sync/core";
import { applyHannWindow, computeMagnitudeSpectrum } from "./audio-utils";

/**
 * Detect the electronic start beep in swimming race audio.
 *
 * Race sequence: whistles → "Take your mark" → Electronic beep (START).
 *
 * Detection strategy — look for a **sustained pure tone** in 800-3500Hz:
 *   1. For each STFT frame, find the dominant frequency in the beep band.
 *   2. Compute "tonality" — how much energy is concentrated around that peak.
 *      Pure tones (beep) score high; broadband sounds (speech, crowd) score low.
 *   3. Find consecutive runs of high-tonality frames lasting ≥ 150ms.
 *   4. Reject runs whose dominant frequency sits in the whistle range (> 2500Hz).
 *   5. Return the last qualifying run (beep comes after whistles).
 */
export function detectStartSignal(
  audioBuffer: AudioBuffer
): DetectedSignal | null {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const windowSize = FFT_WINDOW_SIZE;
  const hopSize = FFT_HOP_SIZE;
  const numWindows = Math.floor(
    (channelData.length - windowSize) / hopSize
  );

  if (numWindows < 2) return null;

  const binResolution = sampleRate / windowSize; // Hz per bin
  const beepLowBin = Math.floor(BEEP_FREQUENCY_RANGE.low / binResolution);
  const beepHighBin = Math.ceil(BEEP_FREQUENCY_RANGE.high / binResolution);

  // --- Step 1: Compute per-frame tonality and dominant frequency ---
  const frameTonality: number[] = [];
  const frameDominantFreq: number[] = [];
  const frameEnergy: number[] = [];

  for (let i = 0; i < numWindows; i++) {
    const offset = i * hopSize;
    const windowData = new Float32Array(windowSize);
    windowData.set(channelData.subarray(offset, offset + windowSize));

    applyHannWindow(windowData);
    const spectrum = computeMagnitudeSpectrum(windowData);

    // Find peak bin and total energy in beep band
    let peakBin = beepLowBin;
    let peakMag = 0;
    let totalEnergy = 0;

    for (let bin = beepLowBin; bin <= beepHighBin && bin < spectrum.length; bin++) {
      const mag = spectrum[bin];
      totalEnergy += mag;
      if (mag > peakMag) {
        peakMag = mag;
        peakBin = bin;
      }
    }

    // Tonality: energy within ±3 bins of peak / total energy in band
    // Pure tone → most energy near peak → high tonality
    const peakRadius = 3;
    let peakRegionEnergy = 0;
    for (
      let bin = Math.max(beepLowBin, peakBin - peakRadius);
      bin <= Math.min(beepHighBin, peakBin + peakRadius) && bin < spectrum.length;
      bin++
    ) {
      peakRegionEnergy += spectrum[bin];
    }

    const tonality = totalEnergy > 0 ? peakRegionEnergy / totalEnergy : 0;
    const dominantFreq = peakBin * binResolution;

    frameTonality.push(tonality);
    frameDominantFreq.push(dominantFreq);
    frameEnergy.push(totalEnergy);
  }

  // --- Step 2: Find sustained high-tonality runs ---
  // Adaptive tonality threshold: we want frames that are clearly tonal
  const tonalityThreshold = 0.35;

  // Also require minimum energy to ignore silence
  const sortedEnergy = [...frameEnergy].sort((a, b) => a - b);
  const medianEnergy = sortedEnergy[Math.floor(sortedEnergy.length / 2)];
  const energyThreshold = medianEnergy * 0.5;

  // Minimum duration for a beep: ~150ms
  const minRunFrames = Math.ceil((0.15 * sampleRate) / hopSize);
  // Maximum gap allowed within a run (account for brief fluctuations)
  const maxGapFrames = 2;

  interface ToneRun {
    startFrame: number;
    endFrame: number;
    avgFreq: number;
    avgTonality: number;
    totalEnergy: number;
  }

  const runs: ToneRun[] = [];
  let runStart = -1;
  let gapCount = 0;

  for (let i = 0; i < numWindows; i++) {
    const isTonal =
      frameTonality[i] >= tonalityThreshold &&
      frameEnergy[i] >= energyThreshold;

    if (isTonal) {
      if (runStart === -1) {
        runStart = i;
        gapCount = 0;
      } else {
        gapCount = 0; // reset gap
      }
    } else {
      if (runStart !== -1) {
        gapCount++;
        if (gapCount > maxGapFrames) {
          // End of run
          const endFrame = i - gapCount;
          if (endFrame - runStart + 1 >= minRunFrames) {
            runs.push(buildRun(runStart, endFrame, frameDominantFreq, frameTonality, frameEnergy));
          }
          runStart = -1;
          gapCount = 0;
        }
      }
    }
  }
  // Flush last run
  if (runStart !== -1) {
    const endFrame = numWindows - 1 - gapCount;
    if (endFrame - runStart + 1 >= minRunFrames) {
      runs.push(buildRun(runStart, endFrame, frameDominantFreq, frameTonality, frameEnergy));
    }
  }

  if (runs.length === 0) return null;

  // --- Step 3: Filter out whistle runs (dominant freq > 2500Hz) ---
  const WHISTLE_FREQ_CUTOFF = 2500;
  const beepRuns = runs.filter((r) => r.avgFreq <= WHISTLE_FREQ_CUTOFF);

  // --- Step 4: Pick the best candidate ---
  // Prefer the last beep run (beep comes after whistles in the sequence)
  // But if there are multiple, pick the one with highest energy × tonality
  let bestRun: ToneRun | null = null;

  if (beepRuns.length > 0) {
    // Score = energy × tonality; among top scorers, prefer later ones
    const scored = beepRuns.map((r) => ({
      run: r,
      score: r.totalEnergy * r.avgTonality,
    }));
    const maxScore = Math.max(...scored.map((s) => s.score));
    // Candidates within 50% of max score
    const topCandidates = scored.filter((s) => s.score >= maxScore * 0.5);
    // Pick the latest among top candidates
    bestRun = topCandidates[topCandidates.length - 1].run;
  } else if (runs.length > 0) {
    // All runs were in whistle range; fall back to the last run overall
    bestRun = runs[runs.length - 1];
  }

  if (!bestRun) return null;

  // Return the start time of the tone run
  const timeInSeconds = (bestRun.startFrame * hopSize) / sampleRate;
  const confidence = bestRun.avgTonality;

  return { time: timeInSeconds, confidence };
}

function buildRun(
  startFrame: number,
  endFrame: number,
  frameDominantFreq: number[],
  frameTonality: number[],
  frameEnergy: number[]
) {
  let freqSum = 0;
  let tonalSum = 0;
  let energySum = 0;
  let count = 0;
  for (let j = startFrame; j <= endFrame; j++) {
    freqSum += frameDominantFreq[j];
    tonalSum += frameTonality[j];
    energySum += frameEnergy[j];
    count++;
  }
  return {
    startFrame,
    endFrame,
    avgFreq: freqSum / count,
    avgTonality: tonalSum / count,
    totalEnergy: energySum,
  };
}
