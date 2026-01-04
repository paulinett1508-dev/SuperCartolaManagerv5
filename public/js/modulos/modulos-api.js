/**
 * Modulos API Module
 *
 * Chamadas a API para gerenciamento de modulos por liga.
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

const ModulosAPI = (function() {
    'use strict';

    const BASE_URL = '/api';

    // =========================================================================
    // HELPERS
    // =========================================================================

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro na requisicao');
        }

        return data;
    }

    // =========================================================================
    // LISTAR MODULOS
    // =========================================================================

    /**
     * Lista todos os modulos disponiveis para uma liga
     * @param {string} ligaId - ID da liga
     * @param {number} temporada - Temporada (opcional)
     * @returns {Promise<Object>} Lista de modulos
     */
    async function listarModulos(ligaId, temporada = null) {
        let url = `${BASE_URL}/liga/${ligaId}/modulos`;
        if (temporada) {
            url += `?temporada=${temporada}`;
        }
        return fetchJson(url);
    }

    /**
     * Busca config detalhada de um modulo
     * @param {string} ligaId - ID da liga
     * @param {string} modulo - Nome do modulo
     * @param {number} temporada - Temporada (opcional)
     * @returns {Promise<Object>} Config do modulo
     */
    async function buscarModulo(ligaId, modulo, temporada = null) {
        let url = `${BASE_URL}/liga/${ligaId}/modulos/${modulo}`;
        if (temporada) {
            url += `?temporada=${temporada}`;
        }
        return fetchJson(url);
    }

    // =========================================================================
    // ATIVAR / DESATIVAR
    // =========================================================================

    /**
     * Ativa um modulo para a liga
     * @param {string} ligaId - ID da liga
     * @param {string} modulo - Nome do modulo
     * @param {Object} config - Configuracoes (wizard_respostas, financeiro_override, etc)
     * @param {number} temporada - Temporada (opcional)
     * @returns {Promise<Object>} Resultado
     */
    async function ativarModulo(ligaId, modulo, config = {}, temporada = null) {
        return fetchJson(`${BASE_URL}/liga/${ligaId}/modulos/${modulo}/ativar`, {
            method: 'POST',
            body: JSON.stringify({
                ...config,
                temporada
            })
        });
    }

    /**
     * Desativa um modulo para a liga
     * @param {string} ligaId - ID da liga
     * @param {string} modulo - Nome do modulo
     * @param {number} temporada - Temporada (opcional)
     * @returns {Promise<Object>} Resultado
     */
    async function desativarModulo(ligaId, modulo, temporada = null) {
        return fetchJson(`${BASE_URL}/liga/${ligaId}/modulos/${modulo}/desativar`, {
            method: 'POST',
            body: JSON.stringify({ temporada })
        });
    }

    // =========================================================================
    // ATUALIZAR CONFIG
    // =========================================================================

    /**
     * Atualiza configuracao de um modulo
     * @param {string} ligaId - ID da liga
     * @param {string} modulo - Nome do modulo
     * @param {Object} config - Novas configuracoes
     * @param {number} temporada - Temporada (opcional)
     * @returns {Promise<Object>} Resultado
     */
    async function atualizarConfig(ligaId, modulo, config, temporada = null) {
        return fetchJson(`${BASE_URL}/liga/${ligaId}/modulos/${modulo}/config`, {
            method: 'PUT',
            body: JSON.stringify({
                ...config,
                temporada
            })
        });
    }

    // =========================================================================
    // WIZARD
    // =========================================================================

    /**
     * Busca perguntas do wizard para um modulo
     * @param {string} modulo - Nome do modulo
     * @returns {Promise<Object>} Wizard config
     */
    async function buscarWizard(modulo) {
        return fetchJson(`${BASE_URL}/modulos/${modulo}/wizard`);
    }

    // =========================================================================
    // VERIFICAR STATUS
    // =========================================================================

    /**
     * Verifica se modulo esta ativo
     * @param {string} ligaId - ID da liga
     * @param {string} modulo - Nome do modulo
     * @param {number} temporada - Temporada (opcional)
     * @returns {Promise<boolean>} true se ativo
     */
    async function isModuloAtivo(ligaId, modulo, temporada = null) {
        let url = `${BASE_URL}/liga/${ligaId}/modulos/${modulo}/status`;
        if (temporada) {
            url += `?temporada=${temporada}`;
        }
        const result = await fetchJson(url);
        return result.ativo;
    }

    // =========================================================================
    // EXPORTS
    // =========================================================================

    return {
        listarModulos,
        buscarModulo,
        ativarModulo,
        desativarModulo,
        atualizarConfig,
        buscarWizard,
        isModuloAtivo
    };

})();

// Export para uso em modulos ES6
if (typeof window !== 'undefined') {
    window.ModulosAPI = ModulosAPI;
}
