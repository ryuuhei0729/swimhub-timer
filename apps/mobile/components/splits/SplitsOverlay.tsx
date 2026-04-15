import { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { SplitTime } from "@swimhub-timer/shared";
import { formatTime } from "@swimhub-timer/shared";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

interface SplitsOverlayProps {
  visible: boolean;
  splitTimes: SplitTime[];
  finishTime: number | null;
  onClose: () => void;
}

type TabId = "byDistance" | "allLap";

interface AllLapRow {
  fromDistance: number;
  toDistance: number;
  lapTime: number;
}

function computeAllLaps(splitTimes: SplitTime[]): AllLapRow[] {
  if (splitTimes.length === 0) return [];
  const rows: AllLapRow[] = [];
  let prevDistance = 0;
  let prevTime = 0;
  for (const split of splitTimes) {
    rows.push({
      fromDistance: prevDistance,
      toDistance: split.distance,
      lapTime: split.time - prevTime,
    });
    prevDistance = split.distance;
    prevTime = split.time;
  }
  return rows;
}

export function SplitsOverlay({ visible, splitTimes, finishTime, onClose }: SplitsOverlayProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("byDistance");

  const sorted = [...splitTimes].sort((a, b) => a.distance - b.distance);
  const allLaps = computeAllLaps(sorted);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t("splits.overlay.title")}</Text>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === "byDistance" && styles.tabActive]}
            onPress={() => setActiveTab("byDistance")}
          >
            <Text style={[styles.tabText, activeTab === "byDistance" && styles.tabTextActive]}>
              {t("splits.overlay.tabByDistance")}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "allLap" && styles.tabActive]}
            onPress={() => setActiveTab("allLap")}
          >
            <Text style={[styles.tabText, activeTab === "allLap" && styles.tabTextActive]}>
              {t("splits.overlay.tabAllLap")}
            </Text>
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {sorted.length === 0 ? (
            <Text style={styles.emptyText}>{t("splits.overlay.noSplits")}</Text>
          ) : activeTab === "byDistance" ? (
            <View>
              {/* Table header */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellDistance]}>
                  {t("splits.distancePlaceholder")}
                </Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellSplit]}>
                  {t("splits.overlay.splitTime")}
                </Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellLap]}>
                  {t("splits.overlay.lapHeader")}
                </Text>
              </View>
              {/* Table rows */}
              {sorted.map((split) => (
                <View key={split.distance} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.cellDistance, styles.distanceText]}>
                    {split.distance}m
                  </Text>
                  <Text style={[styles.tableCell, styles.cellSplit, styles.timeText]}>
                    {formatTime(split.time)}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellLap, styles.timeText]}>
                    {split.lapTime !== null ? formatTime(split.lapTime) : "-"}
                  </Text>
                </View>
              ))}
              {finishTime !== null && (
                <View style={[styles.tableRow, styles.finishRow]}>
                  <Text style={[styles.tableCell, styles.cellDistance, styles.distanceText]}>
                    {t("splits.finalTime")}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellSplit, styles.finishTimeText]}>
                    {formatTime(finishTime)}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellLap, styles.timeText]}>-</Text>
                </View>
              )}
            </View>
          ) : (
            <View>
              {allLaps.map((lap, index) => (
                <View key={index} style={styles.allLapRow}>
                  <Text style={styles.allLapRange}>
                    {lap.fromDistance}m - {lap.toDistance}m
                  </Text>
                  <Text style={styles.allLapTime}>{formatTime(lap.lapTime)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeader: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderBottomWidth: 0,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  tableHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
  },
  tableCell: {
    paddingHorizontal: spacing.xs,
  },
  cellDistance: {
    width: 72,
  },
  cellSplit: {
    flex: 1,
  },
  cellLap: {
    width: 80,
    textAlign: "right",
  },
  distanceText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.primary,
    fontFamily: "monospace",
  },
  timeText: {
    fontSize: fontSize.sm,
    fontFamily: "monospace",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  finishRow: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
    borderBottomWidth: 0,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  finishTimeText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  allLapRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  allLapRange: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  allLapTime: {
    fontSize: fontSize.sm,
    fontFamily: "monospace",
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
});
