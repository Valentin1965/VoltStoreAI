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

  // ── Check support + existing subscription on mount (safe for mobile) ─────
  useEffect(() => {
    let cancelled = false;
    try {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }
      if (typeof Notification === 'undefined') {
        setStatus('unsupported');
        return;
      }
      const perm = Notification.permission;
      if (perm === 'denied') {
        setStatus('denied');
        return;
      }
      const sw = navigator.serviceWorker;
      if (!sw || typeof sw.ready !== 'function') {
        setStatus('unsupported');
        return;
      }
      sw.ready
        .then(reg => {
          if (cancelled) return;
          if (!reg || !reg.pushManager) {
            setStatus(perm === 'default' ? 'default' : 'granted');
            return;
          }
          return reg.pushManager.getSubscription();
        })
        .then(sub => {
          if (cancelled) return;
          if (sub) {
            setIsSubscribed(true);
            setStatus('granted');
          } else {
            setStatus(perm === 'default' ? 'default' : 'granted');
          }
        })
        .catch(() => {
          if (!cancelled) setStatus(perm === 'default' ? 'default' : 'granted');
        });
    } catch (_) {
      if (!cancelled) setStatus('unsupported');
    }
    return () => { cancelled = true; };
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
      console.warn('[Push] Subscribe failed:', err);
      try {
        setStatus(typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'denied' : 'default');
      } catch {
        setStatus('unsupported');
      }
      return false;
    }
  }, [clientId]);

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        setIsSubscribed(false);
        setStatus('default');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      if (!reg?.pushManager) {
        setIsSubscribed(false);
        setStatus('default');
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      if (typeof localStorage !== 'undefined') localStorage.removeItem('gls_push_endpoint');
      setIsSubscribed(false);
      setStatus('default');
    } catch (err) {
      console.warn('[Push] Unsubscribe failed:', err);
      setIsSubscribed(false);
      setStatus('default');
    }
  }, []);

  return { status, isSubscribed, subscribe, unsubscribe };
}
