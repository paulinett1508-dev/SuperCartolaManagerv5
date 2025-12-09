// =====================================================================
// service-worker.js - Service Worker do PWA (CORRIGIDO)
// Destino: /participante/service-worker.js
// =====================================================================

const CACHE_NAME = "super-cartola-v1";

// Arquivos essenciais para cache inicial (apenas locais)
const STATIC_ASSETS = [
    "/participante/",
    "/participante/index.html",
    "/participante/css/participante.css",
    "/participante/css/splash-screen.css",
    "/escudos/default.png",
    "/escudos/placeholder.png",
];

// ✅ Instalação - cachear arquivos estáticos
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                return self.skipWaiting();
            })
            .catch((err) => {
                console.warn("[SW] Erro no install:", err);
            }),
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
            .then(() => {
                return self.clients.claim();
            }),
    );
});

// ✅ Fetch - IGNORAR URLs externas, só processar locais
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // ❌ IGNORAR completamente requisições externas (não interceptar)
    if (url.origin !== self.location.origin) {
        return; // Deixa o navegador lidar normalmente
    }

    // ❌ Ignorar requisições não-GET
    if (request.method !== "GET") {
        return;
    }

    // ❌ Ignorar APIs - sempre buscar da rede
    if (url.pathname.startsWith("/api/")) {
        return;
    }

    // ✅ Para recursos LOCAIS: Network First com fallback para cache
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Se resposta válida, cachear e retornar
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches
                        .open(CACHE_NAME)
                        .then((cache) => cache.put(request, responseClone));
                }
                return response;
            })
            .catch(() => {
                // Fallback para cache se offline
                return caches.match(request);
            }),
    );
});

// ✅ Mensagem para forçar atualização (usado pelo app-version.js)
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
