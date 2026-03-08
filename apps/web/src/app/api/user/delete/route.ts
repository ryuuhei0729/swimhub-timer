import { NextResponse, type NextRequest } from "next/server";
import { verifyAuth, createAdminClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if ("error" in authResult) {
    return authResult.error;
  }
  const { uid } = authResult.result;

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
