// =============================================
// COMPONENTE: Modal de Histórico de Capitães
// Reutilizável em Admin e App
// v1.0: Layout limpo com tabela scrollável
// =============================================

const CapitaoHistoricoModal = {
    /**
     * Renderiza modal com histórico completo de um participante
     * @param {Object} participante - Dados do participante
     * @param {Array} participante.historico_rodadas - Array de rodadas
     * @param {string} participante.nome_cartola - Nome do cartoleiro
     * @param {string} participante.nome_time - Nome do time
     * @param {number} participante.pontuacao_total - Pontos totais
     * @param {number} participante.media_capitao - Média de pontos
     * @param {Object} participante.melhor_capitao - Melhor capitão
     * @param {Object} participante.pior_capitao - Pior capitão
     */
    abrir(participante) {
        // Criar/atualizar container do modal
        let modalContainer = document.getElementById('capitaoHistoricoModalContainer');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'capitaoHistoricoModalContainer';
            document.body.appendChild(modalContainer);
        }

        const historico = participante.historico_rodadas || [];
        const nomeCartola = participante.nome_cartola || 'Participante';
        const nomeTime = participante.nome_time || '';
        const pontuacaoTotal = (participante.pontuacao_total || 0).toFixed(2);
        const mediaCapitao = (participante.media_capitao || 0).toFixed(2);
        const rodadasJogadas = historico.length;

        // Ordenar histórico por rodada
        const historicoOrdenado = [...historico].sort((a, b) => a.rodada - b.rodada);

        // Gerar linhas da tabela
        const linhasTabela = historicoOrdenado.map((r, index) => {
            const pts = (r.pontuacao || 0).toFixed(2);
            const isParcial = r.parcial === true;
            const jogou = r.jogou;

            // Cores de pontuação
            let corPontuacao = '#9ca3af'; // Cinza padrão
            if (pts >= 15) corPontuacao = '#22c55e'; // Verde (ótimo)
            else if (pts >= 10) corPontuacao = '#10b981'; // Verde claro (bom)
            else if (pts >= 5) corPontuacao = '#fbbf24'; // Amarelo (regular)
            else if (pts < 0) corPontuacao = '#ef4444'; // Vermelho (negativo)

            // Status da rodada
            let statusHtml = '';
            if (isParcial) {
                if (jogou === false) {
                    statusHtml = '<span class="badge-status status-pendente">⏳ Pendente</span>';
                } else {
                    statusHtml = '<span class="badge-status status-parcial">🔴 Em andamento</span>';
                }
            } else {
                statusHtml = '<span class="badge-status status-finalizada">✅ Finalizada</span>';
            }

            const rowClass = index % 2 === 0 ? 'row-even' : 'row-odd';

            return `
                <tr class="${rowClass}">
                    <td class="col-rodada">${r.rodada}</td>
                    <td class="col-atleta">${r.atleta_nome || 'N/A'}</td>
                    <td class="col-pontos" style="color: ${corPontuacao}; font-weight: 700;">${pts}</td>
                    <td class="col-status">${statusHtml}</td>
                </tr>
            `;
        }).join('');

        // Template do modal
        modalContainer.innerHTML = `
            <div class="capitao-historico-modal-overlay" onclick="CapitaoHistoricoModal.fechar()">
                <div class="capitao-historico-modal-content" onclick="event.stopPropagation()">
                    <!-- Header -->
                    <div class="modal-header-capitao">
                        <div class="modal-header-info">
                            <h2 class="modal-title-capitao">
                                <span class="material-icons" style="vertical-align: middle; margin-right: 8px;">military_tech</span>
                                Histórico de Capitães
                            </h2>
                            <p class="modal-subtitle-capitao">${nomeCartola}${nomeTime ? ` - ${nomeTime}` : ''}</p>
                        </div>
                        <button class="modal-close-btn" onclick="CapitaoHistoricoModal.fechar()" aria-label="Fechar">
                            <span class="material-icons">close</span>
                        </button>
                    </div>

                    <!-- Resumo -->
                    <div class="modal-resumo-capitao">
                        <div class="resumo-item">
                            <span class="resumo-label">Pontos Totais</span>
                            <span class="resumo-valor" style="color: var(--capitao-primary, #8b5cf6);">${pontuacaoTotal}</span>
                        </div>
                        <div class="resumo-item">
                            <span class="resumo-label">Média</span>
                            <span class="resumo-valor" style="color: var(--capitao-primary-light, #a78bfa);">${mediaCapitao}</span>
                        </div>
                        <div class="resumo-item">
                            <span class="resumo-label">Rodadas</span>
                            <span class="resumo-valor">${rodadasJogadas}</span>
                        </div>
                        ${participante.melhor_capitao ? `
                        <div class="resumo-item">
                            <span class="resumo-label">Melhor</span>
                            <span class="resumo-valor" style="color: #22c55e;">${participante.melhor_capitao.pontuacao.toFixed(2)}</span>
                        </div>
                        ` : ''}
                        ${participante.pior_capitao ? `
                        <div class="resumo-item">
                            <span class="resumo-label">Pior</span>
                            <span class="resumo-valor" style="color: #ef4444;">${participante.pior_capitao.pontuacao.toFixed(2)}</span>
                        </div>
                        ` : ''}
                    </div>

                    <!-- Tabela de histórico -->
                    <div class="modal-table-container">
                        <table class="capitao-historico-table">
                            <thead>
                                <tr>
                                    <th class="col-rodada">RODADA</th>
                                    <th class="col-atleta">CAPITÃO</th>
                                    <th class="col-pontos">PONTOS</th>
                                    <th class="col-status">STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${linhasTabela || '<tr><td colspan="4" style="text-align: center; padding: 40px; color: #666;">Sem dados disponíveis</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <!-- Footer -->
                    <div class="modal-footer-capitao">
                        <button class="btn-modal-fechar" onclick="CapitaoHistoricoModal.fechar()">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Adicionar estilos (inline para garantir funcionamento)
        this._adicionarEstilos();

        // Animar entrada
        requestAnimationFrame(() => {
            modalContainer.querySelector('.capitao-historico-modal-overlay').classList.add('show');
        });
    },

    /**
     * Fecha o modal
     */
    fechar() {
        const modalContainer = document.getElementById('capitaoHistoricoModalContainer');
        if (!modalContainer) return;

        const overlay = modalContainer.querySelector('.capitao-historico-modal-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                modalContainer.innerHTML = '';
            }, 300); // Esperar animação
        }
    },

    /**
     * Adiciona estilos do modal (caso ainda não existam)
     */
    _adicionarEstilos() {
        if (document.getElementById('capitaoHistoricoModalStyles')) return;

        const style = document.createElement('style');
        style.id = 'capitaoHistoricoModalStyles';
        style.textContent = `
            /* Modal Overlay */
            .capitao-historico-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .capitao-historico-modal-overlay.show {
                opacity: 1;
            }

            /* Modal Content */
            .capitao-historico-modal-content {
                background: var(--app-surface, #1a1a1a);
                border-radius: 16px;
                width: 100%;
                max-width: 800px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(139, 92, 246, 0.2);
            }

            /* Header */
            .modal-header-capitao {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
            }

            .modal-header-info {
                flex: 1;
            }

            .modal-title-capitao {
                font-family: 'Russo One', sans-serif;
                font-size: 20px;
                color: #fff;
                margin: 0 0 4px 0;
                display: flex;
                align-items: center;
            }

            .modal-subtitle-capitao {
                font-size: 14px;
                color: #9ca3af;
                margin: 0;
            }

            .modal-close-btn {
                background: transparent;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .modal-close-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            /* Resumo */
            .modal-resumo-capitao {
                display: flex;
                gap: 16px;
                padding: 20px 24px;
                background: rgba(0, 0, 0, 0.2);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                flex-wrap: wrap;
                justify-content: center;
            }

            .resumo-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }

            .resumo-label {
                font-size: 11px;
                color: #9ca3af;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 600;
            }

            .resumo-valor {
                font-family: 'JetBrains Mono', monospace;
                font-size: 18px;
                font-weight: 700;
                color: #fff;
            }

            /* Tabela */
            .modal-table-container {
                flex: 1;
                overflow-y: auto;
                padding: 0;
            }

            .capitao-historico-table {
                width: 100%;
                border-collapse: collapse;
            }

            .capitao-historico-table thead {
                position: sticky;
                top: 0;
                background: rgba(139, 92, 246, 0.15);
                z-index: 10;
            }

            .capitao-historico-table th {
                padding: 12px 16px;
                text-align: left;
                font-size: 11px;
                font-weight: 700;
                color: #a78bfa;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 2px solid rgba(139, 92, 246, 0.3);
            }

            .capitao-historico-table td {
                padding: 14px 16px;
                font-size: 14px;
                color: #e5e7eb;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            .capitao-historico-table .row-even {
                background: rgba(0, 0, 0, 0.1);
            }

            .capitao-historico-table .row-odd {
                background: transparent;
            }

            .capitao-historico-table .col-rodada {
                width: 80px;
                font-family: 'JetBrains Mono', monospace;
                font-weight: 600;
                color: #8b5cf6;
            }

            .capitao-historico-table .col-atleta {
                min-width: 200px;
            }

            .capitao-historico-table .col-pontos {
                width: 100px;
                font-family: 'JetBrains Mono', monospace;
                font-weight: 700;
                text-align: right;
            }

            .capitao-historico-table .col-status {
                width: 140px;
            }

            /* Badges de Status */
            .badge-status {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
            }

            .status-finalizada {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
                border: 1px solid rgba(34, 197, 94, 0.3);
            }

            .status-parcial {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }

            .status-pendente {
                background: rgba(251, 191, 36, 0.15);
                color: #fbbf24;
                border: 1px solid rgba(251, 191, 36, 0.3);
            }

            /* Footer */
            .modal-footer-capitao {
                padding: 20px 24px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                justify-content: flex-end;
            }

            .btn-modal-fechar {
                background: rgba(139, 92, 246, 0.2);
                color: #a78bfa;
                border: 1px solid rgba(139, 92, 246, 0.3);
                padding: 10px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-modal-fechar:hover {
                background: rgba(139, 92, 246, 0.3);
                color: #c4b5fd;
                border-color: rgba(139, 92, 246, 0.5);
            }

            /* Mobile */
            @media (max-width: 768px) {
                .capitao-historico-modal-content {
                    max-width: 100%;
                    max-height: 95vh;
                    border-radius: 12px;
                    margin: 0 10px;
                }

                .modal-header-capitao {
                    padding: 16px;
                }

                .modal-title-capitao {
                    font-size: 16px;
                }

                .modal-resumo-capitao {
                    padding: 12px 16px;
                    gap: 12px;
                }

                .resumo-valor {
                    font-size: 16px;
                }

                .capitao-historico-table th,
                .capitao-historico-table td {
                    padding: 10px 12px;
                    font-size: 13px;
                }

                .capitao-historico-table .col-atleta {
                    min-width: 150px;
                }
            }
        `;

        document.head.appendChild(style);
    }
};

// Exportar globalmente
window.CapitaoHistoricoModal = CapitaoHistoricoModal;

console.log('🎖️ [CAPITAO-MODAL] Componente de histórico carregado');
