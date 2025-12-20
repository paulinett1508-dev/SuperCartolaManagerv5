// =====================================================================
// PARTICIPANTE-SEASON-SELECTOR.JS - Seletor de Temporada v1.0
// =====================================================================
// Componente para alternar entre temporadas (histórico / atual)
// Persiste a preferência no localStorage
// =====================================================================

if (window.Log) Log.info("SEASON-SELECTOR", "🗓️ Carregando seletor de temporada v1.0...");

class SeasonSelector {
    constructor() {
        this.STORAGE_KEY = "participante_temporada_selecionada";
        this.temporadaAtual = window.ParticipanteConfig?.CURRENT_SEASON || 2025;
        this.temporadaAnterior = window.ParticipanteConfig?.PREVIOUS_SEASON || 2024;
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

    // Gerar HTML do seletor
    getHTML() {
        const isAtual = this.temporadaSelecionada === this.temporadaAtual;
        const isHistorico = !isAtual;

        return `
            <div class="season-selector" id="seasonSelectorComponent">
                <button
                    class="season-btn ${isHistorico ? 'active' : ''}"
                    data-ano="${this.temporadaAnterior}"
                    title="Ver dados históricos de ${this.temporadaAnterior}"
                >
                    <span class="material-symbols-outlined" style="font-size: 16px;">history</span>
                    ${this.temporadaAnterior}
                </button>
                <button
                    class="season-btn ${isAtual ? 'active' : ''}"
                    data-ano="${this.temporadaAtual}"
                    title="Ver temporada atual ${this.temporadaAtual}"
                >
                    <span class="material-symbols-outlined" style="font-size: 16px;">sports_soccer</span>
                    ${this.temporadaAtual}
                </button>
            </div>
        `;
    }

    // Configurar eventos
    configurarEventos(container) {
        const btns = container.querySelectorAll(".season-btn");
        btns.forEach(btn => {
            btn.addEventListener("click", () => {
                const ano = parseInt(btn.dataset.ano);
                this.alternarTemporada(ano);

                // Atualizar UI
                btns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });
    }

    // Injetar estilos CSS
    static injetarEstilos() {
        if (document.getElementById("season-selector-styles")) return;

        const styles = document.createElement("style");
        styles.id = "season-selector-styles";
        styles.textContent = `
            .season-selector {
                display: flex;
                gap: 4px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                padding: 4px;
            }
            .season-btn {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 6px 12px;
                border: none;
                border-radius: 6px;
                background: transparent;
                color: rgba(255, 255, 255, 0.6);
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .season-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.9);
            }
            .season-btn.active {
                background: linear-gradient(135deg, #ff4500, #e63e00);
                color: white;
            }
            .season-btn .material-symbols-outlined {
                font-variation-settings: 'FILL' 0, 'wght' 400;
            }
            .season-btn.active .material-symbols-outlined {
                font-variation-settings: 'FILL' 1, 'wght' 500;
            }

            /* Indicador de modo histórico */
            .historico-mode-indicator {
                position: fixed;
                top: 60px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                color: white;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
                animation: slideDown 0.3s ease;
            }
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            .historico-mode-indicator button {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 10px;
                cursor: pointer;
                margin-left: 8px;
            }
            .historico-mode-indicator button:hover {
                background: rgba(255, 255, 255, 0.3);
            }
        `;
        document.head.appendChild(styles);
    }

    // Mostrar/esconder indicador de modo histórico
    atualizarIndicadorHistorico() {
        let indicator = document.getElementById("historicoModeIndicator");

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

// Inicializar indicador se necessário
document.addEventListener("DOMContentLoaded", () => {
    seasonSelector.atualizarIndicadorHistorico();
});

if (window.Log) Log.info("SEASON-SELECTOR", "✅ Seletor de temporada v1.0 carregado");

export default seasonSelector;
