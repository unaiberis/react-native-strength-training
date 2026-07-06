import { getLocales } from "expo-localization";

const SUPPORTED_LOCALES = ["es", "en", "eu"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Detect the device locale and map it to a supported locale.
 *
 * Prioridad: es > eu > en.
 * - Si el browser tiene castellano en su lista de idiomas → es
 * - Si no, pero tiene euskera → eu
 * - Si no, pero tiene inglés → en
 * - Si no tiene ninguno → es (fallback)
 *
 * Esto asegura que un usuario con navegador en inglés pero capacidad
 * de español (ej: ["en-US", "es-ES"]) vea la app en castellano.
 */
export function detectLocale(): SupportedLocale {
  const locales = getLocales();

  if (!locales || locales.length === 0) {
    return "es";
  }

  let hasEnglish = false;

  for (const locale of locales) {
    const languageTag = locale?.languageTag;
    if (!languageTag) continue;

    const langCode = languageTag.split(/[-_]/)[0]?.toLowerCase();
    if (!langCode) continue;

    if (langCode === "es") return "es";
    if (langCode === "eu") return "eu";
    if (langCode === "en") hasEnglish = true;
  }

  return hasEnglish ? "en" : "es";
}

function isSupportedLocale(code: string): code is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(code);
}
