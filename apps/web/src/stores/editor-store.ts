import { create } from "zustand";
import type {
  EditorStep,
  StopwatchConfig,
  SplitTime,
  VideoMetadata,
  ExportSettings,
} from "@swimhub-timer/core";
import { DEFAULT_STOPWATCH_CONFIG } from "@swimhub-timer/core";

interface EditorState {
  step: EditorStep;
  videoFile: File | null;
  videoUrl: string | null;
  videoMetadata: VideoMetadata | null;
  audioBuffer: AudioBuffer | null;
  waveformData: Float32Array | null;
  detectedSignalTime: number | null;
  startTime: number | null;
  isDetecting: boolean;
  stopwatchConfig: StopwatchConfig;
  exportSettings: ExportSettings;
  exportProgress: number;
  isExporting: boolean;

  // Video playback (shared across components)
  currentVideoTime: number;
  pendingVideoSeek: number | null;
  setCurrentVideoTime: (time: number) => void;
  seekVideo: (time: number) => void;
  clearPendingSeek: () => void;

  // Split timing
  splitTimes: SplitTime[];
  currentDistanceInput: string;
  currentMemoInput: string;
  isFinished: boolean;
  finishTime: number | null;
  finishMemo: string;

  setStep: (step: EditorStep) => void;
  setVideoFile: (file: File) => void;
  clearVideo: () => void;
  setVideoMetadata: (metadata: VideoMetadata) => void;
  setAudioBuffer: (buffer: AudioBuffer) => void;
  setWaveformData: (data: Float32Array) => void;
  setDetectedSignalTime: (time: number | null) => void;
  setStartTime: (time: number | null) => void;
  setIsDetecting: (detecting: boolean) => void;
  updateStopwatchConfig: (partial: Partial<StopwatchConfig>) => void;
  setStopwatchConfig: (config: StopwatchConfig) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  setExportProgress: (progress: number) => void;
  setIsExporting: (exporting: boolean) => void;
  setCurrentDistanceInput: (value: string) => void;
  setCurrentMemoInput: (value: string) => void;
  recordSplit: (elapsedSeconds: number) => void;
  removeSplit: (index: number) => void;
  finishRecording: (elapsedSeconds: number, memo?: string) => void;
  resetSplits: () => void;
  reset: () => void;
}

const initialState = {
  step: "import" as EditorStep,
  videoFile: null as File | null,
  videoUrl: null as string | null,
  videoMetadata: null as VideoMetadata | null,
  audioBuffer: null as AudioBuffer | null,
  waveformData: null as Float32Array | null,
  detectedSignalTime: null as number | null,
  startTime: null as number | null,
  isDetecting: false,
  stopwatchConfig: { ...DEFAULT_STOPWATCH_CONFIG },
  exportSettings: { resolution: "1080" as const },
  exportProgress: 0,
  isExporting: false,
  currentVideoTime: 0,
  pendingVideoSeek: null as number | null,
  splitTimes: [] as SplitTime[],
  currentDistanceInput: "",
  currentMemoInput: "",
  isFinished: false,
  finishTime: null as number | null,
  finishMemo: "",
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  setVideoFile: (file) => {
    const prevUrl = get().videoUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    const videoUrl = URL.createObjectURL(file);
    set({ videoFile: file, videoUrl, step: "detect" });
  },

  clearVideo: () => {
    const prevUrl = get().videoUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    set({
      ...initialState,
      stopwatchConfig: get().stopwatchConfig,
      splitTimes: [],
      currentDistanceInput: "",
      currentMemoInput: "",
      isFinished: false,
      finishTime: null,
      finishMemo: "",
    });
  },

  setVideoMetadata: (metadata) => set({ videoMetadata: metadata }),
  setAudioBuffer: (buffer) => set({ audioBuffer: buffer }),
  setWaveformData: (data) => set({ waveformData: data }),
  setDetectedSignalTime: (time) => set({ detectedSignalTime: time }),
  setStartTime: (time) => set({ startTime: time }),
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
  clearPendingSeek: () => set({ pendingVideoSeek: null }),
  setCurrentDistanceInput: (value) => set({ currentDistanceInput: value }),
  setCurrentMemoInput: (value) => set({ currentMemoInput: value }),

  recordSplit: (elapsedSeconds) => {
    const { currentDistanceInput, currentMemoInput, splitTimes } = get();
    const distance = parseFloat(currentDistanceInput);
    if (isNaN(distance) || distance <= 0) return;
    if (splitTimes.some((s) => s.distance === distance)) return;

    let lapTime: number | null = null;
    if (distance % 50 === 0) {
      const prevFiftyMark = distance - 50;
      if (prevFiftyMark <= 0) {
        lapTime = elapsedSeconds;
      } else {
        const prevSplit = splitTimes.find((s) => s.distance === prevFiftyMark);
        lapTime = prevSplit ? elapsedSeconds - prevSplit.time : null;
      }
    }

    const newSplit: SplitTime = {
      distance,
      time: elapsedSeconds,
      lapTime,
      memo: currentMemoInput.trim(),
    };
    const updated = [...splitTimes, newSplit].sort((a, b) => a.distance - b.distance);
    set({ splitTimes: updated, currentDistanceInput: "", currentMemoInput: "" });
  },

  removeSplit: (index) => {
    const { splitTimes } = get();
    set({ splitTimes: splitTimes.filter((_, i) => i !== index) });
  },

  finishRecording: (elapsedSeconds, memo) => {
    set({ isFinished: true, finishTime: elapsedSeconds, finishMemo: (memo ?? "").trim() });
  },

  resetSplits: () => {
    set({
      splitTimes: [],
      currentDistanceInput: "",
      currentMemoInput: "",
      isFinished: false,
      finishTime: null,
      finishMemo: "",
    });
  },

  reset: () => {
    const prevUrl = get().videoUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    set(initialState);
  },
}));
