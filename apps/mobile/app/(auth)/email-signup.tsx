import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Linking,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useEmailAuth } from "../../hooks/useEmailAuth";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

export default function EmailSignupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    signUpWithEmail,
    loading,
    error: authError,
    clearError,
  } = useEmailAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const error = localError || authError;

  const handleSubmit = async () => {
    setLocalError(null);
    clearError();
    setConfirmationSent(false);

    if (!email.trim()) {
      setLocalError(t("auth.emailPlaceholder"));
      return;
    }
    if (password.length < 6) {
      setLocalError(t("auth.errors.passwordTooShort"));
      return;
    }

    const success = await signUpWithEmail(email, password);
    if (success) {
      setConfirmationSent(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>{t("auth.emailSignup")}</Text>

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

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.email")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.passwordPlaceholder")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.passwordPlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="newPassword"
                  editable={!loading}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  loading && styles.submitButtonDisabled,
                  pressed && !loading && styles.submitButtonPressed,
                ]}
                onPress={handleSubmit}
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {t("auth.signUp")}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>
              {(() => {
                const full = t("auth.termsAgree");
                const terms = t("auth.terms");
                const privacy = t("privacy.title");
                const parts = full.split(new RegExp(`(${terms}|${privacy})`));
                return parts.map((part, i) => {
                  if (part === terms) {
                    return (
                      <Text
                        key={i}
                        style={styles.legalLink}
                        onPress={() =>
                          Linking.openURL("https://timer.swim-hub.app/terms")
                        }
                      >
                        {terms}
                      </Text>
                    );
                  }
                  if (part === privacy) {
                    return (
                      <Text
                        key={i}
                        style={styles.legalLink}
                        onPress={() =>
                          Linking.openURL("https://timer.swim-hub.app/privacy")
                        }
                      >
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.xl,
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
  confirmationContainer: {
    backgroundColor: "#EFF6FF",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  confirmationText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  form: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  input: {
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: fontSize.md,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonPressed: {
    backgroundColor: "#1D4ED8",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  legalContainer: {
    paddingVertical: spacing.xl,
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
