// ==============================
// SERVIÇO DE API - FLUXO FINANCEIRO
// ==============================

const API_BASE_URL = window.location.origin;

export class FluxoFinanceiroAPI {
    /**
     * Busca campos editáveis de um time
     * @param {string} ligaId - ID da liga
     * @param {string} timeId - ID do time
     * @returns {Promise<Object>}
     */
    static async getCampos(ligaId, timeId) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/fluxo-financeiro/${ligaId}/times/${timeId}`,
            );

            if (!response.ok) {
                throw new Error(`Erro ao buscar campos: ${response.status}`);
            }

            const data = await response.json();
            console.log("[FLUXO-API] Campos carregados:", data);
            return data;
        } catch (error) {
            console.error("[FLUXO-API] Erro ao buscar campos:", error);
            throw error;
        }
    }

    /**
     * Busca campos de todos os times da liga
     * @param {string} ligaId - ID da liga
     * @returns {Promise<Array>}
     */
    static async getCamposLiga(ligaId) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/fluxo-financeiro/${ligaId}`,
            );

            if (!response.ok) {
                throw new Error(
                    `Erro ao buscar campos da liga: ${response.status}`,
                );
            }

            const data = await response.json();
            console.log("[FLUXO-API] Campos da liga carregados:", data.length);
            return data;
        } catch (error) {
            console.error("[FLUXO-API] Erro ao buscar campos da liga:", error);
            throw error;
        }
    }

    /**
     * Salva todos os campos de um time
     * @param {string} ligaId - ID da liga
     * @param {string} timeId - ID do time
     * @param {Array} campos - Array com 4 campos [{nome, valor}]
     * @returns {Promise<Object>}
     */
    static async salvarCampos(ligaId, timeId, campos) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/fluxo-financeiro/${ligaId}/times/${timeId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ campos }),
                },
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(
                    error.error || `Erro ao salvar campos: ${response.status}`,
                );
            }

            const data = await response.json();
            console.log("[FLUXO-API] Campos salvos com sucesso");
            return data;
        } catch (error) {
            console.error("[FLUXO-API] Erro ao salvar campos:", error);
            throw error;
        }
    }

    /**
     * Salva um campo individual
     * ✅ CORRIGIDO: Sempre envia nome E valor juntos
     * @param {string} ligaId - ID da liga
     * @param {string} timeId - ID do time
     * @param {number} campoIndex - Índice do campo (0-3)
     * @param {Object} dados - { nome: string, valor: number }
     * @returns {Promise<Object>}
     */
    static async salvarCampo(ligaId, timeId, campoIndex, dados) {
        try {
            // ✅ VALIDAÇÃO: Garante que nome E valor estão presentes
            if (!dados.nome || dados.valor === undefined) {
                throw new Error(
                    "Dados incompletos: nome e valor são obrigatórios",
                );
            }

            const body = {
                nome: dados.nome,
                valor: parseFloat(dados.valor) || 0,
            };

            const response = await fetch(
                `${API_BASE_URL}/api/fluxo-financeiro/${ligaId}/times/${timeId}/campo/${campoIndex}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                },
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(
                    error.error || `Erro ao salvar campo: ${response.status}`,
                );
            }

            const data = await response.json();
            console.log(`[FLUXO-API] Campo ${campoIndex} salvo:`, body);
            return data;
        } catch (error) {
            console.error(
                "[FLUXO-API] Erro ao salvar campo individual:",
                error,
            );
            throw error;
        }
    }

    /**
     * Reseta campos para padrão
     * @param {string} ligaId - ID da liga
     * @param {string} timeId - ID do time
     * @returns {Promise<Object>}
     */
    static async resetarCampos(ligaId, timeId) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/fluxo-financeiro/${ligaId}/times/${timeId}/reset`,
                {
                    method: "POST",
                },
            );

            if (!response.ok) {
                throw new Error(`Erro ao resetar campos: ${response.status}`);
            }

            const data = await response.json();
            console.log("[FLUXO-API] Campos resetados com sucesso");
            return data;
        } catch (error) {
            console.error("[FLUXO-API] Erro ao resetar campos:", error);
            throw error;
        }
    }

    /**
     * Deleta campos de um time
     * @param {string} ligaId - ID da liga
     * @param {string} timeId - ID do time
     * @returns {Promise<Object>}
     */
    static async deletarCampos(ligaId, timeId) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/fluxo-financeiro/${ligaId}/times/${timeId}`,
                {
                    method: "DELETE",
                },
            );

            if (!response.ok) {
                throw new Error(`Erro ao deletar campos: ${response.status}`);
            }

            const data = await response.json();
            console.log("[FLUXO-API] Campos deletados com sucesso");
            return data;
        } catch (error) {
            console.error("[FLUXO-API] Erro ao deletar campos:", error);
            throw error;
        }
    }
}