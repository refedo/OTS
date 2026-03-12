/**
 * Service Worker for Hexa Steel® OTS
 * Handles push notifications and basic offline caching
 */

const CACHE_NAME = 'ots-v1';
const OFFLINE_URL = '/offline';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Push notification received
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'Hexa Steel® OTS',
      body: event.data.text(),
      icon: '/icons/icon-192x192.png',
    };
  }

  const options = {
    body: data.body || data.message || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || data.notificationId || 'ots-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      notificationId: data.notificationId,
      type: data.type,
    },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Hexa Steel® OTS', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Open new window if none exists
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Notification close handler - mark as read via API
self.addEventListener('notificationclose', (event) => {
  const notificationId = event.notification.data?.notificationId;
  if (notificationId) {
    fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      credentials: 'same-origin',
    }).catch(() => {
      // Silently fail - notification will remain unread
    });
  }
});
