import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { PurchasesPackage } from "react-native-purchases";
import { useAuth } from "../../contexts/AuthProvider";
import { getOfferings, purchasePackage, restorePurchases } from "../../lib/revenucat";
import { colors, spacing, radius, fontSize } from "../../lib/theme";

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { plan, refreshSubscription } = useAuth();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // オファリング取得
  useEffect(() => {
    (async () => {
      try {
        const offerings = await getOfferings();
        const current = offerings?.current;
        if (current?.availablePackages) {
          setPackages(current.availablePackages);
          // デフォルトで年額を選択（なければ最初のパッケージ）
          const annual = current.annual;
          setSelectedPkg(annual ?? current.availablePackages[0] ?? null);
        }
      } catch {
        // オファリング取得失敗
      } finally {
        setLoadingOfferings(false);
      }
    })();
  }, []);

  // 月額パッケージと年額パッケージを特定
  const monthlyPkg = packages.find(
    (p) => p.packageType === "MONTHLY" || p.identifier === "$rc_monthly",
  );
  const annualPkg = packages.find(
    (p) => p.packageType === "ANNUAL" || p.identifier === "$rc_annual",
  );

  // 年額の割引率を計算
  const savingsPercent = (() => {
    if (!monthlyPkg || !annualPkg) return null;
    const monthlyAnnualCost = monthlyPkg.product.price * 12;
    const annualCost = annualPkg.product.price;
    if (monthlyAnnualCost <= 0) return null;
    return Math.round(((monthlyAnnualCost - annualCost) / monthlyAnnualCost) * 100);
  })();

  // 購入処理
  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setPurchasing(true);
    try {
      const customerInfo = await purchasePackage(selectedPkg);
      if (customerInfo) {
        await refreshSubscription();
        Alert.alert(t("paywall.purchaseSuccess"), t("paywall.purchaseSuccessMessage"), [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch {
      Alert.alert(t("common.error"), t("paywall.purchaseFailed"));
    } finally {
      setPurchasing(false);
    }
  };

  // リストア処理
  const handleRestore = async () => {
    setRestoring(true);
    try {
      const customerInfo = await restorePurchases();
      if (customerInfo) {
        await refreshSubscription();
        Alert.alert(t("paywall.restoreSuccess"), t("paywall.restoreSuccessMessage"), [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(t("paywall.restoreEmpty"), t("paywall.restoreEmptyMessage"));
      }
    } catch {
      Alert.alert(t("common.error"), t("paywall.restoreFailed"));
    } finally {
      setRestoring(false);
    }
  };

  // すでに Premium なら案内を表示
  if (plan === "premium") {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centeredContent}>
          <Text style={styles.alreadyPremiumText}>{t("paywall.alreadyPremium")}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>{t("common.close")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>{t("paywall.title")}</Text>
          <Text style={styles.subtitle}>{t("paywall.subtitle")}</Text>
        </View>

        {/* Premium のメリット */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>{t("paywall.benefitsTitle")}</Text>
          {[
            t("paywall.benefit1"),
            t("paywall.benefit2"),
            t("paywall.benefit3"),
          ].map((benefit, i) => (
            <View key={i} style={styles.benefitRow}>
              <Text style={styles.benefitCheck}>✓</Text>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* プラン選択 */}
        {loadingOfferings ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : packages.length === 0 ? (
          <Text style={styles.noPackagesText}>{t("paywall.noPackages")}</Text>
        ) : (
          <View style={styles.packagesContainer}>
            {/* 年額プラン */}
            {annualPkg && (
              <TouchableOpacity
                style={[
                  styles.packageCard,
                  selectedPkg?.identifier === annualPkg.identifier && styles.packageCardSelected,
                ]}
                onPress={() => setSelectedPkg(annualPkg)}
              >
                <View style={styles.packageHeader}>
                  <Text style={styles.packageTitle}>{t("paywall.annual")}</Text>
                  {savingsPercent && savingsPercent > 0 && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>
                        {t("paywall.savePercent", { percent: savingsPercent })}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.packagePrice}>{annualPkg.product.priceString} / {t("paywall.year")}</Text>
                <Text style={styles.packageSubprice}>
                  {t("paywall.perMonth", {
                    price: (annualPkg.product.price / 12).toFixed(0),
                    currency: annualPkg.product.currencyCode,
                  })}
                </Text>
              </TouchableOpacity>
            )}

            {/* 月額プラン */}
            {monthlyPkg && (
              <TouchableOpacity
                style={[
                  styles.packageCard,
                  selectedPkg?.identifier === monthlyPkg.identifier && styles.packageCardSelected,
                ]}
                onPress={() => setSelectedPkg(monthlyPkg)}
              >
                <Text style={styles.packageTitle}>{t("paywall.monthly")}</Text>
                <Text style={styles.packagePrice}>{monthlyPkg.product.priceString} / {t("paywall.month")}</Text>
              </TouchableOpacity>
            )}

            {/* その他のパッケージ（月額・年額以外） */}
            {packages
              .filter(
                (p) =>
                  p.identifier !== monthlyPkg?.identifier &&
                  p.identifier !== annualPkg?.identifier,
              )
              .map((pkg) => (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[
                    styles.packageCard,
                    selectedPkg?.identifier === pkg.identifier && styles.packageCardSelected,
                  ]}
                  onPress={() => setSelectedPkg(pkg)}
                >
                  <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                  <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* 購入ボタン */}
        {selectedPkg && (
          <TouchableOpacity
            style={[styles.purchaseButton, purchasing && styles.buttonDisabled]}
            onPress={handlePurchase}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.purchaseButtonText}>{t("paywall.subscribe")}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* リストアボタン */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.restoreButtonText}>{t("paywall.restore")}</Text>
          )}
        </TouchableOpacity>

        {/* 閉じるボタン */}
        <TouchableOpacity style={styles.dismissButton} onPress={() => router.back()}>
          <Text style={styles.dismissButtonText}>{t("common.close")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  alreadyPremiumText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: "center",
  },
  benefitsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefitsTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  benefitCheck: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: "700",
    marginRight: spacing.sm,
  },
  benefitText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    flex: 1,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  noPackagesText: {
    textAlign: "center",
    color: colors.muted,
    fontSize: fontSize.md,
    marginVertical: spacing.xl,
  },
  packagesContainer: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  packageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  packageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  packageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  packageTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
  },
  savingsBadge: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  savingsText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.white,
  },
  packagePrice: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: 4,
  },
  packageSubprice: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: 2,
  },
  purchaseButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  restoreButton: {
    alignItems: "center",
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  restoreButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  dismissButton: {
    alignItems: "center",
    padding: spacing.md,
  },
  dismissButtonText: {
    color: colors.muted,
    fontSize: fontSize.md,
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  closeButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});
