import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Використовуємо (import.meta as any) для стабільної збірки у Vite
const metaEnv = (import.meta as any).env;

const supabaseUrl = metaEnv?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv?.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.warn('[Supabase Service] Environment variables are missing or invalid.');
}

const getSupabaseInstance = (): SupabaseClient => {
  const global = globalThis as any;
  
  if (global.__supabaseClientInstance) {
    return global.__supabaseClientInstance;
  }

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