const STORAGE_KEY_PREFIX = "swimhub_guest_daily_usage";

function getTodayJST(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
    .toISOString()
    .split("T")[0];
}

interface DailyUsage {
  date: string;
  count: number;
}

export function canGuestUseToday(app: "scanner" | "timer"): boolean {
  try {
    const key = `${STORAGE_KEY_PREFIX}_${app}`;
    const raw = localStorage.getItem(key);
    if (!raw) return true;
    const usage: DailyUsage = JSON.parse(raw);
    const today = getTodayJST();
    if (usage.date !== today) return true;
    return usage.count < 1;
  } catch {
    return true;
  }
}

export function markGuestUsedToday(app: "scanner" | "timer"): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}_${app}`;
    const today = getTodayJST();
    const raw = localStorage.getItem(key);
    let usage: DailyUsage;
    if (raw) {
      usage = JSON.parse(raw);
      if (usage.date === today) {
        usage.count += 1;
      } else {
        usage = { date: today, count: 1 };
      }
    } else {
      usage = { date: today, count: 1 };
    }
    localStorage.setItem(key, JSON.stringify(usage));
  } catch {
    // localStorage unavailable
  }
}

export function getGuestTodayCount(app: "scanner" | "timer"): number {
  try {
    const key = `${STORAGE_KEY_PREFIX}_${app}`;
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const usage: DailyUsage = JSON.parse(raw);
    const today = getTodayJST();
    return usage.date === today ? usage.count : 0;
  } catch {
    return 0;
  }
}
