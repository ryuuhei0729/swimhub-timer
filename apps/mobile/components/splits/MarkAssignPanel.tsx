import { useRef, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Keyboard } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { formatTime, getMaxSplitCount } from "@swimhub-timer/shared";
import { useEditorStore } from "../../stores/editor-store";
import { useAuth } from "../../contexts/AuthProvider";
import {
  DISTANCE_STEP,
  stepDistance,
  validateCapturedMarks,
} from "../../lib/capture/captured-marks";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

const BULK_INTERVALS = [25, 50, 100] as const;
/** Same palette as SwimHub's NumberStepper (−/+ enabled / disabled). */
const STEP_ICON = "#2563EB";
const STEP_ICON_DISABLED = "#D1D5DB";
const NUDGES = [
  { label: "-0.1", delta: -0.1 },
  { label: "-0.01", delta: -0.01 },
  { label: "+0.01", delta: 0.01 },
  { label: "+0.1", delta: 0.1 },
] as const;

/**
 * Editor panel for split times, shared by both entry points: times captured on
 * the camera screen arrive without distances, and times can be added at the
 * playhead (pinned AddMarkAtPlayheadBar) — e.g. for an imported video. The
 * user fills distances (−/+, typed, or "every 25/50/100m"), fine-tunes any
 * time against the video, then confirms — which produces the same
 * splits/finish state the result view and export expect. The last mark in time order is the
 * finish, and its distance is the race distance.
 */
