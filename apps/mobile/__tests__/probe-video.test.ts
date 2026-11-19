import { readRotation, resolveDisplaySize, toFileUri } from "../lib/video/probe-video";

describe("probe-video helpers", () => {
  it("resolveDisplaySize swaps axes only for quarter turns", () => {
    expect(resolveDisplaySize(1080, 1920, 90)).toEqual({ width: 1920, height: 1080 });
    expect(resolveDisplaySize(1080, 1920, -90)).toEqual({ width: 1920, height: 1080 });
    expect(resolveDisplaySize(1080, 1920, 270)).toEqual({ width: 1920, height: 1080 });
    expect(resolveDisplaySize(1920, 1080, 180)).toEqual({ width: 1920, height: 1080 });
    expect(resolveDisplaySize(1920, 1080, 0)).toEqual({ width: 1920, height: 1080 });
  });

  it("readRotation prefers the display-matrix side data, then tags.rotate", () => {
    expect(
      readRotation({ side_data_list: [{ side_data_type: "Display Matrix", rotation: -90 }] }),
    ).toBe(-90);
    expect(readRotation({ tags: { rotate: "90" } })).toBe(90);
    expect(readRotation({ side_data_list: [], tags: {} })).toBe(0);
    expect(readRotation(undefined)).toBe(0);
  });

  it("toFileUri adds the scheme to bare paths only", () => {
    expect(toFileUri("/tmp/a.mp4")).toBe("file:///tmp/a.mp4");
    expect(toFileUri("file:///tmp/a.mp4")).toBe("file:///tmp/a.mp4");
  });
});
