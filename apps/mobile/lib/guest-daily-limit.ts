import {
  canGuestUseToday as _canGuestUseToday,
  markGuestUsedToday as _markGuestUsedToday,
  getGuestTodayCount as _getGuestTodayCount,
} from "@swimhub-timer/shared";

function getMMKV() {
  try {
    const { createMMKV } = require("react-native-mmkv");
    return createMMKV({ id: "swimhub-timer-settings" });
  } catch {
    return null;
  }
}

const getItem = (key: string): string | null => {
  try {
    const storage = getMMKV();
    if (!storage) return null;
    return storage.getString(key) ?? null;
  } catch {
    return null;
  }
};

const setItem = (key: string, value: string): void => {
  try {
    const storage = getMMKV();
    if (!storage) return;
    storage.set(key, value);
  } catch {
    // MMKV unavailable
  }
};

export function canGuestUseToday(app: "scanner" | "timer"): boolean {
  return _canGuestUseToday(app, getItem);
}

export function markGuestUsedToday(app: "scanner" | "timer"): void {
  _markGuestUsedToday(app, getItem, setItem);
}

export function getGuestTodayCount(app: "scanner" | "timer"): number {
  return _getGuestTodayCount(app, getItem);
}
