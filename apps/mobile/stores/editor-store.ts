import { create } from "zustand";
import type {
  EditorStep,
  StopwatchConfig,
  SplitTime,
  VideoMetadata,
  ExportSettings,
  Rect,
} from "@swimhub-timer/shared";
import { STOPWATCH_PRESETS } from "@swimhub-timer/shared";
import { CARD_TIME_FONT_RATIO } from "../lib/overlay/stopwatch-card";
import {
  assignDistancesByInterval,
  buildRaceFromCapturedMarks,
  nextCapturedMarkId,
  sortCapturedMarks,
  validateCapturedMarks,
  type CapturedMark,
  type MarkValidationError,
} from "../lib/capture/captured-marks";

// STOPWATCH_PRESETS is a non-empty literal array (see stopwatch-presets.ts),
// so the [0] fallback below is always defined.
const MOBILE_BASE_PRESET =
  STOPWATCH_PRESETS.find((p) => p.id === "minimal-white") ?? STOPWATCH_PRESETS[0]!;

// Mobile is locked to the minimal-white preset, but with a slightly darker
// backdrop so the timer reads cleanly over light pool footage.
// borderRadius is 0 so the preview matches the FFmpeg drawtext box, which is
// always square — fixing the rounded-vs-square mismatch.
/**
 * Default summary-table scale on mobile. The shared base font (13px @ native
 * video resolution) is tiny next to the ~130px timer, so the summary needs a
 * multiplier to read well by default. (Adjust to taste.)
 */
export const MOBILE_DEFAULT_SUMMARY_SCALE = 5;

export const MOBILE_DEFAULT_STOPWATCH_CONFIG: StopwatchConfig = {
  ...MOBILE_BASE_PRESET.config,
  backgroundColor: "rgba(0,0,0,0.6)",
  // The stopwatch card (lib/overlay/stopwatch-card.ts) sits bottom-right like
  // on the capture screen, its laps stacking upward. fontSize is set per video
  // in setVideoMetadata (same size relative to the frame as on capture).
  anchor: "bottom-right",
  position: { x: 0.98, y: 0.96 },
  borderRadius: 0,
  summaryScale: MOBILE_DEFAULT_SUMMARY_SCALE,
};

/** Card time size for a frame height: the capture screen's proportion. */
export function defaultCardFontSize(videoHeight: number): number {
  return Math.max(1, Math.round(videoHeight * CARD_TIME_FONT_RATIO));
}

interface AudioData {
  pcmData: Float32Array;
  sampleRate: number;
  duration: number;
}

interface EditorState {
  step: EditorStep;
  videoUri: string | null;
  videoMetadata: VideoMetadata | null;
  audioData: AudioData | null;
  waveformData: Float32Array | null;
  detectedSignalTime: number | null;
  startTime: number | null;
  isDetecting: boolean;
  stopwatchConfig: StopwatchConfig;
  exportSettings: ExportSettings;
  exportProgress: number;
  isExporting: boolean;

  currentVideoTime: number;
  pendingVideoSeek: number | null;
  pendingPause: boolean;
  setCurrentVideoTime: (time: number) => void;
  seekVideo: (time: number) => void;
  seekVideoAndPause: (time: number) => void;
  clearPendingSeek: () => void;

  // The confirmed race (set by confirmCapturedMarks; the finish is also a
  // split at raceDistance). Input happens in capturedMarks.
  splitTimes: SplitTime[];
  raceDistance: number | null;
  isFinished: boolean;
  finishTime: number | null;
  finishMemo: string;
  designConfirmed: boolean;

  // Split times being assigned distances, as absolute video times: LAP/STOP
  // presses from the camera capture screen and/or times added at the playhead
  // in the editor (both entry points use the same assignment panel).
  // Confirming turns them into splitTimes; they stay here so "Edit" can bring
  // them back.
  capturedMarks: CapturedMark[];

  // Which overlay element is currently being edited in the preview. Shared so
  // the Skia preview (StopwatchSkiaOverlay) can defer to the RN editing chrome
  // for the element under edit (keeps the selection frame aligned with the
  // glyphs), while drawing the rest WYSIWYG.
  timerEditing: boolean;
  summaryEditing: boolean;
  setTimerEditing: (editing: boolean) => void;
  setSummaryEditing: (editing: boolean) => void;

