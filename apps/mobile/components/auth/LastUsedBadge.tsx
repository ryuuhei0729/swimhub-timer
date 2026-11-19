import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../../lib/theme";

interface LastUsedBadgeProps {
  testID?: string;
}

/**
 * ログインボタン右上に重ねる「直近で利用」バッジ。
 * 見た目専用。読み上げはボタン側の accessibilityLabel に含める。
 */
export function LastUsedBadge({ testID }: LastUsedBadgeProps) {
  const { t } = useTranslation();
  return (
    <View
      style={styles.badge}
      pointerEvents="none"
      testID={testID}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={styles.text}>{t("auth.loginMethod.lastUsed")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -9,
    right: 12,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 1,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
});
