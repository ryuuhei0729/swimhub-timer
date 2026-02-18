import type { StopwatchConfig, SplitTime } from "@split-sync/core";
import { formatTime } from "@split-sync/core";

/**
 * Measure the maximum digit width for the current ctx.font,
 * then draw/measure text with all digits at equal (max) width.
 */
function getDigitWidth(ctx: CanvasRenderingContext2D): number {
  let max = 0;
  for (let d = 0; d <= 9; d++) {
    const w = ctx.measureText(String(d)).width;
    if (w > max) max = w;
  }
  return max;
}

function measureTextTabular(ctx: CanvasRenderingContext2D, text: string): number {
  const dw = getDigitWidth(ctx);
  let total = 0;
  for (const ch of text) {
    total += ch >= "0" && ch <= "9" ? dw : ctx.measureText(ch).width;
  }
  return total;
}

function fillTextTabular(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
): void {
  const dw = getDigitWidth(ctx);
  let cx = x;
  for (const ch of text) {
    if (ch >= "0" && ch <= "9") {
      const charW = ctx.measureText(ch).width;
      ctx.fillText(ch, cx + (dw - charW) / 2, y);
      cx += dw;
    } else {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width;
    }
  }
}

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

  const textWidth = measureTextTabular(ctx, timeText);
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
  fillTextTabular(ctx, timeText, x + config.padding, y + config.padding);
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

  let contentWidth = measureTextTabular(ctx, splitText);
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
  fillTextTabular(ctx, splitText, x + splitPadding, y + splitPadding);

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

// Lazy-loaded watermark icon
let _watermarkIcon: HTMLImageElement | null = null;
let _iconLoadStarted = false;

function getWatermarkIcon(): HTMLImageElement | null {
  if (!_iconLoadStarted) {
    _iconLoadStarted = true;
    const img = new Image();
    img.onload = () => {
      _watermarkIcon = img;
    };
    img.src = "/apple-touch-icon.png";
  }
  return _watermarkIcon;
}

/**
 * Render the "Split Sync" watermark with icon in the bottom-right corner.
 */
export function renderWatermark(ctx: CanvasRenderingContext2D): void {
  const fontSize = Math.max(12, Math.round(ctx.canvas.height * 0.04));
  const margin = 0.03;
  const text = "Split Sync";
  const gap = fontSize * 0.3;
  const iconSize = fontSize;

  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "white";

  const textWidth = ctx.measureText(text).width;
  const textX = ctx.canvas.width * (1 - margin) - textWidth;
  const textY = ctx.canvas.height * (1 - margin);

  // Draw icon to the left of text
  const icon = getWatermarkIcon();
  if (icon) {
    const iconX = textX - gap - iconSize;
    const iconY = textY - iconSize;
    ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
  }

  ctx.fillText(text, textX, textY);
  ctx.restore();
}

export function getStopwatchBounds(
  ctx: CanvasRenderingContext2D,
  config: StopwatchConfig,
  elapsedSeconds: number
): { x: number; y: number; width: number; height: number } {
  const timeText = formatTime(elapsedSeconds);
  ctx.font = `bold ${config.fontSize}px ${config.fontFamily}`;
  const boxWidth = measureTextTabular(ctx, timeText) + config.padding * 2;
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
