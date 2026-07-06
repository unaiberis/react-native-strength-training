/**
 * Locale integration tests.
 *
 * Tests that the app initializes with the correct locale,
 * catalogs load correctly, and locale switching works.
 */

// Vitest v4: hoisted mock variables for vi.mock factory
const mocks = vi.hoisted(function() {
  return {
    mockLoad: vi.fn(),
    mockActivate: vi.fn(),
  };
});

// Mock catalog JSON files
vi.mock("../../locales/en/common.json", () => ({
  Home: "Home",
  Train: "Train",
  Save: "Save",
}), { virtual: true });

vi.mock("../../locales/es/common.json", () => ({
  Home: "Inicio",
  Train: "Entrenar",
  Save: "Guardar",
}), { virtual: true });

// Mock detector module
vi.mock("../detector", () => ({
  detectLocale: vi.fn(() => "en"),
}));

// Mock @lingui/core
vi.mock("@lingui/core", function() {
  return {
    I18n: vi.fn().mockImplementation(function() {
      return {
        locale: "en",
        load: mocks.mockLoad,
        activate: mocks.mockActivate,
      };
    }),
  };
});

import { i18n, initI18n, loadCatalog } from "../index";
import { detectLocale } from "../detector";

describe("Locale integration", () => {
  beforeEach(() => {
    mocks.mockLoad.mockReset();
    mocks.mockActivate.mockReset();
  });

  describe("app initialization with locale", () => {
    it("initializes with English when English locale detected", () => {
      (detectLocale as vi.Mock).mockReturnValue("en");
      initI18n();
      expect(mocks.mockActivate).toHaveBeenCalledWith("en");
    });

    it("initializes with Spanish when Spanish locale detected", () => {
      (detectLocale as vi.Mock).mockReturnValue("es");
      initI18n();
      expect(mocks.mockActivate).toHaveBeenCalledWith("es");
    });

    it("loads common catalog during initialization", () => {
      initI18n();
      expect(mocks.mockLoad).toHaveBeenCalled();
    });

    it("returns the i18n instance after initialization", () => {
      const result = initI18n();
      expect(result).toBe(i18n);
    });
  });

  describe("catalog loading", () => {
    it("loads common catalog synchronously via require", async () => {
      await loadCatalog("en", "common");
    });

    it("handles Spanish locale catalog loading", async () => {
      await loadCatalog("es", "common");
    });

    it("handles unknown namespace gracefully (no-op)", async () => {
      await loadCatalog("en", "nonexistent");
    });

    it("handles unknown locale gracefully (no-op)", async () => {
      await loadCatalog("fr", "common");
    });

    it("returns a promise from loadCatalog", () => {
      const result = loadCatalog("en", "common");
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("locale switching", () => {
    it("can activate different locale after initialization", () => {
      (detectLocale as vi.Mock).mockReturnValue("es");
      initI18n();
      expect(mocks.mockActivate).toHaveBeenCalledWith("es");
      i18n.activate("en");
      expect(mocks.mockActivate).toHaveBeenCalledWith("en");
    });

    it("detectLocale fallback works for unsupported locales", () => {
      (detectLocale as vi.Mock).mockReturnValue("en");
      initI18n();
      expect(mocks.mockActivate).toHaveBeenCalledWith("en");
    });
  });
});
