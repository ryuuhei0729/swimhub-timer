/**
 * 書き出し画面の広告フロー。
 *  - 非 Premium は書き出し前に「広告を見て保存 / Premium で広告なし」を選ぶ（オプトイン）
 *  - 広告を選んだら書き出しを開始し、その待ち時間に広告を出す
 *  - 途中で閉じても自動で再表示しない（もう一度選んでもらう）
 *  - Premium（プラン未確定時は RevenueCat で確認）は選択肢も広告も出さない
 */

import { act, render, fireEvent, waitFor } from "@testing-library/react-native";
import ExportScreen from "../app/(app)/export";
import { useEditorStore, MOBILE_DEFAULT_STOPWATCH_CONFIG } from "../stores/editor-store";
import type { AdState } from "../lib/ads/rewarded-ad";

jest.setTimeout(30_000);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

// --- Auth (mutable per test) ---
const FREE_AUTH = {
  subscription: null as null | { plan: string; status: string; premiumExpiresAt: null },
  subscriptionResolved: true,
  guestMode: false,
  refreshSubscription: jest.fn(async () => {}),
};
let mockAuth = { ...FREE_AUTH };
jest.mock("../contexts/AuthProvider", () => ({
  useAuth: () => mockAuth,
}));

const mockHasActiveEntitlement = jest.fn(async () => false);
jest.mock("../lib/revenucat", () => ({
  hasActiveEntitlement: () => mockHasActiveEntitlement(),
}));

// --- Fake rewarded ad controller driven by the test ---
let mockAdState: AdState = "idle";
const mockAdListeners = new Set<(s: AdState) => void>();
function mockSetAdState(s: AdState) {
  mockAdState = s;
  mockAdListeners.forEach((cb) => cb(s));
}
const mockAdLoad = jest.fn(() => mockSetAdState("loading"));
const mockAdShow = jest.fn(async () => mockSetAdState("showing"));
jest.mock("../lib/ads/rewarded-ad", () => ({
  createRewardedAdController: () => ({
    load: () => mockAdLoad(),
    show: () => mockAdShow(),
    getState: () => mockAdState,
    onStateChange: (cb: (s: AdState) => void) => {
      mockAdListeners.add(cb);
      return () => mockAdListeners.delete(cb);
    },
    dispose: jest.fn(),
  }),
}));

// --- Export pipeline / overlay rendering (not under test) ---
const mockExportVideoWithStopwatch = jest.fn();
jest.mock("../lib/overlay/render-offscreen", () => ({
  renderTimerSequence: jest.fn().mockResolvedValue({
    dir: "seq",
    pattern: "seq/%05d.png",
    fps: 30,
    region: { x: 0, y: 0, width: 10, height: 10 },
  }),
  renderTimerFramePng: jest.fn().mockResolvedValue(null),
  renderFinishSummaryPng: jest.fn().mockResolvedValue(null),
  renderWatermarkPng: jest.fn().mockResolvedValue(null),
  deleteTimerSequence: jest.fn(),
}));
jest.mock("expo-file-system", () => ({
  File: class {
    delete() {}
  },
}));
jest.mock("../lib/video/export-pipeline", () => {
  const actual = jest.requireActual("../lib/video/export-pipeline");
  return {
    ...actual,
    exportVideoWithStopwatch: (...args: unknown[]) => mockExportVideoWithStopwatch(...args),
    saveToPhotoLibrary: jest.fn(),
    cleanupExportFiles: jest.fn().mockResolvedValue(undefined),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = { ...FREE_AUTH };
  mockAdState = "idle";
  mockAdListeners.clear();
  mockHasActiveEntitlement.mockResolvedValue(false);
  mockExportVideoWithStopwatch.mockResolvedValue("/mock/output.mp4");
  useEditorStore.getState().reset();
  useEditorStore.setState({
    ...useEditorStore.getState(),
    videoUri: "file:///mock/video.mp4",
    startTime: 1,
    videoMetadata: { duration: 10, width: 1920, height: 1080 } as never,
    stopwatchConfig: MOBILE_DEFAULT_STOPWATCH_CONFIG,
    exportSettings: { resolution: "720" },
  });
});

async function renderAndPressExport() {
  const screen = await render(<ExportScreen />);
  await fireEvent.press(screen.getByText("exportScreen.startExport"));
  return screen;
}

it("非 Premium: 広告は先読みだけして、書き出し押下で選択肢を出す（まだ書き出し・広告表示はしない）", async () => {
  const screen = await renderAndPressExport();
  expect(mockAdLoad).toHaveBeenCalledTimes(1);
  expect(screen.getByText("exportScreen.watchAdAndSave")).toBeTruthy();
  expect(screen.getByText("exportScreen.premiumNoAds")).toBeTruthy();
  expect(mockAdShow).not.toHaveBeenCalled();
  expect(mockExportVideoWithStopwatch).not.toHaveBeenCalled();
});

it("「広告を見て保存」で書き出しと広告表示を開始し、報酬獲得で保存できる", async () => {
  const screen = await render(<ExportScreen />);
  await act(async () => {
    mockSetAdState("loaded");
  });
  await fireEvent.press(screen.getByText("exportScreen.startExport"));
  await fireEvent.press(screen.getByText("exportScreen.watchAdAndSave"));

  expect(mockAdShow).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(mockExportVideoWithStopwatch).toHaveBeenCalledTimes(1));
  // 書き出しが終わっても視聴完了までは保存できない
  expect(screen.queryByText("exportScreen.saveToLibrary")).toBeNull();

  await act(async () => {

    mockSetAdState("rewarded");

  });
  await waitFor(() => expect(screen.getByText("exportScreen.saveToLibrary")).toBeTruthy());
});

