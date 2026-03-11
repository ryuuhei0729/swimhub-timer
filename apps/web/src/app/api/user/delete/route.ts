import { NextResponse } from "next/server";
import { createServerComponentClient, createAdminClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const uid = user.id;

  try {
    const adminClient = createAdminClient();

    // Delete user's subscription data
    await adminClient.from("user_subscriptions").delete().eq("id", uid);

    // Delete the Supabase auth user
    const { error: deleteError } =
      await adminClient.auth.admin.deleteUser(uid);

    if (deleteError) {
      console.error("User deletion error:", deleteError);
      return NextResponse.json(
        { error: "アカウントの削除に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
