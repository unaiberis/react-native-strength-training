const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// NOTE: Lingui metro transformer intentionally omitted.
// The @lingui/babel-plugin-lingui-macro in babel.config.js compiles
// t() and <Trans> at compile time. The metro transformer is only
// needed when using .po catalog files — we use JSON catalogs loaded
// directly via require(), so the transformer is unnecessary and
// causes "Unable to resolve module ./index" errors in Metro.

// Some ESM packages (e.g. pocketbase) use .mjs as their main entry
config.resolver.sourceExts.push("mjs", "cjs");

// Workaround for @expo/metro-runtime RSC module resolution
// Metro's resolver chain (Expo → NativeWind) can fail to resolve
// @expo/metro-runtime/rsc/runtime even though the file exists.
// This manual alias ensures it always resolves.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@expo/metro-runtime/rsc/runtime": path.join(
    __dirname,
    "node_modules/@expo/metro-runtime/rsc/runtime.js",
  ),
  "@expo/metro-runtime/rsc/virtual": path.join(
    __dirname,
    "node_modules/@expo/metro-runtime/rsc/virtual.js",
  ),
};

// Ensure expo-router/entry resolves correctly even after cache clear
config.resolver.extraNodeModules["expo-router/entry"] = path.join(
  __dirname,
  "node_modules/expo-router/entry.js",
);

// Custom resolver for expo-sqlite web compatibility
// expo-sqlite v16 is missing SQLiteModule/SQLiteModule.node in the web directory
// These modules are only required at bundle-time by Metro, not at runtime on web
// The module name can be a relative path (e.g. ../web/SQLiteModule.node)
// or an absolute path (e.g. expo-sqlite/web/SQLiteModule.node)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const sqliteModulePattern = /SQLiteModule(?:\.node)?$/;
  if (sqliteModulePattern.test(moduleName)) {
    return {
      type: "sourceFile",
      filePath: path.join(
        __dirname,
        "node_modules",
        "expo-sqlite",
        "web",
        "wa-sqlite",
        "sqlite-api.js",
      ),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
