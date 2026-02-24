import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";
import { useAppleAuth } from "../../hooks/useAppleAuth";
import { useEmailAuth } from "../../hooks/useEmailAuth";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

export default function LoginScreen() {
  const { t } = useTranslation();
  const {
    signInWithGoogle,
    loading: googleLoading,
    error: googleError,
  } = useGoogleAuth();
  const {
    signInWithApple,
    loading: appleLoading,
    error: appleError,
    isAvailable: appleAvailable,
  } = useAppleAuth();
  const {
    signInWithEmail,
    signUpWithEmail,
    loading: emailLoading,
    error: emailError,
    clearError: clearEmailError,
  } = useEmailAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isLoading = googleLoading || appleLoading || emailLoading;
  const error = googleError || appleError || emailError || localError;

  const openTerms = () => {
    WebBrowser.openBrowserAsync("https://timer.swim-hub.app/terms");
  };

  const openPrivacy = () => {
    WebBrowser.openBrowserAsync("https://timer.swim-hub.app/privacy");
  };

  const handleEmailSubmit = async () => {
    if (password.length < 6) {
      setLocalError(t("auth.errors.passwordTooShort"));
      return;
    }
    setLocalError(null);
    setConfirmationSent(false);
    if (isSignUp) {
      const success = await signUpWithEmail(email, password);
      if (success) {
        setConfirmationSent(true);
      }
    } else {
      await signInWithEmail(email, password);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setLocalError(null);
    clearEmailError();
    setConfirmationSent(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="stopwatch-outline"
                size={40}
                color={colors.primary}
              />
            </View>
            <Text style={styles.title}>{t("common.appName")}</Text>
            <Text style={styles.subtitle}>{t("import.subtitle")}</Text>
          </View>

          <View style={styles.buttonContainer}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {confirmationSent && (
              <View style={styles.confirmationContainer}>
                <Text style={styles.confirmationText}>
                  {t("auth.confirmationSent")}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, styles.googleButton]}
              onPress={() => signInWithGoogle()}
              disabled={isLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#374151" />
              ) : (
                <Text style={styles.googleButtonText}>
                  {t("auth.loginWith.google")}
                </Text>
              )}
            </TouchableOpacity>

            {appleAvailable && (
              <TouchableOpacity
                style={[styles.button, styles.appleButton]}
                onPress={() => signInWithApple()}
                disabled={isLoading}
              >
                {appleLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.appleButtonText}>
                    {t("auth.loginWith.apple")}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("auth.or")}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.emailPlaceholder")}
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.button, styles.emailButton]}
              onPress={handleEmailSubmit}
              disabled={isLoading || !email || !password}
            >
              {emailLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.emailButtonText}>
                  {isSignUp ? t("auth.signUp") : t("auth.signIn")}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleMode}>
              <Text style={styles.switchText}>
                {isSignUp
                  ? t("auth.switchToSignIn")
                  : t("auth.switchToSignUp")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {(() => {
                const full = t("auth.termsAgree");
                const terms = t("auth.terms");
                const privacy = t("privacy.title");
                const parts = full.split(new RegExp(`(${terms}|${privacy})`));
                return parts.map((part, i) => {
                  if (part === terms) {
                    return (
                      <Text key={i} style={styles.link} onPress={openTerms}>
                        {terms}
                      </Text>
                    );
                  }
                  if (part === privacy) {
                    return (
                      <Text key={i} style={styles.link} onPress={openPrivacy}>
                        {privacy}
                      </Text>
                    );
                  }
                  return part;
                });
              })()}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E3A8A",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 4,
  },
  errorText: {
    color: colors.destructive,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  confirmationContainer: {
    backgroundColor: "#EFF6FF",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 4,
  },
  confirmationText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  button: {
    height: 52,
    borderRadius: radius.lg,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  googleButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  googleButtonText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: "#374151",
  },
  appleButton: {
    backgroundColor: "#000000",
  },
  appleButtonText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: "#ffffff",
  },
  emailButton: {
    backgroundColor: colors.primary,
  },
  emailButtonText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: "#ffffff",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    fontSize: fontSize.xs,
    color: "#9CA3AF",
    paddingHorizontal: 12,
  },
  input: {
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    fontSize: fontSize.md,
    color: "#1F2937",
  },
  switchText: {
    fontSize: fontSize.xs,
    color: "#9CA3AF",
    textAlign: "center",
  },
  footer: {
    marginTop: 24,
    paddingHorizontal: spacing.lg,
  },
  footerText: {
    fontSize: fontSize.xs,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
});
