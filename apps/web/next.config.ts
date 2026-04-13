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
};

export default nextConfig;

initOpenNextCloudflareForDev();
