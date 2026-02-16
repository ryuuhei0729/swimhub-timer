const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root for changes to shared packages
config.watchFolders = [monorepoRoot];

// Disable hierarchical (walking up directory tree) module lookup.
// Forces Metro to ONLY use nodeModulesPaths below, in order.
config.resolver.disableHierarchicalLookup = true;

// Resolve modules: local first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
