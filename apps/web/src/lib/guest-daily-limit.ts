import {
  canGuestUseToday as _canGuestUseToday,
  markGuestUsedToday as _markGuestUsedToday,
  getGuestTodayCount as _getGuestTodayCount,
} from "@swimhub-timer/shared";

const getItem = (key: string) => localStorage.getItem(key);
const setItem = (key: string, value: string) => localStorage.setItem(key, value);

export function canGuestUseToday(app: "scanner" | "timer"): boolean {
  return _canGuestUseToday(app, getItem);
}

export function markGuestUsedToday(app: "scanner" | "timer"): void {
  _markGuestUsedToday(app, getItem, setItem);
}

export function getGuestTodayCount(app: "scanner" | "timer"): number {
  return _getGuestTodayCount(app, getItem);
}
