import { i18n } from "@lingui/core";
import { messages as esMessages } from "./locales/es/messages";
import { messages as enMessages } from "./locales/en/messages";

i18n.load({
  es: esMessages,
  en: enMessages,
});

/**
 * Reverse index: English message text → hash ID.
 *
 * The compiled catalogs use hash-based IDs (e.g. "vERlcd" → "Profile").
 * Our runtime `t` function receives the raw message text, so we need to
 * map it back to the hash ID before looking up in the active locale.
 */
const textToId = new Map<string, string>();
const icuTextToId = new Map<string, string>();
/** For ICU messages, stores the original variable names per hash ID. */
const icuParamNames = new Map<string, string[]>();

// English is the source locale, so its translations ARE the message text.
// Compiled messages are always arrays: ["text"] or [["days"], " days"].
for (const [id, rawEntry] of Object.entries(enMessages)) {
  const entry = rawEntry as unknown as (string | string[])[];
  if (entry.length === 1 && typeof entry[0] === "string") {
    // Simple message: ["Profile"]
    textToId.set(entry[0], id);
  } else {
    // Parametrized message: [["days"], " days"] or [["0"], " member", ["1"]]
    const paramNames: string[] = [];
    let paramIdx = 0;
    const icu = entry
      .map((part) => {
        if (Array.isArray(part)) {
          paramNames.push(part[0]); // store the original variable name
          return `{${paramIdx++}}`;
        }
        return part;
      })
      .join("");
    icuTextToId.set(icu, id);
    icuParamNames.set(id, paramNames);
    // Raw text (without params) for fallback matching
    const raw = entry
      .map((part) => (Array.isArray(part) ? "" : part))
      .join("");
    textToId.set(raw.trim(), id);
  }
}

export function translateByText(
  text: string,
  params?: Record<string, unknown>,
): string {
  // First try exact text match (simple messages)
  const simpleId = textToId.get(text);
  if (simpleId) {
    return i18n._(simpleId, params);
  }
  // Try ICU form match (parametrized messages)
  const icuId = icuTextToId.get(text);
  if (icuId) {
    // Remap positional params to the original variable names
    const names = icuParamNames.get(icuId) ?? [];
    const namedParams: Record<string, unknown> = {};
    if (params && names.length > 0) {
      for (let i = 0; i < names.length; i++) {
        namedParams[names[i]] = params[String(i)];
      }
    }
    return i18n._(icuId, namedParams);
  }
  // Not in catalog — return raw text as fallback
  return text;
}

export { i18n };
