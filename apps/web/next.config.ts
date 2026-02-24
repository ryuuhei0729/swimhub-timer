import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  transpilePackages: ["@swimhub-timer/core", "@swimhub-timer/i18n"],
};

export default nextConfig;

initOpenNextCloudflareForDev();
