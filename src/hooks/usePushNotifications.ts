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
  const [status, setStatus]           = useState<PushStatus>('loading');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // ── Check support + existing subscription on mount ───────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    const perm = Notification.permission;
    if (perm === 'denied') { setStatus('denied'); return; }

    // Check if browser already has an active push subscription
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => {
        if (sub) {
          setIsSubscribed(true);
          setStatus('granted');
        } else {
          setStatus(perm === 'default' ? 'default' : 'granted');
        }
      })
      .catch(() => {
        setStatus(perm === 'default' ? 'default' : (perm as PushStatus));
      });
  }, []);

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[Push] VITE_VAPID_PUBLIC_KEY not set');
      return false;
    }
    if (!('serviceWorker' in navigator)) return false;

    setStatus('loading');
    try {
      const reg  = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('denied'); return false; }

      // Unsubscribe old if exists, then re-subscribe fresh
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const json   = sub.toJSON();
      const p256dh = json.keys?.p256dh ?? '';
      const auth   = json.keys?.auth   ?? '';

      if (!p256dh || !auth) {
        console.error('[Push] Missing keys in subscription');
        setStatus('denied');
        return false;
      }

      // Persist to Supabase via RPC
      if (clientId === 'admin') {
        const adminKey = import.meta.env.VITE_ADMIN_PASSWORD ?? '';
        if (!adminKey) {
          console.warn('[Push] VITE_ADMIN_PASSWORD not set — cannot persist admin push subscription');
        } else {
        const { error } = await supabase.rpc('save_admin_push_subscription', {
          p_key:      adminKey,
          p_endpoint: sub.endpoint,
          p_p256dh:   p256dh,
          p_auth:     auth,
          p_ua:       navigator.userAgent.slice(0, 200),
        });
        if (error) {
          console.error(
            '[Push] save_admin_push_subscription error:',
            error.message || error,
            (error as any).details ? `details: ${(error as any).details}` : '',
            (error as any).hint ? `hint: ${(error as any).hint}` : ''
          );
          // Don't fail — subscription still works locally
        }
        }
      } else if (clientId) {
        const { error } = await supabase.rpc('save_push_subscription', {
          p_client_id: clientId,
          p_endpoint:  sub.endpoint,
          p_p256dh:    p256dh,
          p_auth:      auth,
          p_ua:        navigator.userAgent.slice(0, 200),
        });
        if (error) {
          console.error(
            '[Push] save_push_subscription error:',
            error.message || error,
            (error as any).details ? `details: ${(error as any).details}` : '',
            (error as any).hint ? `hint: ${(error as any).hint}` : ''
          );
        }
      }

      localStorage.setItem('gls_push_endpoint', sub.endpoint);
      setStatus('granted');
      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
      setStatus(Notification.permission === 'denied' ? 'denied' : 'default');
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
