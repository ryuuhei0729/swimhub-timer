import { useRef, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  PanResponder,
  type LayoutChangeEvent,
  type ViewStyle,
  type DimensionValue,
} from "react-native";
import { useEditorStore } from "../../stores/editor-store";
import { formatTime } from "@swimhub-timer/shared";
import type { StopwatchAnchor } from "@swimhub-timer/shared";
import { FinishSummaryTable } from "../splits/FinishSummaryTable";

interface Props {
  videoWidth: number;
  videoHeight: number;
}

export const SUMMARY_DELAY_SECONDS = 2;

export function StopwatchOverlay({ videoWidth, videoHeight }: Props) {
  const config = useEditorStore((s) => s.stopwatchConfig);
  const startTime = useEditorStore((s) => s.startTime);
  const currentVideoTime = useEditorStore((s) => s.currentVideoTime);
  const splitTimes = useEditorStore((s) => s.splitTimes);
  const isFinished = useEditorStore((s) => s.isFinished);
  const finishTime = useEditorStore((s) => s.finishTime);
  const updateStopwatchConfig = useEditorStore((s) => s.updateStopwatchConfig);

  const containerSize = useRef({ width: 0, height: 0 });
  const contentRect = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const timerDragStart = useRef({ x: 0, y: 0 });
  const summaryDragStart = useRef({ x: 0, y: 0 });

  const updateContentRect = useCallback(() => {
    const cw = containerSize.current.width;
    const ch = containerSize.current.height;
    if (cw === 0 || ch === 0 || videoWidth <= 0 || videoHeight <= 0) return;

    const containerAspect = cw / ch;
    const videoAspect = videoWidth / videoHeight;

    if (videoAspect > containerAspect) {
      const contentW = cw;
      const contentH = cw / videoAspect;
      contentRect.current = { x: 0, y: (ch - contentH) / 2, width: contentW, height: contentH };
    } else {
      const contentH = ch;
      const contentW = ch * videoAspect;
      contentRect.current = { x: (cw - contentW) / 2, y: 0, width: contentW, height: contentH };
    }
  }, [videoWidth, videoHeight]);

  const timerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const pos = useEditorStore.getState().stopwatchConfig.position;
          timerDragStart.current = { x: pos.x, y: pos.y };
        },
        onPanResponderMove: (_, gestureState) => {
          const { width, height } = contentRect.current;
          if (width === 0 || height === 0) return;

          const dx = gestureState.dx / width;
          const dy = gestureState.dy / height;

          const newX = Math.max(0, Math.min(1, timerDragStart.current.x + dx));
          const newY = Math.max(0, Math.min(1, timerDragStart.current.y + dy));

          updateStopwatchConfig({
            position: { x: newX, y: newY },
          });
        },
      }),
    [updateStopwatchConfig],
  );

  const summaryPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const pos = useEditorStore.getState().stopwatchConfig.summaryPosition;
          summaryDragStart.current = { x: pos.x, y: pos.y };
        },
        onPanResponderMove: (_, gestureState) => {
          const { width, height } = contentRect.current;
          if (width === 0 || height === 0) return;

          const dx = gestureState.dx / width;
          const dy = gestureState.dy / height;

          const newX = Math.max(0, Math.min(1, summaryDragStart.current.x + dx));
          const newY = Math.max(0, Math.min(1, summaryDragStart.current.y + dy));

          updateStopwatchConfig({
            summaryPosition: { x: newX, y: newY },
          });
        },
      }),
    [updateStopwatchConfig],
  );

  useEffect(() => {
    updateContentRect();
  }, [updateContentRect]);

  const onContainerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      containerSize.current = {
        width: e.nativeEvent.layout.width,
        height: e.nativeEvent.layout.height,
      };
      updateContentRect();
    },
    [updateContentRect],
  );

  const scaleFactor =
    contentRect.current.width > 0 && videoWidth > 0 ? contentRect.current.width / videoWidth : 0.2;
  const watermarkFontSize = Math.max(8, Math.round(videoHeight * 0.06 * scaleFactor));

  if (startTime === null) return null;

  let elapsed = Math.max(0, currentVideoTime - startTime);
  if (isFinished && finishTime !== null && elapsed > finishTime) {
    elapsed = finishTime;
  }
  const timeText = formatTime(elapsed);

  const scaledFontSize = config.fontSize * scaleFactor;
  const scaledPadding = config.padding * scaleFactor;
  const scaledRadius = config.borderRadius * scaleFactor;

  const timerWrapperStyle = getWrapperStyle(config.position, config.anchor);
  const summaryWrapperStyle = getWrapperStyle(config.summaryPosition, config.summaryAnchor);
  const cr = contentRect.current;

  const showSummary =
    isFinished &&
    finishTime !== null &&
    currentVideoTime - startTime >= finishTime + SUMMARY_DELAY_SECONDS;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={onContainerLayout}>
      <View
        style={{
          position: "absolute",
          left: cr.x,
          top: cr.y,
          width: cr.width,
          height: cr.height,
        }}
        pointerEvents="box-none"
      >
        {/* Watermark: bottom-right corner of video content */}
        <View
          style={{
            position: "absolute",
            right: "3%",
            bottom: "3%",
            flexDirection: "row",
            alignItems: "center",
            opacity: 0.3,
          }}
          pointerEvents="none"
        >
          <Image
            source={require("../../assets/icon.png")}
            style={{
              width: watermarkFontSize,
              height: watermarkFontSize,
              borderRadius: watermarkFontSize * 0.2,
              marginRight: watermarkFontSize * 0.3,
            }}
          />
          <Text
            style={{
              color: "white",
              fontSize: watermarkFontSize,
              fontWeight: "600",
            }}
          >
            SwimHub Timer
          </Text>
        </View>

        {/* Stopwatch timer — hidden while the summary is shown */}
        {!showSummary && (
          <View style={timerWrapperStyle} pointerEvents="box-none">
            <View
              {...timerPanResponder.panHandlers}
              style={{
                backgroundColor: config.backgroundColor,
                borderRadius: scaledRadius,
                padding: scaledPadding,
              }}
            >
              <Text
                style={{
                  color: config.textColor,
                  fontSize: scaledFontSize,
                  fontWeight: "700",
                  fontFamily: config.fontFamily === "monospace" ? "monospace" : undefined,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {timeText}
              </Text>
            </View>
          </View>
        )}

        {/* Goal summary table — appears 2s after finish; draggable like the timer */}
        {showSummary && (
          <View style={summaryWrapperStyle} pointerEvents="box-none" testID="finish-summary-table">
            <View {...summaryPanResponder.panHandlers}>
              <FinishSummaryTable
                splitTimes={splitTimes}
                finishTime={finishTime!}
                config={{
                  textColor: config.textColor,
                  backgroundColor: config.backgroundColor,
                  fontFamily: config.fontFamily,
                }}
                scaleFactor={scaleFactor}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function pct(value: number): DimensionValue {
  return `${value * 100}%` as DimensionValue;
}

export function getStopwatchWrapperStyle(
  position: { x: number; y: number },
  anchor: StopwatchAnchor,
): ViewStyle {
  return getWrapperStyle(position, anchor);
}

function getWrapperStyle(
  position: { x: number; y: number },
  anchor: StopwatchAnchor,
): ViewStyle {
  const base: ViewStyle = { position: "absolute" };

  switch (anchor) {
    case "top-left":
      return { ...base, left: pct(position.x), top: pct(position.y) };
    case "top-center":
      return {
        ...base,
        left: 0,
        right: 0,
        top: pct(position.y),
        flexDirection: "row",
        justifyContent: "center",
      };
    case "top-right":
      return { ...base, right: pct(1 - position.x), top: pct(position.y) };
    case "center":
      return {
        ...base,
        left: pct(position.x),
        top: pct(position.y),
        transform: [
          { translateX: "-50%" as unknown as number },
          { translateY: "-50%" as unknown as number },
        ],
      };
    case "bottom-left":
      return { ...base, left: pct(position.x), bottom: pct(1 - position.y) };
    case "bottom-center":
      return {
        ...base,
        left: 0,
        right: 0,
        bottom: pct(1 - position.y),
        flexDirection: "row",
        justifyContent: "center",
      };
    case "bottom-right":
      return { ...base, right: pct(1 - position.x), bottom: pct(1 - position.y) };
    default:
      return { ...base, left: pct(position.x), top: pct(position.y) };
  }
}
