import { type ComponentProps } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

export type EditorStep = "start" | "splits";

interface Props {
  step: EditorStep;
  /** Splits confirmed: step 2 reads as "done, export it". */
  finished?: boolean;
  /** Confirmed start, shown on step 2 as a reminder of what step 1 set. */
  startLabel?: string | null;
  /** Explicit way back to step 1 (there are no tabs). Omit to hide. */
  onEditStart?: () => void;
}

const STEPS: { key: EditorStep; icon: ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "start", icon: "flag" },
  { key: "splits", icon: "timer" },
];

/**
 * Non-interactive "where am I" header for the editor: a 2-step progress
 * indicator plus a big title/description of what to do right now. Replaces
 * the old tabs so the flow is strictly start → splits.
 */
export function StepBanner({ step, finished = false, startLabel, onEditStart }: Props) {
  const { t } = useTranslation();
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  const title =
    step === "start"
      ? t("editor.stepStartTitle")
      : finished
        ? t("editor.stepDoneTitle")
        : t("editor.stepSplitsTitle");
  const description =
    step === "start"
      ? t("editor.stepStartDesc")
      : finished
        ? t("editor.stepDoneDesc")
        : t("editor.stepSplitsDesc");

  return (
    <View style={styles.container} testID={`step-banner-${step}`}>
      {/* Progress: ① スタート ── ② スプリット */}
      <View style={styles.progressRow}>
        {STEPS.map((s, index) => {
          const done = index < currentIndex || (finished && index === currentIndex);
          const active = index === currentIndex && !done;
          return (
            <View key={s.key} style={styles.progressItem}>
              {index > 0 && (
                <View style={[styles.connector, index <= currentIndex && styles.connectorDone]} />
              )}
              <View style={[styles.dot, active && styles.dotActive, done && styles.dotDone]}>
                {done ? (
                  <Ionicons name="checkmark" size={12} color={colors.white} />
                ) : (
                  <Text style={[styles.dotText, active && styles.dotTextActive]}>{index + 1}</Text>
                )}
              </View>
              <Text
                style={[
                  styles.progressLabel,
                  active && styles.progressLabelActive,
                  done && styles.progressLabelDone,
                ]}
              >
                {s.key === "start" ? t("editor.tabSignal") : t("editor.tabSplits")}
              </Text>
            </View>
          );
        })}
      </View>

      {/* What to do now */}
      <View style={[styles.card, finished && styles.cardDone]}>
        <View style={[styles.iconWrap, finished && styles.iconWrapDone]}>
          <Ionicons
            name={finished ? "checkmark-circle" : STEPS[currentIndex]!.icon}
            size={15}
            color={colors.white}
          />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.stepLabel, finished && styles.stepLabelDone]}>
            {t("editor.stepProgress", { current: currentIndex + 1, total: STEPS.length })}
          </Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {!finished && (
            <View style={styles.tipRow} testID="step-tune-tip">
              <Ionicons name="options-outline" size={12} color={colors.primary} />
              <Text style={styles.tipText}>{t("editor.stepTune")}</Text>
            </View>
          )}
        </View>
      </View>

      {step === "splits" && startLabel != null && (
        <View style={styles.startRow}>
          <Ionicons name="flag" size={12} color={colors.muted} />
          <Text style={styles.startText}>{t("editor.startAt", { time: startLabel })}</Text>
          {onEditStart && (
            <Pressable
              onPress={onEditStart}
              hitSlop={8}
              style={styles.editStartBtn}
              testID="step-edit-start"
            >
              <Ionicons name="create-outline" size={12} color={colors.primary} />
              <Text style={styles.editStartText}>{t("editor.editStart")}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  connector: {
    width: 28,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  connectorDone: {
    backgroundColor: colors.primary,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  dotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  dotDone: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  dotText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.muted,
  },
  dotTextActive: {
    color: colors.white,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.muted,
  },
  progressLabelActive: {
    color: colors.primary,
  },
  progressLabelDone: {
    color: colors.success,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardDone: {
    backgroundColor: "rgba(16,185,129,0.1)",
    borderColor: "rgba(16,185,129,0.3)",
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapDone: {
    backgroundColor: colors.success,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  stepLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 1,
  },
  stepLabelDone: {
    color: colors.success,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "800",
    color: colors.text,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  startRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  startText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  editStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: spacing.sm,
  },
  editStartText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
});
