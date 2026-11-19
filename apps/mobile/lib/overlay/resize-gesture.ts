import type { StopwatchAnchor } from "@swimhub-timer/shared";

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** Smallest card time size the resize handle allows (video px). */
export const CARD_MIN_FONT_SIZE = 24;

/** Where the anchor point sits inside the box, as fractions of its size. */
function anchorFraction(anchor: StopwatchAnchor): { ax: number; ay: number } {
  const ax = anchor.endsWith("left") ? 0 : anchor.endsWith("right") ? 1 : 0.5;
  const ay = anchor.startsWith("top") ? 0 : anchor.startsWith("bottom") ? 1 : 0.5;
  return { ax, ay };
}

/**
 * The resize handle sits on the corner opposite the anchor — the corner that
 * actually moves when the box grows (bottom-right anchor → top-left handle).
 * Centred axes default to top / right.
 */
export function resizeHandleCorner(anchor: StopwatchAnchor): Corner {
  const { ax, ay } = anchorFraction(anchor);
  const v = ay > 0.5 ? "top" : ay < 0.5 ? "bottom" : "top";
  const h = ax > 0.5 ? "left" : ax < 0.5 ? "right" : "right";
  return `${v}-${h}` as Corner;
}

/**
 * Uniform scale for a handle drag of (dx, dy) screen points, given the box's
 * on-screen size when the drag started.
 *
 * The box is scaled about its anchor, so the handle corner moves along the
 * anchor→handle vector `v`. Projecting the finger's movement onto `v` and
 * scaling by `1 + (d·v)/|v|²` keeps the handle under the finger (1:1). The old
 * mapping added `dx − dy` straight onto the font size, so the box's edges —
 * several times the font size — ran ahead of the finger 4–8×.
 */
export function resizeScale(
  anchor: StopwatchAnchor,
  startWidth: number,
  startHeight: number,
  dx: number,
  dy: number,
): number {
  const { ax, ay } = anchorFraction(anchor);
  const corner = resizeHandleCorner(anchor);
  const hx = corner.endsWith("right") ? 1 : 0;
  const hy = corner.startsWith("bottom") ? 1 : 0;
  const vx = (hx - ax) * startWidth;
  const vy = (hy - ay) * startHeight;
  const len2 = vx * vx + vy * vy;
  if (len2 <= 0) return 1;
  return Math.max(0.05, 1 + (dx * vx + dy * vy) / len2);
}
