/**
 * FERRAMENTAS CORE MODULE
 * Gerencia todas as funcionalidades da seção Ferramentas
 * Elimina redundâncias e centraliza APIs
 */

import { LayoutManager } from "../core/layout-manager.js";
import { ApiClient } from "../core/api-client.js";

export class FerramentasManager {
    constructor() {
        this.layoutManager = new LayoutManager();
        this.apiClient = new ApiClient();
        this.stats = { ligas: 0, times: 0, ultimaSync: null };
        this.isLoading = false;
    }

    async init() {
        try {
            await this.layoutManager.load();
            this.attachEventListeners();
            await this.loadStats();
        } catch (error) {
            console.error("Erro ao inicializar ferramentas:", error);
            this.showError("Erro ao carregar ferramentas");
        }
    }

    attachEventListeners() {
        // Delegação de eventos para os cards
        document.addEventListener("click", (e) => {
            const card = e.target.closest("[data-action]");
            if (!card) return;

            const action = card.dataset.action;
            this.handleCardAction(action, card);
        });

        // Atalhos de teclado
        document.addEventListener("keydown", (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case "n":
                        e.preventDefault();
                        this.handleCardAction("criar-liga");
                        break;
                    case "g":
                        e.preventDefault();
                        this.handleCardAction("gerenciar");
                        break;
                }
            }
        });
    }

    async handleCardAction(action, cardElement = null) {
        if (this.isLoading) return;

        // Feedback visual
        if (cardElement) {
            cardElement.style.transform = "scale(0.95)";
            setTimeout(() => {
                cardElement.style.transform = "";
            }, 150);
        }

        try {
            switch (action) {
                case "criar-liga":
                    await this.navigateToCreateLiga();
                    break;
                case "gerenciar":
                    await this.navigateToGerenciar();
                    break;
                case "popular-rodadas":
                    await this.showRodadasOptions();
                    break;
                case "backup":
                    await this.showBackupOptions();
                    break;
                default:
                    console.warn("Ação não implementada:", action);
            }
        } catch (error) {
            console.error(`Erro ao executar ação ${action}:`, error);
            this.showError(`Erro ao executar ${action}`);
        }
    }

    async navigateToCreateLiga() {
        // Verificar se já existem ligas - se não, mostrar onboarding
        if (this.stats.ligas === 0) {
            await this.showOnboarding();
        }
        window.location.href = "criar-liga.html";
    }

    async navigateToGerenciar() {
        if (this.stats.ligas === 0) {
            this.showError("Nenhuma liga encontrada. Crie uma liga primeiro.");
            return;
        }
        window.location.href = "gerenciar.html";
    }

    async showRodadasOptions() {
        // Modal com opções de rodadas
        const ligas = await this.apiClient.get("/api/ligas");
        if (ligas.length === 0) {
            this.showError("Nenhuma liga encontrada para popular rodadas.");
            return;
        }

        const modal = this.createModal(
            "Selecionar Liga para Rodadas",
            this.buildLigasList(ligas),
        );
        document.body.appendChild(modal);
    }

    async showBackupOptions() {
        const modal = this.createModal(
            "Opções de Backup",
            this.buildBackupOptions(),
        );
        document.body.appendChild(modal);
    }

    async loadStats() {
        try {
            const statsElements = {
                totalLigas: document.getElementById("totalLigas"),
                totalTimes: document.getElementById("totalTimes"),
                ultimaSync: document.getElementById("ultimaSync"),
            };

            // Mostrar loading
            Object.values(statsElements).forEach((el) => {
                if (el) el.parentElement.classList.add("loading");
            });

            // Carregar dados em paralelo
            const [ligasData, configData] = await Promise.allSettled([
                this.apiClient.get("/api/ligas"),
                this.apiClient.get("/api/configuracoes"),
            ]);

            // Processar ligas
            if (ligasData.status === "fulfilled") {
                const ligas = ligasData.value || [];
                this.stats.ligas = ligas.length;
                this.stats.times = ligas.reduce(
                    (sum, liga) => sum + (liga.times ? liga.times.length : 0),
                    0,
                );
            }

            // Processar última sync
            if (configData.status === "fulfilled") {
                const config = configData.value || {};
                this.stats.ultimaSync = config.ultimaSync || "Nunca";
            }

            // Atualizar UI
            if (statsElements.totalLigas) {
                statsElements.totalLigas.textContent = this.stats.ligas;
            }
            if (statsElements.totalTimes) {
                statsElements.totalTimes.textContent = this.stats.times;
            }
            if (statsElements.ultimaSync) {
                statsElements.ultimaSync.textContent = this.formatLastSync(
                    this.stats.ultimaSync,
                );
            }
        } catch (error) {
            console.error("Erro ao carregar estatísticas:", error);
            // Falhar silenciosamente para stats
        } finally {
            // Remover loading
            document.querySelectorAll(".stats-card.loading").forEach((el) => {
                el.classList.remove("loading");
            });
        }
    }

    formatLastSync(timestamp) {
        if (timestamp === "Nunca" || !timestamp) return "Nunca";

        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 1) return "Agora";
            if (diffMins < 60) return `${diffMins}min atrás`;
            if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`;
            return date.toLocaleDateString("pt-BR");
        } catch {
            return "Erro";
        }
    }

    buildLigasList(ligas) {
        return `
            <div class="ligas-modal-list">
                ${ligas
                    .map(
                        (liga) => `
                    <div class="liga-modal-item" data-liga-id="${liga._id}">
                        <strong>${liga.nome}</strong>
                        <span>${liga.times ? liga.times.length : 0} times</span>
                        <button class="btn-primary" onclick="popularRodadas('${liga._id}')">
                            Popular Rodadas
                        </button>
                    </div>
                `,
                    )
                    .join("")}
            </div>
        `;
    }

    buildBackupOptions() {
        return `
            <div class="backup-options">
                <button class="btn-primary" onclick="exportarDados()">
                    Exportar Todas as Ligas
                </button>
                <button class="btn-secondary" onclick="importarDados()">
                    Importar Backup
                </button>
                <button class="btn-secondary" onclick="backupAutomatico()">
                    Configurar Backup Automático
                </button>
            </div>
        `;
    }

    createModal(title, content) {
        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        &times;
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        // Fechar com ESC
        modal.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                modal.remove();
            }
        });

        return modal;
    }

    async showOnboarding() {
        const modal = this.createModal(
            "Bem-vindo",
            `
            <div class="onboarding-content">
                <p>Esta parece ser sua primeira liga!</p>
                <p>O wizard irá te guiar através do processo de criação.</p>
            </div>
        `,
        );
        document.body.appendChild(modal);

        // Auto-fechar após 3 segundos
        setTimeout(() => modal.remove(), 3000);
    }

    showError(message) {
        // Toast notification simples
        const toast = document.createElement("div");
        toast.className = "toast toast-error";
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("toast-show");
            setTimeout(() => toast.remove(), 3000);
        }, 100);
    }
}

// Funções globais para compatibilidade
window.popularRodadas = async function (ligaId) {
    try {
        window.location.href = `admin.html?id=${ligaId}`;
    } catch (error) {
        console.error("Erro ao navegar para admin:", error);
    }
};

window.exportarDados = async function () {
    // Implementar exportação
    SuperModal.toast.info("Funcionalidade de exportação será implementada");
};

window.importarDados = async function () {
    // Implementar importação
    SuperModal.toast.info("Funcionalidade de importação será implementada");
};

window.backupAutomatico = async function () {
    // Implementar backup automático
    SuperModal.toast.info("Configuração de backup automático será implementada");
};
