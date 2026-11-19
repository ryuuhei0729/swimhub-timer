import { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Text, Platform } from "react-native";
import { useRouter } from "expo-router";
import { formatTime } from "@swimhub-timer/shared";
import { useTranslation } from "react-i18next";
import { VideoPlayer } from "../../components/video/VideoPlayer";
import { SignalDetector } from "../../components/audio/SignalDetector";
import { SplitsPanel } from "../../components/splits/SplitsPanel";
import { MarkAssignPanel } from "../../components/splits/MarkAssignPanel";
import { AddMarkAtPlayheadBar } from "../../components/splits/AddMarkAtPlayheadBar";
import { StepBanner, type EditorStep } from "../../components/ui/StepBanner";
import { useEditorStore } from "../../stores/editor-store";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

export default function EditorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const startTime = useEditorStore((s) => s.startTime);
  const isFinished = useEditorStore((s) => s.isFinished);
  const setDesignConfirmed = useEditorStore((s) => s.setDesignConfirmed);
  // Strict two-step flow (no tabs): set the start, then enter splits. Camera
  // captures arrive with the start already set, so they open on step 2.
  const [step, setStep] = useState<EditorStep>(() =>
    useEditorStore.getState().startTime !== null ? "splits" : "start",
  );
  // Set when step 1 is re-entered from step 2 to fix an already-confirmed
  // start: SignalDetector opens straight in "Change" mode and cancelling
  // returns to step 2.
  const [revisingStart, setRevisingStart] = useState(false);
  // Both entry points (camera / imported video) build splits the same way:
  // times (captured, or added at the playhead) get distances in the
  // assignment panel. Once confirmed, SplitsPanel shows the result.
  const showMarkAssign = !isFinished;

  // Design is locked to minimal-white and edited inline on the video, so the
  // legacy designConfirmed gate auto-passes once the start time is set.
  useEffect(() => {
    setDesignConfirmed(startTime !== null);
  }, [startTime, setDesignConfirmed]);

  const goToSplits = useCallback(() => {
    setRevisingStart(false);
    setStep("splits");
  }, []);

  const goBackToStart = useCallback(() => {
    setRevisingStart(true);
    setStep("start");
  }, []);

  const showExport = step === "splits" && isFinished;

  return (
    <View style={styles.container}>
      {/* Video Preview (top half) */}
      <View style={styles.videoSection}>
        <VideoPlayer />
      </View>

      {/* Which step we're on and what to do now (not tappable tabs) */}
      <StepBanner
        step={step}
        finished={isFinished}
        startLabel={startTime !== null ? formatTime(startTime) : null}
        // A confirmed result is reopened via its own "Edit" first.
        onEditStart={isFinished ? undefined : goBackToStart}
      />

      {/* Tab Content (bottom half).
          ScrollView uses automaticallyAdjustKeyboardInsets so iOS pads the
          content inset by the keyboard height and auto-scrolls the focused
          TextInput into view. Android relies on the manifest's
          windowSoftInputMode=adjustResize. */}
      {step === "start" ? (
        // Scrollable so the confirm button stays reachable on short screens
        // (the 16:9 video section leaves little room below the tab bar).
        <ScrollView style={styles.tabContent}>
          <SignalDetector
            key={revisingStart ? "revise" : "initial"}
            startInChangeMode={revisingStart}
            onConfirm={goToSplits}
            onCancelChange={revisingStart ? goToSplits : undefined}
          />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={[
            styles.tabContentInner,
            showMarkAssign && styles.tabContentInnerWithAddBar,
          ]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          keyboardDismissMode="interactive"
        >
          {showMarkAssign ? <MarkAssignPanel /> : <SplitsPanel />}
        </ScrollView>
      )}

      {/* Bottom action bar */}
      {/* Always reachable while assigning captured times (pinned, not in the scroll). */}
      {step === "splits" && showMarkAssign && <AddMarkAtPlayheadBar />}

      {showExport && (
        <View style={styles.exportBar}>
          <Pressable
            style={({ pressed }) => [styles.exportBtn, pressed && styles.exportBtnPressed]}
            onPress={() => router.push("/export")}
          >
            <Text style={styles.exportBtnText}>{t("common.export")}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  videoSection: {
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    paddingBottom: 100,
  },
  // Room for the taller pinned AddMarkAtPlayheadBar (seek row + add button).
  tabContentInnerWithAddBar: {
    paddingBottom: 170,
  },
  exportBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exportBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  exportBtnPressed: {
    opacity: 0.85,
  },
  exportBtnText: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.white,
  },
});
