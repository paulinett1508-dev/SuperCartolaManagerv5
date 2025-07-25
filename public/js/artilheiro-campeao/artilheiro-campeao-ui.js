// ✅ ARTILHEIRO-CAMPEAO-UI.JS v2.0 - Interface Otimizada SEM Conflitos
console.log("🎨 [ARTILHEIRO-UI] Módulo v2.0 carregando...");

// ===== CONFIGURAÇÕES DE INTERFACE =====
const UI_CONFIG = {
    classes: {
        container: "ranking-table",
        header: "table-header-bg",
        row: "table-row",
        button: "btn btn-primary",
    },

    // Padrões de espaçamento compacto (seguindo style.css)
    spacing: {
        tablePadding: "6px 4px", // Mesmo do ranking.js
        headerPadding: "8px 4px", // Compacto como outras tabelas
        buttonPadding: "4px 8px", // Botões pequenos
        modalPadding: "15px 20px", // Modal padrão
    },

    // Cores seguindo as variáveis CSS do sistema
    colors: {
        primary: "#2c3e50",
        success: "#28a745",
        danger: "#dc3545",
        info: "#3498db",
        warning: "#f39c12",
        background: "#f4f6f8",
        cardBg: "#fff",
        border: "#ddd",
    },
};

// ===== INTERFACE OTIMIZADA =====
export const ArtilheiroUI = {
    version: "2.0.0",

    // Mostrar loading seguindo padrão do sistema
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
                    <small style="display: block; margin-top: 10px; color: #999;">
                        ⏳ Processando via backend proxy
                    </small>
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

    // Mostrar erro seguindo padrões
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

                    ${
                        detalhes
                            ? `
                        <details style="margin: 15px 0; text-align: left;">
                            <summary style="cursor: pointer; padding: 5px; background: #f5c6cb; border-radius: 4px; margin-bottom: 10px;">
                                🔍 Ver detalhes técnicos
                            </summary>
                            <pre style="background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 10px; font-size: 0.8rem; overflow-x: auto;">${detalhes}</pre>
                        </details>
                    `
                            : ""
                    }

                    <div style="margin-top: 20px;">
                        <button onclick="window.location.reload()" class="btn" style="background: #dc3545; color: white; margin-right: 10px;">
                            🔄 Tentar Novamente
                        </button>
                        <button onclick="window.forcarArtilheiroCampeaoAgora?.()" class="btn" style="background: #6c757d; color: white;">
                            ♻️ Reinicializar
                        </button>
                    </div>
                </div>
            `;
            artilheiroContainer.style.display = "block";
        }

        if (loadingContainer) {
            loadingContainer.style.display = "none";
        }
    },

    // Interface principal COMPACTA seguindo padrões do sistema
    renderizarInterface(dados, estatisticas, configuracoes = {}) {
        const artilheiroContainer = document.getElementById(
            "artilheiro-container",
        );
        if (!artilheiroContainer) {
            console.error("Container #artilheiro-container não encontrado");
            return;
        }

        const { rodadaAtual = 15, rodadaFim = 14 } = configuracoes;

        const html = `
            <!-- HEADER COMPACTO -->
            ${this._renderizarHeaderCompacto(rodadaAtual, rodadaFim)}

            <!-- ESTATÍSTICAS SIMPLES -->
            ${this._renderizarEstatisticasCompactas(estatisticas)}

            <!-- TABELA PRINCIPAL OTIMIZADA (SEM COLUNA MÉDIA) -->
            ${this._renderizarTabelaOtimizada(dados)}

            <!-- FOOTER INFORMATIVO -->
            ${this._renderizarFooterSimples(estatisticas, rodadaFim)}
        `;

        artilheiroContainer.innerHTML = html;
        this.esconderLoading();
        window._dadosArtilheiros = dados;

        console.log("✅ [ARTILHEIRO-UI] Interface otimizada renderizada");
    },

    // Header compacto
    _renderizarHeaderCompacto(rodadaAtual, rodadaFim) {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap;">
                <div>
                    <h2 style="margin: 0; color: ${UI_CONFIG.colors.primary}; font-size: 1.5rem;">
                        🏆 Artilheiro Campeão
                        <span style="background: ${UI_CONFIG.colors.info}; color: white; padding: 2px 6px; border-radius: 8px; font-size: 0.6rem; margin-left: 8px;">MODULAR</span>
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

    // Estatísticas compactas (4 cards simples)
    _renderizarEstatisticasCompactas(estatisticas) {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 15px;">

                <!-- Gols Pró -->
                <div style="background: linear-gradient(135deg, #e8f5e8, #c8e6c9); padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #81c784;">
                    <div style="font-size: 1.3rem; font-weight: bold; color: #2e7d32; margin-bottom: 3px;">
                        ${estatisticas.totalGolsPro || 0}
                    </div>
                    <div style="font-size: 0.75rem; color: #424242;">⚽ Gols Pró</div>
                </div>

                <!-- Gols Contra -->
                <div style="background: linear-gradient(135deg, #ffebee, #ffcdd2); padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #f48fb1;">
                    <div style="font-size: 1.3rem; font-weight: bold; color: #d32f2f; margin-bottom: 3px;">
                        ${estatisticas.totalGolsContra || 0}
                    </div>
                    <div style="font-size: 0.75rem; color: #424242;">🔴 Gols Contra</div>
                </div>

                <!-- Saldo -->
                <div style="background: linear-gradient(135deg, #e3f2fd, #bbdefb); padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #90caf9;">
                    <div style="font-size: 1.3rem; font-weight: bold; color: ${estatisticas.totalSaldo >= 0 ? "#1976d2" : "#d32f2f"}; margin-bottom: 3px;">
                        ${this._formatarSaldo(estatisticas.totalSaldo || 0)}
                    </div>
                    <div style="font-size: 0.75rem; color: #424242;">📊 Saldo Total</div>
                </div>

                <!-- Participantes -->
                <div style="background: linear-gradient(135deg, #fff3e0, #ffcc80); padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #ffb74d;">
                    <div style="font-size: 1.3rem; font-weight: bold; color: #f57c00; margin-bottom: 3px;">
                        ${estatisticas.participantesAtivos || 0}
                    </div>
                    <div style="font-size: 0.75rem; color: #424242;">👥 Participantes</div>
                </div>

            </div>
        `;
    },

    // Tabela SUPER otimizada seguindo padrões do ranking.js (SEM COLUNA MÉDIA)
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

    // Linhas da tabela COMPACTAS seguindo padrões (SEM COLUNA MÉDIA)
    _renderizarLinhasOtimizadas(dados) {
        return dados
            .map((participante, index) => {
                // Determinar estilo da linha seguindo padrão do ranking.js
                let estiloLinha = "";
                let labelPosicao = `${index + 1}º`;

                if (index === 0) {
                    estiloLinha =
                        "background: linear-gradient(to right, #fef9e7, #fff); font-weight: 600;";
                    labelPosicao = `<span class="trofeu-ouro" title="Artilheiro">🏆</span>`;
                } else if (index === dados.length - 1 && dados.length > 1) {
                    estiloLinha =
                        "background: linear-gradient(to right, #ffebee, #fff);";
                }

                // Escudos otimizados
                const escudoClube = participante.clube_id
                    ? `<img src="/escudos/${participante.clube_id}.png" alt="❤️" style="width: 16px; height: 16px; border-radius: 50%; border: 1px solid #ddd;" onerror="this.style.display='none'" title="Clube do coração">`
                    : "—";

                const escudoTime = participante.url_escudo_png
                    ? `<img src="${participante.url_escudo_png}" alt="Escudo" style="width: 18px; height: 18px; border-radius: 50%; border: 1px solid #ddd;" onerror="this.style.display='none'">`
                    : `<div style="width: 18px; height: 18px; border-radius: 50%; background: #e9ecef; display: flex; align-items: center; justify-content: center; font-size: 8px;">👤</div>`;

                return `
                <tr style="border-bottom: 1px solid #eee; ${estiloLinha}" onmouseover="this.style.backgroundColor='#f5f5f5'" onmouseout="this.style.backgroundColor='${index === 0 ? "#fef9e7" : index === dados.length - 1 ? "#ffebee" : "white"}'">

                    <!-- Posição -->
                    <td style="${UI_CONFIG.spacing.tablePadding}; text-align: center;">
                        ${labelPosicao}
                    </td>

                    <!-- Clube do Coração -->
                    <td style="${UI_CONFIG.spacing.tablePadding}; text-align: center;">
                        ${escudoClube}
                    </td>

                    <!-- Cartoleiro (ALINHADO À ESQUERDA) -->
                    <td style="${UI_CONFIG.spacing.tablePadding}; text-align: left;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            ${escudoTime}
                            <span style="font-weight: 500; color: #2c3e50; font-size: 0.9rem;">
                                ${this._truncarTexto(participante.nomeCartoleiro || participante.nome_cartoleiro, 20)}
                            </span>
                        </div>
                    </td>

                    <!-- Time (ALINHADO À ESQUERDA) -->
                    <td style="${UI_CONFIG.spacing.tablePadding}; text-align: left;">
                        <span style="color: #6c757d; font-size: 0.85rem;">
                            ${this._truncarTexto(participante.nomeTime || participante.nome_time, 18)}
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

                    <!-- Saldo (SEM COLUNA MÉDIA) -->
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

    // Footer simples
    _renderizarFooterSimples(estatisticas, rodadaFim) {
        return `
            <div style="margin-top: 15px; padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #28a745; text-align: center;">
                <p style="margin: 0; color: #155724; font-size: 0.85rem; display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span><strong>📊 Sistema modular com backend proxy</strong></span>
                    <span>•</span>
                    <span>🔄 Atualizado: ${new Date().toLocaleString("pt-BR").split(",")[1].trim()}</span>
                    <span>•</span>
                    <span>🏆 ${estatisticas.participantesAtivos || 0} participantes até R${rodadaFim}</span>
                </p>
            </div>
        `;
    },

    // Modal de detalhes COMPLETO com dados de cada rodada
    mostrarDetalhesCompletos(participante, index) {
        if (!participante) {
            console.warn("Participante não encontrado:", index);
            return;
        }

        const modal = this._criarModalDetalhado();
        const conteudo = this._gerarConteudoDetalhado(participante, index);

        modal.querySelector(".modal-content").innerHTML = conteudo;
        document.body.appendChild(modal);

        this._configurarEventListenersModal(modal);
        console.log(
            `Modal de detalhes aberto para: ${participante.nomeCartoleiro || participante.nome_cartoleiro}`,
        );
    },

    // Criar estrutura do modal detalhado
    _criarModalDetalhado() {
        const modal = document.createElement("div");
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 1000; 
            display: flex; justify-content: center; align-items: center; 
            overflow-y: auto; padding: 20px;
        `;

        modal.innerHTML = `
            <div class="modal-content" style="
                background: white; border-radius: 8px; 
                max-width: 700px; width: 100%; max-height: 90vh; 
                overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            "></div>
        `;

        return modal;
    },

    // Gerar conteúdo detalhado do modal
    _gerarConteudoDetalhado(participante, index) {
        return `
            <!-- Header do Modal -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 2px solid #f8f9fa; background: linear-gradient(135deg, #007bff, #0056b3); color: white;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5rem;">🏆</span>
                    Detalhes Completos
                </h3>
                <button class="btn-fechar" style="background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center;">×</button>
            </div>

            <!-- Dados do Participante -->
            <div style="padding: 20px;">
                ${this._gerarInfoParticipanteDetalhada(participante, index)}
                ${this._gerarEstatisticasParticipante(participante)}
                ${this._gerarDadosPorRodada(participante)}
                ${this._gerarArtilheirosTime(participante)}
            </div>

            <!-- Footer do Modal -->
            <div style="padding: 15px 20px; background: #f8f9fa; border-top: 1px solid #dee2e6; text-align: center;">
                <button class="btn-fechar" style="padding: 10px 30px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Fechar
                </button>
            </div>
        `;
    },

    // Info detalhada do participante
    _gerarInfoParticipanteDetalhada(participante, index) {
        const escudo = participante.url_escudo_png || participante.escudo;
        const nomeCartoleiro =
            participante.nomeCartoleiro || participante.nome_cartoleiro;
        const nomeTime = participante.nomeTime || participante.nome_time;

        return `
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                ${
                    escudo
                        ? `<img src="${escudo}" alt="Escudo" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`
                        : `<div style="width: 60px; height: 60px; border-radius: 50%; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 2rem;">👤</div>`
                }
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 1.3rem; color: #2c3e50; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
                        ${
                            participante.clube_id
                                ? `<img src="/escudos/${participante.clube_id}.png" alt="❤️" style="width: 22px; height: 22px; border-radius: 50%;" onerror="this.style.display='none'" title="Clube do coração">`
                                : ""
                        }
                        ${nomeCartoleiro}
                    </div>
                    <div style="color: #6c757d; font-size: 1.1rem; margin-bottom: 5px;">${nomeTime}</div>
                    <div style="display: flex; align-items: center; gap: 15px; font-size: 0.9rem;">
                        <span style="background: #007bff; color: white; padding: 2px 8px; border-radius: 12px;">
                            <strong>Posição:</strong> ${index + 1}º lugar
                        </span>
                        <span style="color: #28a745;">
                            <strong>Rodadas:</strong> ${participante.rodadasProcessadas || "N/D"}
                        </span>
                    </div>
                </div>
            </div>
        `;
    },

    // Estatísticas do participante
    _gerarEstatisticasParticipante(participante) {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #e8f5e8, #c8e6c9); border-radius: 8px; border: 1px solid #81c784;">
                    <div style="font-size: 1.6rem; font-weight: bold; color: #2e7d32; margin-bottom: 5px;">${participante.golsPro || 0}</div>
                    <div style="font-size: 0.85rem; color: #424242;">⚽ Gols Pró</div>
                </div>
                <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #ffebee, #ffcdd2); border-radius: 8px; border: 1px solid #f48fb1;">
                    <div style="font-size: 1.6rem; font-weight: bold; color: #d32f2f; margin-bottom: 5px;">${participante.golsContra || 0}</div>
                    <div style="font-size: 0.85rem; color: #424242;">🔴 Gols Contra</div>
                </div>
                <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #e3f2fd, #bbdefb); border-radius: 8px; border: 1px solid #90caf9;">
                    <div style="font-size: 1.6rem; font-weight: bold; color: ${(participante.saldoGols || 0) >= 0 ? "#1976d2" : "#d32f2f"}; margin-bottom: 5px;">
                        ${this._formatarSaldo(participante.saldoGols || 0)}
                    </div>
                    <div style="font-size: 0.85rem; color: #424242;">📊 Saldo</div>
                </div>
            </div>
        `;
    },

    // NOVIDADE: Dados por rodada com gols pró e contra de cada jogador
    _gerarDadosPorRodada(participante) {
        if (
            !participante.detalhePorRodada ||
            participante.detalhePorRodada.length === 0
        ) {
            return `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; color: #2c3e50;">📅 Dados por Rodada:</h4>
                    <p style="color: #6c757d; text-align: center; padding: 20px;">Dados por rodada não disponíveis</p>
                </div>
            `;
        }

        const rodadasHtml = participante.detalhePorRodada
            .filter((r) => r && r.ocorreu)
            .map((rodada) => {
                const corFundo =
                    rodada.saldo > 0
                        ? "#d4edda"
                        : rodada.saldo < 0
                          ? "#f8d7da"
                          : "#e2e3e5";
                const corBorda =
                    rodada.saldo > 0
                        ? "#c3e6cb"
                        : rodada.saldo < 0
                          ? "#f5c6cb"
                          : "#d1ecf1";

                const jogadoresRodada =
                    rodada.jogadores && rodada.jogadores.length > 0
                        ? rodada.jogadores
                              .map((j) => `${j.nome} (${j.gols})`)
                              .join(", ")
                        : "";

                return `
                    <div style="display: inline-block; margin: 3px; padding: 8px 12px; background: ${corFundo}; border-radius: 6px; font-size: 0.85rem; border: 1px solid ${corBorda};">
                        <div style="font-weight: bold; margin-bottom: 2px;">
                            <strong>R${rodada.rodada}:</strong> 
                            ${rodada.golsPro}${rodada.golsContra > 0 ? ` (-${rodada.golsContra})` : ""} 
                            = ${rodada.saldo >= 0 ? "+" : ""}${rodada.saldo}
                        </div>
                        ${jogadoresRodada ? `<div style="font-size: 0.75rem; color: #666;">${jogadoresRodada}</div>` : ""}
                    </div>
                `;
            })
            .join("");

        return `
            <div style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 15px; color: #2c3e50; display: flex; align-items: center; gap: 8px;">
                    <span>📅</span> Dados por Rodada:
                </h4>
                <div style="max-height: 250px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #fafafa;">
                    ${rodadasHtml || '<p style="color: #6c757d; margin: 0; text-align: center;">Nenhum dado disponível</p>'}
                </div>
            </div>
        `;
    },

    // NOVIDADE: Artilheiros do time com estatísticas
    _gerarArtilheirosTime(participante) {
        if (!participante.jogadores || participante.jogadores.length === 0) {
            return "";
        }

        const jogadoresHtml = participante.jogadores
            .map(
                (jogador, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; ${idx === 0 ? "font-weight: 600; background: #fff3e0; margin: -8px -15px 8px -15px; padding: 12px 15px;" : ""}">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${idx === 0 ? '<span style="background: #ffd700; color: #333; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem;">👑</span>' : `<span style="color: #6c757d;">${idx + 1}º</span>`}
                        <span>${jogador.nome}</span>
                        ${jogador.posicao ? `<small style="color: #007bff; margin-left: 5px;">[Pos: ${jogador.posicao}]</small>` : ""}
                        ${jogador.clube ? `<small style="color: #6c757d; margin-left: 5px;">(${jogador.clube})</small>` : ""}
                    </div>
                    <span style="font-weight: bold; color: #28a745; background: #e8f5e8; padding: 4px 8px; border-radius: 12px; font-size: 0.85rem;">
                        ${jogador.gols} gol${jogador.gols !== 1 ? "s" : ""}
                    </span>
                </div>
            `,
            )
            .join("");

        return `
            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 15px; color: #2c3e50; display: flex; align-items: center; gap: 8px;">
                    <span>⚽</span> Artilheiros do Time:
                </h4>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; background: white;">
                    <div style="padding: 15px;">
                        ${jogadoresHtml}
                    </div>
                </div>
            </div>
        `;
    },

    // Event listeners do modal
    _configurarEventListenersModal(modal) {
        modal.querySelectorAll(".btn-fechar").forEach((btn) => {
            btn.addEventListener("click", () => modal.remove());
        });

        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });

        const handleEscape = (e) => {
            if (e.key === "Escape") {
                modal.remove();
                document.removeEventListener("keydown", handleEscape);
            }
        };
        document.addEventListener("keydown", handleEscape);
    },

    // Utilitários
    _formatarSaldo(numero) {
        if (typeof numero !== "number") return "0";
        if (numero > 0) return `+${numero}`;
        if (numero < 0) return `${numero}`;
        return "0";
    },

    _truncarTexto(texto, maxLength = 20) {
        if (!texto) return "N/D";
        if (typeof texto !== "string") return String(texto);
        return texto.length > maxLength
            ? texto.substring(0, maxLength - 3) + "..."
            : texto;
    },
};

console.log("✅ [ARTILHEIRO-UI] Interface otimizada carregada sem conflitos!");
console.log(
    "🎯 [ARTILHEIRO-UI] Funcionalidades: tabela compacta sem coluna média, modal detalhado, dados por rodada",
);
