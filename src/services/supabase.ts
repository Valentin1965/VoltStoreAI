import { createClient } from '@supabase/supabase-js';

// Vite automatically exposes VITE_* vars via import.meta.env at build time
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL      as string || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || '';

console.log('[Supabase] URL:', supabaseUrl ? supabaseUrl.slice(0, 35) + '...' : 'MISSING');
console.log('[Supabase] Key:', supabaseAnonKey ? supabaseAnonKey.slice(0, 10) + '...' : 'MISSING');

const isValid = (val: string) =>
  !!val &&
  val.length > 10 &&
  !val.includes('YOUR_PROJECT') &&
  !val.includes('your_') &&
  !val.includes('placeholder');

export const isSupabaseConfigured = isValid(supabaseUrl) && isValid(supabaseAnonKey);

export const supabase = createClient(
  isValid(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co',
  isValid(supabaseAnonKey) ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    }
  }
);

console.log('[Supabase] configured:', isSupabaseConfigured);
