import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserPlan } from "@swimhub-timer/shared";

const APP = "swimhub_timer" as const;

function getTodayJST(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
    .toISOString()
    .split("T")[0];
}

export async function getTodayExportCount(supabase: SupabaseClient, uid: string): Promise<number> {
  const today = getTodayJST();
  const { data } = await supabase
    .from("app_daily_usage")
    .select("usage_count")
    .eq("user_id", uid)
    .eq("app", APP)
    .eq("usage_date", today)
    .single();
  return data?.usage_count ?? 0;
}

export async function canUserExport(
  supabase: SupabaseClient,
  uid: string,
  plan: UserPlan,
): Promise<boolean> {
  if (plan === "premium") return true;
  if (plan === "free") return true;
  if (plan === "guest") return true;
  const count = await getTodayExportCount(supabase, uid);
  return count < 1;
}

export async function incrementExportCount(supabase: SupabaseClient, uid: string): Promise<void> {
  const today = getTodayJST();
  const { data: existing } = await supabase
    .from("app_daily_usage")
    .select("id, usage_count")
    .eq("user_id", uid)
    .eq("app", APP)
    .eq("usage_date", today)
    .single();

  if (existing) {
    await supabase
      .from("app_daily_usage")
      .update({
        usage_count: existing.usage_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("app_daily_usage").insert({
      user_id: uid,
      app: APP,
      usage_date: today,
      usage_count: 1,
      last_used_at: new Date().toISOString(),
    });
  }
}
