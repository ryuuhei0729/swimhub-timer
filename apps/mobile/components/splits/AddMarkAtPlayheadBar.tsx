import { View, Text, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { formatTime } from "@swimhub-timer/shared";
import { useEditorStore } from "../../stores/editor-store";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

/** Frame-level steps for lining the playhead up with a wall touch. */
const SEEK_STEPS = [
  { label: "-0.1", delta: -0.1 },
  { label: "-0.01", delta: -0.01 },
  { label: "+0.01", delta: 0.01 },
  { label: "+0.1", delta: 0.1 },
] as const;

/**
 * Pinned to the bottom of the editor while split times are being assigned, so
 * "step the video to the touch, add a time there" is reachable however far the
 * list scrolls (an imported video's splits, or a lap missed while filming).
 */
export function AddMarkAtPlayheadBar() {
  const { t } = useTranslation();
  const currentVideoTime = useEditorStore((s) => s.currentVideoTime);
  const startTime = useEditorStore((s) => s.startTime);
  const addCapturedMark = useEditorStore((s) => s.addCapturedMark);
  const seekVideoAndPause = useEditorStore((s) => s.seekVideoAndPause);

  const elapsed = Math.max(0, currentVideoTime - (startTime ?? 0));

  return (
    <View style={styles.bar}>
      <View style={styles.seekRow}>
        {SEEK_STEPS.map(({ label, delta }) => (
          <Pressable
            key={label}
            style={styles.seekBtn}
            onPress={() => seekVideoAndPause(Math.max(0, currentVideoTime + delta))}
            testID={`playhead-seek-${label}`}
          >
            <Text style={styles.seekBtnText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={() => {
          addCapturedMark(currentVideoTime);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        testID="mark-add-current"
      >
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.btnText}>{t("markAssign.addAtCurrent")}</Text>
        <Text style={styles.btnTime}>{formatTime(elapsed)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  seekRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  seekBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  seekBtnText: {
    fontSize: fontSize.xs,
    fontFamily: "monospace",
    fontWeight: "600",
    color: colors.textSecondary,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnText: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.white,
  },
  btnTime: {
    fontSize: fontSize.md,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    fontVariant: ["tabular-nums"],
  },
});
