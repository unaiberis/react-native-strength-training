import * as Localization from "expo-localization";
import { detectLocale } from "../detector";

jest.mock("expo-localization");

describe("detectLocale", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 'es' for Spanish device locale (es-ES)", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageTag: "es-ES" },
    ]);
    expect(detectLocale()).toBe("es");
  });

  it("returns 'es' for Latin American Spanish locale (es-MX)", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageTag: "es-MX" },
    ]);
    expect(detectLocale()).toBe("es");
  });

  it("returns 'en' for English locale (en-US)", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageTag: "en-US" },
    ]);
    expect(detectLocale()).toBe("en");
  });

  it("returns 'en' for British English locale (en-GB)", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageTag: "en-GB" },
    ]);
    expect(detectLocale()).toBe("en");
  });

  it("falls back to 'en' for unsupported locale (fr-FR)", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageTag: "fr-FR" },
    ]);
    expect(detectLocale()).toBe("en");
  });

  it("falls back to 'en' for unsupported locale (de-DE)", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageTag: "de-DE" },
    ]);
    expect(detectLocale()).toBe("en");
  });

  it("returns 'en' when no locale available (empty array)", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue([]);
    expect(detectLocale()).toBe("en");
  });

  it("returns 'en' when getLocales returns undefined", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue(undefined);
    expect(detectLocale()).toBe("en");
  });

  it("handles locale with underscore format (es_ES)", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageTag: "es_ES" },
    ]);
    expect(detectLocale()).toBe("es");
  });

  it("returns first supported locale from multiple locales", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageTag: "fr-FR" },
      { languageTag: "es-ES" },
    ]);
    expect(detectLocale()).toBe("es");
  });
});
