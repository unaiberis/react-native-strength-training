import type { LinguiConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-json";

const config: LinguiConfig = {
  locales: ["en", "es"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "src/i18n/locales/{locale}",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/__tests__/**", "**/*.test.*"],
    },
  ],
  format: formatter({ lineNumbers: false }),
  orderBy: "messageId",
  rootDir: ".",
  runtimeConfigModule: {
    i18n: ["@lingui/core", "i18n"],
  },
};

export default config;
