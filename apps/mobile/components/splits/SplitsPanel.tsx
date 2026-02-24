import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editor-store";
import { formatTime } from "@swimhub-timer/core";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

export function SplitsPanel() {
  const { t } = useTranslation();
  const {
    splitTimes,
    isFinished,
    finishTime,
    finishMemo,
    startTime,
    currentVideoTime,
    currentDistanceInput,
    currentMemoInput,
    setCurrentDistanceInput,
    setCurrentMemoInput,
    recordSplit,
    finishRecording,
    removeSplit,
    resetSplits,
    seekVideo,
  } = useEditorStore();

  const elapsed =
    startTime !== null ? Math.max(0, currentVideoTime - startTime) : 0;

  const handleRecord = () => {
    recordSplit(elapsed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleFinish = () => {
    finishRecording(elapsed, currentMemoInput);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const adjustVideo = (delta: number) => {
    const newTime = Math.max(0, currentVideoTime + delta);
    seekVideo(newTime);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{t("splits.title")}</Text>
        {splitTimes.length > 0 && (
          <Pressable onPress={resetSplits}>
            <Text style={styles.resetText}>{t("common.reset")}</Text>
          </Pressable>
        )}
      </View>

      {/* Recording controls */}
      {startTime !== null && !isFinished && (
        <View style={styles.recordingCard}>
          {/* Current time */}
          <Text style={styles.elapsedTime}>{formatTime(elapsed)}</Text>

          {/* Fine-tune buttons */}
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
                onPress={() => adjustVideo(delta)}
              >
                <Text style={styles.tuneBtnText}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Distance + Record */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.distanceInput}
              placeholder={t("splits.distancePlaceholder")}
              placeholderTextColor={colors.muted}
              value={currentDistanceInput}
              onChangeText={setCurrentDistanceInput}
              keyboardType="decimal-pad"
            />
            <Pressable
              style={[
                styles.recordBtn,
                !currentDistanceInput && styles.btnDisabled,
              ]}
              onPress={handleRecord}
              disabled={!currentDistanceInput}
            >
              <Text style={styles.recordBtnText}>{t("splits.record")}</Text>
            </Pressable>
          </View>

          {/* Memo */}
          <TextInput
            style={styles.memoInput}
            placeholder={t("splits.memoPlaceholder")}
            placeholderTextColor={colors.muted}
            value={currentMemoInput}
            onChangeText={setCurrentMemoInput}
          />

          {/* Finish */}
          <Pressable style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishBtnText}>{t("splits.finish")}</Text>
          </Pressable>
        </View>
      )}

      {/* Finish summary */}
      {isFinished && finishTime !== null && (
        <Pressable
          style={styles.finishCard}
          onPress={() => startTime !== null && seekVideo(startTime + finishTime)}
        >
          <Text style={styles.finishLabel}>{t("splits.finalTime")}</Text>
          <Text style={styles.finishTimeText}>{formatTime(finishTime)}</Text>
          {finishMemo ? (
            <Text style={styles.finishMemoText}>{finishMemo}</Text>
          ) : null}
        </Pressable>
      )}

      {/* Split list */}
      {splitTimes.length === 0 && !isFinished ? (
        <Text style={styles.emptyText}>
          {t("splits.emptyHint")}
        </Text>
      ) : (
        <FlatList
          data={splitTimes}
          keyExtractor={(item) => String(item.distance)}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.splitRow}
              onPress={() =>
                startTime !== null && seekVideo(startTime + item.time)
              }
            >
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>{item.distance}m</Text>
              </View>
              <Text style={styles.splitTime}>{formatTime(item.time)}</Text>
              {item.lapTime !== null && (
                <Text style={styles.lapTime}>
                  {t("splits.lap")}: {formatTime(item.lapTime)}
                </Text>
              )}
              {!isFinished && (
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => removeSplit(index)}
                >
                  <Text style={styles.deleteBtnText}>×</Text>
                </Pressable>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
  resetText: {
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  recordingCard: {
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
  elapsedTime: {
    fontSize: fontSize.md,
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.primary,
    textAlign: "right",
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
  inputRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  distanceInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: "monospace",
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  recordBtn: {
    height: 36,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  recordBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  memoInput: {
    height: 36,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  finishBtn: {
    height: 40,
    backgroundColor: colors.destructive,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  finishBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.white,
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
  },
  finishMemoText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    paddingVertical: spacing.xl,
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
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: "monospace",
    fontWeight: "600",
    color: colors.text,
  },
  lapTime: {
    fontSize: fontSize.xs,
    fontFamily: "monospace",
    color: colors.muted,
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    fontSize: 16,
    color: colors.muted,
  },
});
