/**
 * UserContext — client profile from `clients` + Supabase Auth (password / email OTP / phone OTP + optional TOTP).
 *
 * - Supabase `signInWithPassword` + MFA when configured in the project.
 * - `signInWithOtp` + `verifyOtp` (email type `email`, phone type `sms`).
 * - Legacy `login_client_with_password` RPC if no Supabase user (no TOTP for that path).
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { supabase } from '../services/supabase';
import { safeStorage } from '../utils/storage';
import type { SiteCountry } from '../routing/siteCountry';
import { defaultCallingCodeForSiteCountry, normalizePhoneE164 } from '../utils/phoneE164';

const SESSION_KEY = 'gls_client_session_v1';

export type EmailPasswordSignInResult =
  | { status: 'found' }
  | { status: 'invalid'; errorMessage?: string }
  | { status: 'no_profile' }
  | { status: 'mfa'; factorId: string; challengeId: string };

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
  completeTotpVerification: (factorId: string, challengeId: string, code: string) => Promise<{ error: Error | null }>;
  registerClient: (data: RegisterData) => Promise<UserProfile>;
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

/** Do not treat session as “logged in” until TOTP step completes when MFA is enrolled. */
async function shouldDeferProfileForPendingTotp(): Promise<boolean> {
  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTotp = (factors?.totp ?? []).some(f => f.status === 'verified');
    if (!hasVerifiedTotp) return false;
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2';
  } catch {
    return false;
  }
}

async function startTotpChallengeIfNeeded(): Promise<{ factorId: string; challengeId: string } | null> {
  const need = await shouldDeferProfileForPendingTotp();
  if (!need) return null;
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.find(f => f.status === 'verified');
  if (!totp) return null;
  const { data: ch, error } = await supabase.auth.mfa.challenge({ factorId: totp.id });
  if (error || !ch?.id) return null;
  return { factorId: totp.id, challengeId: ch.id };
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    safeStorage.removeItem('voltstoreai_users_v2');
    safeStorage.removeItem('voltstoreai_current_user_v2');
    safeStorage.removeItem(SESSION_KEY);

    let cancelled = false;

    const syncAuthUser = async (user: User | null) => {
      if (!user) return;
      if (await shouldDeferProfileForPendingTotp()) return;
      const profile = await fetchOrCreateClientProfile(user);
      if (!cancelled && profile) setCurrentUser(profile);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) void syncAuthUser(session.user);
      setIsLoadingUser(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        return;
      }
      if (session?.user) void syncAuthUser(session.user);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const applySessionProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchOrCreateClientProfile(session.user);
      if (profile) setCurrentUser(profile);
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

    const mfa = await startTotpChallengeIfNeeded();
    if (mfa) return { status: 'mfa', ...mfa };

    const profile = await fetchOrCreateClientProfile(session.user);
    if (!profile) {
      if (channel === 'phone') return { status: 'no_profile' };
      return { status: 'invalid' };
    }
    setCurrentUser(profile);
    return { status: 'found' };
  }, []);

  const loginWithEmailPassword = useCallback(async (email: string, password: string): Promise<EmailPasswordSignInResult> => {
    const em = email.toLowerCase().trim();

    const { data: sb, error: sbErr } = await supabase.auth.signInWithPassword({ email: em, password });
    if (!sbErr && sb.session?.user) {
      const mfa = await startTotpChallengeIfNeeded();
      if (mfa) return { status: 'mfa', ...mfa };
      const profile = await fetchOrCreateClientProfile(sb.session.user);
      if (profile) setCurrentUser(profile);
      return { status: 'found' };
    }

    const { data, error } = await supabase.rpc('login_client_with_password', {
      p_email: em,
      p_password: password,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return { status: 'invalid' };
    setCurrentUser(rowToProfile(row));
    return { status: 'found' };
  }, []);

  const completeTotpVerification = useCallback(async (factorId: string, challengeId: string, code: string) => {
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.replace(/\s/g, ''),
    });
    if (error) return { error: new Error(error.message) };
    await applySessionProfile();
    return { error: null };
  }, [applySessionProfile]);

  const registerClient = useCallback(async (data: RegisterData): Promise<UserProfile> => {
    const { data: rows, error } = await supabase.rpc('register_client', {
      p_first_name:  data.first_name,
      p_last_name:   data.last_name,
      p_email:       data.email.toLowerCase().trim(),
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
    const profile = rowToProfile(row);
    setCurrentUser(profile);

    void supabase.auth.signUp({
      email: profile.email,
      password: data.password,
    }).then(({ error: authErr }) => {
      if (!authErr) return;
      const msg = (authErr.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('registered')) return;
      console.warn('[UserContext] signUp mirror after register_client:', authErr.message);
    });

    return profile;
  }, []);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    safeStorage.removeItem(SESSION_KEY);
    await supabase.auth.signOut();
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

  return (
    <UserContext.Provider value={{
      currentUser,
      isLoadingUser,
      requestSignInOtp,
      verifySignInOtp,
      loginWithEmailPassword,
      completeTotpVerification,
      registerClient,
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
