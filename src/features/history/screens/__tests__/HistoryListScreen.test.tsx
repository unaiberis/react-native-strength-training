/**
 * HistoryListScreen i18n integration tests.
 *
 * Verifies i18n strings used in HistoryListScreen by checking
 * the translation catalog files directly.
 */
import * as fs from "fs";
import * as path from "path";

describe("HistoryListScreen i18n strings", () => {
  const enPath = path.resolve(__dirname, "../../../../i18n/locales/en/history.json");
  let enCatalog: Record<string, string>;

  beforeAll(() => {
    enCatalog = JSON.parse(fs.readFileSync(enPath, "utf-8"));
  });

  it("history strings exist in English catalog", () => {
    expect(enCatalog["Workout History"]).toBe("Workout History");
    expect(enCatalog["No workouts yet"]).toBe("No workouts yet");
    expect(enCatalog["Start a Workout"]).toBe("Start a Workout");
  });

  it("filter strings are translated", () => {
    expect(enCatalog["All exercises"]).toBe("All exercises");
    expect(enCatalog["Filter:"]).toBe("Filter:");
    expect(enCatalog["Clear"]).toBe("Clear");
  });

  it("has matching Spanish translations", () => {
    const esPath = path.resolve(__dirname, "../../../../i18n/locales/es/history.json");
    const esCatalog = JSON.parse(fs.readFileSync(esPath, "utf-8"));
    const enKeys = Object.keys(enCatalog).sort();
    const esKeys = Object.keys(esCatalog).sort();
    expect(esKeys).toEqual(enKeys);
  });
});
