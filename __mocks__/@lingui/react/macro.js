// Manual mock for @lingui/react/macro
// Used by vitest.setup.ts and screen test files
const mockT = (strings, ...values) => {
  if (Array.isArray(strings) && strings.raw) {
    // Template literal tag: t`Hello ${name}`
    return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
  }
  if (typeof strings === "string") {
    // Regular function call: t("key")
    return strings;
  }
  return String(strings);
};

module.exports = {
  Trans: ({ children }) => children,
  useLingui: () => ({ t: mockT, i18n: { locale: "en" } }),
  t: mockT,
};
