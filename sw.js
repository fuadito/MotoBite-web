// sw.js — MotoBite Service Worker
// Handles background notifications and caching for ALL apps

const CACHE_NAME = 'motobite-v1';
const STATIC_ASSETS = [
  // Customer app
  '/',
  '/index.html',
  '/style.css',
  '/core.js',
  '/customer.js',
  // Rider app
  '/rider.html',
  '/rider.js',
  // Kitchen app
  '/kitchen.html',
  '/kitchen.js',
  // Admin app
  '/admin.html',
  '/admin.js'
];

// Install — cache static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (e) => {
  // Skip non-GET requests and API calls
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful responses
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        return caches.match(e.request).then((cached) => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});

// Push notifications
self.addEventListener('push', (e) => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'MotoBite', {
      body: data.body || 'New update',
      icon: '/web-app-manifest-192x192.png',
      badge: '/favicon-96x96.png',
      tag: data.tag || 'motobite-alert',
      data: data.data || {}
    })
  );
});

// Notification click — open app and post message to client
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Try to focus existing tab
        for (const client of clients) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'NOTIF_CLICK', data: e.notification.data });
            return;
          }
        }
        // Open new tab if none exists
        if (self.clients.openWindow) {
          self.clients.openWindow('/');
        }
      })
  );
});