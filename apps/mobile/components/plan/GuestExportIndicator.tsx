import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { colors, spacing, radius, fontSize } from "../../lib/theme";
import type { UserPlan } from "@swimhub-timer/shared";

export type GuestExportIndicatorProps = {
  plan: UserPlan;
  remaining: number | null;
  onActionPress: () => void;
};

export function GuestExportIndicator({ plan, remaining, onActionPress }: GuestExportIndicatorProps) {
  const { t } = useTranslation();
  const router = useRouter();

  if (plan === "premium") {
    return null;
  }

  if (plan === "free") {
    return (
      <Pressable
        style={styles.upsellBanner}
        onPress={() => router.push("/(app)/paywall")}
        accessibilityRole="button"
        accessibilityLabel={t("guestExportIndicator.upsellLabel")}
      >
        <Feather name="zap" size={14} color="#92400E" />
        <Text style={styles.upsellText}>{t("guestExportIndicator.upsellText")}</Text>
        <Feather name="chevron-right" size={14} color="#92400E" />
      </Pressable>
    );
  }

  // plan === "guest" — daily export limit for guests is 1
  const GUEST_DAILY_EXPORT_LIMIT = 1;
  const progressRatio = remaining !== null ? Math.min(remaining / GUEST_DAILY_EXPORT_LIMIT, 1) : 0;

  return (
    <View style={styles.guestContainer}>
      <View style={styles.guestRow}>
        <Text style={styles.guestRemainingText}>
          {t("guestExportIndicator.remainingCount", { remaining: remaining ?? 0 })}
        </Text>
        <Pressable
          style={styles.registerLink}
          onPress={onActionPress}
          accessibilityRole="link"
          accessibilityLabel={t("guestExportIndicator.registerLabel")}
        >
          <Text style={styles.registerLinkText}>{t("guestExportIndicator.register")}</Text>
          <Feather name="arrow-right" size={12} color={colors.primary} />
        </Pressable>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressRatio * 100}%`,
              backgroundColor: remaining === 0 ? "#F59E0B" : colors.primary,
            },
          ]}
        />
      </View>
      {remaining === 0 && (
        <Text style={styles.limitReachedText}>{t("guestExportIndicator.limitReached")}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  guestContainer: {
    gap: spacing.sm,
  },
  guestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guestRemainingText: {
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  registerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  registerLinkText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: "600",
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  limitReachedText: {
    fontSize: fontSize.xs,
    color: "#F59E0B",
  },
  upsellBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#FEF3C7",
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  upsellText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: "#92400E",
    fontWeight: "500",
  },
});
