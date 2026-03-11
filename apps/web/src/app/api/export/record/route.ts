import { NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { incrementExportCount } from "@/lib/supabase/usage";

export async function POST() {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const uid = user.id;

  try {
    await incrementExportCount(supabase, uid);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Export record error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
