// controllers/rankingTurnoController.js
import {
    buscarRankingTurno,
    reconsolidarTodosOsTurnos,
    invalidarCacheTurno,
} from "../services/rankingTurnoService.js";

const LOG_PREFIX = "[RANKING-TURNO-CTRL]";

/**
 * GET /api/ranking-turno/:ligaId?turno=1|2|geral
 * Busca ranking de um turno específico
 */
export async function getRankingTurno(req, res) {
    try {
        const { ligaId } = req.params;
        const { turno = "geral", temporada } = req.query;
        // Multi-Temporada: usar temporada do query ou ano atual
        const temporadaNum = temporada ? parseInt(temporada, 10) : new Date().getFullYear();

        console.log(
            `${LOG_PREFIX} GET ranking turno ${turno} - Liga: ${ligaId} - Temporada: ${temporadaNum}`,
        );

        if (!ligaId) {
            return res.status(400).json({
                success: false,
                error: "ligaId é obrigatório",
            });
        }

        const snapshot = await buscarRankingTurno(ligaId, turno, temporadaNum);

        if (!snapshot) {
            // Pré-temporada ou dados ainda não consolidados
            return res.status(200).json({
                success: true,
                turno,
                status: "vazio",
                rodada_atual: null,
                rodada_inicio: null,
                rodada_fim: null,
                total_times: 0,
                consolidado_em: null,
                atualizado_em: null,
                ranking: [],
                message: "Nenhum dado encontrado para este turno",
            });
        }

        res.json({
            success: true,
            turno: snapshot.turno,
            status: snapshot.status,
            rodada_atual: snapshot.rodada_atual,
            rodada_inicio: snapshot.rodada_inicio,
            rodada_fim: snapshot.rodada_fim,
            total_times: snapshot.ranking?.length || 0,
            consolidado_em: snapshot.consolidado_em,
            atualizado_em: snapshot.atualizado_em,
            ranking: snapshot.ranking || [],
            // ✅ v3.0: Adicionar campos para parciais em tempo real
            parcial: snapshot.parcial || false,
            message: snapshot.message || null,
        });
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Erro:`, error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * POST /api/ranking-turno/:ligaId/consolidar
 * Força reconsolidação de todos os turnos
 */
export async function consolidarTurnos(req, res) {
    try {
        const { ligaId } = req.params;

        console.log(`${LOG_PREFIX} POST consolidar turnos - Liga: ${ligaId}`);

        if (!ligaId) {
            return res.status(400).json({
                success: false,
                error: "ligaId é obrigatório",
            });
        }

        const resultados = await reconsolidarTodosOsTurnos(ligaId);

        res.json({
            success: true,
            message: "Turnos consolidados com sucesso",
            turnos: {
                turno1: {
                    status: resultados.turno1?.status,
                    times: resultados.turno1?.ranking?.length || 0,
                    rodada_atual: resultados.turno1?.rodada_atual,
                },
                turno2: {
                    status: resultados.turno2?.status,
                    times: resultados.turno2?.ranking?.length || 0,
                    rodada_atual: resultados.turno2?.rodada_atual,
                },
                geral: {
                    status: resultados.geral?.status,
                    times: resultados.geral?.ranking?.length || 0,
                    rodada_atual: resultados.geral?.rodada_atual,
                },
            },
        });
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Erro:`, error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * DELETE /api/ranking-turno/:ligaId/cache
 * Invalida cache de turnos não consolidados
 */
export async function limparCache(req, res) {
    try {
        const { ligaId } = req.params;
        const { turno } = req.query;

        console.log(
            `${LOG_PREFIX} DELETE cache - Liga: ${ligaId}, Turno: ${turno || "todos"}`,
        );

        if (!ligaId) {
            return res.status(400).json({
                success: false,
                error: "ligaId é obrigatório",
            });
        }

        const resultado = await invalidarCacheTurno(ligaId, turno);

        res.json({
            success: true,
            message: "Cache invalidado",
            registros_removidos: resultado.deletedCount,
        });
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Erro:`, error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

export default {
    getRankingTurno,
    consolidarTurnos,
    limparCache,
};
