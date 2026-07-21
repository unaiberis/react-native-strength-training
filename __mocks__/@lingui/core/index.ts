/**
 * Mock for @lingui/core — used in tests where i18n is not needed.
 * The t() macro is already mocked in __mocks__/@lingui/core/macro.ts.
 */

const mockI18n = {
  _activeLocale: "es",
  _locale: "es",
  activate: (locale: string) => {
    mockI18n._activeLocale = locale;
  },
  load: () => {},
  locale: "es",
  availableLocales: ["es", "en"],
};

export function setupI18n() {
  return mockI18n;
}

export const i18n = mockI18n;

export type Messages = Record<string, string>;
