// ✅ ARTILHEIRO-CAMPEAO-UI.JS v2.1 - Interface com Destaque Campeão + Rodada Final
// v2.1: Destaque APENAS no 1º lugar + Banner Rodada Final R38 + Parcial em tempo real
console.log("🎨 [ARTILHEIRO-UI] Módulo v2.1 carregando...");

// ===== CONFIGURAÇÕES DE INTERFACE =====
const UI_CONFIG = {
    classes: {
        container: "ranking-table",
        header: "table-header-bg",
        row: "table-row",
        button: "btn btn-primary",
    },

    spacing: {
        tablePadding: "6px 4px",
        headerPadding: "8px 4px",
        buttonPadding: "4px 8px",
        modalPadding: "15px 20px",
    },

    colors: {
        primary: "#2c3e50",
        success: "#28a745",
        danger: "#dc3545",
        info: "#3498db",
        warning: "#f39c12",
        background: "#f4f6f8",
        cardBg: "#fff",
        border: "#ddd",
        gold: "#ffd700",
    },
};

// ✅ v2.1: Constante da rodada final
const RODADA_FINAL = 38;

// ===== INTERFACE OTIMIZADA =====
export const ArtilheiroUI = {
    version: "2.1.0",

    // ✅ v2.1: Estado para controle de rodada
    estado: {
        rodadaAtual: 38,
        mercadoAberto: true,
        isParcial: false,
    },

    // Mostrar loading
    mostrarLoading(mensagem = "Carregando artilheiros...", progresso = null) {
        const loadingContainer = document.getElementById("artilheiro-loading");
        const artilheiroContainer = document.getElementById(
            "artilheiro-container",
        );

        if (loadingContainer) {
            loadingContainer.style.display = "block";

            let progressoHtml = "";
            if (progresso) {
                progressoHtml = `
                    <div style="max-width: 400px; margin: 15px auto;">
                        <div style="background: #e9ecef; border-radius: 10px; height: 20px; overflow: hidden;">
                            <div style="background: linear-gradient(90deg, #007bff, #0056b3); height: 100%; width: ${progresso.porcentagem}%; transition: width 0.3s ease;"></div>
                        </div>
                        <p style="margin: 8px 0 0 0; font-size: 0.9rem; color: #666; text-align: center;">
                            ${progresso.atual} de ${progresso.total} participantes (${progresso.porcentagem}%)
                        </p>
                    </div>
                `;
            }

            loadingContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 15px; color: #666;">${mensagem}</p>
                    ${progressoHtml}
                </div>
            `;
        }

        if (artilheiroContainer) {
            artilheiroContainer.style.display = "none";
        }
    },

    // Esconder loading
    esconderLoading() {
        const loadingContainer = document.getElementById("artilheiro-loading");
        const artilheiroContainer = document.getElementById(
            "artilheiro-container",
        );

        if (loadingContainer) {
            loadingContainer.style.display = "none";
        }

        if (artilheiroContainer) {
            artilheiroContainer.style.display = "block";
        }
    },

    // Mostrar erro
    mostrarErro(mensagem, detalhes = null) {
        const artilheiroContainer = document.getElementById(
            "artilheiro-container",
        );
        const loadingContainer = document.getElementById("artilheiro-loading");

        if (artilheiroContainer) {
            artilheiroContainer.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">❌</div>
                    <h3 style="margin: 0 0 10px 0;">Erro ao carregar dados</h3>
                    <p style="margin: 0 0 15px 0;">${mensagem}</p>
                    ${detalhes ? `<details style="margin: 15px 0; text-align: left;"><summary>🔍 Ver detalhes técnicos</summary><pre style="background: #fff; border: 1px solid #ddd; padding: 10px; font-size: 0.8rem;">${detalhes}</pre></details>` : ""}
                    <div style="margin-top: 20px;">
                        <button onclick="window.location.reload()" class="btn" style="background: #dc3545; color: white; margin-right: 10px;">🔄 Tentar Novamente</button>
                    </div>
                </div>
            `;
            artilheiroContainer.style.display = "block";
        }

        if (loadingContainer) {
            loadingContainer.style.display = "none";
        }
    },

    // Interface principal
    renderizarInterface(dados, estatisticas, configuracoes = {}) {
        const artilheiroContainer = document.getElementById(
            "artilheiro-container",
        );
        if (!artilheiroContainer) {
            console.error("Container #artilheiro-container não encontrado");
            return;
        }

        const {
            rodadaAtual = 38,
            rodadaFim = 37,
            mercadoAberto = true,
        } = configuracoes;

        // ✅ v2.1: Atualizar estado
        this.estado.rodadaAtual = rodadaAtual;
        this.estado.mercadoAberto = mercadoAberto;
        this.estado.isParcial = !mercadoAberto;

        const html = `
            <!-- ✅ v2.1: BANNER RODADA FINAL -->
            ${this._renderizarBannerRodadaFinal(rodadaAtual, mercadoAberto, dados[0])}

            <!-- HEADER COMPACTO -->
            ${this._renderizarHeaderCompacto(rodadaAtual, rodadaFim)}

            <!-- ESTATÍSTICAS SIMPLES -->
            ${this._renderizarEstatisticasCompactas(estatisticas)}

            <!-- TABELA PRINCIPAL OTIMIZADA -->
            ${this._renderizarTabelaOtimizada(dados)}

            <!-- FOOTER INFORMATIVO -->
            ${this._renderizarFooterSimples(estatisticas, rodadaFim)}

            <!-- ✅ v2.1: ESTILOS DE DESTAQUE -->
            ${this._injetarEstilosDestaque()}
        `;

        artilheiroContainer.innerHTML = html;
        this.esconderLoading();
        window._dadosArtilheiros = dados;

        console.log("✅ [ARTILHEIRO-UI] Interface v2.1 renderizada");
    },

    // ✅ v2.1: Banner Rodada Final
    _renderizarBannerRodadaFinal(rodadaAtual, mercadoAberto, lider) {
        if (rodadaAtual !== RODADA_FINAL) return "";

        const isParcial = !mercadoAberto;
        const statusTexto = isParcial ? "EM ANDAMENTO" : "ÚLTIMA RODADA";
        const liderNome =
            lider?.nomeCartoleiro || lider?.nome_cartoleiro || "---";
        const liderGols = lider?.golsPro || 0;

        return `
            <div class="rodada-final-banner ${isParcial ? "parcial-ativo" : ""}" style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #ffd700;
                border-radius: 12px;
                padding: 12px 20px;
                margin-bottom: 15px;
                box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
                ${isParcial ? "animation: borderPulse 2s infinite;" : ""}
            ">
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; flex-wrap: wrap;">
                    <div style="font-size: 2rem;">🏁</div>
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <span style="color: #ffd700; font-size: 1.2rem; font-weight: bold; letter-spacing: 2px;">RODADA FINAL</span>
                        <span style="color: ${isParcial ? "#ff6b6b" : "#aaa"}; font-size: 0.8rem; ${isParcial ? "animation: textPulse 1.5s infinite;" : ""}">${statusTexto}</span>
                    </div>
                    ${
                        isParcial
                            ? `
                        <div style="background: linear-gradient(135deg, #ffd700, #ffaa00); padding: 8px 16px; border-radius: 20px; display: flex; flex-direction: column; align-items: center;">
                            <span style="font-size: 0.65rem; color: #1a1a2e; font-weight: 600; letter-spacing: 1px;">POSSÍVEL ARTILHEIRO</span>
                            <span style="font-size: 0.95rem; color: #1a1a2e; font-weight: bold;">${liderNome} (${liderGols} gols)</span>
                        </div>
                    `
                            : ""
                    }
                </div>
            </div>
        `;
    },

    // Header compacto
    _renderizarHeaderCompacto(rodadaAtual, rodadaFim) {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap;">
                <div>
                    <h2 style="margin: 0; color: ${UI_CONFIG.colors.primary}; font-size: 1.5rem;">
                        🏆 Artilheiro Campeão
                    </h2>
                    <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 0.85rem;">
                        📊 Dados até a ${rodadaFim}ª rodada (atual: ${rodadaAtual})
                    </p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="window.coordinator?.exportarDados()" class="btn" style="padding: 6px 12px; background: ${UI_CONFIG.colors.info}; color: white; font-size: 0.8rem;">
                        📤 Exportar
                    </button>
                    <button onclick="window.coordinator?.popularGols()" class="btn" style="padding: 6px 12px; background: ${UI_CONFIG.colors.primary}; color: white; font-size: 0.8rem;">
                        🔄 Atualizar
                    </button>
                </div>
            </div>
        `;
    },

    // Estatísticas compactas
    _renderizarEstatisticasCompactas(estatisticas) {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 15px;">
                <div style="background: linear-gradient(135deg, #e8f5e8, #c8e6c9); padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #81c784;">
                    <div style="font-size: 1.3rem; font-weight: bold; color: #2e7d32; margin-bottom: 3px;">${estatisticas.totalGolsPro || 0}</div>
                    <div style="font-size: 0.75rem; color: #424242;">⚽ Gols Pró</div>
                </div>
                <div style="background: linear-gradient(135deg, #ffebee, #ffcdd2); padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #f48fb1;">
                    <div style="font-size: 1.3rem; font-weight: bold; color: #d32f2f; margin-bottom: 3px;">${estatisticas.totalGolsContra || 0}</div>
                    <div style="font-size: 0.75rem; color: #424242;">🔴 Gols Contra</div>
                </div>
                <div style="background: linear-gradient(135deg, #e3f2fd, #bbdefb); padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #90caf9;">
                    <div style="font-size: 1.3rem; font-weight: bold; color: ${estatisticas.totalSaldo >= 0 ? "#1976d2" : "#d32f2f"}; margin-bottom: 3px;">${this._formatarSaldo(estatisticas.totalSaldo || 0)}</div>
                    <div style="font-size: 0.75rem; color: #424242;">📊 Saldo Total</div>
                </div>
                <div style="background: linear-gradient(135deg, #fff3e0, #ffcc80); padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #ffb74d;">
                    <div style="font-size: 1.3rem; font-weight: bold; color: #f57c00; margin-bottom: 3px;">${estatisticas.participantesAtivos || 0}</div>
                    <div style="font-size: 0.75rem; color: #424242;">👥 Participantes</div>
                </div>
            </div>
        `;
    },

    // Tabela otimizada
    _renderizarTabelaOtimizada(dados) {
        return `
            <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <table class="ranking-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead style="background: #f4f6fa;">
                        <tr>
                            <th style="${UI_CONFIG.spacing.headerPadding}; text-align: center; width: 45px; font-weight: 600;">Pos</th>
                            <th style="${UI_CONFIG.spacing.headerPadding}; text-align: center; width: 30px; font-weight: 600;">❤️</th>
                            <th style="${UI_CONFIG.spacing.headerPadding}; text-align: left; min-width: 150px; font-weight: 600;">Cartoleiro</th>
                            <th style="${UI_CONFIG.spacing.headerPadding}; text-align: left; min-width: 120px; font-weight: 600;">Time</th>
                            <th style="${UI_CONFIG.spacing.headerPadding}; text-align: center; width: 50px; font-weight: 600;">GP</th>
                            <th style="${UI_CONFIG.spacing.headerPadding}; text-align: center; width: 50px; font-weight: 600;">GC</th>
                            <th style="${UI_CONFIG.spacing.headerPadding}; text-align: center; width: 50px; font-weight: 600;">SG</th>
                            <th style="${UI_CONFIG.spacing.headerPadding}; text-align: center; width: 65px; font-weight: 600;">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this._renderizarLinhasOtimizadas(dados)}
                    </tbody>
                </table>
            </div>
        `;
    },

    // ✅ v2.1: Linhas com destaque APENAS no 1º lugar
    _renderizarLinhasOtimizadas(dados) {
        const isRodadaFinalParcial =
            this.estado.rodadaAtual === RODADA_FINAL && this.estado.isParcial;

        return dados
            .map((participante, index) => {
                let estiloLinha = "";
                let labelPosicao = `${index + 1}º`;
                let classeExtra = "";

                // ✅ v2.1: DESTAQUE APENAS NO 1º LUGAR
                if (index === 0) {
                    estiloLinha = `
                        background: linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 255, 255, 0) 100%);
                        border-left: 4px solid #ffd700;
                        font-weight: 600;
                    `;
                    labelPosicao = `<span class="trofeu-campeao" style="
                        background: linear-gradient(135deg, #ffd700, #ffaa00);
                        color: #1a1a2e;
                        padding: 4px 8px;
                        border-radius: 8px;
                        font-size: 1rem;
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);
                        animation: brilhoTrofeu 2s infinite;
                    ">🏆</span>`;

                    // Se rodada final parcial, adicionar indicador
                    if (isRodadaFinalParcial) {
                        classeExtra = "possivel-campeao";
                    }
                } else if (index === dados.length - 1 && dados.length > 1) {
                    // Último lugar (lanterna) - vermelho suave
                    estiloLinha =
                        "background: linear-gradient(to right, #ffebee, #fff);";
                }

                // Escudos
                const escudoClube = participante.clube_id
                    ? `<img src="/escudos/${participante.clube_id}.png" alt="❤️" style="width: 16px; height: 16px; border-radius: 50%; border: 1px solid #ddd;" onerror="this.style.display='none'">`
                    : "—";

                const escudoTime = participante.url_escudo_png
                    ? `<img src="${participante.url_escudo_png}" alt="Escudo" style="width: 18px; height: 18px; border-radius: 50%; border: 1px solid #ddd;" onerror="this.style.display='none'">`
                    : `<div style="width: 18px; height: 18px; border-radius: 50%; background: #e9ecef; display: flex; align-items: center; justify-content: center; font-size: 8px;">👤</div>`;

                const nomeCartoleiro =
                    participante.nomeCartoleiro || participante.nome_cartoleiro;
                const nomeTime =
                    participante.nomeTime || participante.nome_time;

                // ✅ v2.1: Adicionar coroa se for possível campeão
                const coroaPossivelCampeao =
                    index === 0 && isRodadaFinalParcial
                        ? '<span class="coroa-animada" style="margin-left: 4px;">👑</span>'
                        : "";

                return `
                <tr class="${classeExtra}" style="border-bottom: 1px solid #eee; ${estiloLinha}" 
                    onmouseover="this.style.backgroundColor='#f5f5f5'" 
                    onmouseout="this.style.backgroundColor='${index === 0 ? "rgba(255, 215, 0, 0.1)" : index === dados.length - 1 ? "#ffebee" : "white"}'">

                    <!-- Posição -->
                    <td style="${UI_CONFIG.spacing.tablePadding}; text-align: center;">
                        ${labelPosicao}
                    </td>

                    <!-- Clube do Coração -->
                    <td style="${UI_CONFIG.spacing.tablePadding}; text-align: center;">
                        ${escudoClube}
                    </td>

                    <!-- Cartoleiro -->
                    <td style="${UI_CONFIG.spacing.tablePadding}; text-align: left;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            ${escudoTime}
                            <span style="font-weight: 500; color: #2c3e50; font-size: 0.9rem;">
                                ${this._truncarTexto(nomeCartoleiro, 20)}${coroaPossivelCampeao}
                            </span>
                        </div>
                    </td>

                    <!-- Time -->
                    <td style="${UI_CONFIG.spacing.tablePadding}; text-align: left;">
                        <span style="color: #6c757d; font-size: 0.85rem;">
                            ${this._truncarTexto(nomeTime, 18)}
                        </span>
                    </td>

                    <!-- Gols Pró -->
                    <td style="${UI_CONFIG.spacing.tablePadding}; text-align: center;">
                        <span style="font-weight: 600; color: #28a745; background: #e8f5e8; padding: 2px 5px; border-radius: 8px; font-size: 0.8rem;">
                            ${participante.golsPro || 0}
                        </span>
                    </td>

                    <!-- Gols Contra -->
                    <td style="${UI_CONFIG.spacing.tablePadding}; text-align: center;">
                        <span style="font-weight: 600; color: #dc3545; background: #ffebee; padding: 2px 5px; border-radius: 8px; font-size: 0.8rem;">
                            ${participante.golsContra || 0}
                        </span>
                    </td>

                    <!-- Saldo -->
                    <td style="${UI_CONFIG.spacing.tablePadding}; text-align: center;">
                        <span style="font-weight: 600; color: ${(participante.saldoGols || 0) >= 0 ? "#28a745" : "#dc3545"}; background: ${(participante.saldoGols || 0) >= 0 ? "#e8f5e8" : "#ffebee"}; padding: 2px 5px; border-radius: 8px; font-size: 0.8rem;">
                            ${this._formatarSaldo(participante.saldoGols || 0)}
                        </span>
                    </td>

                    <!-- Detalhes -->
                    <td style="${UI_CONFIG.spacing.tablePadding}; text-align: center;">
                        <button onclick="window.coordinator?.mostrarDetalhesCompletos(${index})" 
                                style="padding: 3px 6px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.7rem;">
                            👁️ Ver
                        </button>
                    </td>
                </tr>
            `;
            })
            .join("");
    },

    // ✅ v2.1: Estilos de destaque
    _injetarEstilosDestaque() {
        return `
            <style>
                @keyframes brilhoTrofeu {
                    0%, 100% { box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5); }
                    50% { box-shadow: 0 2px 15px rgba(255, 215, 0, 0.9); }
                }

                @keyframes borderPulse {
                    0%, 100% { border-color: #ffd700; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3); }
                    50% { border-color: #ff6b6b; box-shadow: 0 4px 20px rgba(255, 107, 107, 0.5); }
                }

                @keyframes textPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .possivel-campeao {
                    animation: destaqueCampeao 1.5s infinite;
                }

                @keyframes destaqueCampeao {
                    0%, 100% { background: linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 255, 255, 0) 100%) !important; }
                    50% { background: linear-gradient(90deg, rgba(255, 215, 0, 0.35) 0%, rgba(255, 255, 255, 0) 100%) !important; }
                }

                .coroa-animada {
                    animation: coroaPulse 1s infinite;
                    display: inline-block;
                }

                @keyframes coroaPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                }
            </style>
        `;
    },

    // Footer simples
    _renderizarFooterSimples(estatisticas, rodadaFim) {
        const agora = new Date();
        const horaAtualizacao = agora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        });

        return `
            <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.75rem; color: #6c757d; text-align: center;">
                📈 ${estatisticas.participantesAtivos || 0} participantes ativos
                • Atualizado às ${horaAtualizacao}
                • Rodadas: 1 a ${rodadaFim}
            </div>
        `;
    },

    // Utilitários
    _formatarSaldo(saldo) {
        if (saldo > 0) return `+${saldo}`;
        return String(saldo);
    },

    _truncarTexto(texto, max) {
        if (!texto) return "";
        return texto.length > max ? texto.substring(0, max) + "..." : texto;
    },

    // ✅ v2.1: Atualizar estado
    atualizarEstado(rodadaAtual, mercadoAberto) {
        this.estado.rodadaAtual = rodadaAtual;
        this.estado.mercadoAberto = mercadoAberto;
        this.estado.isParcial = !mercadoAberto;
    },
};

// Disponibilizar globalmente
if (typeof window !== "undefined") {
    window.ArtilheiroUI = ArtilheiroUI;
}

console.log(
    "✅ [ARTILHEIRO-UI] Módulo v2.1 carregado - Destaque 1º lugar + Rodada Final",
);
