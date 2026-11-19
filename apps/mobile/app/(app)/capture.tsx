import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import { useKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  Camera,
  CommonResolutions,
  useCameraPermission,
  useMicrophonePermission,
  useVideoOutput,
  VisionCamera,
  type OrientationManager,
  type Recorder,
  type RecordingFinishedReason,
} from "react-native-vision-camera";
import { MeasureButton } from "../../components/capture/MeasureButton";
import { LiveStopwatch } from "../../components/capture/LiveStopwatch";
import { captureTimerReducer, initialCaptureTimerState } from "../../lib/capture/capture-timer";
import { createCapturedMarks } from "../../lib/capture/captured-marks";
import { RecordingClock } from "../../lib/capture/recording-clock";
import {
  buildCaptureConstraints,
  isLandscape,
  pickRecordOrientation,
} from "../../lib/capture/camera-config";
import { probeVideo, toFileUri } from "../../lib/video/probe-video";
import { saveToPhotoLibrary } from "../../lib/video/export-pipeline";
import { PhotoLibraryPermissionError } from "../../lib/video/photo-library-errors";
import { useEditorStore } from "../../stores/editor-store";
import { colors } from "../../lib/theme";

/** Recording is stopped automatically this long after STOP (unless extended). */
const AUTO_STOP_AFTER_MS = 60_000;
/** The "stopping soon" countdown (with an Extend button) shows for the last N seconds. */
const AUTO_STOP_WARNING_SEC = 10;
/** Hard cap so a forgotten recording can't fill the device (~1500m + warm-up). */
const MAX_RECORDING_MINUTES = 30;

type Phase = "preview" | "recording" | "finishing";

function alertAsync(title: string, message: string, ok: string): Promise<void> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: ok, onPress: () => resolve() }], { cancelable: false });
  });
}

function confirmAsync(title: string, message: string, yes: string, no: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: no, style: "cancel", onPress: () => resolve(false) },
        { text: yes, onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
}

async function deleteRecording(uri: string) {
  try {
    const FileSystemLegacy = await import("expo-file-system/legacy");
    await FileSystemLegacy.deleteAsync(uri, { idempotent: true });
  } catch {
    // best-effort: the OS clears the temp dir eventually
  }
}

