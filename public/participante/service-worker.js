// =====================================================================
// service-worker.js - Service Worker do PWA v3.2 (FORCE CACHE CLEAR)
// Destino: /participante/service-worker.js
// ✅ v3.2: FORCE CACHE CLEAR - Limpar cache antigo que causava erros
// ✅ v3.1: Network-First com cache fallback (FIX fetch failures)
// ✅ v3.0: Força limpeza de caches antigos
// BUILD: 2026-01-16T18:36:00Z
// =====================================================================

const CACHE_NAME = "super-cartola-v9-clear";

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

    // ✅ NETWORK FIRST: Assets estáticos (CSS, JS, imagens, fontes)
    const isCacheableAsset = CACHE_FIRST_EXTENSIONS.some(ext => url.pathname.endsWith(ext));

    if (isCacheableAsset) {
        event.respondWith(
            // Tenta da rede primeiro, fallback para cache se falhar
            fetch(request)
                .then((networkResponse) => {
                    // Sucesso na rede - cacheia e retorna
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch((fetchError) => {
                    // Falha na rede - tenta buscar do cache
                    return caches.match(request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        
                        // Nem rede nem cache funcionaram
                        console.warn('[SW] Failed to fetch and no cache:', request.url);
                        throw new Error('Offline and no cache available');
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
