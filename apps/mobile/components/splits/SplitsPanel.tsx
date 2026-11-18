import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editor-store";
import { formatTime } from "@swimhub-timer/shared";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

/**
 * Result view of the splits tab once the race is confirmed: final time, the
 * splits with lap times (tap to seek), and "Edit" back to the assignment
 * panel. Times are entered in MarkAssignPanel for both entry points (camera
 * capture and imported video).
 */
export function SplitsPanel() {
  const { t } = useTranslation();
  const { splitTimes, isFinished, finishTime, finishMemo, startTime, revertFinish, seekVideo } =
    useEditorStore();

  // Per-row immediate lap = current splitTime − previous splitTime (sorted by distance).
  const sortedByDistance = [...splitTimes].sort((a, b) => a.distance - b.distance);
  const lapByDistance = new Map<number, number>();
  for (let i = 0; i < sortedByDistance.length; i++) {
    const curr = sortedByDistance[i];
    if (!curr) continue; // i stays within [0, sortedByDistance.length); guard is defensive only
    const prevSplit = sortedByDistance[i - 1];
    const prevTime = i === 0 || !prevSplit ? 0 : prevSplit.time;
    lapByDistance.set(curr.distance, curr.time - prevTime);
  }

  return (
    <View style={styles.container}>
      {isFinished && finishTime !== null && (
        <>
          <Pressable
            style={styles.finishCard}
            onPress={() => startTime !== null && seekVideo(startTime + finishTime)}
          >
            <Text style={styles.finishLabel}>{t("splits.finalTime")}</Text>
            <Text style={styles.finishTimeText}>{formatTime(finishTime)}</Text>
            {finishMemo ? <Text style={styles.finishMemoText}>{finishMemo}</Text> : null}
          </Pressable>
          {/* Back to the assignment panel (the times are kept). */}
          <Pressable style={styles.editBtn} onPress={revertFinish}>
            <Text style={styles.editBtnText}>{t("splits.edit")}</Text>
          </Pressable>
        </>
      )}

      <FlatList
        data={splitTimes}
        keyExtractor={(item) => String(item.distance)}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Pressable
            style={styles.splitRow}
            onPress={() => startTime !== null && seekVideo(startTime + item.time)}
          >
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceBadgeText}>{item.distance}m</Text>
            </View>
            <Text style={styles.splitTime}>{formatTime(item.time)}</Text>
            {(() => {
              const lap = lapByDistance.get(item.distance);
              return lap !== undefined && lap > 0 ? (
                <Text style={styles.lapTime}>
                  {t("splits.lap")}: {formatTime(lap)}
                </Text>
              ) : null;
            })()}
            {item.memo ? (
              <Text style={styles.splitMemo} numberOfLines={1}>
                {item.memo}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  finishCard: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  finishLabel: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontWeight: "500",
  },
  finishTimeText: {
    fontSize: fontSize.xl,
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  finishMemoText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  editBtn: {
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.muted,
  },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  distanceBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 48,
    alignItems: "center",
  },
  distanceBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.primary,
  },
  splitTime: {
    fontSize: fontSize.sm,
    fontFamily: "monospace",
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  lapTime: {
    fontSize: fontSize.xs,
    fontFamily: "monospace",
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  splitMemo: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: "right",
  },
});
