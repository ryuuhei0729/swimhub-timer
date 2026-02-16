import { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoPlayer } from "../components/video/VideoPlayer";
import { SignalDetector } from "../components/audio/SignalDetector";
import { StopwatchDesigner } from "../components/stopwatch/StopwatchDesigner";
import { SplitsPanel } from "../components/splits/SplitsPanel";
import { TabBar } from "../components/ui/TabBar";
import { useEditorStore } from "../stores/editor-store";
import { colors, spacing, radius, fontSize } from "../lib/theme";

const TABS = [
  {
    key: "signal",
    label: "信号",
    icon: ({ color, size }: { color: string; size: number }) => (
      <Ionicons name="radio-outline" size={size} color={color} />
    ),
  },
  {
    key: "design",
    label: "デザイン",
    icon: ({ color, size }: { color: string; size: number }) => (
      <Ionicons name="color-palette-outline" size={size} color={color} />
    ),
  },
  {
    key: "splits",
    label: "スプリット",
    icon: ({ color, size }: { color: string; size: number }) => (
      <Ionicons name="timer-outline" size={size} color={color} />
    ),
  },
];

export default function EditorScreen() {
  const router = useRouter();
  const startTime = useEditorStore((s) => s.startTime);
  const [activeTab, setActiveTab] = useState("signal");

  return (
    <View style={styles.container}>
      {/* Video Preview (top half) */}
      <View style={styles.videoSection}>
        <VideoPlayer />
      </View>

      {/* Tab Bar */}
      <TabBar tabs={TABS} activeKey={activeTab} onSelect={setActiveTab} />

      {/* Tab Content (bottom half) */}
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tabContentInner}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "signal" && <SignalDetector />}
        {activeTab === "design" && <StopwatchDesigner />}
        {activeTab === "splits" && <SplitsPanel />}
      </ScrollView>

      {/* Export button */}
      {startTime !== null && (
        <View style={styles.exportBar}>
          <Pressable
            style={({ pressed }) => [
              styles.exportBtn,
              pressed && styles.exportBtnPressed,
            ]}
            onPress={() => router.push("/export")}
          >
            <Text style={styles.exportBtnText}>書き出し</Text>
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
