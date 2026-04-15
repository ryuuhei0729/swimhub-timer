import { get, set } from "idb-keyval";
import type { StopwatchConfig } from "@swimhub-timer/shared";

const KEYS = {
  STOPWATCH_CONFIG: "swimhub-timer-stopwatch-config",
  SHOW_SPLITS_OVERLAY: "swimhub-timer-show-splits-overlay",
} as const;

export async function saveStopwatchConfig(config: StopwatchConfig): Promise<void> {
  await set(KEYS.STOPWATCH_CONFIG, config);
}

export async function loadStopwatchConfig(): Promise<StopwatchConfig | null> {
  const config = await get<StopwatchConfig>(KEYS.STOPWATCH_CONFIG);
  return config ?? null;
}

export async function saveShowSplitsOverlay(value: boolean): Promise<void> {
  await set(KEYS.SHOW_SPLITS_OVERLAY, value);
}

export async function loadShowSplitsOverlay(): Promise<boolean> {
  const value = await get<boolean>(KEYS.SHOW_SPLITS_OVERLAY);
  return value ?? true;
}
