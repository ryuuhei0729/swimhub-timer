import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatTime } from "@swimhub-timer/shared";
import {
  getLastMarkElapsed,
  getRecentLapRows,
  type CaptureTimerState,
} from "../../lib/capture/capture-timer";

/** At least this many of the latest laps stay on screen. */
const VISIBLE_LAPS = 4;

interface LiveStopwatchProps {
  timer: CaptureTimerState;
  /** Current recording position in seconds, or null when not recording. */
  getVideoTime: () => number | null;
}

/**
 * The on-screen stopwatch: the latest laps (split + lap) stacked right above
 * the running time. The lap table is deliberately small so the swimmer stays
 * visible behind it.
 *
 * It reads the same clock a button release records with, so what the user
 * sees is what gets recorded. Kept in its own component so the per-frame
 * re-render stays local and never re-renders the camera screen.
 */
export function LiveStopwatch({ timer, getVideoTime }: LiveStopwatchProps) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  const { status, startVideoTime } = timer;

  useEffect(() => {
    if (status === "ready") setElapsed(0);
    if (status !== "running" || startVideoTime === null) return;
    // Once per display frame: the value comes from a monotonic clock, so it
    // only ever moves forward and the hundredths roll smoothly.
    let frame = requestAnimationFrame(function tick() {
      const now = getVideoTime();
      if (now !== null) setElapsed(Math.max(0, now - startVideoTime));
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [status, startVideoTime, getVideoTime]);

  const lastMark = getLastMarkElapsed(timer);
  // After STOP, show the recorded finish exactly (the ticking value may have
  // run a frame past it). A timer frozen by the recording ending keeps its
  // last ticked value.
  const display =
    status === "stopped" && timer.stoppedBy === "button" && lastMark !== null ? lastMark : elapsed;
  const rows = getRecentLapRows(timer, VISIBLE_LAPS);

  return (
    <View style={styles.container} testID="capture-stopwatch">
      {rows.length > 0 && (
        <View style={styles.table} testID="capture-lap-table">
          <View style={styles.row}>
            <Text style={[styles.head, styles.colN]}>#</Text>
            <Text style={[styles.head, styles.colSplit]}>{t("splits.overlay.splitTime")}</Text>
            <Text style={[styles.head, styles.colLap]}>{t("splits.overlay.lapHeader")}</Text>
          </View>
          {rows.map((r) => (
            <View key={r.n} style={styles.row} testID={`capture-lap-row-${r.n}`}>
              <Text style={[styles.cell, styles.colN, styles.num]}>{r.n}</Text>
              <Text style={[styles.cell, styles.colSplit]}>{formatTime(r.split)}</Text>
              <Text style={[styles.cell, styles.colLap, styles.lap]}>{formatTime(r.lap)}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.time}>{formatTime(display)}</Text>
    </View>
  );
}

const MONO = "NotoSansMono-Bold";

const styles = StyleSheet.create({
  // The card is as wide as its widest line; the lap table and the main time
  // are sized to roughly the same width ("m:ss.cc" columns) to keep it narrow.
  container: {
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "flex-end",
  },
  table: {
    marginBottom: 2,
    paddingBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.3)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  head: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.55)",
  },
  cell: {
    fontSize: 12,
    lineHeight: 14,
    color: "#FFFFFF",
    fontFamily: MONO,
    fontVariant: ["tabular-nums"],
  },
  // Minimum (not flex) widths: the card sizes itself to its content, and a
  // flex: 1 column can collapse to zero width in that shrink-to-fit layout
  // (the SPLIT column didn't show on device with it). The minimums fit
  // "m:ss.cc" at 12pt and keep columns aligned; 10+ minute times just widen.
  colN: {
    minWidth: 16,
  },
  colSplit: {
    minWidth: 54,
    textAlign: "right",
  },
  colLap: {
    minWidth: 54,
    marginLeft: 6,
    textAlign: "right",
  },
  num: {
    color: "rgba(255,255,255,0.65)",
  },
  lap: {
    color: "rgba(255,255,255,0.85)",
  },
  time: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: MONO,
    fontVariant: ["tabular-nums"],
  },
});
