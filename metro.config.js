const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Some ESM packages (e.g. pocketbase) use .mjs as their main entry
config.resolver.sourceExts.push("mjs", "cjs");

// expo-sqlite needs .wasm asset resolution for web
config.resolver.assetExts.push("wasm");

// Metro 0.83.3's package exports resolution breaks internal module resolution
// in expo-router and other Expo packages when combined with NativeWind's resolver.
config.resolver.unstable_enablePackageExports = false;

// ─── Custom resolveRequest ──────────────────────────────────────────────────
// All @lingui/* v6 packages are ESM-only (no "main" field, only "exports").
// With unstable_enablePackageExports=false Metro can't resolve them, so we
// point directly to their dist entry.
const LINGUI_RESOLVE_MAP = {
  "@lingui/react": "node_modules/@lingui/react/dist/index.mjs",
  "@lingui/core": "node_modules/@lingui/core/dist/index.mjs",
  "@lingui/babel-plugin-lingui-macro":
    "node_modules/@lingui/babel-plugin-lingui-macro/dist/index.mjs",
};

const LINGUI_SUBPATH_MAP = {
  "@lingui/babel-plugin-lingui-macro/macro":
    "node_modules/@lingui/babel-plugin-lingui-macro/dist/macro.mjs",
  "@lingui/core/macro": "node_modules/@lingui/core/macro/index.mjs",
  "@lingui/react/macro": "node_modules/@lingui/react/macro/index.mjs",
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const subpathEntry =
    LINGUI_SUBPATH_MAP[moduleName] ?? LINGUI_RESOLVE_MAP[moduleName];
  if (subpathEntry) {
    return {
      filePath: path.join(__dirname, subpathEntry),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
