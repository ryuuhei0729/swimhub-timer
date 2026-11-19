/**
 * Camera capture screen: timing buttons read the recorder clock on release,
 * the lap table, the post-STOP auto-stop, and the hand-off to the editor.
 * The camera / recorder are faked; everything else is the real screen.
 */
import React from "react";
import { Alert, AppState, Linking } from "react-native";
import { render, fireEvent, act, within } from "@testing-library/react-native";
import CaptureScreen from "../app/(app)/capture";
import { useEditorStore } from "../stores/editor-store";

jest.setTimeout(30_000);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, push: jest.fn() }),
}));

const mockOrientationListeners: ((e: { orientationInfo: { orientation: number } }) => void)[] = [];
jest.mock("expo-screen-orientation", () => ({
  lockAsync: jest.fn(async () => {}),
  getOrientationAsync: jest.fn(async () => 3), // LANDSCAPE_LEFT
  addOrientationChangeListener: jest.fn((cb) => {
    mockOrientationListeners.push(cb);
    return { remove: () => {} };
  }),
  removeOrientationChangeListener: jest.fn(),
  OrientationLock: { LANDSCAPE: 5, PORTRAIT_UP: 3 },
  Orientation: {
    UNKNOWN: 0,
    PORTRAIT_UP: 1,
    PORTRAIT_DOWN: 2,
    LANDSCAPE_LEFT: 3,
    LANDSCAPE_RIGHT: 4,
  },
}));
jest.mock("expo-keep-awake", () => ({ useKeepAwake: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

const mockSaveToPhotoLibrary = jest.fn(async () => {});
jest.mock("../lib/video/export-pipeline", () => ({
  saveToPhotoLibrary: (...args: unknown[]) => mockSaveToPhotoLibrary(...(args as [])),
}));
const mockProbeVideo = jest.fn();
jest.mock("../lib/video/probe-video", () => ({
  ...jest.requireActual("../lib/video/probe-video"),
  probeVideo: (...args: unknown[]) => mockProbeVideo(...args),
}));

let mockWindow = { width: 844, height: 390 }; // landscape iPhone
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => ({ ...mockWindow, scale: 3, fontScale: 1 }),
}));

// ---- Fake recorder: recordedDuration is the "video clock" the buttons read.
type FinishedCb = (path: string, reason: string) => void;
type ErrorCb = (error: Error) => void;
const mockRecorder = {
  isRecording: false,
  recordedDuration: 0,
  filePath: "/tmp/capture.mp4",
  onFinished: null as FinishedCb | null,
  onError: null as ErrorCb | null,
  startRecording: jest.fn(async (onFinished: FinishedCb, onError: ErrorCb) => {
    mockRecorder.isRecording = true;
    mockRecorder.onFinished = onFinished;
    mockRecorder.onError = onError;
  }),
  stopRecording: jest.fn(async () => {
    mockRecorder.isRecording = false;
    mockRecorder.onFinished?.("/tmp/capture.mp4", "stopped");
  }),
  cancelRecording: jest.fn(async () => {
    mockRecorder.isRecording = false;
  }),
};

const mockCreateRecorder = jest.fn();
const mockVideoOutput: {
  outputOrientation?: string;
  createRecorder: (...a: unknown[]) => unknown;
} = { createRecorder: (...args: unknown[]) => mockCreateRecorder(...args) };
const mockCameraActive = { current: true };
// vision-camera's interface OrientationManager: the real interface orientation.
const mockInterfaceOrientation: { current: string | undefined } = { current: "right" };
const mockCameraOrientationSource: { current: string | undefined } = { current: undefined };

jest.mock("react-native-vision-camera", () => {
  const { useEffect } = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  const permission = {
    status: "authorized",
    hasPermission: true,
    canRequestPermission: false,
    requestPermission: async () => true,
  };
  return {
    Camera: ({
      onStarted,
      isActive,
      orientationSource,
    }: {
      onStarted?: () => void;
      isActive: boolean;
      orientationSource?: string;
    }) => {
      mockCameraActive.current = isActive;
      mockCameraOrientationSource.current = orientationSource;
      useEffect(() => {
        onStarted?.();
      }, [onStarted]);
      return <View testID="camera" />;
    },
    CommonResolutions: { FHD_16_9: { width: 1080, height: 1920 } },
    useCameraPermission: () => permission,
    useMicrophonePermission: () => permission,
    useVideoOutput: () => mockVideoOutput,
    VisionCamera: {
      // Like the real one: reads the interface orientation when created.
      createOrientationManager: () => {
        const atCreation = mockInterfaceOrientation.current;
        return {
          currentOrientation: atCreation,
          startOrientationUpdates: () => {},
          stopOrientationUpdates: () => {},
        };
      },
    },
  };
});