  // Screen-space bounds (relative to the overlay root) of the timer/summary as
  // drawn by the Skia preview. The RN gesture layer positions its hit areas +
  // selection frame from these so editing chrome is glued to the Skia glyphs
  // and preview == export (single geometry: shared calculatePosition).
  timerPreviewBounds: Rect | null;
  summaryPreviewBounds: Rect | null;
  setPreviewBounds: (bounds: { timer: Rect | null; summary: Rect | null }) => void;

  setStep: (step: EditorStep) => void;
  setVideoUri: (uri: string) => void;
  clearVideo: () => void;
  setVideoMetadata: (metadata: VideoMetadata) => void;
  setAudioData: (data: AudioData) => void;
  setWaveformData: (data: Float32Array) => void;
  setDetectedSignalTime: (time: number | null) => void;
  setStartTime: (time: number | null) => void;
  setIsDetecting: (detecting: boolean) => void;
  updateStopwatchConfig: (partial: Partial<StopwatchConfig>) => void;
  setStopwatchConfig: (config: StopwatchConfig) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  setExportProgress: (progress: number) => void;
  setIsExporting: (exporting: boolean) => void;
  setDesignConfirmed: (confirmed: boolean) => void;
  /** "Edit": back to assigning distances; the marks are kept. */
  revertFinish: () => void;
  setCapturedMarks: (marks: CapturedMark[]) => void;
  setCapturedMarkDistance: (id: string, distance: number | null) => void;
  setCapturedMarkTime: (id: string, videoTime: number) => void;
  setCapturedMarkMemo: (id: string, memo: string) => void;
  addCapturedMark: (videoTime: number) => void;
  removeCapturedMark: (id: string) => void;
  assignCapturedDistances: (interval: number) => void;
  /** Turns the captured marks into splits + finish. Returns the reason on failure. */
  confirmCapturedMarks: () => MarkValidationError | null;
  reset: () => void;
}

