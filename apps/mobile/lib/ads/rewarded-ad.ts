import { Platform } from "react-native";
import type { RewardedAd as RewardedAdType } from "react-native-google-mobile-ads";
import { ensureAdsReady, getAdsModule } from "./ads-sdk";

/**
 * 同意取得・初期化が済んでから、この時間内に LOADED/ERROR が来なければ失敗扱いにする。
 * SDK は通常エラーを返すが、万一応答が無いと「広告待ち」のまま保存に進めなくなるため。
 */
const LOAD_TIMEOUT_MS = 15_000;

/**
 * 読み込み済みのリワード広告は 1 時間で失効し、表示できなくなる。
 * 書き出し画面に長く留まった場合に備え、失効前に読み直す。
 */
const AD_EXPIRY_MS = 50 * 60 * 1000;

function getRewardedAdUnitId(testId: string): string {
  if (__DEV__) {
    return testId;
  }
  return (
    Platform.select({
      ios: "ca-app-pub-4640414097368188/7995042374",
      android: "ca-app-pub-4640414097368188/9802123652",
    }) ?? ""
  );
}

export type AdState =
  | "idle"
  | "loading"
  | "loaded"
  | "showing"
  | "rewarded"
  // Closed after earning the reward (the ad is no longer on screen).
  | "closed"
  // User closed the ad before earning the reward (distinct from a load/show
  // failure). Must NOT grant free access — the caller offers the ad again.
  | "dismissed"
  | "error";

export interface RewardedAdController {
  /** 広告を読み込む（表示はしない）。読み込み中・表示中でも新しい広告で読み直す */
  load: () => void;
  /** 読み込み済みの広告を表示する。ユーザーが視聴を選んだときだけ呼ぶこと */
  show: () => Promise<void>;
  getState: () => AdState;
  onStateChange: (callback: (state: AdState) => void) => () => void;
  dispose: () => void;
}

export function createRewardedAdController(): RewardedAdController | null {
  const mod = getAdsModule();
  if (!mod) return null;

  const { RewardedAd, RewardedAdEventType, AdEventType } = mod;
  const adUnitId = getRewardedAdUnitId(mod.TestIds.REWARDED);
  if (!adUnitId) return null;

  let state: AdState = "idle";
  let listeners: ((state: AdState) => void)[] = [];
  let unsubscribers: (() => void)[] = [];
  let rewardedAd: RewardedAdType | null = null;
  let adRewardEarned = false;
  let loadTimer: ReturnType<typeof setTimeout> | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  // load() / dispose() のたびに進める。古い読み込みの非同期コールバックを無視するため。
  let generation = 0;

  function setState(newState: AdState) {
    if (disposed) return;
    state = newState;
    listeners.forEach((cb) => cb(newState));
  }

  function clearTimers() {
    if (loadTimer) clearTimeout(loadTimer);
    if (expiryTimer) clearTimeout(expiryTimer);
    loadTimer = null;
    expiryTimer = null;
  }

  function teardownAd() {
    unsubscribers.forEach((unsub) => unsub());
    unsubscribers = [];
    rewardedAd = null;
    clearTimers();
  }

  function load() {
    if (disposed) return;
    teardownAd();
    adRewardEarned = false;
    const gen = ++generation;
    setState("loading");

    void ensureAdsReady().then((canRequestAds) => {
      if (gen !== generation) return;
      if (!canRequestAds) {
        // 同意が得られない・SDK を初期化できない → 広告は出せない
        setState("error");
        return;
      }

      const ad = RewardedAd.createForAdRequest(adUnitId);
      rewardedAd = ad;

      unsubscribers.push(
        ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          if (gen !== generation) return;
          if (loadTimer) clearTimeout(loadTimer);
          loadTimer = null;
          expiryTimer = setTimeout(() => {
            if (gen === generation && state === "loaded") load();
          }, AD_EXPIRY_MS);
          setState("loaded");
        }),
      );

      unsubscribers.push(
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          if (gen !== generation) return;
          adRewardEarned = true;
          setState("rewarded");
        }),
      );

      unsubscribers.push(
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          if (gen !== generation) return;
          if (!adRewardEarned) {
            // Closed without earning the reward — the user dismissed it. Report
            // "dismissed" (not "error") so the export gate stays closed.
            setState("dismissed");
          } else {
            setState("closed");
          }
        }),
      );

      unsubscribers.push(
        ad.addAdEventListener(AdEventType.ERROR, () => {
          if (gen !== generation || adRewardEarned) return;
          teardownAd();
          setState("error");
        }),
      );

      // 同意フォームの操作時間を含めないよう、タイムアウトは広告リクエスト直前から数える
      loadTimer = setTimeout(() => {
        if (gen !== generation || state !== "loading") return;
        generation++;
        teardownAd();
        setState("error");
      }, LOAD_TIMEOUT_MS);
      ad.load();
    });
  }

  return {
    load,

    async show() {
      if (state !== "loaded" || !rewardedAd) {
        throw new Error("Ad is not loaded yet");
      }
      if (expiryTimer) clearTimeout(expiryTimer);
      expiryTimer = null;
      setState("showing");
      await rewardedAd.show();
    },

    getState() {
      return state;
    },

    onStateChange(callback) {
      listeners.push(callback);
      return () => {
        listeners = listeners.filter((cb) => cb !== callback);
      };
    },

    dispose() {
      generation++;
      teardownAd();
      listeners = [];
      state = "idle";
      disposed = true;
    },
  };
}
