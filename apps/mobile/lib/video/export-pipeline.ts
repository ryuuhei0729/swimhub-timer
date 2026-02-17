import type { StopwatchConfig, SplitTime, ExportSettings } from "@split-sync/core";
import { formatTime } from "@split-sync/core";

function getFFmpeg() {
  try {
    return require("ffmpeg-kit-react-native");
  } catch {
    throw new Error("FFmpeg is not available. Please use a development build.");
  }
}

const SPLIT_DISPLAY_DURATION = 3;

/** Escape text for FFmpeg drawtext text value (inside single quotes) */
function escapeDrawtextText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/%/g, "%%");
}

function rgbaToFFmpegColor(rgba: string): string {
  if (rgba.startsWith("rgba")) {
    const match = rgba.match(
      /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/
    );
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, "0");
      const g = parseInt(match[2]).toString(16).padStart(2, "0");
      const b = parseInt(match[3]).toString(16).padStart(2, "0");
      return `#${r}${g}${b}@${parseFloat(match[4]).toFixed(2)}`;
    }
  }
  return rgba;
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

/**
 * Build drawtext filters for the main stopwatch timer.
 * Uses separate filters to match formatTime() output:
 *  - < 60s:   SS.xx
 *  - >= 60s:  M:SS.xx
 */
function buildStopwatchFilters(
  startSignalTime: number,
  config: StopwatchConfig,
  isFinished: boolean,
  finishTime: number | null
): string[] {
  const startT = startSignalTime.toFixed(3);

  // Elapsed for text expressions (commas escaped with \, for %{eif} syntax)
  const rawText = `max(0\\, t-${startT})`;
  const elapsedText =
    isFinished && finishTime !== null
      ? `min(${finishTime.toFixed(3)}\\, ${rawText})`
      : rawText;

  // Elapsed for enable expressions (regular commas, inside single quotes)
  const rawEnable = `max(0, t-${startT})`;
  const elapsedEnable =
    isFinished && finishTime !== null
      ? `min(${finishTime.toFixed(3)}, ${rawEnable})`
      : rawEnable;

  const minutes = `trunc(${elapsedText}/60)`;
  const seconds = `trunc(mod(${elapsedText}\\,60))`;
  const centis = `trunc(mod(${elapsedText}*100\\,100))`;

  const xExpr = buildPositionX(config);
  const yExpr = buildPositionY(config);

  const baseParts = [
    `fontsize=${config.fontSize}`,
    `fontcolor=${config.textColor}`,
    `box=1`,
    `boxcolor=${rgbaToFFmpegColor(config.backgroundColor)}`,
    `boxborderw=${config.padding}`,
    `x=${xExpr}`,
    `y=${yExpr}`,
  ];

  // SS.xx (under 60 seconds)
  const textUnder60 = `%{eif\\:${seconds}\\:d\\:2}.%{eif\\:${centis}\\:d\\:2}`;
  // M:SS.xx (60 seconds and above)
  const textOver60 = `%{eif\\:${minutes}\\:d}\\:%{eif\\:${seconds}\\:d\\:2}.%{eif\\:${centis}\\:d\\:2}`;

  return [
    `drawtext=enable='lt(${elapsedEnable}, 60)':${baseParts.join(":")}:text='${textUnder60}'`,
    `drawtext=enable='gte(${elapsedEnable}, 60)':${baseParts.join(":")}:text='${textOver60}'`,
  ];
}

/**
 * Format the split display text (matches StopwatchOverlay preview).
 */
function formatSplitText(split: SplitTime): string {
  const timeStr = formatTime(split.time);
  if (split.lapTime !== null) {
    return `${split.distance}m: ${timeStr} (lap: ${formatTime(split.lapTime)})`;
  }
  return `${split.distance}m: ${timeStr}`;
}

/**
 * Build the Y position for the split display.
 * Below the stopwatch for top anchors, above for bottom anchors.
 */
