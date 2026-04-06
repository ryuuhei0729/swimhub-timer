import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, fontSize } from "../../lib/theme";
import type { UserPlan } from "@swimhub-timer/shared";

export type PlanComparisonTableProps = {
  currentPlan: UserPlan;
};

type FeatureRow = {
  labelKey: string;
  guest: string;
  free: string;
  premium: string;
};

const FEATURE_ROWS: FeatureRow[] = [
  {
    labelKey: "planComparison.featureExport",
    guest: "planComparison.valueExportGuest",
    free: "planComparison.valueExportFree",
    premium: "planComparison.valueExportPremium",
  },
  {
    labelKey: "planComparison.featureResolution",
    guest: "planComparison.valueResolutionGuest",
    free: "planComparison.valueResolutionFree",
    premium: "planComparison.valueResolutionPremium",
  },
  {
    labelKey: "planComparison.featureSplits",
    guest: "planComparison.valueSplitsGuest",
    free: "planComparison.valueSplitsFree",
    premium: "planComparison.valueSplitsPremium",
  },
  {
    labelKey: "planComparison.featureWatermark",
    guest: "planComparison.valueWatermarkGuest",
    free: "planComparison.valueWatermarkFree",
    premium: "planComparison.valueWatermarkPremium",
  },
  {
    labelKey: "planComparison.featureAds",
    guest: "planComparison.valueAdsGuest",
    free: "planComparison.valueAdsFree",
    premium: "planComparison.valueAdsPremium",
  },
];

const PLAN_COLUMNS: { key: UserPlan; labelKey: string }[] = [
  { key: "guest", labelKey: "planComparison.columnGuest" },
  { key: "free", labelKey: "planComparison.columnFree" },
  { key: "premium", labelKey: "planComparison.columnPremium" },
];

export function PlanComparisonTable({ currentPlan }: PlanComparisonTableProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.row}>
        <View style={styles.featureCell} />
        {PLAN_COLUMNS.map((col) => (
          <View
            key={col.key}
            style={[styles.planHeaderCell, currentPlan === col.key && styles.highlightedHeader]}
          >
            <Text
              style={[
                styles.planHeaderText,
                currentPlan === col.key && styles.highlightedHeaderText,
              ]}
            >
              {t(col.labelKey)}
            </Text>
            {currentPlan === col.key && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>{t("planComparison.currentPlan")}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Feature rows */}
      {FEATURE_ROWS.map((row, index) => (
        <View
          key={row.labelKey}
          style={[styles.row, index % 2 === 1 && styles.alternateRow]}
        >
          <View style={styles.featureCell}>
            <Text style={styles.featureLabelText}>{t(row.labelKey)}</Text>
          </View>
          {PLAN_COLUMNS.map((col) => {
            const valueKey = row[col.key];
            return (
              <View
                key={col.key}
                style={[styles.valueCell, currentPlan === col.key && styles.highlightedCell]}
              >
                <Text
                  style={[
                    styles.valueText,
                    currentPlan === col.key && styles.highlightedValueText,
                  ]}
                >
                  {t(valueKey)}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  alternateRow: {
    backgroundColor: colors.background,
  },
  featureCell: {
    flex: 2,
    padding: spacing.sm,
    justifyContent: "center",
  },
  featureLabelText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontWeight: "500",
  },
  planHeaderCell: {
    flex: 2,
    padding: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  highlightedHeader: {
    backgroundColor: colors.primaryMuted,
  },
  planHeaderText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.muted,
  },
  highlightedHeaderText: {
    color: colors.primary,
  },
  currentBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  currentBadgeText: {
    fontSize: 8,
    color: colors.white,
    fontWeight: "600",
  },
  valueCell: {
    flex: 2,
    padding: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightedCell: {
    backgroundColor: "rgba(37,99,235,0.05)",
  },
  valueText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },
  highlightedValueText: {
    color: colors.primary,
    fontWeight: "600",
  },
});
