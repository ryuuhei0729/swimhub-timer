import { Orientation } from "expo-screen-orientation";
import type { CameraOrientation, CameraVideoOutput, Constraint } from "react-native-vision-camera";

/**
 * Recording orientation for the current interface orientation.
 *
 * vision-camera's own "interface" orientation source only updates on
 * *physical* device rotation notifications, which never arrive when the app
 * rotates itself (our landscape lock) or when the iPhone's rotation lock is
 * on — recordings came out portrait (90° transform). So the capture screen
 * sets the orientation itself from the interface orientation it locked to.
 *
 * Mapping mirrors vision-camera's `CameraOrientation(interfaceOrientation:)`:
 * UIInterfaceOrientation.landscapeLeft → "right", landscapeRight → "left".
 * expo-screen-orientation's LANDSCAPE_LEFT/RIGHT are those UIKit values.
 */
export function cameraOrientationFor(orientation: Orientation): CameraOrientation | null {
  switch (orientation) {
    case Orientation.LANDSCAPE_LEFT:
      return "right";
    case Orientation.LANDSCAPE_RIGHT:
      return "left";
    case Orientation.PORTRAIT_UP:
      return "up";
    case Orientation.PORTRAIT_DOWN:
      return "down";
    default:
      return null;
  }
}

/**
 * How many times the video output's resolution bias is repeated at the front
 * of the constraint list.
 *
 * vision-camera picks one format by a weighted penalty sum (weight = distance
 * from the end of the list) and *always* appends a preview bias that wants a
 * format at least as large as the screen. A 1080p format can't meet that, and
 * the screen/16:9 aspect mismatch is weighted ×100: on an iPhone 15 Pro that is
 * ~18 × weight 3 ≈ 55, versus 4K's ~1.39 × (5 + 2) ≈ 10 for missing 1080p —
 * so 4K60 won (≈1.2 GB per minute of footage). Repeating the video bias K
 * times adds weights 5…K+4; K = 10 (Σ = 95) outweighs the preview penalty
 * even on 4:3 iPad screens (≈103 needs Σ > 72).
 */
const VIDEO_RESOLUTION_BIAS_REPEAT = 10;

/** Capture constraints: 1080p (by resolution bias) at 60 fps when available. */
export function buildCaptureConstraints(videoOutput: CameraVideoOutput): Constraint[] {
  return [
    ...Array.from({ length: VIDEO_RESOLUTION_BIAS_REPEAT }, () => ({
      resolutionBias: videoOutput,
    })),
    // 60 fps halves the frame interval (~17 ms) for checking touches in the
    // editor; the session falls back to the closest supported rate.
    { fps: 60 },
  ];
}

/**
 * Orientation to record with, decided when a recording starts.
 *
 * 1. `interfaceOrientation` — vision-camera's interface OrientationManager,
 *    created after the screen is landscape, reads the real
 *    `windowScene.interfaceOrientation`. Trusted when it is a landscape value.
 * 2. `expoLandscape` — expo-screen-orientation's value is an estimate (from
 *    device orientation; `unknown` when the phone lies flat), so only its
 *    landscape values are used.
 * 3. Otherwise landscapeRight ("left"): expo-screen-orientation's own
 *    assumption for a portrait-held device locked to landscape (its estimate;
 *    only a last resort when neither source has a landscape value).
 *
 * Never "up"/"down" — this screen is landscape-only, and a portrait value is
 * exactly the old bug (portrait files with a 90° transform).
 */
export function pickRecordOrientation(
  interfaceOrientation: CameraOrientation | null | undefined,
  expoLandscape: Orientation | null,
): CameraOrientation {
  if (interfaceOrientation === "left" || interfaceOrientation === "right") {
    return interfaceOrientation;
  }
  const fromExpo = expoLandscape === null ? null : cameraOrientationFor(expoLandscape);
  if (fromExpo === "left" || fromExpo === "right") return fromExpo;
  return "left";
}

/** Whether an expo-screen-orientation value is one of the two landscapes. */
export function isLandscape(orientation: Orientation): boolean {
  return orientation === Orientation.LANDSCAPE_LEFT || orientation === Orientation.LANDSCAPE_RIGHT;
}
