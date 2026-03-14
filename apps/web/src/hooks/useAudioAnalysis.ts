"use client";

import { useCallback, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { analyzeAudio } from "@/lib/audio/analyzer";

export function useAudioAnalysis() {
  const { videoFile, setAudioBuffer, setWaveformData } = useEditorStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!videoFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeAudio(videoFile);
      setAudioBuffer(result.audioBuffer);
      setWaveformData(result.waveformData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, [videoFile, setAudioBuffer, setWaveformData]);

  return { analyze, isAnalyzing, error };
}
