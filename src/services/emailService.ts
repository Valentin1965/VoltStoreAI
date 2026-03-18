// Email service — routes all email calls through a Supabase Edge Function.
// The Resend API key is stored as a Supabase secret (never exposed in the browser bundle).
//
// Edge function: supabase/functions/send-email/index.ts
//
// DEPLOY ONCE:
//   supabase functions deploy send-email
//   supabase secrets set RESEND_API_KEY=re_xxxxxx
//
// Remove VITE_RESEND_API_KEY from Vercel — it's no longer needed.

const EDGE_URL =
  'https://xvduslroirsujnglcnos.supabase.co/functions/v1/send-email';

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZHVzbHJvaXJzdWpuZ2xjbm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3ODQzMDQsImV4cCI6MjA4NDM2MDMwNH0.MpS-NS6Blgpu4o3QxoSUGhn-cs5HJhWcqMf2XxtnsMY';

async function callEdge(payload: Record<string, unknown>): Promise<void> {
  try {
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[Email] Edge function error', res.status, text);
    } else {
      console.log('[Email] Sent via edge function, type:', payload.type);
    }
  } catch (err) {
    console.error('[Email] Network error calling edge function:', err);
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
