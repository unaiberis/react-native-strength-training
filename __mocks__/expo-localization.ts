export function getLocales() {
  return [{ locale: "es", languageCode: "es", languageTag: "es" }];
}

export function getCalendars() {
  return [];
}

export function getCurrencies() {
  return [];
}

export function getCountryCode() {
  return { code: "ES", region: "es" };
}

export function getRegion() {
  return "es";
}

export function getTimeZone() {
  return "Europe/Madrid";
}

export default {
  locale: "es",
  locales: ["es", "en"],
  getLocales,
  getCalendars,
  getCurrencies,
  getCountryCode,
  getRegion,
  getTimeZone,
};
