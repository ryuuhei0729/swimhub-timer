/**
 * Sprint Contract テストスケルトン
 * タスク 3: timer mobile SplitsPanel のゲスト時遷移先修正
 *
 * NOTE: このファイルはスケルトンのみ。
 * - Jest/Vitest 未セットアップのため Phase B で実装する。
 */

import React from "react";
// import { render, screen, fireEvent } from "@testing-library/react-native";
// import { SplitsPanel } from "../components/splits/SplitsPanel";

// --- ゲスト状態のモック ---
// const guestAuthContext = {
//   subscription: null,
//   guestMode: true,
// };

// --- Free ユーザーのモック ---
// const freeAuthContext = {
//   subscription: { plan: "free" },
//   guestMode: false,
// };

describe("SplitsPanel - ゲスト時遷移先", () => {
  describe("ゲスト状態でスプリット上限に達した場合", () => {
    it("should navigate to /(auth)/get-started when limit banner is pressed by guest", () => {
      // [V-01] ゲストがスプリット上限バナーをタップすると /(auth)/get-started に遷移すること
      // (現状は /(app)/paywall に遷移しているため、修正が必要)
      // fireEvent.press(limitBanner);
      // expect(mockRouterPush).toHaveBeenCalledWith("/(auth)/get-started");
    });

    it("should NOT navigate to /(app)/paywall when guest taps limit banner", () => {
      // [V-02] ゲストが上限バナーをタップしても paywall に遷移しないこと
      // expect(mockRouterPush).not.toHaveBeenCalledWith("/(app)/paywall");
    });
  });

  describe("Free ユーザーでスプリット上限に達した場合", () => {
    it("should navigate to /(app)/paywall when limit banner is pressed by free user", () => {
      // [V-03] Free ユーザーが上限バナーをタップすると /(app)/paywall に遷移すること (回帰確認)
    });
  });
});
