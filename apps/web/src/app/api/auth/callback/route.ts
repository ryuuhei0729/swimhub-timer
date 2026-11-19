import { handleAuthCallback } from "@ryuuhei0729/swimhub-oauth/web";
import { defaultLocale } from "@swimhub-timer/i18n";
import type { NextRequest } from "next/server";
import {
  buildLastLoginMethodCookie,
  isLoginMethod,
  LOGIN_METHOD_QUERY_PARAM,
} from "@/lib/lastLoginMethod";

/**
 * OAuth (PKCE の code) / メール確認 (token_hash + type) の両コールバックを
 * 共有パッケージ (@ryuuhei0729/swimhub-oauth/web) の handleAuthCallback に委譲する。
 * 実装本体・挙動の詳細は同パッケージの JSDoc を参照。
 *
 * timer には type 別の専用遷移先が無いため、getDefaultRedirectForOtpType は
 * defaultRedirectPath と同じ `/${locale}` を返す (両者を一致させないと
 * redirect_to 未指定時のフォールバック先が経路によって食い違ってしまう)。
 */
export async function GET(request: NextRequest) {
  // ブラウザ言語検出 / cookie 永続化は行わず、scanner・swim-hub と同様にデフォルトロケールへ。
  const locale = defaultLocale;

  // 「直近で利用」ラベル用。OAuth (code) でセッションが確立した (= ログイン成功) ときだけ記録する
  const rawLoginMethod = request.nextUrl.searchParams.get(LOGIN_METHOD_QUERY_PARAM);
  const loginMethod = isLoginMethod(rawLoginMethod) ? rawLoginMethod : null;
  let loginSucceeded = false;

  const response = await handleAuthCallback({
    request,
    defaultRedirectPath: `/${locale}`,
    loginPath: `/${locale}/login`,
    getDefaultRedirectForOtpType: () => `/${locale}`,
    onSessionEstablished: async (_session, { flow }) => {
      if (flow === "code") {
        loginSucceeded = true;
      }
    },
  });

  if (loginSucceeded && loginMethod) {
    response.headers.append(
      "Set-Cookie",
      buildLastLoginMethodCookie(loginMethod, request.nextUrl.protocol === "https:"),
    );
  }

  return response;
}
