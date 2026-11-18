/**
 * State machine for the live stopwatch on the camera capture screen.
 *
 * Every timestamp is a *video time* — seconds since the recording started,
 * read from the recorder at the moment a measure button is released. Storing
 * video times (not elapsed-from-start) means the editor can later move the
 * start (e.g. re-detect the start signal) and every lap follows automatically.
 *
 *   ready ──start──▶ running ──stop──▶ stopped
 *                     ▲  │
 *                     └──┘ lap
 *
 * There is no undo on the capture screen: mistaken presses are deleted or
 * moved in the editor, where the video can be checked.
 *
 * `recordingEnded` freezes a running timer (recording stopped mid-race) without
 * adding a mark: the user decides in the editor which mark is the finish.
 */

export type CaptureTimerStatus = "ready" | "running" | "stopped";

export interface CaptureTimerState {
  status: CaptureTimerStatus;
  /** Video time of the START press, or null before START. */
  startVideoTime: number | null;
  /** Video times of LAP / STOP presses, ascending. The STOP press is the last one. */
  marks: number[];
  /** Why the timer stopped: the STOP button, or the recording ending mid-race. */
  stoppedBy: "button" | "recording" | null;
}

export type CaptureTimerAction =
  | { type: "start"; videoTime: number }
  | { type: "lap"; videoTime: number }
  | { type: "stop"; videoTime: number }
  | { type: "recordingEnded" }
  // Internal: a new recording starts from a clean timer (not a user-facing reset).
  | { type: "reset" };

export const initialCaptureTimerState: CaptureTimerState = {
  status: "ready",
  startVideoTime: null,
  marks: [],
  stoppedBy: null,
};

/** Video time of the most recent press (START or the last mark). */
function lastPressTime(state: CaptureTimerState): number | null {
  if (state.marks.length > 0) return state.marks[state.marks.length - 1] ?? null;
  return state.startVideoTime;
}

/**
 * A mark must land strictly after the previous press. Two releases in the same
 * instant (or a recorder clock that hasn't advanced) would otherwise create a
 * zero-length lap that the editor can't assign a distance to meaningfully.
 */
function isAfterLastPress(state: CaptureTimerState, videoTime: number): boolean {
  const last = lastPressTime(state);
  return Number.isFinite(videoTime) && last !== null && videoTime > last;
}

export function captureTimerReducer(
  state: CaptureTimerState,
  action: CaptureTimerAction,
): CaptureTimerState {
  switch (action.type) {
    case "start":
      if (state.status !== "ready" || !Number.isFinite(action.videoTime)) return state;
      return { ...state, status: "running", startVideoTime: Math.max(0, action.videoTime) };

    case "lap":
      if (state.status !== "running" || !isAfterLastPress(state, action.videoTime)) return state;
      return { ...state, marks: [...state.marks, action.videoTime] };

    case "stop":
      if (state.status !== "running" || !isAfterLastPress(state, action.videoTime)) return state;
      return {
        ...state,
        status: "stopped",
        marks: [...state.marks, action.videoTime],
        stoppedBy: "button",
      };

    case "reset":
      return initialCaptureTimerState;

    case "recordingEnded":
      if (state.status !== "running") return state;
      return { ...state, status: "stopped", stoppedBy: "recording" };
  }
}

/** Elapsed race time (seconds) of the last mark, or null when there is none. */
export function getLastMarkElapsed(state: CaptureTimerState): number | null {
  if (state.startVideoTime === null || state.marks.length === 0) return null;
  const last = state.marks[state.marks.length - 1];
  return last === undefined ? null : last - state.startVideoTime;
}

export interface LapRow {
  /** 1-based lap number. */
  n: number;
  /** Elapsed race time at this press (seconds). */
  split: number;
  /** Time since the previous press (seconds). */
  lap: number;
}

/** The latest `count` laps (oldest first), for the on-screen lap table. */
export function getRecentLapRows(state: CaptureTimerState, count: number): LapRow[] {
  const start = state.startVideoTime;
  if (start === null) return [];
  const first = Math.max(0, state.marks.length - count);
  const rows: LapRow[] = [];
  for (let i = first; i < state.marks.length; i++) {
    const split = state.marks[i]! - start;
    const prev = i === 0 ? 0 : state.marks[i - 1]! - start;
    rows.push({ n: i + 1, split, lap: split - prev });
  }
  return rows;
}
