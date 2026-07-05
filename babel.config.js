module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Lingui macro plugin — compiles t(), <Trans>, plural() at build time
      ["@lingui/babel-plugin-lingui-macro", { async: true }],
      "react-native-worklets/plugin",
    ],
  };
};
