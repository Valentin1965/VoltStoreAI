import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use any cast to bypass TypeScript errors for import.meta.env
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (process.env as any)?.SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process.env as any)?.SUPABASE_ANON_KEY || '';

// Debugging check to help identify issues in the console
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.warn('[Supabase Service] Environment variables are missing or invalid. Check Vercel/Local .env settings.');
}

/**
 * Singleton for SupabaseClient.
 * Ensures only one connection instance is created.
 */
const getSupabaseInstance = (): SupabaseClient => {
  const global = globalThis as any;
  
  if (global.__supabaseClientInstance) {
    return global.__supabaseClientInstance;
  }

  // Initialize with the provided variables or a dummy URL to prevent SDK initialization crash
  const client = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'voltstoreai-auth-token'
      }
    }
  );

  global.__supabaseClientInstance = client;
  return client;
};

export const supabase = getSupabaseInstance();