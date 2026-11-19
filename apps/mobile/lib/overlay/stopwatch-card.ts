/**
 * The burned-in stopwatch "card" for mobile — the same look as the capture
 * screen's LiveStopwatch (components/capture/LiveStopwatch.tsx): a translucent
 * dark card with the latest laps (distance / SPLIT / LAP) stacked above the
 * running time.
 *
 * Written against the shared OverlayContext so the editor preview (Skia
 * canvas) and the export (offscreen Skia PNG sequence) run this one function —
 * the preview stays pixel-identical to the exported video.
 *
 * Every dimension is the capture screen's value in its own points, scaled by
 * `u = config.fontSize / 30` (30 = the capture time font), so resizing the card
 * in the editor (which changes fontSize) scales the whole card.
 */
import {
  SPLIT_DISPLAY_DURATION_SECONDS,
  calculatePosition,
  fillTextTabular,
  formatTime,
  measureTextTabular,
  roundedRectPath,
} from "@swimhub-timer/shared";
import type { OverlayContext, Rect, Size, SplitTime, StopwatchConfig } from "@swimhub-timer/shared";

/** LiveStopwatch's metrics in points (time font = 30). */
const BASE = {
  timeFont: 30,
  timeLine: 34,
  cellFont: 12,
  cellLine: 14,
  headFont: 8,
  headLine: 10,
  padH: 10,
  padV: 6,
  radius: 8,
  colLabel: 16,
  colTime: 54,
  lapGap: 6,
  tablePadBottom: 2,
  tableGapBottom: 2,
} as const;

/** At least this many of the latest laps stay on the card. */
export const CARD_VISIBLE_ROWS = 4;

/**
 * Default time size relative to the frame height: the capture screen's 30pt
 * time on a 393pt-tall landscape iPhone.
 */
export const CARD_TIME_FONT_RATIO = BASE.timeFont / 393;

export interface CardRow {
  /** First column, e.g. "50m". */
  label: string;
  /** Elapsed race time at this split (s). */
  split: number;
  /** Time since the previous split (s). */
  lap: number;
}

/** Splits already passed at `elapsed` (time order), the latest `count`, as card rows. */
export function cardRowsAt(
  splitTimes: readonly SplitTime[],
  elapsed: number,
  count: number = CARD_VISIBLE_ROWS,
): CardRow[] {
  const passed = [...splitTimes].sort((a, b) => a.time - b.time).filter((s) => s.time <= elapsed);
  const first = Math.max(0, passed.length - count);
  const rows: CardRow[] = [];
  for (let i = first; i < passed.length; i++) {
    const s = passed[i]!;
    const prev = i === 0 ? 0 : passed[i - 1]!.time;
    rows.push({ label: `${s.distance}m`, split: s.time, lap: s.time - prev });
  }
  return rows;
}

/**
 * The latest passed split's memo, shown on the card for the same window the
 * old split badge used (SPLIT_DISPLAY_DURATION_SECONDS after the split).
 */
export function cardMemoAt(splitTimes: readonly SplitTime[], elapsed: number): string | null {
  const passed = [...splitTimes].sort((a, b) => a.time - b.time).filter((s) => s.time <= elapsed);
  const latest = passed[passed.length - 1];
  if (!latest) return null;
  const memo = latest.memo?.trim() ?? "";
  if (memo === "" || elapsed >= latest.time + SPLIT_DISPLAY_DURATION_SECONDS) return null;
  return memo;
}

interface CardLayout {
  rect: Rect;
  u: number;
  timeText: string;
  timeWidth: number;
  memoWidth: number;
  colLabel: number;
  colSplit: number;
  colLap: number;
  tableWidth: number;
}

const monoFont = (px: number) => `bold ${px}px monospace`;
const sansFont = (px: number) => `bold ${px}px sans-serif`;

function layoutCard(
  ctx: OverlayContext,
  size: Size,
  config: StopwatchConfig,
  elapsed: number,
  rows: readonly CardRow[],
  memo: string | null,
): CardLayout {
  const u = config.fontSize / BASE.timeFont;
  const timeText = formatTime(elapsed);

  ctx.font = monoFont(BASE.timeFont * u);
  const timeWidth = measureTextTabular(ctx, timeText);

  ctx.font = monoFont(BASE.cellFont * u);
  let colLabel = BASE.colLabel * u;
  let colSplit = BASE.colTime * u;
  let colLap = BASE.colTime * u;
  for (const r of rows) {
    colLabel = Math.max(colLabel, ctx.measureText(r.label).width);
    colSplit = Math.max(colSplit, measureTextTabular(ctx, formatTime(r.split)));
    colLap = Math.max(colLap, measureTextTabular(ctx, formatTime(r.lap)));
  }
  const tableWidth = rows.length > 0 ? colLabel + colSplit + BASE.lapGap * u + colLap : 0;

  let memoWidth = 0;
  if (memo) {
    ctx.font = sansFont(BASE.cellFont * u);
    memoWidth = ctx.measureText(memo).width;
  }

  const contentWidth = Math.max(timeWidth, tableWidth, memoWidth);
  const tableHeight =
    rows.length > 0
      ? BASE.headLine * u +
        rows.length * BASE.cellLine * u +
        (BASE.tablePadBottom + BASE.tableGapBottom) * u
      : 0;
  const height =
    BASE.padV * u * 2 + (memo ? BASE.cellLine * u : 0) + tableHeight + BASE.timeLine * u;
  const width = contentWidth + BASE.padH * u * 2;
  const { x, y } = calculatePosition(
    config.position,
    config.anchor,
    width,
    height,
    size.width,
    size.height,
  );
  return {
    rect: { x, y, width, height },
    u,
    timeText,
    timeWidth,
    memoWidth,
    colLabel,
    colSplit,
    colLap,
    tableWidth,
  };
}

