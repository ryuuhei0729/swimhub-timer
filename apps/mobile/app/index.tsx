import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEditorStore } from "../stores/editor-store";
import { colors, spacing, radius, fontSize } from "../lib/theme";

export default function ImportScreen() {
  const router = useRouter();
  const { setVideoUri, setVideoMetadata } = useEditorStore();
  const [loading, setLoading] = useState(false);

  const pickVideo = async () => {
    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 1,
        videoMaxDuration: 600,
      });

      if (result.canceled || !result.assets?.[0]) {
        setLoading(false);
        return;
      }

      const asset = result.assets[0];
      setVideoUri(asset.uri);
      setVideoMetadata({
        width: asset.width ?? 0,
        height: asset.height ?? 0,
        duration: (asset.duration ?? 0) / 1000,
        name: asset.fileName ?? "video",
      });
      router.push("/editor");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to pick video"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SplitSync</Text>
        <Text style={styles.subtitle}>
          水泳レース動画にストップウォッチオーバーレイを追加
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="videocam-outline" size={26} color={colors.muted} />
        </View>
        <Text style={styles.cardTitle}>動画を選択</Text>
        <Text style={styles.cardDescription}>
          フォトライブラリから水泳レースの動画を選んでください
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={pickVideo}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "読み込み中..." : "動画を選択"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.steps}>
        {["動画取り込み", "検出 & デザイン", "書き出し"].map((label, i) => (
          <View key={label} style={styles.stepRow}>
            <View
              style={[
                styles.stepDot,
                i === 0 && styles.stepDotActive,
              ]}
            >
              <Text style={[styles.stepNumber, i === 0 && styles.stepNumberActive]}>
                {i + 1}
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                i === 0 && styles.stepLabelActive,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    width: "100%",
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  steps: {
    marginTop: 40,
    gap: spacing.lg,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  stepNumber: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.muted,
  },
  stepNumberActive: {
    color: colors.primary,
  },
  stepLabel: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: "600",
  },
});
