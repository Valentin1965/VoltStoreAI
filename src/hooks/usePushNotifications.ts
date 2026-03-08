/**
 * usePushNotifications
 *
 * Manages PWA push subscription lifecycle:
 *  1. Requests notification permission
 *  2. Subscribes browser via Push API (needs VAPID_PUBLIC_KEY in env)
 *  3. Saves subscription to Supabase (push_subscriptions table via RPC)
 *  4. Returns helpers for requesting permission + current state
 *
 * SETUP (one-time):
 *   npx web-push generate-vapid-keys
 *   → add VITE_VAPID_PUBLIC_KEY=<publicKey> to Vercel env vars
 *   → supabase secrets set VAPID_PRIVATE_KEY=<privateKey>
 *   → run Migration 7 in Supabase SQL Editor
 *   → deploy push Edge Function: supabase functions deploy send-push
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabase';

export type PushStatus = 'unsupported' | 'default' | 'granted' | 'denied' | 'loading';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function usePushNotifications(clientId?: string | null) {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // ── Check support + existing permission on mount ─────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    const perm = Notification.permission as PushStatus;
    setStatus(perm === 'default' ? 'default' : perm);
  }, []);

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[Push] VITE_VAPID_PUBLIC_KEY not set — push disabled');
      return false;
    }
    if (!('serviceWorker' in navigator)) return false;

    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('denied'); return false; }

      // Unsubscribe old if exists, then re-subscribe
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      const p256dh = json.keys?.p256dh ?? '';
      const auth   = json.keys?.auth   ?? '';

      // Persist to Supabase
      if (clientId === 'admin') {
        const adminKey = import.meta.env.VITE_ADMIN_PASSWORD ?? '';
        await supabase.rpc('save_admin_push_subscription', {
          p_key:      adminKey,
          p_endpoint: sub.endpoint,
          p_p256dh:   p256dh,
          p_auth:     auth,
          p_ua:       navigator.userAgent.slice(0, 200),
        });
      } else if (clientId) {
        await supabase.rpc('save_push_subscription', {
          p_client_id: clientId,
          p_endpoint:  sub.endpoint,
          p_p256dh:    p256dh,
          p_auth:      auth,
          p_ua:        navigator.userAgent.slice(0, 200),
        });
      }

      // Store locally for anonymous users too (endpoint only)
      localStorage.setItem('gls_push_endpoint', sub.endpoint);

      setStatus('granted');
      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
      setStatus('denied');
      return false;
    }
  }, [clientId]);

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      localStorage.removeItem('gls_push_endpoint');
      setIsSubscribed(false);
      setStatus('default');
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err);
    }
  }, []);

  return { status, isSubscribed, subscribe, unsubscribe };
}
