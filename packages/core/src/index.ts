// Types
export type { EditorStep } from "./types/editor";
export type { VideoMetadata, ExportResolution, ExportSettings } from "./types/video";
export type { DetectedSignal, AudioAnalysisResult } from "./types/audio";
export type {
  StopwatchAnchor,
  FontFamily,
  StopwatchConfig,
  StopwatchPreset,
  SplitTime,
} from "./types/stopwatch";
export type { UserPlan, UserProfile, SubscriptionStatus } from "./types/auth";

// Utils
export {
  isActivePremium,
  getAvailableResolutions,
  getMaxSplitCount,
  shouldShowWatermark,
} from "./utils/subscription";

// Constants
export {
  SUPPORTED_VIDEO_TYPES,
  BEEP_FREQUENCY_RANGE,
  FFT_WINDOW_SIZE,
  FFT_HOP_SIZE,
} from "./constants";

// Stopwatch
export { STOPWATCH_PRESETS, DEFAULT_STOPWATCH_CONFIG } from "./stopwatch/presets";
export { formatTime } from "./stopwatch/formats";
