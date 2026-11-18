/**
 * Reads the display size / duration of a recorded video with FFprobe.
 *
 * The camera writes landscape footage with orientation stored as a track
 * transform (rotation metadata), so the raw stream width/height can be the
 * sensor's portrait buffer. The editor and export need the *display* size —
 * the size after rotation — or the Skia overlay is laid out on the wrong axes.
 */

export interface ProbedVideo {
  width: number;
  height: number;
  duration: number;
}

/** Swaps width/height for a ±90°/270° rotation. */
export function resolveDisplaySize(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const quarterTurns = Math.round(rotation / 90);
  return Math.abs(quarterTurns) % 2 === 1 ? { width: height, height: width } : { width, height };
}

/**
 * Extracts a rotation in degrees from an FFprobe stream's properties. Newer
 * FFmpeg reports it in `side_data_list[].rotation` (display matrix); older
 * builds in `tags.rotate`.
 */
export function readRotation(properties: Record<string, unknown> | null | undefined): number {
  if (!properties) return 0;
  const sideData = properties.side_data_list;
  if (Array.isArray(sideData)) {
    for (const entry of sideData) {
      const rotation = Number((entry as Record<string, unknown> | null)?.rotation);
      if (Number.isFinite(rotation) && rotation !== 0) return rotation;
    }
  }
  const tags = properties.tags as Record<string, unknown> | undefined;
  const rotate = Number(tags?.rotate);
  return Number.isFinite(rotate) ? rotate : 0;
}

export async function probeVideo(uri: string): Promise<ProbedVideo | null> {
  try {
    const { FFprobeKit } =
      require("ffmpeg-kit-react-native") as typeof import("ffmpeg-kit-react-native");
    const session = await FFprobeKit.getMediaInformation(uri);
    const info = session.getMediaInformation();
    if (!info) return null;
    const video = info.getStreams().find((s) => s.getType() === "video");
    if (!video) return null;
    const size = resolveDisplaySize(
      Number(video.getWidth()) || 0,
      Number(video.getHeight()) || 0,
      readRotation(video.getAllProperties()),
    );
    const duration = Number(info.getDuration()) || 0;
    if (size.width <= 0 || size.height <= 0) return null;
    return { ...size, duration };
  } catch {
    return null;
  }
}

/** expo-video / expo-media-library want a URI; the recorder hands back a bare path. */
export function toFileUri(path: string): string {
  return path.startsWith("file://") ? path : `file://${path}`;
}
