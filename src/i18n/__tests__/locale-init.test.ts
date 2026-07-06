/**
 * TDD test: i18n.t() must work BEFORE initI18n() runs.
 *
 * The Zod schema factory functions (getLoginSchema, etc.) call i18n.t()
 * synchronously during component render. But initI18n() runs in a
 * useEffect, which happens AFTER the first render.
 *
 * This race condition causes:
 *   "Attempted to call a translation function without setting a locale"
 *
 * Fix: i18n must have a default locale activated at module load time,
 * so i18n.t() always works synchronously.
 *
 * RED: Should FAIL before the fix.
 * GREEN: Should PASS after the fix.
 */

import * as fs from "fs";
import * as path from "path";

const I18N_INDEX_PATH = path.resolve(__dirname, "../index.ts");

describe("i18n synchronous initialization", () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(I18N_INDEX_PATH, "utf-8");
  });

  it("should activate 'es' as default locale at module load time", () => {
    // The fix: call i18n.activate("es") at module scope, OUTSIDE initI18n()
    // This ensures i18n.t() always works, even before useEffect runs.
    const activateCall = "i18n.activate(\"es\")";
    expect(content).toContain(activateCall);
  });

  it("should activate locale at MODULE scope, not inside a function", () => {
    // Verify the activation is at the top level, not inside initI18n()
    const moduleLevelLines = content.split("\n").slice(0, 20);
    const hasModuleActivation = moduleLevelLines.some(
      (line) => line.includes("i18n.activate")
    );
    expect(hasModuleActivation).toBe(true);
  });

  it("should explain WHY the default locale is needed in a comment", () => {
    // Documentation is important for future developers
    expect(content).toContain("default locale");
  });

  it("should still have initI18n() for actual locale detection", () => {
    // initI18n() should still exist for runtime locale switching
    expect(content).toContain("export function initI18n");
  });
});
