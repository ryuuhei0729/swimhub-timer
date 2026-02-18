import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@swimhub-timer/core", "@swimhub-timer/i18n"],
};

export default nextConfig;
