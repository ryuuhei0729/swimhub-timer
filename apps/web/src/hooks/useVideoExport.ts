"use client";

import { useCallback, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { exportVideoWithStopwatch } from "@/lib/video/export-pipeline";
import { useAuth } from "@/hooks/useAuth";
import {
  canGuestUseToday,
  markGuestUsedToday,
} from "@/lib/guest-daily-limit";

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
  const { plan } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const checkExportAllowed = useCallback(async (): Promise<boolean> => {
    if (plan === "premium") return true;

    if (plan === "guest") {
      return canGuestUseToday("timer");
    }

    // free plan: server-side check
    try {
      const res = await fetch("/api/export/check");
      if (!res.ok) return true;
      const data = await res.json();
      return data.canExport;
    } catch {
      return true;
    }
  }, [plan]);

  const recordExportUsage = useCallback(async () => {
    if (plan === "premium") return;

    if (plan === "guest") {
      markGuestUsedToday("timer");
      return;
    }

    // free plan: server-side record
    try {
      await fetch("/api/export/record", { method: "POST" });
    } catch {
      // best-effort
    }
  }, [plan]);

  const startExport = useCallback(async () => {
    if (!videoFile || startTime === null) return;

    setLimitReached(false);
    setError(null);

    const allowed = await checkExportAllowed();
    if (!allowed) {
      setLimitReached(true);
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
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
      await recordExportUsage();
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
    checkExportAllowed,
    recordExportUsage,
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
    limitReached,
  };
}
