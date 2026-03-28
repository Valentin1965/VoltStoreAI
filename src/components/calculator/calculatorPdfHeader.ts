/**
 * Site header logo for calculator PDF (html2canvas): same bulb mark as Layout GreenLightLogo,
 * inline SVG (no CORS). Unique gradient id per page for valid HTML.
 */
export function getGlsPdfBrandMarkSvg(pageNum: number): string {
  const gid = `glsPdfBulbGrad${pageNum}`;
  return `<svg class="pdf-brand-symbol" width="52" height="52" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M50 85C50 90.5228 45.5228 95 40 95H60C54.4772 95 50 90.5228 50 85Z" fill="#065F46"/>
  <path d="M50 10C30 10 15 25 15 45C15 65 35 75 40 85H60C65 75 85 65 85 45C85 25 70 10 50 10Z" fill="url(#${gid})"/>
  <path d="M50 70C50 70 48 50 40 40C32 30 20 28 20 28C20 28 30 35 35 48C40 61 42 75 42 75" fill="white" fill-opacity="0.9"/>
  <defs>
    <linearGradient id="${gid}" x1="50" y1="10" x2="50" y2="85" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#34D399"/>
      <stop offset="1" stop-color="#059669"/>
    </linearGradient>
  </defs>
</svg>`;
}

/** Extra CSS for PDF header: logo mark + wordmark (light background, no green bar) */
export const GLS_PDF_TOPBAR_BRAND_CSS = `
  .topbar-brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .pdf-logo-mark { flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .pdf-logo-mark svg { display: block; }
  .topbar-titles { min-width: 0; }
  .brand-logo-line { margin-top: 2px; font-weight: 800; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.92); }
`;
