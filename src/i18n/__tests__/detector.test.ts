import * as Localization from "expo-localization";
import { detectLocale } from "../detector";

vi.mock("expo-localization");

describe("detectLocale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'es' for Spanish device locale (es-ES)", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue([
      { languageTag: "es-ES" },
    ]);
    expect(detectLocale()).toBe("es");
  });

  it("returns 'es' for Latin American Spanish locale (es-MX)", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue([
      { languageTag: "es-MX" },
    ]);
    expect(detectLocale()).toBe("es");
  });

  it("returns 'en' for English locale (en-US)", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue([
      { languageTag: "en-US" },
    ]);
    expect(detectLocale()).toBe("en");
  });

  it("returns 'en' for British English locale (en-GB)", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue([
      { languageTag: "en-GB" },
    ]);
    expect(detectLocale()).toBe("en");
  });

  it("returns 'eu' for Basque locale (eu-ES)", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue([
      { languageTag: "eu-ES" },
    ]);
    expect(detectLocale()).toBe("eu");
  });

  it("falls back to 'es' for unsupported locale (fr-FR)", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue([
      { languageTag: "fr-FR" },
    ]);
    expect(detectLocale()).toBe("es");
  });

  it("falls back to 'es' for unsupported locale (de-DE)", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue([
      { languageTag: "de-DE" },
    ]);
    expect(detectLocale()).toBe("es");
  });

  it("returns 'es' when no locale available (empty array)", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue([]);
    expect(detectLocale()).toBe("es");
  });

  it("returns 'es' when getLocales returns undefined", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue(undefined);
    expect(detectLocale()).toBe("es");
  });

  it("handles locale with underscore format (es_ES)", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue([
      { languageTag: "es_ES" },
    ]);
    expect(detectLocale()).toBe("es");
  });

  it("returns first supported locale from multiple locales", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue([
      { languageTag: "fr-FR" },
      { languageTag: "es-ES" },
    ]);
    expect(detectLocale()).toBe("es");
  });

  it("prefers 'es' over 'en' when both are available", () => {
    // Edge case: browser with English primary + Spanish secondary
    (Localization.getLocales as vi.Mock).mockReturnValue([
      { languageTag: "en-US" },
      { languageTag: "es-ES" },
    ]);
    expect(detectLocale()).toBe("es");
  });

  it("prefers 'eu' over 'en' when both are available", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue([
      { languageTag: "en-US" },
      { languageTag: "eu-ES" },
    ]);
    expect(detectLocale()).toBe("eu");
  });

  it("returns 'en' when only English is available", () => {
    (Localization.getLocales as vi.Mock).mockReturnValue([
      { languageTag: "en-US" },
    ]);
    expect(detectLocale()).toBe("en");
  });
});
