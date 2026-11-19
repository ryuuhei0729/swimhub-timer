/**
 * 直近で利用したログイン手法の端末内記録
 *
 * ログイン画面で「直近で利用」ラベルを出すため、最後に成功したログイン手法を
 * 端末に覚えておく。ログアウトしても消さない（次回ログイン時に表示するのが目的）。
 * 保存先は "swimhub-timer-settings" ストア。サインアウト時に clearMmkvCaches が
 * 消すのは認証ストアだけなので、ここに置けばログアウト後も残る。
 */

export type LoginMethod = "apple" | "google" | "email";

const STORAGE_KEY = "last-login-method";

const LOGIN_METHODS: readonly LoginMethod[] = ["apple", "google", "email"];

function isLoginMethod(value: unknown): value is LoginMethod {
  return typeof value === "string" && (LOGIN_METHODS as readonly string[]).includes(value);
}

function getStorage() {
  try {
    const { createMMKV } = require("react-native-mmkv");
    return createMMKV({ id: "swimhub-timer-settings" });
  } catch {
    // Expo Go 等で MMKV が使えない場合は記録しない（ラベルが出ないだけ）
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

/** 覚えている手法を返す。未保存・読み込み失敗のときは null */
export function loadLastLoginMethod(): LoginMethod | null {
  try {
    const value = storage()?.getString(STORAGE_KEY);
    return isLoginMethod(value) ? value : null;
  } catch {
    return null;
  }
}

/** ログイン成功時に呼ぶ。失敗してもラベルが出ないだけなので無視する */
export function saveLastLoginMethod(method: LoginMethod): void {
  try {
    storage()?.set(STORAGE_KEY, method);
  } catch {
    // 無視
  }
}
