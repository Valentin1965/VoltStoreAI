import { supabase } from './supabase';
// Email service — routes all email calls through a Supabase Edge Function.
// The Resend API key is stored as a Supabase secret (never exposed in the browser bundle).
//
// Edge function: supabase/functions/send-email/index.ts
//
// DEPLOY:
//   supabase functions deploy send-email
//   supabase functions deploy send-funnel-email   (marketing funnel — optional)
//   supabase secrets set RESEND_API_KEY=re_xxxxxx
//
// Remove VITE_RESEND_API_KEY from Vercel — it's no longer needed.

/** Result of invoking the send-email edge function (order / status / custom). */
export type SendEmailEdgeResult = { ok: true } | { ok: false; error: string };

async function callEdge(payload: Record<string, unknown>): Promise<SendEmailEdgeResult> {
  try {
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>('send-email', {
      body: payload,
    });
    if (error) {
      const errObj = error as Error & { context?: { body?: string } };
      let msg = errObj.message || String(error);
      try {
        const raw = errObj.context?.body;
        if (raw && typeof raw === 'string') {
          const parsed = JSON.parse(raw) as { error?: string };
          if (parsed?.error) msg = parsed.error;
        }
      } catch {
        /* keep msg */
      }
      // Non-2xx bodies are sometimes returned in `data` instead of context.body
      if (data && typeof data === 'object' && data !== null) {
        const d = data as { error?: string };
        if (d.error && String(d.error).trim()) msg = String(d.error);
      }
      console.error('[Email] Edge function error', msg, data ?? '(no body)');
      return { ok: false, error: msg };
    }
    const body = data && typeof data === 'object' && data !== null ? (data as { ok?: unknown; error?: unknown }) : null;
    const errMsg = body?.error != null && String(body.error).trim() !== '' ? String(body.error) : '';
    if (errMsg) {
      return { ok: false, error: errMsg };
    }
    // Do not require `ok === true`: some gateways/SDKs return 2xx with `{}` or `{ ok: null }`;
    // treating `ok !== true` as failure broke real sends. Only fail on explicit `ok: false`.
    if (body && body.ok === false) {
      return { ok: false, error: 'send-email rejected the request' };
    }
    console.log('[Email] Sent via edge function, type:', payload.type);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Email] Network error calling edge function:', msg);
    return { ok: false, error: msg };
  }
}

async function callFunnelEdge(body: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-funnel-email', { body });
    if (error) {
      console.error('[EmailFunnel] Edge function error', error.message || error);
    } else {
      console.log('[EmailFunnel] Sent step:', body.step);
    }
  } catch (err) {
    console.error('[EmailFunnel] Network error:', err);
  }
}

// ─────────────────────────────────────────────
// ORDER CONFIRMATION
// ─────────────────────────────────────────────

export interface OrderEmailData {
  orderNo: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  clientType: 'private' | 'business';
  companyName?: string;
  vatNumber?: string;
  billingAddress: string;
  deliveryAddress: string;
  items: Array<{ name: string; category: string; quantity: number; price: number }>;
  totalPrice: number;
  currency: string;
  customerMessage?: string;
  /** UI language at time of order — da | en | no | se (default: da) */
  lang?: string;
}

export async function sendOrderEmails(data: OrderEmailData): Promise<void> {
  const r = await callEdge({ type: 'order', ...data });
  if (!r.ok) console.error('[Email] Order email failed:', r.error);
}

// ─────────────────────────────────────────────
// STATUS CHANGE EMAIL
// ─────────────────────────────────────────────

export type OrderStatus = 'accepted' | 'in_progress' | 'awaiting_transport' | 'in_transit' | 'delivered' | 'cancelled';

export interface StatusChangeEmailData {
  customerName: string;
  customerEmail: string;
  orderNo: string;
  newStatus: OrderStatus;
  shippingDate?: string;
  arrivalDate?: string;
  /** UI language the customer used — da | en | no | se (default: da) */
  lang?: string;
}

export async function sendStatusChangeEmail(data: StatusChangeEmailData): Promise<SendEmailEdgeResult> {
  const r = await callEdge({ type: 'status', ...data });
  if (!r.ok) console.error('[Email] Status email failed:', r.error);
  return r;
}

// ─────────────────────────────────────────────
// Admin: custom template email (HTML body built on client)
// ─────────────────────────────────────────────

export interface CustomEmailPayload {
  customerEmail: string;
  subject: string;
  /** Inner HTML (paragraphs); edge function wraps with branded shell */
  htmlBody: string;
  lang?: string;
}

export async function sendCustomCustomerEmail(data: CustomEmailPayload): Promise<SendEmailEdgeResult> {
  return callEdge({
    type: 'custom',
    customerEmail: data.customerEmail.trim(),
    subject: data.subject,
    htmlBody: data.htmlBody,
    lang: data.lang ?? 'da',
  });
}

// ─────────────────────────────────────────────
// MARKETING EMAIL FUNNEL (optional)
// Edge: supabase/functions/send-funnel-email/index.ts
// Enable client calls: VITE_EMAIL_FUNNEL_ENABLED=true (otherwise sendFunnelEmail no-ops)
// ─────────────────────────────────────────────

export type FunnelStep = 'welcome' | 'nurture_1' | 'nurture_2';

export interface FunnelEmailData {
  step: FunnelStep;
  customerEmail: string;
  customerName: string;
  /** da | en | no | se (default: da) */
  lang?: string;
}

/** When false (default), sendFunnelEmail does nothing — safe for production until you wire triggers. */
export function isEmailFunnelEnabled(): boolean {
  return import.meta.env.VITE_EMAIL_FUNNEL_ENABLED === 'true';
}

export async function sendFunnelEmail(data: FunnelEmailData): Promise<void> {
  if (!isEmailFunnelEnabled()) return;
  await callFunnelEdge({
    step: data.step,
    customerEmail: data.customerEmail,
    customerName: data.customerName,
    lang: data.lang,
  });
}

/**
 * Admin panel: always invokes send-funnel-email (ignores VITE_EMAIL_FUNNEL_ENABLED).
 * Returns result so UI can show success/error toasts.
 */
export async function sendFunnelEmailAdmin(data: FunnelEmailData): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.functions.invoke('send-funnel-email', {
      body: {
        step: data.step,
        customerEmail: data.customerEmail.trim(),
        customerName: data.customerName.trim(),
        lang: data.lang ?? 'da',
      },
    });
    if (error) {
      const msg = error.message || String(error);
      console.error('[EmailFunnel][Admin]', msg);
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EmailFunnel][Admin]', msg);
    return { ok: false, error: msg };
  }
}
