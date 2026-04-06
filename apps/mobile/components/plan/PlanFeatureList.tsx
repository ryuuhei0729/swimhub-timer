import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, fontSize } from "../../lib/theme";
import type { UserPlan } from "@swimhub-timer/shared";

export type PlanFeatureListProps = {
  currentPlan: UserPlan;
};

type FeatureItem = {
  labelKey: string;
  guestValue: string;
  freeValue: string;
  premiumValue: string;
  guestHighlight: boolean;
  freeHighlight: boolean;
  premiumHighlight: boolean;
};

const FEATURES: FeatureItem[] = [
  {
    labelKey: "planFeature.export",
    guestValue: "planFeature.exportGuestValue",
    freeValue: "planFeature.exportFreeValue",
    premiumValue: "planFeature.exportPremiumValue",
    guestHighlight: false,
    freeHighlight: true,
    premiumHighlight: true,
  },
  {
    labelKey: "planFeature.resolution",
    guestValue: "planFeature.resolutionGuestValue",
    freeValue: "planFeature.resolutionFreeValue",
    premiumValue: "planFeature.resolutionPremiumValue",
    guestHighlight: false,
    freeHighlight: false,
    premiumHighlight: true,
  },
  {
    labelKey: "planFeature.splits",
    guestValue: "planFeature.splitsGuestValue",
    freeValue: "planFeature.splitsFreeValue",
    premiumValue: "planFeature.splitsPremiumValue",
    guestHighlight: false,
    freeHighlight: true,
    premiumHighlight: true,
  },
  {
    labelKey: "planFeature.watermark",
    guestValue: "planFeature.watermarkGuestValue",
    freeValue: "planFeature.watermarkFreeValue",
    premiumValue: "planFeature.watermarkPremiumValue",
    guestHighlight: false,
    freeHighlight: false,
    premiumHighlight: true,
  },
  {
    labelKey: "planFeature.ads",
    guestValue: "planFeature.adsGuestValue",
    freeValue: "planFeature.adsFreeValue",
    premiumValue: "planFeature.adsPremiumValue",
    guestHighlight: false,
    freeHighlight: false,
    premiumHighlight: true,
  },
];

function getValueKey(feature: FeatureItem, plan: UserPlan): string {
  if (plan === "guest") return feature.guestValue;
  if (plan === "free") return feature.freeValue;
  return feature.premiumValue;
}

function isHighlighted(feature: FeatureItem, plan: UserPlan): boolean {
  if (plan === "guest") return feature.guestHighlight;
  if (plan === "free") return feature.freeHighlight;
  return feature.premiumHighlight;
}

export function PlanFeatureList({ currentPlan }: PlanFeatureListProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t("planFeature.title")}</Text>
      <View style={styles.list}>
        {FEATURES.map((feature) => {
          const highlighted = isHighlighted(feature, currentPlan);
          const valueKey = getValueKey(feature, currentPlan);
          return (
            <View key={feature.labelKey} style={styles.featureRow}>
              <Feather
                name={highlighted ? "check-circle" : "circle"}
                size={16}
                color={highlighted ? colors.success : colors.borderLight}
              />
              <View style={styles.featureContent}>
                <Text style={styles.featureLabel}>{t(feature.labelKey)}</Text>
                <Text
                  style={[
                    styles.featureValue,
                    highlighted && styles.featureValueHighlighted,
                  ]}
                >
                  {t(valueKey)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  featureContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featureLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  featureValue: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  featureValueHighlighted: {
    color: colors.success,
    fontWeight: "600",
  },
});
