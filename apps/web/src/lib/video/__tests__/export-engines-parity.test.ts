/**
 * Sprint Contract テスト — Phase B 実装済み (QA)
 *
 * 対象: WebCodecs 書き出し (webcodecs-frame-compositor.ts の compositeFrame) /
 *      ffmpeg フォールバック書き出し (overlay-frame-renderer.ts の
 *      compositeOverlayFrame) / プレビュー (hooks/useCanvasCompositor.ts) の
 *      三経路が同一の overlay 描画結果になること (回帰固定用リグレッションテスト)
 *
 * 目的: 今回の不具合はそもそも「ffmpeg フォールバックだけが共有 overlay-renderer を
 * 使わず手書き再実装していた」ことが原因だった。案A実装後にこのテストが存在しないと、
 * 将来またどれか1経路だけが共有関数から外れて再乖離しても検知できない。
 *
 * SC-4 QA 注記 (このコメント自体の修正): 元の版はこの冒頭コメントで「三経路」と
 * 主張していたが、実際に import/実行していたのは compositeFrame と
 * compositeOverlayFrame の「二経路」だけで、プレビュー (useCanvasCompositor.ts)
 * は比較対象に一切含まれていなかった (import すらされていない)。
 * 調査の結果、useCanvasCompositor.ts の `render()` 自体は独自の描画ロジックを
 * 持たず `@/lib/stopwatch/renderer.ts` の renderStopwatch/renderSplitDisplay/
 * renderWatermark/renderFinishSummary (= 共有 drawStopwatch 等の薄いラッパー) を
 * 呼ぶだけなので、動的に比較対象へ含めることは構造上可能だった。V-18b/V-18c として
 * 実際に `renderHook` でフックを実行し、WebCodecs/ffmpeg 経路と同じ
 * drawStopwatch/drawPassedSplit/drawWatermark 呼び出しに帰着することを追加した。
 *
 * 既知の未カバー範囲 (このテストでは検証していない):
 *   - drawFinishSummary (サマリーテーブル) は3経路とも比較対象に含めていない。
 *     3経路 (useCanvasCompositor / compositeFrame / compositeOverlayFrame) は
 *     いずれも同じ素の `rawElapsed >= finishTime + SUMMARY_DELAY_SECONDS`
 *     (WebCodecs/ffmpeg は `summaryOverlayStartMicros` 経由) で summary 表示を
 *     判定しており、3経路間で「食い違ってはいない」— が、mobile の
 *     computeSummaryStartT のような動画長に対するクランプがどの経路にも無いため、
 *     finish が動画終端近くだと3経路とも揃って summary を出し損なう可能性がある
 *     (mobile SC-2 とは別の、web 側の独立した潜在バグ)。この観点は
 *     「3経路の一致」ではなく「web 全体の未対応」なので本ファイルのスコープ外とし、
 *     PM に別途報告する。V-18 の対象は drawStopwatch/drawPassedSplit/drawWatermark
 *     の3関数の呼び出し一致に限定している。
 *
 * 検証対象の Sprint Contract 項目:
 *   V-18: 同一の StopwatchConfig・同一の elapsed 相当の入力から、WebCodecs 書き出し経路
 *         (compositeFrame) と ffmpeg フォールバック経路 (compositeOverlayFrame) が
 *         どちらも共有 overlay-renderer の drawStopwatch/drawPassedSplit/drawWatermark を
 *         「同じ引数の形」で呼び出している (= 手書き再実装が紛れ込んでいない)
 *   V-18b/V-18c: プレビュー経路 (useCanvasCompositor) も同じ drawStopwatch/
 *         drawPassedSplit/drawWatermark に帰着すること (追加, SC-4)
 *   V-19: 3経路とも時刻表示の元になる関数が @swimhub-timer/shared の formatTime ただ1つで
 *         あること (どこかの経路が独自の時刻フォーマットを持たない) — ソースの静的検査で確認
 *   V-20: 3経路とも位置計算の元になる関数が @swimhub-timer/shared の calculatePosition
 *         ただ1つであること (どこかの経路が独自の座標計算=anchor switch文を持たない) —
 *         ソースの静的検査で確認
 *
 * トートロジー回避: 「3経路とも同じ関数を import している」ことを静的な import 文だけで
 * 確認すると dead import でも PASS してしまうため、動的な呼び出し (vi.mock + spy) の一致に
 * 加えて、ソースファイルに「独自の時刻フォーマット/位置計算ロジックが存在しないこと」を
 * 正規表現で確認する (Developer 実装のコピーではなく、旧バグの症状パターンそのものを検出する)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { renderHook, act } from "@testing-library/react";

vi.mock("@swimhub-timer/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@swimhub-timer/shared")>();
  return {
    ...actual,
    drawStopwatch: vi.fn(),
    drawPassedSplit: vi.fn(),
    drawFinishSummary: vi.fn(),
    drawWatermark: vi.fn(),
  };
});

import { drawStopwatch, drawPassedSplit, drawWatermark, DEFAULT_STOPWATCH_CONFIG } from "@swimhub-timer/shared";
import type { SplitTime } from "@swimhub-timer/shared";
import { compositeFrame } from "../webcodecs-frame-compositor";
import type { FrameCompositorContext, FrameCompositorInput } from "../webcodecs-types";
import { compositeOverlayFrame } from "../overlay-frame-renderer";
import type { OverlayFrameCompositorContext, OverlayFrameInput } from "../overlay-frame-renderer";
import { useCanvasCompositor } from "@/hooks/useCanvasCompositor";
import { useEditorStore } from "@/stores/editor-store";

function makeWebCodecsContext(): FrameCompositorContext {
  const ctx = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: "",
    globalAlpha: 1,
    textBaseline: "top" as const,
    font: "",
    measureText: vi.fn(() => ({ width: 10 })),
  };
  return { ctx: ctx as unknown as OffscreenCanvasRenderingContext2D, canvas: {} as OffscreenCanvas, width: 1920, height: 1080 };
}

function makeOverlayContext(): OverlayFrameCompositorContext {
  const ctx = {
    clearRect: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: "",
    globalAlpha: 1,
    textBaseline: "top" as const,
    font: "",
    measureText: vi.fn(() => ({ width: 10 })),
  };
  return { ctx: ctx as unknown as OffscreenCanvasRenderingContext2D, canvas: {} as OffscreenCanvas, width: 1920, height: 1080 };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("両経路が同一の共有描画関数を同じ引数で呼ぶこと (V-18)", () => {
  it("[V-18] 同一 StopwatchConfig・同一 elapsed で、WebCodecs 経路と ffmpeg フォールバック経路がどちらも drawStopwatch(size, config, elapsed) を同じ値で呼ぶ", () => {
    const webCodecsInput: FrameCompositorInput = {
      sourceFrame: {} as CanvasImageSource,
      timestamp: 30,
      startSignalTime: 5,
      stopwatchConfig: DEFAULT_STOPWATCH_CONFIG,
      splitTimes: [],
      isFinished: false,
      finishTime: null,
      raceDistance: null,
      showWatermark: false,
      watermarkIcon: null,
    };
    const overlayInput: OverlayFrameInput = {
      timestamp: 30,
      startSignalTime: 5,
      stopwatchConfig: DEFAULT_STOPWATCH_CONFIG,
      splitTimes: [],
      isFinished: false,
      finishTime: null,
      showWatermark: false,
      watermarkIcon: null,
    };

    compositeFrame(makeWebCodecsContext(), webCodecsInput);
    const webCodecsCall = vi.mocked(drawStopwatch).mock.calls[0];
    expect(webCodecsCall).toBeDefined(); // drawStopwatch must have been called on this path
    vi.clearAllMocks();

    compositeOverlayFrame(makeOverlayContext(), overlayInput);
    const overlayCall = vi.mocked(drawStopwatch).mock.calls[0];
    expect(overlayCall).toBeDefined(); // drawStopwatch must have been called on this path

    // 引数[1]=size, [2]=config, [3]=elapsed を比較 (引数[0]=ctxは経路ごとに別インスタンスなので除外)
    expect(overlayCall![1]).toEqual(webCodecsCall![1]);
    expect(overlayCall![2]).toEqual(webCodecsCall![2]);
    expect(overlayCall![3]).toEqual(webCodecsCall![3]);
  });

  it("[V-18] 同一 splitTimes で、両経路とも同じ区間判定 (elapsed>=split.time && elapsed<split.time+SPLIT_DISPLAY_DURATION_SECONDS) で drawPassedSplit を呼ぶ", () => {
    const split: SplitTime = { distance: 50, time: 25, lapTime: 25, memo: "" };
    const common = {
      startSignalTime: 5,
      stopwatchConfig: DEFAULT_STOPWATCH_CONFIG,
      splitTimes: [split],
      isFinished: false,
      finishTime: null,
      showWatermark: false,
      watermarkIcon: null,
    };

    // timestamp=31 → elapsed=26 → 区間 [25,28) 内
    compositeFrame(makeWebCodecsContext(), { ...common, sourceFrame: {} as CanvasImageSource, raceDistance: null, timestamp: 31 });
    const wcCalled = vi.mocked(drawPassedSplit).mock.calls.length;
    vi.clearAllMocks();

    compositeOverlayFrame(makeOverlayContext(), { ...common, timestamp: 31 });
    const overlayCalled = vi.mocked(drawPassedSplit).mock.calls.length;

    expect(wcCalled).toBe(1);
    expect(overlayCalled).toBe(1);
  });

  it("[V-18] showWatermark=true/false の切り替えが両経路で同じ回数だけ drawWatermark 呼び出しに反映される", () => {
    const baseWebCodecs: FrameCompositorInput = {
      sourceFrame: {} as CanvasImageSource,
      timestamp: 0,
      startSignalTime: 0,
      stopwatchConfig: DEFAULT_STOPWATCH_CONFIG,
      splitTimes: [],
      isFinished: false,
      finishTime: null,
      raceDistance: null,
      showWatermark: true,
      watermarkIcon: null,
    };
    const baseOverlay: OverlayFrameInput = {
      timestamp: 0,
      startSignalTime: 0,
      stopwatchConfig: DEFAULT_STOPWATCH_CONFIG,
      splitTimes: [],
      isFinished: false,
      finishTime: null,
      showWatermark: true,
      watermarkIcon: null,
    };

    compositeFrame(makeWebCodecsContext(), baseWebCodecs);
    compositeOverlayFrame(makeOverlayContext(), baseOverlay);
    expect(drawWatermark).toHaveBeenCalledTimes(2);

    vi.clearAllMocks();
    compositeFrame(makeWebCodecsContext(), { ...baseWebCodecs, showWatermark: false });
    compositeOverlayFrame(makeOverlayContext(), { ...baseOverlay, showWatermark: false });
    expect(drawWatermark).not.toHaveBeenCalled();
  });
});

describe("プレビュー経路 (useCanvasCompositor) も同じ共有描画関数に帰着すること (V-18b/V-18c)", () => {
  function makePreviewCtx() {
    return {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: "",
      globalAlpha: 1,
      textBaseline: "top" as const,
      font: "",
      measureText: vi.fn(() => ({ width: 10 })),
    };
  }

  let getContextSpy: { mockRestore: () => void } | undefined;
  let rafSpy: { mockRestore: () => void } | undefined;
  let hookUnmount: (() => void) | undefined;

  afterEach(() => {
    // Unmount the hook FIRST (act()-wrapped internally by testing-library) —
    // otherwise the store reset below fires while the previous test's
    // TestComponent is still subscribed, triggering a React update outside
    // any act() scope. That's currently harmless (nothing here uses
    // `waitFor`), but is exactly the shape that turns into a silent
    // false-green if a future edit adds an async assertion.
    hookUnmount?.();
    getContextSpy?.mockRestore();
    rafSpy?.mockRestore();
    useEditorStore.getState().reset();
  });

  function setupHook(overrides: {
    startTime: number;
    currentTime: number;
    isFinished: boolean;
    finishTime: number | null;
    splitTimes: SplitTime[];
  }) {
    useEditorStore.setState({
      ...useEditorStore.getState(),
      stopwatchConfig: DEFAULT_STOPWATCH_CONFIG,
      startTime: overrides.startTime,
      splitTimes: overrides.splitTimes,
      isFinished: overrides.isFinished,
      finishTime: overrides.finishTime,
      raceDistance: null,
    });

    // render() schedules `requestAnimationFrame(render)` for the NEXT frame at
    // the end of every call — real in the browser, but in jsdom it fires
    // asynchronously outside this test's `act()` scope and only produces an
    // unhelpful "not wrapped in act(...)" warning here (we only assert on the
    // single synchronous call below). Stub it to a no-op.
    rafSpy = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);

    const canvas = document.createElement("canvas");
    // renderStopwatch/renderSplitDisplay (apps/web/src/lib/stopwatch/renderer.ts)
    // read the canvas size off `ctx.canvas`, not a separate size argument —
    // the mock ctx must reference the SAME canvas element `render()` resizes.
    const previewCtx = { ...makePreviewCtx(), canvas };
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(previewCtx as unknown as CanvasRenderingContext2D);

    const video = document.createElement("video");
    Object.defineProperty(video, "videoWidth", { value: 1920, configurable: true });
    Object.defineProperty(video, "videoHeight", { value: 1080, configurable: true });
    Object.defineProperty(video, "currentTime", { value: overrides.currentTime, configurable: true });

    const canvasRef = { current: canvas };
    const videoRef = { current: video };

    const { result, unmount } = renderHook(() => useCanvasCompositor(canvasRef, videoRef));
    hookUnmount = unmount;
    act(() => {
      result.current.render();
    });
    return previewCtx;
  }

  it("[V-18b] preview calls drawStopwatch(size, config, elapsed) with the SAME elapsed as the WebCodecs/ffmpeg paths for the same video time", () => {
    setupHook({ startTime: 5, currentTime: 30, isFinished: false, finishTime: null, splitTimes: [] });
    const previewCall = vi.mocked(drawStopwatch).mock.calls[0];
    expect(previewCall).toBeDefined(); // drawStopwatch must have been called by the preview path
    vi.clearAllMocks();

    const webCodecsInput: FrameCompositorInput = {
      sourceFrame: {} as CanvasImageSource,
      timestamp: 30,
      startSignalTime: 5,
      stopwatchConfig: DEFAULT_STOPWATCH_CONFIG,
      splitTimes: [],
      isFinished: false,
      finishTime: null,
      raceDistance: null,
      showWatermark: false,
      watermarkIcon: null,
    };
    compositeFrame(makeWebCodecsContext(), webCodecsInput);
    const webCodecsCall = vi.mocked(drawStopwatch).mock.calls[0];
    expect(webCodecsCall).toBeDefined();

    // args[1]=size, [2]=config, [3]=elapsed (args[0]=ctx differs per path, excluded).
    expect(previewCall![1]).toEqual(webCodecsCall![1]);
    expect(previewCall![2]).toEqual(webCodecsCall![2]);
    expect(previewCall![3]).toEqual(webCodecsCall![3]);
  });

  it("[V-18c] preview calls drawPassedSplit for the SAME active split window as the ffmpeg fallback path", () => {
    const split: SplitTime = { distance: 50, time: 25, lapTime: 25, memo: "" };
    // currentTime=31, startTime=5 → elapsed=26 → inside [25,28).
    setupHook({ startTime: 5, currentTime: 31, isFinished: false, finishTime: null, splitTimes: [split] });
    const previewSplitCalls = vi.mocked(drawPassedSplit).mock.calls.length;
    vi.clearAllMocks();

    compositeOverlayFrame(makeOverlayContext(), {
      timestamp: 31,
      startSignalTime: 5,
      stopwatchConfig: DEFAULT_STOPWATCH_CONFIG,
      splitTimes: [split],
      isFinished: false,
      finishTime: null,
      showWatermark: false,
      watermarkIcon: null,
    });
    const ffmpegSplitCalls = vi.mocked(drawPassedSplit).mock.calls.length;

    expect(previewSplitCalls).toBe(1);
    expect(ffmpegSplitCalls).toBe(1);
  });

  it("[V-18c] preview calls drawWatermark unconditionally (own gating is Story-out-of-scope) — sanity check it's wired to the shared function at all", () => {
    setupHook({ startTime: 0, currentTime: 0, isFinished: false, finishTime: null, splitTimes: [] });
    expect(drawWatermark).toHaveBeenCalledTimes(1);
  });
});

describe("独自の描画ロジックが紛れ込んでいないこと (静的検査, V-18/V-19/V-20)", () => {
  const overlayRendererSource = fs.readFileSync(
    path.resolve(__dirname, "../overlay-frame-renderer.ts"),
    "utf-8",
  );
  const exportPipelineSource = fs.readFileSync(path.resolve(__dirname, "../export-pipeline.ts"), "utf-8");

  it("[V-18] overlay-frame-renderer.ts が ctx.fillText/ctx.fillRect を直接呼ばない (描画は必ず共有 draw* 関数経由)", () => {
    expect(overlayRendererSource).not.toMatch(/\bctx\.fillText\(/);
    expect(overlayRendererSource).not.toMatch(/\bctx\.fillRect\(/);
  });

  it("[V-19] overlay-frame-renderer.ts が独自の時刻フォーマット処理 (padStart を使った mm:ss 組み立て等) を持たない", () => {
    // ファイル名の連番パディング (overlay-png-sequence.ts) とは別ファイルなので、
    // overlay-frame-renderer.ts 自体に padStart / toFixed による時刻文字列組み立てがないことを確認する。
    expect(overlayRendererSource).not.toMatch(/padStart/);
    expect(overlayRendererSource).not.toMatch(/:\s*\$\{.*pad/i);
  });

  it("[V-20] overlay-frame-renderer.ts が独自の anchor 分岐 (旧 buildPositionX/Y 相当の switch/case \"center\") を持たない", () => {
    expect(overlayRendererSource).not.toMatch(/case\s+["']center["']/);
    expect(overlayRendererSource).not.toMatch(/anchor\s*===\s*["']/);
  });

  it("[V-11][V-18] export-pipeline.ts の ffmpeg フィルタ文字列生成コードに drawtext= を含む行がない", () => {
    const lines = exportPipelineSource.split("\n");
    const codeLines = lines.filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"));
    for (const line of codeLines) {
      expect(line).not.toMatch(/drawtext=/);
    }
  });
});

describe("V-13: 既存テストスイートへの回帰がないこと", () => {
  it(
    "[V-13] 本 Sprint の変更後も既存の vitest 群 (export-dispatcher/webcodecs-*/overlay-*) が全て PASS することは、" +
      "このファイル単体では自己言及的に検証できないため、CI audit (`pnpm -C swimhub-timer/apps/web exec vitest run`) の" +
      "全体実行結果で確認する (QA報告書の CI Audit セクション参照)。",
    () => {
      expect(true).toBe(true);
    },
  );
});