function buildSplitPositionY(
  config: StopwatchConfig,
  splitFontSize: number,
  splitPadding: number
): string {
  const gap = 4;
  const isBottom = config.anchor.startsWith("bottom");
  const base = `(h*${config.position.y})`;

  if (isBottom) {
    // Stopwatch box top ≈ base - fontSize - padding
    // Split goes above: splitY = boxTop - gap - splitFontSize - splitPadding
    const offset =
      config.fontSize + config.padding + gap + splitFontSize + splitPadding;
    return `${base}-${offset}`;
  } else {
    // Stopwatch box bottom ≈ base + fontSize + padding
    // Split goes below: splitY = boxBottom + gap + splitPadding
    const offset = config.fontSize + config.padding + gap + splitPadding;
    return `${base}+${offset}`;
  }
}

/**
 * Build drawtext filters for split time displays.
 * Each split is shown for up to 3 seconds, but truncated when the next split appears.
 */
function buildSplitFilters(
  startSignalTime: number,
  config: StopwatchConfig,
  splitTimes: SplitTime[]
): string[] {
  if (splitTimes.length === 0) return [];

  const splitFontSize = Math.round(config.fontSize * 0.55);
  const splitPadding = Math.round(config.padding * 0.6);

  const xExpr = buildPositionX(config);
  const yExpr = buildSplitPositionY(config, splitFontSize, splitPadding);

  // Sort by time so we can truncate overlapping windows
  const sorted = [...splitTimes].sort((a, b) => a.time - b.time);

  const filters: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const split = sorted[i];
    const nextSplit = sorted[i + 1];

    const absStart = startSignalTime + split.time;
    // Truncate at next split's start time if it arrives within the display window
    const absEnd = nextSplit
      ? Math.min(
          absStart + SPLIT_DISPLAY_DURATION,
          startSignalTime + nextSplit.time
        )
      : absStart + SPLIT_DISPLAY_DURATION;

    if (absEnd <= absStart) continue;

    const showStart = absStart.toFixed(3);
    const showEnd = absEnd.toFixed(3);

    const text = escapeDrawtextText(formatSplitText(split));

    const parts = [
      `enable='gte(t, ${showStart})*lt(t, ${showEnd})'`,
      `fontsize=${splitFontSize}`,
      `fontcolor=${config.textColor}`,
      `box=1`,
      `boxcolor=${rgbaToFFmpegColor(config.backgroundColor)}`,
      `boxborderw=${splitPadding}`,
      `x=${xExpr}`,
      `y=${yExpr}`,
      `text='${text}'`,
    ];

    filters.push(`drawtext=${parts.join(":")}`);
  }

  return filters;
}

/** Resolve the app icon to a local file URI for FFmpeg overlay. */
async function getWatermarkIconUri(): Promise<string | null> {
  try {
    const { Asset } = require("expo-asset") as typeof import("expo-asset");
    const asset = Asset.fromModule(require("../../assets/icon.png"));
    await asset.downloadAsync();
    return asset.localUri ?? null;
  } catch {
    return null;
  }
}

/** Watermark font size for a given video height. */
function watermarkFontSize(videoHeight: number): number {
  return Math.max(16, Math.round(videoHeight * 0.06));
}

/**
 * Build a drawtext filter for the "Split Sync" watermark text in the bottom-right corner.
 */
function buildWatermarkFilter(videoHeight: number): string {
  const fontSize = watermarkFontSize(videoHeight);
  const parts = [
    `fontsize=${fontSize}`,
    `fontcolor=white@0.30`,
    `x=w-tw-w*0.03`,
    `y=h-th-h*0.03`,
    `text='Split Sync'`,
  ];
  return `drawtext=${parts.join(":")}`;
}

/**
 * Export a video with stopwatch overlay using native FFmpeg.
 */
