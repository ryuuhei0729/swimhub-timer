import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="stopwatch-outline"
              size={40}
              color={colors.primary}
            />
          </View>
          <Text style={styles.appName}>{t("common.appName")}</Text>
          <Text style={styles.tagline}>{t("import.subtitle")}</Text>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={() => router.push("/(auth)/get-started")}
        >
          <Text style={styles.primaryButtonText}>
            {t("auth.welcome.getStarted")}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
          onPress={() => router.push("/(auth)/login-method")}
        >
          <Text style={styles.secondaryButtonText}>
            {t("auth.welcome.login")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
    gap: spacing.lg,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E3A8A",
  },
  tagline: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  bottomContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    backgroundColor: "#1D4ED8",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: "600",
  },
});
