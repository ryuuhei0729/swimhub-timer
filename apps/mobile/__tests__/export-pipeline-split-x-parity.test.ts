/**
 * Sprint Contract (SC-4 / mobile-overlay-export-preview-parity)
 * V-05 回帰テスト — drawtext フォールバックのスプリット X と共有 drawPassedSplit
 * (SC-3)
 *
 * 監査結果 (PM 実測, mobile ②):
 *   drawtext フォールバック側 (buildBoxedPositionX) は anchor 依存だったが、
 *   共有 drawPassedSplit (Skia/canvas 経路) は anchor を無視して常にタイマー
 *   ボックスの中央下に描画していた → フォールバック時のみ X 位置が食い違う。
 *
 * このテストを書く過程で (並行作業中の) Developer の実装差分を確認したところ、
 * SC-3 の実際の修正方針は「drawPassedSplit を anchor 対応にする」のではなく
 * 「drawtext フォールバック側 (buildPassedSplitFilters) を、共有 drawPassedSplit
 * と同じ『タイマーボックス中央下』の規約に合わせる」方式だった
 * (buildTimerBoxCenterXExpr が追加され、split の x は
 * `(timerCenterXExpr)-tw/2` になった)。drawtext はフォント計量にアクセスできず
 * タイマーの実測 tw を読めないため、タイマーの表示書式 (S.xx / M:SS.xx) ごとの
 * 固定幅で近似している。
 *
 * 検証方法 (テスト内でビジネスロジックを再実装しない):
 *   1. 実際に exportVideoWithStopwatch (timerSequence=null でフォールバック
 *      経路を強制) を呼び、生成された FFmpeg コマンド文字列から split の
 *      `x='...'` 式をそのまま抽出する。
 *   2. 式に埋め込まれた「タイマー幅の近似定数」(S.xx 用 / M:SS.xx 用) の数値も、
 *      正規表現でそのまま抽出する (自分で係数を計算しない)。
 *   3. 抽出した定数を、共有 drawPassedSplit / getStopwatchBounds
 *      (canvas 経路・実物) の measureText モックに逆算して与え、
 *      「タイマーボックスの中心」が両経路で同じ x 座標になることを検証する。
 *      (split 自身の tw は経路によって異なりうるため比較対象に含めない —
 *      SC-3 が保証するのは「中心の一致」であって「ピクセル完全一致」ではない)
 */
import {
  getStopwatchBounds,
  type OverlayContext,
  type StopwatchConfig,
  type SplitTime,
} from "@swimhub-timer/shared";
import { MOBILE_DEFAULT_STOPWATCH_CONFIG } from "../stores/editor-store";
import { FFmpegKit, FFprobeKit, ReturnCode } from "ffmpeg-kit-react-native";
import { exportVideoWithStopwatch } from "../lib/video/export-pipeline";

// resolveStopwatchFonts/getWatermarkIconUri swallow expo-asset failures into
// null internally (try/catch) — no explicit mock needed, this just documents
// why no expo-asset mock is required for this test.

jest.mock("ffmpeg-kit-react-native", () => ({
  FFmpegKit: { execute: jest.fn() },
  FFmpegKitConfig: { enableStatisticsCallback: jest.fn() },
  FFprobeKit: { getMediaInformation: jest.fn() },
  ReturnCode: { isSuccess: jest.fn() },
}));

jest.mock("expo-file-system", () => ({
  Paths: { cache: "/mock/cache" },
  File: class MockFile {
    uri: string;
    constructor(dir: string, name: string) {
      this.uri = `${dir}/${name}`;
    }
    get exists() {
      return false;
    }
    delete() {}
    create() {}
    write() {}
  },
}));

function makeMockCtx(measure: (ch: string) => number): OverlayContext {
  const calls: string[] = [];
  return {
    measureText: (text: string) => {
      calls.push(text);
      return { width: measure(text) };
    },
    fillText: () => {},
    fillRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    closePath: () => {},
    fill: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    set font(_v: string) {},
    set fillStyle(_v: string) {},
    set textBaseline(_v: string) {},
    set globalAlpha(_v: number) {},
    // The tabular-width helpers only read these setters; nothing reads them
    // back, so plain no-op setters (mirroring a subset of CanvasRenderingContext2D)
    // are sufficient here.
  } as unknown as OverlayContext;
}