// Fake only the timers the screen uses. Faking nextTick/queueMicrotask/
// setImmediate as well leaves React/RNTL's async cleanup hanging for the
// *following* test.
function useTimerOnlyFakes() {
  jest.useFakeTimers({ doNotFake: ["nextTick", "queueMicrotask", "setImmediate"] });
}

/**
 * Press without awaiting the handler's own promise (`await fireEvent.press`
 * would wait for it — e.g. a dialog still open, or a deferred recorder), then
 * let fireEvent's act() settle so it never overlaps the next act().
 */
async function pressAndSettle(instance: Parameters<typeof fireEvent.press>[0]) {
  void fireEvent.press(instance);
  await new Promise<void>((r) => setImmediate(r));
}

/** Answer every Alert with the button whose text is `answer`. */
let alertSpy: jest.SpyInstance | null = null;
function answerAlerts(answer: string) {
  alertSpy = jest.spyOn(Alert, "alert");
  return alertSpy.mockImplementation((_title, _msg, buttons) => {
    buttons?.find((b) => b.text === answer)?.onPress?.();
  });
}

async function startRecording(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(screen.getByTestId("capture-record"));
}

beforeEach(() => {
  jest.useRealTimers();
  mockRecorder.isRecording = false;
  mockRecorder.recordedDuration = 0;
  mockRecorder.onFinished = null;
  mockRecorder.onError = null;
  mockCreateRecorder.mockReset();
  mockCreateRecorder.mockImplementation(async () => mockRecorder);
  mockProbeVideo.mockReset();
  mockProbeVideo.mockImplementation(async () => ({ width: 1920, height: 1080, duration: 120 }));
  mockWindow = { width: 844, height: 390 };
  mockBack.mockClear();
  mockVideoOutput.outputOrientation = undefined;
  mockInterfaceOrientation.current = "right";
  mockOrientationListeners.length = 0;
  mockRecorder.startRecording.mockClear();
  mockRecorder.stopRecording.mockClear();
  mockRecorder.cancelRecording.mockClear();
  mockReplace.mockClear();
  mockSaveToPhotoLibrary.mockClear();
  useEditorStore.getState().reset();
});

afterEach(() => {
  alertSpy?.mockRestore();
  alertSpy = null;
});

it("START is disabled until recording; then START → LAP → STOP record the recorder clock", async () => {
  const screen = await render(<CaptureScreen />);
  expect(screen.getByTestId("capture-start")).toBeDisabled();

  await startRecording(screen);
  expect(screen.getByTestId("capture-start")).not.toBeDisabled();

  mockRecorder.recordedDuration = 3.2;
  await fireEvent.press(screen.getByTestId("capture-start"));
  mockRecorder.recordedDuration = 33.45;
  await fireEvent.press(screen.getByTestId("capture-lap"));
  mockRecorder.recordedDuration = 65.1;
  await fireEvent.press(screen.getByTestId("capture-stop"));

  // After STOP only the stop-recording reminder remains (no more LAP/STOP).
  expect(screen.queryByTestId("capture-lap")).toBeNull();
  expect(screen.getByTestId("capture-autostop-banner")).toBeTruthy();

  answerAlerts("capture.saveOriginalNo");
  await act(async () => {
    await fireEvent.press(screen.getByTestId("capture-record")); // stop recording
  });

  const s = useEditorStore.getState();
  expect(s.videoUri).toBe("file:///tmp/capture.mp4");
  expect(s.startTime).toBe(3.2);
  expect(s.capturedMarks?.map((m) => [m.videoTime, m.distance])).toEqual([
    [33.45, null],
    [65.1, null],
  ]);
  expect(s.videoMetadata).toMatchObject({ width: 1920, height: 1080, duration: 120 });
  expect(mockSaveToPhotoLibrary).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith("/editor");
});

