const STORAGE_KEY_PREFIX = "swimhub_guest_daily_usage";

function getMMKV() {
  try {
    const { createMMKV } = require("react-native-mmkv");
    return createMMKV({ id: "swimhub-timer-settings" });
  } catch {
    return null;
  }
}

function getTodayJST(): string {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  )
    .toISOString()
    .split("T")[0];
}

interface DailyUsage {
  date: string;
  count: number;
}

function readUsage(app: "scanner" | "timer"): DailyUsage | null {
  try {
    const storage = getMMKV();
    if (!storage) return null;
    const key = `${STORAGE_KEY_PREFIX}_${app}`;
    const raw = storage.getString(key);
    if (!raw) return null;
    return JSON.parse(raw) as DailyUsage;
  } catch {
    return null;
  }
}

function writeUsage(app: "scanner" | "timer", usage: DailyUsage): void {
  try {
    const storage = getMMKV();
    if (!storage) return;
    const key = `${STORAGE_KEY_PREFIX}_${app}`;
    storage.set(key, JSON.stringify(usage));
  } catch {
    // MMKV unavailable
  }
}

export function canGuestUseToday(app: "scanner" | "timer"): boolean {
  try {
    const usage = readUsage(app);
    if (!usage) return true;
    const today = getTodayJST();
    if (usage.date !== today) return true;
    return usage.count < 1;
  } catch {
    return true;
  }
}

export function markGuestUsedToday(app: "scanner" | "timer"): void {
  try {
    const today = getTodayJST();
    const usage = readUsage(app);
    if (usage && usage.date === today) {
      writeUsage(app, { date: today, count: usage.count + 1 });
    } else {
      writeUsage(app, { date: today, count: 1 });
    }
  } catch {
    // MMKV unavailable
  }
}

export function getGuestTodayCount(app: "scanner" | "timer"): number {
  try {
    const usage = readUsage(app);
    if (!usage) return 0;
    const today = getTodayJST();
    return usage.date === today ? usage.count : 0;
  } catch {
    return 0;
  }
}
