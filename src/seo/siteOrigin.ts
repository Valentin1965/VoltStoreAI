/** Canonical public origin (production SEO, OG absolute URLs). Fallback: current window. */
export function getSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}
