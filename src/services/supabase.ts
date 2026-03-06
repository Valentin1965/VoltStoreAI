import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use any cast to bypass TypeScript errors for import.meta.env
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (process.env as any)?.SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process.env as any)?.SUPABASE_ANON_KEY || '';

// Debugging check to help identify issues in the console
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  // Muted warning to reduce console noise in preview
  // console.warn('[Supabase Service] Supabase is not configured...');
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

  // Use a valid-looking but non-existent URL if missing to avoid SDK crashes, 
  // but ensure we don't try to fetch if it's obviously a placeholder.
  const effectiveUrl = supabaseUrl && !supabaseUrl.includes('placeholder') 
    ? supabaseUrl 
    : 'https://missing-supabase-url.supabase.co';
    
  const effectiveKey = supabaseAnonKey && !supabaseAnonKey.includes('placeholder')
    ? supabaseAnonKey
    : 'missing-key';

  const client = createClient(
    effectiveUrl,
    effectiveKey,
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

const isPlaceholder = (val: string) => 
  !val || 
  val.includes('placeholder') || 
  val.includes('your_api_key') || 
  val.includes('your_supabase');

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

export const supabase = getSupabaseInstance();