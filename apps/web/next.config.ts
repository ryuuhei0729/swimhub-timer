import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@split-sync/core", "@split-sync/i18n"],
};

export default nextConfig;