export async function exportVideoWithStopwatch(
  videoUri: string,
  startSignalTime: number,
  stopwatchConfig: StopwatchConfig,
  splitTimes: SplitTime[],
  isFinished: boolean,
  finishTime: number | null,
  originalVideoHeight: number,
  exportSettings: ExportSettings,
  onProgress: (percent: number) => void
): Promise<string> {
  const { Paths, File } = require("expo-file-system") as typeof import("expo-file-system");
  const outputFile = new File(Paths.cache, "export_output.mp4");
  const outputPath = outputFile.uri;

  // Scale font/padding when exporting at different resolution
  // so the stopwatch maintains the same proportional size as the preview
  let scaledConfig = stopwatchConfig;
  if (
    exportSettings.resolution !== "original" &&
    originalVideoHeight > 0
  ) {
    const outputHeight = parseInt(exportSettings.resolution);
    const resScale = outputHeight / originalVideoHeight;
    scaledConfig = {
      ...stopwatchConfig,
      fontSize: Math.round(stopwatchConfig.fontSize * resScale),
      padding: Math.round(stopwatchConfig.padding * resScale),
      borderRadius: Math.round(stopwatchConfig.borderRadius * resScale),
    };
  }

  // Build filter chain
  const filters: string[] = [];

  if (exportSettings.resolution !== "original") {
    filters.push(`scale=-2:${exportSettings.resolution}`);
  }

  filters.push(
    ...buildStopwatchFilters(
      startSignalTime,
      scaledConfig,
      isFinished,
      finishTime
    )
  );
  filters.push(
    ...buildSplitFilters(startSignalTime, scaledConfig, splitTimes)
  );

  // Watermark: use output height (after scale) for font sizing
  const watermarkHeight =
    exportSettings.resolution !== "original"
      ? parseInt(exportSettings.resolution)
      : originalVideoHeight;
  filters.push(buildWatermarkFilter(watermarkHeight));

  const filterChain = filters.join(",");
  const crf = exportSettings.resolution === "original" ? "18" : "23";

  const { FFmpegKit, FFmpegKitConfig, ReturnCode } = getFFmpeg();

  // Enable progress callback
  FFmpegKitConfig.enableStatisticsCallback((statistics: any) => {
    const time = statistics.getTime();
    if (time > 0) {
      onProgress(time);
    }
  });

  // Try to resolve app icon for watermark overlay
  const iconUri = await getWatermarkIconUri();

  let command: string;
  if (iconUri) {
    // Use filter_complex to overlay icon + drawtext
    const fontSize = watermarkFontSize(watermarkHeight);
    const iconSize = fontSize;
    const gap = Math.round(fontSize * 0.4);
    const textWidthEstimate = Math.round(fontSize * 5.0);
    const iconX = `W-w-${gap}-${textWidthEstimate}-W*0.03`;
    const iconY = `H-h-H*0.03`;

    command = `-y -i "${videoUri}" -i "${iconUri}" -filter_complex "[0:v]${filterChain}[bg];[1:v]scale=${iconSize}:${iconSize},format=rgba,colorchannelmixer=aa=0.30[icon];[bg][icon]overlay=${iconX}:${iconY}[v]" -map "[v]" -map 0:a -c:v libx264 -preset medium -crf ${crf} -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`;
  } else {
    command = `-y -i "${videoUri}" -vf "${filterChain}" -c:v libx264 -preset medium -crf ${crf} -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`;
  }

  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();

  if (!ReturnCode.isSuccess(returnCode)) {
    const logs = await session.getLogsAsString();
    throw new Error(`FFmpeg export failed: ${logs}`);
  }

  return outputPath;
}

/**
 * Save the exported video to the device's photo library.
 */
export async function saveToPhotoLibrary(filePath: string): Promise<void> {
  const MediaLibrary = require("expo-media-library") as typeof import("expo-media-library");
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    throw new Error("フォトライブラリへのアクセスが許可されていません");
  }

  await MediaLibrary.saveToLibraryAsync(filePath);
}

/**
 * Clean up temporary export files.
 */
export async function cleanupExportFiles(): Promise<void> {
  try {
    const { Paths, File } = require("expo-file-system") as typeof import("expo-file-system");
    const outputFile = new File(Paths.cache, "export_output.mp4");
    outputFile.delete();
  } catch {
    // Ignore cleanup errors
  }
}
