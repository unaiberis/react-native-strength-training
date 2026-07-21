import { formatter } from "@lingui/format-po";

const config = {
  locales: ["en", "es"] as const,
  sourceLocale: "en" as const,
  catalogs: [
    {
      path: "<rootDir>/src/i18n/locales/{locale}/messages",
      include: ["src", "app"],
    },
  ],
  format: formatter({ lineNumbers: false }),
};

export default config;
