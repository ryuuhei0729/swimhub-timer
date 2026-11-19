/**
 * The editor is a strict two-step flow (start → splits) with no tabs: the
 * banner says which step is current, and the only way back to the start is
 * the explicit "fix start" action.
 */
import React from "react";
import { render, fireEvent, act, waitFor } from "@testing-library/react-native";
import EditorScreen from "../app/(app)/editor";
import { useEditorStore } from "../stores/editor-store";

const mockT = (key: string) => key;
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock("../lib/audio/extractor", () => ({
  extractAudioFromVideo: () =>
    Promise.resolve({ pcmData: new Float32Array(10), sampleRate: 10, duration: 1 }),
  generateWaveformData: () => new Float32Array(10),
}));
jest.mock("../lib/audio/signal-detector", () => ({ detectStartSignal: () => null }));
jest.mock("../components/audio/WaveformDisplay", () => {
  const { View } = jest.requireActual("react-native");
  return { WaveformDisplay: () => <View testID="waveform" /> };
});
jest.mock("../components/video/VideoPlayer", () => ({ VideoPlayer: () => null }));
jest.mock("../components/splits/MarkAssignPanel", () => {
  const { View } = jest.requireActual("react-native");
  return { MarkAssignPanel: () => <View testID="mark-assign-panel" /> };
});
jest.mock("../components/splits/SplitsPanel", () => ({ SplitsPanel: () => null }));
jest.mock("../components/splits/AddMarkAtPlayheadBar", () => ({
  AddMarkAtPlayheadBar: () => null,
}));

beforeEach(() => {
  const s = useEditorStore.getState();
  s.reset();
  s.setVideoUri("file:///v.mp4");
});

it("imported video: starts on step 1 with no way to jump to splits", async () => {
  const screen = await render(<EditorScreen />);
  expect(screen.getByTestId("step-banner-start")).toBeTruthy();
  expect(screen.getByText("editor.stepStartTitle")).toBeTruthy();
  expect(screen.queryByTestId("mark-assign-panel")).toBeNull();
  // Tapping the step label does nothing (it is not a tab).
  await fireEvent.press(screen.getByText("editor.tabSplits"));
  expect(screen.getByTestId("step-banner-start")).toBeTruthy();
});

it("confirming the start moves to step 2; fix start goes back and cancel returns", async () => {
  const screen = await render(<EditorScreen />);
  await act(async () => {
    useEditorStore.getState().setDetectedSignalTime(1.5);
  });
  await fireEvent.press(await screen.findByTestId("signal-confirm"));

  expect(screen.getByTestId("step-banner-splits")).toBeTruthy();
  expect(screen.getByText("editor.stepSplitsTitle")).toBeTruthy();
  expect(screen.getByTestId("mark-assign-panel")).toBeTruthy();

  await act(async () => {
    await fireEvent.press(screen.getByTestId("step-edit-start"));
  });
  expect(screen.getByTestId("step-banner-start")).toBeTruthy();
  // Opens directly in Change mode on the confirmed start.
  await waitFor(() => expect(screen.getByTestId("signal-cancel-change")).toBeTruthy());

  await fireEvent.press(screen.getByTestId("signal-cancel-change"));
  expect(screen.getByTestId("step-banner-splits")).toBeTruthy();
  expect(useEditorStore.getState().startTime).toBe(1.5);
});

it("camera capture (start already set) opens on step 2", async () => {
  useEditorStore.getState().setStartTime(2);
  const screen = await render(<EditorScreen />);
  expect(screen.getByTestId("step-banner-splits")).toBeTruthy();
});

it("each step tells how to fine-tune", async () => {
  const screen = await render(<EditorScreen />);
  expect(screen.getByText("editor.stepTune")).toBeTruthy();
  await act(async () => {
    useEditorStore.getState().setDetectedSignalTime(1.5);
  });
  await fireEvent.press(await screen.findByTestId("signal-confirm"));
  expect(screen.getByText("editor.stepTune")).toBeTruthy();
});
