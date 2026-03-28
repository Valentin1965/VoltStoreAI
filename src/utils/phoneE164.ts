import type { SiteCountry } from '../routing/siteCountry';

const CALLING: Record<SiteCountry, string> = {
  dk: '45',
  se: '46',
  no: '47',
};

export function defaultCallingCodeForSiteCountry(c: SiteCountry | null | undefined): string {
  return CALLING[c ?? 'dk'];
}

/** E.164 for Supabase Phone OTP (+ and digits only). */
export function normalizePhoneE164(raw: string, defaultCountryDigits: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const allDigits = trimmed.replace(/\D/g, '');
  if (!allDigits) return '';

  if (trimmed.startsWith('+')) {
    return `+${allDigits}`;
  }
  if (allDigits.startsWith('00')) {
    return `+${allDigits.slice(2)}`;
  }

  const cc = defaultCountryDigits.replace(/\D/g, '');
  let national = allDigits;
  if (national.startsWith(cc)) {
    return `+${national}`;
  }
  national = national.replace(/^0+/, '');
  return `+${cc}${national}`;
}
