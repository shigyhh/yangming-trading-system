import {
  defaultLocale,
  getLocaleBundle,
  matchLocaleFromAcceptLanguage,
  normalizeLocale,
  supportedLocales
} from "../../../packages/content/i18n.js";

export function listSupportedLocales() {
  return supportedLocales.map((locale) => ({ ...locale }));
}

export function getI18nBundle({ locale = "", acceptLanguage = "" } = {}) {
  const requested = locale ? normalizeLocale(locale) : matchLocaleFromAcceptLanguage(acceptLanguage);
  const bundle = getLocaleBundle(requested);
  const resolvedLocale = bundle.locale || defaultLocale;

  return {
    locale: resolvedLocale,
    fallbackLocale: defaultLocale,
    isFallback: requested !== resolvedLocale,
    supportedLocales: listSupportedLocales(),
    bundle
  };
}
