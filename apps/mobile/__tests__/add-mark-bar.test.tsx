import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { AddMarkAtPlayheadBar } from "../components/splits/AddMarkAtPlayheadBar";
import { useEditorStore } from "../stores/editor-store";
import { createCapturedMarks } from "../lib/capture/captured-marks";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

it("adds a captured time at the playhead and shows the playhead's race time", async () => {
  const store = useEditorStore.getState();
  store.reset();
  store.setStartTime(2);
  store.setCapturedMarks(createCapturedMarks([32, 64]));
  store.setCurrentVideoTime(47.5);

  const { getByTestId, getByText } = await render(<AddMarkAtPlayheadBar />);
  expect(getByText("45.50")).toBeTruthy(); // 47.5 − start 2
  await fireEvent.press(getByTestId("mark-add-current"));
  expect(useEditorStore.getState().capturedMarks!.map((m) => m.videoTime)).toEqual([32, 47.5, 64]);
});

it("steps the playhead by ±0.01 / ±0.1 s (and pauses there)", async () => {
  const store = useEditorStore.getState();
  store.reset();
  store.setStartTime(2);
  store.setCurrentVideoTime(10);
  const { getByTestId } = await render(<AddMarkAtPlayheadBar />);
  await fireEvent.press(getByTestId("playhead-seek-+0.01"));
  expect(useEditorStore.getState().pendingVideoSeek).toBeCloseTo(10.01);
  expect(useEditorStore.getState().pendingPause).toBe(true);
  await fireEvent.press(getByTestId("playhead-seek--0.1"));
  expect(useEditorStore.getState().pendingVideoSeek).toBeCloseTo(9.9);
});
