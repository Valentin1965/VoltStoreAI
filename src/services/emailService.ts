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

async function callEdge(payload: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: payload,
    });
    if (error) {
      console.error('[Email] Edge function error', error.message || error);
    } else {
      console.log('[Email] Sent via edge function, type:', payload.type);
    }
  } catch (err) {
    console.error('[Email] Network error calling edge function:', err);
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
  await callEdge({ type: 'order', ...data });
}

// ─────────────────────────────────────────────
// STATUS CHANGE EMAIL
// ─────────────────────────────────────────────

export type OrderStatus = 'accepted' | 'in_progress' | 'awaiting_transport' | 'in_transit' | 'cancelled';

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

export async function sendStatusChangeEmail(data: StatusChangeEmailData): Promise<void> {
  await callEdge({ type: 'status', ...data });
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
