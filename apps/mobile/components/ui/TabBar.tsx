import { type ReactNode } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { colors, spacing, fontSize } from "../../lib/theme";

interface Tab {
  key: string;
  label: string;
  icon: (props: { color: string; size: number }) => ReactNode;
}

interface Props {
  tabs: Tab[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export function TabBar({ tabs, activeKey, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        const color = active ? colors.primary : colors.muted;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onSelect(tab.key)}
          >
            {tab.icon({ color, size: 16 })}
            <Text style={[styles.tabLabel, { color }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
});
