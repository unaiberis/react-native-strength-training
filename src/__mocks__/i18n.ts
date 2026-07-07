/**
 * Mock i18n module for Jest tests.
 * Avoids importing @lingui/core (ESM-only) which Jest cannot parse.
 */

class MockI18n {
  private _messages: Record<string, Record<string, string>> = {};
  private _activeLocale: string = "en";

  load(locale: any, messages?: any) {
    if (typeof locale === "object") {
      Object.assign(this._messages, locale);
    } else if (messages) {
      this._messages[locale] = messages;
    }
  }

  activate(locale: string) {
    this._activeLocale = locale;
  }

  t(strings: TemplateStringsArray | string, ...values: any[]) {
    const key = typeof strings === "string" ? strings : String.raw(strings, ...values);
    return this._messages[this._activeLocale]?.[key] ?? key;
  }

  locale() {
    return this._activeLocale;
  }
}

export const i18n = new MockI18n();
