// Bump this to force SW cache invalidation on deploy.
const CACHE_NAME = 'gl-solar-v23';
const OFFLINE_URL = '/index.html';

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ⛔ Не кешуємо нічого на localhost (dev-сервер)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  // ⛔ Пропускаємо зовнішні API
  if (
    url.href.includes('supabase.co') ||
    url.href.includes('google-analytics') ||
    url.href.includes('googletagmanager')
  ) {
    return;
  }

  // ✅ Always try network first for SPA navigation / index.html
  // This ensures users receive updated asset hashes after deploy.
  const isNavigation = event.request.mode === 'navigate';
  const isIndexHtml = url.pathname === '/' || url.pathname.endsWith('/index.html');

  if (isNavigation || isIndexHtml) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Cache-first for other requests (JS/CSS/images), with network fallback + cache update.
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return networkResponse;
      }).catch(() => {
        // For non-navigation requests we can just fail silently.
      });
    })
  );
});

// ── Push Notifications ──────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: 'Green Light Scandinavia', body: event.data.text() }; }

  const { title = 'Green Light Scandinavia', body = '', icon, tag, url } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:   icon  || '/icon.svg',
      badge:  '/icon.svg',
      tag:    tag   || 'gls-notification',
      data:   { url: url || '/' },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
