import { NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getTodayExportCount, canUserExport } from "@/lib/supabase/usage";
import type { UserPlan } from "@swimhub-timer/core";

export async function GET() {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const uid = user.id;

  try {
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("plan")
      .eq("id", uid)
      .single<{ plan: string }>();

    const plan: UserPlan = sub?.plan === "premium" ? "premium" : "free";
    const todayCount = await getTodayExportCount(supabase, uid);
    const canExport = await canUserExport(supabase, uid, plan);

    return NextResponse.json({
      canExport,
      todayCount,
      dailyLimit: plan === "premium" ? null : 1,
    });
  } catch (error) {
    console.error("Export check error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
