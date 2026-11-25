/**
 * lib/storeReview.ts: 端末ごとに1回だけストアの評価を依頼する。
 * MMKV のモックは createMMKV() のたびに空のストアを返すので、テストごとにモジュールを読み直す。
 * (isolateModules は使わない。対象が後から遅延 require する expo-store-review が別のモックになる)
 */
import type * as StoreReviewModule from "expo-store-review";
import type * as Subject from "../lib/storeReview";

function createMapStore() {
  const store = new Map<string, string>();
  return {
    getString: (key: string) => store.get(key),
    set: (key: string, value: string) => store.set(key, value),
  };
}

/** createMMKV に渡されたストア ID */
const mmkvIds: string[] = [];

let subject: typeof Subject;
let StoreReview: typeof StoreReviewModule;
let isAvailableAsync: jest.Mock;
let requestReview: jest.Mock;

async function run(promise: Promise<unknown>) {
  await jest.advanceTimersByTimeAsync(subject.STORE_REVIEW_DELAY_MS);
  await promise;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetModules();
  mmkvIds.length = 0;
  jest.doMock("react-native-mmkv", () => ({
    createMMKV: ({ id }: { id: string }) => {
      mmkvIds.push(id);
      return createMapStore();
    },
  }));
  subject = jest.requireActual<typeof Subject>("../lib/storeReview");
  StoreReview = jest.requireMock<typeof StoreReviewModule>("expo-store-review");
  isAvailableAsync = StoreReview.isAvailableAsync as jest.Mock;
  requestReview = StoreReview.requestReview as jest.Mock;
  isAvailableAsync.mockResolvedValue(true);
  requestReview.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

it("未依頼なら、待ってから依頼する", async () => {
  const promise = subject.requestStoreReviewOnce();
  await jest.advanceTimersByTimeAsync(subject.STORE_REVIEW_DELAY_MS - 1);
  expect(requestReview).not.toHaveBeenCalled();

  await run(promise);

  expect(requestReview).toHaveBeenCalledTimes(1);
  // サインアウトで消えない設定ストアに印を置く (clearMmkvCaches が消すのは認証ストアだけ)
  expect(mmkvIds).toEqual(["swimhub-timer-settings"]);
});

it("2回目以降は依頼しない", async () => {
  await run(subject.requestStoreReviewOnce());
  await run(subject.requestStoreReviewOnce());

  expect(requestReview).toHaveBeenCalledTimes(1);
});

it("使えない環境 (TestFlight など) では依頼せず、次の書き出しで依頼する", async () => {
  isAvailableAsync.mockResolvedValueOnce(false);
  await run(subject.requestStoreReviewOnce());
  expect(requestReview).not.toHaveBeenCalled();

  await run(subject.requestStoreReviewOnce());
  expect(requestReview).toHaveBeenCalledTimes(1);
});

it("続けて呼ばれても依頼は1回だけ", async () => {
  await run(Promise.all([subject.requestStoreReviewOnce(), subject.requestStoreReviewOnce()]));

  expect(requestReview).toHaveBeenCalledTimes(1);
});

it("依頼に失敗しても例外を投げない", async () => {
  requestReview.mockRejectedValueOnce(new Error("native"));

  await expect(run(subject.requestStoreReviewOnce())).resolves.toBeUndefined();
});

it("MMKV が使えない環境では依頼しない (依頼済みを覚えられず毎回依頼してしまうため)", async () => {
  jest.resetModules();
  jest.doMock("react-native-mmkv", () => ({
    createMMKV: () => {
      throw new Error("no native mmkv");
    },
  }));
  subject = jest.requireActual<typeof Subject>("../lib/storeReview");
  StoreReview = jest.requireMock<typeof StoreReviewModule>("expo-store-review");
  (StoreReview.isAvailableAsync as jest.Mock).mockResolvedValue(true);

  await run(subject.requestStoreReviewOnce());

  expect(StoreReview.requestReview).not.toHaveBeenCalled();
});

it("ネイティブモジュールが無いバイナリでも例外を投げず、ストアの URL も開かない", async () => {
  jest.resetModules();
  jest.doMock("expo-store-review", () => {
    throw new Error("Cannot find native module 'ExpoStoreReview'");
  });
  try {
    subject = jest.requireActual<typeof Subject>("../lib/storeReview");
    await expect(run(subject.requestStoreReviewOnce())).resolves.toBeUndefined();
  } finally {
    jest.dontMock("expo-store-review");
  }
});
