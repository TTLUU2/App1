// Point Hacks Copilot service worker — handles incoming web-push events.
//
// Lives at /sw.js (served from /public). Registered client-side by
// `useWebPush` once the user opts in. Intentionally minimal: it does NOT
// cache assets or intercept fetches — Next.js handles routing/cache, and
// our PWA install path only needs SW for the `push` and
// `notificationclick` events. Re-deploying the app updates this file via
// the standard SW update lifecycle.

self.addEventListener('install', () => {
  // Activate immediately on first install so the user doesn't need to
  // reload the page to enable notifications.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of any already-open tabs.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Point Hacks Copilot', body: event.data.text() };
  }
  const title = payload.title || 'Point Hacks Copilot';
  const options = {
    body: payload.body || '',
    tag: payload.tag, // optional — newer same-tag notifications replace older ones
    data: { url: payload.url || '/optimisation' },
    icon: '/icon.svg',
    badge: '/icon.svg',
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/optimisation';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus + navigate that tab rather
      // than opening a new one.
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
