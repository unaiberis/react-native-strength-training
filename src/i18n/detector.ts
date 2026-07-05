import { getLocales } from "expo-localization";

const SUPPORTED_LOCALES = ["en", "es"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Detect the device locale and map it to a supported locale.
 * Falls back to "en" if the device locale is not supported.
 */
export function detectLocale(): SupportedLocale {
  const locales = getLocales();

  if (!locales || locales.length === 0) {
    return "en";
  }

  for (const locale of locales) {
    const languageTag = locale?.languageTag;
    if (!languageTag) continue;

    // Extract language code from tag (e.g. "es-ES" → "es", "en_US" → "en")
    const langCode = languageTag.split(/[-_]/)[0]?.toLowerCase();

    if (langCode && isSupportedLocale(langCode)) {
      return langCode;
    }
  }

  return "en";
}

function isSupportedLocale(code: string): code is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(code);
}
