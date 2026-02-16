import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
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
