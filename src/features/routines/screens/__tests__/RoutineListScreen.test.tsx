/**
 * RoutineListScreen i18n integration tests.
 *
 * Verifies i18n strings used in RoutineListScreen by checking
 * the translation catalog files directly.
 */
import * as fs from "fs";
import * as path from "path";

describe("RoutineListScreen i18n strings", () => {
  let commonCatalog: Record<string, string>;
  let exercisesCatalog: Record<string, string>;

  beforeAll(() => {
    const base = path.resolve(__dirname, "../../../../i18n/locales/en");
    commonCatalog = JSON.parse(fs.readFileSync(path.join(base, "common.json"), "utf-8"));
    exercisesCatalog = JSON.parse(fs.readFileSync(path.join(base, "exercises.json"), "utf-8"));
  });

  it("routine strings exist in English catalogs", () => {
    expect(exercisesCatalog["My Routines"]).toBe("My Routines");
    expect(commonCatalog["New Routine"]).toBe("New Routine");
  });
});
