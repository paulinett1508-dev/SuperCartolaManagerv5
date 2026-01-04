/**
 * Renovacao API Module
 *
 * Chamadas às APIs de renovação/inscrição de temporada.
 * Centraliza comunicação com backend.
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

const RenovacaoAPI = (function() {
    'use strict';

    // =========================================================================
    // CONFIGURAÇÃO
    // =========================================================================

    const CONFIG = {
        TEMPORADA_ATUAL: 2026,
        ENDPOINTS: {
            LIGA_RULES: '/api/liga-rules',
            INSCRICOES: '/api/inscricoes',
            BUSCAR_TIME: '/api/cartola-proxy/buscar-time',
            TESOURARIA: '/api/tesouraria'
        }
    };

    // =========================================================================
    // HELPER
    // =========================================================================

    async function fetchJSON(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`[RENOVACAO-API] Erro em ${url}:`, error);
            throw error;
        }
    }

    // =========================================================================
    // REGRAS DA LIGA
    // =========================================================================

    /**
     * Busca regras de renovação de uma liga
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada (default: atual)
     * @returns {Promise<Object>}
     */
    async function buscarRegras(ligaId, temporada = CONFIG.TEMPORADA_ATUAL) {
        console.log(`[RENOVACAO-API] Buscando regras liga=${ligaId} temporada=${temporada}`);
        return fetchJSON(`${CONFIG.ENDPOINTS.LIGA_RULES}/${ligaId}/${temporada}`);
    }

    /**
     * Salva regras de renovação
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada
     * @param {Object} dados - Dados das regras
     * @returns {Promise<Object>}
     */
    async function salvarRegras(ligaId, temporada, dados) {
        console.log(`[RENOVACAO-API] Salvando regras liga=${ligaId}`, dados);
        return fetchJSON(`${CONFIG.ENDPOINTS.LIGA_RULES}/${ligaId}/${temporada}`, {
            method: 'POST',
            body: JSON.stringify(dados)
        });
    }

    /**
     * Altera status do processo de renovação
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada
     * @param {string} status - Novo status (rascunho|aberto|encerrado)
     * @returns {Promise<Object>}
     */
    async function alterarStatusRenovacao(ligaId, temporada, status) {
        console.log(`[RENOVACAO-API] Alterando status para ${status}`);
        return fetchJSON(`${CONFIG.ENDPOINTS.LIGA_RULES}/${ligaId}/${temporada}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    /**
     * Preview do cálculo de inscrição
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada
     * @param {number} timeId - ID do time
     * @returns {Promise<Object>}
     */
    async function previewInscricao(ligaId, temporada, timeId) {
        console.log(`[RENOVACAO-API] Preview inscricao time=${timeId}`);
        return fetchJSON(`${CONFIG.ENDPOINTS.LIGA_RULES}/${ligaId}/${temporada}/preview/${timeId}`);
    }

    // =========================================================================
    // INSCRIÇÕES
    // =========================================================================

    /**
     * Lista inscrições de uma liga
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada
     * @param {string} status - Filtrar por status (opcional)
     * @returns {Promise<Object>}
     */
    async function listarInscricoes(ligaId, temporada = CONFIG.TEMPORADA_ATUAL, status = null) {
        let url = `${CONFIG.ENDPOINTS.INSCRICOES}/${ligaId}/${temporada}`;
        if (status) url += `?status=${status}`;

        console.log(`[RENOVACAO-API] Listando inscrições liga=${ligaId}`);
        return fetchJSON(url);
    }

    /**
     * Busca estatísticas de inscrições
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada
     * @returns {Promise<Object>}
     */
    async function estatisticasInscricoes(ligaId, temporada = CONFIG.TEMPORADA_ATUAL) {
        console.log(`[RENOVACAO-API] Buscando estatísticas`);
        return fetchJSON(`${CONFIG.ENDPOINTS.INSCRICOES}/${ligaId}/${temporada}/estatisticas`);
    }

    /**
     * Busca inscrição de um participante específico
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada
     * @param {number} timeId - ID do time
     * @returns {Promise<Object>}
     */
    async function buscarInscricao(ligaId, temporada, timeId) {
        console.log(`[RENOVACAO-API] Buscando inscrição time=${timeId}`);
        return fetchJSON(`${CONFIG.ENDPOINTS.INSCRICOES}/${ligaId}/${temporada}/${timeId}`);
    }

    /**
     * Processa renovação de participante
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada
     * @param {number} timeId - ID do time
     * @param {Object} opcoes - Opções de renovação
     * @returns {Promise<Object>}
     */
    async function renovarParticipante(ligaId, temporada, timeId, opcoes = {}) {
        console.log(`[RENOVACAO-API] Renovando time=${timeId}`, opcoes);
        return fetchJSON(`${CONFIG.ENDPOINTS.INSCRICOES}/${ligaId}/${temporada}/renovar/${timeId}`, {
            method: 'POST',
            body: JSON.stringify(opcoes)
        });
    }

    /**
     * Marca participante como "não participa"
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada
     * @param {number} timeId - ID do time
     * @param {Object} opcoes - Observações
     * @returns {Promise<Object>}
     */
    async function naoParticipar(ligaId, temporada, timeId, opcoes = {}) {
        console.log(`[RENOVACAO-API] Marcando não participa time=${timeId}`);
        return fetchJSON(`${CONFIG.ENDPOINTS.INSCRICOES}/${ligaId}/${temporada}/nao-participar/${timeId}`, {
            method: 'POST',
            body: JSON.stringify(opcoes)
        });
    }

    /**
     * Cadastra novo participante
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada
     * @param {Object} dadosTime - Dados do time do Cartola
     * @param {Object} opcoes - Observações
     * @returns {Promise<Object>}
     */
    async function novoParticipante(ligaId, temporada, dadosTime, opcoes = {}) {
        console.log(`[RENOVACAO-API] Cadastrando novo participante`, dadosTime);
        return fetchJSON(`${CONFIG.ENDPOINTS.INSCRICOES}/${ligaId}/${temporada}/novo`, {
            method: 'POST',
            body: JSON.stringify({
                ...dadosTime,
                ...opcoes
            })
        });
    }

    /**
     * Inicializa inscrições pendentes para todos os participantes
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada
     * @returns {Promise<Object>}
     */
    async function inicializarInscricoes(ligaId, temporada) {
        console.log(`[RENOVACAO-API] Inicializando inscrições`);
        return fetchJSON(`${CONFIG.ENDPOINTS.INSCRICOES}/${ligaId}/${temporada}/inicializar`, {
            method: 'POST'
        });
    }

    /**
     * Reverte/cancela inscrição
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada
     * @param {number} timeId - ID do time
     * @param {string} motivo - Motivo da reversão
     * @returns {Promise<Object>}
     */
    async function reverterInscricao(ligaId, temporada, timeId, motivo) {
        console.log(`[RENOVACAO-API] Revertendo inscrição time=${timeId}`);
        return fetchJSON(`${CONFIG.ENDPOINTS.INSCRICOES}/${ligaId}/${temporada}/${timeId}`, {
            method: 'DELETE',
            body: JSON.stringify({ motivo })
        });
    }

    // =========================================================================
    // BUSCA CARTOLA
    // =========================================================================

    /**
     * Busca times no Cartola por nome
     * @param {string} query - Nome ou parte do nome
     * @param {number} limit - Máximo de resultados
     * @returns {Promise<Object>}
     */
    async function buscarTimeCartola(query, limit = 20) {
        if (!query || query.trim().length < 3) {
            throw new Error('Busca requer pelo menos 3 caracteres');
        }

        console.log(`[RENOVACAO-API] Buscando time: "${query}"`);
        return fetchJSON(`${CONFIG.ENDPOINTS.BUSCAR_TIME}?q=${encodeURIComponent(query)}&limit=${limit}`);
    }

    /**
     * Busca dados completos de um time por ID
     * @param {number} timeId - ID oficial do Cartola
     * @returns {Promise<Object>}
     */
    async function buscarTimeCartolaPorId(timeId) {
        console.log(`[RENOVACAO-API] Buscando time ID: ${timeId}`);
        return fetchJSON(`${CONFIG.ENDPOINTS.BUSCAR_TIME}/${timeId}`);
    }

    // =========================================================================
    // TESOURARIA (para saldo)
    // =========================================================================

    /**
     * Busca saldo de um participante
     * @param {string} ligaId - ID da liga
     * @param {number} timeId - ID do time
     * @param {number} temporada - Temporada
     * @returns {Promise<Object>}
     */
    async function buscarSaldoParticipante(ligaId, timeId, temporada) {
        console.log(`[RENOVACAO-API] Buscando saldo time=${timeId} temporada=${temporada}`);
        return fetchJSON(`${CONFIG.ENDPOINTS.TESOURARIA}/${ligaId}/${timeId}?temporada=${temporada}`);
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    return {
        // Config
        CONFIG,

        // Regras
        buscarRegras,
        salvarRegras,
        alterarStatusRenovacao,
        previewInscricao,

        // Inscrições
        listarInscricoes,
        estatisticasInscricoes,
        buscarInscricao,
        renovarParticipante,
        naoParticipar,
        novoParticipante,
        inicializarInscricoes,
        reverterInscricao,

        // Cartola
        buscarTimeCartola,
        buscarTimeCartolaPorId,

        // Tesouraria
        buscarSaldoParticipante
    };

})();

// Export para ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenovacaoAPI;
}
