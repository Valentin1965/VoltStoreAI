// Supabase Edge Function — send-push
// Sends Web Push notifications with proper payload encryption via npm:web-push.
//
// DEPLOY:
//   supabase functions deploy send-push
//   supabase secrets set VAPID_PRIVATE_KEY=<privateKey>
//   supabase secrets set VAPID_PUBLIC_KEY=<publicKey>
//
// Generate VAPID keys (one-time):
//   npx web-push generate-vapid-keys

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush          from 'npm:web-push@3.6.7';
import { corsHeadersFor } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')        ?? '';
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')         ?? '';
const VAPID_SUBJECT = 'mailto:sales@glsolargroup.dk';

// ── Configure web-push ────────────────────────────────────────────────────────
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

async function sendOne(sub: Sub, payload: object): Promise<'ok' | 'expired' | 'error'> {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys:     { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 86400 }
    );
    return 'ok';
  } catch (err: any) {
    const status = err?.statusCode ?? 0;
    console.error('[Push] send failed', sub.endpoint.slice(-20), status, err?.message);
    if (status === 404 || status === 410) return 'expired';
    return 'error';
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(
      JSON.stringify({ error: 'VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Supabase secrets.' }),
      { status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
    );
  }

  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await req.json();
    const { type, ...data } = body;

    let subs: Sub[] = [];
    let notification: object = {};
    let expiredIds: string[] = [];

    // ── New order → notify all admin devices ──────────────────────────────
    if (type === 'new_order') {
      const { data: rows, error } = await db
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .is('client_id', null);

      if (error) throw error;
      subs = rows ?? [];

      notification = {
        title: `🛍 Ny ordre — ${data.customerName || 'Ukendt kunde'}`,
        body:  `Total: ${data.total ?? ''} ${data.currency ?? 'EUR'}`,
        icon:  '/icon.svg',
        badge: '/icon.svg',
        tag:   'new-order',
        url:   '/?view=admin',
      };

    // ── Status update → notify specific client ────────────────────────────
    } else if (type === 'status_update' && data.clientId) {
      const { data: rows, error } = await db
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('client_id', data.clientId);

      if (error) throw error;
      subs = rows ?? [];

      const labels: Record<string, string> = {
        in_progress:        '🔧 Din ordre behandles nu',
        awaiting_transport: '📦 Ordre klar til afhentning',
        in_transit:         '🚚 Din ordre er på vej!',
        delivered:          '📬 Din ordre er leveret',
        cancelled:          '❌ Ordre annulleret',
        accepted:           '✅ Ordre modtaget',
        paid:               '💳 Betaling bekræftet',
      };
      notification = {
        title: labels[data.newStatus] ?? '📋 Ordrestatus opdateret',
        body:  `Ordre #${data.orderNo ?? ''}`,
        icon:  '/icon.svg',
        badge: '/icon.svg',
        tag:   `order-${data.orderNo ?? 'update'}`,
        url:   '/?view=cabinet',
      };

    // ── Test ping from admin dashboard ────────────────────────────────────
    } else if (type === 'test') {
      const { data: rows } = await db
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .is('client_id', null);

      subs = rows ?? [];
      notification = {
        title: '✅ Push virker!',
        body:  'Green Light Scandinavia admin notifikation fungerer korrekt.',
        icon:  '/icon.svg',
        badge: '/icon.svg',
        tag:   'test',
        url:   '/?view=admin',
      };
    }

    // ── Send to all matched subscriptions ──────────────────────────────────
    const results = await Promise.all(subs.map(s => sendOne(s, notification)));

    // Clean up expired subscriptions
    expiredIds = subs
      .filter((_, i) => results[i] === 'expired')
      .map(s => s.id);

    if (expiredIds.length > 0) {
      await db.from('push_subscriptions').delete().in('id', expiredIds);
    }

    const sent   = results.filter(r => r === 'ok').length;
    const failed = results.filter(r => r === 'error').length;

    return new Response(
      JSON.stringify({ ok: true, total: subs.length, sent, failed, expired: expiredIds.length }),
      { headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[send-push]', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
    );
  }
});
