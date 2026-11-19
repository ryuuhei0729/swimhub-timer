import type { OverlayContext, OverlayImage, Size } from "./context";

export interface WatermarkOptions {
  /** Font family for the watermark label. Web uses the system `sans-serif`;
   *  mobile passes the bundled `NotoSansJP-Bold` so it matches the preview. */
  fontFamily?: string;
  /** Font weight token prefixed to the CSS font shorthand. */
  fontWeight?: string;
  /** Fraction of the canvas height used as the font size. Web/default 0.04;
   *  mobile passes 0.06 to match its existing FFmpeg `drawtext` watermark so
   *  the Skia preview and export agree. */
  heightFactor?: number;
  /** Lower clamp for the font size in px. Web/default 12; mobile passes 16. */
  minFontSize?: number;
  /** Corner to sit in. Default bottom-right (web); mobile puts its stopwatch
   *  card bottom-right, so it moves the watermark bottom-left. */
  corner?: "bottom-right" | "bottom-left";
}

/**
 * Render the "SwimHub Timer" watermark with an optional icon in a bottom
 * corner (bottom-right by default).
 */
export function drawWatermark(
  ctx: OverlayContext,
  size: Size,
  icon: OverlayImage | null,
  options: WatermarkOptions = {},
): void {
  const {
    fontFamily = "sans-serif",
    fontWeight = "600",
    heightFactor = 0.04,
    minFontSize = 12,
    corner = "bottom-right",
  } = options;
  const fontSize = Math.max(minFontSize, Math.round(size.height * heightFactor));
  const margin = 0.03;
  const text = "SwimHub Timer";
  const gap = fontSize * 0.3;
  const iconSize = fontSize;

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "white";

  const textWidth = ctx.measureText(text).width;
  const textY = size.height * (1 - margin);
  // The icon sits left of the text either way; bottom-left starts the group
  // (icon + gap + text) at the left margin.
  const leftEdge = size.width * margin;
  const textX =
    corner === "bottom-left"
      ? leftEdge + (icon ? iconSize + gap : 0)
      : size.width * (1 - margin) - textWidth;

  if (icon) {
    const iconX = textX - gap - iconSize;
    const iconY = textY - iconSize;
    ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
  }

  ctx.fillText(text, textX, textY);
  ctx.restore();
}
