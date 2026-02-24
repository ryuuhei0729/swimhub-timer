import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthProvider";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

export default function AccountScreen() {
  const { t } = useTranslation();
  const { user, plan, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(t("auth.logout"), t("auth.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.logout"),
        style: "destructive",
        onPress: async () => {
          const { error } = await signOut();
          if (error) {
            Alert.alert(t("common.error"), t("auth.errors.logoutFailed"));
          }
        },
      },
    ]);
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        {/* User info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("auth.accountInfo")}</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("auth.email")}</Text>
              <Text style={styles.infoValue}>{user?.email || "—"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("auth.plan")}</Text>
              <View
                style={[
                  styles.badge,
                  plan === "premium" ? styles.premiumBadge : styles.freeBadge,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    plan === "premium"
                      ? styles.premiumBadgeText
                      : styles.freeBadgeText,
                  ]}
                >
                  {plan === "premium"
                    ? t("auth.planPremium")
                    : t("auth.planFree")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>{t("auth.logout")}</Text>
          </TouchableOpacity>
        </View>

        {/* App info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t("common.appName")} v{appVersion}
          </Text>
        </View>
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
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.muted,
  },
  infoValue: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  freeBadge: {
    backgroundColor: colors.surfaceRaised,
  },
  premiumBadge: {
    backgroundColor: "#FEF3C7",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  freeBadgeText: {
    color: colors.muted,
  },
  premiumBadgeText: {
    color: "#92400E",
  },
  signOutButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  signOutButtonText: {
    color: colors.destructive,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: "auto",
    paddingBottom: spacing.lg,
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.muted,
  },
});
