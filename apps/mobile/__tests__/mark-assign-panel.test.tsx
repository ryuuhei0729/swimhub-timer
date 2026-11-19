import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { TextInput } from "react-native";
import { MarkAssignPanel } from "../components/splits/MarkAssignPanel";
import { useEditorStore } from "../stores/editor-store";
import { createCapturedMarks } from "../lib/capture/captured-marks";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

let mockAuth: { subscription: { plan: string } | null; guestMode: boolean } = {
  subscription: { plan: "premium" },
  guestMode: false,
};
jest.mock("../contexts/AuthProvider", () => ({
  useAuth: () => mockAuth,
}));

function seed(times: number[]) {
  const store = useEditorStore.getState();
  store.reset();
  store.setStartTime(2);
  store.setCapturedMarks(createCapturedMarks(times));
}

describe("MarkAssignPanel", () => {
  beforeEach(() => {
    mockAuth = { subscription: { plan: "premium" }, guestMode: false };
    mockPush.mockClear();
  });

  it("labels the last time as the finish", async () => {
    seed([32, 64, 97]);
    const { getByText } = await render(<MarkAssignPanel />);
    expect(getByText("markAssign.goal")).toBeTruthy();
  });

  it("bulk-assign + confirm finishes the race", async () => {
    seed([32, 64, 97]);
    const { getByTestId } = await render(<MarkAssignPanel />);
    await fireEvent.press(getByTestId("mark-bulk-50"));
    await fireEvent.press(getByTestId("mark-confirm"));

    const s = useEditorStore.getState();
    expect(s.isFinished).toBe(true);
    expect(s.raceDistance).toBe(150);
    expect(s.splitTimes.map((x) => x.distance)).toEqual([50, 100, 150]);
  });

  it("typed distances are used, and a missing one blocks confirm with an error", async () => {
    seed([32, 64]);
    const { getByTestId, queryByTestId } = await render(<MarkAssignPanel />);
    await fireEvent.changeText(getByTestId("mark-distance-0"), "50");
    await fireEvent.press(getByTestId("mark-confirm"));
    expect(useEditorStore.getState().isFinished).toBe(false);
    expect(queryByTestId("mark-error")).toBeTruthy();

    await fireEvent.changeText(getByTestId("mark-distance-1"), "100");
    await fireEvent.press(getByTestId("mark-confirm"));
    expect(useEditorStore.getState().isFinished).toBe(true);
    expect(useEditorStore.getState().finishTime).toBe(62);
  });

  it("guest plan: more laps than allowed disables confirm and links to sign-up", async () => {
    mockAuth = { subscription: null, guestMode: true }; // guest: 1 split max
    seed([32, 64, 97]); // 2 laps + finish
    const { getByTestId, getByText } = await render(<MarkAssignPanel />);
    await fireEvent.press(getByTestId("mark-bulk-50"));
    await fireEvent.press(getByTestId("mark-confirm"));
    expect(useEditorStore.getState().isFinished).toBe(false);

    await fireEvent.press(getByText("markAssign.limitExceeded"));
    expect(mockPush).toHaveBeenCalledWith("/(auth)/get-started");
  });

  it("guest plan: one lap + finish is within the limit", async () => {
    mockAuth = { subscription: null, guestMode: true };
    seed([32, 64]);
    const { getByTestId } = await render(<MarkAssignPanel />);
    await fireEvent.press(getByTestId("mark-bulk-50"));
    await fireEvent.press(getByTestId("mark-confirm"));
    expect(useEditorStore.getState().isFinished).toBe(true);
  });

  it("selecting a time shows fine-tune tools that move it (and seek the video)", async () => {
    seed([32, 64]);
    const { getByText, getByTestId } = await render(<MarkAssignPanel />);
    await fireEvent(getByTestId("mark-distance-0"), "focus");
    await fireEvent.press(getByText("+0.1"));
    const s = useEditorStore.getState();
    expect(s.capturedMarks![0]!.videoTime).toBeCloseTo(32.1);
    expect(s.pendingVideoSeek).toBeCloseTo(32.1);

    await fireEvent.press(getByTestId("mark-delete-0"));
    expect(useEditorStore.getState().capturedMarks!.map((m) => m.videoTime)).toEqual([64]);
  });
});

describe("MarkAssignPanel distance −/+ and keyboard Next", () => {
  beforeEach(() => {
    mockAuth = { subscription: { plan: "premium" }, guestMode: false };
  });

  const distances = () => useEditorStore.getState().capturedMarks!.map((m) => m.distance);

  it("+/− jump to the next/previous 25 m boundary", async () => {
    seed([32, 64]);
    const { getByTestId } = await render(<MarkAssignPanel />);
    await fireEvent.changeText(getByTestId("mark-distance-0"), "30");
    await fireEvent.press(getByTestId("mark-distance-inc-0"));
    expect(distances()[0]).toBe(50);
    expect(getByTestId("mark-distance-0").props.value).toBe("50"); // typed draft replaced
    await fireEvent.press(getByTestId("mark-distance-dec-0"));
    await fireEvent.press(getByTestId("mark-distance-dec-0"));
    expect(distances()[0]).toBe(25); // 50 → 25 → stays 25
  });

  it("empty field: previous mark's distance + 25 (or 25 when there is none)", async () => {
    seed([32, 64, 97]);
    const { getByTestId } = await render(<MarkAssignPanel />);
    await fireEvent.press(getByTestId("mark-distance-dec-0")); // nothing above → 25
    expect(distances()[0]).toBe(25);
    await fireEvent.changeText(getByTestId("mark-distance-0"), "50");
    await fireEvent.press(getByTestId("mark-distance-inc-1")); // above is 50 → 75
    expect(distances()[1]).toBe(75);
  });

  it("keyboard toolbar: Next on every field but the last (Done), and Next focuses the following field", async () => {
    seed([32, 64]);
    const { getByTestId } = await render(<MarkAssignPanel />);
    const first = getByTestId("mark-distance-0");
    const last = getByTestId("mark-distance-1");
    // iOS adds the toolbar button for a number pad when returnKeyType is set.
    expect(first.props.returnKeyType).toBe("next");
    expect(first.props.inputAccessoryViewButtonLabel).toBe("markAssign.next");
    expect(first.props.submitBehavior).toBe("submit"); // keyboard stays up while moving on
    expect(first.props.inputAccessoryViewID).toBeUndefined(); // a custom ID suppresses it
    expect(last.props.inputAccessoryViewButtonLabel).toBe("markAssign.done");
    expect(last.props.submitBehavior).toBe("blurAndSubmit");

    // RN's jest TextInput mock shares one focus jest.fn on its prototype;
    // mock.contexts tells which field it was called on.
    const focus = (TextInput as unknown as { prototype: { focus: jest.Mock } }).prototype.focus;
    focus.mockClear();
    await fireEvent(first, "submitEditing");
    expect(focus).toHaveBeenCalledTimes(1);
    expect((focus.mock.contexts[0] as { props: { testID: string } }).props.testID).toBe(
      "mark-distance-1",
    );
    expect(getByTestId("mark-set-current-1")).toBeTruthy(); // that row is selected too
  });

  it("− is disabled at 25 m", async () => {
    seed([32]);
    const { getByTestId } = await render(<MarkAssignPanel />);
    expect(getByTestId("mark-distance-dec-0")).not.toBeDisabled(); // empty: fills 25
    await fireEvent.press(getByTestId("mark-distance-inc-0"));
    expect(getByTestId("mark-distance-dec-0")).toBeDisabled();
  });
});

describe("MarkAssignPanel with no times yet (e.g. an imported video)", () => {
  beforeEach(() => {
    mockAuth = { subscription: { plan: "premium" }, guestMode: false };
  });

  it("explains how to add times and hides bulk fill / confirm", async () => {
    seed([]);
    const { getByText, queryByTestId } = await render(<MarkAssignPanel />);
    expect(getByText("markAssign.emptyHint")).toBeTruthy();
    expect(queryByTestId("mark-bulk-50")).toBeNull();
    expect(queryByTestId("mark-confirm")).toBeNull();
  });

  it("times added at the playhead go through the same assignment and confirm", async () => {
    seed([]);
    useEditorStore.getState().addCapturedMark(30);
    useEditorStore.getState().addCapturedMark(61);
    const { getByTestId } = await render(<MarkAssignPanel />);
    await fireEvent.press(getByTestId("mark-bulk-50"));
    await fireEvent.press(getByTestId("mark-confirm"));
    const s = useEditorStore.getState();
    expect(s.isFinished).toBe(true);
    expect(s.splitTimes.map((x) => [x.distance, x.time])).toEqual([
      [50, 28],
      [100, 59],
    ]);
  });
});

describe("MarkAssignPanel memo", () => {
  beforeEach(() => {
    mockAuth = { subscription: { plan: "premium" }, guestMode: false };
  });

  it("a selected time's memo is carried into the confirmed splits (and the finish memo)", async () => {
    seed([32, 64]);
    const { getByTestId } = await render(<MarkAssignPanel />);
    await fireEvent(getByTestId("mark-distance-0"), "focus");
    await fireEvent.changeText(getByTestId("mark-memo-0"), "ドルフィン5回");
    await fireEvent(getByTestId("mark-distance-1"), "focus");
    await fireEvent.changeText(getByTestId("mark-memo-1"), " ラスト ");
    await fireEvent.press(getByTestId("mark-bulk-50"));
    await fireEvent.press(getByTestId("mark-confirm"));
    const s = useEditorStore.getState();
    expect(s.splitTimes.map((x) => x.memo)).toEqual(["ドルフィン5回", "ラスト"]);
    expect(s.finishMemo).toBe("ラスト");
  });
});
