import { resizeHandleCorner, resizeScale } from "../lib/overlay/resize-gesture";

describe("resize handle", () => {
  it("sits on the corner opposite the anchor", () => {
    expect(resizeHandleCorner("bottom-right")).toBe("top-left");
    expect(resizeHandleCorner("bottom-left")).toBe("top-right");
    expect(resizeHandleCorner("top-left")).toBe("bottom-right");
    expect(resizeHandleCorner("top-right")).toBe("bottom-left");
  });

  it("bottom-right card: dragging the top-left handle outward grows it 1:1 with the finger", () => {
    // 100×40 pt card. Handle moves along (−100, −40); dragging exactly that
    // far doubles the card (the handle ends up under the finger).
    expect(resizeScale("bottom-right", 100, 40, -100, -40)).toBeCloseTo(2);
    // 10 pt along the diagonal direction → +10 pt of diagonal → small change.
    const diag = Math.hypot(100, 40);
    const s = resizeScale("bottom-right", 100, 40, (-100 / diag) * 10, (-40 / diag) * 10);
    expect(s).toBeCloseTo(1 + 10 / diag);
  });

  it("dragging inward shrinks; perpendicular motion does nothing", () => {
    expect(resizeScale("bottom-right", 100, 40, 50, 20)).toBeCloseTo(0.5);
    // perpendicular to (−100,−40) is (40,−100)
    expect(resizeScale("bottom-right", 100, 40, 4, -10)).toBeCloseTo(1);
  });

  it("never collapses to zero or flips", () => {
    expect(resizeScale("bottom-right", 100, 40, 500, 500)).toBeGreaterThan(0);
  });
});
