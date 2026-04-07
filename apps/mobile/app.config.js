/**
 * Expo設定ファイル（動的）
 *
 * SDK 49+ では EXPO_PUBLIC_* は Metro がインライン展開するため、
 * extra への環境変数マッピングは不要。extra は EAS projectId 等の
 * ビルドメタデータのみを保持する。
 */
module.exports = {
  name: "SH Timer",
  slug: "swimhub-timer",
  version: "2.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "swimhubtimer",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#EFF6FF",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.swimhubtimer.app",
    buildNumber: "37",
    usesAppleSignIn: true,
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        "動画をインポートするためにフォトライブラリへのアクセスが必要です",
      NSPhotoLibraryAddUsageDescription:
        "書き出した動画をフォトライブラリに保存するために必要です",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#EFF6FF",
    },
    package: "com.swimhubtimer.app",
    versionCode: 31,
    permissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.READ_MEDIA_AUDIO",
    ],
  },
  plugins: [
    "expo-router",
    "expo-video",
    [
      "expo-image-picker",
      {
        photosPermission:
          "動画をインポートするためにフォトライブラリへのアクセスが必要です",
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission:
          "書き出した動画をフォトライブラリに保存するために必要です",
        savePhotosPermission:
          "書き出した動画をフォトライブラリに保存するために必要です",
      },
    ],
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
          buildReactNativeFromSource: true,
        },
      },
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-4640414097368188~2822606743",
        iosAppId: "ca-app-pub-4640414097368188~9666392288",
      },
    ],
    "expo-localization",
    "expo-sharing",
    "expo-web-browser",
    "expo-apple-authentication",
  ],
  extra: {
    router: {},
    eas: {
      projectId: "f13631fc-c228-4b0f-be19-81e7d73942e9",
    },
  },
  owner: "ryuuhei0729",
};
