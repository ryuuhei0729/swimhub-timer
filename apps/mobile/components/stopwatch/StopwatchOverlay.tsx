import { useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  type LayoutChangeEvent,
} from "react-native";
import { useEditorStore } from "../../stores/editor-store";
import { formatTime } from "@split-sync/core";
import type { SplitTime } from "@split-sync/core";

const SPLIT_DISPLAY_DURATION = 3;

interface Props {
  videoWidth: number;
  videoHeight: number;
}

export function StopwatchOverlay({ videoWidth, videoHeight }: Props) {
  const config = useEditorStore((s) => s.stopwatchConfig);
  const startTime = useEditorStore((s) => s.startTime);
  const currentVideoTime = useEditorStore((s) => s.currentVideoTime);
  const splitTimes = useEditorStore((s) => s.splitTimes);
  const isFinished = useEditorStore((s) => s.isFinished);
  const finishTime = useEditorStore((s) => s.finishTime);
  const updateStopwatchConfig = useEditorStore(
    (s) => s.updateStopwatchConfig
  );

  const containerSize = useRef({ width: 0, height: 0 });
  const dragStart = useRef({ x: 0, y: 0 });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const pos = useEditorStore.getState().stopwatchConfig.position;
          dragStart.current = { x: pos.x, y: pos.y };
        },
        onPanResponderMove: (_, gestureState) => {
          const { width, height } = containerSize.current;
          if (width === 0 || height === 0) return;

          const dx = gestureState.dx / width;
          const dy = gestureState.dy / height;

          const newX = Math.max(0, Math.min(1, dragStart.current.x + dx));
          const newY = Math.max(0, Math.min(1, dragStart.current.y + dy));

          updateStopwatchConfig({
            position: { x: newX, y: newY },
          });
        },
      }),
    [updateStopwatchConfig]
  );

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    containerSize.current = {
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    };
  }, []);

  if (startTime === null) return null;

  let elapsed = Math.max(0, currentVideoTime - startTime);
  if (isFinished && finishTime !== null && elapsed > finishTime) {
    elapsed = finishTime;
  }
  const timeText = formatTime(elapsed);

  // Find the most recent split within the 3-second display window
  let activeSplit: SplitTime | null = null;
  if (splitTimes.length > 0) {
    for (let i = splitTimes.length - 1; i >= 0; i--) {
      const s = splitTimes[i];
      if (elapsed >= s.time && elapsed < s.time + SPLIT_DISPLAY_DURATION) {
        activeSplit = s;
        break;
      }
    }
  }

  // Scale based on actual preview container vs video resolution
  const scaleFactor =
    containerSize.current.width > 0
      ? containerSize.current.width / videoWidth
      : 0.2;
  const scaledFontSize = config.fontSize * scaleFactor;
  const scaledPadding = config.padding * scaleFactor;
  const scaledRadius = config.borderRadius * scaleFactor;

  const splitFontSize = Math.round(scaledFontSize * 0.55);
  const splitPadding = Math.round(scaledPadding * 0.6);
  const memoFontSize = Math.round(scaledFontSize * 0.38);

  const isBottomAnchor = config.anchor.startsWith("bottom");
  const wrapperStyle = getWrapperStyle(config);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      onLayout={onContainerLayout}
    >
      <View style={wrapperStyle} pointerEvents="box-none">
        <View style={{ alignItems: "center" }}>
          {/* Split display above stopwatch (for bottom anchors) */}
          {activeSplit && isBottomAnchor && (
            <SplitDisplay
              split={activeSplit}
              config={config}
              fontSize={splitFontSize}
              memoFontSize={memoFontSize}
              padding={splitPadding}
              radius={Math.min(scaledRadius, 8)}
              style={{ marginBottom: 2 }}
            />
          )}

          <View
            {...panResponder.panHandlers}
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
                fontFamily:
                  config.fontFamily === "monospace" ? "monospace" : undefined,
              }}
            >
              {timeText}
            </Text>
          </View>

          {/* Split display below stopwatch (for top anchors) */}
          {activeSplit && !isBottomAnchor && (
            <SplitDisplay
              split={activeSplit}
              config={config}
              fontSize={splitFontSize}
              memoFontSize={memoFontSize}
              padding={splitPadding}
              radius={Math.min(scaledRadius, 8)}
              style={{ marginTop: 2 }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function formatSplitText(split: SplitTime): string {
  const timeStr = formatTime(split.time);
  if (split.lapTime !== null) {
    return `${split.distance}m: ${timeStr} (lap: ${formatTime(split.lapTime)})`;
  }
  return `${split.distance}m: ${timeStr}`;
}

function SplitDisplay({
  split,
  config,
  fontSize,
  memoFontSize,
  padding,
  radius,
  style,
}: {
  split: SplitTime;
  config: { backgroundColor: string; textColor: string; fontFamily: string };
  fontSize: number;
  memoFontSize: number;
  padding: number;
  radius: number;
  style?: Record<string, any>;
}) {
  const hasMemo = split.memo.length > 0;
  return (
    <View
      style={[
        {
          backgroundColor: config.backgroundColor,
          borderRadius: radius,
          padding: padding,
          alignItems: "center",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: config.textColor,
          fontSize,
          fontWeight: "700",
          fontFamily:
            config.fontFamily === "monospace" ? "monospace" : undefined,
        }}
      >
        {formatSplitText(split)}
      </Text>
      {hasMemo && (
        <Text
          style={{
            color: config.textColor,
            fontSize: memoFontSize,
            opacity: 0.75,
            marginTop: 1,
            fontFamily:
              config.fontFamily === "monospace" ? "monospace" : undefined,
          }}
        >
          {split.memo}
        </Text>
      )}
    </View>
  );
}

/** Returns whether anchor is horizontally centered */
function isCenterAnchor(anchor: string): boolean {
  return anchor === "top-center" || anchor === "bottom-center";
}

function getWrapperStyle(
  config: { position: { x: number; y: number }; anchor: string }
): Record<string, any> {
  const style: Record<string, any> = {
    position: "absolute",
  };

  const yPercent = `${config.position.y * 100}%`;

  if (isCenterAnchor(config.anchor)) {
    style.left = 0;
    style.right = 0;
    style.flexDirection = "row";
    style.justifyContent = "center";
  }

  switch (config.anchor) {
    case "top-left":
      style.left = `${config.position.x * 100}%`;
      style.top = yPercent;
      break;
    case "top-center":
      style.top = yPercent;
      break;
    case "top-right":
      style.right = `${(1 - config.position.x) * 100}%`;
      style.top = yPercent;
      break;
    case "bottom-left":
      style.left = `${config.position.x * 100}%`;
      style.bottom = `${(1 - config.position.y) * 100}%`;
      break;
    case "bottom-center":
      style.bottom = `${(1 - config.position.y) * 100}%`;
      break;
    case "bottom-right":
      style.right = `${(1 - config.position.x) * 100}%`;
      style.bottom = `${(1 - config.position.y) * 100}%`;
      break;
    default:
      style.left = `${config.position.x * 100}%`;
      style.top = yPercent;
  }

  return style;
}
