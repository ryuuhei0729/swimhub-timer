"use client";

import { useCallback } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { detectStartSignal } from "@/lib/audio/signal-detector";

export function useStartSignalDetection() {
  const {
    audioBuffer,
    setDetectedSignalTime,
    setIsDetecting,
    isDetecting,
  } = useEditorStore();

  const detect = useCallback(async () => {
    if (!audioBuffer) return;

    setIsDetecting(true);

    try {
      // Run detection in a microtask to keep UI responsive
      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = detectStartSignal(audioBuffer);

      if (result) {
        setDetectedSignalTime(result.time);
      } else {
        setDetectedSignalTime(null);
      }

      return result;
    } finally {
      setIsDetecting(false);
    }
  }, [
    audioBuffer,
    setDetectedSignalTime,
    setIsDetecting,
  ]);

  return { detect, isDetecting };
}
