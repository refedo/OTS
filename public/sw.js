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

  // iOS Safari doesn't support notification actions — append a tap hint
  let body = data.body || data.message || '';
  const supportsActions = 'actions' in Notification.prototype;
  if (!supportsActions && data.actions && data.actions.length > 0) {
    body += '\nTap to open and take action.';
  }

  const options = {
    body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || data.notificationId || 'ots-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      notificationId: data.notificationId,
      type: data.type,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId,
    },
    actions: supportsActions ? (data.actions || []) : [],
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

  const notifData = event.notification.data || {};
  const action = event.action; // empty string if body clicked, action id if button clicked

  // If an action button was clicked, execute it via API
  if (action && notifData.notificationId) {
    event.waitUntil(
      handleNotificationAction(action, notifData).then(() => {
        // After the action, navigate to the task
        return navigateToUrl(notifData.url || '/');
      })
    );
    return;
  }

  // Body click — navigate to the related entity
  const urlToOpen = notifData.url || '/';
  event.waitUntil(navigateToUrl(urlToOpen));
});

/**
 * Execute a notification action (complete/approve/reject) via API
 */
async function handleNotificationAction(action, notifData) {
  const basePath = self.registration.scope.replace(/\/$/, '').replace(self.location.origin, '');
  const apiUrl = `${basePath}/api/notifications/${notifData.notificationId}/action`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (response.ok) {
      // Show a brief confirmation notification
      const actionLabels = {
        complete: 'completed',
        approve: 'approved',
        reject: 'rejected',
      };
      await self.registration.showNotification('Hexa Steel® OTS', {
        body: `Task ${actionLabels[action] || action} successfully`,
        icon: '/icons/icon-192x192.png',
        tag: 'ots-action-confirmation',
        requireInteraction: false,
        silent: true,
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      await self.registration.showNotification('Hexa Steel® OTS', {
        body: errorData.error || `Failed to ${action} — please try from the app`,
        icon: '/icons/icon-192x192.png',
        tag: 'ots-action-error',
        requireInteraction: false,
      });
    }
  } catch {
    await self.registration.showNotification('Hexa Steel® OTS', {
      body: `Could not ${action} — you appear to be offline`,
      icon: '/icons/icon-192x192.png',
      tag: 'ots-action-error',
      requireInteraction: false,
    });
  }
}

/**
 * Navigate to a URL, reusing an existing window if possible
 */
function navigateToUrl(url) {
  // Ensure we have a full absolute URL for both navigate() and openWindow()
  const fullUrl = url.startsWith('http') ? url : new URL(url, self.location.origin).href;

  return self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            if (focusedClient && 'navigate' in focusedClient) {
              return focusedClient.navigate(fullUrl);
            }
          });
        }
      }
      return self.clients.openWindow(fullUrl);
    });
}

// Fetch handler — network-first strategy (required for PWA installability)
self.addEventListener('fetch', (event) => {
  // Only handle same-origin navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL) || new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
    );
    return;
  }
  // Let all other requests pass through to the network
  return;
});

// Skip waiting when told by the client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notification close handler - mark as read via API
self.addEventListener('notificationclose', (event) => {
  const notificationId = event.notification.data?.notificationId;
  if (notificationId) {
    const basePath = self.registration.scope.replace(/\/$/, '').replace(self.location.origin, '');
    fetch(`${basePath}/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      credentials: 'same-origin',
    }).catch(() => {
      // Silently fail - notification will remain unread
    });
  }
});