async function runExportAndGetCommand(overrides: {
  config: StopwatchConfig;
  splitTimes: SplitTime[];
  startSignalTime: number;
}): Promise<string> {
  let capturedCommand: string | null = null;
  (FFmpegKit.execute as jest.Mock).mockImplementation(async (command: string) => {
    capturedCommand = command;
    return { getReturnCode: async () => "success" };
  });
  (ReturnCode.isSuccess as jest.Mock).mockReturnValue(true);
  (FFprobeKit.getMediaInformation as jest.Mock).mockResolvedValue({
    getMediaInformation: () => null,
  });

  await exportVideoWithStopwatch(
    "file:///mock/video.mp4",
    overrides.startSignalTime,
    overrides.config,
    false, // isFinished
    null, // finishTime
    1080, // originalVideoHeight
    { resolution: "original" },
    () => {},
    false, // showWatermark
    null, // summaryImageUri
    overrides.splitTimes,
    null, // raceDistance
    0, // videoDurationSec
    null, // timerSequence — null forces the drawtext fallback path (SC-3 target)
    null, // watermarkImageUri
  );

  expect(capturedCommand).not.toBeNull();
  return capturedCommand as unknown as string;
}

/** Pull the `x='...'` value out of the drawtext filter whose text matches the
 * split headline ("<dist>m\: ..."), without parsing/reimplementing the rest
 * of the filtergraph. */
function extractSplitXExpr(command: string, distance: number): string {
  const marker = `${distance}m\\:`;
  const idx = command.indexOf(marker);
  expect(idx).toBeGreaterThan(-1);
  // Walk backwards from the text= marker to the start of this drawtext= block.
  const blockStart = command.lastIndexOf("drawtext=", idx);
  const blockEnd = command.indexOf('"', idx); // closing quote of -filter_complex "..."
  const block = command.slice(blockStart, blockEnd === -1 ? undefined : blockEnd);
  const match = block.match(/x='([^']*)'/);
  expect(match).not.toBeNull();
  return (match as RegExpMatchArray)[1] as string;
}

/** Pull the TIMER's OWN (not the split's) `x=` expression — from
 * buildStopwatchFilters, unaffected by SC-3, still UNQUOTED (`x=<expr>:y=`,
 * no surrounding quotes since buildBoxedPositionX never emits raw commas).
 * Both timer drawtext filters (<60s / >=60s) share the identical `x=`, so
 * the first match is representative. */
function extractTimerXExpr(command: string): string {
  const match = command.match(/:x=([^:]+):y=/);
  expect(match).not.toBeNull();
  return (match as RegExpMatchArray)[1] as string;
}

/** Evaluate a numeric-only ffmpeg-flavoured expression at concrete `w`/`tw`
 * values — an interpreter for the SUT's own output (see evalCenterExpr's
 * doc comment for why this isn't a reimplementation of business logic). */
function evalWithWAndTw(expr: string, w: number, tw: number): number {
  const js = expr.replace(/\bw\b/g, String(w)).replace(/\btw\b/g, String(tw));
  return Function(`"use strict"; return (${js});`)();
}

/** Extract the two literal timer-width constants embedded in
 * `if(gte(<elapsed-expr>,60),<over60>,<under60>)`. Read directly from the
 * SUT's own output — not recomputed from font-metric ratios — so this test
 * doesn't duplicate the production approximation formula. */
function extractTimerWidthConstants(xExpr: string): { under60: number; over60: number } {
  const match = xExpr.match(/if\(gte\(.+?\),\s*([\d.]+),\s*([\d.]+)\)/);
  expect(match).not.toBeNull();
  const [, over60Str, under60Str] = match as RegExpMatchArray;
  return { over60: Number(over60Str), under60: Number(under60Str) };
}

/** Evaluate the (numeric-only, ffmpeg-flavoured) center expression at a
 * concrete `w`, given which bucket (`<60s` vs `>=60s`) applies — decided by
 * the caller from a concrete elapsed value, using the SAME `if(gte(...))`
 * literal branch the production expression already embeds (extracted via
 * `extractTimerWidthConstants`, not recomputed). Only `+`, `-`, `*`, `/`,
 * parens and `w` remain after that substitution, so no generic ffmpeg
 * expression parser is needed. */
function evalCenterExpr(
  expr: string,
  w: number,
  branch: { over60: number; under60: number },
  elapsed: number,
): number {
  const literal = elapsed >= 60 ? branch.over60 : branch.under60;
  const withBranchResolved = expr.replace(
    /if\(gte\(.+?\),\s*[\d.]+,\s*[\d.]+\)/,
    String(literal),
  );
  expect(withBranchResolved).not.toBe(expr); // the substitution must have applied
  const js = withBranchResolved.replace(/\bw\b/g, String(w));
  return Function(`"use strict"; return (${js});`)();
}

