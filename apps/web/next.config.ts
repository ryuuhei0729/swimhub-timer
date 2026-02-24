import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@swimhub-timer/core", "@swimhub-timer/i18n"],
};

export default nextConfig;
