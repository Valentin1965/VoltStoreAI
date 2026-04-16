import type { AuthError } from '@supabase/supabase-js';

/**
 * User-facing copy for Supabase MFA `verify` / `challengeAndVerify` failures (checkout + cabinet).
 */
export function totpVerifyUserFacingMessage(
  err: Pick<AuthError, 'message' | 'code' | 'status'> | null | undefined,
  t: (key: string) => string,
): string {
  if (!err) return t('auth_totp_verify_failed_hint');

  const code = String(err.code ?? '').toLowerCase();
  const msg = String(err.message ?? '').toLowerCase();

  const looksExpired =
    code.includes('expired') || msg.includes('expired') || msg.includes('stale');

  if (looksExpired) {
    return t('auth_totp_challenge_expired');
  }

  if (
    code === 'mfa_verification_failed' ||
    msg.includes('verification failed') ||
    msg.includes('invalid otp') ||
    msg.includes('invalid code') ||
    msg.includes('wrong')
  ) {
    return t('auth_totp_verify_failed_hint');
  }

  const trimmed = String(err.message ?? '').trim();
  if (trimmed) return trimmed;
  return t('auth_totp_verify_failed_hint');
}
