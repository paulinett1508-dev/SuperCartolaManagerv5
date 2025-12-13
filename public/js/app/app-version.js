// =====================================================================
// app-version.js - Sistema de Versionamento v4.0
// =====================================================================
// v4.0: Modal de atualização RESTAURADO
//       - Compara versão local com servidor
//       - Exibe modal quando há nova versão
//       - Botão para recarregar e atualizar
// =====================================================================

const AppVersion = {
    LOCAL_KEY: "app_version",
    CHECK_INTERVAL: 5 * 60 * 1000, // Verificar a cada 5 minutos

    // ✅ Inicializar
    async init() {
        // Registrar Service Worker do PWA
        this.registrarServiceWorker();

        // Buscar versão e verificar atualização
        await this.verificarVersao();

        // Verificar periodicamente
        setInterval(() => this.verificarVersao(), this.CHECK_INTERVAL);
    },

    // ✅ Registrar Service Worker
    async registrarServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/participante/service-worker.js');

                // Detectar quando SW é atualizado
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Nova versão do SW disponível
                            this.mostrarModalAtualizacao();
                        }
                    });
                });

                if (window.Log) Log.info('APP-VERSION', 'Service Worker registrado');
            } catch (error) {
                if (window.Log) Log.warn('APP-VERSION', 'Erro ao registrar SW:', error);
            }
        }
    },

    // ✅ Verificar versão no servidor
    async verificarVersao() {
        try {
            const response = await fetch("/api/app/versao");
            if (!response.ok) return;

            const servidor = await response.json();
            const versaoServidor = servidor.version;
            const versaoLocal = localStorage.getItem(this.LOCAL_KEY);

            // Atualizar badge
            this.atualizarBadgeHeader(versaoServidor);

            // Se é primeira vez, apenas salvar
            if (!versaoLocal) {
                localStorage.setItem(this.LOCAL_KEY, versaoServidor);
                return;
            }

            // Se versão mudou, mostrar modal
            if (versaoLocal !== versaoServidor) {
                this.mostrarModalAtualizacao(versaoServidor);
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
                    <button class="update-btn-later" onclick="AppVersion.fecharModal()">Depois</button>
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

        const laterBtn = overlay.querySelector('.update-btn-later');
        laterBtn.style.cssText = `
            padding: 12px 24px;
            border-radius: 8px;
            border: 1px solid #444;
            background: transparent;
            color: #888;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s;
        `;

        const nowBtn = overlay.querySelector('.update-btn-now');
        nowBtn.style.cssText = `
            padding: 12px 24px;
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

    // ✅ Fechar modal
    fecharModal() {
        const overlay = document.getElementById('update-modal-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    // ✅ Atualizar agora
    atualizarAgora() {
        // Limpar versão local para forçar recarga limpa
        localStorage.removeItem(this.LOCAL_KEY);

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

if (window.Log) Log.info('APP-VERSION', '✅ Sistema de versionamento v4.0 carregado (com modal)');
