/**
 * UserContext — Supabase-backed client session
 *
 * Replaces the old localStorage-only user system.
 * All client data lives in the `clients` table in Supabase.
 *
 * Session persistence: only {id, email} stored in localStorage
 * → full profile re-fetched from Supabase on mount.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../services/supabase';
import { safeStorage } from '../utils/storage';

const SESSION_KEY = 'gls_client_session_v1';

interface RegisterData {
  email: string;
  first_name: string;
  last_name: string;
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
  loginByEmail: (email: string) => Promise<'found' | 'not_found'>;
  registerClient: (data: RegisterData) => Promise<UserProfile>;
  logout: () => void;
  updateUserDiscount: (userId: string, discount: number) => Promise<void>;
  getDiscountedPrice: (basePrice: number) => number;
  findClientByEmail: (email: string) => Promise<UserProfile | null>;
  // Legacy compat — kept so components that call useUser() don't break
  findUser: (email: string) => UserProfile | undefined;
  users: UserProfile[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/** Convert a raw `clients` DB row → UserProfile */
function rowToProfile(row: any): UserProfile {
  return {
    ...row,
    name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
    address: [row.street, row.house_number, row.city, row.country].filter(Boolean).join(', '),
  };
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const initialized = useRef(false);

  // ── Restore session on mount ────────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Clean up legacy localStorage keys from old in-memory user system
    safeStorage.removeItem('voltstoreai_users_v2');
    safeStorage.removeItem('voltstoreai_current_user_v2');

    const stored = safeStorage.getItem(SESSION_KEY);
    if (!stored) { setIsLoadingUser(false); return; }

    try {
      const { id } = JSON.parse(stored);
      if (!id) { setIsLoadingUser(false); return; }
      supabase.from('clients').select('*').eq('id', id).single()
        .then(({ data, error }) => {
          if (!error && data) setCurrentUser(rowToProfile(data));
          else safeStorage.removeItem(SESSION_KEY);
          setIsLoadingUser(false);
        });
    } catch {
      safeStorage.removeItem(SESSION_KEY);
      setIsLoadingUser(false);
    }
  }, []);

  // ── Login by email (no password — B2B portal) ──────────────────────────
  const loginByEmail = useCallback(async (email: string): Promise<'found' | 'not_found'> => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();
    if (error || !data) return 'not_found';
    const profile = rowToProfile(data);
    setCurrentUser(profile);
    safeStorage.setItem(SESSION_KEY, JSON.stringify({ id: data.id, email: data.email }));
    return 'found';
  }, []);

  // ── Register new client ─────────────────────────────────────────────────
  const registerClient = useCallback(async (data: RegisterData): Promise<UserProfile> => {
    const { data: row, error } = await supabase
      .from('clients')
      .upsert([{ ...data, email: data.email.toLowerCase().trim() }], { onConflict: 'email' })
      .select('*')
      .single();
    if (error) throw error;
    const profile = rowToProfile(row);
    setCurrentUser(profile);
    safeStorage.setItem(SESSION_KEY, JSON.stringify({ id: row.id, email: row.email }));
    return profile;
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setCurrentUser(null);
    safeStorage.removeItem(SESSION_KEY);
  }, []);

  // ── Update discount (admin action) ──────────────────────────────────────
  const updateUserDiscount = useCallback(async (userId: string, discount: number) => {
    const clamped = Math.min(100, Math.max(0, discount));
    await supabase.from('clients').update({ discount: clamped }).eq('id', userId);
    setCurrentUser(prev =>
      prev?.id === userId ? { ...prev, discount: clamped } : prev
    );
  }, []);

  // ── Price with discount ─────────────────────────────────────────────────
  const getDiscountedPrice = useCallback((basePrice: number) => {
    if (!currentUser?.discount || currentUser.discount <= 0) return basePrice;
    return basePrice - (basePrice * currentUser.discount) / 100;
  }, [currentUser]);

  // ── Async find by email ─────────────────────────────────────────────────
  const findClientByEmail = useCallback(async (email: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();
    if (error || !data) return null;
    return rowToProfile(data);
  }, []);

  // ── Legacy sync compat (returns currentUser if email matches) ───────────
  const findUser = useCallback((email: string): UserProfile | undefined => {
    const q = email.toLowerCase().trim();
    if (currentUser?.email?.toLowerCase() === q) return currentUser;
    return undefined;
  }, [currentUser]);

  return (
    <UserContext.Provider value={{
      currentUser,
      isLoadingUser,
      loginByEmail,
      registerClient,
      logout,
      updateUserDiscount,
      getDiscountedPrice,
      findClientByEmail,
      findUser,
      users: [], // legacy compat — AdminPanel now uses dbClients directly
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