const initialState = {
  step: "import" as EditorStep,
  videoUri: null as string | null,
  videoMetadata: null as VideoMetadata | null,
  audioData: null as AudioData | null,
  waveformData: null as Float32Array | null,
  detectedSignalTime: null as number | null,
  startTime: null as number | null,
  isDetecting: false,
  stopwatchConfig: { ...MOBILE_DEFAULT_STOPWATCH_CONFIG },
  exportSettings: { resolution: "1080" as const },
  exportProgress: 0,
  isExporting: false,
  currentVideoTime: 0,
  pendingVideoSeek: null as number | null,
  pendingPause: false,
  splitTimes: [] as SplitTime[],
  raceDistance: null as number | null,
  isFinished: false,
  finishTime: null as number | null,
  finishMemo: "",
  designConfirmed: false,
  capturedMarks: [] as CapturedMark[],
  timerEditing: false,
  summaryEditing: false,
  timerPreviewBounds: null as Rect | null,
  summaryPreviewBounds: null as Rect | null,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  setVideoUri: (uri) => {
    set({ videoUri: uri, step: "detect" });
  },

  clearVideo: () => {
    set({
      ...initialState,
      stopwatchConfig: get().stopwatchConfig,
    });
  },

  setVideoMetadata: (metadata) =>
    set((state) => ({
      videoMetadata: metadata,
      // Size the card to this video, as on the capture screen; the user can
      // still resize it in the editor afterwards.
      stopwatchConfig: {
        ...state.stopwatchConfig,
        fontSize: defaultCardFontSize(metadata.height),
      },
    })),
  setAudioData: (data) => set({ audioData: data }),
  setWaveformData: (data) => set({ waveformData: data }),
  setDetectedSignalTime: (time) => set({ detectedSignalTime: time }),
  setStartTime: (time) => {
    const { capturedMarks, isFinished } = get();
    // Captured marks are absolute video times, so a confirmed camera session
    // can follow a moved start (e.g. re-detected start signal) — rebuild the
    // splits instead of leaving them on the old baseline. If the new start
    // makes the marks invalid (a mark before it), drop back to assignment.
    if (time !== null && isFinished && capturedMarks.length > 0) {
      const race = buildRaceFromCapturedMarks(capturedMarks, time);
      if (race) {
        set({
          startTime: time,
          splitTimes: race.splitTimes,
          finishTime: race.finishTime,
          raceDistance: race.raceDistance,
        });
      } else {
        set({
          startTime: time,
          splitTimes: [],
          isFinished: false,
          finishTime: null,
          finishMemo: "",
        });
      }
      return;
    }
    set({ startTime: time });
  },
  setIsDetecting: (detecting) => set({ isDetecting: detecting }),

  updateStopwatchConfig: (partial) =>
    set((state) => ({
      stopwatchConfig: { ...state.stopwatchConfig, ...partial },
    })),

  setStopwatchConfig: (config) => set({ stopwatchConfig: config }),

  setExportSettings: (settings) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...settings },
    })),

  setExportProgress: (progress) => set({ exportProgress: progress }),
  setIsExporting: (exporting) => set({ isExporting: exporting }),

  setCurrentVideoTime: (time) => set({ currentVideoTime: time }),
  seekVideo: (time) => set({ pendingVideoSeek: time }),
  seekVideoAndPause: (time) => set({ pendingVideoSeek: time, pendingPause: true }),
  clearPendingSeek: () => set({ pendingVideoSeek: null, pendingPause: false }),
  setDesignConfirmed: (confirmed) => set({ designConfirmed: confirmed }),
  setTimerEditing: (editing) => set({ timerEditing: editing }),
  setSummaryEditing: (editing) => set({ summaryEditing: editing }),
  setPreviewBounds: ({ timer, summary }) =>
    set({ timerPreviewBounds: timer, summaryPreviewBounds: summary }),

  revertFinish: () => {
    // The marks are the only input now, so the confirmed splits are simply
    // dropped (keeping them would leave stale split popups in the preview
    // while the marks are being edited); confirming rebuilds them.
    set({
      splitTimes: [],
      isFinished: false,
      finishTime: null,
      finishMemo: "",
    });
  },

  setCapturedMarks: (marks) => set({ capturedMarks: sortCapturedMarks(marks) }),

  setCapturedMarkDistance: (id, distance) =>
    set((state) => ({
      capturedMarks: state.capturedMarks.map((m) => (m.id === id ? { ...m, distance } : m)),
    })),

  setCapturedMarkTime: (id, videoTime) =>
    set((state) => ({
      capturedMarks: sortCapturedMarks(
        state.capturedMarks.map((m) =>
          m.id === id ? { ...m, videoTime: Math.max(0, videoTime) } : m,
        ),
      ),
    })),

  setCapturedMarkMemo: (id, memo) =>
    set((state) => ({
      capturedMarks: state.capturedMarks.map((m) => (m.id === id ? { ...m, memo } : m)),
    })),

  addCapturedMark: (videoTime) =>
    set((state) => ({
      capturedMarks: sortCapturedMarks([
        ...state.capturedMarks,
        { id: nextCapturedMarkId(), videoTime: Math.max(0, videoTime), distance: null, memo: "" },
      ]),
    })),

  removeCapturedMark: (id) =>
    set((state) => ({
      capturedMarks: state.capturedMarks.filter((m) => m.id !== id),
    })),

  assignCapturedDistances: (interval) =>
    set((state) => ({
      capturedMarks: assignDistancesByInterval(state.capturedMarks, interval),
    })),

  confirmCapturedMarks: () => {
    const { capturedMarks: marks, startTime } = get();
    const error = validateCapturedMarks(marks, startTime);
    if (error) return error;
    const race = buildRaceFromCapturedMarks(marks, startTime);
    if (!race) return "noMarks";
    // The finish is included as a split at raceDistance — the shape
    // SplitsPanel / FinishSummaryTable / export expect.
    // The marks stay in the store: "Edit" (revertFinish) brings the user back
    // to the assignment panel with everything they entered.
    set({
      splitTimes: race.splitTimes,
      raceDistance: race.raceDistance,
      isFinished: true,
      finishTime: race.finishTime,
      finishMemo: race.finishMemo,
    });
    return null;
  },

  reset: () => {
    set(initialState);
  },
}));
