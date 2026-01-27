/**
 * Renovacao Core Module
 *
 * Modulo principal de renovacao de temporada.
 * Orquestra API, UI e integracao com Fluxo Financeiro.
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

const RenovacaoCore = (function() {
    'use strict';

    // =========================================================================
    // CONFIGURACAO
    // =========================================================================

    const temporadaSistema =
        window.SeasonContext?.getTemporadaRenovacao?.() ||
        window.SeasonContext?.getTemporadaSistema?.() ||
        window.temporadaRenovacao ||
        new Date().getFullYear();

    const CONFIG = {
        TEMPORADA_ATUAL: temporadaSistema,
        TEMPORADA_ANTERIOR: temporadaSistema - 1,
        DEBUG: window.DEBUG_MODE || false
    };

    // =========================================================================
    // ESTADO
    // =========================================================================

    let state = {
        ligaId: null,
        ligaNome: null,
        regras: null,
        inscricoes: [],
        estatisticas: null,
        inicializado: false
    };

    // =========================================================================
    // LOG
    // =========================================================================

    function log(...args) {
        if (CONFIG.DEBUG) {
            console.log('[RENOVACAO-CORE]', ...args);
        }
    }

    // =========================================================================
    // INICIALIZACAO
    // =========================================================================

    /**
     * Inicializa o modulo de renovacao para uma liga
     * @param {string} ligaId - ID da liga
     * @param {string} ligaNome - Nome da liga (opcional)
     */
    async function init(ligaId, ligaNome = null) {
        log('Inicializando para liga:', ligaId);

        state.ligaId = ligaId;
        state.ligaNome = ligaNome;

        try {
            // Carregar regras e inscricoes em paralelo
            const [regrasResponse, inscricoesResponse] = await Promise.all([
                RenovacaoAPI.buscarRegras(ligaId, CONFIG.TEMPORADA_ATUAL),
                RenovacaoAPI.listarInscricoes(ligaId, CONFIG.TEMPORADA_ATUAL)
            ]);

            state.regras = regrasResponse.rules;
            state.ligaNome = regrasResponse.ligaNome || ligaNome;
            state.inscricoes = inscricoesResponse.inscricoes || [];

            // Buscar estatisticas
            state.estatisticas = await buscarEstatisticas();

            state.inicializado = true;
            log('Inicializado com sucesso:', {
                regras: state.regras?.status,
                inscricoes: state.inscricoes.length,
                estatisticas: state.estatisticas
            });

            return true;
        } catch (error) {
            console.error('[RENOVACAO-CORE] Erro na inicializacao:', error);
            return false;
        }
    }

    // =========================================================================
    // DADOS
    // =========================================================================

    async function buscarEstatisticas() {
        try {
            const response = await RenovacaoAPI.estatisticasInscricoes(
                state.ligaId,
                CONFIG.TEMPORADA_ATUAL
            );
            return response.estatisticas;
        } catch (error) {
            log('Erro ao buscar estatisticas:', error);
            return null;
        }
    }

    /**
     * Retorna o status de inscricao de um participante
     * @param {number} timeId - ID do time
     * @returns {Object|null}
     */
    function getInscricaoParticipante(timeId) {
        return state.inscricoes.find(i => i.time_id === Number(timeId)) || null;
    }

    /**
     * Retorna status 2026 de um participante para exibicao na tabela
     * @param {number} timeId - ID do time
     * @returns {Object} { status, badge, icone, cor }
     */
    function getStatus2026(timeId) {
        const inscricao = getInscricaoParticipante(timeId);

        if (!inscricao) {
            return {
                status: 'pendente',
                badge: 'warning',
                icone: 'schedule',
                cor: 'text-warning',
                label: 'Pendente'
            };
        }

        const statusMap = {
            pendente: {
                badge: 'warning',
                icone: 'schedule',
                cor: 'text-warning',
                label: 'Pendente'
            },
            renovado: {
                badge: 'success',
                icone: 'check_circle',
                cor: 'text-success',
                label: 'Renovado'
            },
            nao_participa: {
                badge: 'danger',
                icone: 'cancel',
                cor: 'text-danger',
                label: 'Nao Participa'
            },
            novo: {
                badge: 'info',
                icone: 'person_add',
                cor: 'text-info',
                label: 'Novo'
            }
        };

        const info = statusMap[inscricao.status] || statusMap.pendente;
        return {
            status: inscricao.status,
            ...info,
            inscricao
        };
    }

    // =========================================================================
    // ACOES
    // =========================================================================

    /**
     * Abre modal de configuracao da liga
     */
    function abrirConfig() {
        if (!state.ligaId) {
            console.error('[RENOVACAO-CORE] Liga nao definida');
            return;
        }
        RenovacaoUI.abrirModalConfig(state.ligaId, state.ligaNome);
    }

    /**
     * Abre modal de renovacao para um participante
     * @param {Object} participante - Dados do participante
     */
    function abrirRenovacao(participante) {
        if (!state.ligaId) {
            console.error('[RENOVACAO-CORE] Liga nao definida');
            return;
        }
        RenovacaoUI.abrirModalRenovar(state.ligaId, participante);
    }

    /**
     * Abre modal de "nao participa" para um participante
     * @param {Object} participante - Dados do participante
     */
    function abrirNaoParticipar(participante) {
        if (!state.ligaId) {
            console.error('[RENOVACAO-CORE] Liga nao definida');
            return;
        }
        RenovacaoUI.abrirModalNaoParticipar(state.ligaId, participante);
    }

    /**
     * Abre modal para adicionar novo participante
     */
    function abrirNovoParticipante() {
        if (!state.ligaId) {
            console.error('[RENOVACAO-CORE] Liga nao definida');
            return;
        }
        RenovacaoUI.abrirModalNovoParticipante(state.ligaId);
    }

    /**
     * Abre o modal apropriado baseado no status do participante
     * @param {Object} participante - Dados do participante
     */
    function abrirAcao(participante) {
        const inscricao = getInscricaoParticipante(participante.time_id);

        if (!inscricao || inscricao.status === 'pendente') {
            // Participante pendente - mostrar opcoes
            mostrarOpcoesParticipante(participante);
        } else {
            // Ja decidido - mostrar detalhes
            mostrarDetalhesInscricao(participante, inscricao);
        }
    }

    /**
     * Mostra modal de decisao unificada para participante pendente
     * v2.0: Usa modal unificado que combina quitacao + renovacao/nao-participar
     */
    function mostrarOpcoesParticipante(participante) {
        // v2.0: Abrir modal de decisao unificada diretamente
        // Combina quitacao da temporada anterior com decisao para nova temporada
        RenovacaoUI.abrirModalDecisaoUnificada(state.ligaId, participante);
    }

    /**
     * Mostra detalhes de inscricao ja processada
     */
    function mostrarDetalhesInscricao(participante, inscricao) {
        const statusInfo = getStatus2026(participante.time_id);

        const html = `
        <div class="modal fade" id="modalDetalhes" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content bg-gray-800 text-white">
                    <div class="modal-header border-gray-700">
                        <h6 class="modal-title">
                            Inscricao ${CONFIG.TEMPORADA_ATUAL}
                        </h6>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="d-flex align-items-center mb-3">
                            <img src="${participante.escudo || participante.escudo_url || '/img/default-escudo.png'}"
                                 alt="Escudo" class="rounded me-3" style="width: 48px; height: 48px;"
                                 onerror="this.src='/img/default-escudo.png'">
                            <div>
                                <h6 class="mb-0">${RenovacaoModals.escapeHtml(participante.nome_time) || ''}</h6>
                                <small class="text-muted">${RenovacaoModals.escapeHtml(participante.nome_cartoleiro || participante.nome_cartola) || ''}</small>
                            </div>
                        </div>

                        <div class="text-center py-3">
                            <span class="badge bg-${statusInfo.badge} fs-6 px-3 py-2">
                                <span class="material-icons" style="vertical-align: middle;">${statusInfo.icone}</span>
                                ${statusInfo.label}
                            </span>
                        </div>

                        ${inscricao.saldo_inicial_temporada !== undefined ? `
                        <div class="bg-gray-900 rounded p-3 mt-3">
                            <small class="text-muted">Saldo Inicial ${CONFIG.TEMPORADA_ATUAL}</small>
                            <h5 class="${inscricao.saldo_inicial_temporada <= 0 ? 'text-success' : 'text-warning'}">
                                ${RenovacaoModals.formatarMoeda(inscricao.saldo_inicial_temporada)}
                            </h5>
                        </div>
                        ` : ''}

                        ${inscricao.observacoes ? `
                        <div class="mt-3">
                            <small class="text-muted">Observacoes:</small>
                            <p class="mb-0">${inscricao.observacoes}</p>
                        </div>
                        ` : ''}

                        ${inscricao.data_decisao ? `
                        <div class="mt-3 text-muted small">
                            Processado em ${new Date(inscricao.data_decisao).toLocaleDateString('pt-BR')}
                            ${inscricao.aprovado_por ? ` por ${inscricao.aprovado_por}` : ''}
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer border-gray-700">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Fechar
                        </button>
                        ${inscricao.status !== 'pendente' ? `
                        <button type="button" class="btn btn-outline-warning btn-sm" id="btnReverter">
                            <span class="material-icons" style="vertical-align: middle; font-size: 16px;">undo</span>
                            Reverter
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>`;

        const existing = document.getElementById('modalDetalhes');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', html);

        const modalEl = document.getElementById('modalDetalhes');
        const modal = new bootstrap.Modal(modalEl);

        const btnReverter = document.getElementById('btnReverter');
        if (btnReverter) {
            btnReverter.addEventListener('click', async () => {
                if (confirm('Reverter inscricao para PENDENTE?')) {
                    try {
                        await RenovacaoAPI.reverterInscricao(
                            state.ligaId,
                            CONFIG.TEMPORADA_ATUAL,
                            participante.time_id,
                            'Revertido pelo admin'
                        );
                        modal.hide();
                        RenovacaoUI.showToast('Inscricao revertida');
                        if (typeof window.onRenovacaoAtualizada === 'function') {
                            window.onRenovacaoAtualizada();
                        }
                    } catch (error) {
                        RenovacaoUI.showToast('Erro: ' + error.message, 'error');
                    }
                }
            });
        }

        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());

        modal.show();
    }

    // =========================================================================
    // INTEGRACAO COM FLUXO FINANCEIRO
    // =========================================================================

    /**
     * Renderiza badge de status 2026 para a tabela
     * @param {number} timeId - ID do time
     * @returns {string} HTML do badge
     */
    function renderBadge2026(timeId) {
        const info = getStatus2026(timeId);

        return `
        <span class="badge bg-${info.badge} cursor-pointer renovacao-badge"
              data-time-id="${timeId}"
              title="Clique para gerenciar"
              style="cursor: pointer;">
            <span class="material-icons" style="font-size: 14px; vertical-align: middle;">
                ${info.icone}
            </span>
            ${info.label}
        </span>`;
    }

    /**
     * Renderiza botoes do header do Fluxo Financeiro
     * @returns {string} HTML dos botoes
     */
    function renderBotoesHeader() {
        const statusRegras = state.regras?.status || 'rascunho';
        const statusClass = statusRegras === 'aberto' ? 'success' : statusRegras === 'encerrado' ? 'secondary' : 'warning';

        return `
        <button type="button"
                class="btn btn-sm btn-outline-${statusClass} me-2"
                id="btnConfig2026"
                title="Configurar Renovacao ${CONFIG.TEMPORADA_ATUAL}">
            <span class="material-icons" style="font-size: 18px; vertical-align: middle;">settings</span>
            <span class="d-none d-md-inline ms-1">${CONFIG.TEMPORADA_ATUAL}</span>
        </button>
        <button type="button"
                class="btn btn-sm btn-outline-info"
                id="btnNovoParticipante2026"
                title="Adicionar Participante ${CONFIG.TEMPORADA_ATUAL}">
            <span class="material-icons" style="font-size: 18px; vertical-align: middle;">person_add</span>
        </button>`;
    }

    /**
     * Configura event listeners para integracao com Fluxo Financeiro
     */
    function setupEventListeners() {
        // Botao de configuracao
        document.addEventListener('click', (e) => {
            if (e.target.closest('#btnConfig2026')) {
                abrirConfig();
            }
        });

        // Botao de novo participante
        document.addEventListener('click', (e) => {
            if (e.target.closest('#btnNovoParticipante2026')) {
                abrirNovoParticipante();
            }
        });

        // Badges na tabela
        document.addEventListener('click', (e) => {
            const badge = e.target.closest('.renovacao-badge');
            if (badge) {
                const timeId = parseInt(badge.dataset.timeId);
                // Buscar dados do participante na tabela
                const row = badge.closest('tr');
                if (row) {
                    const participante = extrairDadosParticipanteRow(row, timeId);
                    abrirAcao(participante);
                }
            }
        });

        // Callback global para atualizacoes
        window.onRenovacaoAtualizada = async () => {
            log('Atualizando dados apos mudanca...');
            await recarregarDados();

            // Disparar evento para Fluxo Financeiro atualizar
            document.dispatchEvent(new CustomEvent('renovacao:atualizada', {
                detail: { estatisticas: state.estatisticas }
            }));
        };
    }

    /**
     * Extrai dados do participante de uma row da tabela
     */
    function extrairDadosParticipanteRow(row, timeId) {
        // Tentar extrair do dataset ou celulas
        const nomeCell = row.querySelector('.nome-participante, td:nth-child(2)');
        const escudoImg = row.querySelector('img');

        return {
            time_id: timeId,
            nome_time: row.dataset.nomeTime || nomeCell?.textContent?.trim() || '',
            nome_cartoleiro: row.dataset.nomeCartoleiro || '',
            escudo: escudoImg?.src || ''
        };
    }

    /**
     * Recarrega dados apos atualizacao
     */
    async function recarregarDados() {
        if (!state.ligaId) return;

        try {
            const [inscricoesResponse, estatisticas] = await Promise.all([
                RenovacaoAPI.listarInscricoes(state.ligaId, CONFIG.TEMPORADA_ATUAL),
                buscarEstatisticas()
            ]);

            state.inscricoes = inscricoesResponse.inscricoes || [];
            state.estatisticas = estatisticas;

            log('Dados recarregados:', {
                inscricoes: state.inscricoes.length,
                estatisticas: state.estatisticas
            });
        } catch (error) {
            console.error('[RENOVACAO-CORE] Erro ao recarregar:', error);
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    return {
        // Config
        CONFIG,

        // Inicializacao
        init,
        setupEventListeners,

        // Dados
        getState: () => ({ ...state }),
        getInscricaoParticipante,
        getStatus2026,
        recarregarDados,

        // Acoes
        abrirConfig,
        abrirRenovacao,
        abrirNaoParticipar,
        abrirNovoParticipante,
        abrirAcao,

        // Renderizacao
        renderBadge2026,
        renderBotoesHeader
    };

})();

// Export para ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenovacaoCore;
}
