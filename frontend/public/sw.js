const CACHE_NAME = 'resultados-mundialistas-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/logo.png',
  '/manifest.json'
];

// Install event: cache initial resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: respond with network-first for navigation, stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isSelfOrigin = url.startsWith(self.location.origin);
  const isAllowedExternal = url.includes('flagcdn.com') || url.includes('api.dicebear.com');
  const isApiCall = url.includes('/api/');
  
  if (event.request.method !== 'GET' || (!isSelfOrigin && !isAllowedExternal) || isApiCall) {
    return;
  }
  
  const isNavigation = event.request.mode === 'navigate' || url.endsWith('/') || url.endsWith('index.html');
  
  const isCacheableResponse = (response) => {
    return response && (response.status === 200 || (response.status === 0 && response.type === 'opaque'));
  };
  
  if (isNavigation) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (isCacheableResponse(networkResponse)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache for next time
        fetch(event.request).then((networkResponse) => {
          if (isCacheableResponse(networkResponse)) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        
        return cachedResponse;
      }
      
      return fetch(event.request).then((networkResponse) => {
        if (!isCacheableResponse(networkResponse)) {
          return networkResponse;
        }
        
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      });
    })
  );
});

// Push Notification Event Listener
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { notification: { title: 'Polla Mundialista', body: event.data.text() } };
    }
  }

  const notification = data.notification || {};
  const title = notification.title || 'Polla Mundialista';
  const options = {
    body: notification.body || '¡Hay novedades en el mundial!',
    icon: notification.icon || '/logo.png',
    badge: '/favicon.svg', // smaller icon for status bar
    data: notification.data || { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click Event Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, navigate/focus it
      for (const client of clientList) {
        const url = new URL(client.url);
        if (url.pathname === targetUrl || targetUrl === '/') {
          return client.focus().then(() => {
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
          });
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

