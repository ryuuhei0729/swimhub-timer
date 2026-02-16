import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEditorStore } from "../../stores/editor-store";
import { formatTime } from "@split-sync/core";
import { extractAudioFromVideo, generateWaveformData } from "../../lib/audio/extractor";
import { detectStartSignal } from "../../lib/audio/signal-detector";
import { WaveformDisplay } from "./WaveformDisplay";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

export function SignalDetector() {
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

  // Auto-extract audio when video is available
  useEffect(() => {
    if (!videoUri || audioData || extractedForUri.current === videoUri) return;
    extractedForUri.current = videoUri;

    let cancelled = false;
    (async () => {
      setIsExtracting(true);
      try {
        const audio = await extractAudioFromVideo(videoUri);
        if (cancelled) return;
        setAudioData(audio);
        const waveform = generateWaveformData(audio.pcmData);
        setWaveformData(waveform);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "音声抽出中にエラーが発生しました"
          );
        }
      } finally {
        if (!cancelled) setIsExtracting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [videoUri, audioData, setAudioData, setWaveformData]);

  const runAutoDetect = async () => {
    if (!audioData) return;

    setIsDetecting(true);
    setError(null);

    // Wait for modal to render before running synchronous detection
    await new Promise((r) => setTimeout(r, 300));

    try {
      const result = detectStartSignal(audioData);
      if (result) {
        setDetectedSignalTime(result.time);
        seekVideoAndPause(result.time);
      } else {
        setError("スタート合図を自動検出できませんでした。手動でセットしてください。");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "音声解析中にエラーが発生しました"
      );
    } finally {
      setIsDetecting(false);
    }
  };

  const onWaveformSeek = useCallback(
    (time: number) => {
      setDetectedSignalTime(time);
      seekVideoAndPause(time);
    },
    [setDetectedSignalTime, seekVideoAndPause]
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
    }
  };

  const isConfirmed = startTime !== null;

  const isLoading = isExtracting || isDetecting;
  const loadingMessage = isExtracting
    ? "音声を抽出中..."
    : "スタート音を解析中...";

  return (
    <View style={styles.container}>
      {/* Full-screen loading modal */}
      <Modal visible={isLoading} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.modalText}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>

      <Text style={styles.sectionTitle}>スタート合図</Text>

      {/* Waveform (always visible once extracted) */}
      {waveformData && audioData && (
        <WaveformDisplay
          waveformData={waveformData}
          duration={audioData.duration}
          signalTime={detectedSignalTime ?? -1}
          currentTime={currentVideoTime}
          onSeek={onWaveformSeek}
        />
      )}

      {/* Auto detect button */}
      {!isConfirmed && !isDetecting && audioData && (
        <Pressable
          style={({ pressed }) => [
            styles.autoDetectBtn,
            pressed && styles.autoDetectBtnPressed,
          ]}
          onPress={runAutoDetect}
        >
          <Ionicons name="scan" size={24} color={colors.primary} />
          <View>
            <Text style={styles.autoDetectBtnText}>自動検出</Text>
            <Text style={styles.autoDetectBtnSub}>
              音声解析でスタート音を検出します
            </Text>
          </View>
        </Pressable>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Status */}
      <View style={styles.statusCard}>
        {isConfirmed ? (
          <>
            <Text style={styles.statusLabel}>スタート時刻（確定）</Text>
            <Text style={styles.statusTime}>{formatTime(startTime)}</Text>
            <Pressable
              style={styles.resetBtn}
              onPress={() => setStartTime(null)}
            >
              <Text style={styles.resetBtnText}>変更する</Text>
            </Pressable>
          </>
        ) : detectedSignalTime !== null ? (
          <>
            <Text style={styles.statusLabel}>候補時刻</Text>
            <Text style={styles.statusTime}>
              {formatTime(detectedSignalTime)}
            </Text>
          </>
        ) : (
          <Text style={styles.statusHint}>
            波形をタッチするか「自動検出」で{"\n"}
            スタート音をセットしてください
          </Text>
        )}
      </View>

      {/* Fine-tune + confirm */}
      {!isConfirmed && detectedSignalTime !== null && (
            <View style={styles.tuneSection}>
              <Text style={styles.tuneLabel}>微調整</Text>
              <View style={styles.tuneRow}>
                {[
                  { label: "-100ms", delta: -0.1 },
                  { label: "-10ms", delta: -0.01 },
                  { label: "+10ms", delta: 0.01 },
                  { label: "+100ms", delta: 0.1 },
                ].map(({ label, delta }) => (
                  <Pressable
                    key={label}
                    style={styles.tuneBtn}
                    onPress={() => adjustSignal(delta)}
                  >
                    <Text style={styles.tuneBtnText}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.confirmBtn} onPress={confirmStart}>
                <Text style={styles.confirmBtnText}>この時刻で確定</Text>
              </Pressable>
            </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    minWidth: 200,
  },
  modalText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "500",
  },
  errorCard: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: "#ef4444",
  },
  statusCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
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
  statusHint: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
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
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.white,
  },
});
