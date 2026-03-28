import type { Category } from '../types';
import type { CurrencyCode, Language } from '../contexts/LanguageContext';

export type SiteCountry = 'dk' | 'se' | 'no';

export const SITE_COUNTRIES: SiteCountry[] = ['dk', 'se', 'no'];

export function isSiteCountry(s: string | undefined): s is SiteCountry {
  return s === 'dk' || s === 'se' || s === 'no';
}

/** Country → UI language + default currency */
export const countryLanguage: Record<SiteCountry, Language> = {
  dk: 'da',
  se: 'se',
  no: 'no',
};

export const countryCurrency: Record<SiteCountry, CurrencyCode> = {
  dk: 'DKK',
  se: 'SEK',
  no: 'NOK',
};

export const countryHtmlLang: Record<SiteCountry, string> = {
  dk: 'da',
  se: 'sv',
  no: 'nb',
};

/** URL segment → catalog category (SEO slugs) */
export const CATALOG_SLUG_TO_CATEGORY: Record<string, Category> = {
  inverters: 'Invertere',
  batteries: 'Batterier',
  'solar-panels': 'Solpaneler',
  kits: 'Sæt',
  'heat-pumps': 'Varmepumper',
  'power-station': 'Power Station',
  mounting: 'Monteringssystemer',
};

const SLUG_BY_CATEGORY: Partial<Record<Category, string>> = {
  Invertere: 'inverters',
  Batterier: 'batteries',
  Solpaneler: 'solar-panels',
  Sæt: 'kits',
  Varmepumper: 'heat-pumps',
  'Power Station': 'power-station',
  Monteringssystemer: 'mounting',
};

export function categoryToCatalogSlug(cat: Category | 'All'): string | null {
  if (cat === 'All') return null;
  return SLUG_BY_CATEGORY[cat] ?? null;
}

const STORAGE_KEY = 'gls_site_country';

export function rememberSiteCountry(c: SiteCountry): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, c);
  } catch {
    /* ignore */
  }
}

export function getRememberedSiteCountry(): SiteCountry | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v && isSiteCountry(v)) return v;
    return null;
  } catch {
    return null;
  }
}
