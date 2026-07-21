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
  // Core translation method: given a message ID (hash) and optional params,
  // returns the translated text from the active catalog.
  // In test mode the catalogs aren't loaded, so we return the source message
  // from the English catalog or the hash as fallback.
  _: (id: string, params?: Record<string, unknown>) => {
    if (params) {
      let result = id;
      for (const [key, val] of Object.entries(params)) {
        result = result.replace(`{${key}}`, String(val ?? ""));
      }
      return result;
    }
    return id;
  },
};

export function setupI18n() {
  return mockI18n;
}

export const i18n = mockI18n;

export type Messages = Record<string, string>;
