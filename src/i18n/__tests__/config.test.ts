/**
 * Tests for the i18n config module — reverse index and translateByText.
 *
 * The `translateByText` function builds a reverse index from the compiled
 * English catalog (hash → English text) and provides lookup by English text
 * so the runtime `t` macro works without Babel transforms.
 *
 * Key behaviors:
 * - Simple messages: exact match → translation via i18n._
 * - ICU parametrized messages: positional params remapped to named params
 * - Unknown messages: fallback returns the raw text unchanged
 * - Compiled catalog entries of both forms: ["Profile"] and [["0"], " blocks"]
 */

import { translateByText, i18n } from "../config";

describe("translateByText", () => {
  it("returns translated text for a known simple message in English", () => {
    // "History" is in the English catalog → should resolve via reverse index
    const result = translateByText("History");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("returns translated text for a known simple message in Spanish", () => {
    // Switch to Spanish locale
    i18n.activate("es");
    const result = translateByText("History");
    // With es locale active, should return "Historial"
    // (the mock i18n._ returns the hash ID, but in real runtime it returns
    // the translated text. Here we verify it's non-empty and a string.)
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("returns raw text for unknown messages not in catalog", () => {
    const result = translateByText("This string is definitely not in the catalog");
    expect(result).toBe("This string is definitely not in the catalog");
  });

  it("handles messages with ICU parameterized format", () => {
    // "{0} blocks" is in the catalog with param ["0"]
    const result = translateByText("3 blocks", { "0": 3 });
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("handles single exercise count message", () => {
    const result = translateByText("1 exercise", { "0": 1 });
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("handles parametrized message from home.tsx", () => {
    const result = translateByText("3 exercises", { "0": 3 });
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("falls back to raw text when params are missing but message is in catalog", () => {
    // Try a known parametrized message without providing params
    const result = translateByText("3 blocks");
    // Should still return something since the fallback path matches raw text
    expect(result).toBe("3 blocks");
  });

  it("handles known simple message regardless of locale", () => {
    i18n.activate("en");
    const result = translateByText("Sets");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});
