import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
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
          options={{ title: "SplitSync", headerShown: false }}
        />
        <Stack.Screen
          name="editor"
          options={{ title: "エディター", headerBackTitle: "戻る" }}
        />
        <Stack.Screen
          name="export"
          options={{ title: "書き出し", presentation: "modal" }}
        />
      </Stack>
    </>
  );
}
