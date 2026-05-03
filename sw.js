// sw.js — MotoBite Service Worker
// Handles background push notifications on Android Chrome.
// Placed in the root folder alongside index.html.
//
// What this does:
//   1. Intercepts notification clicks (notificationclick event)
//   2. Focuses the app window (or opens it if closed)
//   3. Posts a NOTIF_CLICK message to the page so app.js can open the right screen

const APP_SCOPE = '/';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close(); // dismiss the notification banner

  const intent = e.notification.data || {};

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Find an existing app window
        const appClient = clients.find(c =>
          c.url.includes(self.location.origin) || c.url.includes('vercel.app')
        );

        if(appClient){
          // App is already open — focus it and tell it what to do
          return appClient.focus().then(c => {
            c.postMessage({ type: 'NOTIF_CLICK', ...intent });
          });
        } else {
          // App was closed — open it fresh
          // The startup code in app.js reads mb_notif_intent from localStorage
          // (written before the notification was sent) and acts on it automatically.
          return self.clients.openWindow(APP_SCOPE);
        }
      })
  );
});

// ── Background sync / fetch passthrough ──────────────────────────────────────
// We don't cache anything — MotoBite is a live data app.
// All network requests go straight through to the server.
self.addEventListener('fetch', e => {
  // Let the browser handle everything — no caching strategy needed
  return;
});
