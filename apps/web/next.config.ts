import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  transpilePackages: ["@swimhub-timer/shared", "@swimhub-timer/i18n"],
  // Enable SharedArrayBuffer (required for @ffmpeg/core-mt).
  // Production serves these via public/_headers, but next dev needs this too.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
  turbopack: {
    // @ffmpeg/ffmpeg 0.12.15 の load() には classWorkerURL を new URL() に渡す分岐があり、
    // Next 16.4 の Turbopack はこれを静的解決しようとして "Can't resolve (<dynamic> | 'undefined')"
    // でビルドを止める (vercel/next.js#99965 は未マージ)。本アプリは classWorkerURL を渡さず
    // 同梱 worker.js の分岐しか通らないので、このファイル由来の解決エラーだけを抑止する。
    ignoreIssue: [
      {
        path: /@ffmpeg\/ffmpeg\/dist\/esm\/classes\.js$/,
        title: /Can't resolve \(<dynamic>/,
      },
    ],
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
