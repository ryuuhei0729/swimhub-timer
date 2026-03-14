import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function AppLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: "#2563EB",
        headerTitleStyle: { color: "#111827" },
        contentStyle: { backgroundColor: "#EFF6FF" },
      }}
    >
      <Stack.Screen name="index" options={{ title: t("common.appName"), headerShown: false }} />
      <Stack.Screen
        name="editor"
        options={{
          title: t("editor.title"),
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen name="export" options={{ title: t("common.export"), presentation: "modal" }} />
      <Stack.Screen
        name="account"
        options={{
          title: t("auth.account"),
          headerBackTitle: t("common.back"),
        }}
      />
    </Stack>
  );
}
