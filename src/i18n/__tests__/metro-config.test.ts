/**
 * TDD tests for i18n configuration.
 *
 * These tests ensure the correct Lingui setup to prevent
 * "Unable to resolve module ./index" errors at runtime.
 *
 * Key insight: We use JSON catalog files loaded via require().
 * The @lingui/babel-plugin-lingui-macro compiles t() and <Trans>
 * at build time — this is necessary and must be in babel.config.js.
 *
 * The @lingui/metro-transformer is NOT needed because it compiles
 * .po files at bundle time, but we use JSON catalogs. Adding it
 * causes Metro to generate "Unable to resolve module ./index" errors.
 *
 * RED: These tests should FAIL before the fix.
 * GREEN: These tests should PASS after the fix.
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../../..");
const METRO_CONFIG = path.join(ROOT, "metro.config.js");
const LINGUI_CONFIG = path.join(ROOT, "lingui.config.ts");
const BABEL_CONFIG = path.join(ROOT, "babel.config.js");
const I18N_INDEX = path.join(ROOT, "src/i18n/index.ts");

describe("i18n Metro Configuration", () => {
  describe("metro.config.js", () => {
    let metroContent: string;

    beforeAll(() => {
      metroContent = fs.readFileSync(METRO_CONFIG, "utf-8");
    });

    it("should exist", () => {
      expect(fs.existsSync(METRO_CONFIG)).toBe(true);
    });

    it("should NOT have Lingui metro transformer (unnecessary for JSON catalogs)", () => {
      // The metro transformer compiles .po files at bundle time.
      // We use JSON catalogs loaded via require(), so the transformer
      // is unnecessary. Adding it causes "Unable to resolve module ./index".
      expect(metroContent).not.toContain("@lingui/metro-transformer");
    });

    it("should NOT set babelTransformerPath (we only need the babel plugin)", () => {
      // The babel-plugin-lingui-macro in babel.config.js handles
      // macro compilation. The metro transformer is only needed for .po files.
      expect(metroContent).not.toContain("babelTransformerPath");
    });

    it("should pass through unresolved modules to default resolver", () => {
      // The custom resolveRequest should pass through modules it doesn't handle
      // to the default resolver, not block them
      expect(metroContent).toContain("return context.resolveRequest(context, moduleName, platform)");
    });

    it("should have SQLiteModule.node resolver matching relative and absolute paths", () => {
      // The resolver must match BOTH:
      //   - Relative path: "../web/SQLiteModule.node" (from ExpoSQLite.web.js)
      //   - Absolute path: "expo-sqlite/web/SQLiteModule.node" (from Metro resolver)
      // The old regex /expo-sqlite\/web\/SQLiteModule/ only matched absolute paths.
      // The correct regex matches just SQLiteModule name without path prefix.
      expect(metroContent).toContain("SQLiteModule");
      expect(metroContent).toContain("sqliteModulePattern");
      // The regex should match /SQLiteModule(?:\.node)?$/ — no path prefix
      expect(metroContent).toMatch(/\/SQLiteModule\(/);
      // Should NOT have the old broken pattern with full path in regex
      expect(metroContent).not.toMatch(/\/expo-sqlite\\\/web\\\/SQLiteModule/);
    });

    it("should have SQLiteModule.node fallback to wa-sqlite/sqlite-api.js", () => {
      const content = metroContent;
      expect(content).toContain("SQLiteModule");
      expect(content).toContain("wa-sqlite");
      expect(content).toContain("sqlite-api.js");
    });

    it("should have module.exports = withNativeWind at the end", () => {
      // NativeWind wrapper must be the last operation
      const lastExport = metroContent.trim().endsWith("withNativeWind(config, { input: \"./global.css\" });");
      expect(lastExport).toBe(true);
    });
  });

  describe("lingui.config.ts", () => {
    let linguiContent: string;

    beforeAll(() => {
      linguiContent = fs.readFileSync(LINGUI_CONFIG, "utf-8");
    });

    it("should exist", () => {
      expect(fs.existsSync(LINGUI_CONFIG)).toBe(true);
    });

    it("should use JSON format (not PO) for simpler Metro integration", () => {
      expect(linguiContent).toContain("format-json");
    });

    it("should NOT have runtimeConfigModule that causes './index' resolution errors", () => {
      // The runtimeConfigModule tells Lingui where to import the i18n instance
      // in compiled catalogs. When set to ["@lingui/core", "i18n"], the compiled
      // output tries to resolve "./index" from the project root, causing Metro errors.
      //
      // SOLUTION: Remove runtimeConfigModule entirely since we import i18n directly
      // in our code, not through compiled catalogs.
      //
      // Check that it's not an active config property (ignore comments)
      const lines = linguiContent.split("\n");
      const activeConfigLines = lines.filter(
        (line) => !line.trim().startsWith("//") && !line.trim().startsWith("*")
      );
      const activeConfig = activeConfigLines.join("\n");
      expect(activeConfig).not.toContain("runtimeConfigModule");
    });

    it("should have locales configured", () => {
      expect(linguiContent).toContain('"en"');
      expect(linguiContent).toContain('"es"');
    });

    it("should have catalogs path configured", () => {
      expect(linguiContent).toContain("src/i18n/locales/{locale}");
    });
  });

  describe("babel.config.js", () => {
    let babelContent: string;

    beforeAll(() => {
      babelContent = fs.readFileSync(BABEL_CONFIG, "utf-8");
    });

    it("should have Lingui macro plugin", () => {
      expect(babelContent).toContain("@lingui/babel-plugin-lingui-macro");
    });

    it("should have async option enabled for Lingui macro", () => {
      expect(babelContent).toContain("async: true");
    });
  });

  describe("i18n instance", () => {
    it("should have index.ts file", () => {
      expect(fs.existsSync(I18N_INDEX)).toBe(true);
    });

    it("should import from @lingui/core (not a local path)", () => {
      const content = fs.readFileSync(I18N_INDEX, "utf-8");
      expect(content).toContain('from "@lingui/core"');
      // Should NOT import from a relative path that could cause resolution issues
      expect(content).not.toMatch(/from ["']\.\/index["']/);
      expect(content).not.toMatch(/require\(["']\.\/index["']\)/);
    });

    it("should export i18n instance", () => {
      const content = fs.readFileSync(I18N_INDEX, "utf-8");
      expect(content).toContain("export const i18n");
    });

    it("should export initI18n function", () => {
      const content = fs.readFileSync(I18N_INDEX, "utf-8");
      expect(content).toContain("export function initI18n");
    });
  });

  describe("catalog files", () => {
    const locales = ["en", "es"];
    const namespaces = ["common", "auth", "workout", "history", "exercises", "records", "profile"];

    locales.forEach((locale) => {
      namespaces.forEach((ns) => {
        it(`should have ${locale}/${ns}.json catalog`, () => {
          const catalogPath = path.join(ROOT, `src/i18n/locales/${locale}/${ns}.json`);
          expect(fs.existsSync(catalogPath)).toBe(true);
        });

        it(`should have valid JSON in ${locale}/${ns}.json`, () => {
          const catalogPath = path.join(ROOT, `src/i18n/locales/${locale}/${ns}.json`);
          const content = fs.readFileSync(catalogPath, "utf-8");
          expect(() => JSON.parse(content)).not.toThrow();
        });
      });
    });

    it("should have matching keys in en and es for each namespace", () => {
      const namespaces = ["common", "auth", "workout", "history", "exercises", "records", "profile"];
      const mismatches: string[] = [];

      namespaces.forEach((ns) => {
        const enPath = path.join(ROOT, `src/i18n/locales/en/${ns}.json`);
        const esPath = path.join(ROOT, `src/i18n/locales/es/${ns}.json`);
        const enKeys = Object.keys(JSON.parse(fs.readFileSync(enPath, "utf-8"))).sort();
        const esKeys = Object.keys(JSON.parse(fs.readFileSync(esPath, "utf-8"))).sort();

        const missingInEs = enKeys.filter((k) => !esKeys.includes(k));
        const missingInEn = esKeys.filter((k) => !enKeys.includes(k));

        if (missingInEs.length > 0) {
          mismatches.push(`${ns}: missing in es: ${missingInEs.join(", ")}`);
        }
        if (missingInEn.length > 0) {
          mismatches.push(`${ns}: missing in en: ${missingInEn.join(", ")}`);
        }
      });

      expect(mismatches).toEqual([]);
    });
  });
});
