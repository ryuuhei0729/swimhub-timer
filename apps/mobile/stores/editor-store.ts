import { create } from "zustand";
import type {
  EditorStep,
  StopwatchConfig,
  SplitTime,
  VideoMetadata,
  ExportSettings,
} from "@swimhub-timer/shared";
import { DEFAULT_STOPWATCH_CONFIG } from "@swimhub-timer/shared";

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

  splitTimes: SplitTime[];
  currentDistanceInput: string;
  currentMemoInput: string;
  isFinished: boolean;
  finishTime: number | null;
  finishMemo: string;

  showSplitsOverlay: boolean;
  setShowSplitsOverlay: (v: boolean) => void;

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
  setCurrentDistanceInput: (value: string) => void;
  setCurrentMemoInput: (value: string) => void;
  recordSplit: (elapsedSeconds: number) => void;
  removeSplit: (index: number) => void;
  finishRecording: (elapsedSeconds: number, memo?: string) => void;
  revertFinish: () => void;
  resetSplits: () => void;
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
  stopwatchConfig: { ...DEFAULT_STOPWATCH_CONFIG },
  exportSettings: { resolution: "1080" as const },
  exportProgress: 0,
  isExporting: false,
  currentVideoTime: 0,
  pendingVideoSeek: null as number | null,
  pendingPause: false,
  splitTimes: [] as SplitTime[],
  currentDistanceInput: "",
  currentMemoInput: "",
  isFinished: false,
  finishTime: null as number | null,
  finishMemo: "",
  showSplitsOverlay: false,
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

  setVideoMetadata: (metadata) => set({ videoMetadata: metadata }),
  setAudioData: (data) => set({ audioData: data }),
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
  seekVideoAndPause: (time) => set({ pendingVideoSeek: time, pendingPause: true }),
  clearPendingSeek: () => set({ pendingVideoSeek: null, pendingPause: false }),
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
    set({
      splitTimes: updated,
      currentDistanceInput: "",
      currentMemoInput: "",
    });
  },

  removeSplit: (index) => {
    const { splitTimes } = get();
    set({ splitTimes: splitTimes.filter((_, i) => i !== index) });
  },

  finishRecording: (elapsedSeconds, memo) => {
    set({
      isFinished: true,
      finishTime: elapsedSeconds,
      finishMemo: (memo ?? "").trim(),
    });
  },

  setShowSplitsOverlay: (v) => set({ showSplitsOverlay: v }),

  revertFinish: () => {
    set({
      isFinished: false,
      finishTime: null,
      finishMemo: "",
    });
  },

  resetSplits: () => {
    set({
      splitTimes: [],
      currentDistanceInput: "",
      currentMemoInput: "",
      isFinished: false,
      finishTime: null,
      finishMemo: "",
      showSplitsOverlay: false,
    });
  },

  reset: () => {
    set(initialState);
  },
}));
