import type { SiteCountry } from '../routing/siteCountry';
import { SITE_COUNTRIES } from '../routing/siteCountry';

/** BCP 47 for Google Search Console hreflang */
const HREFLANG_FOR_COUNTRY: Record<SiteCountry, string> = {
  dk: 'da-DK',
  se: 'sv-SE',
  no: 'nb-NO',
};

const SEO_LINK_ATTR = 'data-gls-seo';

function removePreviousSeoLinks(): void {
  document.querySelectorAll(`link[${SEO_LINK_ATTR}]`).forEach((el) => el.remove());
}

/** Path after `/{country}` (empty string = storefront home, e.g. `/dk`). */
export function localizedPathSuffix(pathname: string, country: SiteCountry): string {
  const prefix = `/${country}`;
  const rest =
    pathname === prefix || pathname === `${prefix}/` ? '' : pathname.slice(prefix.length);
  const normalized = rest.startsWith('/') ? rest : `/${rest}`;
  if (normalized === '/' || normalized === '') return '';
  return normalized;
}

/** Public path for storefront URLs, e.g. `/dk` or `/se/catalog` (no trailing slash on home). */
export function storefrontPublicPath(siteCountry: SiteCountry, pathname: string): string {
  const suffix = localizedPathSuffix(pathname, siteCountry);
  return `/${siteCountry}${suffix}`;
}

/** Sync canonical + hreflang alternate links for country storefront pages. */
export function syncHreflangAndCanonical(opts: {
  pathname: string;
  search: string;
  siteCountry: SiteCountry | null;
  /** true for /?view=… (admin, cabinet, checkout return, etc.) — no regional alternates */
  transactional: boolean;
}): void {
  const { pathname, search, siteCountry, transactional } = opts;
  removePreviousSeoLinks();

  const append = (rel: string, href: string, hreflang?: string): void => {
    const link = document.createElement('link');
    link.setAttribute(SEO_LINK_ATTR, '1');
    link.rel = rel;
    link.href = href;
    if (hreflang != null) link.hrefLang = hreflang;
    document.head.appendChild(link);
  };

  const origin = window.location.origin;

  if (transactional) {
    append('canonical', `${origin}${pathname}${search}`);
    return;
  }

  if (siteCountry == null) {
    append('canonical', `${origin}${pathname}${search}`);
    return;
  }

  const suffix = localizedPathSuffix(pathname, siteCountry);

  for (const cc of SITE_COUNTRIES) {
    append(
      'alternate',
      `${origin}/${cc}${suffix}`,
      HREFLANG_FOR_COUNTRY[cc],
    );
  }

  append('alternate', `${origin}/dk${suffix}`, 'x-default');
  append('canonical', `${origin}/${siteCountry}${suffix}`);
}
