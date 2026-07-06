import { I18n } from "@lingui/core";
import { detectLocale } from "./detector";

// Lingui i18n instance
export const i18n = new I18n({});

// Activate Spanish as default locale at module load time.
// This ensures i18n.t() is always available synchronously, even before
// initI18n() runs in useEffect.
//
// Without this, Zod schema factory functions like getLoginSchema() that
// call i18n.t("Email is required") during render would throw:
//   "Attempted to call a translation function without setting a locale"
//
// With a default locale active, missing keys return the source string
// (e.g., i18n.t("Email is required") → "Email is required").
i18n.activate("es");

// Lazy-loaded catalog importers — one per locale per namespace
const catalogImporters: Record<string, Record<string, () => Promise<{ default: Record<string, string> }>>> = {
  en: {
    auth: () => require("./locales/en/auth.json"),
    workout: () => require("./locales/en/workout.json"),
    history: () => require("./locales/en/history.json"),
    exercises: () => require("./locales/en/exercises.json"),
    records: () => require("./locales/en/records.json"),
    profile: () => require("./locales/en/profile.json"),
  },
  es: {
    auth: () => require("./locales/es/auth.json"),
    workout: () => require("./locales/es/workout.json"),
    history: () => require("./locales/es/history.json"),
    exercises: () => require("./locales/es/exercises.json"),
    records: () => require("./locales/es/records.json"),
    profile: () => require("./locales/es/profile.json"),
  },
  eu: {
    auth: () => require("./locales/eu/auth.json"),
    workout: () => require("./locales/eu/workout.json"),
    history: () => require("./locales/eu/history.json"),
    exercises: () => require("./locales/eu/exercises.json"),
    records: () => require("./locales/eu/records.json"),
    profile: () => require("./locales/eu/profile.json"),
  },
};

/**
 * Initialize i18n: detect locale, load common namespace, activate locale.
 * Call this once at app startup (in I18nProvider or _layout.tsx).
 */
export function initI18n(): I18n {
  const locale = detectLocale();

  // Load common catalog synchronously for immediate use (tab labels, headers)
  try {
    const commonEn = require("./locales/en/common.json");
    const commonEs = require("./locales/es/common.json");
    const commonEu = require("./locales/eu/common.json");
    i18n.load({ en: commonEn, es: commonEs, eu: commonEu });
  } catch {
    // Catalogs may not exist yet during initial setup — continue with empty catalogs
  }

  i18n.activate(locale);
  return i18n;
}

/**
 * Lazy-load a feature namespace catalog for the given locale.
 * Safe to call multiple times — no-op if already loaded.
 */
export async function loadCatalog(locale: string, namespace: string): Promise<void> {
  const importer = catalogImporters[locale]?.[namespace];
  if (!importer) return;

  try {
    const mod = await importer();
    const messages = mod.default ?? mod;
    i18n.load(locale, messages);
  } catch {
    // Catalog file may not exist yet — graceful degradation
  }
}