it("shows the latest 4 laps with split and lap; stopping the recording mid-race keeps them", async () => {
  const screen = await render(<CaptureScreen />);
  await startRecording(screen);
  mockRecorder.recordedDuration = 2;
  await fireEvent.press(screen.getByTestId("capture-start"));
  // 5 laps of 30, 31, 32, 33, 34 s
  let t = 2;
  for (const lap of [30, 31, 32, 33, 34]) {
    t += lap;
    mockRecorder.recordedDuration = t;
    await fireEvent.press(screen.getByTestId("capture-lap"));
  }
  expect(screen.queryByTestId("capture-lap-row-1")).toBeNull(); // scrolled out
  const row5 = screen.getByTestId("capture-lap-row-5");
  expect(screen.getByTestId("capture-lap-row-2")).toBeTruthy();
  // split = 30+31+32+33+34 = 160 s, lap = 34 s
  expect(within(row5).getByText("2:40.00")).toBeTruthy();
  expect(within(row5).getByText("34.00")).toBeTruthy(); // formatTime omits minutes under 60 s
  expect(screen.queryByTestId("capture-undo")).toBeNull();

  answerAlerts("capture.saveOriginalNo");
  await act(async () => {
    await fireEvent.press(screen.getByTestId("capture-record"));
  });
  expect(useEditorStore.getState().capturedMarks).toHaveLength(5);
});

it("explains a denied Photos permission and offers Settings, then still opens the editor", async () => {
  const { PhotoLibraryPermissionError } = jest.requireActual("../lib/video/photo-library-errors");
  mockSaveToPhotoLibrary.mockImplementationOnce(async () => {
    throw new PhotoLibraryPermissionError();
  });
  const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
  const titles: string[] = [];
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation((title, _m, buttons) => {
    titles.push(title);
    const answer =
      title === "capture.saveOriginalTitle" ? "capture.saveOriginalYes" : "capture.openSettings";
    buttons?.find((b) => b.text === answer)?.onPress?.();
  });
  const screen = await render(<CaptureScreen />);
  await startRecording(screen);
  await act(async () => {
    await fireEvent.press(screen.getByTestId("capture-record"));
  });
  expect(titles).toContain("capture.photoPermissionTitle");
  expect(titles).not.toContain("capture.saveOriginalFailed");
  expect(openSettings).toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith("/editor");
  openSettings.mockRestore();
});

it("saves the original video when the user answers yes", async () => {
  const screen = await render(<CaptureScreen />);
  await startRecording(screen);
  answerAlerts("capture.saveOriginalYes");
  await act(async () => {
    await fireEvent.press(screen.getByTestId("capture-record"));
  });
  expect(mockSaveToPhotoLibrary).toHaveBeenCalledWith("file:///tmp/capture.mp4");
  // No START → plain editor session (start detected from audio as usual).
  expect(useEditorStore.getState().startTime).toBeNull();
  expect(useEditorStore.getState().capturedMarks).toEqual([]);
});

it("stops the recording automatically 60s after STOP, with an Extend option at the end", async () => {
  useTimerOnlyFakes();
  const screen = await render(<CaptureScreen />);
  await startRecording(screen);
  mockRecorder.recordedDuration = 1;
  await fireEvent.press(screen.getByTestId("capture-start"));
  mockRecorder.recordedDuration = 30;
  await fireEvent.press(screen.getByTestId("capture-stop"));

  await act(async () => {
    jest.advanceTimersByTime(49_000);
  });
  expect(screen.queryByTestId("capture-extend")).toBeNull();
  await act(async () => {
    jest.advanceTimersByTime(2_000); // 9s left → warning with Extend
  });
  await fireEvent.press(screen.getByTestId("capture-extend"));
  await act(async () => {
    jest.advanceTimersByTime(30_000);
  });
  expect(mockRecorder.stopRecording).not.toHaveBeenCalled();

  answerAlerts("capture.saveOriginalNo");
  await act(async () => {
    jest.advanceTimersByTime(31_000);
  });
  expect(mockRecorder.stopRecording).toHaveBeenCalledTimes(1);
  await act(async () => screen.unmount());
  jest.useRealTimers();
});

