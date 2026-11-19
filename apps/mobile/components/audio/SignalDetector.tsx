import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editor-store";
import { formatTime } from "@swimhub-timer/shared";
import { extractAudioFromVideo, generateWaveformData } from "../../lib/audio/extractor";
import { detectStartSignal } from "../../lib/audio/signal-detector";
import { WaveformDisplay } from "./WaveformDisplay";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

interface SignalDetectorProps {
  onConfirm?: () => void;
  /** Open directly in "Change" mode for an already-confirmed start. */
  startInChangeMode?: boolean;
  /** Called after leaving "Change" mode without saving. */
  onCancelChange?: () => void;
}

export function SignalDetector({
  onConfirm,
  startInChangeMode = false,
  onCancelChange,
}: SignalDetectorProps) {
  const { t } = useTranslation();
  const {
    videoUri,
    currentVideoTime,
    detectedSignalTime,
    startTime,
    isDetecting,
    audioData,
    waveformData,
    setDetectedSignalTime,
    setStartTime,
    setIsDetecting,
    setAudioData,
    setWaveformData,
    seekVideoAndPause,
  } = useEditorStore();

  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const extractedForUri = useRef<string | null>(null);
  // "Change" mode for an already-confirmed start: the confirmed time stays in
  // the store (splits stay unlocked) until the user confirms a new one, and
  // leaving the mode discards the candidate.
  const [editing, setEditing] = useState(
    () => startInChangeMode && useEditorStore.getState().startTime !== null,
  );
  // The waveform / detection UI (and the audio it needs) is only for choosing
  // a start: first time, or after "Change".
  const choosingStart = startTime === null || editing;

  // Entering already in "Change" mode: put the candidate and the video on the
  // confirmed start, as pressing "Change" would.
  useEffect(() => {
    const confirmed = useEditorStore.getState().startTime;
    if (!startInChangeMode || confirmed === null) return;
    setDetectedSignalTime(confirmed);
    seekVideoAndPause(confirmed);
    // Mount-only: re-running would clobber the candidate being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Extract audio once the start is being chosen — not just for visiting the
  // tab with a confirmed start. Once started, the extraction is never
  // abandoned by leaving "Change" mode (that left the spinner stuck and the
  // next "Change" never re-extracted); its result goes to the store as long
  // as the same video is still loaded, so it is reused next time.
  useEffect(() => {
    if (!choosingStart) return;
    if (!videoUri || audioData || extractedForUri.current === videoUri) return;
    extractedForUri.current = videoUri;
    const uri = videoUri;

    (async () => {
      setIsExtracting(true);
      try {
        const audio = await extractAudioFromVideo(uri);
        if (useEditorStore.getState().videoUri !== uri) return; // a different video now
        setAudioData(audio);
        setWaveformData(generateWaveformData(audio.pcmData));
      } catch (e) {
        if (mountedRef.current) {
          extractedForUri.current = null; // allow a retry
          setError(e instanceof Error ? e.message : t("signal.audioExtractionError"));
        }
      } finally {
        if (mountedRef.current) setIsExtracting(false);
      }
    })();
  }, [choosingStart, videoUri, audioData, setAudioData, setWaveformData, t]);

  const runAutoDetect = async () => {
    if (!audioData) return;

    setIsDetecting(true);
    setError(null);

    // Yield once so the loading indicator commits to native before the synchronous
    // FFT pass blocks the JS thread. Matches the web flow's microtask flush.
    await new Promise<void>((r) => setTimeout(r, 0));

    try {
      // Race start happens early — analyzing only the first 30s keeps Hermes's
      // FFT work bounded on long clips.
      const ANALYSIS_WINDOW_SEC = 30;
      const maxSamples = Math.floor(ANALYSIS_WINDOW_SEC * audioData.sampleRate);
      const target =
        audioData.pcmData.length > maxSamples
          ? {
              ...audioData,
              pcmData: audioData.pcmData.subarray(0, maxSamples),
              duration: ANALYSIS_WINDOW_SEC,
            }
          : audioData;
      const result = detectStartSignal(target);
      if (result) {
        setDetectedSignalTime(result.time);
        seekVideoAndPause(result.time);
      } else {
        setError(t("signal.notDetected"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("signal.audioAnalysisError"));
    } finally {
      setIsDetecting(false);
    }
  };

  const onWaveformSeek = useCallback(
    (time: number) => {
      setDetectedSignalTime(time);
      seekVideoAndPause(time);
    },
    [setDetectedSignalTime, seekVideoAndPause],
  );

  const adjustSignal = (delta: number) => {
    const current = detectedSignalTime ?? currentVideoTime;
    const newTime = Math.max(0, current + delta);
    setDetectedSignalTime(newTime);
    seekVideoAndPause(newTime);
  };

  const confirmStart = () => {
    if (detectedSignalTime !== null) {
      setStartTime(detectedSignalTime);
      setEditing(false);
      onConfirm?.();
    }
  };

  const startEditing = () => {
    if (startTime === null) return;
    setError(null);
    setDetectedSignalTime(startTime);
    seekVideoAndPause(startTime);
    setEditing(true);
  };

  const leaveEditing = () => {
    if (startTime === null) return;
    const discard = () => {
      setDetectedSignalTime(startTime);
      seekVideoAndPause(startTime);
      setError(null);
      setEditing(false);
      onCancelChange?.();
    };
    if (detectedSignalTime === null || detectedSignalTime === startTime) {
      discard();
      return;
    }
    Alert.alert(t("signal.discardChangeTitle"), t("signal.discardChangeMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("signal.discardChange"), style: "destructive", onPress: discard },
    ]);
  };

  const isConfirmed = startTime !== null && !editing;

  // Only relevant while choosing; an extraction finishing in the background
  // after leaving "Change" mode shows nothing.
  const isLoading = choosingStart && (isExtracting || isDetecting);
  const loadingMessage = isExtracting ? t("signal.extracting") : t("signal.analyzingStart");

  return (
    <View style={styles.container}>
      {/* Loading shown in place. (A full-screen Modal here could make iOS
          re-evaluate orientation while the phone is still held sideways
          after filming.) */}
      {isLoading && (
        <View style={styles.loadingCard} testID="signal-loading">
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.modalText}>{loadingMessage}</Text>
        </View>
      )}

      {/* 1. Auto detect button (or confirmed status when locked in) */}
      {isConfirmed ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{t("signal.confirmedTime")}</Text>
          <Text style={styles.statusTime}>{formatTime(startTime)}</Text>
          <Pressable style={styles.resetBtn} onPress={startEditing} testID="signal-change">
            <Text style={styles.resetBtnText}>{t("signal.change")}</Text>
          </Pressable>
        </View>
      ) : !isDetecting && audioData ? (
        <Pressable
          style={({ pressed }) => [styles.autoDetectBtn, pressed && styles.autoDetectBtnPressed]}
          onPress={runAutoDetect}
          testID="signal-auto-detect-button"
        >
          <Ionicons name="scan" size={24} color={colors.primary} />
          <View>
            <Text style={styles.autoDetectBtnText}>{t("signal.autoDetect")}</Text>
            <Text style={styles.autoDetectBtnSub}>{t("signal.autoDetectDesc")}</Text>
          </View>
        </Pressable>
      ) : null}

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* 2. Waveform (only while choosing the start) */}
      {choosingStart && waveformData && audioData && (
        <WaveformDisplay
          waveformData={waveformData}
          duration={audioData.duration}
          signalTime={detectedSignalTime ?? -1}
          currentTime={currentVideoTime}
          onSeek={onWaveformSeek}
        />
      )}

      {/* 3. Fine-tune */}
      {choosingStart && detectedSignalTime !== null && (
        <View style={styles.tuneSection}>
          <Text style={styles.tuneLabel}>{t("signal.fineTune")}</Text>
          <View style={styles.tuneRow}>
            {[
              { label: "-0.1", delta: -0.1 },
              { label: "-0.01", delta: -0.01 },
              { label: "+0.01", delta: 0.01 },
              { label: "+0.1", delta: 0.1 },
            ].map(({ label, delta }) => (
              <Pressable key={label} style={styles.tuneBtn} onPress={() => adjustSignal(delta)}>
                <Text style={styles.tuneBtnText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* 4. Candidate time + confirm */}
      {choosingStart && detectedSignalTime !== null && (
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{t("signal.candidateTime")}</Text>
          <Text style={styles.statusTime}>{formatTime(detectedSignalTime)}</Text>
          <Pressable style={styles.confirmBtn} onPress={confirmStart} testID="signal-confirm">
            <Text style={styles.confirmBtnText}>{t("signal.setAsStartPoint")}</Text>
          </Pressable>
        </View>
      )}

      {/* Leave "Change" mode without saving */}
      {editing && (
        <Pressable
          style={styles.cancelEditBtn}
          onPress={leaveEditing}
          testID="signal-cancel-change"
        >
          <Text style={styles.cancelEditBtnText}>{t("signal.cancelChange")}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  autoDetectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  autoDetectBtnPressed: {
    opacity: 0.85,
  },
  autoDetectBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.primary,
  },
  autoDetectBtnSub: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
  },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "500",
  },
  errorCard: {
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.3)",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusLabel: {
    fontSize: fontSize.xs,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statusTime: {
    fontSize: fontSize.xl,
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.primary,
  },
  resetBtn: {
    marginTop: spacing.xs,
  },
  resetBtnText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: "500",
  },
  tuneSection: {
    gap: spacing.md,
  },
  tuneLabel: {
    fontSize: fontSize.xs,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tuneRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  tuneBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  tuneBtnText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontWeight: "500",
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: spacing.sm,
  },
  cancelEditBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelEditBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.muted,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.white,
  },
});
