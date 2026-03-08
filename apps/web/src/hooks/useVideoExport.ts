"use client";

import { useCallback, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { exportVideoWithStopwatch } from "@/lib/video/export-pipeline";

export function useVideoExport(showWatermark = true) {
  const {
    videoFile,
    startTime,
    stopwatchConfig,
    exportSettings,
    videoMetadata,
    setExportProgress,
    setIsExporting,
    isExporting,
    exportProgress,
  } = useEditorStore();
  const [error, setError] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);

  const startExport = useCallback(async () => {
    if (!videoFile || startTime === null) return;

    setIsExporting(true);
    setExportProgress(0);
    setError(null);
    setOutputBlob(null);

    try {
      const blob = await exportVideoWithStopwatch(
        videoFile,
        startTime,
        stopwatchConfig,
        videoMetadata?.height ?? 0,
        exportSettings,
        (percent) => setExportProgress(percent),
        showWatermark
      );
      setOutputBlob(blob);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Export failed"
      );
    } finally {
      setIsExporting(false);
    }
  }, [
    videoFile,
    startTime,
    stopwatchConfig,
    videoMetadata,
    exportSettings,
    setExportProgress,
    setIsExporting,
    showWatermark,
  ]);

  const downloadOutput = useCallback(() => {
    if (!outputBlob) return;
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swimhub-timer-${Date.now()}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  }, [outputBlob]);

  return {
    startExport,
    downloadOutput,
    isExporting,
    exportProgress,
    error,
    outputBlob,
  };
}
