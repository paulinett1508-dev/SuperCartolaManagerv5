// =====================================================================
// PARTICIPANTE-SEASON-SELECTOR.JS - Seletor de Temporada v1.1
// =====================================================================
// Componente para alternar entre temporadas (histórico / atual)
// Persiste a preferência no localStorage
// ✅ v1.1: Respeita isLigaEstreante - não mostra indicador para ligas novas
// =====================================================================

if (window.Log) Log.info("SEASON-SELECTOR", "🗓️ Carregando seletor de temporada v1.1...");

class SeasonSelector {
    constructor() {
        this.STORAGE_KEY = "participante_temporada_selecionada";
        this.temporadaAtual = window.ParticipanteConfig?.CURRENT_SEASON || 2026;
        this.temporadaAnterior = window.ParticipanteConfig?.PREVIOUS_SEASON || 2025;
        this.temporadaSelecionada = this.carregarPreferencia();
        this.listeners = [];
    }

    // Carregar preferência salva ou usar atual
    carregarPreferencia() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            const ano = parseInt(saved);
            if (ano === this.temporadaAtual || ano === this.temporadaAnterior) {
                return ano;
            }
        }
        return this.temporadaAtual; // Default: temporada atual
    }

    // Salvar preferência
    salvarPreferencia(ano) {
        localStorage.setItem(this.STORAGE_KEY, ano.toString());
    }

    // Obter temporada selecionada
    getTemporadaSelecionada() {
        return this.temporadaSelecionada;
    }

    // Verificar se está visualizando histórico
    isVisualizandoHistorico() {
        return this.temporadaSelecionada !== this.temporadaAtual;
    }

    // Alternar temporada
    alternarTemporada(ano) {
        if (ano !== this.temporadaSelecionada) {
            this.temporadaSelecionada = ano;
            this.salvarPreferencia(ano);

            if (window.Log) Log.info("SEASON-SELECTOR", `🔄 Temporada alterada para ${ano}`);

            // Notificar listeners
            this.notificarListeners();

            // Emitir evento global
            window.dispatchEvent(new CustomEvent("temporada-alterada", {
                detail: { ano, isHistorico: this.isVisualizandoHistorico() }
            }));
        }
    }

    // Registrar listener para mudanças
    onTemporadaChange(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // Notificar listeners
    notificarListeners() {
        this.listeners.forEach(cb => {
            try {
                cb(this.temporadaSelecionada, this.isVisualizandoHistorico());
            } catch (e) {
                console.error("Erro no listener de temporada:", e);
            }
        });
    }

    // Renderizar seletor no container especificado
    renderizarEm(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            if (window.Log) Log.warn("SEASON-SELECTOR", `Container ${containerId} não encontrado`);
            return;
        }

        container.innerHTML = this.getHTML();
        this.configurarEventos(container);
    }

    // Gerar HTML do seletor (estilo toast elegante)
    getHTML() {
        const isAtual = this.temporadaSelecionada === this.temporadaAtual;

        return `
            <div class="season-toast" id="seasonSelectorComponent">
                <button
                    class="season-toggle ${!isAtual ? 'showing-history' : ''}"
                    data-ano="${isAtual ? this.temporadaAnterior : this.temporadaAtual}"
                    title="${isAtual ? 'Ver histórico ' + this.temporadaAnterior : 'Voltar para ' + this.temporadaAtual}"
                >
                    <span class="material-symbols-outlined season-icon">${isAtual ? 'history' : 'sports_soccer'}</span>
                    <span class="season-label">${isAtual ? this.temporadaAnterior : this.temporadaAtual}</span>
                    <span class="material-symbols-outlined arrow-icon">chevron_right</span>
                </button>
            </div>
        `;
    }

    // Configurar eventos
    configurarEventos(container) {
        const btn = container.querySelector(".season-toggle");
        if (btn) {
            btn.addEventListener("click", () => {
                const ano = parseInt(btn.dataset.ano);
                this.alternarTemporada(ano);
                // Re-renderizar para atualizar o botão
                this.renderizarEm(container.parentElement?.id || container.id);
            });
        }
    }

    // Injetar estilos CSS
    static injetarEstilos() {
        if (document.getElementById("season-selector-styles")) return;

        const styles = document.createElement("style");
        styles.id = "season-selector-styles";
        styles.textContent = `
            /* Toast elegante e discreto */
            .season-toast {
                display: inline-flex;
            }
            .season-toggle {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border: none;
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.08);
                color: rgba(255, 255, 255, 0.7);
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.25s ease;
                backdrop-filter: blur(8px);
            }
            .season-toggle:hover {
                background: rgba(255, 255, 255, 0.12);
                color: rgba(255, 255, 255, 0.9);
            }
            .season-toggle .season-icon {
                font-size: 16px;
                opacity: 0.8;
            }
            .season-toggle .arrow-icon {
                font-size: 14px;
                opacity: 0.5;
                transition: transform 0.2s ease;
            }
            .season-toggle:hover .arrow-icon {
                transform: translateX(2px);
                opacity: 0.8;
            }
            .season-toggle.showing-history {
                background: rgba(255, 107, 0, 0.15);
                border: 1px solid rgba(255, 107, 0, 0.3);
                color: #ff8533;
            }
            .season-toggle.showing-history .season-icon {
                color: #ff6b00;
            }

            /* Indicador de modo histórico - Toast discreto */
            .historico-mode-indicator {
                position: fixed;
                top: 56px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(20, 20, 20, 0.95);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 107, 0, 0.25);
                color: rgba(255, 255, 255, 0.9);
                padding: 8px 14px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 1000;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
                animation: toastSlide 0.3s ease;
            }
            @keyframes toastSlide {
                from { transform: translateX(-50%) translateY(-10px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            .historico-mode-indicator .material-symbols-outlined {
                font-size: 14px;
                color: #ff8533;
            }
            .historico-mode-indicator button {
                background: transparent;
                border: 1px solid rgba(255, 107, 0, 0.4);
                color: #ff8533;
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 600;
                cursor: pointer;
                margin-left: 4px;
                transition: all 0.2s ease;
            }
            .historico-mode-indicator button:hover {
                background: rgba(255, 107, 0, 0.15);
                border-color: rgba(255, 107, 0, 0.6);
            }
        `;
        document.head.appendChild(styles);
    }

    // Mostrar/esconder indicador de modo histórico
    // ✅ v1.1: Respeita isLigaEstreante - ligas novas não têm histórico
    atualizarIndicadorHistorico() {
        let indicator = document.getElementById("historicoModeIndicator");

        // ✅ v1.1: Liga estreante NÃO deve mostrar indicador de histórico
        // (não tem temporadas anteriores para visualizar)
        if (window.isLigaEstreante) {
            // Forçar temporada atual para ligas estreantes
            if (this.temporadaSelecionada !== this.temporadaAtual) {
                this.temporadaSelecionada = this.temporadaAtual;
                this.salvarPreferencia(this.temporadaAtual);
            }
            // Remover indicador se existir
            if (indicator) indicator.remove();
            return;
        }

        if (this.isVisualizandoHistorico()) {
            if (!indicator) {
                indicator = document.createElement("div");
                indicator.id = "historicoModeIndicator";
                indicator.className = "historico-mode-indicator";
                indicator.innerHTML = `
                    <span class="material-symbols-outlined" style="font-size: 16px;">history</span>
                    Visualizando ${this.temporadaSelecionada}
                    <button onclick="window.seasonSelector.alternarTemporada(${this.temporadaAtual}); window.seasonSelector.atualizarIndicadorHistorico();">
                        Voltar para ${this.temporadaAtual}
                    </button>
                `;
                document.body.appendChild(indicator);
            }
        } else {
            if (indicator) {
                indicator.remove();
            }
        }
    }
}

// Criar instância global
const seasonSelector = new SeasonSelector();

// Injetar estilos
SeasonSelector.injetarEstilos();

// Expor globalmente
window.seasonSelector = seasonSelector;
window.SeasonSelector = SeasonSelector;

// Listener para atualizar indicador quando temporada mudar
seasonSelector.onTemporadaChange(() => {
    seasonSelector.atualizarIndicadorHistorico();
});

// ✅ v1.1: NÃO inicializar indicador no DOMContentLoaded
// Aguardar auth-ready para saber se é liga estreante
// Isso evita flash do indicador que some depois
document.addEventListener("DOMContentLoaded", () => {
    // Listener para quando auth estiver pronto (isLigaEstreante definido)
    window.addEventListener('participante-auth-ready', () => {
        seasonSelector.atualizarIndicadorHistorico();
    }, { once: true });

    // Fallback: se auth já rodou
    if (window.isLigaEstreante !== undefined) {
        seasonSelector.atualizarIndicadorHistorico();
    }
});

if (window.Log) Log.info("SEASON-SELECTOR", "✅ Seletor de temporada v1.1 carregado");

export default seasonSelector;
