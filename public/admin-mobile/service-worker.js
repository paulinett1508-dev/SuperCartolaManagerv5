/**
 * Service Worker - Admin Mobile PWA
 * Cache Strategy: Network-first para API, Cache-first para assets
 */

const CACHE_NAME = 'scm-admin-v1.0.0';
const RUNTIME_CACHE = 'scm-admin-runtime';

// Arquivos para cache no install
const STATIC_ASSETS = [
  '/admin-mobile/',
  '/admin-mobile/index.html',
  '/admin-mobile/login.html',
  '/admin-mobile/manifest.json',
  '/admin-mobile/css/admin-mobile.css',
  '/admin-mobile/css/components.css',
  '/admin-mobile/css/dark-mode.css',
  '/admin-mobile/js/app.js',
  '/admin-mobile/js/auth.js',
  '/admin-mobile/js/api.js',
  '/admin-mobile/icons/icon-192x192.png',
  '/admin-mobile/icons/icon-512x512.png',
  // Fontes e CDNs
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Russo+One&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// ========== INSTALL ========== //
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// ========== ACTIVATE ========== //
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        // Deleta caches antigos
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// ========== FETCH ========== //
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // API calls - network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - cache-first
  event.respondWith(cacheFirst(request));
});

// ========== CACHE STRATEGIES ========== //

/**
 * Cache-first strategy
 * Tenta buscar do cache primeiro, se não encontrar busca na rede
 */
async function cacheFirst(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
      console.log('[SW] Cache hit:', request.url);
      return cached;
    }

    console.log('[SW] Cache miss, fetching:', request.url);
    const response = await fetch(request);

    // Cacheia resposta se for bem-sucedida
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Cache-first error:', error);

    // Retorna resposta offline genérica
    return new Response(
      JSON.stringify({ error: 'Você está offline' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Network-first strategy (com fallback para cache)
 * Tenta buscar da rede primeiro, se falhar busca do cache
 */
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    console.log('[SW] Network request:', request.url);
    const response = await fetch(request);

    // Cacheia resposta se for bem-sucedida
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Network error, trying cache:', error);

    // Fallback para cache
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }

    // Retorna erro offline
    return new Response(
      JSON.stringify({
        error: 'Você está offline e não há dados em cache',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ========== PUSH NOTIFICATIONS ========== //
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  if (!event.data) {
    console.log('[SW] Push notification without data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);

    const options = {
      body: data.body,
      icon: data.icon || '/admin-mobile/icons/icon-192x192.png',
      badge: data.badge || '/admin-mobile/icons/badge.png',
      data: data.data || {},
      requireInteraction: data.requireInteraction || false,
      tag: data.tag || 'scm-admin-notification',
      vibrate: data.vibrate || [200, 100, 200],
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('[SW] Error showing notification:', error);
  }
});

// ========== NOTIFICATION CLICK ========== //
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/admin-mobile/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Se app já está aberto, foca nele
        for (const client of clientList) {
          if (client.url.includes('/admin-mobile') && 'focus' in client) {
            console.log('[SW] Focusing existing window');
            return client.focus().then(() => {
              // Navega para a URL se necessário
              if (urlToOpen !== '/admin-mobile/') {
                client.postMessage({
                  type: 'NAVIGATE',
                  url: urlToOpen
                });
              }
            });
          }
        }

        // Caso contrário, abre nova janela
        if (clients.openWindow) {
          console.log('[SW] Opening new window:', urlToOpen);
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ========== BACKGROUND SYNC ========== //
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

/**
 * Sincroniza ações pendentes (offline → online)
 */
async function syncPendingActions() {
  console.log('[SW] Syncing pending actions...');

  try {
    // TODO: Implementar sincronização de ações offline
    // 1. Buscar ações pendentes do IndexedDB
    // 2. Enviar para API
    // 3. Remover do IndexedDB se sucesso
    // 4. Notificar usuário

    console.log('[SW] Sync completed');
  } catch (error) {
    console.error('[SW] Sync error:', error);
    throw error; // Retry sync later
  }
}

// ========== MESSAGE HANDLER ========== //
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      }).then(() => {
        console.log('[SW] All caches cleared');
        return self.registration.unregister();
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
