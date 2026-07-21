import { useEffect, useState, useCallback } from "react";
import { I18nProvider as LinguiProvider } from "@lingui/react";
import { i18n } from "./config";
import { Platform } from "react-native";

export const LOCALE_STORAGE_KEY = "app-locale";

/**
 * Persist the selected locale to secure store (native) or localStorage (web).
 */
async function persistLocale(locale: string): Promise<void> {
  try {
    const { setItemAsync } = await import("expo-secure-store");
    await setItemAsync(LOCALE_STORAGE_KEY, locale);
  } catch {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
    // Silently fail — locale switching still works for the session
  }
}

/**
 * Read the stored locale preference.
 */
async function readStoredLocale(): Promise<string | null> {
  try {
    const { getItemAsync } = await import("expo-secure-store");
    return await getItemAsync(LOCALE_STORAGE_KEY);
  } catch {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return localStorage.getItem(LOCALE_STORAGE_KEY);
    }
    return null;
  }
}

/**
 * Detect device locale, falling back to "es".
 */
function detectDeviceLocale(): string {
  try {
    // expo-localization is a native module — only available at runtime
    // We use require() to avoid static import issues in test environment
    const Localization = require("expo-localization");
    const locales = Localization.getLocales();
    const lang = locales?.[0]?.languageCode;
    if (lang === "en") return "en";
    return "es";
  } catch {
    return "es";
  }
}

/**
 * Language context for consumers that need to know or set the current locale.
 */
export interface LanguageContextValue {
  locale: string;
  setLocale: (locale: string) => void;
}

/**
 * React context provider that wraps the app with Lingui i18n provider
 * and detects device locale on mount.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<string>("es");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function init() {
      // Try stored preference first, then device locale
      const stored = await readStoredLocale();
      const initial = stored ?? detectDeviceLocale();
      i18n.activate(initial);
      setLocaleState(initial);
      setLoaded(true);
    }
    init();
  }, []);

  const setLocale = useCallback((newLocale: string) => {
    i18n.activate(newLocale);
    setLocaleState(newLocale);
    persistLocale(newLocale).catch(() => {});
  }, []);

  if (!loaded) {
    // Render children with default locale while loading
    return <>{children}</>;
  }

  return (
    <LinguiProvider i18n={i18n}>
      {children}
    </LinguiProvider>
  );
}
