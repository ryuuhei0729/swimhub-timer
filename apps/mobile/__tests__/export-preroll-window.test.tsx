/**
 * Sprint Contract (SC-4 / mobile-overlay-export-preview-parity)
 * V-01 / V-03 回帰テスト — export.tsx の Skia タイマー PNG シーケンス書き出し窓
 *
 * 監査結果 (PM 実測, mobile ①):
 *   書き出しは PRE_ROLL_SECONDS=3 で `seqStart=max(0,startTime-3)` からしか
 *   オーバーレイを焼かず、`enable='between(t,startT,endT)'` の外は無地。
 *   プレビュー (StopwatchSkiaOverlay) は動画先頭 (t=0) から "0:00" を表示する
 *   ため、t=0〜startTime-3 の区間だけプレビューと書き出しが食い違う
 *   (app/(app)/export.tsx:369-370)。
 *
 * このテストは ExportScreen を実際にレンダリングし、エクスポートボタン押下で
 * 実行される handleExport (非公開クロージャ) が
 *   1. renderTimerSequence に渡す startSec (= seqStart)
 *   2. seqStart > 0 のとき renderTimerFramePng で静止 "0:00" pre-roll PNG を
 *      生成し、exportVideoWithStopwatch の timerSequence.preRollImageUri に
 *      渡すこと
 * を実測する。
 *
 * 設計上の注記: 本テストの実装中に (並行作業中の) Developer の実装を git diff
 * で確認したところ、SC-1 の修正方針は「seqStart 自体を 0 にする」のではなく
 * 「[0, seqStart) を別レイヤの静止 PNG (preRollImageUri) で埋める」方式だった。
 * そのため本テストは "seqStart===0" のような実装依存の値ではなく、
 * 「pre-roll ギャップが生じる場合は必ず preRollImageUri が生成され、
 * exportVideoWithStopwatch に渡ること」という契約レベルの不変条件を検証する。
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ExportScreen from "../app/(app)/export";
import { useEditorStore, MOBILE_DEFAULT_STOPWATCH_CONFIG } from "../stores/editor-store";
import { formatTime } from "@swimhub-timer/shared";

// ---- i18n: return the raw key so button text is queryable without loading
// the real i18next instance (mirrors the pattern already used in
// oauthCodeDoubleClaimIntegration.test.tsx). ----
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

// Premium so ads / guest-limit / watermark branches are all skipped —
// isolates the assertion to the timer-sequence window computation.
jest.mock("../contexts/AuthProvider", () => ({
  useAuth: () => ({
    subscription: { plan: "premium", status: "active", premiumExpiresAt: null },
    guestMode: false,
  }),
}));

const mockRenderTimerSequence = jest.fn();
const mockRenderTimerFramePng = jest.fn();
const mockRenderFinishSummaryPng = jest.fn().mockResolvedValue(null);
const mockRenderWatermarkPng = jest.fn().mockResolvedValue(null);
const mockDeleteTimerSequence = jest.fn();

jest.mock("../lib/overlay/render-offscreen", () => ({
  renderTimerSequence: (...args: unknown[]) => mockRenderTimerSequence(...args),
  renderTimerFramePng: (...args: unknown[]) => mockRenderTimerFramePng(...args),
  renderFinishSummaryPng: (...args: unknown[]) => mockRenderFinishSummaryPng(...args),
  renderWatermarkPng: (...args: unknown[]) => mockRenderWatermarkPng(...args),
  deleteTimerSequence: (...args: unknown[]) => mockDeleteTimerSequence(...args),
}));

const mockExportVideoWithStopwatch = jest.fn();

// Spy-able expo-file-system mock for the pre-roll PNG cleanup in the
// `finally` block (app/(app)/export.tsx). That cleanup is wrapped in a
// `try { ... } catch { /* ignore */ }` — a typo there (wrong path, double
// delete, etc.) throws no visible error at runtime, so a test asserting the
// EXACT path passed to `new File(...)` is the only detection mechanism.
const mockFileCtor = jest.fn();
const mockFileDelete = jest.fn();
jest.mock("expo-file-system", () => ({
  File: class MockFile {
    uri: string;
    constructor(uri: string) {
      mockFileCtor(uri);
      this.uri = uri;
    }
    delete() {
      mockFileDelete(this.uri);
    }
  },
}));

jest.mock("../lib/video/export-pipeline", () => {
  const actual = jest.requireActual("../lib/video/export-pipeline");
  return {
    ...actual,
    // computeSummaryStartT is kept REAL (spread from actual) — export.tsx
    // imports it directly and we want the genuine clamp behaviour.
    exportVideoWithStopwatch: (...args: unknown[]) => mockExportVideoWithStopwatch(...args),
    saveToPhotoLibrary: jest.fn(),
    cleanupExportFiles: jest.fn().mockResolvedValue(undefined),
  };
});

function setBaseStoreState(overrides: Partial<ReturnType<typeof useEditorStore.getState>>) {
  useEditorStore.setState({
    ...useEditorStore.getState(),
    videoUri: "file:///mock/video.mp4",
    stopwatchConfig: MOBILE_DEFAULT_STOPWATCH_CONFIG,
    exportSettings: { resolution: "1080" },
    splitTimes: [],
    isFinished: false,
    finishTime: null,
    raceDistance: null,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRenderTimerSequence.mockResolvedValue({
    dir: "mock-seq-dir",
    pattern: "mock-seq-dir/ol_%05d.png",
    fps: 30,
    region: { x: 0, y: 0, width: 200, height: 100 },
  });
  mockRenderTimerFramePng.mockResolvedValue("mock-preroll.png");
  mockExportVideoWithStopwatch.mockResolvedValue("/mock/output.mp4");
  useEditorStore.getState().reset();
});

/**
 * Named extraction over `exportVideoWithStopwatch`'s positional call args.
 * `Parameters<typeof exportVideoWithStopwatch>` is the REAL (unmocked)
 * function's type, so if its signature is ever reordered/resized this
 * destructure — and every call site below — gets the compiler's help instead
 * of silently reading a different positional slot (was previously
 * `mock.calls[0]?.[13]` repeated at each call site).
 */
type ExportCallArgs = Parameters<
  typeof import("../lib/video/export-pipeline").exportVideoWithStopwatch
>;
function getExportCallArgs(callIndex: number) {
  const call = mockExportVideoWithStopwatch.mock.calls[callIndex] as ExportCallArgs | undefined;
  if (!call) return undefined;
  const [
    videoUri,
    startSignalTime,
    stopwatchConfig,
    isFinished,
    finishTime,
    originalVideoHeight,
    exportSettings,
    onProgress,
    showWatermark,
    summaryImageUri,
    splitTimes,
    raceDistance,
    videoDurationSec,
    timerSequence,
    watermarkImageUri,
  ] = call;
  return {
    videoUri,
    startSignalTime,
    stopwatchConfig,
    isFinished,
    finishTime,
    originalVideoHeight,
    exportSettings,
    onProgress,
    showWatermark,
    summaryImageUri,
    splitTimes,
    raceDistance,
    videoDurationSec,
    timerSequence,
    watermarkImageUri,
  };
}

async function pressExport() {
  // This RNTL version's `render`/`fireEvent` are async (test-renderer based),
  // unlike the classic react-test-renderer API.
  const { getByText } = await render(<ExportScreen />);
  const button = getByText("exportScreen.startExport");
  await fireEvent.press(button);
  await waitFor(() => expect(mockExportVideoWithStopwatch).toHaveBeenCalledTimes(1));
}

describe("[V-01] pre-roll gap (t=0..seqStart) is covered by a static overlay", () => {
  it("renders a static 0:00 pre-roll PNG and wires it into the export when startTime=10 (seqStart=7 > 0)", async () => {
    setBaseStoreState({
      startTime: 10,
      videoMetadata: { width: 1920, height: 1080, duration: 60, name: "clip.mp4" },
    });

    await pressExport();

    // The PNG sequence itself still starts at seqStart (=10-3=7) — that part
    // of the design is unchanged; the gap before it must be covered instead.
    expect(mockRenderTimerSequence).toHaveBeenCalledWith(
      expect.objectContaining({ startSec: 7, endSec: 60 }),
    );

    // The static pre-roll frame must be rendered AT elapsed=0 (frozen "0:00",
    // matching what the preview shows for the whole [0, startTime) stretch).
    expect(mockRenderTimerFramePng).toHaveBeenCalledTimes(1);
    expect(mockRenderTimerFramePng).toHaveBeenCalledWith(
      expect.objectContaining({ elapsedSeconds: 0 }),
    );

    const timerSequenceArg = getExportCallArgs(0)?.timerSequence;
    expect(timerSequenceArg).not.toBeNull();
    // The gap [0, seqStart) must be filled — a null preRollImageUri here would
    // silently reproduce the original bug (no overlay at all before seqStart).
    expect(timerSequenceArg?.preRollImageUri).toBe("mock-preroll.png");
    expect(timerSequenceArg?.startT).toBe(7);
  });

  it("deletes the pre-roll PNG by its EXACT path after the export completes (cleanup regression guard)", async () => {
    setBaseStoreState({
      startTime: 10,
      videoMetadata: { width: 1920, height: 1080, duration: 60, name: "clip.mp4" },
    });

    await pressExport();
    // The `finally` block's cleanup swallows all errors (try/catch { ignore }),
    // so waiting on the delete call itself (not just on exportVideoWithStopwatch
    // having been invoked) avoids a race against that synchronous-but-later
    // continuation.
    await waitFor(() => expect(mockFileDelete).toHaveBeenCalledTimes(1));

    // Not "some delete happened" — the EXACT path. A typo that deletes
    // `timerSequenceDir` (or any other path) instead would pass a looser
    // "was delete called" assertion but must fail this one.
    expect(mockFileCtor).toHaveBeenCalledWith("mock-preroll.png");
    expect(mockFileDelete).toHaveBeenCalledWith("mock-preroll.png");
  });

  it("does NOT render a pre-roll PNG when there is no gap (startTime=1.5, seqStart clamps to 0)", async () => {
    setBaseStoreState({
      startTime: 1.5,
      videoMetadata: { width: 1920, height: 1080, duration: 30, name: "clip.mp4" },
    });

    await pressExport();

    expect(mockRenderTimerFramePng).not.toHaveBeenCalled();
    const timerSequenceArg = getExportCallArgs(0)?.timerSequence;
    expect(timerSequenceArg?.preRollImageUri).toBeNull();
    expect(timerSequenceArg?.startT).toBe(0);
  });

  it("does NOT attempt to delete a pre-roll PNG when startTime<=3 (no gap → preRollImageUri is null, nothing to clean up)", async () => {
    setBaseStoreState({
      startTime: 1.5,
      videoMetadata: { width: 1920, height: 1080, duration: 30, name: "clip.mp4" },
    });

    await pressExport();

    // No later async work depends on the (absent) pre-roll cleanup here, so
    // there's nothing to `waitFor` — assert directly that expo-file-system's
    // File was never even constructed for this purpose (not just "delete
    // wasn't called on some already-existing instance").
    expect(mockFileCtor).not.toHaveBeenCalled();
    expect(mockFileDelete).not.toHaveBeenCalled();
  });
});

describe("[V-03] pre-roll handling does not break the export at small startTime values", () => {
  it("completes the export without throwing when startTime=0.001 (degenerate near-zero pre-roll)", async () => {
    setBaseStoreState({
      startTime: 0.001,
      videoMetadata: { width: 1920, height: 1080, duration: 30, name: "clip.mp4" },
    });

    await pressExport();

    expect(mockRenderTimerSequence).toHaveBeenCalledTimes(1);
    const args = mockRenderTimerSequence.mock.calls[0]?.[0] as
      | { startSec: number; endSec: number }
      | undefined;
    expect(args).toBeDefined();
    expect(args?.startSec).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(args?.startSec)).toBe(true);
    expect(args?.endSec).toBeGreaterThan(args?.startSec ?? -1);

    const timerSequenceArg = getExportCallArgs(0)?.timerSequence;
    expect(timerSequenceArg?.startT).toBeLessThan(timerSequenceArg?.endT ?? -1);
  });

  it("completes the export without throwing when startTime=1.5 (sub-PRE_ROLL start)", async () => {
    setBaseStoreState({
      startTime: 1.5,
      videoMetadata: { width: 1920, height: 1080, duration: 30, name: "clip.mp4" },
    });

    await pressExport();

    expect(mockRenderTimerSequence).toHaveBeenCalledTimes(1);
    const args = mockRenderTimerSequence.mock.calls[0]?.[0] as
      | { startSec: number; endSec: number }
      | undefined;
    expect(args).toBeDefined();
    expect(args?.startSec).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(args?.startSec)).toBe(true);
    expect(args?.endSec).toBeGreaterThan(args?.startSec ?? -1);

    const timerSequenceArg = getExportCallArgs(0)?.timerSequence;
    expect(timerSequenceArg?.startT).toBeLessThan(timerSequenceArg?.endT ?? -1);
  });
});

describe("[V-02] export's per-frame elapsed (and hence displayed stopwatch string) matches the preview's contract", () => {
  // StopwatchSkiaOverlay (preview) computes, for a given currentVideoTime:
  //   raw = max(0, currentVideoTime - startTime)
  //   elapsed = isFinished && finishTime !== null ? min(raw, finishTime) : raw
  // and renders formatTime(elapsed). export.tsx's `elapsedFor` closure (passed
  // to renderTimerSequence) must produce the SAME elapsed for the SAME video
  // time — this test captures the REAL closure (not a re-implementation) and
  // checks its output, via the shared real `formatTime`, against the strings
  // the Sprint Contract specifies the preview shows: "0:00"-equivalent before
  // the start signal, live count during the race, frozen at the finish time.
  it("clamps elapsed to 0 before the start signal (matches the preview's frozen '0:00')", async () => {
    setBaseStoreState({
      startTime: 10,
      videoMetadata: { width: 1920, height: 1080, duration: 60, name: "clip.mp4" },
    });

    await pressExport();

    const elapsedFor = mockRenderTimerSequence.mock.calls[0]?.[0]?.elapsedFor as
      | ((videoSeconds: number) => number)
      | undefined;
    expect(elapsedFor).toBeInstanceOf(Function);
    // Assert the RAW numeric return (not just the formatted string) — shared
    // formatTime() ALSO clamps negatives to 0, so a string-only comparison
    // here would stay green even if elapsedFor's own clamp were removed.
    expect((elapsedFor as (v: number) => number)(4)).toBe(0);
    expect(formatTime((elapsedFor as (v: number) => number)(0))).toBe(formatTime(0));
    expect(formatTime((elapsedFor as (v: number) => number)(4))).toBe(formatTime(0));
  });

  it("counts elapsed = videoTime - startTime live during the race (matches the preview's running clock)", async () => {
    setBaseStoreState({
      startTime: 10,
      videoMetadata: { width: 1920, height: 1080, duration: 60, name: "clip.mp4" },
    });

    await pressExport();

    const elapsedFor = mockRenderTimerSequence.mock.calls[0]?.[0]?.elapsedFor as (
      v: number,
    ) => number;
    expect(formatTime(elapsedFor(10 + 12.34))).toBe(formatTime(12.34));
    expect(formatTime(elapsedFor(10 + 65))).toBe(formatTime(65));
  });

  it("freezes elapsed at finishTime once finished (matches the preview's frozen finish display)", async () => {
    setBaseStoreState({
      startTime: 10,
      isFinished: true,
      finishTime: 20,
      videoMetadata: { width: 1920, height: 1080, duration: 60, name: "clip.mp4" },
    });

    await pressExport();

    const elapsedFor = mockRenderTimerSequence.mock.calls[0]?.[0]?.elapsedFor as (
      v: number,
    ) => number;
    // Well past the finish — the preview freezes the displayed time at
    // finishTime rather than continuing to count up.
    expect(formatTime(elapsedFor(10 + 45))).toBe(formatTime(20));
    expect(formatTime(elapsedFor(10 + 45))).not.toBe(formatTime(45));
  });
});