export default function CaptureScreen() {
  useKeepAwake();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The screen locks itself to landscape, but iPad multitasking can ignore the
  // lock — in portrait, recording is blocked behind a "rotate" prompt.
  const window = useWindowDimensions();
  const isPortrait = window.height > window.width;
  const cameraPermission = useCameraPermission();
  const micPermission = useMicrophonePermission();

  const [phase, setPhase] = useState<Phase>("preview");
  const [timer, dispatch] = useReducer(captureTimerReducer, initialCaptureTimerState);
  const [appActive, setAppActive] = useState(AppState.currentState !== "background");
  const [cameraReady, setCameraReady] = useState(false);
  // vision-camera reads the interface orientation once when the camera is
  // created, then only updates on *physical* rotation. Creating it before our
  // landscape lock has taken effect left preview + recording in portrait
  // (rotated 90°, heavily cropped, and saved as a portrait video). So the
  // camera is only mounted once the lock is done and the UI is landscape;
  // it then stays mounted (never torn down mid-recording).
  const [orientationLocked, setOrientationLocked] = useState(false);
  // Inputs for the recording orientation (see pickRecordOrientation): expo's
  // last landscape value, and vision-camera's interface orientation manager.
  const expoLandscapeRef = useRef<ScreenOrientation.Orientation | null>(null);
  const interfaceOrientationRef = useRef<OrientationManager | null>(null);
  // Bumped after every interface rotation (see the listener below).
  const [interfaceRotations, setInterfaceRotations] = useState(0);
  const [cameraMounted, setCameraMounted] = useState(false);
  const [autoStopDeadline, setAutoStopDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const recorderRef = useRef<Recorder | null>(null);
  const clockRef = useRef(new RecordingClock());
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const cancelledRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const startingRef = useRef(false);
  // True while the "discard recording?" dialog is open: the auto-stop must not
  // fire underneath it and hand a recording the user is discarding to the editor.
  const closingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastDurationRef = useRef(0);

  // --- Orientation: this screen is landscape-only; the rest of the app is portrait.
  useEffect(() => {
    let cancelled = false;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
      .catch(() => {})
      .then(() => ScreenOrientation.getOrientationAsync())
      .then((o) => {
        if (!cancelled && isLandscape(o)) expoLandscapeRef.current = o;
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setOrientationLocked(true);
      });
    // Landscape left ↔ right flips while on this screen.
    const sub = ScreenOrientation.addOrientationChangeListener((e) => {
      const o = e.orientationInfo.orientation;
      if (isLandscape(o)) expoLandscapeRef.current = o; // UNKNOWN etc. are ignored
      // The UI just finished rotating (e.g. flipped to the other landscape):
      // re-create the interface manager so it re-reads the real orientation.
      setInterfaceRotations((n) => n + 1);
    });
    return () => {
      cancelled = true;
      ScreenOrientation.removeOrientationChangeListener(sub);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (orientationLocked && !isPortrait) setCameraMounted(true);
  }, [orientationLocked, isPortrait]);

  // Only a real background stops the camera. "inactive" (pulling down
  // Notification/Control Center, an incoming-call banner) is common while
  // filming and must not interrupt the recording.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setAppActive(s !== "background"));
    return () => sub.remove();
  }, []);

  // Leaving the screen any way other than the normal finish (e.g. an auth
  // redirect) must not leave a recording running with no UI.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder) {
        cancelledRef.current = true;
        recorderRef.current = null;
        recorder.cancelRecording().catch(() => {});
      }
    };
  }, []);

  // --- Permissions: ask once on entry (camera first, then microphone).
  const permissionAskedRef = useRef(false);
  useEffect(() => {
    if (permissionAskedRef.current) return;
    permissionAskedRef.current = true;
    (async () => {
      if (cameraPermission.canRequestPermission) await cameraPermission.requestPermission();
      if (micPermission.canRequestPermission) await micPermission.requestPermission();
    })().catch(() => {});
  }, [cameraPermission, micPermission]);

  // --- Camera outputs. Audio is recorded so the editor's start-signal
  // detection works on the footage; without mic permission we still record.
  const videoOutput = useVideoOutput({
    targetResolution: CommonResolutions.FHD_16_9,
    enableAudio: micPermission.hasPermission,
    fileType: "mp4",
  });
  const outputs = useMemo(() => [videoOutput], [videoOutput]);
  const constraints = useMemo(() => buildCaptureConstraints(videoOutput), [videoOutput]);
  // Created only once the UI is landscape, and re-created after every
  // interface rotation: it reads the real interface orientation when it is
  // created, but its own updates fire on the *device* rotation notification —
  // which can arrive before the interface has rotated, leaving a stale side.
  useEffect(() => {
    if (!cameraMounted) return;
    const manager = VisionCamera.createOrientationManager("interface");
    manager.startOrientationUpdates(() => {});
    interfaceOrientationRef.current = manager;
    return () => {
      manager.stopOrientationUpdates();
      interfaceOrientationRef.current = null;
    };
  }, [cameraMounted, interfaceRotations]);

  // Recording position used by the stopwatch and every press. Smooth and
  // monotonic (see RecordingClock); each call also refines the offset.
  const getVideoTime = useCallback((): number | null => {
    const r = recorderRef.current;
    if (!r || !r.isRecording) return null;
    const now = performance.now();
    clockRef.current.sample(r.recordedDuration, now);
    return clockRef.current.videoTimeAt(now);
  }, []);

  // --- Recording lifecycle -------------------------------------------------

  const finishCapture = useCallback(
    async (filePath: string, reason: RecordingFinishedReason) => {
      recorderRef.current = null;
      clockRef.current.stop();
      setAutoStopDeadline(null);
      const uri = toFileUri(filePath);
      // Re-checked after every await: the user may discard (close dialog) or
      // the screen may unmount while a prompt is showing.
      const abandoned = () => cancelledRef.current || !mountedRef.current;
      if (abandoned()) {
        await deleteRecording(uri);
        return;
      }
      setPhase("finishing");
      // Recording stopped mid-race → freeze the timer; marks so far are kept.
      const finalTimer = captureTimerReducer(timerRef.current, { type: "recordingEnded" });
      dispatch({ type: "recordingEnded" });

      if (reason === "max-duration-reached") {
        await alertAsync(
          "",
          t("capture.maxDurationReached", { minutes: MAX_RECORDING_MINUTES }),
          t("common.close"),
        );
      }
      if (abandoned()) {
        await deleteRecording(uri);
        return;
      }

      const saveOriginal = await confirmAsync(
        t("capture.saveOriginalTitle"),
        t("capture.saveOriginalMessage"),
        t("capture.saveOriginalYes"),
        t("capture.saveOriginalNo"),
      );
      // The user may have chosen "discard" in a dialog shown alongside this one.
      if (abandoned()) {
        await deleteRecording(uri);
        return;
      }
      if (saveOriginal) {
        try {
          await saveToPhotoLibrary(uri);
        } catch (e) {
          if (e instanceof PhotoLibraryPermissionError) {
            // Denied earlier: iOS won't ask again, so say why and offer Settings.
            const openSettings = await confirmAsync(
              t("capture.photoPermissionTitle"),
              t("capture.photoPermissionMessage"),
              t("capture.openSettings"),
              t("common.close"),
            );
            if (openSettings) Linking.openSettings().catch(() => {});
          } else {
            await alertAsync(
              t("capture.saveOriginalFailed"),
              e instanceof Error ? e.message : "",
              t("common.close"),
            );
          }
        }
      }

      const probed = await probeVideo(uri);
      if (__DEV__) console.log("[capture] recorded video", probed);
      if (abandoned()) {
        await deleteRecording(uri); // the camera-roll copy (if chosen) is separate
        return;
      }
      const editor = useEditorStore.getState();
      editor.reset();
      editor.setVideoUri(uri);
      editor.setVideoMetadata({
        width: probed?.width || 1920,
        height: probed?.height || 1080,
        duration: probed?.duration || lastDurationRef.current,
        name: filePath.split("/").pop() ?? "capture.mp4",
      });
      if (finalTimer.startVideoTime !== null) {
        editor.setStartTime(finalTimer.startVideoTime);
        editor.setCapturedMarks(createCapturedMarks(finalTimer.marks));
      }
      router.replace("/editor");
    },
    [router, t],
  );
  // The recorder's callbacks are bound once at startRecording; route them
  // through a ref so they always see the latest closure.
  const finishCaptureRef = useRef(finishCapture);
  finishCaptureRef.current = finishCapture;

  const handleRecordingError = useCallback(
    async (error: Error) => {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      clockRef.current.stop();
      setAutoStopDeadline(null);
      if (cancelledRef.current) return;
      // An interrupted recording often still leaves a playable file. If so,
      // keep the race: open the editor with the footage and the marks so far.
      let filePath: string | null = null;
      try {
        filePath = recorder?.filePath || null;
      } catch {
        filePath = null;
      }
      const playable = filePath ? await probeVideo(toFileUri(filePath)) : null;
      if (filePath && playable) {
        await alertAsync(
          t("capture.recordingError"),
          t("capture.recordingSalvaged"),
          t("common.close"),
        );
        await finishCaptureRef.current(filePath, "stopped");
        return;
      }
      // Nothing usable: back to a fresh preview so the next recording can be timed.
      timerRef.current = initialCaptureTimerState;
      dispatch({ type: "reset" });
      setPhase("preview");
      Alert.alert(t("capture.recordingError"), error.message);
    },
    [t],
  );
  const handleRecordingErrorRef = useRef(handleRecordingError);
  handleRecordingErrorRef.current = handleRecordingError;

  const startRecording = useCallback(async () => {
    // startingRef: a second tap while createRecorder is pending must not start
    // a second recording (recorderRef is only set once it resolves).
    if (phase !== "preview" || recorderRef.current || startingRef.current) return;
    startingRef.current = true;
    try {
      cancelledRef.current = false;
      stopRequestedRef.current = false;
      // Each recording is timed from scratch.
      timerRef.current = initialCaptureTimerState;
      dispatch({ type: "reset" });
      // Fixed for the whole file when it starts.
      videoOutput.outputOrientation = pickRecordOrientation(
        interfaceOrientationRef.current?.currentOrientation,
        expoLandscapeRef.current,
      );
      const recorder = await videoOutput.createRecorder({
        maxDuration: MAX_RECORDING_MINUTES * 60,
      });
      recorderRef.current = recorder;
      await recorder.startRecording(
        (filePath, reason) => {
          finishCaptureRef.current(filePath, reason).catch(() => {});
        },
        (error) => {
          handleRecordingErrorRef.current(error).catch(() => {});
        },
      );
      clockRef.current.start(performance.now());
      setPhase("recording");
    } catch (e) {
      recorderRef.current = null;
      Alert.alert(t("capture.recordStartFailed"), e instanceof Error ? e.message : "");
    } finally {
      startingRef.current = false;
    }
  }, [phase, videoOutput, t]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || stopRequestedRef.current) return;
    stopRequestedRef.current = true;
    setAutoStopDeadline(null);
    lastDurationRef.current = recorder.recordedDuration;
    try {
      await recorder.stopRecording();
    } catch (e) {
      stopRequestedRef.current = false;
      Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
    }
  }, [t]);

  const handleClose = useCallback(async () => {
    // A recording that is still starting has no UI to stop it yet — wait.
    if (startingRef.current) return;
    if (phase === "recording" && recorderRef.current) {
      closingRef.current = true;
      const discard = await confirmAsync(
        t("capture.discardTitle"),
        t("capture.discardMessage"),
        t("capture.discard"),
        t("common.cancel"),
      );
      closingRef.current = false;
      if (!discard) return;
      cancelledRef.current = true;
      // The recording may have finished while the dialog was open; then
      // finishCapture sees cancelledRef and deletes the file instead.
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder) await recorder.cancelRecording().catch(() => {});
    }
    router.back();
  }, [phase, router, t]);

  // --- Measuring ------------------------------------------------------------

  const measure = useCallback(
    (type: "start" | "lap" | "stop") => {
      const videoTime = getVideoTime();
      if (videoTime === null) return;
      const action = { type, videoTime } as const;
      const next = captureTimerReducer(timerRef.current, action);
      if (next === timerRef.current) return; // rejected (e.g. same instant as the last press)
      timerRef.current = next; // a second release before re-render must see this press
      dispatch(action);
      if (next.status === "stopped") setAutoStopDeadline(Date.now() + AUTO_STOP_AFTER_MS);
    },
    [getVideoTime],
  );

  // --- Auto-stop after STOP --------------------------------------------------

  // Via a ref so the countdown interval depends on the deadline only — a
  // re-created stopRecording must not restart it (and re-render in a loop).
  const stopRecordingRef = useRef(stopRecording);
  stopRecordingRef.current = stopRecording;
  useEffect(() => {
    if (autoStopDeadline === null) return;
    setNow(Date.now());
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= autoStopDeadline && !closingRef.current) stopRecordingRef.current();
    }, 250);
    return () => clearInterval(id);
  }, [autoStopDeadline]);

  const autoStopRemainingSec =
    autoStopDeadline === null ? null : Math.max(0, Math.ceil((autoStopDeadline - now) / 1000));
  const autoStopWarning =
    autoStopRemainingSec !== null && autoStopRemainingSec <= AUTO_STOP_WARNING_SEC;

  // Pulse the stop-recording button once timing is done, so a still-running
  // recording is hard to miss.
  const pulse = useRef(new Animated.Value(1)).current;
  const shouldPulse = phase === "recording" && timer.status === "stopped";
  useEffect(() => {
    if (!shouldPulse) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shouldPulse, pulse]);

  const handleCameraStarted = useCallback(() => setCameraReady(true), []);
  const handleCameraStopped = useCallback(() => setCameraReady(false), []);
  const handleCameraError = useCallback((error: Error) => {
    console.warn("[capture] camera error", error);
  }, []);

  // --- Render ---------------------------------------------------------------

  if (!cameraPermission.hasPermission) {
    return (
      <View style={[styles.root, styles.centered]}>
        <StatusBar hidden />
        <Ionicons name="videocam-off-outline" size={40} color={colors.white} />
        <Text style={styles.permissionTitle}>{t("capture.cameraPermissionTitle")}</Text>
        <Text style={styles.permissionDesc}>{t("capture.cameraPermissionDesc")}</Text>
        <View style={styles.permissionActions}>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>{t("common.back")}</Text>
          </Pressable>
          <Pressable
            style={styles.primaryBtn}
            onPress={() =>
              cameraPermission.canRequestPermission
                ? cameraPermission.requestPermission()
                : Linking.openSettings()
            }
          >
            <Text style={styles.primaryBtnText}>
              {cameraPermission.canRequestPermission
                ? t("capture.grantPermission")
                : t("capture.openSettings")}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isRecording = phase === "recording";
  const micDenied = !micPermission.hasPermission && !micPermission.canRequestPermission;

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {cameraMounted && (
        <Camera
          style={StyleSheet.absoluteFill}
          device="back"
          isActive={appActive && phase !== "finishing"}
          outputs={outputs}
          constraints={constraints}
          // We set the video output's orientation ourselves (see above).
          orientationSource="custom"
          enableNativeZoomGesture
          enableNativeTapToFocusGesture
          enableSmoothAutoFocus
          onStarted={handleCameraStarted}
          onStopped={handleCameraStopped}
          onError={handleCameraError}
        />
      )}

      {/* Top bar: close · REC clock */}
      <View
        style={[
          styles.topBar,
          { top: insets.top + 12, left: insets.left + 16, right: insets.right + 16 },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.iconBtn}
          onPress={handleClose}
          disabled={phase === "finishing"}
          accessibilityLabel={t("common.close")}
          testID="capture-close"
        >
          <Ionicons name="close" size={24} color={colors.white} />
        </Pressable>

        <View style={styles.topCenter} pointerEvents="none">
          {isRecording && <RecTimeBadge getVideoTime={getVideoTime} />}
          {micDenied && <Text style={styles.micDenied}>{t("capture.micDenied")}</Text>}
        </View>

        {/* keeps the REC clock centred */}
        <View style={styles.iconSpacer} />
      </View>

      {/* "Stop the recording" reminder + auto-stop countdown after STOP */}
      {isRecording && autoStopRemainingSec !== null && (
        <View
          style={[
            styles.reminder,
            autoStopWarning && styles.reminderWarning,
            { top: insets.top + 64 },
          ]}
          testID="capture-autostop-banner"
        >
          <Text style={styles.reminderText}>
            {autoStopWarning
              ? t("capture.autoStopSoon", { seconds: autoStopRemainingSec })
              : `${t("capture.stopReminder")} · ${t("capture.autoStopIn", {
                  seconds: autoStopRemainingSec,
                })}`}
          </Text>
          {autoStopWarning && (
            <Pressable
              style={styles.extendBtn}
              onPress={() => setAutoStopDeadline(Date.now() + AUTO_STOP_AFTER_MS)}
              testID="capture-extend"
            >
              <Text style={styles.extendBtnText}>{t("capture.extend")}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Record / stop-recording button (top-right, above the stopwatch stack) */}
      <View
        style={[styles.recordColumn, { top: insets.top + 64, right: insets.right + 20 }]}
        pointerEvents="box-none"
      >
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Pressable
            style={styles.recordOuter}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={phase === "finishing" || (!isRecording && (!cameraReady || isPortrait))}
            accessibilityLabel={isRecording ? "stop recording" : "start recording"}
            testID="capture-record"
          >
            <View style={isRecording ? styles.recordInnerStop : styles.recordInner} />
          </Pressable>
        </Animated.View>
      </View>

      {/* Stopwatch (bottom-right) */}
      <View
        style={[styles.stopwatch, { right: insets.right + 16, bottom: insets.bottom + 16 }]}
        pointerEvents="none"
      >
        <LiveStopwatch timer={timer} getVideoTime={getVideoTime} />
      </View>

      {/* Measure buttons (bottom-left): START → LAP + STOP. Record on release. */}
      <View
        style={[styles.measure, { left: insets.left + 16, bottom: insets.bottom + 16 }]}
        pointerEvents="box-none"
      >
        {timer.status === "ready" && (
          <>
            {!isRecording && <Text style={styles.hint}>{t("capture.recordFirst")}</Text>}
            <MeasureButton
              label={t("capture.start")}
              color="#16A34A"
              disabled={!isRecording}
              onRelease={() => measure("start")}
              style={styles.startBtn}
              testID="capture-start"
            />
          </>
        )}
        {timer.status === "running" && (
          <View style={styles.measureRow}>
            <MeasureButton
              label={t("capture.lap")}
              color={colors.primary}
              disabled={!isRecording}
              onRelease={() => measure("lap")}
              testID="capture-lap"
            />
            <MeasureButton
              label={t("capture.stop")}
              color={colors.destructive}
              disabled={!isRecording}
              onRelease={() => measure("stop")}
              testID="capture-stop"
            />
          </View>
        )}
      </View>

      {orientationLocked && isPortrait && (
        <View
          style={[styles.rotatePrompt, !isRecording && styles.rotatePromptBlocking]}
          pointerEvents={isRecording ? "none" : "auto"}
          testID="capture-rotate-prompt"
        >
          <Ionicons
            name="phone-landscape-outline"
            size={isRecording ? 20 : 40}
            color={colors.white}
          />
          <Text style={styles.rotateTitle}>{t("capture.rotateTitle")}</Text>
          {!isRecording && <Text style={styles.rotateDesc}>{t("capture.rotateDesc")}</Text>}
          {!isRecording && (
            <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
              <Text style={styles.secondaryBtnText}>{t("common.back")}</Text>
            </Pressable>
          )}
        </View>
      )}

      {phase === "finishing" && (
        <View style={[StyleSheet.absoluteFill, styles.finishing]}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.finishingText}>{t("capture.preparing")}</Text>
        </View>
      )}
    </View>
  );
}

/** "● REC 01:23" — elapsed recording time, ticking from the recorder clock. */
function RecTimeBadge({ getVideoTime }: { getVideoTime: () => number | null }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds(Math.floor(getVideoTime() ?? 0)), 250);
    return () => clearInterval(id);
  }, [getVideoTime]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <View style={styles.recClock}>
      <View style={styles.recDot} />
      <Text style={styles.recText}>
        REC {mm}:{ss}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.white,
  },
  permissionDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  permissionActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: "700",
  },
  secondaryBtn: {
    borderColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: colors.white,
    fontWeight: "600",
  },
  topBar: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  topCenter: {
    alignItems: "center",
    gap: 6,
  },
  micDenied: {
    fontSize: 12,
    color: colors.white,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  recClock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  recText: {
    color: colors.white,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  iconSpacer: {
    width: 44,
  },
  reminder: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  reminderWarning: {
    backgroundColor: "rgba(220,38,38,0.92)",
  },
  reminderText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  extendBtn: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  extendBtnText: {
    color: colors.destructive,
    fontWeight: "800",
  },
  recordColumn: {
    position: "absolute",
  },
  recordOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  recordInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#EF4444",
  },
  recordInnerStop: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#EF4444",
  },
  stopwatch: {
    position: "absolute",
  },
  measure: {
    position: "absolute",
    alignItems: "flex-start",
    gap: 10,
  },
  measureRow: {
    flexDirection: "row",
    gap: 16,
  },
  startBtn: {
    minWidth: 180,
  },
  hint: {
    fontSize: 12,
    color: colors.white,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  // Recording in progress: a small non-blocking banner (blocking the controls
  // mid-race would lose laps). Not recording: a full-screen block.
  rotatePrompt: {
    position: "absolute",
    top: 72,
    alignSelf: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(220,38,38,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rotatePromptBlocking: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 0,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    padding: 24,
  },
  rotateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.white,
  },
  rotateDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  finishing: {
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  finishingText: {
    color: colors.white,
    fontWeight: "600",
  },
});
