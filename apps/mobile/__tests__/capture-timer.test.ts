import {
  captureTimerReducer,
  getRecentLapRows,
  getLastMarkElapsed,
  initialCaptureTimerState,
  type CaptureTimerAction,
  type CaptureTimerState,
} from "../lib/capture/capture-timer";

function run(actions: CaptureTimerAction[], from: CaptureTimerState = initialCaptureTimerState) {
  return actions.reduce(captureTimerReducer, from);
}

describe("captureTimerReducer", () => {
  it("START → LAP → LAP → STOP records video times in order", () => {
    const s = run([
      { type: "start", videoTime: 3 },
      { type: "lap", videoTime: 33.5 },
      { type: "lap", videoTime: 65 },
      { type: "stop", videoTime: 97.25 },
    ]);
    expect(s.status).toBe("stopped");
    expect(s.stoppedBy).toBe("button");
    expect(s.startVideoTime).toBe(3);
    expect(s.marks).toEqual([33.5, 65, 97.25]);
    expect(getLastMarkElapsed(s)).toBeCloseTo(94.25);
  });

  it("ignores LAP/STOP before START and START while running", () => {
    expect(run([{ type: "lap", videoTime: 5 }])).toBe(initialCaptureTimerState);
    expect(run([{ type: "stop", videoTime: 5 }])).toBe(initialCaptureTimerState);
    const running = run([{ type: "start", videoTime: 1 }]);
    expect(captureTimerReducer(running, { type: "start", videoTime: 2 })).toBe(running);
  });

  it("rejects a mark that is not strictly after the previous press", () => {
    const running = run([
      { type: "start", videoTime: 1 },
      { type: "lap", videoTime: 10 },
    ]);
    expect(captureTimerReducer(running, { type: "lap", videoTime: 10 })).toBe(running);
    expect(captureTimerReducer(running, { type: "stop", videoTime: 9 })).toBe(running);
    expect(captureTimerReducer(running, { type: "lap", videoTime: NaN })).toBe(running);
  });

  it("ignores LAP/STOP after STOP", () => {
    const stopped = run([
      { type: "start", videoTime: 1 },
      { type: "stop", videoTime: 30 },
    ]);
    expect(captureTimerReducer(stopped, { type: "lap", videoTime: 40 })).toBe(stopped);
    expect(captureTimerReducer(stopped, { type: "stop", videoTime: 40 })).toBe(stopped);
  });

  describe("recordingEnded", () => {
    it("freezes a running timer without adding a mark", () => {
      const s = run([
        { type: "start", videoTime: 1 },
        { type: "lap", videoTime: 20 },
        { type: "recordingEnded" },
      ]);
      expect(s.status).toBe("stopped");
      expect(s.stoppedBy).toBe("recording");
      expect(s.marks).toEqual([20]);
    });

    it("leaves ready / already-stopped timers alone", () => {
      expect(run([{ type: "recordingEnded" }])).toBe(initialCaptureTimerState);
      const stopped = run([
        { type: "start", videoTime: 1 },
        { type: "stop", videoTime: 30 },
      ]);
      expect(captureTimerReducer(stopped, { type: "recordingEnded" })).toBe(stopped);
    });
  });
});

describe("getRecentLapRows", () => {
  const timer = run([
    { type: "start", videoTime: 2 },
    { type: "lap", videoTime: 32 },
    { type: "lap", videoTime: 63 },
    { type: "lap", videoTime: 95 },
    { type: "lap", videoTime: 128 },
    { type: "stop", videoTime: 162 },
  ]);

  it("returns the latest N laps oldest-first with split and lap times", () => {
    expect(getRecentLapRows(timer, 4)).toEqual([
      { n: 2, split: 61, lap: 31 },
      { n: 3, split: 93, lap: 32 },
      { n: 4, split: 126, lap: 33 },
      { n: 5, split: 160, lap: 34 },
    ]);
  });

  it("first lap's lap time is its split", () => {
    expect(getRecentLapRows(timer, 10)[0]).toEqual({ n: 1, split: 30, lap: 30 });
  });

  it("is empty before START or before the first lap", () => {
    expect(getRecentLapRows(initialCaptureTimerState, 4)).toEqual([]);
    expect(getRecentLapRows(run([{ type: "start", videoTime: 1 }]), 4)).toEqual([]);
  });
});