describe("[V-05] drawtext fallback split X vs shared drawPassedSplit (SC-3)", () => {
  const split50: SplitTime = { distance: 50, time: 20, lapTime: 20, memo: "" };
  const W = 1920;

  it.each(["bottom-left", "bottom-right"] as const)(
    "anchor=%s: the fallback split's timer-center reference matches getStopwatchBounds' real center (width-dependent anchors)",
    async (anchor) => {
      const config: StopwatchConfig = {
        ...MOBILE_DEFAULT_STOPWATCH_CONFIG,
        anchor,
        position: { x: 0.4, y: 0.5 },
        fontFamily: "monospace",
        fontSize: 100,
        padding: 10,
      };

      const command = await runExportAndGetCommand({
        config,
        splitTimes: [split50],
        startSignalTime: 0,
      });

      const xExpr = extractSplitXExpr(command, 50);
      // xExpr === `(${timerCenterXExpr})-tw/2` — strip the split's OWN
      // (unknowable-in-advance) text-width term to get just the timer-center
      // sub-expression both paths must agree on.
      const centerMatch = xExpr.match(/^\((.*)\)-tw\/2$/);
      expect(centerMatch).not.toBeNull();
      const centerExpr = (centerMatch as RegExpMatchArray)[1] as string;

      const { under60, over60 } = extractTimerWidthConstants(xExpr);
      // formatTime()'s digit count depends on the ACTUAL elapsed value, not
      // just which bucket it's in — the ffmpeg estimate assumes a 2-digit
      // second count under 60s ("SS.xx") and a 1-digit minute at/after 60s
      // ("M:SS.xx"), so pick elapsed values that match that assumption
      // exactly (45s → "45.00"; 65s → "1:05.xx") rather than an arbitrary
      // value in each bucket.
      for (const [t, expectedWidth] of [
        [45, under60],
        [65, over60],
      ] as const) {
        const ffmpegCenter = evalCenterExpr(centerExpr, W, { under60, over60 }, t);

        // Feed the SAME width the ffmpeg side assumed back into a mocked
        // canvas so getStopwatchBounds() measures an IDENTICAL timer box —
        // isolating the comparison to "do both sides agree on the center
        // given the same width" rather than re-testing font-metric accuracy.
        // measureTextTabular sums: digit chars → max digit width; other
        // chars → their own measured width. "SS.xx" = 4 digits + 1 separator;
        // "M:SS.xx" = 5 digits + 2 separators. Solve for (digitW, sepW) from
        // the two SUT-reported constants so this mock reproduces exactly
        // what the ffmpeg estimate assumed, without hardcoding the
        // production font-metric ratios.
        const digitW = (2 * under60 - over60) / 3;
        const sepW = under60 - 4 * digitW;
        const ctx = makeMockCtx((ch) => (ch >= "0" && ch <= "9" ? digitW : sepW));

        const bounds = getStopwatchBounds(ctx, { width: W, height: 1080 }, config, t);
        const canvasCenter = bounds.x + bounds.width / 2;

        // bounds.width includes 2*padding (getStopwatchBounds' own box
        // convention); the ffmpeg estimate is the raw TEXT width only, so
        // subtract padding back out before comparing to it.
        expect(bounds.width - config.padding * 2).toBeCloseTo(expectedWidth, 5);
        expect(ffmpegCenter).toBeCloseTo(canvasCenter, 5);
      }
    },
  );

  it("anchor=center: the fallback split's timer-center reference is width-independent, matching getStopwatchBounds", async () => {
    const config: StopwatchConfig = {
      ...MOBILE_DEFAULT_STOPWATCH_CONFIG,
      anchor: "center",
      position: { x: 0.4, y: 0.5 },
      fontFamily: "monospace",
      fontSize: 100,
      padding: 10,
    };

    const command = await runExportAndGetCommand({
      config,
      splitTimes: [split50],
      startSignalTime: 0,
    });

    const xExpr = extractSplitXExpr(command, 50);
    const centerMatch = xExpr.match(/^\((.*)\)-tw\/2$/);
    expect(centerMatch).not.toBeNull();
    const centerExpr = (centerMatch as RegExpMatchArray)[1] as string;

    // For center/top-center/bottom-center anchors buildTimerBoxCenterXExpr
    // has no timer-width term at all (see production comment: the preview
    // frame-centers these anchors, so the box's own center already sits on
    // the anchor point) — confirm no `if(gte(...))` branching leaked in here.
    expect(centerExpr).not.toContain("if(");
    const ffmpegCenter = Function(
      `"use strict"; return (${centerExpr.replace(/\bw\b/g, String(W))});`,
    )();

    // Two deliberately different (and NOT ffmpeg-estimate-matching) widths —
    // for a center anchor the canvas center must be width-INDEPENDENT too.
    for (const width of [50, 400]) {
      const ctx = makeMockCtx(() => width / 5);
      const bounds = getStopwatchBounds(ctx, { width: W, height: 1080 }, config, 20);
      const canvasCenter = bounds.x + bounds.width / 2;
      expect(ffmpegCenter).toBeCloseTo(canvasCenter, 5);
    }

    // NOTE (Reviewer/QA finding, documented so this isn't misread later):
    // this specific anchor does NOT discriminate a pre-SC-3 regression.
    // buildBoxedPositionX's (pre-existing, unchanged) "center" case is
    // `base-tw/2`, so its box center is `(base-tw/2)+tw/2 = base` — the
    // OLD split formula (`buildBoxedPositionX(config, splitPad)`, i.e.
    // literally `base-tw/2` again before SC-3) and the NEW formula
    // (`buildTimerBoxCenterXExpr`'s `case "center": return base;`, then
    // wrapped as `(base)-tw/2` by the caller) are byte-identical strings for
    // this one anchor. Verified by mutation: reverting the split xExpr to
    // the pre-SC-3 `buildBoxedPositionX(config, splitPad)` call (see
    // git history / QA report) leaves THIS test green while the
    // bottom-left/bottom-right cases above go red — i.e. this assertion
    // block is a real, passing check (not a tautology) but it happens to be
    // incapable of catching a left/right-anchor-style regression. It exists
    // to confirm width-independence for this anchor family, not as a
    // substitute for the bottom-left/bottom-right regression coverage above.
  });

  it("anchor=bottom-center (position.x=0.2, deliberately != 0.5): the split centers on the TIMER's own actual box center, not on w*position.x", async () => {
    // position.x is intentionally NOT 0.5 here: buildTimerBoxCenterXExpr's
    // fix for this anchor returns the constant `(w/2)`, which happens to
    // equal `(w*position.x)` when position.x=0.5 — using 0.5 would let a
    // reverted (pre-fix) implementation pass by coincidence, exactly the
    // trap the anchor=center case above documents for a DIFFERENT reason.
    const config: StopwatchConfig = {
      ...MOBILE_DEFAULT_STOPWATCH_CONFIG,
      anchor: "bottom-center",
      position: { x: 0.2, y: 0.5 },
      fontFamily: "monospace",
      fontSize: 100,
      padding: 10,
    };

    const command = await runExportAndGetCommand({
      config,
      splitTimes: [split50],
      startSignalTime: 0,
    });

    const splitXExpr = extractSplitXExpr(command, 50);
    const centerMatch = splitXExpr.match(/^\((.*)\)-tw\/2$/);
    expect(centerMatch).not.toBeNull();
    const splitCenterExpr = (centerMatch as RegExpMatchArray)[1] as string;

    // Oracle: NOT getStopwatchBounds here. getStopwatchBounds' calculatePosition
    // ("bottom-center") is position.x-DEPENDENT (center = w*position.x — verified
    // separately: calculatePosition({x:0.2,...}, "bottom-center", ...) returns a
    // box whose center is 384 = 1920*0.2, not 960 = 1920/2), whereas
    // buildBoxedPositionX's ffmpeg "bottom-center" case is position.x-INDEPENDENT
    // (`(w-tw)/2`, frame-centered) — a separate, pre-existing mismatch between
    // the canvas preview and the ffmpeg fallback's TIMER placement itself,
    // unrelated to SC-3 and out of this ticket's scope (reported to PM
    // separately). Using getStopwatchBounds as the oracle here would fail for
    // that unrelated reason regardless of whether SC-3's split-centering fix is
    // correct, so instead this test checks INTERNAL consistency within the
    // ffmpeg fallback path only: the split must center on wherever the TIMER's
    // OWN drawtext filter (buildBoxedPositionX, unaffected by SC-3) actually
    // places the timer box, i.e. textOriginX + tw/2 (tw = the timer's REAL,
    // per-frame ffmpeg `tw` — this identity holds for ANY tw for center-family
    // anchors, since `(w-tw)/2 + tw/2 = w/2` cancels tw algebraically; checked
    // at two different tw values below to prove that, not just assume it).
    const timerXExpr = extractTimerXExpr(command);
    expect(timerXExpr).toBe("(w-tw)/2");

    const splitCenterValue = evalWithWAndTw(splitCenterExpr, W, 0 /* tw unused here */);
    for (const tw of [0, 137, 511]) {
      const timerBoxCenter = evalWithWAndTw(timerXExpr, W, tw) + tw / 2;
      expect(timerBoxCenter).toBeCloseTo(splitCenterValue, 5);
    }
    // And, since it's tw-independent, it must equal W/2 exactly.
    expect(splitCenterValue).toBeCloseTo(W / 2, 5);
  });
});
