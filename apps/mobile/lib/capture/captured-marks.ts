import type { SplitTime } from "@swimhub-timer/shared";

/**
 * A LAP / STOP press recorded on the camera capture screen, before the user has
 * told us which distance it belongs to.
 *
 * `videoTime` is absolute (seconds into the video), so moving the start time in
 * the editor shifts every lap's elapsed time consistently. The mark with the
 * latest `videoTime` is the finish; its distance becomes the race distance.
 */
export interface CapturedMark {
  id: string;
  videoTime: number;
  distance: number | null;
  /** Optional note shown with the split in the exported video. */
  memo: string;
}

export type MarkValidationError =
  | "noMarks"
  | "missingDistance"
  | "beforeStart"
  | "timeNotIncreasing"
  | "distanceNotIncreasing";

let markSeq = 0;
export function nextCapturedMarkId(): string {
  markSeq += 1;
  return `mark-${markSeq}`;
}

export function sortCapturedMarks(marks: readonly CapturedMark[]): CapturedMark[] {
  return [...marks].sort((a, b) => a.videoTime - b.videoTime);
}

export function createCapturedMarks(videoTimes: readonly number[]): CapturedMark[] {
  return sortCapturedMarks(
    videoTimes.map((videoTime) => ({
      id: nextCapturedMarkId(),
      videoTime,
      distance: null,
      memo: "",
    })),
  );
}

/** Assigns interval, 2×interval, … in time order (the last mark = race distance). */
export function assignDistancesByInterval(
  marks: readonly CapturedMark[],
  interval: number,
): CapturedMark[] {
  return sortCapturedMarks(marks).map((m, i) => ({ ...m, distance: interval * (i + 1) }));
}

function isValidDistance(d: number | null): d is number {
  return d !== null && Number.isFinite(d) && d > 0;
}

/**
 * Checks that the marks can become splits: every mark has a distance, every
 * mark is after the start, times strictly increase (no 0.00 laps), and
 * distances strictly increase with time (which also rules out duplicates —
 * splits are keyed by distance downstream).
 */
export function validateCapturedMarks(
  marks: readonly CapturedMark[],
  startTime: number | null,
): MarkValidationError | null {
  if (marks.length === 0) return "noMarks";
  const sorted = sortCapturedMarks(marks);
  if (sorted.some((m) => !isValidDistance(m.distance))) return "missingDistance";
  if (startTime === null || sorted.some((m) => m.videoTime <= startTime)) return "beforeStart";
  // Two marks at the same instant would make a 0.00 lap (the capture screen
  // already rejects these; editor adds / nudges can still create them).
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.videoTime <= sorted[i - 1]!.videoTime) return "timeNotIncreasing";
  }
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!.distance!;
    const curr = sorted[i]!.distance!;
    if (curr <= prev) return "distanceNotIncreasing";
  }
  return null;
}

/** Elapsed seconds rounded to the millisecond so float noise never shows up in the UI. */
export function elapsedFromStart(videoTime: number, startTime: number): number {
  return Math.round((videoTime - startTime) * 1000) / 1000;
}

export interface CapturedRaceResult {
  /** All marks as splits (the finish included at the race distance), distance-sorted. */
  splitTimes: SplitTime[];
  finishTime: number;
  raceDistance: number;
  finishMemo: string;
}

/**
 * Converts validated marks into the editor's split model — the same shape
 * the export expects: the finish is also a split at `raceDistance`.
 * Returns null if the marks don't validate.
 */
export function buildRaceFromCapturedMarks(
  marks: readonly CapturedMark[],
  startTime: number | null,
): CapturedRaceResult | null {
  if (startTime === null || validateCapturedMarks(marks, startTime) !== null) return null;
  const sorted = sortCapturedMarks(marks);
  const splitTimes: SplitTime[] = sorted.map((m) => ({
    distance: m.distance!,
    time: elapsedFromStart(m.videoTime, startTime),
    lapTime: null,
    memo: m.memo.trim(),
  }));
  const finish = splitTimes[splitTimes.length - 1]!;
  return {
    splitTimes,
    finishTime: finish.time,
    raceDistance: finish.distance,
    finishMemo: finish.memo,
  };
}

/** Distance step for the editor's −/+ buttons (pool lengths are multiples of 25 m). */
export const DISTANCE_STEP = 25;

/**
 * Distance after pressing −/+ on a mark's distance field.
 *
 * - With a value: move to the next 25 m boundary in that direction
 *   (30 → + 50, 30 → − 25, 50 → + 75), never below 25.
 * - Empty: the first 25 m boundary above the previous mark's distance
 *   (50 → 75, 30 → 50) — the usual "next split" — or 25 when there is none.
 *   Both directions do the same here.
 */
export function stepDistance(
  current: number | null,
  direction: 1 | -1,
  previousDistance: number | null,
  step: number = DISTANCE_STEP,
): number {
  if (current === null || !Number.isFinite(current) || current <= 0) {
    if (previousDistance === null || !Number.isFinite(previousDistance) || previousDistance <= 0) {
      return step;
    }
    return (Math.floor(previousDistance / step) + 1) * step;
  }
  if (direction === 1) return (Math.floor(current / step) + 1) * step;
  return Math.max(step, (Math.ceil(current / step) - 1) * step);
}
