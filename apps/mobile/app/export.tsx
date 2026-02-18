import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import type * as SharingType from "expo-sharing";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../stores/editor-store";
import { formatTime } from "@swimhub-timer/core";
import {
  exportVideoWithStopwatch,
  saveToPhotoLibrary,
  cleanupExportFiles,
} from "../lib/video/export-pipeline";
import {
  createRewardedAdController,
  type AdState,
  type RewardedAdController,
} from "../lib/ads/rewarded-ad";
import { colors, spacing, radius, fontSize } from "../lib/theme";

export default function ExportScreen() {
  const { t } = useTranslation();
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

  // --- Encoding state ---
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Ad state ---
  const adControllerRef = useRef<RewardedAdController | null>(null);
  const [adState, setAdState] = useState<AdState>("idle");
  const [adRewardEarned, setAdRewardEarned] = useState(false);
  const [adUnavailable, setAdUnavailable] = useState(false);
  const exportTriggeredRef = useRef(false);

  // --- Derived ---
  const exportComplete = outputPath !== null;
  const canProceed = exportComplete && (adRewardEarned || adUnavailable);
  const duration = videoMetadata?.duration ?? 0;

  const RESOLUTIONS = [
    { key: "original" as const, label: t("exportScreen.original") },
    { key: "1080" as const, label: "1080p" },
    { key: "720" as const, label: "720p" },
  ];

  // Preload ad on mount
  useEffect(() => {
    const controller = createRewardedAdController();
    if (!controller) {
      setAdUnavailable(true);
      return;
    }
    adControllerRef.current = controller;

    const unsubscribe = controller.onStateChange((state) => {
      setAdState(state);
      if (state === "rewarded") {
        setAdRewardEarned(true);
      }
    });

    controller.load();

    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, []);

  // If ad loads AFTER export was triggered, show it automatically
  useEffect(() => {
    if (
      exportTriggeredRef.current &&
      adState === "loaded" &&
      !adRewardEarned &&
      !adUnavailable
    ) {
      adControllerRef.current?.show().catch(() => setAdUnavailable(true));
    }
  }, [adState, adRewardEarned, adUnavailable]);

  // Fallback: if ad fails to load, allow export without ad after delay
  useEffect(() => {
    if (adState === "error" && !adUnavailable) {
      const timer = setTimeout(() => setAdUnavailable(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [adState, adUnavailable]);

  const handleExport = useCallback(async () => {
    if (!videoUri || startTime === null) {
      Alert.alert(t("common.error"), t("exportScreen.needVideoAndStart"));
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setError(null);
    exportTriggeredRef.current = true;

    // --- Show ad (fire-and-forget, runs in parallel with encoding) ---
    const controller = adControllerRef.current;
    if (controller) {
      const currentState = controller.getState();
      if (currentState === "loaded") {
        controller.show().catch(() => setAdUnavailable(true));
      } else if (currentState !== "loading") {
        // Ad errored or idle — skip
        setAdUnavailable(true);
      }
      // If still "loading", the useEffect above will auto-show when ready
    }

    // --- Start encoding ---
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
        e instanceof Error ? e.message : t("exportScreen.errorDuringExport")
      );
    } finally {
      setIsExporting(false);
    }
  }, [
    videoUri,
    startTime,
    stopwatchConfig,
    splitTimes,
    isFinished,
    finishTime,
    exportSettings,
    duration,
    videoMetadata?.height,
    t,
  ]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!outputPath) return;
    try {
      await saveToPhotoLibrary(outputPath);
      Alert.alert(t("exportScreen.saveComplete"), t("exportScreen.savedToLibrary"));
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e instanceof Error ? e.message : t("exportScreen.saveFailed")
      );
    }
  }, [outputPath, t]);

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
        <Text style={styles.summaryTitle}>{t("exportScreen.settings")}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t("exportScreen.video")}</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {videoMetadata?.name ?? "-"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t("exportScreen.startTime")}</Text>
          <Text style={styles.summaryValue}>
            {startTime !== null ? formatTime(startTime) : t("exportScreen.notSet")}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t("exportScreen.splitsLabel")}</Text>
          <Text style={styles.summaryValue}>
            {t("splits.count", { count: splitTimes.length })}
          </Text>
        </View>
      </View>

      {/* Resolution */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("exportScreen.resolution")}</Text>
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

      {/* Progress / waiting for ad / done / export button */}
      {isExporting || (exportComplete && !canProceed) ? (
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            {t("exportScreen.encodingPercent", { percent: progressPercent })}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
          {exportComplete && !adRewardEarned && !adUnavailable && (
            <Text style={styles.adWaitText}>
              {t("exportScreen.adWatchPrompt")}
            </Text>
          )}
        </View>
      ) : canProceed ? (
        <View style={styles.doneSection}>
          <Text style={styles.doneText}>{t("exportScreen.complete")}</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.saveBtn} onPress={handleSaveToLibrary}>
              <Text style={styles.saveBtnText}>{t("exportScreen.saveToLibrary")}</Text>
            </Pressable>
            <Pressable style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareBtnText}>{t("exportScreen.share")}</Text>
            </Pressable>
          </View>
          <Pressable style={styles.doneBtn} onPress={handleDone}>
            <Text style={styles.doneBtnText}>{t("common.done")}</Text>
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
            <Text style={styles.exportBtnText}>{t("exportScreen.startExport")}</Text>
          </Pressable>
          {adState === "loading" && (
            <Text style={styles.adStatusText}>{t("exportScreen.adLoading")}</Text>
          )}
          {adState === "error" && (
            <Text style={styles.adStatusText}>
              {t("exportScreen.adFailed")}
            </Text>
          )}
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
  adWaitText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  adStatusText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: "center",
  },
});
