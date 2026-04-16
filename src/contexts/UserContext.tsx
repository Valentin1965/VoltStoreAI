/**
 * UserContext — client profile from `clients` + Supabase Auth (password / email OTP / phone OTP + mandatory TOTP when using Auth).
 *
 * - Supabase `signInWithPassword` + MFA: every Auth user must enroll and complete TOTP (AAL2) before the app treats them as signed in.
 * - `signInWithOtp` + `verifyOtp` (email type `email`, phone type `sms`) — same MFA gate after OTP.
 * - Legacy `login_client_with_password` RPC if no Supabase user (no TOTP for that path).
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { supabase } from '../services/supabase';
import { AuthApiError, type AuthError } from '@supabase/auth-js';
import { safeStorage } from '../utils/storage';
import type { SiteCountry } from '../routing/siteCountry';
import { defaultCallingCodeForSiteCountry, normalizePhoneE164 } from '../utils/phoneE164';
import {
  authLoginErrorTranslationKey,
  type AuthLoginErrorTranslationKey,
} from '../utils/authLoginErrors';

export const MFA_ENROLL_REQUIRED_MESSAGE = '__MFA_ENROLL_REQUIRED__';

const MFA_VERIFY_PREFIX = '__MFA_VERIFY__:';

export function mfaVerifyPendingMessage(factorId: string, challengeId: string): string {
  return `${MFA_VERIFY_PREFIX}${factorId}:${challengeId}`;
}

export function parseMfaVerifyPendingMessage(message: string): { factorId: string; challengeId: string } | null {
  if (!message.startsWith(MFA_VERIFY_PREFIX)) return null;
  const rest = message.slice(MFA_VERIFY_PREFIX.length);
  const sep = rest.indexOf(':');
  if (sep <= 0) return null;
  const factorId = rest.slice(0, sep);
  const challengeId = rest.slice(sep + 1);
  if (!factorId || !challengeId) return null;
  return { factorId, challengeId };
}

const SESSION_KEY = 'gls_client_session_v1';
/** Client “cabinet” session: after this duration a new login (incl. MFA when enabled) is required. */
const CLIENT_SESSION_MAX_MS = 60 * 60 * 1000;
const CLIENT_SESSION_STARTED_AT_KEY = 'gls_client_session_started_at_v1';

function markClientSessionStarted(): void {
  safeStorage.setItem(CLIENT_SESSION_STARTED_AT_KEY, String(Date.now()));
}

function clearClientSessionStarted(): void {
  safeStorage.removeItem(CLIENT_SESSION_STARTED_AT_KEY);
}

