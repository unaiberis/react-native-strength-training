import type { LinguiConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-json";

const config: LinguiConfig = {
  locales: ["es", "en", "eu"],
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
  // NOTE: runtimeConfigModule intentionally omitted.
  // When set, Lingui metro transformer generates compiled catalogs that
  // try to import "./index" from the project root, causing
  // "Unable to resolve module ./index" errors in Metro.
  // We import i18n directly in src/i18n/index.ts instead.
};

export default config;
