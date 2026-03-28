// types/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Canonical site origin for SEO (OG URLs, JSON-LD). Falls back to window.location.origin if unset. */
  readonly VITE_SITE_URL?: string
  /** Optional origin for Mollie API (e.g. https://www.glsolargroup.dk) if /api is not on the same host as the SPA */
  readonly VITE_PAYMENT_API_BASE?: string
  /** When "true", sendFunnelEmail() invokes send-funnel-email (public triggers); admin uses sendFunnelEmailAdmin always */
  readonly VITE_EMAIL_FUNNEL_ENABLED?: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ADMIN_PASSWORD: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}