import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import type { SplitTime, StopwatchConfig } from "@swimhub-timer/shared";
import { formatTime } from "@swimhub-timer/shared";

export interface FinishSummaryTableProps {
  splitTimes: SplitTime[];
  finishTime: number;
  config: Pick<StopwatchConfig, "textColor" | "backgroundColor" | "fontFamily">;
  scaleFactor: number;
}

export function FinishSummaryTable({
  splitTimes,
  finishTime,
  config,
  scaleFactor,
}: FinishSummaryTableProps) {
  const { t } = useTranslation();

  const sorted = [...splitTimes].sort((a, b) => a.distance - b.distance);

  const baseFontSize = Math.max(8, Math.round(13 * scaleFactor));
  const headerFontSize = Math.max(7, Math.round(10 * scaleFactor));
  const cellPadV = Math.max(2, Math.round(4 * scaleFactor));
  const cellPadH = Math.max(2, Math.round(6 * scaleFactor));
  const containerPad = Math.max(4, Math.round(10 * scaleFactor));
  const borderRadius = Math.max(4, Math.round(8 * scaleFactor));
  // Cell widths aligned with SplitsOverlay.tsx base values (72 / 80)
  const cellDistWidth = Math.max(36, Math.round(72 * scaleFactor));
  const cellLapWidth = Math.max(40, Math.round(80 * scaleFactor));

  const textStyle = {
    color: config.textColor,
    fontFamily: config.fontFamily === "monospace" ? "monospace" : undefined,
    fontVariant: ["tabular-nums"] as ["tabular-nums"],
  };

  return (
    <View
      testID="summary-container"
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderRadius,
          padding: containerPad,
        },
      ]}
    >
      {/* Table header */}
      <View style={styles.headerRow}>
        <Text
          testID="summary-text"
          style={[
            styles.cellDist,
            textStyle,
            { width: cellDistWidth, fontSize: headerFontSize, opacity: 0.7 },
          ]}
        >
          {t("splits.distancePlaceholder").toUpperCase()}
        </Text>
        <Text
          style={[
            styles.cellSplit,
            textStyle,
            { fontSize: headerFontSize, opacity: 0.7 },
          ]}
        >
          {t("splits.overlay.splitTime")}
        </Text>
        <Text
          style={[
            styles.cellLap,
            textStyle,
            { width: cellLapWidth, fontSize: headerFontSize, opacity: 0.7 },
          ]}
        >
          {t("splits.overlay.lapHeader")}
        </Text>
      </View>

      {/* Split rows */}
      {sorted.map((split) => (
        <View key={split.distance} style={[styles.row, { paddingVertical: cellPadV }]}>
          <Text
            style={[
              styles.cellDist,
              textStyle,
              { width: cellDistWidth, fontSize: baseFontSize, fontWeight: "700", paddingHorizontal: cellPadH },
            ]}
          >
            {split.distance}m
          </Text>
          <Text
            style={[
              styles.cellSplit,
              textStyle,
              { fontSize: baseFontSize, paddingHorizontal: cellPadH },
            ]}
          >
            {formatTime(split.time)}
          </Text>
          <Text
            style={[
              styles.cellLap,
              textStyle,
              { width: cellLapWidth, fontSize: baseFontSize, paddingHorizontal: cellPadH },
            ]}
          >
            {split.lapTime !== null ? formatTime(split.lapTime) : "-"}
          </Text>
        </View>
      ))}

      {/* Final time row */}
      <View
        style={[
          styles.row,
          styles.finishRow,
          {
            paddingVertical: cellPadV,
            borderRadius: Math.max(2, Math.round(4 * scaleFactor)),
            marginTop: Math.max(2, Math.round(3 * scaleFactor)),
          },
        ]}
      >
        <Text
          style={[
            styles.cellDist,
            textStyle,
            { width: cellDistWidth, fontSize: baseFontSize, fontWeight: "700", paddingHorizontal: cellPadH },
          ]}
        >
          {t("splits.finalTime")}
        </Text>
        <Text
          style={[
            styles.cellSplit,
            textStyle,
            { fontSize: baseFontSize, fontWeight: "700", paddingHorizontal: cellPadH },
          ]}
        >
          {formatTime(finishTime)}
        </Text>
        <Text
          style={[
            styles.cellLap,
            textStyle,
            { width: cellLapWidth, fontSize: baseFontSize, paddingHorizontal: cellPadH },
          ]}
        >
          -
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 200,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  finishRow: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  cellDist: {
    // width is set inline via cellDistWidth (scaleFactor-aware, base 72 per SplitsOverlay)
  },
  cellSplit: {
    flex: 1,
  },
  cellLap: {
    // width is set inline via cellLapWidth (scaleFactor-aware, base 80 per SplitsOverlay)
    textAlign: "right",
  },
});
