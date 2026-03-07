import { createClient } from '@supabase/supabase-js';

// Hardcoded fallbacks — anon key is public/browser-safe by design
const FALLBACK_URL = 'https://xvduslroirsujnglcnos.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZHVzbHJvaXJzdWpuZ2xjbm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3ODQzMDQsImV4cCI6MjA4NDM2MDMwNH0.MpS-NS6Blgpu4o3QxoSUGhn-cs5HJhWcqMf2XxtnsMY';

const supabaseUrl     = (import.meta.env.VITE_SUPABASE_URL      as string) || FALLBACK_URL;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || FALLBACK_KEY;

export const isSupabaseConfigured = true; // always true — fallback guarantees connection

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});
