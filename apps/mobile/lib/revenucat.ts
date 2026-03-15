/**
 * RevenueCat SDK ラッパー
 * iOS のみ対応。Android は全操作をスキップする。
 */
import { Platform } from "react-native";
import Purchases, {
  type PurchasesPackage,
  type CustomerInfo,
  type PurchasesOfferings,
  LOG_LEVEL,
} from "react-native-purchases";

const REVENUCAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUCAT_IOS_API_KEY ?? "";

/** iOS かどうか */
const isIOS = Platform.OS === "ios";

/**
 * RevenueCat SDK を初期化する
 * iOS 以外では何もしない
 */
export async function initRevenueCat(): Promise<void> {
  if (!isIOS) return;
  if (!REVENUCAT_IOS_API_KEY) {
    console.warn("[RevenueCat] EXPO_PUBLIC_REVENUCAT_IOS_API_KEY が未設定です");
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: REVENUCAT_IOS_API_KEY });
}

/**
 * Supabase user.id で RevenueCat にログインする
 */
export async function loginRevenueCat(userId: string): Promise<CustomerInfo | null> {
  if (!isIOS || !REVENUCAT_IOS_API_KEY) return null;
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] ログイン失敗:", error);
    return null;
  }
}

/**
 * RevenueCat からログアウトする
 */
export async function logoutRevenueCat(): Promise<void> {
  if (!isIOS || !REVENUCAT_IOS_API_KEY) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error("[RevenueCat] ログアウト失敗:", error);
  }
}

/**
 * 利用可能なオファリングを取得する
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!isIOS || !REVENUCAT_IOS_API_KEY) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error("[RevenueCat] オファリング取得失敗:", error);
    return null;
  }
}

/**
 * パッケージを購入する
 */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo | null> {
  if (!isIOS) return null;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error: unknown) {
    // ユーザーキャンセルの場合はエラーを投げない
    if (
      error instanceof Object &&
      "userCancelled" in error &&
      (error as { userCancelled: boolean }).userCancelled
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * 購入をリストアする
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isIOS || !REVENUCAT_IOS_API_KEY) return null;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] リストア失敗:", error);
    throw error;
  }
}

/**
 * 顧客情報を取得する
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isIOS || !REVENUCAT_IOS_API_KEY) return null;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] 顧客情報取得失敗:", error);
    return null;
  }
}

/**
 * 顧客情報の変更リスナーを登録する
 * @returns リスナー解除関数
 */
export function addCustomerInfoUpdateListener(
  listener: (info: CustomerInfo) => void,
): () => void {
  if (!isIOS || !REVENUCAT_IOS_API_KEY) return () => {};
  const remove = Purchases.addCustomerInfoUpdateListener(listener);
  return typeof remove === "function" ? remove : () => {};
}
