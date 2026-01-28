// =====================================================================
// app-version.js - Sistema de Versionamento v5.1
// =====================================================================
// v5.1: Modal obrigatório - Removido botão "Depois"
//       - Participante é obrigado a clicar em "Atualizar"
// v5.0: Suporte a versionamento separado Admin/App
//       - Envia header x-client-type para identificar cliente
//       - Usa endpoint /api/app/check-version
// v4.1: Otimização - Remove polling de 5min, usa visibilitychange
// v4.0: Modal de atualização RESTAURADO
// =====================================================================

const AppVersion = {
    LOCAL_KEY: "app_version",
    LOCAL_BOOT_KEY: "app_server_boot",
    CLIENT_TYPE: "app", // Identificador do cliente (app = participante)
    CACHE_TTL: 5000, // ✅ CHECK curto para atualização imediata
    CHECK_INTERVAL_MS: 5000,
    lastCheck: 0, // Timestamp da última verificação
    isUpdating: false,

    // ✅ EMERGENCY: Limpar todos os caches e SW (uma única vez)
    async limparCachesAntigos() {
        const FLAG_KEY = 'sw_emergency_clean_v8';
        if (localStorage.getItem(FLAG_KEY)) {
            return; // Já foi feito
        }

        try {
            // Unregister todos os Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // Limpar TODOS os caches
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));

            // Marcar como feito
            localStorage.setItem(FLAG_KEY, 'done');
            
            if (window.Log) Log.info('APP-VERSION', '🧹 Limpeza emergencial concluída');
        } catch (error) {
            if (window.Log) Log.warn('APP-VERSION', 'Erro na limpeza:', error);
        }
    },

    // ✅ Inicializar
    async init() {
        // ✅ EMERGENCY: Limpar caches antigos UMA VEZ
        await this.limparCachesAntigos();

        // Registrar Service Worker do PWA
        this.registrarServiceWorker();

        // Buscar versão e verificar atualização
        await this.verificarVersao();

        // Forçar checagem periódica (foreground)
        this.iniciarAutoCheck();

        // Verificar quando app volta do background
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.verificarVersao();
            }
        });
    },

    // ✅ Registrar Service Worker
    async registrarServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/participante/service-worker.js', {
                    updateViaCache: 'none' // Força buscar SW sempre do servidor
                });

                // Forçar verificação de atualização
                registration.update();

                // Detectar quando SW é atualizado
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Nova versão do SW disponível - força atualização imediata
                            if (registration.waiting) {
                                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                            }
                            this.forcarAtualizacao('sw-update');
                        }
                    });
                });

                // Quando o SW assume controle, recarregar
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (this.isUpdating) {
                        window.location.reload(true);
                    }
                });

                // Mensagens do SW (ex: push force update)
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event?.data?.type === 'FORCE_UPDATE') {
                        this.forcarAtualizacao('sw-message');
                    }
                });

                if (window.Log) Log.info('APP-VERSION', 'Service Worker registrado');
            } catch (error) {
                if (window.Log) Log.warn('APP-VERSION', 'Erro ao registrar SW:', error);
            }
        }
    },

    // ✅ Verificar versão no servidor
    async verificarVersao() {
        // ✅ FIX: Cache de 1 minuto - não verificar se já verificou recentemente
        const agora = Date.now();
        if (agora - this.lastCheck < this.CACHE_TTL) {
            if (window.Log) Log.debug('APP-VERSION', 'Verificação em cache, aguardando TTL');
            return;
        }
        this.lastCheck = agora;

        try {
            // Usar novo endpoint com identificação de cliente
            const response = await fetch("/api/app/check-version", {
                headers: {
                    "x-client-type": this.CLIENT_TYPE
                }
            });
            if (!response.ok) return;

            const servidor = await response.json();
            const versaoServidor = servidor.version;
            const bootServidor = servidor.serverBoot;
            const versaoLocal = localStorage.getItem(this.LOCAL_KEY);
            const bootLocal = localStorage.getItem(this.LOCAL_BOOT_KEY);

            // Log de debug (só em dev)
            if (window.Log && servidor.clientDetected) {
                Log.debug('APP-VERSION', `Cliente detectado: ${servidor.clientDetected}`);
            }

            // Atualizar badge
            this.atualizarBadgeHeader(versaoServidor);

            // Se é primeira vez, apenas salvar
            if (!versaoLocal) {
                localStorage.setItem(this.LOCAL_KEY, versaoServidor);
                if (bootServidor) localStorage.setItem(this.LOCAL_BOOT_KEY, bootServidor);
                return;
            }

            if (bootServidor && !bootLocal) {
                localStorage.setItem(this.LOCAL_BOOT_KEY, bootServidor);
            }

            // Se versão ou boot mudou, forçar atualização
            if (versaoLocal !== versaoServidor || (bootServidor && bootLocal && bootLocal !== bootServidor)) {
                this.forcarAtualizacao('version-check', versaoServidor);
            }
        } catch (error) {
            // Usar versão do cache se falhar
            const cached = localStorage.getItem(this.LOCAL_KEY);
            if (cached) this.atualizarBadgeHeader(cached);
        }
    },

    // ✅ Atualizar badge no header
    atualizarBadgeHeader(version) {
        const badge = document.getElementById("app-version-badge");
        if (badge) {
            badge.textContent = `v${version}`;
        }
    },

    // ✅ Mostrar modal de atualização
    mostrarModalAtualizacao(novaVersao) {
        // Evitar múltiplos modais
        if (document.getElementById('update-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'update-modal-overlay';
        overlay.innerHTML = `
            <div class="update-modal">
                <div class="update-modal-icon">
                    <span class="material-symbols-outlined">system_update</span>
                </div>
                <h3>Nova versão disponível!</h3>
                <p>Uma atualização está disponível${novaVersao ? ` (v${novaVersao})` : ''}.</p>
                <p class="update-modal-sub">Clique em atualizar para carregar a versão mais recente.</p>
                <div class="update-modal-buttons">
                    <button class="update-btn-now" onclick="AppVersion.atualizarAgora()">Atualizar</button>
                </div>
            </div>
        `;

        // Adicionar estilos inline
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            backdrop-filter: blur(5px);
        `;

        const modal = overlay.querySelector('.update-modal');
        modal.style.cssText = `
            background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
            border-radius: 16px;
            padding: 24px;
            max-width: 320px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 69, 0, 0.3);
        `;

        const icon = overlay.querySelector('.update-modal-icon');
        icon.style.cssText = `
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #ff4500, #ff6b35);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
        `;

        const iconSpan = overlay.querySelector('.update-modal-icon span');
        iconSpan.style.cssText = `
            font-size: 32px;
            color: white;
        `;

        const h3 = overlay.querySelector('h3');
        h3.style.cssText = `
            color: #fff;
            font-size: 1.25rem;
            margin: 0 0 8px;
        `;

        const p = overlay.querySelector('p');
        p.style.cssText = `
            color: #ccc;
            font-size: 0.95rem;
            margin: 0 0 4px;
        `;

        const subP = overlay.querySelector('.update-modal-sub');
        subP.style.cssText = `
            color: #888;
            font-size: 0.85rem;
            margin: 0 0 20px;
        `;

        const buttons = overlay.querySelector('.update-modal-buttons');
        buttons.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: center;
        `;

        const nowBtn = overlay.querySelector('.update-btn-now');
        nowBtn.style.cssText = `
            padding: 12px 32px;
            border-radius: 8px;
            border: none;
            background: linear-gradient(135deg, #ff4500, #ff6b35);
            color: white;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        `;

        document.body.appendChild(overlay);
    },

    iniciarAutoCheck() {
        if (this._autoCheckId) return;
        this._autoCheckId = setInterval(() => {
            this.verificarVersao();
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistration('/participante/').then((reg) => {
                    if (reg) reg.update();
                });
            }
        }, this.CHECK_INTERVAL_MS);
    },

    forcarAtualizacao(reason, novaVersao) {
        if (this.isUpdating) return;
        this.isUpdating = true;

        if (window.Log) Log.warn('APP-VERSION', `⚡ Forçando atualização (${reason})`);

        this.mostrarOverlayAtualizacao(novaVersao);
        this.atualizarAgora();
    },

    mostrarOverlayAtualizacao(novaVersao) {
        if (document.getElementById('update-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'update-modal-overlay';
        overlay.innerHTML = `
            <div class="update-modal">
                <div class="update-modal-icon">
                    <span class="material-symbols-outlined">autorenew</span>
                </div>
                <h3>Atualizando agora...</h3>
                <p>Estamos carregando a versão mais recente${novaVersao ? ` (v${novaVersao})` : ''}.</p>
                <p class="update-modal-sub">Aguarde alguns segundos.</p>
            </div>
        `;

        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            backdrop-filter: blur(6px);
        `;

        const modal = overlay.querySelector('.update-modal');
        modal.style.cssText = `
            background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
            border-radius: 16px;
            padding: 24px;
            max-width: 320px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 69, 0, 0.3);
        `;

        const icon = overlay.querySelector('.update-modal-icon');
        icon.style.cssText = `
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #ff4500, #ff6b35);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            animation: spin 1.2s linear infinite;
        `;

        const iconSpan = overlay.querySelector('.update-modal-icon span');
        iconSpan.style.cssText = `
            font-size: 32px;
            color: white;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `;
        document.head.appendChild(style);

        const h3 = overlay.querySelector('h3');
        h3.style.cssText = `
            color: #fff;
            font-size: 1.1rem;
            margin: 0 0 8px;
        `;

        const p = overlay.querySelector('p');
        p.style.cssText = `
            color: #ccc;
            font-size: 0.95rem;
            margin: 0 0 4px;
        `;

        const subP = overlay.querySelector('.update-modal-sub');
        subP.style.cssText = `
            color: #888;
            font-size: 0.85rem;
            margin: 0;
        `;

        document.body.appendChild(overlay);
    },

    // ✅ Atualizar agora
    atualizarAgora() {
        // Limpar versão local para forçar recarga limpa
        localStorage.removeItem(this.LOCAL_KEY);
        localStorage.removeItem(this.LOCAL_BOOT_KEY);

        // Forçar atualização do Service Worker
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }

        // Limpar cache do SW
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }

        // Recarregar página
        setTimeout(() => {
            window.location.reload(true);
        }, 500);
    }
};

// Expor globalmente
window.AppVersion = AppVersion;

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => AppVersion.init());
} else {
    AppVersion.init();
}

if (window.Log) Log.info('APP-VERSION', '✅ Sistema de versionamento v5.1 carregado (modal obrigatório)');
