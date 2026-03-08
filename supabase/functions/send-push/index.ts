// Supabase Edge Function — send-push
// Sends Web Push notifications to subscribed browsers.
//
// DEPLOY:
//   supabase functions deploy send-push
//   supabase secrets set VAPID_PRIVATE_KEY=your_key
//   supabase secrets set VAPID_PUBLIC_KEY=your_public_key
//
// CALLED BY: Supabase DB Trigger on orders INSERT
// or manually from admin panel for status updates.
//
// Generate VAPID keys (one-time):
//   npx web-push generate-vapid-keys

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_SUBJECT = 'mailto:sales@glsolargroup.dk';

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED = ['https://glsolargroup.dk', 'https://www.glsolargroup.dk'];
function cors(req: Request) {
  const o = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin':  ALLOWED.includes(o) ? o : ALLOWED[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// ── Web Push helper ───────────────────────────────────────────────────────────
// Uses the WebCrypto API available in Deno to sign VAPID JWT and encrypt payload.

function base64UrlDecode(s: string): Uint8Array {
  const pad = '='.repeat((4 - s.length % 4) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from([...bin].map(c => c.charCodeAt(0)));
}

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signVapidJWT(audience: string): Promise<string> {
  const header  = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  };
  const enc  = new TextEncoder();
  const data = base64UrlEncode(enc.encode(JSON.stringify(header))) + '.' +
               base64UrlEncode(enc.encode(JSON.stringify(payload)));

  const key = await crypto.subtle.importKey(
    'pkcs8', base64UrlDecode(VAPID_PRIVATE),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(data));
  return data + '.' + base64UrlEncode(sig);
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: object) {
  const url    = new URL(sub.endpoint);
  const origin = url.origin;
  const jwt    = await signVapidJWT(origin);

  const body = new TextEncoder().encode(JSON.stringify(payload));

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC}`,
      'Content-Type':  'application/json',
      'TTL':           '86400',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Push] Send failed', res.status, text);
    // 404/410 = subscription expired → delete it
    if (res.status === 404 || res.status === 410) return 'expired';
  }
  return 'ok';
}

// ── Handler ───────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });

  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await req.json();
    const { type, ...data } = body;

    let subs: { endpoint: string; p256dh: string; auth: string; id: string }[] = [];

    if (type === 'new_order') {
      // Notify all admin subscriptions (no client_id = admin device)
      const { data: rows } = await db.from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .is('client_id', null);
      subs = rows ?? [];

      const notification = {
        title: `🛍 Ny ordre — ${data.customerName || 'ukendt'}`,
        body:  `Total: ${data.total} ${data.currency || 'EUR'}`,
        icon:  '/logo192.png',
        tag:   'new-order',
        url:   '/#admin',
      };
      await Promise.all(subs.map(s => sendPush(s, notification)));

    } else if (type === 'status_update' && data.clientId) {
      // Notify specific client
      const { data: rows } = await db.from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('client_id', data.clientId);
      subs = rows ?? [];

      const labels: Record<string, string> = {
        in_progress: '🔧 Din ordre behandles nu',
        awaiting_transport: '📦 Ordre klar til afhentning',
        in_transit: '🚚 Din ordre er på vej!',
      };
      const notification = {
        title: labels[data.newStatus] ?? '📋 Ordrestatus opdateret',
        body:  `Ordre #${data.orderNo}`,
        icon:  '/logo192.png',
        tag:   `order-${data.orderNo}`,
        url:   '/#cabinet',
      };
      await Promise.all(subs.map(s => sendPush(s, notification)));
    }

    return new Response(JSON.stringify({ ok: true, sent: subs.length }), {
      headers: { ...cors(req), 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[send-push]', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors(req), 'Content-Type': 'application/json' },
    });
  }
});
