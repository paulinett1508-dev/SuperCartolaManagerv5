// =====================================================================
// app-version.js - Sistema de versionamento do App
// Destino: /public/js/app/app-version.js
// =====================================================================

const AppVersion = {
    LOCAL_KEY: "app_version",
    checkInterval: null,

    // ✅ Inicializar verificação de versão
    async init() {
        await this.verificarVersao();
        // Verificar a cada 5 minutos
        this.checkInterval = setInterval(
            () => this.verificarVersao(),
            5 * 60 * 1000,
        );
    },

    // ✅ Buscar versão do servidor
    async getVersaoServidor() {
        try {
            const response = await fetch("/api/app/versao");
            if (!response.ok) throw new Error("Falha ao buscar versão");
            return await response.json();
        } catch (error) {
            console.warn("[APP-VERSION] Erro ao buscar versão:", error);
            return null;
        }
    },

    // ✅ Obter versão local (version + build)
    getVersaoLocal() {
        return localStorage.getItem(this.LOCAL_KEY);
    },

    // ✅ Salvar versão local (version + build)
    salvarVersaoLocal(version, build) {
        localStorage.setItem(this.LOCAL_KEY, `${version}-${build}`);
    },

    // ✅ Verificar se precisa atualizar
    async verificarVersao() {
        const servidor = await this.getVersaoServidor();
        if (!servidor) return;

        const chaveServidor = `${servidor.version}-${servidor.build}`;
        const local = this.getVersaoLocal();

        // Primeira vez ou versão diferente
        if (!local) {
            this.salvarVersaoLocal(servidor.version, servidor.build);
            this.atualizarBadgeHeader(servidor.version);
            return;
        }

        if (local !== chaveServidor) {
            this.mostrarModalAtualizacao(servidor);
        } else {
            this.atualizarBadgeHeader(servidor.version);
        }
    },

    // ✅ Atualizar badge no header
    atualizarBadgeHeader(version) {
        const badge = document.getElementById("app-version-badge");
        if (badge) {
            badge.textContent = `v${version}`;
        }
    },

    // ✅ Modal de atualização obrigatória
    mostrarModalAtualizacao(servidor) {
        // Remover modal existente se houver
        const existente = document.getElementById("app-update-modal");
        if (existente) existente.remove();

        const modal = document.createElement("div");
        modal.id = "app-update-modal";
        modal.className = "app-update-overlay";
        modal.innerHTML = `
            <div class="app-update-modal">
                <div class="app-update-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </div>
                <h3>Nova versão disponível</h3>
                <p class="app-update-version">v${servidor.version}</p>
                <p class="app-update-notes">${servidor.releaseNotes || "Melhorias e correções"}</p>
                <button class="app-update-btn" onclick="AppVersion.aplicarAtualizacao('${servidor.version}', '${servidor.build}')">
                    Atualizar agora
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Forçar reflow para animação
        requestAnimationFrame(() => modal.classList.add("visible"));
    },

    // ✅ Aplicar atualização (reload forçado)
    aplicarAtualizacao(version, build) {
        this.salvarVersaoLocal(version, build);

        // Limpar cache do service worker se existir
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                registrations.forEach((reg) => reg.unregister());
            });
        }

        // Limpar caches
        if ("caches" in window) {
            caches.keys().then((names) => {
                names.forEach((name) => caches.delete(name));
            });
        }

        // Reload forçado (bypass cache)
        window.location.reload(true);
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

console.log("[APP-VERSION] ✅ Sistema de versionamento carregado");
