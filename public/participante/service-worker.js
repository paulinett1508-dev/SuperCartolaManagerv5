// =====================================================================
// service-worker.js - Service Worker do PWA v3.7 (RODADAS EXPANDABLE)
// Destino: /participante/service-worker.js
// ✅ v3.7: RODADAS REDESIGN - Grupos expansíveis + slider horizontal
// ✅ v3.6: PUSH NOTIFICATIONS - Handlers de push, click e close
// ✅ v3.5: HOME PREMIUM UI - Cores hardcoded, fonte 72px, match cards azul
// ✅ v3.3: SALDO INICIAL FIX - Força reload para correções de saldo
// ✅ v3.2: FORCE CACHE CLEAR - Limpar cache antigo que causava erros
// ✅ v3.1: Network-First com cache fallback (FIX fetch failures)
// ✅ v3.0: Força limpeza de caches antigos
// BUILD: 2026-01-28T12:00:00Z
// =====================================================================

const CACHE_NAME = "super-cartola-v14-rodadas-expandable";

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
    if (!event.data) return;
    if (event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
        return;
    }
    if (event.data.type === "FORCE_UPDATE") {
        event.waitUntil(
            self.clients.matchAll({ type: "window", includeUncontrolled: true })
                .then((clientList) => {
                    clientList.forEach((client) => {
                        client.postMessage({ type: "FORCE_UPDATE" });
                    });
                })
        );
    }
});

// =====================================================================
// PUSH NOTIFICATIONS - v1.0 (FEAT-003)
// =====================================================================

// ✅ Receber Push Notification
self.addEventListener("push", (event) => {
    console.log("[SW] Push recebido:", event);

    // Payload padrão caso não tenha dados
    // Badge: usa default.png como fallback (TODO: criar badge-72x72.png monocromático)
    let payload = {
        title: "Super Cartola",
        body: "Você tem uma nova notificação",
        icon: "/escudos/default.png",
        badge: "/escudos/default.png",
        url: "/participante/",
        tag: "default",
    };

    // Parsear payload JSON se existir
    if (event.data) {
        try {
            const data = event.data.json();
            payload = {
                title: data.title || payload.title,
                body: data.body || payload.body,
                icon: data.icon || payload.icon,
                badge: data.badge || payload.badge,
                url: data.url || payload.url,
                tag: data.tag || payload.tag,
                data: data.data || {}, // dados extras
            };
        } catch (e) {
            // Se não for JSON, usa como texto simples
            payload.body = event.data.text() || payload.body;
        }
    }

    // Opções da notificação
    const options = {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        tag: payload.tag,
        vibrate: [200, 100, 200], // Vibração: on-off-on (ms)
        requireInteraction: false, // Auto-dismiss após alguns segundos
        data: {
            url: payload.url,
            ...payload.data,
        },
        actions: [
            {
                action: "open",
                title: "Abrir",
            },
            {
                action: "close",
                title: "Fechar",
            },
        ],
    };

    const forceUpdate = payload?.data?.forceUpdate === true;

    // Se for push de atualização forçada, avisa clientes imediatamente
    if (forceUpdate) {
        event.waitUntil(
            self.clients.matchAll({ type: "window", includeUncontrolled: true })
                .then((clientList) => {
                    clientList.forEach((client) => {
                        client.postMessage({ type: "FORCE_UPDATE" });
                    });
                })
        );
        return;
    }

    // Exibir notificação normal
    event.waitUntil(self.registration.showNotification(payload.title, options));
});

// ✅ Clique na Notificação
self.addEventListener("notificationclick", (event) => {
    console.log("[SW] Notificação clicada:", event.action);

    // Fechar a notificação
    event.notification.close();

    // Se clicou em "close", apenas fecha
    if (event.action === "close") {
        return;
    }

    // URL para navegar (padrão ou customizada)
    const urlToOpen = event.notification.data?.url || "/participante/";

    // Abrir URL ao clicar
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                // Procurar janela já aberta do app
                for (const client of clientList) {
                    const clientUrl = new URL(client.url);

                    // Se já tem uma janela do participante aberta, foca nela
                    if (clientUrl.pathname.startsWith("/participante") && "focus" in client) {
                        // Navegar para a URL específica
                        return client.navigate(urlToOpen).then(() => client.focus());
                    }
                }

                // Se não tem janela aberta, abre uma nova
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// ✅ Notificação fechada (swipe ou timeout)
self.addEventListener("notificationclose", (event) => {
    console.log("[SW] Notificação fechada:", event.notification.tag);
    // Pode ser usado para analytics no futuro
});
