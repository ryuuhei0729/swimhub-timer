/**
 * Sprint Contract (SC-4 / mobile-overlay-export-preview-parity)
 * V-04 回帰テスト — StopwatchOverlay ジェスチャー層のサマリー切替クランプ (SC-2)
 *
 * 監査結果 (PM 実測, mobile ③):
 *   可視の Skia 層 (StopwatchSkiaOverlay) はクランプ済み computeSummaryStartT
 *   を使ってサマリー表示に切り替わるが、ジェスチャー層
 *   (components/stopwatch/StopwatchOverlay.tsx, hideVisuals=true) は
 *   `currentVideoTime - startTime >= finishTime + SUMMARY_DELAY_SECONDS` という
 *   未クランプ式を使っていた → 動画終端近くでフィニッシュすると、可視のサマリー
 *   テーブルと編集ハンドル(タイマー用 vs サマリー用)が別の瞬間に切り替わり、
 *   ハンドルが追従しなくなる。
 *
 * このファイルは旧スケルトン (全件 it.skip, 対象はいずれ削除予定の
 * FinishSummaryTable 表示ロジックの想定違い) を置き換える。旧ケースは
 * StopwatchOverlay の現在の実装 (ジェスチャー層は当たり判定のみを描画し、
 * FinishSummaryTable 自体は描画しない) と噛み合っていないため実装せず削除した
 * (根拠: components/stopwatch/StopwatchOverlay.tsx の hideVisuals 分岐は
 * summaryPreviewBounds に基づくヒットエリアの View のみを描画し、
 * FinishSummaryTable はレンダーしない — Skia 側が描画を担当する)。
 *
 * 検証方法: ジェスチャー層 (hideVisuals=true) が「タイマー用ヒットエリア」から
 * 「サマリー用ヒットエリア」に切り替わる video time が、
 * computeSummaryStartT(startTime, finishTime, videoDuration) と一致するかを、
 * store に注入した一意な bounds (x 座標) で判別する。
 */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { StopwatchOverlay } from "../components/stopwatch/StopwatchOverlay";
import { useEditorStore, MOBILE_DEFAULT_STOPWATCH_CONFIG } from "../stores/editor-store";
import { computeSummaryStartT } from "../lib/video/export-pipeline";

const TIMER_BOUNDS = { x: 111, y: 11, width: 40, height: 20 };
const SUMMARY_BOUNDS = { x: 222, y: 22, width: 60, height: 30 };

type JsonNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: (JsonNode | string)[] | null;
};

/** Recursively search the rendered tree for a host node whose (possibly
 * array-valued) style contains `left === value`. Structural traversal only —
 * does not re-implement any StopwatchOverlay business logic. */
function treeHasStyleLeft(node: JsonNode | string | null | undefined, value: number): boolean {
  if (!node || typeof node === "string") return false;
  const style = node.props?.style;
  const styles = Array.isArray(style) ? style : [style];
  if (styles.some((s) => s && typeof s === "object" && (s as { left?: number }).left === value)) {
    return true;
  }
  const children = node.children ?? [];
  return children.some((c) => treeHasStyleLeft(c, value));
}

async function renderGestureLayer(overrides: Partial<ReturnType<typeof useEditorStore.getState>>) {
  useEditorStore.setState({
    ...useEditorStore.getState(),
    stopwatchConfig: MOBILE_DEFAULT_STOPWATCH_CONFIG,
    splitTimes: [],
    raceDistance: null,
    timerPreviewBounds: TIMER_BOUNDS,
    summaryPreviewBounds: SUMMARY_BOUNDS,
    timerEditing: false,
    summaryEditing: false,
    ...overrides,
  });

  const view = await render(
    <StopwatchOverlay videoWidth={1920} videoHeight={1080} hideVisuals />,
  );
  // Force contentRect to become non-zero so the component proceeds past its
  // "still measuring" early-return into the hideVisuals gesture branch.
  await act(async () => {
    await fireEvent(view.root, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 1920, height: 1080 } },
    });
  });
  return view;
}

beforeEach(() => {
  useEditorStore.getState().reset();
});

describe("[V-04] gesture layer summary switch uses the same clamp as the Skia preview", () => {
  it("computeSummaryStartT clamps the naive finishTime+SUMMARY_DELAY_SECONDS instant for this fixture (sanity check)", () => {
    // Sanity check on the fixture itself: duration=60, finishTime=58.5 must
    // force the clamp branch (finishAbs+delay overruns the clip), otherwise
    // this test would not distinguish the clamped vs. unclamped formulas.
    const clamped = computeSummaryStartT(0, 58.5, 60);
    expect(clamped).toBe(58.5); // clamp, not 58.5 + SUMMARY_DELAY_SECONDS(2) = 60.5
  });

  it("shows the SUMMARY hit-area (not the timer hit-area) once currentVideoTime reaches the CLAMPED transition", async () => {
    const startTime = 0;
    const finishTime = 58.5;
    const videoDuration = 60;
    const clampedT = computeSummaryStartT(startTime, finishTime, videoDuration);
    expect(clampedT).not.toBeNull();

    const view = await renderGestureLayer({
      startTime,
      isFinished: true,
      finishTime,
      videoMetadata: { width: 1920, height: 1080, duration: videoDuration, name: "clip.mp4" },
      currentVideoTime: clampedT as number,
    });

    const json = view.toJSON();
    // Regression target: with the OLD unclamped formula
    // (finishTime + SUMMARY_DELAY_SECONDS = 60.5), currentVideoTime=58.5 would
    // NOT satisfy `>= 60.5`, so the timer hit-area would still be showing here
    // instead of the summary one.
    expect(treeHasStyleLeft(json, SUMMARY_BOUNDS.x)).toBe(true);
    expect(treeHasStyleLeft(json, TIMER_BOUNDS.x)).toBe(false);
  });

  it("still shows the TIMER hit-area just before the clamped transition (control case)", async () => {
    const startTime = 0;
    const finishTime = 58.5;
    const videoDuration = 60;
    const clampedT = computeSummaryStartT(startTime, finishTime, videoDuration) as number;

    const view = await renderGestureLayer({
      startTime,
      isFinished: true,
      finishTime,
      videoMetadata: { width: 1920, height: 1080, duration: videoDuration, name: "clip.mp4" },
      currentVideoTime: clampedT - 0.01,
    });

    const json = view.toJSON();
    expect(treeHasStyleLeft(json, TIMER_BOUNDS.x)).toBe(true);
    expect(treeHasStyleLeft(json, SUMMARY_BOUNDS.x)).toBe(false);
  });

  it("never shows the summary hit-area when not finished, regardless of currentVideoTime", async () => {
    const view = await renderGestureLayer({
      startTime: 0,
      isFinished: false,
      finishTime: null,
      videoMetadata: { width: 1920, height: 1080, duration: 60, name: "clip.mp4" },
      currentVideoTime: 59,
    });

    const json = view.toJSON();
    expect(treeHasStyleLeft(json, TIMER_BOUNDS.x)).toBe(true);
    expect(treeHasStyleLeft(json, SUMMARY_BOUNDS.x)).toBe(false);
  });
});
