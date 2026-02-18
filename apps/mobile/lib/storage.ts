import type { StopwatchConfig } from "@swimhub-timer/core";
import { DEFAULT_STOPWATCH_CONFIG } from "@swimhub-timer/core";

function getStorage() {
  try {
    const { createMMKV } = require("react-native-mmkv");
    return createMMKV({ id: "swimhub-timer-settings" });
  } catch {
    // Fallback for Expo Go: no persistence
    return null;
  }
}

let _storage: any = undefined;
function storage() {
  if (_storage === undefined) {
    _storage = getStorage();
  }
  return _storage;
}

const KEYS = {
  STOPWATCH_CONFIG: "stopwatch-config",
} as const;

export function saveStopwatchConfig(config: StopwatchConfig): void {
  const s = storage();
  if (!s) return;
  s.set(KEYS.STOPWATCH_CONFIG, JSON.stringify(config));
}

export function loadStopwatchConfig(): StopwatchConfig {
  const s = storage();
  if (!s) return { ...DEFAULT_STOPWATCH_CONFIG };

  const json = s.getString(KEYS.STOPWATCH_CONFIG);
  if (!json) return { ...DEFAULT_STOPWATCH_CONFIG };

  try {
    return { ...DEFAULT_STOPWATCH_CONFIG, ...JSON.parse(json) };
  } catch {
    return { ...DEFAULT_STOPWATCH_CONFIG };
  }
}
