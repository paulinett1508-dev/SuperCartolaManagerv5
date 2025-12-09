// =====================================================================
// service-worker.js - Service Worker do PWA
// Destino: /participante/service-worker.js
// =====================================================================

const CACHE_NAME = 'super-cartola-v1';

// Arquivos essenciais para cache inicial
const STATIC_ASSETS = [
    '/participante/',
    '/participante/index.html',
    '/participante/css/participante.css',
    '/participante/css/splash-screen.css',
    '/escudos/default.png',
    '/escudos/placeholder.png'
];

// ✅ Instalação - cachear arquivos estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                // Ativar imediatamente sem esperar
                return self.skipWaiting();
            })
    );
});

// ✅ Ativação - limpar caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => {
                // Tomar controle de todas as páginas imediatamente
                return self.clients.claim();
            })
    );
});

// ✅ Fetch - estratégia Network First com fallback para cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar requisições não-GET
    if (request.method !== 'GET') return;

    // Ignorar APIs - sempre buscar da rede
    if (url.pathname.startsWith('/api/')) return;

    // Para outros recursos: Network First
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Se resposta válida, cachear e retornar
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => cache.put(request, responseClone));
                }
                return response;
            })
            .catch(() => {
                // Fallback para cache se offline
                return caches.match(request);
            })
    );
});

// ✅ Mensagem para forçar atualização (usado pelo app-version.js)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