it("広告の読み込み完了前に選んだ場合は、読み込み完了時に表示する", async () => {
  const screen = await renderAndPressExport();
  expect(mockAdState).toBe("loading");
  await fireEvent.press(screen.getByText("exportScreen.watchAdAndSave"));
  expect(mockAdShow).not.toHaveBeenCalled();

  await act(async () => {

    mockSetAdState("loaded");

  });
  await waitFor(() => expect(mockAdShow).toHaveBeenCalledTimes(1));
});

it("途中で閉じたら自動で再表示せず、もう一度選べるボタンを出す", async () => {
  const screen = await render(<ExportScreen />);
  await act(async () => {
    mockSetAdState("loaded");
  });
  await fireEvent.press(screen.getByText("exportScreen.startExport"));
  await fireEvent.press(screen.getByText("exportScreen.watchAdAndSave"));
  expect(mockAdShow).toHaveBeenCalledTimes(1);

  await act(async () => {

    mockSetAdState("dismissed");

  });
  // 次の広告を先読みする
  await waitFor(() => expect(mockAdLoad).toHaveBeenCalledTimes(2));
  await act(async () => {
    mockSetAdState("loaded");
  });
  // 読み込めても勝手には出さない
  expect(mockAdShow).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(screen.getByText("exportScreen.adDismissedPrompt")).toBeTruthy(),
  );

  await fireEvent.press(screen.getByText("exportScreen.watchAdAndSave"));
  expect(mockAdShow).toHaveBeenCalledTimes(2);
});

it("「Premium で広告なし」でペイウォールへ遷移し、書き出しはしない", async () => {
  const screen = await renderAndPressExport();
  await fireEvent.press(screen.getByText("exportScreen.premiumNoAds"));
  expect(mockPush).toHaveBeenCalledWith("/(app)/paywall");
  expect(mockExportVideoWithStopwatch).not.toHaveBeenCalled();
  expect(mockAdShow).not.toHaveBeenCalled();
});

it("視聴を選んだ広告が読み込めなければ、少し待って保存を許可する", async () => {
  const screen = await renderAndPressExport();
  await fireEvent.press(screen.getByText("exportScreen.watchAdAndSave"));
  await act(async () => {
    mockSetAdState("error");
  });
  await waitFor(() => expect(screen.getByText("exportScreen.saveToLibrary")).toBeTruthy(), {
    timeout: 4000,
  });
});

it("Premium: 選択肢も広告の読み込みもなく、そのまま書き出す", async () => {
  mockAuth = {
    ...FREE_AUTH,
    subscription: { plan: "premium", status: "active", premiumExpiresAt: null },
  };
  const screen = await renderAndPressExport();
  await waitFor(() => expect(mockExportVideoWithStopwatch).toHaveBeenCalledTimes(1));
  expect(screen.queryByText("exportScreen.watchAdAndSave")).toBeNull();
  expect(mockAdLoad).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByText("exportScreen.saveToLibrary")).toBeTruthy());
});

it("プラン未確定: 広告を先読みせず、RevenueCat で Premium なら広告なしで書き出す", async () => {
  mockAuth = { ...FREE_AUTH, subscriptionResolved: false };
  mockHasActiveEntitlement.mockResolvedValue(true);
  const screen = await renderAndPressExport();
  expect(mockAdLoad).not.toHaveBeenCalled();
  await waitFor(() => expect(mockExportVideoWithStopwatch).toHaveBeenCalledTimes(1));
  expect(mockAuth.refreshSubscription).toHaveBeenCalled();
  expect(screen.queryByText("exportScreen.watchAdAndSave")).toBeNull();
  await waitFor(() => expect(screen.getByText("exportScreen.saveToLibrary")).toBeTruthy());
});

it("プラン未確定で RevenueCat でも Premium でなければ、選択肢を出す", async () => {
  mockAuth = { ...FREE_AUTH, subscriptionResolved: false };
  const screen = await renderAndPressExport();
  await waitFor(() => expect(screen.getByText("exportScreen.watchAdAndSave")).toBeTruthy());
  expect(mockExportVideoWithStopwatch).not.toHaveBeenCalled();
});
