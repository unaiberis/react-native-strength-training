const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Some ESM packages (e.g. pocketbase) use .mjs as their main entry
config.resolver.sourceExts.push("mjs", "cjs");

// Metro 0.83.3's package exports resolution breaks internal module resolution
// in expo-router and other Expo packages when combined with NativeWind's resolver.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });
