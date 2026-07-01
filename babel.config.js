module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      // NOTA: "nativewind/babel" (react-native-css-interop/babel) en v0.2.6
      // requiere react-native-worklets/plugin (RN ≥0.83). Nuestra RN es 0.76.6.
      // Inlineamos solo los plugins que necesitamos desde la capa base v0.1.22.
      require("react-native-css-interop/dist/babel-plugin").default,
      [
        "@babel/plugin-transform-react-jsx",
        {
          runtime: "automatic",
          importSource: "react-native-css-interop",
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
