import type { StopwatchConfig, ExportSettings } from "@split-sync/core";
import { ffmpegManager, fetchFile } from "./ffmpeg-manager";

function buildDrawtextFilter(
  startSignalTime: number,
  config: StopwatchConfig
): string {
  const startT = startSignalTime.toFixed(3);

  // Elapsed time calculation: show 0:00.00 before start, count up after
  const elapsed = `max(0\\, t-${startT})`;
  const minutes = `trunc(${elapsed}/60)`;
  const seconds = `trunc(mod(${elapsed}\\,60))`;
  const centis = `trunc(mod(${elapsed}*100\\,100))`;

  // Auto format: SS.xx under 1min, M:SS.xx under 10min, MM:SS.xx otherwise
  // FFmpeg drawtext doesn't support conditional formatting easily,
  // so use M:SS.xx which covers all cases cleanly
  const textExpr = `%{eif\\:${minutes}\\:d}\\:%{eif\\:${seconds}\\:d\\:2}.%{eif\\:${centis}\\:d\\:2}`;

  // Position as proportional expression
  const xExpr = buildPositionX(config);
  const yExpr = buildPositionY(config);

  const parts = [
    `fontsize=${config.fontSize}`,
    `fontcolor=${config.textColor}`,
    `box=1`,
    `boxcolor=${rgbaToFFmpegColor(config.backgroundColor)}`,
    `boxborderw=${config.padding}`,
    `x=${xExpr}`,
    `y=${yExpr}`,
    `text='${textExpr}'`,
  ];

  return `drawtext=${parts.join(":")}`;
}

function buildPositionX(config: StopwatchConfig): string {
  const base = `(w*${config.position.x})`;
  switch (config.anchor) {
    case "top-center":
    case "bottom-center":
      return `${base}-tw/2`;
    case "top-right":
    case "bottom-right":
      return `${base}-tw`;
    default:
      return base;
  }
}

function buildPositionY(config: StopwatchConfig): string {
  const base = `(h*${config.position.y})`;
  switch (config.anchor) {
    case "bottom-left":
    case "bottom-center":
    case "bottom-right":
      return `${base}-th`;
    default:
      return base;
  }
}

function rgbaToFFmpegColor(rgba: string): string {
  // Convert "rgba(r,g,b,a)" or hex with alpha to ffmpeg-compatible color
  if (rgba.startsWith("rgba")) {
    const match = rgba.match(
      /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/
    );
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, "0");
      const g = parseInt(match[2]).toString(16).padStart(2, "0");
      const b = parseInt(match[3]).toString(16).padStart(2, "0");
      Math.round(parseFloat(match[4]) * 255)
        .toString(16)
        .padStart(2, "0");
      return `#${r}${g}${b}@${(parseFloat(match[4])).toFixed(2)}`;
    }
  }
  return rgba;
}

export async function exportVideoWithStopwatch(
  videoFile: File,
  startSignalTime: number,
  stopwatchConfig: StopwatchConfig,
  exportSettings: ExportSettings,
  onProgress: (percent: number) => void
): Promise<Blob> {
  const ffmpeg = await ffmpegManager.load(onProgress);

  // Write input video to virtual filesystem
  await ffmpeg.writeFile("input.mp4", await fetchFile(videoFile));

  // Build filter chain
  const filters: string[] = [];

  // Scale if not original
  if (exportSettings.resolution !== "original") {
    filters.push(`scale=-2:${exportSettings.resolution}`);
  }

  // Add stopwatch drawtext
  filters.push(buildDrawtextFilter(startSignalTime, stopwatchConfig));

  const filterChain = filters.join(",");

  // Use lower CRF for original resolution to preserve quality
  const crf = exportSettings.resolution === "original" ? "18" : "23";

  // Execute ffmpeg
  await ffmpeg.exec([
    "-i",
    "input.mp4",
    "-vf",
    filterChain,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    crf,
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "output.mp4",
  ]);

  // Read output
  const outputData = await ffmpeg.readFile("output.mp4");
  return new Blob([new Uint8Array(outputData as Uint8Array)], { type: "video/mp4" });
}
