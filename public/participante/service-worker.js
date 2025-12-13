// =====================================================================
// service-worker.js - Service Worker do PWA v3.0 (OTIMIZADO)
// Destino: /participante/service-worker.js
// ✅ v3.0: Cache First para assets, Network Only para HTML/APIs
// ✅ v3.0: Força limpeza de caches antigos
// =====================================================================

const CACHE_NAME = "super-cartola-v6";

// Arquivos essenciais para cache inicial
const STATIC_ASSETS = [
    "/participante/css/participante.css",
    "/participante/css/splash-screen.css",
    "/participante/css/pull-refresh.css",
    "/escudos/default.png",
    "/escudos/placeholder.png",
];

// Extensões que devem usar Cache First
const CACHE_FIRST_EXTENSIONS = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'];

// ✅ Instalação - cachear arquivos estáticos
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
            .catch((err) => console.warn("[SW] Erro no install:", err)),
    );
});

// ✅ Ativação - limpar caches antigos
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name)),
                );
            })
            .then(() => self.clients.claim()),
    );
});

// ✅ v2.0: Estratégias de cache otimizadas
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // ❌ IGNORAR completamente requisições externas
    if (url.origin !== self.location.origin) {
        return;
    }

    // ❌ Ignorar requisições não-GET
    if (request.method !== "GET") {
        return;
    }

    // ❌ NETWORK ONLY: APIs - nunca cachear
    if (url.pathname.startsWith("/api/")) {
        return;
    }

    // ❌ NETWORK ONLY: HTML - sempre buscar versão mais recente
    if (url.pathname.endsWith('.html') ||
        url.pathname === '/participante/' ||
        url.pathname === '/participante') {
        return; // Deixa o navegador buscar normalmente
    }

    // ✅ CACHE FIRST: Assets estáticos (CSS, JS, imagens, fontes)
    const isCacheableAsset = CACHE_FIRST_EXTENSIONS.some(ext => url.pathname.endsWith(ext));

    if (isCacheableAsset) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    // Retorna do cache imediatamente
                    // Atualiza cache em background (stale-while-revalidate)
                    fetch(request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, networkResponse);
                            });
                        }
                    }).catch(() => {});
                    return cachedResponse;
                }

                // Se não está no cache, busca da rede e cacheia
                return fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                });
            })
        );
        return;
    }

    // Demais recursos: deixa o navegador lidar
});

// ✅ Mensagem para forçar atualização
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