function getClientSessionStartedAt(): number | null {
  const raw = safeStorage.getItem(CLIENT_SESSION_STARTED_AT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function isClientSessionExpired(): boolean {
  const t = getClientSessionStartedAt();
  if (t === null) return false;
  return Date.now() - t > CLIENT_SESSION_MAX_MS;
}

export type EmailPasswordSignInResult =
  | { status: 'found' }
  | { status: 'invalid'; errorMessage?: string; errorTranslationKey?: AuthLoginErrorTranslationKey }
  | { status: 'no_profile' }
  | { status: 'mfa'; factorId: string; challengeId: string }
  | { status: 'mfa_enroll_required' };

export type RequestOtpResult = { error: Error | null; normalizedPhone?: string };

interface RegisterData {
  email: string;
  first_name: string;
  last_name: string;
  /** Min. 8 characters; stored as bcrypt hash in DB only */
  password: string;
  phone?: string;
  client_type?: 'private' | 'business';
  company_name?: string;
  vat_number?: string;
  country?: string;
  city?: string;
  street?: string;
  house_number?: string;
  postal_code?: string;
}

/**
 * Guest identification → checkout: (1) session + MFA + `clients` profile, (2) otherwise Supabase Auth check on email.
 * `needs_checkout_sign_in` → open password + Google Authenticator modal, then payment.
 */
export type GuestCheckoutGateResult =
  | { ok: true; next: 'proceed_checkout' | 'needs_checkout_sign_in' }
  | {
      ok: false;
      notificationKey:
        | 'auth_magic_link_invalid_email'
        | 'checkout_session_mfa_incomplete'
        | 'checkout_guest_auth_required';
    };

interface UserContextType {
  currentUser: UserProfile | null;
  isLoadingUser: boolean;
  requestSignInOtp: (
    channel: 'email' | 'phone',
    address: string,
    siteCountry?: SiteCountry | null
  ) => Promise<RequestOtpResult>;
  verifySignInOtp: (
    channel: 'email' | 'phone',
    address: string,
    token: string
  ) => Promise<EmailPasswordSignInResult>;
  loginWithEmailPassword: (email: string, password: string) => Promise<EmailPasswordSignInResult>;
  completeTotpVerification: (
    factorId: string,
    challengeId: string,
    code: string,
  ) => Promise<{ error: AuthError | null }>;
  /** New MFA challenge for the same factor (e.g. after 422 / stale challenge). */
  renewTotpChallenge: (factorId: string) => Promise<{ challengeId: string | null; error: AuthError | null }>;
  registerClient: (data: RegisterData) => Promise<UserProfile>;
  /** After TOTP enroll during login/register, load profile into `currentUser`. */
  refreshSessionProfile: () => Promise<void>;
  /**
   * Supabase session exists but `clients` / `currentUser` is not loaded yet (e.g. TOTP enroll or AAL2 verify pending).
   * Same gate as cabinet: do not treat as a fully anonymous guest for checkout.
   */
  needsSessionProfileCompletion: boolean;
  validateGuestCheckoutToBilling: (guestEmail: string) => Promise<GuestCheckoutGateResult>;
  logout: () => Promise<void>;
  updateUserDiscount: (userId: string, discount: number) => Promise<void>;
  getDiscountedPrice: (basePrice: number) => number;
  findClientByEmail: (email: string) => Promise<UserProfile | null>;
  findUser: (email: string) => UserProfile | undefined;
  users: UserProfile[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function rowToProfile(row: any): UserProfile {
  if (!row) return row;
  const { password_hash: _ph, ...rest } = row;
  return {
    ...rest,
    name: [rest.first_name, rest.last_name].filter(Boolean).join(' ') || rest.email,
    address: [rest.street, rest.house_number, rest.city, rest.country].filter(Boolean).join(', '),
  };
}

async function loadClientProfileByPhoneFromSession(): Promise<UserProfile | null> {
  const { data, error } = await supabase.rpc('find_client_profile_after_phone_auth');
  if (error) {
    console.warn('[UserContext] find_client_profile_after_phone_auth', error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row ? rowToProfile(row) : null;
}

async function fetchOrCreateClientProfile(user: User): Promise<UserProfile | null> {
  const email = user.email?.toLowerCase().trim();
  if (!email || !email.includes('@')) {
    if (user.phone) return loadClientProfileByPhoneFromSession();
    return null;
  }

  const { data: existing, error: selErr } = await supabase.from('clients').select('*').eq('email', email).maybeSingle();
  if (selErr) {
    console.warn('[UserContext] clients select', selErr);
    return null;
  }
  if (existing) return rowToProfile(existing);

  const { data: created, error: insErr } = await supabase.from('clients').insert({
    email,
    client_type: 'private',
    first_name: 'Customer',
    last_name: '—',
  }).select().single();

  if (!insErr && created) return rowToProfile(created);

  if (insErr?.code === '23505') {
    const { data: retry } = await supabase.from('clients').select('*').eq('email', email).maybeSingle();
    if (retry) return rowToProfile(retry);
  }
  console.warn('[UserContext] clients insert', insErr);
  return null;
}

type AuthMfaGate = 'none' | 'enroll' | 'verify';

type MfaResolveResult =
  | { status: 'complete' }
  | { status: 'enroll_required' }
  | { status: 'mfa'; factorId: string; challengeId: string }
  | { status: 'error'; message: string };

/** Some SDK responses only populate `all`; prefer both `totp` and `all`. */
function hasVerifiedTotpInFactorList(
  factors: { totp?: { id: string; status: string; factor_type?: string }[]; all?: { id: string; status: string; factor_type: string }[] } | null,
): boolean {
  if (!factors) return false;
  if ((factors.totp ?? []).some(f => f.status === 'verified')) return true;
  return (factors.all ?? []).some(f => f.factor_type === 'totp' && f.status === 'verified');
}

function findVerifiedTotpFactorId(
  factors: { totp?: { id: string; status: string }[]; all?: { id: string; status: string; factor_type: string }[] } | null,
): string | null {
  if (!factors) return null;
  const a = (factors.totp ?? []).find(f => f.status === 'verified');
  if (a) return a.id;
  const b = (factors.all ?? []).find(f => f.factor_type === 'totp' && f.status === 'verified');
  return b?.id ?? null;
}

/**
 * All Supabase Auth sessions must reach AAL2 via verified TOTP.
 * - `enroll`: no verified TOTP — user must scan QR and verify once.
 * - `verify`: TOTP enrolled but current session not yet stepped up.
 *
 * Supabase: Authentication → Multi-factor → enable TOTP, or `mfa.listFactors` / enroll will fail in the UI.
 */
async function getAuthMfaGateForCurrentSession(): Promise<AuthMfaGate> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return 'none';
  try {
    const { data: factors, error: lfErr } = await supabase.auth.mfa.listFactors();
    if (lfErr) {
      console.warn(
        '[UserContext] mfa.listFactors:',
        lfErr.message,
        '— Enable MFA (TOTP) for the project: Supabase Dashboard → Authentication → Multi-factor.',
      );
      return 'enroll';
    }
    const hasVerifiedTotp = hasVerifiedTotpInFactorList(factors);
    if (!hasVerifiedTotp) return 'enroll';
    const { data: aal, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalErr) {
      console.warn('[UserContext] getAuthenticatorAssuranceLevel:', aalErr.message);
      return 'verify';
    }
    if (aal?.currentLevel === 'aal2') return 'none';
    return 'verify';
  } catch (e) {
    console.warn('[UserContext] getAuthMfaGateForCurrentSession', e);
    return 'enroll';
  }
}

/** Do not load `clients` row / `currentUser` until mandatory MFA is satisfied. */
async function shouldDeferProfileForPendingMfa(): Promise<boolean> {
  const gate = await getAuthMfaGateForCurrentSession();
  return gate === 'enroll' || gate === 'verify';
}

async function resolveMandatoryMfaAfterAuthSession(): Promise<MfaResolveResult> {
  const gate = await getAuthMfaGateForCurrentSession();
  if (gate === 'none') return { status: 'complete' };
  if (gate === 'enroll') return { status: 'enroll_required' };
  const { data: factors, error: lfErr } = await supabase.auth.mfa.listFactors();
  if (lfErr) {
    return { status: 'error', message: lfErr.message };
  }
  const factorId = findVerifiedTotpFactorId(factors);
  if (!factorId) return { status: 'enroll_required' };
  const { data: ch, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error || !ch?.id) {
    return { status: 'error', message: error?.message || 'MFA challenge failed' };
  }
  return { status: 'mfa', factorId, challengeId: ch.id };
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authSessionUserId, setAuthSessionUserId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const initialized = useRef(false);

  const needsSessionProfileCompletion = useMemo(
    () => !isLoadingUser && !!authSessionUserId && !currentUser,
    [isLoadingUser, authSessionUserId, currentUser],
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    safeStorage.removeItem('voltstoreai_users_v2');
    safeStorage.removeItem('voltstoreai_current_user_v2');
    safeStorage.removeItem(SESSION_KEY);

    let cancelled = false;

    const syncAuthUser = async (user: User | null) => {
      if (!user) return;
      if (await shouldDeferProfileForPendingMfa()) return;

      const started = getClientSessionStartedAt();
      if (started !== null && Date.now() - started > CLIENT_SESSION_MAX_MS) {
        clearClientSessionStarted();
        void supabase.auth.signOut();
        return;
      }
      if (started === null) {
        markClientSessionStarted();
      }

      const profile = await fetchOrCreateClientProfile(user);
      if (!cancelled && profile) setCurrentUser(profile);
    };

    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        setAuthSessionUserId(session.user.id);
        await syncAuthUser(session.user);
      } else {
        setAuthSessionUserId(null);
      }
      if (!cancelled) setIsLoadingUser(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') {
        clearClientSessionStarted();
        setAuthSessionUserId(null);
        setCurrentUser(null);
        return;
      }
      if (session?.user) {
        setAuthSessionUserId(session.user.id);
        void syncAuthUser(session.user);
      } else {
        setAuthSessionUserId(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    clearClientSessionStarted();
    setCurrentUser(null);
    setAuthSessionUserId(null);
    safeStorage.removeItem(SESSION_KEY);
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!currentUser) return;
      if (isClientSessionExpired()) {
        void logout();
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, [currentUser, logout]);

  const applySessionProfile = useCallback(async () => {
    await supabase.auth.refreshSession();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    if (await shouldDeferProfileForPendingMfa()) {
      if (import.meta.env.DEV) {
        console.warn('[UserContext] applySessionProfile skipped — complete TOTP enroll/verify first (AAL2).');
      }
      return;
    }
    const profile = await fetchOrCreateClientProfile(session.user);
    if (profile) {
      markClientSessionStarted();
      setCurrentUser(profile);
    }
  }, []);

  const requestSignInOtp = useCallback(
    async (channel: 'email' | 'phone', address: string, siteCountry?: SiteCountry | null): Promise<RequestOtpResult> => {
      if (channel === 'email') {
        const email = address.toLowerCase().trim();
        if (!email.includes('@')) {
          return { error: new Error('invalid_email') };
        }
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
        return { error: error ? new Error(error.message) : null };
      }
      const cc = defaultCallingCodeForSiteCountry(siteCountry ?? undefined);
      const phone = normalizePhoneE164(address, cc);
      if (phone.replace(/\D/g, '').length < 8) {
        return { error: new Error('invalid_phone') };
      }
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false },
      });
      return { error: error ? new Error(error.message) : null, normalizedPhone: phone };
    },
    []
  );

  const verifySignInOtp = useCallback(async (channel: 'email' | 'phone', address: string, token: string): Promise<EmailPasswordSignInResult> => {
    const clean = token.replace(/\s/g, '');
    if (!clean) return { status: 'invalid' };

    if (channel === 'email') {
      const email = address.toLowerCase().trim();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: clean,
        type: 'email',
      });
      if (error) return { status: 'invalid', errorMessage: error.message };
    } else {
      const { error } = await supabase.auth.verifyOtp({
        phone: address,
        token: clean,
        type: 'sms',
      });
      if (error) return { status: 'invalid', errorMessage: error.message };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { status: 'invalid' };

    const mfaRes = await resolveMandatoryMfaAfterAuthSession();
    if (mfaRes.status === 'enroll_required') return { status: 'mfa_enroll_required' };
    if (mfaRes.status === 'mfa') {
      return { status: 'mfa', factorId: mfaRes.factorId, challengeId: mfaRes.challengeId };
    }
    if (mfaRes.status === 'error') return { status: 'invalid', errorMessage: mfaRes.message };

    const profile = await fetchOrCreateClientProfile(session.user);
    if (!profile) {
      if (channel === 'phone') return { status: 'no_profile' };
      return { status: 'invalid' };
    }
    markClientSessionStarted();
    setCurrentUser(profile);
    return { status: 'found' };
  }, []);

  const loginWithEmailPassword = useCallback(async (email: string, password: string): Promise<EmailPasswordSignInResult> => {
    const em = email.toLowerCase().trim();

    const { data: sb, error: sbErr } = await supabase.auth.signInWithPassword({ email: em, password });
    if (import.meta.env.DEV && sbErr) {
      const e = sbErr as { message?: string; status?: number; code?: string };
      console.warn('[Cabinet login] signInWithPassword →', e.message, '| code:', e.code, '| status:', e.status);
    }
    let session = sb?.session ?? null;
    if (!sbErr && sb?.user && !session) {
      const { data: refreshed } = await supabase.auth.getSession();
      session = refreshed.session ?? null;
    }
    if (!sbErr && session?.user) {
      const mfaRes = await resolveMandatoryMfaAfterAuthSession();
      if (mfaRes.status === 'enroll_required') return { status: 'mfa_enroll_required' };
      if (mfaRes.status === 'mfa') {
        return { status: 'mfa', factorId: mfaRes.factorId, challengeId: mfaRes.challengeId };
      }
      if (mfaRes.status === 'error') {
        return { status: 'invalid', errorMessage: mfaRes.message };
      }
      const profile = await fetchOrCreateClientProfile(session.user);
      if (profile) {
        markClientSessionStarted();
        setCurrentUser(profile);
      }
      return { status: 'found' };
    }

    // Same email in Supabase Auth must use password (+ MFA), not legacy RPC — RPC would bypass 2FA.
    let hasAuthUser = false;
    const { data: authRow, error: authLookupErr } = await supabase.rpc('auth_user_exists_for_email', {
      p_email: em,
    });
    if (authLookupErr) {
      console.warn('[UserContext] auth_user_exists_for_email — run supabase/sql_auth_user_exists_for_email.sql:', authLookupErr.message);
    } else {
      hasAuthUser = authRow === true;
    }
    if (hasAuthUser) {
      const key = authLoginErrorTranslationKey(sbErr ?? null);
      return {
        status: 'invalid',
        errorMessage: sbErr?.message || undefined,
        errorTranslationKey: key ?? 'auth_login_error_invalid_credentials',
      };
    }

    if (import.meta.env.VITE_DISABLE_LEGACY_PASSWORD_LOGIN === 'true') {
      return { status: 'invalid', errorTranslationKey: 'auth_login_error_supabase_required' };
    }

    const { data, error } = await supabase.rpc('login_client_with_password', {
      p_email: em,
      p_password: password,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return { status: 'invalid', errorMessage: error?.message };
    if (import.meta.env.DEV) {
      console.warn(
        '[UserContext] login_client_with_password: no Supabase Auth session — TOTP/2FA is not used. Add this user to auth.users (or set VITE_DISABLE_LEGACY_PASSWORD_LOGIN=true to block this path).',
      );
    }
    markClientSessionStarted();
    setCurrentUser(rowToProfile(row));
    return { status: 'found' };
  }, []);

  const completeTotpVerification = useCallback(async (factorId: string, challengeId: string, code: string) => {
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.replace(/\s/g, ''),
    });
    if (error) {
      if (import.meta.env.DEV) {
        console.warn('[UserContext] mfa.verify', { status: error.status, code: error.code, message: error.message });
      }
      return { error };
    }
    await applySessionProfile();
    return { error: null };
  }, [applySessionProfile]);

  const renewTotpChallenge = useCallback(async (factorId: string) => {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) {
      if (import.meta.env.DEV) {
        console.warn('[UserContext] mfa.challenge', { status: error.status, code: error.code, message: error.message });
      }
      return { challengeId: null, error };
    }
    if (!data?.id) {
      return {
        challengeId: null,
        error: new AuthApiError('MFA challenge response missing id', 500, 'unexpected_failure'),
      };
    }
    return { challengeId: data.id, error: null };
  }, []);

  const registerClient = useCallback(async (data: RegisterData): Promise<UserProfile> => {
    const email = data.email.toLowerCase().trim();
    const { data: rows, error } = await supabase.rpc('register_client', {
      p_first_name:  data.first_name,
      p_last_name:   data.last_name,
      p_email:       email,
      p_phone:       data.phone       || '',
      p_client_type: data.client_type || 'private',
      p_company:     data.company_name || '',
      p_vat:         data.vat_number  || '',
      p_country:     data.country     || 'Danmark',
      p_city:        data.city        || '',
      p_street:      data.street      || '',
      p_house:       data.house_number || '',
      p_postal:      data.postal_code  || '',
      p_password:    data.password,
    });
    if (error) throw error;
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) throw new Error('Registration failed — no data returned');

    const { error: signUpErr } = await supabase.auth.signUp({ email, password: data.password });
    if (!signUpErr) {
      const profile = rowToProfile(row);
      const mfaRes = await resolveMandatoryMfaAfterAuthSession();
      if (mfaRes.status === 'complete') {
        markClientSessionStarted();
        setCurrentUser(profile);
        return profile;
      }
      if (mfaRes.status === 'enroll_required') throw new Error(MFA_ENROLL_REQUIRED_MESSAGE);
      if (mfaRes.status === 'mfa') {
        throw new Error(mfaVerifyPendingMessage(mfaRes.factorId, mfaRes.challengeId));
      }
      throw new Error(mfaRes.message);
    }

    const errCode = String((signUpErr as { code?: string }).code || '');
    const msgLower = (signUpErr.message || '').toLowerCase();
    const likelyExistingUser =
      errCode === 'email_exists' ||
      errCode === 'user_already_exists' ||
      msgLower.includes('already') ||
      msgLower.includes('registered') ||
      msgLower.includes('exists');

    if (likelyExistingUser) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      });
      if (!signInErr) {
        const profile = rowToProfile(row);
        const mfaRes = await resolveMandatoryMfaAfterAuthSession();
        if (mfaRes.status === 'complete') {
          markClientSessionStarted();
          setCurrentUser(profile);
          return profile;
        }
        if (mfaRes.status === 'enroll_required') throw new Error(MFA_ENROLL_REQUIRED_MESSAGE);
        if (mfaRes.status === 'mfa') {
          throw new Error(mfaVerifyPendingMessage(mfaRes.factorId, mfaRes.challengeId));
        }
        throw new Error(mfaRes.message);
      }
      throw new Error('__AUTH_CLIENT_PASSWORD_MISMATCH__');
    }

    if (import.meta.env.DEV) {
      console.warn('[UserContext] signUp after register_client:', signUpErr.message, signUpErr);
    }
    throw signUpErr;
  }, []);

  const updateUserDiscount = useCallback(async (userId: string, discount: number) => {
    const clamped = Math.min(100, Math.max(0, discount));
    await supabase.from('clients').update({ discount: clamped }).eq('id', userId);
    setCurrentUser(prev =>
      prev?.id === userId ? { ...prev, discount: clamped } : prev
    );
  }, []);

  const getDiscountedPrice = useCallback((basePrice: number) => {
    if (!currentUser?.discount || currentUser.discount <= 0) return basePrice;
    return basePrice - (basePrice * currentUser.discount) / 100;
  }, [currentUser]);

  const findClientByEmail = useCallback(async (_email: string): Promise<UserProfile | null> => null, []);

  const findUser = useCallback((email: string): UserProfile | undefined => {
    const q = email.toLowerCase().trim();
    if (currentUser?.email?.toLowerCase() === q) return currentUser;
    return undefined;
  }, [currentUser]);

  const refreshSessionProfile = useCallback(async () => {
    await applySessionProfile();
  }, [applySessionProfile]);

  const validateGuestCheckoutToBilling = useCallback(async (guestEmail: string): Promise<GuestCheckoutGateResult> => {
    const em = guestEmail.trim().toLowerCase();
    if (!em.includes('@')) {
      return { ok: false, notificationKey: 'auth_magic_link_invalid_email' };
    }

    await applySessionProfile();

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      if (await shouldDeferProfileForPendingMfa()) {
        return { ok: false, notificationKey: 'checkout_session_mfa_incomplete' };
      }
      const profile = await fetchOrCreateClientProfile(session.user);
      if (!profile) {
        return { ok: false, notificationKey: 'checkout_session_mfa_incomplete' };
      }
      return { ok: true, next: 'proceed_checkout' };
    }

    const { data: authExists, error: rpcErr } = await supabase.rpc('auth_user_exists_for_email', {
      p_email: em,
    });
    if (rpcErr && import.meta.env.DEV) {
      console.warn('[UserContext] validateGuestCheckoutToBilling auth_user_exists_for_email', rpcErr.message);
    }
    if (!rpcErr && authExists === true) {
      return { ok: false, notificationKey: 'checkout_guest_auth_required' };
    }

    return { ok: true, next: 'needs_checkout_sign_in' };
  }, [applySessionProfile]);

  return (
    <UserContext.Provider value={{
      currentUser,
      isLoadingUser,
      needsSessionProfileCompletion,
      validateGuestCheckoutToBilling,
      requestSignInOtp,
      verifySignInOtp,
      loginWithEmailPassword,
      completeTotpVerification,
      renewTotpChallenge,
      registerClient,
      refreshSessionProfile,
      logout,
      updateUserDiscount,
      getDiscountedPrice,
      findClientByEmail,
      findUser,
      users: [],
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};
