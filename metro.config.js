const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Some ESM packages (e.g. pocketbase) use .mjs as their main entry
config.resolver.sourceExts.push('mjs', 'cjs');

// Workaround for @expo/metro-runtime RSC module resolution
// Metro's resolver chain (Expo → NativeWind) can fail to resolve
// @expo/metro-runtime/rsc/runtime even though the file exists.
// This manual alias ensures it always resolves.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@expo/metro-runtime/rsc/runtime': path.join(
    __dirname,
    'node_modules/@expo/metro-runtime/rsc/runtime.js'
  ),
  '@expo/metro-runtime/rsc/virtual': path.join(
    __dirname,
    'node_modules/@expo/metro-runtime/rsc/virtual.js'
  ),
};

module.exports = withNativeWind(config, { input: './global.css' });
