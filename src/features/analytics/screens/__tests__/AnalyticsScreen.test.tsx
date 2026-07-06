/**
 * AnalyticsScreen i18n integration tests.
 *
 * Verifies i18n strings used in AnalyticsScreen and ExerciseTimelineScreen
 * by checking the translation catalog files directly.
 */
import * as fs from "fs";
import * as path from "path";

describe("AnalyticsScreen i18n strings", () => {
  const enPath = path.resolve(__dirname, "../../../../i18n/locales/en/common.json");
  const esPath = path.resolve(__dirname, "../../../../i18n/locales/es/common.json");
  let enCatalog: Record<string, string>;
  let esCatalog: Record<string, string>;

  beforeAll(() => {
    enCatalog = JSON.parse(fs.readFileSync(enPath, "utf-8"));
    esCatalog = JSON.parse(fs.readFileSync(esPath, "utf-8"));
  });

  it("has analytics strings in English catalog", () => {
    expect(enCatalog["Analytics"]).toBe("Analytics");
    expect(enCatalog["Your training trends and progress"]).toBe(
      "Your training trends and progress",
    );
    expect(enCatalog["Weekly"]).toBe("Weekly");
    expect(enCatalog["Monthly"]).toBe("Monthly");
    expect(enCatalog["Total Volume"]).toBe("Total Volume");
    expect(enCatalog["Weekly Volume"]).toBe("Weekly Volume");
    expect(enCatalog["Monthly Volume"]).toBe("Monthly Volume");
    expect(enCatalog["Exercise Progress"]).toBe("Exercise Progress");
    expect(enCatalog["Best e1RM"]).toBe("Best e1RM");
    expect(enCatalog["Max Weight"]).toBe("Max Weight");
    expect(enCatalog["e1RM Progression"]).toBe("e1RM Progression");
    expect(enCatalog["Volume per Session"]).toBe("Volume per Session");
    expect(enCatalog["← Back to Analytics"]).toBe("← Back to Analytics");
  });

  it("has analytics strings in Spanish catalog", () => {
    expect(esCatalog["Analytics"]).toBe("Analíticas");
    expect(esCatalog["Weekly"]).toBe("Semanal");
    expect(esCatalog["Monthly"]).toBe("Mensual");
    expect(esCatalog["Total Volume"]).toBe("Volumen Total");
    expect(esCatalog["Exercise Progress"]).toBe("Progreso de Ejercicios");
    expect(esCatalog["Best e1RM"]).toBe("Mejor e1RM");
    expect(esCatalog["← Back to Analytics"]).toBe("← Volver a Analíticas");
  });
});
