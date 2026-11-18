import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MeasureButton } from "../components/capture/MeasureButton";

type Fiber = { memoizedProps?: Record<string, unknown> | null; return: Fiber | null };

/** Props of the Pressable above a host view (RNTL v14 has no UNSAFE_getByType). */
function pressableProps(host: { unstable_fiber?: unknown }): Record<string, unknown> {
  let fiber = host.unstable_fiber as Fiber | null;
  while (fiber) {
    if (fiber.memoizedProps && "pressRetentionOffset" in fiber.memoizedProps) {
      return fiber.memoizedProps;
    }
    fiber = fiber.return;
  }
  throw new Error("Pressable not found");
}

describe("MeasureButton", () => {
  it("records on release (onPress), not on touch-down", async () => {
    const onRelease = jest.fn();
    const screen = await render(
      <MeasureButton label="LAP" color="#00f" onRelease={onRelease} testID="b" />,
    );
    await fireEvent(screen.getByTestId("b"), "pressIn");
    expect(onRelease).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("b"));
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  // fireEvent can't simulate a finger sliding off, so pin the configuration
  // that makes Pressability cancel it: no retention area beyond the button
  // (RN Pressability: leaving the press rect → no onPress on release).
  it("has no press-retention area, so sliding off before release cancels", async () => {
    const screen = await render(
      <MeasureButton label="LAP" color="#00f" onRelease={jest.fn()} testID="b" />,
    );
    const props = pressableProps(screen.getByTestId("b"));
    expect(props.pressRetentionOffset).toEqual({ top: 0, left: 0, right: 0, bottom: 0 });
    expect(props.onLongPress).toBeUndefined(); // a long hold still records on release
  });

  it("disabled: release does nothing", async () => {
    const onRelease = jest.fn();
    const screen = await render(
      <MeasureButton label="LAP" color="#00f" onRelease={onRelease} disabled testID="b" />,
    );
    await fireEvent.press(screen.getByTestId("b"));
    expect(onRelease).not.toHaveBeenCalled();
  });
});
