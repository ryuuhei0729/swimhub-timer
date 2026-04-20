/**
 * Issue #2: UUID 検証テスト — swimhub-timer
 *
 * Sprint Contract 検証観点:
 *   - getStripe() 呼び出し直前に UUID_REGEX 検証が挿入されていること
 *   - 不正 user.id の場合は 400 を返し、Stripe API を一切呼ばないこと
 *   - 正常 UUID の場合は 400 を返さないこと (Stripe 処理に進む)
 *
 * テスト対象: src/app/api/stripe/checkout/route.ts の POST ハンドラー
 *
 * timer の認証パターン: createServerComponentClient → supabase.auth.getUser()
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// モジュールモック
// ---------------------------------------------------------------------------

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
}));

// timer は createServerComponentClient を使う
vi.mock("@/lib/supabase/server", () => ({
  createServerComponentClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// ヘルパー: テスト用 NextRequest を生成
// ---------------------------------------------------------------------------
function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// ヘルパー: 指定 uid で認証済みの supabase クライアントを作成
// ---------------------------------------------------------------------------
function makeMockSupabase(uid: string, authError: Error | null = null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: authError ? { user: null } : { user: { id: uid, email: "test@example.com" } },
        error: authError,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// テスト本体
// ---------------------------------------------------------------------------
describe("POST /api/stripe/checkout (timer) — UUID 検証", () => {
  let mockGetStripe: ReturnType<typeof vi.fn>;
  let mockCreateServerComponentClient: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetAllMocks();

    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_test_monthly";
    process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID = "price_test_yearly";
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

    const stripeModule = await import("@/lib/stripe");
    mockGetStripe = vi.mocked(stripeModule.getStripe);

    const supabaseModule = await import("@/lib/supabase/server");
    mockCreateServerComponentClient = vi.mocked(supabaseModule.createServerComponentClient);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------------------
  // 異常系: 不正 UUID
  // -------------------------------------------------------------------------
  describe("不正 user.id は 400 を返す", () => {
    const invalidIds = [
      { label: '"invalid" 文字列', id: "invalid" },
      { label: "空文字", id: "" },
      { label: "スペース混入", id: "  " },
      { label: "SQL インジェクション断片", id: "' OR '1'='1" },
      { label: "ハイフンなし 32 桁 hex", id: "550e8400e29b41d4a716446655440000" },
      { label: "5 セクション UUID (不正形式)", id: "550e8400-e29b-41d4-a716-446655440000-extra" },
    ];

    for (const { label, id } of invalidIds) {
      it(`${label} → 400 "不正なユーザーIDです"`, async () => {
        mockCreateServerComponentClient.mockResolvedValue(makeMockSupabase(id));
        const { POST } = await import("./route");
        const req = makeRequest({ priceId: "price_test_monthly" });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("不正なユーザーIDです");
        // Stripe API が呼ばれていないことを確認
        expect(mockGetStripe).not.toHaveBeenCalled();
      });
    }
  });

  // -------------------------------------------------------------------------
  // 正常系: 有効 UUID では UUID バリデーションを通過する
  // -------------------------------------------------------------------------
  describe("有効 UUID は UUID 検証を通過する", () => {
    const validUuids = [
      "550e8400-e29b-41d4-a716-446655440000",
      "00000000-0000-0000-0000-000000000000",
      "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF", // 大文字 (i フラグ確認)
    ];

    for (const uid of validUuids) {
      it(`UUID "${uid}" は UUID 検証を通過し Stripe 処理に到達する`, async () => {
        mockCreateServerComponentClient.mockResolvedValue(makeMockSupabase(uid));

        // Stripe は失敗させてよい — UUID 検証通過後のエラーであることを確認するだけ
        mockGetStripe.mockImplementation(() => {
          throw new Error("stripe-mock-error");
        });

        const { POST } = await import("./route");
        const req = makeRequest({ priceId: "price_test_monthly" });
        const res = await POST(req);

        // UUID 検証を通過し、getStripe() が実際に呼ばれたことを保証する
        expect(mockGetStripe).toHaveBeenCalled();
        expect(res.status).not.toBe(400);
      });
    }
  });

  // -------------------------------------------------------------------------
  // 未認証
  // -------------------------------------------------------------------------
  it("未認証リクエストは 401 を返す", async () => {
    mockCreateServerComponentClient.mockResolvedValue(
      makeMockSupabase("", new Error("not authenticated")),
    );
    const { POST } = await import("./route");
    const req = makeRequest({ priceId: "price_test_monthly" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // priceId バリデーション
  // -------------------------------------------------------------------------
  it("priceId が空の場合は 400 を返す", async () => {
    mockCreateServerComponentClient.mockResolvedValue(
      makeMockSupabase("550e8400-e29b-41d4-a716-446655440000"),
    );
    const { POST } = await import("./route");
    const req = makeRequest({ priceId: "" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("許可されていない priceId は 400 を返す", async () => {
    mockCreateServerComponentClient.mockResolvedValue(
      makeMockSupabase("550e8400-e29b-41d4-a716-446655440000"),
    );
    const { POST } = await import("./route");
    const req = makeRequest({ priceId: "price_evil_injection" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
