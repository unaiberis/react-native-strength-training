/**
 * ActiveWorkoutScreen i18n integration tests.
 *
 * Verifies i18n strings used in ActiveWorkoutScreen by checking
 * the translation catalog files directly.
 */
import * as fs from "fs";
import * as path from "path";

describe("ActiveWorkoutScreen i18n strings", () => {
  const enPath = path.resolve(__dirname, "../../../../i18n/locales/en/workout.json");
  let enCatalog: Record<string, string>;

  beforeAll(() => {
    enCatalog = JSON.parse(fs.readFileSync(enPath, "utf-8"));
  });

  it("workout action strings exist in English catalog", () => {
    expect(enCatalog["Active Workout"]).toBe("Active Workout");
    expect(enCatalog["Finish Workout"]).toBe("Finish Workout");
    expect(enCatalog["Complete"]).toBe("Complete");
  });

  it("exercise set strings are translated", () => {
    expect(enCatalog["Set"]).toBe("Set");
    expect(enCatalog["Weight"]).toBe("Weight");
    expect(enCatalog["Reps"]).toBe("Reps");
  });
});
