/**
 * Mock for @lingui/react — used in tests where i18n is not needed.
 */

import type { ReactNode } from "react";

export function I18nProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useLingui() {
  return {
    i18n: {
      _activeLocale: "es",
      locale: "es",
      availableLocales: ["es", "en"],
    },
    t: (str: string) => str,
  };
}

export function Trans({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
