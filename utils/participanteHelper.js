// utils/participanteHelper.js
// =====================================================================
// HELPER CENTRALIZADO PARA GESTÃO DE PARTICIPANTES ATIVOS/INATIVOS
// =====================================================================

import mongoose from "mongoose";

/**
 * Obtém o Model Time de forma segura
 */
function getTimeModel() {
    if (mongoose.models.Time) {
        return mongoose.models.Time;
    }

    const TimeSchema = new mongoose.Schema({
        id: { type: Number, required: true, unique: true, index: true },
        nome_time: { type: String, required: true },
        nome_cartoleiro: { type: String, required: true },
        url_escudo_png: { type: String },
        clube_id: { type: Number },
        ativo: { type: Boolean, default: true },
        rodada_desistencia: { type: Number, default: null },
        data_desistencia: { type: Date, default: null },
        senha_acesso: { type: String, default: "" },
    });

    return mongoose.model("Time", TimeSchema);
}

/**
 * ✅ Buscar status de múltiplos participantes em batch
 * @param {Array<number>} timeIds - Array de IDs dos times
 * @returns {Object} Mapa { timeId: { ativo, rodada_desistencia } }
 */
export async function buscarStatusParticipantes(timeIds) {
    try {
        const Time = getTimeModel();

        const times = await Time.find({
            id: { $in: timeIds.map((id) => Number(id)) },
        }).lean();

        const statusMap = {};

        // Inicializar todos como ativos (default)
        timeIds.forEach((id) => {
            statusMap[String(id)] = {
                ativo: true,
                rodada_desistencia: null,
            };
        });

        // Sobrescrever com dados reais do banco
        times.forEach((time) => {
            statusMap[String(time.id)] = {
                ativo: time.ativo !== false,
                rodada_desistencia: time.rodada_desistencia || null,
            };
        });

        return statusMap;
    } catch (error) {
        console.error("[PARTICIPANTE-HELPER] Erro ao buscar status:", error);

        // Em caso de erro, retornar todos como ativos
        const statusMap = {};
        timeIds.forEach((id) => {
            statusMap[String(id)] = { ativo: true, rodada_desistencia: null };
        });
        return statusMap;
    }
}

/**
 * ✅ Verificar se participante estava ativo em determinada rodada
 * @param {number} timeId - ID do time
 * @param {number} rodada - Número da rodada
 * @returns {boolean} true se estava ativo na rodada
 */
export async function estaAtivoNaRodada(timeId, rodada) {
    try {
        const Time = getTimeModel();
        const time = await Time.findOne({ id: Number(timeId) }).lean();

        if (!time) return true; // Assume ativo se não encontrar

        // Se está ativo, sempre participou
        if (time.ativo !== false) return true;

        // Se inativo, verificar se a rodada é anterior à desistência
        if (time.rodada_desistencia && rodada < time.rodada_desistencia) {
            return true;
        }

        return false;
    } catch (error) {
        console.error(
            "[PARTICIPANTE-HELPER] Erro ao verificar ativo na rodada:",
            error,
        );
        return true; // Em caso de erro, assume ativo
    }
}

/**
 * ✅ Filtrar ranking separando ativos e inativos
 * @param {Array} ranking - Array de participantes com timeId
 * @param {Object} statusMap - Mapa de status { timeId: { ativo, rodada_desistencia } }
 * @returns {Object} { ativos: [...], inativos: [...] }
 */
export function separarAtivosPorStatus(ranking, statusMap) {
    const ativos = [];
    const inativos = [];

    ranking.forEach((participante) => {
        const tid = String(
            participante.timeId ||
                participante.participanteId ||
                participante.time_id,
        );
        const status = statusMap[tid];

        if (status && status.ativo === false) {
            // Marcar como inativo para referência
            inativos.push({
                ...participante,
                ativo: false,
                rodada_desistencia: status.rodada_desistencia,
            });
        } else {
            ativos.push({
                ...participante,
                ativo: true,
            });
        }
    });

    return { ativos, inativos };
}

/**
 * ✅ Obter última rodada válida para um participante
 * Se ativo: retorna rodadaFim normal
 * Se inativo: retorna min(rodadaFim, rodada_desistencia - 1)
 * @param {Object} status - { ativo, rodada_desistencia }
 * @param {number} rodadaFim - Rodada final desejada
 * @returns {number} Última rodada válida para cálculos
 */
export function obterUltimaRodadaValida(status, rodadaFim) {
    if (!status || status.ativo !== false) {
        return rodadaFim;
    }

    if (status.rodada_desistencia) {
        // Dados válidos até a rodada ANTERIOR à desistência
        return Math.min(rodadaFim, status.rodada_desistencia - 1);
    }

    return rodadaFim;
}

/**
 * ✅ Processar ranking com filtro de inativos
 * Adiciona campo 'ativo' e 'rodada_desistencia' a cada participante
 * @param {Array} ranking - Array de participantes
 * @returns {Array} Ranking com status de ativo/inativo
 */
export async function processarRankingComStatus(ranking) {
    if (!ranking || ranking.length === 0) return ranking;

    // Extrair todos os timeIds
    const timeIds = ranking
        .map((p) => p.timeId || p.participanteId || p.time_id)
        .filter(Boolean);

    // Buscar status de todos
    const statusMap = await buscarStatusParticipantes(timeIds);

    // Adicionar status a cada participante
    return ranking.map((participante) => {
        const tid = String(
            participante.timeId ||
                participante.participanteId ||
                participante.time_id,
        );
        const status = statusMap[tid] || {
            ativo: true,
            rodada_desistencia: null,
        };

        return {
            ...participante,
            ativo: status.ativo,
            rodada_desistencia: status.rodada_desistencia,
        };
    });
}

/**
 * ✅ Ordenar ranking com ativos primeiro, depois inativos
 * @param {Array} ranking - Array de participantes com campo 'ativo'
 * @param {Function} sortFn - Função de ordenação para aplicar dentro de cada grupo
 * @returns {Array} Ranking ordenado (ativos primeiro, depois inativos)
 */
export function ordenarRankingComInativos(ranking, sortFn) {
    const ativos = ranking.filter((p) => p.ativo !== false);
    const inativos = ranking.filter((p) => p.ativo === false);

    // Ordenar cada grupo separadamente
    if (sortFn) {
        ativos.sort(sortFn);
        inativos.sort(sortFn);
    }

    // Retornar ativos primeiro, depois inativos
    return [...ativos, ...inativos];
}

console.log("[PARTICIPANTE-HELPER] ✅ Helper de participantes carregado");

export default {
    buscarStatusParticipantes,
    estaAtivoNaRodada,
    separarAtivosPorStatus,
    obterUltimaRodadaValida,
    processarRankingComStatus,
    ordenarRankingComInativos,
};
