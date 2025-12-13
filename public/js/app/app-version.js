// =====================================================================
// app-version.js - Sistema de Versionamento v3.0
// =====================================================================
// v3.0: Modo arquivo - Versão automática, sem modal de atualização
//       Apenas exibe a versão no badge do header
// =====================================================================

const AppVersion = {
    LOCAL_KEY: "app_version",

    // ✅ Inicializar
    async init() {
        // Registrar Service Worker do PWA
        this.registrarServiceWorker();

        // Buscar e exibir versão (sem modal)
        await this.atualizarBadge();
    },

    // ✅ Registrar Service Worker
    async registrarServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/participante/service-worker.js');
                if (window.Log) Log.info('APP-VERSION', 'Service Worker registrado');
            } catch (error) {
                if (window.Log) Log.warn('APP-VERSION', 'Erro ao registrar SW:', error);
            }
        }
    },

    // ✅ Buscar versão do servidor e atualizar badge
    async atualizarBadge() {
        try {
            const response = await fetch("/api/app/versao");
            if (!response.ok) return;

            const servidor = await response.json();
            this.atualizarBadgeHeader(servidor.version);
            localStorage.setItem(this.LOCAL_KEY, servidor.version);
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
};

// Expor globalmente
window.AppVersion = AppVersion;

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => AppVersion.init());
} else {
    AppVersion.init();
}

if (window.Log) Log.info('APP-VERSION', '✅ Sistema de versionamento carregado');
