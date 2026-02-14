import type { StopwatchConfig, SplitTime } from "@/types/stopwatch";
import { formatTime } from "./formats";

function calculatePosition(
  config: StopwatchConfig,
  boxWidth: number,
  boxHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const px = config.position.x * canvasWidth;
  const py = config.position.y * canvasHeight;

  let x = px;
  let y = py;

  switch (config.anchor) {
    case "top-left":
      break;
    case "top-center":
      x = px - boxWidth / 2;
      break;
    case "top-right":
      x = px - boxWidth;
      break;
    case "bottom-left":
      y = py - boxHeight;
      break;
    case "bottom-center":
      x = px - boxWidth / 2;
      y = py - boxHeight;
      break;
    case "bottom-right":
      x = px - boxWidth;
      y = py - boxHeight;
      break;
  }

  return { x, y };
}

export function renderStopwatch(
  ctx: CanvasRenderingContext2D,
  config: StopwatchConfig,
  elapsedSeconds: number
): void {
  const timeText = formatTime(elapsedSeconds);

  ctx.font = `bold ${config.fontSize}px ${config.fontFamily}`;
  ctx.textBaseline = "top";

  const metrics = ctx.measureText(timeText);
  const textWidth = metrics.width;
  const textHeight = config.fontSize;

  const boxWidth = textWidth + config.padding * 2;
  const boxHeight = textHeight + config.padding * 2;

  const { x, y } = calculatePosition(
    config,
    boxWidth,
    boxHeight,
    ctx.canvas.width,
    ctx.canvas.height
  );

  // Background
  ctx.fillStyle = config.backgroundColor;
  ctx.beginPath();
  const r = config.borderRadius;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + boxWidth - r, y);
  ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + r);
  ctx.lineTo(x + boxWidth, y + boxHeight - r);
  ctx.quadraticCurveTo(
    x + boxWidth,
    y + boxHeight,
    x + boxWidth - r,
    y + boxHeight
  );
  ctx.lineTo(x + r, y + boxHeight);
  ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = config.textColor;
  ctx.fillText(timeText, x + config.padding, y + config.padding);
}

function formatSplitText(split: SplitTime): string {
  const timeStr = formatTime(split.time);
  if (split.lapTime !== null) {
    const lapStr = formatTime(split.lapTime);
    return `${split.distance}m: ${timeStr} (lap: ${lapStr})`;
  }
  return `${split.distance}m: ${timeStr}`;
}

export function renderSplitDisplay(
  ctx: CanvasRenderingContext2D,
  config: StopwatchConfig,
  elapsedSeconds: number,
  latestSplit: SplitTime
): void {
  const splitText = formatSplitText(latestSplit);
  const splitFontSize = Math.round(config.fontSize * 0.55);
  const memoFontSize = Math.round(config.fontSize * 0.38);
  const splitPadding = Math.round(config.padding * 0.6);
  const hasMemo = latestSplit.memo.length > 0;
  const memoGap = Math.round(splitFontSize * 0.25);

  ctx.font = `bold ${splitFontSize}px ${config.fontFamily}`;
  ctx.textBaseline = "top";
  const splitMetrics = ctx.measureText(splitText);

  let contentWidth = splitMetrics.width;
  if (hasMemo) {
    ctx.font = `${memoFontSize}px ${config.fontFamily}`;
    const memoMetrics = ctx.measureText(latestSplit.memo);
    contentWidth = Math.max(contentWidth, memoMetrics.width);
  }

  const boxWidth = contentWidth + splitPadding * 2;
  const boxHeight = splitFontSize + splitPadding * 2
    + (hasMemo ? memoGap + memoFontSize : 0);

  // Get stopwatch bounds to position below/above it
  const swBounds = getStopwatchBounds(ctx, config, elapsedSeconds);

  // Restore split font (getStopwatchBounds overwrites ctx.font)
  ctx.font = `bold ${splitFontSize}px ${config.fontFamily}`;
  ctx.textBaseline = "top";

  const gap = 4;

  const isBottomAnchor = config.anchor.startsWith("bottom");

  let y: number;

  if (isBottomAnchor) {
    y = swBounds.y - gap - boxHeight;
  } else {
    y = swBounds.y + swBounds.height + gap;
  }

  // Align horizontally with stopwatch center
  const x = swBounds.x + (swBounds.width - boxWidth) / 2;

  // Background
  ctx.fillStyle = config.backgroundColor;
  ctx.beginPath();
  const r = Math.min(config.borderRadius, boxHeight / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + boxWidth - r, y);
  ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + r);
  ctx.lineTo(x + boxWidth, y + boxHeight - r);
  ctx.quadraticCurveTo(x + boxWidth, y + boxHeight, x + boxWidth - r, y + boxHeight);
  ctx.lineTo(x + r, y + boxHeight);
  ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  // Split text
  ctx.fillStyle = config.textColor;
  ctx.font = `bold ${splitFontSize}px ${config.fontFamily}`;
  ctx.fillText(splitText, x + splitPadding, y + splitPadding);

  // Memo text
  if (hasMemo) {
    ctx.font = `${memoFontSize}px ${config.fontFamily}`;
    ctx.globalAlpha = 0.75;
    ctx.fillText(
      latestSplit.memo,
      x + splitPadding,
      y + splitPadding + splitFontSize + memoGap
    );
    ctx.globalAlpha = 1.0;
  }
}

export function getStopwatchBounds(
  ctx: CanvasRenderingContext2D,
  config: StopwatchConfig,
  elapsedSeconds: number
): { x: number; y: number; width: number; height: number } {
  const timeText = formatTime(elapsedSeconds);
  ctx.font = `bold ${config.fontSize}px ${config.fontFamily}`;
  const metrics = ctx.measureText(timeText);
  const boxWidth = metrics.width + config.padding * 2;
  const boxHeight = config.fontSize + config.padding * 2;
  const { x, y } = calculatePosition(
    config,
    boxWidth,
    boxHeight,
    ctx.canvas.width,
    ctx.canvas.height
  );
  return { x, y, width: boxWidth, height: boxHeight };
}