describe("recording errors", () => {
  it("unplayable file: alerts, and the next recording can be timed from START again", async () => {
    mockProbeVideo.mockImplementation(async () => null);
    const alert = answerAlerts("never");
    const screen = await render(<CaptureScreen />);
    await startRecording(screen);
    mockRecorder.recordedDuration = 1;
    await fireEvent.press(screen.getByTestId("capture-start"));
    mockRecorder.recordedDuration = 20;
    await fireEvent.press(screen.getByTestId("capture-lap"));

    await act(async () => {
      mockRecorder.isRecording = false;
      mockRecorder.onError?.(new Error("session interrupted"));
    });
    expect(alert).toHaveBeenCalledWith("capture.recordingError", "session interrupted");
    expect(mockReplace).not.toHaveBeenCalled();

    // Fresh preview: START is back and works on the next recording.
    await startRecording(screen);
    expect(mockCreateRecorder).toHaveBeenCalledTimes(2);
    mockRecorder.recordedDuration = 2;
    await fireEvent.press(screen.getByTestId("capture-start"));
    expect(screen.getByTestId("capture-lap")).toBeTruthy();
  });

  it("playable file: keeps the race and opens the editor with the marks so far", async () => {
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
      // acknowledge the salvage notice, decline saving the original
      const b = buttons?.find(
        (x) => x.text === "common.close" || x.text === "capture.saveOriginalNo",
      );
      b?.onPress?.();
    });
    const screen = await render(<CaptureScreen />);
    await startRecording(screen);
    mockRecorder.recordedDuration = 1;
    await fireEvent.press(screen.getByTestId("capture-start"));
    mockRecorder.recordedDuration = 20;
    await fireEvent.press(screen.getByTestId("capture-lap"));

    await act(async () => {
      mockRecorder.isRecording = false;
      mockRecorder.onError?.(new Error("session interrupted"));
    });
    const s = useEditorStore.getState();
    expect(s.startTime).toBe(1);
    expect(s.capturedMarks?.map((m) => m.videoTime)).toEqual([20]);
    expect(mockReplace).toHaveBeenCalledWith("/editor");
  });
});

describe("recording orientation (set at record start, never portrait)", () => {
  const ScreenOrientation = () =>
    jest.requireMock("expo-screen-orientation") as { getOrientationAsync: jest.Mock };

  it("uses the real interface orientation from vision-camera, with a custom source", async () => {
    mockInterfaceOrientation.current = "right"; // UIKit landscapeLeft
    const screen = await render(<CaptureScreen />);
    expect(mockCameraOrientationSource.current).toBe("custom");
    await startRecording(screen);
    expect(mockVideoOutput.outputOrientation).toBe("right");
  });

  it("falls back to expo's landscape value when vision-camera has none", async () => {
    mockInterfaceOrientation.current = undefined;
    ScreenOrientation().getOrientationAsync.mockResolvedValueOnce(4); // LANDSCAPE_RIGHT
    const screen = await render(<CaptureScreen />);
    await startRecording(screen);
    expect(mockVideoOutput.outputOrientation).toBe("left");
  });

  it("after flipping to the other landscape on this screen, records the new side", async () => {
    mockInterfaceOrientation.current = "right";
    const screen = await render(<CaptureScreen />);
    // The interface rotates to landscapeRight; expo reports it when done.
    mockInterfaceOrientation.current = "left";
    await act(async () => {
      mockOrientationListeners.forEach((cb) => cb({ orientationInfo: { orientation: 4 } }));
    });
    await startRecording(screen);
    expect(mockVideoOutput.outputOrientation).toBe("left");
  });

  it("never records portrait: non-landscape readings fall back to landscapeRight", async () => {
    mockInterfaceOrientation.current = "up"; // e.g. read before the rotation landed
    ScreenOrientation().getOrientationAsync.mockResolvedValueOnce(1); // PORTRAIT_UP (stale)
    const screen = await render(<CaptureScreen />);
    await act(async () => {
      mockOrientationListeners.forEach((cb) => cb({ orientationInfo: { orientation: 0 } })); // UNKNOWN (flat)
    });
    await startRecording(screen);
    expect(mockVideoOutput.outputOrientation).toBe("left");
  });
});

it("creates the camera only after the landscape lock has been applied", async () => {
  const ScreenOrientation = jest.requireMock("expo-screen-orientation") as {
    lockAsync: jest.Mock;
  };
  let releaseLock: () => void = () => {};
  ScreenOrientation.lockAsync.mockImplementationOnce(
    () => new Promise<void>((r) => (releaseLock = r)),
  );
  const screen = await render(<CaptureScreen />);
  expect(screen.queryByTestId("camera")).toBeNull();
  await act(async () => releaseLock());
  expect(screen.getByTestId("camera")).toBeTruthy();
});

it("only a real background (not 'inactive') deactivates the camera", async () => {
  // Replaced by hand (not spyOn): jest-expo's AppState.addEventListener is
  // itself a jest.fn, and restoring a spy on it wipes its implementation.
  let handler: ((s: string) => void) | null = null;
  const original = AppState.addEventListener;
  AppState.addEventListener = ((_type: string, h: (s: string) => void) => {
    handler = h;
    return { remove: () => {} };
  }) as unknown as typeof AppState.addEventListener;
  try {
    const screen = await render(<CaptureScreen />);
    await act(async () => handler?.("inactive"));
    expect(mockCameraActive.current).toBe(true);
    await act(async () => handler?.("background"));
    expect(mockCameraActive.current).toBe(false);
    await act(async () => screen.unmount());
  } finally {
    AppState.addEventListener = original;
  }
});

