import type { AuthError } from '@supabase/supabase-js';

export type AuthLoginErrorTranslationKey =
  | 'auth_login_error_email_not_confirmed'
  | 'auth_login_error_invalid_credentials'
  | 'auth_login_error_supabase_required';

/**
 * Map Supabase `signInWithPassword` errors to localized keys (English messages in API vary by version).
 */
export function authLoginErrorTranslationKey(
  err: Pick<AuthError, 'message' | 'code'> | null | undefined,
): AuthLoginErrorTranslationKey | null {
  if (!err) return null;
  const code = String(err.code ?? '').toLowerCase();
  const msg = String(err.message ?? '').toLowerCase();

  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'auth_login_error_email_not_confirmed';
  }
  if (
    code === 'invalid_credentials' ||
    code === 'invalid_grant' ||
    msg.includes('invalid login') ||
    msg.includes('invalid credentials') ||
    msg.includes('invalid_grant') ||
    msg.includes('wrong password')
  ) {
    return 'auth_login_error_invalid_credentials';
  }
  return null;
}
