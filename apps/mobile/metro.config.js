const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root for changes to shared packages (デフォルトを保持)
config.watchFolders = [...(config.watchFolders || []), monorepoRoot];

// react の重複を解決: 全てのパッケージが同じ react インスタンスを使うようにする
// apps/mobile の node_modules には react が存在しないため、monorepoRoot の node_modules を参照する
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.resolve(monorepoRoot, "node_modules/react"),
  "react-native": path.resolve(monorepoRoot, "node_modules/react-native"),
};

// Resolve modules: local first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
