import { formatter } from "@lingui/format-po";

const config = {
  locales: ["es", "en"] as const,
  sourceLocale: "es" as const,
  catalogs: [
    {
      path: "<rootDir>/src/i18n/locales/{locale}/messages",
      include: ["src"],
    },
  ],
  format: formatter({ lineNumbers: false }),
};

export default config;
