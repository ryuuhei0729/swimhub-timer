import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | SplitSync",
  description: "SplitSyncのプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-zinc-300">
      <h1 className="mb-8 text-2xl font-bold text-white">
        プライバシーポリシー
      </h1>
      <p className="mb-6 text-sm text-zinc-500">最終更新日: 2026年2月17日</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">はじめに</h2>
          <p>
            SplitSync（以下「本アプリ」）は、水泳のレース動画にストップウォッチをオーバーレイするためのアプリです。本プライバシーポリシーでは、本アプリにおける個人情報の取り扱いについて説明します。
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">
            収集する情報
          </h2>
          <p>
            本アプリは、個人情報を収集しません。動画の処理はすべてお使いのデバイス上でローカルに行われ、外部サーバーへのデータ送信は行いません。
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">
            デバイスへのアクセス
          </h2>
          <p>本アプリは、以下の機能にアクセスする場合があります：</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>フォトライブラリ</strong>
              ：動画のインポートおよび書き出した動画の保存のため
            </li>
            <li>
              <strong>マイク</strong>
              ：動画内のスタート信号音を検出するため
            </li>
          </ul>
          <p className="mt-2">
            これらのアクセスはデバイス上での処理にのみ使用され、データが外部に送信されることはありません。
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">
            第三者への提供
          </h2>
          <p>
            本アプリは個人情報を収集しないため、第三者への情報提供は行いません。
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">
            お問い合わせ
          </h2>
          <p>
            本ポリシーに関するご質問は、アプリのサポートページよりお問い合わせください。
          </p>
        </div>
      </section>

      <div className="mt-12">
        <Link href="/" className="text-sm text-cyan-400 hover:underline">
          トップページに戻る
        </Link>
      </div>
    </main>
  );
}
