import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Bump suffix after changing client/fetch behaviour so HMR/old tabs don’t keep a stale `createClient`. */
const SUPABASE_BROWSER_SINGLETON = '__GREEN_LIGHT_SCANDINAVIA_SUPABASE_v3__';

function getBrowserSupabaseSingleton(): SupabaseClient | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  return (globalThis as typeof globalThis & { [SUPABASE_BROWSER_SINGLETON]?: SupabaseClient })[
    SUPABASE_BROWSER_SINGLETON
  ];
}

function setBrowserSupabaseSingleton(client: SupabaseClient): void {
  if (typeof globalThis === 'undefined') return;
  (globalThis as typeof globalThis & { [SUPABASE_BROWSER_SINGLETON]?: SupabaseClient })[
    SUPABASE_BROWSER_SINGLETON
  ] = client;
}

// Must match FALLBACK_URL project (anon key is public / browser-safe)
const FALLBACK_URL = 'https://xvduslroirsujnglcnos.supabase.co';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZHVzbHJvaXJzdWpuZ2xjbm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3ODQzMDQsImV4cCI6MjA4NDM2MDMwNH0.MpS-NS6Blgpu4o3QxoSUGhn-cs5HJhWcqMf2XxtnsMY';

function readEnvString(v: unknown): string {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (!s || s === 'undefined' || s === 'null') return '';
  return s;
}

function looksLikeSupabaseAnonJwt(key: string): boolean {
  const parts = key.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0) && key.length >= 36;
}

/**
 * Kong requires `apikey` (header). Auth uses this inner fetch; we normalize to `fetch(url, init)` so
 * merged headers are applied reliably. Do not put `apikey` in the URL — it leaks into history/referrers.
 */
function createSupabaseFetch(anonKey: string, supabaseProjectUrl: string): typeof fetch {
  let projectOrigin = '';
  let projectHost = '';
  try {
    const u = new URL(supabaseProjectUrl);
    projectOrigin = u.origin;
    projectHost = u.hostname;
  } catch {
    /* ignore */
  }

  function resolveAbsoluteUrl(urlStr: string): string {
    if (!urlStr) return urlStr;
    try {
      return new URL(urlStr).href;
    } catch {
      if (projectOrigin) {
        try {
          return new URL(urlStr, `${projectOrigin}/`).href;
        } catch {
          return urlStr;
        }
      }
      return urlStr;
    }
  }

  function isThisProjectUrl(href: string): boolean {
    if (!href) return false;
    if (projectOrigin && href.startsWith(projectOrigin)) return true;
    try {
      return new URL(href).hostname === projectHost;
    } catch {
      return false;
    }
  }

  return (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const absoluteUrl = resolveAbsoluteUrl(rawUrl);

    const headers = new Headers();
    if (input instanceof Request) {
      input.headers.forEach((v, k) => headers.set(k, v));
    }
    new Headers(init?.headers).forEach((v, k) => headers.set(k, v));

    const key = anonKey.trim();
    if (key && isThisProjectUrl(absoluteUrl)) {
      headers.set('apikey', key);
    } else if (key && !headers.get('apikey')?.trim()) {
      headers.set('apikey', key);
    }

    const nextInit: RequestInit = {
      ...init,
      headers,
    };
    if (input instanceof Request) {
      nextInit.method = init?.method ?? input.method;
      nextInit.signal = init?.signal ?? input.signal;
      nextInit.credentials = init?.credentials ?? input.credentials;
      nextInit.cache = init?.cache ?? input.cache;
      nextInit.redirect = init?.redirect ?? input.redirect;
      nextInit.referrer = init?.referrer ?? input.referrer;
      nextInit.referrerPolicy = init?.referrerPolicy ?? input.referrerPolicy;
      nextInit.integrity = init?.integrity ?? input.integrity;
      if (init?.body !== undefined) nextInit.body = init.body;
      else if (input.body !== null) nextInit.body = input.body;
    }

    return fetch(absoluteUrl, nextInit);
  };
}

const envUrl = readEnvString(import.meta.env.VITE_SUPABASE_URL);
const envAnonRaw = readEnvString(import.meta.env.VITE_SUPABASE_ANON_KEY);

const useEnvProject = Boolean(envUrl && envAnonRaw && looksLikeSupabaseAnonJwt(envAnonRaw));

const supabaseUrl = useEnvProject ? envUrl : FALLBACK_URL;
const supabaseAnonKey = useEnvProject ? envAnonRaw : FALLBACK_KEY;

if (envUrl && !useEnvProject) {
  const msg =
    '[Supabase] VITE_SUPABASE_ANON_KEY missing or invalid — using bundled fallback. Set both VITE_* from Dashboard → API and redeploy.';
  if (import.meta.env.DEV) console.error(msg);
  else console.warn(msg);
}

export const isSupabaseUsingEnvCredentials = useEnvProject;
export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

if (!looksLikeSupabaseAnonJwt(supabaseAnonKey)) {
  console.error('[Supabase] Resolved anon key does not look like a JWT — check env / FALLBACK_KEY.');
}

function createBrowserSupabaseClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      fetch: createSupabaseFetch(supabaseAnonKey, supabaseUrl),
      headers: { apikey: supabaseAnonKey },
    },
  });
}

/** One client per browser context — avoids duplicate GoTrueClient / storage-key warnings (Vite HMR, double init). */
const existing = typeof window !== 'undefined' ? getBrowserSupabaseSingleton() : undefined;
export const supabase: SupabaseClient = existing ?? createBrowserSupabaseClient();
if (typeof window !== 'undefined' && !existing) {
  setBrowserSupabaseSingleton(supabase);
}