/** On-frame bounds of the card (for the editor's drag / resize hit area). */
export function getStopwatchCardBounds(
  ctx: OverlayContext,
  size: Size,
  config: StopwatchConfig,
  elapsed: number,
  rows: readonly CardRow[],
  memo: string | null,
): Rect {
  return layoutCard(ctx, size, config, elapsed, rows, memo).rect;
}

/**
 * Vertical band the card can occupy over a whole race (no rows → full table +
 * memo), for the export's region-cropped PNG sequence. The card's anchor keeps
 * one edge fixed, so the union of the smallest and tallest layouts covers it.
 */
export function getStopwatchCardBand(
  ctx: OverlayContext,
  size: Size,
  config: StopwatchConfig,
): { top: number; bottom: number } {
  const fullRows: CardRow[] = Array.from({ length: CARD_VISIBLE_ROWS }, (_, i) => ({
    label: `${(i + 1) * 1500}m`,
    split: 3599.99,
    lap: 3599.99,
  }));
  const small = layoutCard(ctx, size, config, 0, [], null).rect;
  const tall = layoutCard(ctx, size, config, 3599.99, fullRows, "Mg").rect;
  return {
    top: Math.min(small.y, tall.y),
    bottom: Math.max(small.y + small.height, tall.y + tall.height),
  };
}

/** Draw a right-aligned run of tabular-digit text ending at `right`. */
function fillTabularRight(ctx: OverlayContext, text: string, right: number, y: number): void {
  fillTextTabular(ctx, text, right - measureTextTabular(ctx, text), y);
}

export function drawStopwatchCard(
  ctx: OverlayContext,
  size: Size,
  config: StopwatchConfig,
  elapsed: number,
  rows: readonly CardRow[],
  memo: string | null,
): void {
  const L = layoutCard(ctx, size, config, elapsed, rows, memo);
  const { rect, u } = L;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = config.backgroundColor;
  roundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, BASE.radius * u);
  ctx.fill();

  ctx.textBaseline = "top";
  ctx.fillStyle = config.textColor;
  const right = rect.x + rect.width - BASE.padH * u;
  // Text is centred in its line box like the RN layout it copies.
  const lineOffset = (line: number, font: number) => ((line - font) / 2) * u;
  let y = rect.y + BASE.padV * u;

  if (memo) {
    ctx.font = sansFont(BASE.cellFont * u);
    ctx.globalAlpha = 0.85;
    ctx.fillText(memo, right - L.memoWidth, y + lineOffset(BASE.cellLine, BASE.cellFont));
    y += BASE.cellLine * u;
  }

  if (rows.length > 0) {
    const tableX = right - L.tableWidth;
    const splitRight = tableX + L.colLabel + L.colSplit;
    const lapRight = tableX + L.tableWidth;

    ctx.font = sansFont(BASE.headFont * u);
    ctx.globalAlpha = 0.55;
    const headY = y + lineOffset(BASE.headLine, BASE.headFont);
    ctx.fillText("SPLIT", splitRight - ctx.measureText("SPLIT").width, headY);
    ctx.fillText("LAP", lapRight - ctx.measureText("LAP").width, headY);
    y += BASE.headLine * u;

    ctx.font = monoFont(BASE.cellFont * u);
    for (const r of rows) {
      const ry = y + lineOffset(BASE.cellLine, BASE.cellFont);
      ctx.globalAlpha = 0.65;
      ctx.fillText(r.label, tableX, ry);
      ctx.globalAlpha = 1;
      fillTabularRight(ctx, formatTime(r.split), splitRight, ry);
      ctx.globalAlpha = 0.85;
      fillTabularRight(ctx, formatTime(r.lap), lapRight, ry);
      y += BASE.cellLine * u;
    }

    y += BASE.tablePadBottom * u;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(tableX, y, L.tableWidth, Math.max(1, 0.5 * u));
    y += BASE.tableGapBottom * u;
  }

  ctx.globalAlpha = 1;
  ctx.font = monoFont(BASE.timeFont * u);
  fillTextTabular(
    ctx,
    L.timeText,
    right - L.timeWidth,
    y + lineOffset(BASE.timeLine, BASE.timeFont),
  );
  ctx.restore();
}
