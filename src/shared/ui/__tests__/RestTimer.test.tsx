/**
 * RestTimer i18n integration tests.
 *
 * Verifies i18n strings used in RestTimer by checking
 * the translation catalog files directly.
 */
import * as fs from "fs";
import * as path from "path";

describe("RestTimer i18n strings", () => {
  const enPath = path.resolve(__dirname, "../../../i18n/locales/en/common.json");
  let enCatalog: Record<string, string>;

  beforeAll(() => {
    enCatalog = JSON.parse(fs.readFileSync(enPath, "utf-8"));
  });

  it("rest timer strings exist in English catalog", () => {
    expect(enCatalog["Rest between sets"]).toBe("Rest between sets");
    expect(enCatalog["Skip rest"]).toBe("Skip rest");
  });
});
