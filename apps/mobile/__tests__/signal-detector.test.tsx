/**
 * Start-detection tab: with a confirmed start, the waveform stays hidden (and
 * no audio is extracted) until "Change"; Change mode can be left, asking
 * before discarding an edited candidate.
 */
import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, act, waitFor } from "@testing-library/react-native";
import { SignalDetector } from "../components/audio/SignalDetector";
import { useEditorStore } from "../stores/editor-store";

// A stable `t` like the real one: the extraction effect depends on it.
const mockT = (key: string) => key;
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

const mockExtract = jest.fn();
jest.mock("../lib/audio/extractor", () => ({
  extractAudioFromVideo: (...a: unknown[]) => mockExtract(...a),
  generateWaveformData: () => new Float32Array(10),
}));
jest.mock("../lib/audio/signal-detector", () => ({ detectStartSignal: () => null }));
jest.mock("../components/audio/WaveformDisplay", () => {
  const { View } = jest.requireActual("react-native");
  return { WaveformDisplay: () => <View testID="waveform" /> };
});

beforeEach(() => {
  mockExtract.mockReset();
  mockExtract.mockResolvedValue({ pcmData: new Float32Array(10), sampleRate: 10, duration: 1 });
  const s = useEditorStore.getState();
  s.reset();
  s.setVideoUri("file:///v.mp4");
  s.setStartTime(3);
});

it("confirmed start: no waveform and no audio extraction until Change", async () => {
  const screen = await render(<SignalDetector />);
  expect(screen.queryByTestId("waveform")).toBeNull();
  expect(mockExtract).not.toHaveBeenCalled();

  await act(async () => {
    await fireEvent.press(screen.getByTestId("signal-change"));
  });
  expect(mockExtract).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("waveform")).toBeTruthy();
  // The confirmed start is kept while changing (splits stay unlocked).
  expect(useEditorStore.getState().startTime).toBe(3);
});

it("leaving Change mode without edits needs no confirmation", async () => {
  const alert = jest.spyOn(Alert, "alert");
  const screen = await render(<SignalDetector />);
  await act(async () => {
    await fireEvent.press(screen.getByTestId("signal-change"));
  });
  await fireEvent.press(screen.getByTestId("signal-cancel-change"));
  expect(alert).not.toHaveBeenCalled();
  expect(screen.queryByTestId("waveform")).toBeNull();
  alert.mockRestore();
});

it("leaving with an edited candidate asks first; discarding keeps the old start", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
    buttons?.find((b) => b.text === "signal.discardChange")?.onPress?.();
  });
  const screen = await render(<SignalDetector />);
  await act(async () => {
    await fireEvent.press(screen.getByTestId("signal-change"));
  });
  await fireEvent.press(screen.getByText("+0.1"));
  expect(useEditorStore.getState().detectedSignalTime).toBeCloseTo(3.1);

  await fireEvent.press(screen.getByTestId("signal-cancel-change"));
  expect(alert).toHaveBeenCalledWith(
    "signal.discardChangeTitle",
    "signal.discardChangeMessage",
    expect.any(Array),
  );
  expect(useEditorStore.getState().startTime).toBe(3);
  expect(useEditorStore.getState().detectedSignalTime).toBe(3);
  expect(screen.queryByTestId("signal-cancel-change")).toBeNull();
  alert.mockRestore();
});

it("cancelling the discard prompt stays in Change mode", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const screen = await render(<SignalDetector />);
  await act(async () => {
    await fireEvent.press(screen.getByTestId("signal-change"));
  });
  await fireEvent.press(screen.getByText("+0.1"));
  await fireEvent.press(screen.getByTestId("signal-cancel-change"));
  expect(screen.getByTestId("signal-cancel-change")).toBeTruthy();
  expect(screen.getByTestId("waveform")).toBeTruthy();
  alert.mockRestore();
});

it("confirming in Change mode saves the new start", async () => {
  const screen = await render(<SignalDetector />);
  await act(async () => {
    await fireEvent.press(screen.getByTestId("signal-change"));
  });
  await fireEvent.press(screen.getByText("+0.1"));
  await fireEvent.press(screen.getByTestId("signal-confirm"));
  expect(useEditorStore.getState().startTime).toBeCloseTo(3.1);
  expect(screen.queryByTestId("waveform")).toBeNull();
});

it("first-time detection (no start yet) shows the waveform without Change", async () => {
  useEditorStore.getState().setStartTime(null);
  const screen = await render(<SignalDetector />);
  await waitFor(() => expect(screen.getByTestId("waveform")).toBeTruthy());
  expect(mockExtract).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("signal-cancel-change")).toBeNull();
});

it("leaving Change mode while audio is still extracting: no stuck spinner, and the audio is reused", async () => {
  let resolveExtract: (v: unknown) => void = () => {};
  mockExtract.mockImplementationOnce(() => new Promise((r) => (resolveExtract = r)));
  const screen = await render(<SignalDetector />);
  await act(async () => {
    await fireEvent.press(screen.getByTestId("signal-change"));
  });
  expect(screen.getByTestId("signal-loading")).toBeTruthy();

  await fireEvent.press(screen.getByTestId("signal-cancel-change")); // no edits → no prompt
  expect(screen.queryByTestId("signal-loading")).toBeNull();

  await act(async () => {
    resolveExtract({ pcmData: new Float32Array(10), sampleRate: 10, duration: 1 });
  });
  expect(useEditorStore.getState().audioData).not.toBeNull();

  await act(async () => {
    await fireEvent.press(screen.getByTestId("signal-change"));
  });
  expect(screen.queryByTestId("signal-loading")).toBeNull();
  expect(screen.getByTestId("waveform")).toBeTruthy();
  expect(mockExtract).toHaveBeenCalledTimes(1);
});

it("an extraction for a video that is no longer loaded is discarded", async () => {
  let resolveExtract: (v: unknown) => void = () => {};
  mockExtract
    .mockImplementationOnce(() => new Promise((r) => (resolveExtract = r)))
    .mockImplementationOnce(() => new Promise(() => {})); // the new video's own extraction
  const screen = await render(<SignalDetector />);
  await act(async () => {
    await fireEvent.press(screen.getByTestId("signal-change"));
  });
  useEditorStore.getState().setVideoUri("file:///other.mp4");
  await act(async () => {
    resolveExtract({ pcmData: new Float32Array(10), sampleRate: 10, duration: 1 });
  });
  expect(useEditorStore.getState().audioData).toBeNull();
});

it("startInChangeMode opens straight into Change; cancelling calls onCancelChange", async () => {
  const onCancelChange = jest.fn();
  const screen = await render(<SignalDetector startInChangeMode onCancelChange={onCancelChange} />);
  await waitFor(() => expect(screen.getByTestId("waveform")).toBeTruthy());
  expect(screen.queryByTestId("signal-change")).toBeNull();
  expect(useEditorStore.getState().detectedSignalTime).toBe(3);

  await fireEvent.press(screen.getByTestId("signal-cancel-change"));
  expect(onCancelChange).toHaveBeenCalledTimes(1);
  expect(useEditorStore.getState().startTime).toBe(3);
});
