import { AppView } from '../types';
import type { Language } from '../contexts/LanguageContext';
import type { SiteCountry } from '../routing/siteCountry';
import { SITE_COUNTRIES } from '../routing/siteCountry';
import { storefrontPublicPath } from './hreflang';
import { getSiteOrigin } from './siteOrigin';
import {
  getSeoStrings,
  type SeoPageKey,
  sectionLabelForCatalogSlug,
} from './seoMessages';

const SEO_META_MARKER = 'data-gls-seo-meta';
const SEO_JSONLD_MARKER = 'data-gls-seo-ld';

const OG_LOCALE_BY_COUNTRY: Record<SiteCountry, string> = {
  dk: 'da_DK',
  se: 'sv_SE',
  no: 'nb_NO',
};

function resolveSeoPageKey(
  view: AppView,
  catalogSlug: string | null,
  transactional: boolean,
): SeoPageKey {
  if (transactional) return 'private';
  switch (view) {
    case AppView.ADMIN:
    case AppView.CABINET:
    case AppView.SUCCESS:
      return 'private';
    case AppView.CHECKOUT:
      return 'checkout';
    case AppView.CART:
      return 'cart';
    case AppView.CATALOG:
      return catalogSlug ? 'catalog_section' : 'catalog';
    case AppView.CONTACT:
      return 'contact';
    case AppView.CALCULATOR:
      return 'calculator';
    case AppView.SERVICE:
      return 'service';
    case AppView.ABOUT:
    default:
      return 'about';
  }
}

function shouldNoindex(key: SeoPageKey, transactional: boolean): boolean {
  if (transactional) return true;
  if (key === 'private') return true;
  if (key === 'cart' || key === 'checkout') return true;
  return false;
}

function upsertMetaName(name: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute(SEO_META_MARKER, '1');
  el.content = content;
}

function upsertMetaProperty(property: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute(SEO_META_MARKER, '1');
  el.content = content;
}

function clearOgLocaleAlternates(): void {
  document.querySelectorAll('meta[property="og:locale:alternate"]').forEach((n) => n.remove());
}

function injectJsonLd(origin: string): void {
  document.querySelectorAll(`script[type="application/ld+json"][${SEO_JSONLD_MARKER}]`).forEach((s) => s.remove());

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: 'Green Light Scandinavia',
        url: origin,
        logo: `${origin}/logo512.png`,
        email: 'sales@glsolargroup.dk',
        areaServed: [
          { '@type': 'Country', name: 'Denmark' },
          { '@type': 'Country', name: 'Sweden' },
          { '@type': 'Country', name: 'Norway' },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: 'Green Light Scandinavia',
        url: origin,
        publisher: { '@id': `${origin}/#organization` },
        inLanguage: ['da-DK', 'sv-SE', 'nb-NO', 'en'],
      },
    ],
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute(SEO_JSONLD_MARKER, '1');
  script.text = JSON.stringify(graph);
  document.head.appendChild(script);
}

/**
 * Updates document title, meta description, Open Graph / Twitter tags, robots, JSON-LD.
 * Run on SPA route changes. Works with `syncHreflangAndCanonical` (canonical link tags).
 */
export function syncDocumentSeo(opts: {
  language: Language;
  siteCountry: SiteCountry | null;
  pathname: string;
  search: string;
  currentView: AppView;
  catalogSlug: string | null;
  transactional: boolean;
}): void {
  if (typeof document === 'undefined') return;

  const { language, siteCountry, pathname, search, currentView, catalogSlug, transactional } = opts;
  const origin = getSiteOrigin() || window.location.origin;
  const pageKey = resolveSeoPageKey(currentView, catalogSlug, transactional);
  const noindex = shouldNoindex(pageKey, transactional);

  const sectionLabel =
    pageKey === 'catalog_section' && catalogSlug
      ? sectionLabelForCatalogSlug(catalogSlug, language)
      : undefined;

  const { title, description } = getSeoStrings(language, pageKey, sectionLabel);

  document.title = title;

  upsertMetaName('description', description);
  upsertMetaName('robots', noindex ? 'noindex, nofollow' : 'index, follow');

  const canonicalUrl =
    siteCountry && !transactional
      ? `${origin}${storefrontPublicPath(siteCountry, pathname)}`
      : `${origin}${pathname}${search}`;

  const ogImage = `${origin}/og-image.jpg`;

  upsertMetaProperty('og:type', 'website');
  upsertMetaProperty('og:site_name', 'Green Light Scandinavia');
  upsertMetaProperty('og:title', title);
  upsertMetaProperty('og:description', description);
  upsertMetaProperty('og:url', canonicalUrl);
  upsertMetaProperty('og:image', ogImage);
  upsertMetaProperty('og:image:width', '1200');
  upsertMetaProperty('og:image:height', '630');

  if (siteCountry && !transactional) {
    upsertMetaProperty('og:locale', OG_LOCALE_BY_COUNTRY[siteCountry]);
    clearOgLocaleAlternates();
    for (const cc of SITE_COUNTRIES) {
      if (cc === siteCountry) continue;
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:locale:alternate');
      m.content = OG_LOCALE_BY_COUNTRY[cc];
      m.setAttribute(SEO_META_MARKER, '1');
      document.head.appendChild(m);
    }
  } else {
    upsertMetaProperty('og:locale', 'en_US');
    clearOgLocaleAlternates();
  }

  upsertMetaName('twitter:card', 'summary_large_image');
  upsertMetaName('twitter:title', title);
  upsertMetaName('twitter:description', description);
  upsertMetaName('twitter:image', ogImage);

  if (noindex) {
    document.querySelectorAll(`script[type="application/ld+json"][${SEO_JSONLD_MARKER}]`).forEach((s) => s.remove());
  } else {
    injectJsonLd(origin);
  }
}
