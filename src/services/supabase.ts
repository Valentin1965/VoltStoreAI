import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = (import.meta as any).env?.VITE_SUPABASE_URL      || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Always log at startup so we can see in Vercel console what value was baked in
console.log('[Supabase] URL prefix:', supabaseUrl ? supabaseUrl.slice(0, 30) + '...' : 'MISSING');
console.log('[Supabase] Key prefix:', supabaseAnonKey ? supabaseAnonKey.slice(0, 12) + '...' : 'MISSING');

const FALLBACK_URL = 'https://xvduslroirsujnglcnos.supabase.co';

const effectiveUrl = supabaseUrl && supabaseUrl.startsWith('https://') && !supabaseUrl.includes('YOUR_PROJECT')
  ? supabaseUrl
  : FALLBACK_URL;

const effectiveKey = supabaseAnonKey && supabaseAnonKey.length > 20 && !supabaseAnonKey.includes('your_')
  ? supabaseAnonKey
  : '';

// isSupabaseConfigured = true if we have a real URL (even if key comes from fallback)
export const isSupabaseConfigured = effectiveKey.length > 20;

export const supabase = createClient(
  effectiveUrl,
  effectiveKey || 'missing-key',
  {
    auth: {
      persistSession: false,        // no localStorage auth
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'gls-auth-token'
    }
  }
);

console.log('[Supabase] configured:', isSupabaseConfigured, '| url:', effectiveUrl.slice(0, 40));
