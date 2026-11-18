import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Pressable's default retention area keeps a press alive 20–30pt outside the
 * button. Zero means "slide off the button, then release" cancels the press —
 * the spec'd way to back out of a mistaken touch.
 */
const NO_RETENTION = { top: 0, left: 0, right: 0, bottom: 0 } as const;

interface MeasureButtonProps {
  label: string;
  color: string;
  /** Fired on release *inside* the button — that release instant is the recorded time. */
  onRelease: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Timing button that records on finger *release*, not touch-down: coaches hold
 * the button ahead of the touch and let go at the wall. Touch-down only gives
 * a light tap of feedback so the user knows the button is "armed".
 */
export function MeasureButton({
  label,
  color,
  onRelease,
  disabled = false,
  style,
  testID,
}: MeasureButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      pressRetentionOffset={NO_RETENTION}
      onPressIn={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPress={() => {
        onRelease();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: color },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {({ pressed }) => <Text style={[styles.label, pressed && styles.labelPressed]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 120,
    height: 88,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.85)",
  },
  // While held the button visibly sinks and its border goes solid white, so the
  // user can tell at a glance that a release will record.
  pressed: {
    transform: [{ scale: 0.94 }],
    borderColor: "#FFFFFF",
    borderWidth: 5,
  },
  disabled: {
    opacity: 0.35,
  },
  label: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  labelPressed: {
    opacity: 0.9,
  },
});
