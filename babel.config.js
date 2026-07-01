module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      // Nota: nativewind/babel (react-native-css-interop/babel) devuelve un objeto
      // con { plugins: [...] } que es formato de PRESET, no de plugin. @babel/core
      // nuevo rechaza .plugins como propiedad de plugin. Inlineamos los 3 plugins
      // internos directamente.
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
