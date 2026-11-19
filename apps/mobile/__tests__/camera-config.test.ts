import {
  buildCaptureConstraints,
  cameraOrientationFor,
  isLandscape,
  pickRecordOrientation,
} from "../lib/capture/camera-config";

jest.mock("expo-screen-orientation", () => ({
  Orientation: {
    UNKNOWN: 0,
    PORTRAIT_UP: 1,
    PORTRAIT_DOWN: 2,
    LANDSCAPE_LEFT: 3,
    LANDSCAPE_RIGHT: 4,
  },
}));

describe("camera-config", () => {
  it("maps interface orientation to vision-camera's CameraOrientation (UIKit convention)", () => {
    expect(cameraOrientationFor(3)).toBe("right"); // LANDSCAPE_LEFT
    expect(cameraOrientationFor(4)).toBe("left"); // LANDSCAPE_RIGHT
    expect(cameraOrientationFor(1)).toBe("up");
    expect(cameraOrientationFor(0)).toBeNull();
  });

  it("weights the video resolution bias ahead of 60 fps", () => {
    const videoOutput = { id: "video" } as never;
    const constraints = buildCaptureConstraints(videoOutput);
    const biases = constraints.filter((c) => "resolutionBias" in c);
    expect(biases.length).toBeGreaterThanOrEqual(9); // see the weight math in camera-config.ts
    expect(
      biases.every((c) => (c as { resolutionBias: unknown }).resolutionBias === videoOutput),
    ).toBe(true);
    expect(constraints[constraints.length - 1]).toEqual({ fps: 60 });
  });
});

describe("pickRecordOrientation", () => {
  it("prefers the real interface orientation when it is landscape", () => {
    expect(pickRecordOrientation("right", 4)).toBe("right");
    expect(pickRecordOrientation("left", 3)).toBe("left");
  });

  it("uses expo's landscape value otherwise", () => {
    expect(pickRecordOrientation(undefined, 3)).toBe("right"); // LANDSCAPE_LEFT
    expect(pickRecordOrientation("up", 4)).toBe("left"); // LANDSCAPE_RIGHT
  });

  it("never returns portrait: defaults to landscapeRight", () => {
    expect(pickRecordOrientation(undefined, null)).toBe("left");
    expect(pickRecordOrientation("up", 1)).toBe("left");
    expect(pickRecordOrientation("down", 0)).toBe("left");
  });

  it("isLandscape", () => {
    expect([0, 1, 2, 3, 4].map(isLandscape)).toEqual([false, false, false, true, true]);
  });
});
