/**
 * Google Mobile Ads SDK の準備（同意取得 → リクエスト設定 → 初期化）。
 *
 * Google の推奨順序:
 *   1. UMP で同意情報を更新し、必要なら同意フォームを表示する（EEA・英国・スイス等）
 *   2. canRequestAds が true のときだけ SDK を初期化し、広告をリクエストする
 * 初期化は通信を伴うため、Premium ユーザーには呼ばない（呼び出し側で判定する）。
 */
import type * as GoogleMobileAds from "react-native-google-mobile-ads";

type AdsModule = typeof GoogleMobileAds;

/** ネイティブモジュールが無い環境（Expo Go 等）では null */
export function getAdsModule(): AdsModule | null {
  try {
    return require("react-native-google-mobile-ads") as AdsModule;
  } catch {
    return null;
  }
}

/**
 * テスト端末として扱うデバイス ID。
 * TestFlight / 内部テスト版は __DEV__ が false で本番広告が出るため、開発者の実機を
 * 登録しておかないと自分のクリックが無効トラフィック扱いになりうる。
 * ID は広告リクエスト時にデバイスログへ出力される値を EAS の環境変数
 * EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS（カンマ区切り）に設定する。
 */
function getTestDeviceIdentifiers(): string[] {
  const raw: string = process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS ?? "";
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ["EMULATOR", ...ids];
}

let readyPromise: Promise<boolean> | null = null;

/**
 * 同意取得と SDK 初期化を一度だけ行う。広告をリクエストしてよければ true。
 * 失敗（オフライン等）で false になった場合は、次回呼び出し時に再試行する。
 */
export function ensureAdsReady(): Promise<boolean> {
  if (readyPromise) return readyPromise;
  const mod = getAdsModule();
  if (!mod) return Promise.resolve(false);

  const promise = (async () => {
    let canRequestAds = false;
    try {
      // 同意情報の更新 + 必要なら同意フォームの表示までをまとめて行う
      canRequestAds = (await mod.AdsConsent.gatherConsent()).canRequestAds;
    } catch {
      // 更新に失敗しても、前回セッションで得た同意で広告を出せる場合がある
      try {
        canRequestAds = (await mod.AdsConsent.getConsentInfo()).canRequestAds;
      } catch {
        canRequestAds = false;
      }
    }
    if (!canRequestAds) return false;

    const ads = mod.default();
    await ads.setRequestConfiguration({
      // 中高生の利用も想定し、広告の内容レベルを「保護者の指導のもとで全年齢」までに制限
      maxAdContentRating: mod.MaxAdContentRating.PG,
      testDeviceIdentifiers: getTestDeviceIdentifiers(),
    });
    await ads.initialize();
    return true;
  })().catch(() => false);

  readyPromise = promise;
  void promise.then((ok) => {
    if (!ok && readyPromise === promise) readyPromise = null;
  });
  return promise;
}

/** 設定画面に「広告のプライバシー設定」を出す必要があるか（EEA 等で同意を取ったユーザー） */
export async function isAdPrivacyOptionsRequired(): Promise<boolean> {
  const mod = getAdsModule();
  if (!mod) return false;
  try {
    const info = await mod.AdsConsent.getConsentInfo();
    return (
      info.privacyOptionsRequirementStatus ===
      mod.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  } catch {
    return false;
  }
}

/** 同意内容を変更するためのプライバシー設定フォームを表示する */
export async function showAdPrivacyOptions(): Promise<void> {
  const mod = getAdsModule();
  if (!mod) return;
  await mod.AdsConsent.showPrivacyOptionsForm();
}
