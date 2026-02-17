import "../lib/i18n";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";

export default function RootLayout() {
  const { t } = useTranslation();

  useEffect(() => {
    try {
      const mobileAds =
        require("react-native-google-mobile-ads").default;
      mobileAds().initialize();
    } catch {
      // Ad module not available (e.g., running in Expo Go)
    }
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0a0a0a" },
          headerTintColor: "#ffffff",
          contentStyle: { backgroundColor: "#0a0a0a" },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: t("common.appName"), headerShown: false }}
        />
        <Stack.Screen
          name="editor"
          options={{ title: t("editor.title"), headerBackTitle: t("common.back") }}
        />
        <Stack.Screen
          name="export"
          options={{ title: t("common.export"), presentation: "modal" }}
        />
      </Stack>
    </>
  );
}
