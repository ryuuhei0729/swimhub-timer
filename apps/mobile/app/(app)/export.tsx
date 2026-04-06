import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import type * as SharingType from "expo-sharing";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editor-store";
import { useAuth } from "../../contexts/AuthProvider";
import { formatTime, getAvailableResolutions, shouldShowWatermark } from "@swimhub-timer/shared";
import type { ExportResolution } from "@swimhub-timer/shared";
import {
  exportVideoWithStopwatch,
  saveToPhotoLibrary,
  cleanupExportFiles,
} from "../../lib/video/export-pipeline";
import {
  createRewardedAdController,
  type AdState,
  type RewardedAdController,
} from "../../lib/ads/rewarded-ad";
import { colors, spacing, radius, fontSize } from "../../lib/theme";
import {
  canGuestUseToday,
  markGuestUsedToday,
  getGuestTodayCount,
} from "../../lib/guest-daily-limit";
import { GuestExportIndicator } from "../../components/plan/GuestExportIndicator";


export default function ExportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { plan } = useAuth();
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

  // --- Export limit state ---
  const [limitReached, setLimitReached] = useState(false);

  // --- Derived ---
  const exportComplete = outputPath !== null;
  const isPremium = plan === "premium";
  const canProceed = exportComplete && (isPremium || adRewardEarned || adUnavailable);
  const duration = videoMetadata?.duration ?? 0;
  const availableResolutions = getAvailableResolutions(plan);
  const showWatermark = shouldShowWatermark(plan);

  const remainingExports = useMemo(() => {
    if (plan === "premium" || plan === "free") return null;
    if (plan === "guest") {
      const used = getGuestTodayCount("timer");
      return Math.max(0, 1 - used);
    }
    return null;
  }, [plan]);

  const ALL_RESOLUTIONS: { key: ExportResolution; label: string }[] = [
    { key: "original", label: t("exportScreen.original") },
    { key: "1080", label: "1080p" },
    { key: "720", label: "720p" },
  ];

  // Normalize resolution when available resolutions change (e.g. plan downgrade)
  useEffect(() => {
    if (!availableResolutions.includes(exportSettings.resolution)) {
      setExportSettings({ resolution: availableResolutions[0] ?? "720" });
    }
  }, [availableResolutions, exportSettings.resolution, setExportSettings]);

  // Preload ad on mount (premium users skip ads)
  useEffect(() => {
    if (isPremium) {
      setAdUnavailable(true);
      return;
    }

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
  }, [isPremium]);

  // If ad loads AFTER export was triggered, show it automatically
  useEffect(() => {
    if (exportTriggeredRef.current && adState === "loaded" && !adRewardEarned && !adUnavailable) {
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

  // Free plan has unlimited exports — no need to fetch remaining count

  // Set limitReached based on remaining exports (guest only; free/premium unlimited)
  useEffect(() => {
    if (plan === "premium" || plan === "free") {
      setLimitReached(false);
      return;
    }
    if (plan === "guest") {
      setLimitReached(!canGuestUseToday("timer"));
      return;
    }
  }, [plan]);

  const handleExport = useCallback(async () => {
    if (!videoUri || startTime === null) {
      Alert.alert(t("common.error"), t("exportScreen.needVideoAndStart"));
      return;
    }

    // --- Export limit check ---
    if (plan === "guest") {
      if (!canGuestUseToday("timer")) {
        setLimitReached(true);
        return;
      }
    }
    // Free plan: unlimited exports, no limit check needed

    // Runtime guard: ensure selected resolution is still available
    let resolvedSettings = exportSettings;
    if (!availableResolutions.includes(exportSettings.resolution)) {
      const fallback = availableResolutions[0] ?? "720";
      setExportSettings({ resolution: fallback });
      resolvedSettings = { ...exportSettings, resolution: fallback };
    }

    setIsExporting(true);
    setProgress(0);
    setError(null);
    exportTriggeredRef.current = true;

    // --- Show ad (fire-and-forget, runs in parallel with encoding; premium skips) ---
    if (!isPremium) {
      const controller = adControllerRef.current;
      if (controller) {
        const currentState = controller.getState();
        if (currentState === "loaded") {
          controller.show().catch(() => setAdUnavailable(true));
        } else if (currentState !== "loading") {
          setAdUnavailable(true);
        }
      }
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
        resolvedSettings,
        (timeMs) => {
          if (durationMs > 0) {
            setProgress(Math.min(timeMs / durationMs, 1));
          }
        },
        showWatermark,
      );
      setOutputPath(path);
      setProgress(1);

      // Record usage after successful export (guest only)
      if (plan === "guest") {
        markGuestUsedToday("timer");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("exportScreen.errorDuringExport"));
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
    availableResolutions,
    setExportSettings,
    duration,
    videoMetadata?.height,
    showWatermark,
    plan,
    t,
  ]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!outputPath) return;
    try {
      await saveToPhotoLibrary(outputPath);
      Alert.alert(t("exportScreen.saveComplete"), t("exportScreen.savedToLibrary"));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("exportScreen.saveFailed"));
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
    await cleanupExportFiles(outputPath ?? undefined);
    router.back();
  }, [router, outputPath]);

  const progressPercent = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{t("exportScreen.settings")}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t("exportScreen.startTime")}</Text>
          <Text style={styles.summaryValue}>
            {startTime !== null ? formatTime(startTime) : t("exportScreen.notSet")}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t("exportScreen.splitsLabel")}</Text>
          <Text style={styles.summaryValue}>{t("splits.count", { count: splitTimes.length })}</Text>
        </View>
      </View>

      {/* Resolution */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("exportScreen.resolution")}</Text>
        <View style={styles.resolutionRow}>
          {ALL_RESOLUTIONS.map((r) => {
            const active = exportSettings.resolution === r.key;
            const isLocked = !availableResolutions.includes(r.key);
            return (
              <Pressable
                key={r.key}
                style={[
                  styles.resBtn,
                  active && styles.resBtnActive,
                  isLocked && styles.resBtnLocked,
                ]}
                onPress={() => {
                  if (isLocked) {
                    router.push("/(app)/paywall");
                  } else {
                    setExportSettings({ resolution: r.key });
                  }
                }}
              >
                <Text
                  style={[
                    styles.resBtnText,
                    active && styles.resBtnTextActive,
                    isLocked && styles.resBtnTextLocked,
                  ]}
                >
                  {r.label}
                </Text>
                {isLocked && <Text style={styles.premiumBadge}>{t("auth.premiumOnly")}</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tier indicator (guest remaining / free upsell / premium: nothing) */}
      {!exportComplete && (
        <GuestExportIndicator
          plan={plan}
          remaining={remainingExports}
          onActionPress={() => router.push("/(auth)/get-started")}
        />
      )}

      {/* Progress / waiting for ad / done / export button */}
      {isExporting || (exportComplete && !canProceed) ? (
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            {t("exportScreen.encodingPercent", { percent: progressPercent })}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          {exportComplete && !adRewardEarned && !adUnavailable && (
            <Text style={styles.adWaitText}>{t("exportScreen.adWatchPrompt")}</Text>
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
              (!startTime || limitReached) && styles.exportBtnDisabled,
            ]}
            onPress={handleExport}
            disabled={!startTime || limitReached}
          >
            <Text style={styles.exportBtnText}>{t("exportScreen.startExport")}</Text>
          </Pressable>
          {adState === "loading" && (
            <Text style={styles.adStatusText}>{t("exportScreen.adLoading")}</Text>
          )}
          {adState === "error" && (
            <Text style={styles.adStatusText}>{t("exportScreen.adFailed")}</Text>
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
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  resBtnLocked: {
    opacity: 0.5,
  },
  resBtnText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    fontWeight: "500",
  },
  resBtnTextActive: {
    color: colors.primary,
  },
  resBtnTextLocked: {
    color: colors.muted,
  },
  premiumBadge: {
    fontSize: 9,
    color: "#92400E",
    backgroundColor: "#FEF3C7",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 2,
    overflow: "hidden",
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