export function MarkAssignPanel() {
  const { t } = useTranslation();
  const router = useRouter();
  const { subscription, guestMode } = useAuth();
  const effectivePlan = guestMode ? "guest" : (subscription?.plan ?? "free");
  const maxSplits = getMaxSplitCount(effectivePlan);

  const marks = useEditorStore((s) => s.capturedMarks);
  const startTime = useEditorStore((s) => s.startTime);
  const setCapturedMarkDistance = useEditorStore((s) => s.setCapturedMarkDistance);
  const setCapturedMarkTime = useEditorStore((s) => s.setCapturedMarkTime);
  const setCapturedMarkMemo = useEditorStore((s) => s.setCapturedMarkMemo);
  const removeCapturedMark = useEditorStore((s) => s.removeCapturedMark);
  const assignCapturedDistances = useEditorStore((s) => s.assignCapturedDistances);
  const confirmCapturedMarks = useEditorStore((s) => s.confirmCapturedMarks);
  const seekVideoAndPause = useEditorStore((s) => s.seekVideoAndPause);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Raw text per mark so partial input like "12." survives re-renders.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);
  const inputRefs = useRef<Record<string, TextInput | null>>({});

  const start = startTime ?? 0;
  // The finish is not a split: plan limits count laps only, like SplitsPanel.
  const lapCount = Math.max(0, marks.length - 1);
  const overLimit = lapCount > maxSplits;
  const validationError = validateCapturedMarks(marks, startTime);

  const select = (id: string, videoTime: number) => {
    setSelectedId(id);
    seekVideoAndPause(videoTime);
  };

  const changeDistance = (id: string, text: string) => {
    setDrafts((d) => ({ ...d, [id]: text }));
    const value = parseFloat(text);
    setCapturedMarkDistance(id, Number.isFinite(value) && value > 0 ? value : null);
  };

  /** −/+ : jump to the previous/next 25 m boundary (see stepDistance). */
  const stepMarkDistance = (index: number, direction: 1 | -1) => {
    const mark = marks[index];
    if (!mark) return;
    const previous = index > 0 ? (marks[index - 1]?.distance ?? null) : null;
    setDrafts(({ [mark.id]: _dropped, ...rest }) => rest);
    setCapturedMarkDistance(mark.id, stepDistance(mark.distance, direction, previous));
  };

  /** Keyboard "Next": move to the following distance field (or close on the last). */
  const focusNextField = (index: number) => {
    const next = marks[index + 1];
    if (!next) {
      Keyboard.dismiss();
      return;
    }
    select(next.id, next.videoTime);
    inputRefs.current[next.id]?.focus();
  };

  const shiftTime = (id: string, videoTime: number) => {
    const next = Math.max(0, Math.round(videoTime * 1000) / 1000);
    setCapturedMarkTime(id, next);
    seekVideoAndPause(next);
  };

  const bulkAssign = (interval: number) => {
    Keyboard.dismiss();
    setDrafts({});
    assignCapturedDistances(interval);
  };

  const handleConfirm = () => {
    Keyboard.dismiss();
    setAttempted(true);
    if (overLimit) return;
    const error = confirmCapturedMarks();
    if (error === null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={styles.container} testID="mark-assign-panel">
      <View style={styles.header}>
        <Text style={styles.title}>
          {t("markAssign.title")} ({t("splits.count", { count: marks.length })})
        </Text>
        <Text style={styles.hint}>
          {marks.length === 0 ? t("markAssign.emptyHint") : t("markAssign.hint")}
        </Text>
      </View>

      {marks.length > 0 && (
        <View style={styles.bulkRow}>
          <Text style={styles.bulkLabel}>{t("markAssign.bulkAssign")}</Text>
          {BULK_INTERVALS.map((interval) => (
            <Pressable
              key={interval}
              style={styles.chip}
              onPress={() => bulkAssign(interval)}
              testID={`mark-bulk-${interval}`}
            >
              <Text style={styles.chipText}>{t("markAssign.everyMeters", { interval })}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View>
        {marks.map((mark, index) => {
          const isFinish = index === marks.length - 1;
          const prevTime = index === 0 ? start : marks[index - 1]!.videoTime;
          const elapsed = mark.videoTime - start;
          const lap = mark.videoTime - prevTime;
          const selected = selectedId === mark.id;
          const beforeStart = startTime !== null && mark.videoTime <= startTime;
          const draft = drafts[mark.id];
          const distanceText = draft ?? (mark.distance !== null ? String(mark.distance) : "");
          const atMin = mark.distance !== null && mark.distance <= DISTANCE_STEP;
          return (
            <View
              key={mark.id}
              style={[styles.row, selected && styles.rowSelected]}
              testID={`mark-row-${index}`}
            >
              <Pressable style={styles.rowMain} onPress={() => select(mark.id, mark.videoTime)}>
                <View style={[styles.badge, isFinish && styles.badgeFinish]}>
                  <Text style={[styles.badgeText, isFinish && styles.badgeTextFinish]}>
                    {isFinish ? t("markAssign.goal") : t("markAssign.lapN", { n: index + 1 })}
                  </Text>
                </View>
                <View style={styles.times}>
                  <Text style={[styles.time, beforeStart && styles.timeInvalid]}>
                    {formatTime(Math.max(0, elapsed))}
                  </Text>
                  {index > 0 && lap > 0 && (
                    <Text style={styles.lap}>
                      {t("splits.lap")}: {formatTime(lap)}
                    </Text>
                  )}
                  {mark.memo.trim() !== "" && (
                    <Text style={styles.memoText} numberOfLines={1}>
                      {mark.memo}
                    </Text>
                  )}
                </View>
                <View style={styles.distanceWrap}>
                  {/* −/+ stepper in one box, like SwimHub's NumberStepper */}
                  <View
                    style={[
                      styles.stepper,
                      attempted && mark.distance === null && styles.stepperError,
                    ]}
                  >
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => stepMarkDistance(index, -1)}
                      disabled={atMin}
                      accessibilityRole="button"
                      accessibilityLabel={t("markAssign.decrease")}
                      hitSlop={4}
                      testID={`mark-distance-dec-${index}`}
                    >
                      <Ionicons
                        name="remove"
                        size={16}
                        color={atMin ? STEP_ICON_DISABLED : STEP_ICON}
                      />
                    </Pressable>
                    <TextInput
                      // Remount when the field becomes / stops being the last one:
                      // iOS builds the keyboard toolbar (Next / Done) once per field.
                      key={isFinish ? "last" : "next"}
                      ref={(r) => {
                        inputRefs.current[mark.id] = r;
                      }}
                      style={styles.distanceInput}
                      value={distanceText}
                      onChangeText={(text) => changeDistance(mark.id, text)}
                      onFocus={() => select(mark.id, mark.videoTime)}
                      // The number pad has no return key: with returnKeyType set,
                      // iOS adds a toolbar button above the keyboard that submits.
                      returnKeyType={isFinish ? "done" : "next"}
                      inputAccessoryViewButtonLabel={
                        isFinish ? t("markAssign.done") : t("markAssign.next")
                      }
                      submitBehavior={isFinish ? "blurAndSubmit" : "submit"}
                      onSubmitEditing={() => focusNextField(index)}
                      placeholder={t("markAssign.distancePlaceholder")}
                      placeholderTextColor={colors.muted}
                      keyboardType="decimal-pad"
                      testID={`mark-distance-${index}`}
                    />
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => stepMarkDistance(index, 1)}
                      accessibilityRole="button"
                      accessibilityLabel={t("markAssign.increase")}
                      hitSlop={4}
                      testID={`mark-distance-inc-${index}`}
                    >
                      <Ionicons name="add" size={16} color={STEP_ICON} />
                    </Pressable>
                  </View>
                  <Text style={styles.unit}>m</Text>
                </View>
              </Pressable>

              {selected && (
                <View style={styles.tools}>
                  <View style={styles.nudgeRow}>
                    {NUDGES.map(({ label, delta }) => (
                      <Pressable
                        key={label}
                        style={styles.nudgeBtn}
                        onPress={() => shiftTime(mark.id, mark.videoTime + delta)}
                      >
                        <Text style={styles.nudgeText}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={styles.memoInput}
                    value={mark.memo}
                    onChangeText={(text) => setCapturedMarkMemo(mark.id, text)}
                    placeholder={t("splits.memoPlaceholder")}
                    placeholderTextColor={colors.muted}
                    returnKeyType="done"
                    testID={`mark-memo-${index}`}
                  />
                  <View style={styles.toolRow}>
                    <Pressable
                      style={styles.toolBtn}
                      // Read on press: subscribing would re-render every row
                      // ~20×/s while the video plays.
                      onPress={() => shiftTime(mark.id, useEditorStore.getState().currentVideoTime)}
                      testID={`mark-set-current-${index}`}
                    >
                      <Ionicons name="locate-outline" size={14} color={colors.primary} />
                      <Text style={styles.toolBtnText}>{t("markAssign.setToCurrent")}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.toolBtn}
                      onPress={() => {
                        setSelectedId(null);
                        removeCapturedMark(mark.id);
                      }}
                      testID={`mark-delete-${index}`}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                      <Text style={[styles.toolBtnText, styles.deleteText]}>
                        {t("markAssign.delete")}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {overLimit && (
        <Pressable
          style={styles.limitBanner}
          onPress={() =>
            effectivePlan === "guest"
              ? router.push("/(auth)/get-started")
              : router.push("/(app)/paywall")
          }
        >
          <Text style={styles.limitBannerText}>
            {t("markAssign.limitExceeded", { max: maxSplits })}
          </Text>
          <Text style={styles.limitBannerLink}>
            {effectivePlan === "guest"
              ? t("splits.loginToRecordMore")
              : t("splits.upgradeToPremium")}
          </Text>
        </Pressable>
      )}

      {attempted && validationError && (
        <Text style={styles.error} testID="mark-error">
          {t(`markAssign.errors.${validationError}`)}
        </Text>
      )}

      {marks.length > 0 && (
        <Pressable
          style={[styles.confirmBtn, overLimit && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={overLimit}
          testID="mark-confirm"
        >
          <Text style={styles.confirmBtnText}>{t("markAssign.confirm")}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.muted,
    lineHeight: 18,
  },
  bulkRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  bulkLabel: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontWeight: "600",
    marginRight: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  rowSelected: {
    borderColor: colors.primary,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  badge: {
    minWidth: 52,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
  },
  badgeFinish: {
    backgroundColor: colors.destructive,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  badgeTextFinish: {
    color: colors.white,
  },
  times: {
    flex: 1,
  },
  time: {
    fontSize: fontSize.md,
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  timeInvalid: {
    color: colors.destructive,
  },
  lap: {
    fontSize: fontSize.xs,
    fontFamily: "monospace",
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  distanceWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distanceInput: {
    width: 48,
    paddingHorizontal: 2,
    fontSize: fontSize.md,
    fontFamily: "monospace",
    color: colors.text,
    textAlign: "center",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "stretch",
    height: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    overflow: "hidden",
  },
  stepperError: {
    borderColor: colors.destructive,
  },
  stepBtn: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  unit: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  tools: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  memoInput: {
    height: 36,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  memoText: {
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  nudgeRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  nudgeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  nudgeText: {
    fontSize: fontSize.xs,
    fontFamily: "monospace",
    color: colors.textSecondary,
    fontWeight: "600",
  },
  toolRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  toolBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  deleteText: {
    color: colors.destructive,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.destructive,
    textAlign: "center",
  },
  limitBanner: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  limitBannerText: {
    fontSize: fontSize.xs,
    color: "#92400E",
    lineHeight: 16,
  },
  limitBannerLink: {
    fontSize: fontSize.xs,
    color: "#D97706",
    fontWeight: "600",
    lineHeight: 16,
    marginTop: spacing.xs,
    textDecorationLine: "underline",
  },
  confirmBtn: {
    height: 44,
    backgroundColor: colors.destructive,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.white,
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
