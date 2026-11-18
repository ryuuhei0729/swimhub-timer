import {
  assignDistancesByInterval,
  buildRaceFromCapturedMarks,
  createCapturedMarks,
  stepDistance,
  validateCapturedMarks,
  type CapturedMark,
} from "../lib/capture/captured-marks";
import { useEditorStore } from "../stores/editor-store";

const START = 2;

function marksWith(distances: (number | null)[], times = [32, 64, 97]): CapturedMark[] {
  return createCapturedMarks(times.slice(0, distances.length)).map((m, i) => ({
    ...m,
    distance: distances[i] ?? null,
  }));
}

describe("captured marks", () => {
  it("createCapturedMarks sorts by time with empty distances and unique ids", () => {
    const marks = createCapturedMarks([64, 32]);
    expect(marks.map((m) => m.videoTime)).toEqual([32, 64]);
    expect(marks.every((m) => m.distance === null)).toBe(true);
    expect(new Set(marks.map((m) => m.id)).size).toBe(2);
  });

  it("assignDistancesByInterval fills interval multiples in time order", () => {
    const marks = assignDistancesByInterval(createCapturedMarks([97, 32, 64]), 50);
    expect(marks.map((m) => [m.videoTime, m.distance])).toEqual([
      [32, 50],
      [64, 100],
      [97, 150],
    ]);
  });

  describe("validateCapturedMarks", () => {
    it("accepts complete, increasing distances", () => {
      expect(validateCapturedMarks(marksWith([50, 100, 150]), START)).toBeNull();
    });
    it("requires at least one mark", () => {
      expect(validateCapturedMarks([], START)).toBe("noMarks");
    });
    it("requires every distance", () => {
      expect(validateCapturedMarks(marksWith([50, null, 150]), START)).toBe("missingDistance");
    });
    it("rejects marks at or before the start", () => {
      expect(validateCapturedMarks(marksWith([50, 100, 150]), 32)).toBe("beforeStart");
      expect(validateCapturedMarks(marksWith([50]), null)).toBe("beforeStart");
    });
    it("rejects two marks at the same instant (a 0.00 lap)", () => {
      expect(validateCapturedMarks(marksWith([50, 100], [32, 32]), START)).toBe(
        "timeNotIncreasing",
      );
    });
    it("rejects duplicate or decreasing distances", () => {
      expect(validateCapturedMarks(marksWith([50, 50, 150]), START)).toBe("distanceNotIncreasing");
      expect(validateCapturedMarks(marksWith([100, 50, 150]), START)).toBe("distanceNotIncreasing");
    });
  });

  it("buildRaceFromCapturedMarks turns marks into splits relative to the start", () => {
    const race = buildRaceFromCapturedMarks(marksWith([50, 100, 150], [32.1, 64.25, 97.4]), START);
    expect(race).not.toBeNull();
    expect(race!.raceDistance).toBe(150);
    expect(race!.finishTime).toBeCloseTo(95.4);
    expect(race!.splitTimes.map((s) => [s.distance, s.time])).toEqual([
      [50, 30.1],
      [100, 62.25],
      [150, 95.4],
    ]);
  });
});

