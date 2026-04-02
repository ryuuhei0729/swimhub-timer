import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editor-store";
import { useAuth } from "../../contexts/AuthProvider";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

export default function ImportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setVideoUri, setVideoMetadata, reset } = useEditorStore();
  const { user } = useAuth();
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
      reset();
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
        t("common.error"),
        error instanceof Error ? error.message : t("import.failedToPick"),
      );
    } finally {
      setLoading(false);
    }
  };

  const steps = [t("import.stepImport"), t("import.stepDetect"), t("import.stepExport")];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require("../../assets/icon.png")} style={styles.appIcon} />
        <Text style={styles.title}>{t("common.appName")}</Text>
        <Text style={styles.subtitle}>{t("import.subtitle")}</Text>

        {/* Auth action bar */}
        {user ? (
          <Pressable
            style={styles.accountChip}
            onPress={() => router.push("/account")}
          >
            <Ionicons name="person-circle" size={18} color={colors.primary} />
            <Text style={styles.accountChipText}>{t("auth.account")}</Text>
          </Pressable>
        ) : (
          <View style={styles.guestBar}>
            <Text style={styles.guestLabel}>{t("auth.guestMode")}</Text>
            <Pressable
              style={styles.loginChip}
              onPress={() => router.push("/(auth)/login-method")}
            >
              <Text style={styles.loginChipText}>{t("auth.login")}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.white} />
            </Pressable>
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
          loading && styles.cardDisabled,
        ]}
        onPress={pickVideo}
        disabled={loading}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="videocam-outline" size={26} color={colors.muted} />
        </View>
        <Text style={styles.cardDescription}>{t("import.selectVideoDesc")}</Text>

        <View style={styles.button}>
          <Text style={styles.buttonText}>
            {loading ? t("import.loading") : t("import.selectVideo")}
          </Text>
        </View>
      </Pressable>

      <View style={styles.steps}>
        {steps.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepDot, i === 0 && styles.stepDotActive]}>
              <Text style={[styles.stepNumber, i === 0 && styles.stepNumberActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i === 0 && styles.stepLabelActive]}>{label}</Text>
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
    width: "100%",
  },
  appIcon: {
    width: 180,
    height: 180,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  accountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  accountChipText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  guestBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.lg,
  },
  guestLabel: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontWeight: "500",
  },
  loginChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  loginChipText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.white,
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
    padding: spacing.xl,
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardDisabled: {
    opacity: 0.5,
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
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
    gap: spacing.xl,
  },
  stepItem: {
    alignItems: "center",
    gap: spacing.sm,
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
