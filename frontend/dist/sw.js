/* ============================================================
   SERVICE WORKER — Urban Safety App
   Handles Web Push notifications from the backend.
   Place this file at the root of your public/ folder.
   ============================================================ */

const CACHE_NAME = 'safety-app-v2';
const STATIC_ASSETS = ['/', '/index.html'];

// Install: cache core assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push notification received
self.addEventListener('push', (event) => {
  let data = { title: '🛡️ Safety Alert', body: 'You have a new alert.', tag: 'safety' };
  try {
    data = { ...data, ...event.data.json() };
  } catch (_) {}

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag || 'safety-alert',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 400],
    data: data.data || {},
    actions: [
      { action: 'view', title: '📍 View Location' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const alertData = event.notification.data;

  if (event.action === 'view' && alertData?.lat && alertData?.lng) {
    const mapsUrl = `https://www.google.com/maps?q=${alertData.lat},${alertData.lng}`;
    event.waitUntil(clients.openWindow(mapsUrl));
  } else {
    event.waitUntil(clients.openWindow('/'));
  }
});

// Fetch: network-first strategy for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return; // Don't cache API calls
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