describe("editor store: captured marks", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.getState().setStartTime(START);
  });

  it("confirm produces the same finished state as the manual flow", () => {
    const store = useEditorStore.getState();
    store.setCapturedMarks(createCapturedMarks([32, 64, 97]));
    store.assignCapturedDistances(50);
    expect(useEditorStore.getState().confirmCapturedMarks()).toBeNull();

    const s = useEditorStore.getState();
    expect(s.isFinished).toBe(true);
    expect(s.raceDistance).toBe(150);
    expect(s.finishTime).toBe(95);
    expect(s.splitTimes.map((x) => x.distance)).toEqual([50, 100, 150]);
  });

  it("confirm fails without changing state when a distance is missing", () => {
    useEditorStore.getState().setCapturedMarks(createCapturedMarks([32, 64]));
    expect(useEditorStore.getState().confirmCapturedMarks()).toBe("missingDistance");
    expect(useEditorStore.getState().isFinished).toBe(false);
    expect(useEditorStore.getState().splitTimes).toEqual([]);
  });

  it("edit (revertFinish) keeps the marks so they can be re-confirmed", () => {
    const store = useEditorStore.getState();
    store.setCapturedMarks(createCapturedMarks([32, 64]));
    store.assignCapturedDistances(50);
    useEditorStore.getState().confirmCapturedMarks();
    useEditorStore.getState().revertFinish();

    const s = useEditorStore.getState();
    expect(s.isFinished).toBe(false);
    expect(s.capturedMarks?.map((m) => m.distance)).toEqual([50, 100]);
  });

  it("moving a mark re-sorts, and moving the start shifts every elapsed time", () => {
    const store = useEditorStore.getState();
    store.setCapturedMarks(createCapturedMarks([32, 64]));
    const [first] = useEditorStore.getState().capturedMarks!;
    useEditorStore.getState().setCapturedMarkTime(first!.id, 70);
    expect(useEditorStore.getState().capturedMarks!.map((m) => m.videoTime)).toEqual([64, 70]);

    useEditorStore.getState().assignCapturedDistances(50);
    useEditorStore.getState().setStartTime(1.5); // e.g. start signal re-detected earlier
    useEditorStore.getState().confirmCapturedMarks();
    expect(useEditorStore.getState().splitTimes.map((x) => x.time)).toEqual([62.5, 68.5]);
  });

  it("moving the start after confirming rebuilds the splits on the new baseline", () => {
    const store = useEditorStore.getState();
    store.setCapturedMarks(createCapturedMarks([32, 64]));
    store.assignCapturedDistances(50);
    useEditorStore.getState().confirmCapturedMarks();
    expect(useEditorStore.getState().finishTime).toBe(62);

    useEditorStore.getState().setStartTime(1.5); // start re-confirmed earlier in "Change" mode
    const s = useEditorStore.getState();
    expect(s.isFinished).toBe(true);
    expect(s.finishTime).toBe(62.5);
    expect(s.splitTimes.map((x) => x.time)).toEqual([30.5, 62.5]);
  });

  it("a new start after a mark drops back to assignment instead of keeping stale splits", () => {
    const store = useEditorStore.getState();
    store.setCapturedMarks(createCapturedMarks([32, 64]));
    store.assignCapturedDistances(50);
    useEditorStore.getState().confirmCapturedMarks();

    useEditorStore.getState().setStartTime(40); // after the first lap
    const s = useEditorStore.getState();
    expect(s.startTime).toBe(40);
    expect(s.isFinished).toBe(false);
    expect(s.splitTimes).toEqual([]);
    expect(s.capturedMarks).toHaveLength(2);
  });

  it("setStartTime before any confirmation just sets the start", () => {
    useEditorStore.getState().setCapturedMarks(createCapturedMarks([32]));
    useEditorStore.getState().setStartTime(5);
    const s = useEditorStore.getState();
    expect(s.startTime).toBe(5);
    expect(s.isFinished).toBe(false);
    expect(s.splitTimes).toEqual([]);
  });

  it("Edit (revertFinish) drops the confirmed splits but keeps the marks", () => {
    const store = useEditorStore.getState();
    store.setCapturedMarks(createCapturedMarks([32, 64]));
    store.assignCapturedDistances(50);
    useEditorStore.getState().confirmCapturedMarks();
    useEditorStore.getState().revertFinish();
    const s = useEditorStore.getState();
    expect(s.splitTimes).toEqual([]);
    expect(s.capturedMarks).toHaveLength(2);
  });

  it("add/remove marks", () => {
    const store = useEditorStore.getState();
    store.setCapturedMarks(createCapturedMarks([32]));
    useEditorStore.getState().addCapturedMark(20);
    const marks = useEditorStore.getState().capturedMarks!;
    expect(marks.map((m) => m.videoTime)).toEqual([20, 32]);
    useEditorStore.getState().removeCapturedMark(marks[0]!.id);
    expect(useEditorStore.getState().capturedMarks!.map((m) => m.videoTime)).toEqual([32]);
  });

  it("reset clears the marks", () => {
    useEditorStore.getState().setCapturedMarks(createCapturedMarks([32]));
    useEditorStore.getState().reset();
    expect(useEditorStore.getState().capturedMarks).toEqual([]);
  });
});

describe("stepDistance (editor −/+ buttons)", () => {
  it("+ moves to the next 25 m boundary", () => {
    expect(stepDistance(30, 1, null)).toBe(50);
    expect(stepDistance(50, 1, null)).toBe(75);
    expect(stepDistance(12.5, 1, null)).toBe(25);
  });

  it("− moves to the previous 25 m boundary, never below 25", () => {
    expect(stepDistance(30, -1, null)).toBe(25);
    expect(stepDistance(75, -1, null)).toBe(50);
    expect(stepDistance(50, -1, null)).toBe(25);
    expect(stepDistance(25, -1, null)).toBe(25);
  });

  it("empty: next 25 m boundary above the previous mark's distance, either direction", () => {
    expect(stepDistance(null, 1, 50)).toBe(75);
    expect(stepDistance(null, -1, 50)).toBe(75);
    expect(stepDistance(null, 1, 30)).toBe(50);
  });

  it("empty with no previous distance: 25", () => {
    expect(stepDistance(null, 1, null)).toBe(25);
    expect(stepDistance(null, -1, null)).toBe(25);
  });
});
