/**
 * The stopwatch card (editor preview + export overlay), modelled on the
 * capture screen's LiveStopwatch.
 */
import { drawWatermark } from "@swimhub-timer/shared";
import type { OverlayContext, SplitTime, StopwatchConfig } from "@swimhub-timer/shared";
import {
  CARD_TIME_FONT_RATIO,
  cardMemoAt,
  cardRowsAt,
  drawStopwatchCard,
  getStopwatchCardBand,
  getStopwatchCardBounds,
} from "../lib/overlay/stopwatch-card";
import {
  MOBILE_DEFAULT_STOPWATCH_CONFIG,
  defaultCardFontSize,
  useEditorStore,
} from "../stores/editor-store";

/** Text width ∝ font px (0.6 em per glyph) so scaling is observable. */
function makeCtx() {
  const fontHistory: string[] = [];
  const texts: { text: string; x: number; y: number; font: string }[] = [];
  let font = "";
  const ctx = {
    fillText: jest.fn((text: string, x: number, y: number) => texts.push({ text, x, y, font })),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    fill: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    closePath: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    drawImage: jest.fn(),
    fillStyle: "",
    globalAlpha: 1,
    textBaseline: "top",
    measureText: jest.fn((text: string) => {
      const px = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 10);
      return { width: [...text].length * px * 0.6 };
    }),
  } as unknown as OverlayContext;
  Object.defineProperty(ctx, "font", {
    get: () => font,
    set: (v: string) => {
      font = v;
      fontHistory.push(v);
    },
  });
  return { ctx, fontHistory, texts };
}

const SIZE = { width: 1920, height: 1080 };
const config = (over: Partial<StopwatchConfig> = {}): StopwatchConfig => ({
  ...MOBILE_DEFAULT_STOPWATCH_CONFIG,
  fontSize: 82,
  ...over,
});
const split = (distance: number, time: number, memo = ""): SplitTime => ({
  distance,
  time,
  lapTime: null,
  memo,
});
const SPLITS = [
  split(50, 30),
  split(100, 61),
  split(150, 93),
  split(200, 126, "ラスト"),
  split(250, 160),
];

describe("cardRowsAt", () => {
  it("only splits already passed, latest 4, oldest first, with lap times", () => {
    expect(cardRowsAt(SPLITS, 10)).toEqual([]);
    expect(cardRowsAt(SPLITS, 61)).toEqual([
      { label: "50m", split: 30, lap: 30 },
      { label: "100m", split: 61, lap: 31 },
    ]);
    expect(cardRowsAt(SPLITS, 200).map((r) => [r.label, r.split, r.lap])).toEqual([
      ["100m", 61, 31],
      ["150m", 93, 32],
      ["200m", 126, 33],
      ["250m", 160, 34],
    ]);
  });
});

describe("cardMemoAt", () => {
  it("shows the latest split's memo for 3 s after it", () => {
    expect(cardMemoAt(SPLITS, 125)).toBeNull();
    expect(cardMemoAt(SPLITS, 126)).toBe("ラスト");
    expect(cardMemoAt(SPLITS, 128.9)).toBe("ラスト");
    expect(cardMemoAt(SPLITS, 129)).toBeNull();
    expect(cardMemoAt(SPLITS, 160)).toBeNull(); // newer split without memo
  });
});

describe("card geometry", () => {
  it("defaults to bottom-right and grows upward as laps stack", () => {
    const { ctx } = makeCtx();
    const none = getStopwatchCardBounds(ctx, SIZE, config(), 5, [], null);
    const four = getStopwatchCardBounds(ctx, SIZE, config(), 200, cardRowsAt(SPLITS, 200), null);
    expect(none.x + none.width).toBeCloseTo(1920 * 0.98);
    expect(none.y + none.height).toBeCloseTo(1080 * 0.96);
    expect(four.y + four.height).toBeCloseTo(1080 * 0.96); // same bottom edge
    expect(four.height).toBeGreaterThan(none.height);
  });

  it("scales the whole card with fontSize (the editor's resize)", () => {
    const { ctx } = makeCtx();
    const rows = cardRowsAt(SPLITS, 200);
    const a = getStopwatchCardBounds(ctx, SIZE, config({ fontSize: 60 }), 200, rows, null);
    const b = getStopwatchCardBounds(ctx, SIZE, config({ fontSize: 120 }), 200, rows, null);
    expect(b.width).toBeCloseTo(a.width * 2);
    expect(b.height).toBeCloseTo(a.height * 2);
  });

  it("the export band covers both the empty and the full card", () => {
    const { ctx } = makeCtx();
    const band = getStopwatchCardBand(ctx, SIZE, config());
    const none = getStopwatchCardBounds(ctx, SIZE, config(), 0, [], null);
    const full = getStopwatchCardBounds(ctx, SIZE, config(), 200, cardRowsAt(SPLITS, 200), "メモ");
    expect(band.top).toBeLessThanOrEqual(Math.min(none.y, full.y));
    expect(band.bottom).toBeGreaterThanOrEqual(
      Math.max(none.y + none.height, full.y + full.height),
    );
  });
});

describe("drawStopwatchCard", () => {
  it("draws the lap table (distance / SPLIT / LAP) above the time in the capture fonts", () => {
    const { ctx, texts, fontHistory } = makeCtx();
    drawStopwatchCard(ctx, SIZE, config(), 127, cardRowsAt(SPLITS, 127), cardMemoAt(SPLITS, 127));
    const drawn = texts.map((t) => t.text);
    expect(drawn).toContain("ラスト"); // memo
    expect(drawn).toContain("SPLIT");
    expect(drawn).toContain("LAP");
    expect(drawn).toContain("200m");
    expect(fontHistory).toContain("bold 82px monospace"); // time: 30pt → fontSize
    expect(fontHistory).toContain(`bold ${(12 * 82) / 30}px monospace`); // cells: 12pt
    // The running time (tabular, one glyph per call) is below the table rows.
    const rowY = texts.find((t) => t.text === "200m")!.y;
    const timeGlyphY = texts.filter((t) => t.font === "bold 82px monospace")[0]!.y;
    expect(timeGlyphY).toBeGreaterThan(rowY);
  });

  it("before any split: just the time", () => {
    const { ctx, texts } = makeCtx();
    drawStopwatchCard(ctx, SIZE, config(), 12.34, [], null);
    expect(texts.some((t) => t.text === "SPLIT")).toBe(false);
  });
});

describe("defaults", () => {
  it("card size follows the frame height like the capture screen", () => {
    expect(CARD_TIME_FONT_RATIO).toBeCloseTo(30 / 393);
    expect(defaultCardFontSize(1080)).toBe(82);
    useEditorStore.getState().reset();
    useEditorStore
      .getState()
      .setVideoMetadata({ width: 1920, height: 1080, duration: 60, name: "v" });
    const cfg = useEditorStore.getState().stopwatchConfig;
    expect(cfg.fontSize).toBe(82);
    expect(cfg.anchor).toBe("bottom-right");
  });

  it("the mobile watermark moves bottom-left; the default stays bottom-right", () => {
    const left = makeCtx();
    drawWatermark(left.ctx, SIZE, null, { corner: "bottom-left", heightFactor: 0.06 });
    const right = makeCtx();
    drawWatermark(right.ctx, SIZE, null, { heightFactor: 0.06 });
    expect(left.texts[0]!.x).toBeCloseTo(1920 * 0.03);
    expect(right.texts[0]!.x).toBeGreaterThan(1920 / 2);
  });
});