it("a double tap on record starts only one recording", async () => {
  let resolve: (r: typeof mockRecorder) => void = () => {};
  mockCreateRecorder.mockImplementation(() => new Promise((r) => (resolve = r)));
  const screen = await render(<CaptureScreen />);
  // The first press is still waiting on the deferred createRecorder.
  await pressAndSettle(screen.getByTestId("capture-record"));
  await pressAndSettle(screen.getByTestId("capture-record"));
  await act(async () => resolve(mockRecorder));
  expect(mockCreateRecorder).toHaveBeenCalledTimes(1);
  expect(mockRecorder.startRecording).toHaveBeenCalledTimes(1);
});

describe("closing", () => {
  it("close → discard cancels the recording and never opens the editor", async () => {
    answerAlerts("capture.discard");
    const screen = await render(<CaptureScreen />);
    await startRecording(screen);
    await fireEvent.press(screen.getByTestId("capture-close"));
    expect(mockRecorder.cancelRecording).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("the auto-stop does not fire while the discard dialog is open", async () => {
    useTimerOnlyFakes();
    let pending: { text?: string; onPress?: () => void }[] | undefined;
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
      pending = buttons;
    });
    const screen = await render(<CaptureScreen />);
    await startRecording(screen);
    mockRecorder.recordedDuration = 1;
    await fireEvent.press(screen.getByTestId("capture-start"));
    mockRecorder.recordedDuration = 30;
    await fireEvent.press(screen.getByTestId("capture-stop"));

    await pressAndSettle(screen.getByTestId("capture-close")); // dialog stays open
    await act(async () => {
      jest.advanceTimersByTime(65_000); // past the auto-stop deadline
    });
    expect(mockRecorder.stopRecording).not.toHaveBeenCalled();

    await act(async () => {
      pending?.find((b) => b.text === "capture.discard")?.onPress?.();
    });
    expect(mockRecorder.cancelRecording).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => screen.unmount());
    jest.useRealTimers();
  });

  it("discarding while the recording ends on its own never saves or opens the editor", async () => {
    // Dialogs stay open until answered; record them in order.
    const dialogs: { title: string; buttons?: { text?: string; onPress?: () => void }[] }[] = [];
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation((title, _m, buttons) => {
      dialogs.push({ title, buttons });
    });
    const press = async (title: string, text: string) => {
      await act(async () => {
        dialogs
          .find((d) => d.title === title)
          ?.buttons?.find((b) => b.text === text)
          ?.onPress?.();
      });
    };
    const screen = await render(<CaptureScreen />);
    await startRecording(screen);
    mockRecorder.recordedDuration = 1;
    await fireEvent.press(screen.getByTestId("capture-start"));

    await pressAndSettle(screen.getByTestId("capture-close")); // discard dialog open
    await act(async () => {
      mockRecorder.isRecording = false;
      mockRecorder.onError?.(new Error("interrupted")); // playable → salvage flow starts
    });
    // Salvage notice acknowledged → the save prompt is now up, then the user
    // answers the (still open) discard dialog, then "yes" on the save prompt.
    await press("capture.recordingError", "common.close");
    expect(dialogs.map((d) => d.title)).toContain("capture.saveOriginalTitle");
    await press("capture.discardTitle", "capture.discard");
    await press("capture.saveOriginalTitle", "capture.saveOriginalYes");

    expect(mockSaveToPhotoLibrary).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it("unmounting mid-recording cancels the recording", async () => {
    const screen = await render(<CaptureScreen />);
    await startRecording(screen);
    await act(async () => {
      screen.unmount();
    });
    expect(mockRecorder.cancelRecording).toHaveBeenCalledTimes(1);
  });
});

it("portrait (e.g. iPad multitasking): shows the rotate prompt and blocks recording", async () => {
  mockWindow = { width: 820, height: 1180 };
  const screen = await render(<CaptureScreen />);
  expect(screen.getByTestId("capture-rotate-prompt")).toBeTruthy();
  // The camera must not be created while the UI is portrait: vision-camera
  // would latch the portrait orientation for preview and recording.
  expect(screen.queryByTestId("camera")).toBeNull();
  expect(screen.getByTestId("capture-record")).toBeDisabled();
  await fireEvent.press(screen.getByTestId("capture-record"));
  expect(mockCreateRecorder).not.toHaveBeenCalled();
});
