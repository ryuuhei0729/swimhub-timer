import React, { useState } from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";
import { useAppleAuth } from "../../hooks/useAppleAuth";
import { GoogleLoginButton } from "../../components/auth/GoogleLoginButton";
import { AppleLoginButton } from "../../components/auth/AppleLoginButton";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

export default function GetStartedScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    signInWithGoogle,
    loading: googleLoading,
    error: googleError,
    clearError: clearGoogleError,
  } = useGoogleAuth();
  const {
    signInWithApple,
    loading: appleLoading,
    error: appleError,
    clearError: clearAppleError,
    isAvailable: isAppleAvailable,
  } = useAppleAuth();
  const [error, setError] = useState<string | null>(null);

  const isLoading = googleLoading || appleLoading;
  const displayError = error || googleError || appleError;

  const handleGoogleSignup = async () => {
    setError(null);
    clearGoogleError();
    clearAppleError();
    await signInWithGoogle();
  };

  const handleAppleSignup = async () => {
    setError(null);
    clearGoogleError();
    clearAppleError();
    await signInWithApple();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t("auth.getStarted.title")}</Text>
          <Text style={styles.subtitle}>{t("auth.getStarted.subtitle")}</Text>
        </View>

        {displayError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          {isAppleAvailable && (
            <AppleLoginButton
              onPress={handleAppleSignup}
              loading={appleLoading}
              disabled={isLoading}
              label={t("auth.getStarted.withApple")}
            />
          )}

          <GoogleLoginButton
            onPress={handleGoogleSignup}
            loading={googleLoading}
            disabled={isLoading}
            label={t("auth.getStarted.withGoogle")}
          />

          <Pressable
            style={({ pressed }) => [
              styles.emailButton,
              isLoading && styles.buttonDisabled,
              pressed && !isLoading && styles.emailButtonPressed,
            ]}
            onPress={() => {
              setError(null);
              clearGoogleError();
              clearAppleError();
              router.push("/(auth)/email-signup");
            }}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={t("auth.getStarted.withEmail")}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
              <Text style={styles.emailButtonText}>{t("auth.getStarted.withEmail")}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.legalContainer}>
        <Text style={styles.legalText}>
          {(() => {
            const full = t("auth.termsAgree");
            const terms = t("auth.terms");
            const privacy = t("privacy.title");
            const tokens = [
              { text: terms, url: "https://timer.swim-hub.app/terms" },
              { text: privacy, url: "https://timer.swim-hub.app/privacy" },
            ];
            const result: React.ReactNode[] = [];
            let remaining = full;
            let key = 0;
            while (remaining.length > 0) {
              let earliest = -1;
              let matched: (typeof tokens)[number] | null = null;
              for (const token of tokens) {
                const idx = remaining.indexOf(token.text);
                if (idx !== -1 && (earliest === -1 || idx < earliest)) {
                  earliest = idx;
                  matched = token;
                }
              }
              if (matched === null || earliest === -1) {
                result.push(remaining);
                break;
              }
              if (earliest > 0) {
                result.push(remaining.slice(0, earliest));
              }
              result.push(
                <Text
                  key={key++}
                  style={styles.legalLink}
                  onPress={() => Linking.openURL(matched!.url)}
                >
                  {matched.text}
                </Text>,
              );
              remaining = remaining.slice(earliest + matched.text.length);
            }
            return result;
          })()}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.destructive,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  buttonGroup: {
    gap: spacing.md,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emailButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  emailButtonPressed: {
    backgroundColor: "#1D4ED8",
  },
  emailButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  legalContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  legalText: {
    fontSize: fontSize.xs,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
  legalLink: {
    color: colors.primary,
    fontWeight: "500",
  },
});
