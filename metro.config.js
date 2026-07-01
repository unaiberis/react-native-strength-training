const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Some ESM packages (e.g. pocketbase) use .mjs as their main entry
config.resolver.sourceExts.push("mjs", "cjs");

module.exports = withNativeWind(config, { input: "./global.css" });
