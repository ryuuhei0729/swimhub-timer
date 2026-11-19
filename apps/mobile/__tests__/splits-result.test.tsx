/** SplitsPanel is now the confirmed-race result view (input lives in MarkAssignPanel). */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { SplitsPanel } from "../components/splits/SplitsPanel";
import { useEditorStore } from "../stores/editor-store";
import { createCapturedMarks } from "../lib/capture/captured-marks";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

it("shows the final time and splits; Edit returns to assignment with the times kept", async () => {
  const s = useEditorStore.getState();
  s.reset();
  s.setStartTime(2);
  s.setCapturedMarks(createCapturedMarks([32, 64]));
  s.assignCapturedDistances(50);
  expect(useEditorStore.getState().confirmCapturedMarks()).toBeNull();

  const { getByText, getAllByText } = await render(<SplitsPanel />);
  expect(getByText("splits.finalTime")).toBeTruthy();
  // finish 64 − 2: on the final-time card and on the 100m row
  expect(getAllByText("1:02.00")).toHaveLength(2);
  expect(getByText("50m")).toBeTruthy();

  await fireEvent.press(getByText("splits.edit"));
  const after = useEditorStore.getState();
  expect(after.isFinished).toBe(false);
  expect(after.capturedMarks.map((m) => m.distance)).toEqual([50, 100]);
});
