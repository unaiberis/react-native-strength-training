/**
 * Runtime replacement for `@lingui/core/macro` and `@lingui/react/macro`.
 *
 * These macro modules are designed for Babel/webpack and import Node-only
 * packages (babel-plugin-macros, path, etc.) that crash in React Native.
 * Instead, we provide the equivalent runtime implementations here.
 */
import { translateByText } from "./config";

/**
 * Tagged-template `t` for inline translations.
 *
 * Usage: t`Hello` → translates "Hello" via the active Lingui catalog.
 *        t`${name} has ${count} items` → translates with interpolation.
 *
 * Fallback: returns the raw message text when Lingui hasn't been activated
 * yet (e.g. during module evaluation before i18n.activate() is called).
 */
export function t(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  const raw = strings.reduce(
    (acc, str, i) => acc + str + (values[i] ?? ""),
    "",
  );

  // Build ICU message with positional params so translators see {0}, {1}, …
  const icuMessage = strings.reduce(
    (acc, str, i) =>
      i === 0 ? str : `${acc}{${i - 1}}${str}`,
    "",
  );

  const params: Record<string, unknown> = {};
  for (let i = 0; i < values.length; i++) {
    params[String(i)] = values[i];
  }

  try {
    // Try ICU form first (for parametrized messages), then raw text lookup
    const fromIcu = translateByText(icuMessage, params);
    if (fromIcu !== icuMessage) {
      // ICU form found a translation with params
      return fromIcu;
    }
    // Fall back to raw text lookup (simple strings without params)
    return translateByText(raw);
  } catch {
    // Lingui throws if called before i18n.activate(). Since t may be called
    // during module evaluation (before app init), fall back to the raw text.
    return raw;
  }
}

export function msg(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  return t(strings, ...values);
}

export { Trans } from "@lingui/react";
