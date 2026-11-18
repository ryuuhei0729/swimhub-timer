/**
 * lib/ads/rewarded-ad.ts のコントローラ単体テスト。
 * 同意取得の結果・読み込みタイムアウト・途中で閉じた場合・失効前の読み直しを検証する。
 */
import { createRewardedAdController, type AdState } from "../lib/ads/rewarded-ad";

type Listener = () => void;

class MockFakeAd {
  listeners: Record<string, Listener> = {};
  load = jest.fn();
  show = jest.fn(async () => {});
  addAdEventListener(event: string, cb: Listener) {
    this.listeners[event] = cb;
    return () => {
      delete this.listeners[event];
    };
  }
  emit(event: string) {
    this.listeners[event]?.();
  }
}

const mockCreatedAds: MockFakeAd[] = [];
const mockEnsureAdsReady = jest.fn<Promise<boolean>, []>();

jest.mock("../lib/ads/ads-sdk", () => ({
  ensureAdsReady: () => mockEnsureAdsReady(),
  getAdsModule: () => ({
    RewardedAd: {
      createForAdRequest: () => {
        const ad = new MockFakeAd();
        mockCreatedAds.push(ad);
        return ad;
      },
    },
    RewardedAdEventType: { LOADED: "loaded", EARNED_REWARD: "earned_reward" },
    AdEventType: { CLOSED: "closed", ERROR: "error" },
    TestIds: { REWARDED: "test-rewarded" },
  }),
}));

function setup() {
  const controller = createRewardedAdController();
  if (!controller) throw new Error("controller should be created");
  const states: AdState[] = [];
  controller.onStateChange((s) => states.push(s));
  return { controller, states };
}

const lastAd = () => mockCreatedAds[mockCreatedAds.length - 1]!;

beforeEach(() => {
  jest.useFakeTimers();
  mockCreatedAds.length = 0;
  mockEnsureAdsReady.mockReset().mockResolvedValue(true);
});

afterEach(() => {
  jest.useRealTimers();
});

it("同意取得・初期化の後に広告をリクエストし、LOADED で loaded になる", async () => {
  const { controller } = setup();
  controller.load();
  expect(controller.getState()).toBe("loading");
  await jest.advanceTimersByTimeAsync(0);
  expect(mockEnsureAdsReady).toHaveBeenCalledTimes(1);
  expect(lastAd().load).toHaveBeenCalledTimes(1);

  lastAd().emit("loaded");
  expect(controller.getState()).toBe("loaded");
});

it("広告をリクエストできない（同意なし・初期化失敗）場合は広告を作らず error", async () => {
  mockEnsureAdsReady.mockResolvedValue(false);
  const { controller } = setup();
  controller.load();
  await jest.advanceTimersByTimeAsync(0);
  expect(mockCreatedAds).toHaveLength(0);
  expect(controller.getState()).toBe("error");
});

it("読み込みが応答しないままなら 15 秒で error にし、遅れて来た LOADED は無視する", async () => {
  const { controller } = setup();
  controller.load();
  await jest.advanceTimersByTimeAsync(0);
  const ad = lastAd();

  await jest.advanceTimersByTimeAsync(14_999);
  expect(controller.getState()).toBe("loading");
  await jest.advanceTimersByTimeAsync(1);
  expect(controller.getState()).toBe("error");

  ad.emit("loaded");
  expect(controller.getState()).toBe("error");
});

it("同意フォームの操作時間はタイムアウトに含めない", async () => {
  let resolveReady: (v: boolean) => void = () => {};
  mockEnsureAdsReady.mockReturnValue(new Promise<boolean>((r) => (resolveReady = r)));
  const { controller } = setup();
  controller.load();
  await jest.advanceTimersByTimeAsync(60_000); // フォームを1分見ていた
  expect(controller.getState()).toBe("loading");

  resolveReady(true);
  await jest.advanceTimersByTimeAsync(0);
  lastAd().emit("loaded");
  expect(controller.getState()).toBe("loaded");
});

it("報酬獲得前に閉じたら dismissed、報酬獲得後に閉じたら rewarded のまま", async () => {
  const { controller } = setup();
  controller.load();
  await jest.advanceTimersByTimeAsync(0);
  lastAd().emit("loaded");
  await controller.show();
  expect(controller.getState()).toBe("showing");
  lastAd().emit("closed");
  expect(controller.getState()).toBe("dismissed");

  controller.load();
  await jest.advanceTimersByTimeAsync(0);
  lastAd().emit("loaded");
  await controller.show();
  lastAd().emit("earned_reward");
  lastAd().emit("closed");
  expect(controller.getState()).toBe("rewarded");
});

it("読み込み済みのまま 50 分経つと失効前に読み直す", async () => {
  const { controller } = setup();
  controller.load();
  await jest.advanceTimersByTimeAsync(0);
  lastAd().emit("loaded");
  expect(mockCreatedAds).toHaveLength(1);

  await jest.advanceTimersByTimeAsync(50 * 60 * 1000);
  expect(controller.getState()).toBe("loading");
  expect(mockCreatedAds).toHaveLength(2);
});

it("表示中は失効タイマーで読み直さない", async () => {
  const { controller } = setup();
  controller.load();
  await jest.advanceTimersByTimeAsync(0);
  lastAd().emit("loaded");
  await controller.show();
  await jest.advanceTimersByTimeAsync(60 * 60 * 1000);
  expect(controller.getState()).toBe("showing");
  expect(mockCreatedAds).toHaveLength(1);
});

it("dispose 後はイベントが来ても通知しない", async () => {
  const { controller, states } = setup();
  controller.load();
  await jest.advanceTimersByTimeAsync(0);
  const ad = lastAd();
  controller.dispose();
  const count = states.length;
  ad.emit("loaded");
  expect(states).toHaveLength(count);
});
