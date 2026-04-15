import "../lib/i18n";
import { useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../contexts/AuthProvider";
import { colors } from "../lib/theme";

function AuthGate() {
  const { user, isAuthenticated, guestMode, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const redirectDone = useRef(false);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !guestMode && !inAuthGroup) {
      // 未認証・非ゲスト・非authグループ → get-started へリダイレクト
      if (!redirectDone.current) {
        redirectDone.current = true;
        router.replace("/(auth)/get-started");
      }
    } else if (!!user && inAuthGroup) {
      // ログイン済みユーザーのみauthグループからリダイレクト
      router.replace("/(app)");
    } else {
      // 認証状態が変わったら次回のリダイレクトを許可
      redirectDone.current = false;
    }
  }, [user, isAuthenticated, guestMode, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    try {
      const mobileAds = require("react-native-google-mobile-ads").default;
      mobileAds().initialize();
    } catch {
      // Ad module not available (e.g., running in Expo Go)
    }
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AuthGate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
