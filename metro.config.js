const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Some ESM packages (e.g. pocketbase) use .mjs as their main entry
config.resolver.sourceExts.push("mjs", "cjs");

// expo-sqlite needs .wasm asset resolution for web
config.resolver.assetExts.push("wasm");

// Enable package exports so ESM-only packages (e.g. @lingui/* v6, pocketbase) resolve.
// Previously disabled due to conflicts with expo-router + NativeWind on Metro 0.83.0;
// these have been resolved in Metro 0.83.3 + expo-router 6.0.24.
config.resolver.unstable_enablePackageExports = true;

// ─── Custom resolveRequest ──────────────────────────────────────────────────
// @lingui/core/macro and @lingui/react/macro are Babel macros that depend on
// Node-only packages (babel-plugin-macros → path, resolve). They cannot run in
// React Native. We redirect them to a local runtime wrapper.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@lingui/core/macro") {
    return {
      filePath: path.join(__dirname, "src/i18n/macro-runtime.ts"),
      type: "sourceFile",
    };
  }
  if (moduleName === "@lingui/react/macro") {
    // Trans from @lingui/react/macro is the same as Trans from @lingui/react
    // when not using compile-time transforms.
    return context.resolveRequest(context, "@lingui/react", platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
