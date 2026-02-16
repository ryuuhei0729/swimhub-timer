import { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import type * as SharingType from "expo-sharing";
import { useEditorStore } from "../stores/editor-store";
import { formatTime } from "@split-sync/core";
import {
  exportVideoWithStopwatch,
  saveToPhotoLibrary,
  cleanupExportFiles,
} from "../lib/video/export-pipeline";
import { colors, spacing, radius, fontSize } from "../lib/theme";

const RESOLUTIONS = [
  { key: "original", label: "オリジナル" },
  { key: "1080", label: "1080p" },
  { key: "720", label: "720p" },
] as const;

export default function ExportScreen() {
  const router = useRouter();
  const {
    videoUri,
    videoMetadata,
    startTime,
    stopwatchConfig,
    exportSettings,
    setExportSettings,
    splitTimes,
    isFinished,
    finishTime,
  } = useEditorStore();

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const duration = videoMetadata?.duration ?? 0;

  const handleExport = useCallback(async () => {
    if (!videoUri || startTime === null) {
      Alert.alert("エラー", "動画とスタート時刻を設定してください");
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setError(null);

    try {
      const durationMs = duration * 1000;
      const path = await exportVideoWithStopwatch(
        videoUri,
        startTime,
        stopwatchConfig,
        splitTimes,
        isFinished,
        finishTime,
        videoMetadata?.height ?? 1080,
        exportSettings,
        (timeMs) => {
          if (durationMs > 0) {
            setProgress(Math.min(timeMs / durationMs, 1));
          }
        }
      );
      setOutputPath(path);
      setProgress(1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "書き出し中にエラーが発生しました"
      );
    } finally {
      setIsExporting(false);
    }
  }, [videoUri, startTime, stopwatchConfig, splitTimes, isFinished, finishTime, exportSettings, duration]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!outputPath) return;
    try {
      await saveToPhotoLibrary(outputPath);
      Alert.alert("保存完了", "フォトライブラリに保存しました");
    } catch (e) {
      Alert.alert(
        "エラー",
        e instanceof Error ? e.message : "保存に失敗しました"
      );
    }
  }, [outputPath]);

  const handleShare = useCallback(async () => {
    if (!outputPath) return;
    try {
      const Sharing = require("expo-sharing") as typeof SharingType;
      await Sharing.shareAsync(outputPath, {
        mimeType: "video/mp4",
        UTI: "public.mpeg-4",
      });
    } catch {
      // User cancelled share sheet
    }
  }, [outputPath]);

  const handleDone = useCallback(async () => {
    await cleanupExportFiles();
    router.back();
  }, [router]);

  const progressPercent = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>書き出し設定</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>動画</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {videoMetadata?.name ?? "-"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>スタート時刻</Text>
          <Text style={styles.summaryValue}>
            {startTime !== null ? formatTime(startTime) : "未設定"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>スプリット</Text>
          <Text style={styles.summaryValue}>{splitTimes.length}件</Text>
        </View>
      </View>

      {/* Resolution */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>解像度</Text>
        <View style={styles.resolutionRow}>
          {RESOLUTIONS.map((r) => {
            const active = exportSettings.resolution === r.key;
            return (
              <Pressable
                key={r.key}
                style={[styles.resBtn, active && styles.resBtnActive]}
                onPress={() => setExportSettings({ resolution: r.key })}
              >
                <Text
                  style={[
                    styles.resBtnText,
                    active && styles.resBtnTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Progress / Export button */}
      {isExporting ? (
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>書き出し中... {progressPercent}%</Text>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </View>
      ) : outputPath ? (
        <View style={styles.doneSection}>
          <Text style={styles.doneText}>書き出し完了!</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.saveBtn} onPress={handleSaveToLibrary}>
              <Text style={styles.saveBtnText}>フォトライブラリに保存</Text>
            </Pressable>
            <Pressable style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareBtnText}>共有</Text>
            </Pressable>
          </View>
          <Pressable style={styles.doneBtn} onPress={handleDone}>
            <Text style={styles.doneBtnText}>完了</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.exportSection}>
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.exportBtn,
              pressed && styles.exportBtnPressed,
              !startTime && styles.exportBtnDisabled,
            ]}
            onPress={handleExport}
            disabled={!startTime}
          >
            <Text style={styles.exportBtnText}>書き出し開始</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.xl,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "500",
    maxWidth: "60%",
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resolutionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  resBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  resBtnActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  resBtnText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    fontWeight: "500",
  },
  resBtnTextActive: {
    color: colors.primary,
  },
  progressSection: {
    gap: spacing.md,
    alignItems: "center",
  },
  progressText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: "600",
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  doneSection: {
    gap: spacing.lg,
    alignItems: "center",
  },
  doneText: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.success,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.white,
  },
  shareBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  doneBtn: {
    paddingVertical: spacing.md,
  },
  doneBtnText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    fontWeight: "500",
  },
  exportSection: {
    gap: spacing.md,
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
  exportBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  exportBtnPressed: {
    opacity: 0.85,
  },
  exportBtnDisabled: {
    opacity: 0.5,
  },
  exportBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
  },
});
