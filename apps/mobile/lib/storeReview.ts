/**
 * ストアの評価ダイアログ (OS 標準の In-App Review)
 *
 * 動画の書き出しが完了したとき、端末ごとに1回だけ評価を依頼する。
 * 表示するかどうかは OS が決め (iOS は 365 日に3回まで)、実際に出たかはアプリから分からない。
 * 依頼済みの印は "swimhub-timer-settings" ストアに置く。サインアウト時に clearMmkvCaches が
 * 消すのは認証ストアだけなので、ログアウトしても残る (同じ端末で何度も依頼しない)。
 */
import type * as StoreReviewModule from "expo-store-review";

const STORAGE_KEY = "store-review-requested";

/** 書き出し完了の表示を先に見せてから依頼する */
export const STORE_REVIEW_DELAY_MS = 1000;

function getStorage() {
  try {
    const { createMMKV } = require("react-native-mmkv");
    return createMMKV({ id: "swimhub-timer-settings" });
  } catch {
    return null;
  }
}

let _storage: ReturnType<typeof getStorage> | undefined = undefined;
function storage() {
  if (_storage === undefined) {
    _storage = getStorage();
  }
  return _storage;
}

let inFlight = false;

/**
 * 書き出しが完了した直後に呼ぶ。失敗しても書き出しそのものには影響させないので、例外は投げない。
 */
export async function requestStoreReviewOnce(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    // MMKV が使えない (Expo Go 等) と依頼済みを覚えられず毎回依頼してしまうので、依頼しない
    const store = storage();
    if (!store || store.getString(STORAGE_KEY) !== undefined) return;
    await new Promise((resolve) => setTimeout(resolve, STORE_REVIEW_DELAY_MS));
    // ネイティブモジュールが無いバイナリ (追加前のビルド) では読み込み時に例外になるので、
    // 使う直前に読み込む。requestReview() はネイティブが無いとストアの URL を開いてしまうため、
    // isAvailableAsync() が true のときだけ呼ぶ (TestFlight では false)。
    const StoreReview = require("expo-store-review") as typeof StoreReviewModule;
    if (!(await StoreReview.isAvailableAsync())) return;
    store.set(STORAGE_KEY, new Date().toISOString());
    await StoreReview.requestReview();
  } catch {
    // 評価の依頼に失敗しても無視する
  } finally {
    inFlight = false;
  }
}
