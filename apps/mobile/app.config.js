const ANDROID_VERSION = "1.0.0";

// react-native-google-mobile-ads 16.2.2 のドキュメント記載のリスト
const SK_AD_NETWORK_ITEMS = [
  "cstr6suwn9.skadnetwork",
  "4fzdc2evr5.skadnetwork",
  "2fnua5tdw4.skadnetwork",
  "ydx93a7ass.skadnetwork",
  "p78axxw29g.skadnetwork",
  "v72qych5uu.skadnetwork",
  "ludvb6z3bs.skadnetwork",
  "cp8zw746q7.skadnetwork",
  "3sh42y64q3.skadnetwork",
  "c6k4g5qg8m.skadnetwork",
  "s39g8k73mm.skadnetwork",
  "wg4vff78zm.skadnetwork",
  "3qy4746246.skadnetwork",
  "f38h382jlk.skadnetwork",
  "hs6bdukanm.skadnetwork",
  "mlmmfzh3r3.skadnetwork",
  "v4nxqhlyqp.skadnetwork",
  "wzmmz9fp6w.skadnetwork",
  "su67r6k2v3.skadnetwork",
  "yclnxrl5pm.skadnetwork",
  "t38b2kh725.skadnetwork",
  "7ug5zh24hu.skadnetwork",
  "gta9lk7p23.skadnetwork",
  "vutu7akeur.skadnetwork",
  "y5ghdn5j9k.skadnetwork",
  "v9wttpbfk9.skadnetwork",
  "n38lu8286q.skadnetwork",
  "47vhws6wlr.skadnetwork",
  "kbd757ywx3.skadnetwork",
  "9t245vhmpl.skadnetwork",
  "a2p9lx4jpn.skadnetwork",
  "22mmun2rn5.skadnetwork",
  "44jx6755aq.skadnetwork",
  "k674qkevps.skadnetwork",
  "4468km3ulz.skadnetwork",
  "2u9pt9hc89.skadnetwork",
  "8s468mfl3y.skadnetwork",
  "klf5c3l5u5.skadnetwork",
  "ppxm28t8ap.skadnetwork",
  "kbmxgpxpgc.skadnetwork",
  "uw77j35x4d.skadnetwork",
  "578prtvx9j.skadnetwork",
  "4dzt52r2t5.skadnetwork",
  "tl55sbb4fm.skadnetwork",
  "c3frkrj4fj.skadnetwork",
  "e5fvkxwrpn.skadnetwork",
  "8c4e2ghe7u.skadnetwork",
  "3rd42ekr43.skadnetwork",
  "97r2b46745.skadnetwork",
  "3qcr597p9d.skadnetwork",
];

module.exports = () => {
  const isAndroid = process.env.EAS_BUILD_PLATFORM === "android";
  return {
    name: "SH Timer",
    slug: "swimhub-timer",
    version: isAndroid ? ANDROID_VERSION : "2.6.0",
    // "default" so iOS lists landscape in UISupportedInterfaceOrientations — the
    // camera capture screen locks itself to landscape. Everything else stays
    // portrait via expo-screen-orientation's initialOrientation (iOS) and the
    // root layout's portrait lock.
    orientation: "default",
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
      usesAppleSignIn: true,
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          "動画をインポートするためにフォトライブラリへのアクセスが必要です",
        NSPhotoLibraryAddUsageDescription:
          "書き出した動画をフォトライブラリに保存するために必要です",
        NSCameraUsageDescription: "レースを撮影しながらタイムを計測するためにカメラを使用します",
        NSMicrophoneUsageDescription:
          "撮影する動画に音声を記録し、スタート音を検出するためにマイクを使用します",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#EFF6FF",
      },
      package: "com.swimhubtimer.app",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
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
      "expo-secure-store",
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
          android: {
            minSdkVersion: 24,
          },
        },
      ],
      "./plugins/withFmtFix",
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: "ca-app-pub-4640414097368188~2822606743",
          iosAppId: "ca-app-pub-4640414097368188~9666392288",
          // iOS で IDFA が無くても広告経由のインストールを計測できるようにする
          // （無いと入札が減り収益が下がる）。Google と主要な第三者バイヤーの ID。
          // 一覧は随時更新されるため、定期的に公式リストと突き合わせること:
          // https://developers.google.com/admob/ios/3p-skadnetworks
          skAdNetworkItems: SK_AD_NETWORK_ITEMS,
        },
      ],
      "expo-localization",
      ["expo-screen-orientation", { initialOrientation: "PORTRAIT_UP" }],
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
};
