/**
 * Sprint Contract (SC-4 / mobile-overlay-export-preview-parity)
 * V-01 契約レベル回帰テスト — pre-roll / タイマーシーケンスの overlay `enable` 式
 * が [0, endT] を「重複も欠落もなく」覆うこと (PM 裁定による追加)
 *
 * 背景: 先行の export-preroll-window.test.tsx の V-01 は
 * 「renderTimerFramePng が呼ばれ、preRollImageUri が exportVideoWithStopwatch に
 * 渡ること」までしか見ておらず、実装の配線 (仕組み) の検証に留まっていた。
 * preRollImageUri が正しく渡っていても、buildSeqOverlayGraph が生成する
 * `enable` 式自体が壊れていれば (例: 上限/下限を取り違える、境界を重複させる)
 * 書き出し動画には何も映らない、あるいは同じ瞬間に2枚が重なる。
 *
 * このテストは exportVideoWithStopwatch を実際に呼び (ffmpeg-kit-react-native /
 * expo-file-system のみモック)、生成された -filter_complex 文字列から
 *   - pre-roll オーバーレイの `enable='lt(t,X)'`
 *   - タイマーシーケンスオーバーレイの `enable='between(t,A,B)'`
 * を抽出し、部分文字列一致 (toContain) ではなく、t の代表点
 * (0 / startT-ε / startT / startT+ε / endT) で「どちらのレイヤが有効か」を
 * 数値評価する。各代表点で有効なレイヤがちょうど1つであること
 * (重複=両方有効、欠落=両方無効、のどちらも不合格) を検証する。
 */
import { FFmpegKit, FFprobeKit, ReturnCode } from "ffmpeg-kit-react-native";
import { exportVideoWithStopwatch, type TimerSequenceInput } from "../lib/video/export-pipeline";
import { MOBILE_DEFAULT_STOPWATCH_CONFIG } from "../stores/editor-store";

jest.mock("ffmpeg-kit-react-native", () => ({
  FFmpegKit: { execute: jest.fn() },
  FFmpegKitConfig: { enableStatisticsCallback: jest.fn() },
  FFprobeKit: { getMediaInformation: jest.fn() },
  ReturnCode: { isSuccess: jest.fn() },
}));

jest.mock("expo-file-system", () => ({
  Paths: { cache: "/mock/cache" },
  File: class MockFile {
    uri: string;
    constructor(dir: string, name: string) {
      this.uri = `${dir}/${name}`;
    }
    get exists() {
      return false;
    }
    delete() {}
    create() {}
    write() {}
  },
}));

async function runExportAndGetCommand(timerSequence: TimerSequenceInput | null): Promise<string> {
  let capturedCommand: string | null = null;
  (FFmpegKit.execute as jest.Mock).mockImplementation(async (command: string) => {
    capturedCommand = command;
    return { getReturnCode: async () => "success" };
  });
  (ReturnCode.isSuccess as jest.Mock).mockReturnValue(true);
  (FFprobeKit.getMediaInformation as jest.Mock).mockResolvedValue({
    getMediaInformation: () => null,
  });

  await exportVideoWithStopwatch(
    "file:///mock/video.mp4",
    10, // startSignalTime
    MOBILE_DEFAULT_STOPWATCH_CONFIG,
    false, // isFinished
    null, // finishTime
    1080, // originalVideoHeight
    { resolution: "original" },
    () => {},
    false, // showWatermark
    null, // summaryImageUri
    [], // splitTimes
    null, // raceDistance
    60, // videoDurationSec
    timerSequence,
    null, // watermarkImageUri
  );

  expect(capturedCommand).not.toBeNull();
  return capturedCommand as unknown as string;
}

/** Pre-roll layer: `overlay=0:0:enable='lt(t,X)'` immediately preceding the
 * `[preroll]` label consumption — there is only ever one `lt(t,` in this
 * filtergraph shape (drawtext's own elapsed clamps use `max`/`min`, never
 * `lt`), so a single regex match is unambiguous. */
function extractPrerollBound(command: string): number | null {
  const match = command.match(/enable='lt\(t,([\d.]+)\)'/);
  return match ? Number(match[1]) : null;
}

/** Timer-sequence layer: identified by the `eof_action=pass` suffix, which
 * ONLY the timer-sequence overlay stage sets (see buildSeqOverlayGraph). */
function extractSeqBounds(command: string): { start: number; end: number } {
  const match = command.match(/enable='between\(t,([\d.]+),([\d.]+)\)':eof_action=pass/);
  expect(match).not.toBeNull();
  const [, startStr, endStr] = match as RegExpMatchArray;
  return { start: Number(startStr), end: Number(endStr) };
}

function isPrerollActive(prerollBound: number | null, t: number): boolean {
  if (prerollBound === null) return false;
  return t < prerollBound; // ffmpeg `lt` is a strict less-than
}

function isSeqActive(bounds: { start: number; end: number }, t: number): boolean {
  return t >= bounds.start && t <= bounds.end; // ffmpeg `between` is inclusive on both ends
}

describe("[V-01] pre-roll + timer-sequence enable expressions partition [0, endT] with no gap and no overlap", () => {
  it("when there IS a pre-roll gap (startT=7 > 0): exactly one layer is active at every representative t, and the boundary belongs to the sequence layer only", async () => {
    const timerSequence: TimerSequenceInput = {
      pattern: "mock-dir/ol_%05d.png",
      fps: 30,
      startT: 7,
      endT: 60,
      region: { x: 0, y: 0, width: 200, height: 100 },
      preRollImageUri: "mock-preroll.png",
    };

    const command = await runExportAndGetCommand(timerSequence);
    const prerollBound = extractPrerollBound(command);
    const seqBounds = extractSeqBounds(command);

    expect(prerollBound).toBe(7);
    expect(seqBounds).toEqual({ start: 7, end: 60 });

    const points: [number, "preroll" | "seq"][] = [
      [0, "preroll"],
      [3.5, "preroll"],
      [6.999, "preroll"],
      [7, "seq"], // boundary — must belong to exactly ONE layer, not both
      [7.001, "seq"],
      [60, "seq"],
    ];

    for (const [t, expectedActive] of points) {
      const prerollActive = isPrerollActive(prerollBound, t);
      const seqActive = isSeqActive(seqBounds, t);
      // No gap AND no overlap: exactly one of the two layers is active.
      expect(Number(prerollActive) + Number(seqActive)).toBe(1);
      expect(prerollActive ? "preroll" : "seq").toBe(expectedActive);
    }
  });

  it("when there is NO pre-roll gap (startT=0): the sequence layer alone covers t=0, and no pre-roll layer is emitted at all", async () => {
    const timerSequence: TimerSequenceInput = {
      pattern: "mock-dir/ol_%05d.png",
      fps: 30,
      startT: 0,
      endT: 30,
      region: { x: 0, y: 0, width: 200, height: 100 },
      preRollImageUri: null,
    };

    const command = await runExportAndGetCommand(timerSequence);
    const prerollBound = extractPrerollBound(command);
    const seqBounds = extractSeqBounds(command);

    expect(prerollBound).toBeNull(); // no pre-roll stage in the graph at all
    expect(seqBounds).toEqual({ start: 0, end: 30 });
    expect(isSeqActive(seqBounds, 0)).toBe(true);
  });
});
