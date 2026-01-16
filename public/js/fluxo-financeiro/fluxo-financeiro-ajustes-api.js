/**
 * API Client: Ajustes Financeiros
 *
 * Comunicação com endpoints de ajustes dinâmicos (temporada 2026+).
 * Substitui os 4 campos fixos de FluxoFinanceiroCampos.
 *
 * @version 1.0.0
 * @since 2026-01-16
 */

// =============================================================================
// CLASSE PRINCIPAL
// =============================================================================

class FluxoFinanceiroAjustesAPI {

    /**
     * Lista ajustes de um participante
     * @param {string} ligaId - ID da liga
     * @param {number} timeId - ID do time
     * @param {number} temporada - Temporada (default: 2026)
     * @returns {Promise<Array>} Lista de ajustes
     */
    static async listarAjustes(ligaId, timeId, temporada = 2026) {
        try {
            const response = await fetch(
                `/api/ajustes/${ligaId}/${timeId}?temporada=${temporada}`
            );

            if (!response.ok) {
                throw new Error(`Erro ao listar ajustes: ${response.status}`);
            }

            const data = await response.json();
            return data.ajustes || [];

        } catch (error) {
            console.error('[AJUSTES-API] Erro ao listar:', error);
            return [];
        }
    }

    /**
     * Cria novo ajuste
     * @param {string} ligaId - ID da liga
     * @param {number} timeId - ID do time
     * @param {Object} dados - { descricao, valor, temporada? }
     * @returns {Promise<Object|null>} Ajuste criado ou null
     */
    static async criarAjuste(ligaId, timeId, dados) {
        try {
            const response = await fetch(
                `/api/ajustes/${ligaId}/${timeId}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        descricao: dados.descricao,
                        valor: Number(dados.valor),
                        temporada: dados.temporada || 2026
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || `Erro ao criar ajuste: ${response.status}`);
            }

            const data = await response.json();
            console.log('[AJUSTES-API] Ajuste criado:', data);
            return data.ajuste || data;

        } catch (error) {
            console.error('[AJUSTES-API] Erro ao criar:', error);
            throw error;
        }
    }

    /**
     * Atualiza ajuste existente
     * @param {string} ajusteId - ID do ajuste
     * @param {Object} dados - { descricao?, valor? }
     * @returns {Promise<Object|null>} Ajuste atualizado ou null
     */
    static async atualizarAjuste(ajusteId, dados) {
        try {
            const response = await fetch(
                `/api/ajustes/${ajusteId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || `Erro ao atualizar ajuste: ${response.status}`);
            }

            const data = await response.json();
            console.log('[AJUSTES-API] Ajuste atualizado:', data);
            return data.ajuste || data;

        } catch (error) {
            console.error('[AJUSTES-API] Erro ao atualizar:', error);
            throw error;
        }
    }

    /**
     * Remove ajuste (soft delete)
     * @param {string} ajusteId - ID do ajuste
     * @returns {Promise<boolean>} true se removido com sucesso
     */
    static async removerAjuste(ajusteId) {
        try {
            const response = await fetch(
                `/api/ajustes/${ajusteId}`,
                {
                    method: 'DELETE'
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || `Erro ao remover ajuste: ${response.status}`);
            }

            console.log('[AJUSTES-API] Ajuste removido:', ajusteId);
            return true;

        } catch (error) {
            console.error('[AJUSTES-API] Erro ao remover:', error);
            throw error;
        }
    }

    /**
     * Calcula total dos ajustes
     * @param {Array} ajustes - Lista de ajustes
     * @returns {Object} { total, creditos, debitos }
     */
    static calcularTotal(ajustes) {
        if (!Array.isArray(ajustes) || ajustes.length === 0) {
            return { total: 0, creditos: 0, debitos: 0 };
        }

        let creditos = 0;
        let debitos = 0;

        ajustes.forEach(ajuste => {
            const valor = Number(ajuste.valor) || 0;
            if (valor > 0) {
                creditos += valor;
            } else {
                debitos += valor;
            }
        });

        return {
            total: creditos + debitos,
            creditos,
            debitos
        };
    }
}

// =============================================================================
// EXPORT GLOBAL
// =============================================================================

window.FluxoFinanceiroAjustesAPI = FluxoFinanceiroAjustesAPI;

console.log('[AJUSTES-API] Carregado v1.0.0');
