/**
 * Rotas: Inscrições Temporada
 *
 * API para gerenciar renovação e inscrição de participantes.
 * Endpoints para renovar, não participar, novo participante.
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

import express from "express";
import InscricaoTemporada from "../models/InscricaoTemporada.js";
import LigaRules from "../models/LigaRules.js";
import Liga from "../models/Liga.js";
import { CURRENT_SEASON } from "../config/seasons.js";
import {
    processarRenovacao,
    processarNaoParticipar,
    processarNovoParticipante,
    buscarSaldoTemporada
} from "../controllers/inscricoesController.js";

const router = express.Router();

// =============================================================================
// GET /api/inscricoes/:ligaId/:temporada
// Listar todas as inscrições de uma liga
// =============================================================================
router.get("/:ligaId/:temporada?", async (req, res) => {
    try {
        const { ligaId } = req.params;
        const temporada = Number(req.params.temporada) || CURRENT_SEASON;
        const { status } = req.query;

        console.log(`[INSCRICOES] GET lista liga=${ligaId} temporada=${temporada} status=${status || 'todos'}`);

        const inscricoes = await InscricaoTemporada.listarPorLiga(ligaId, temporada, status);

        res.json({
            success: true,
            ligaId,
            temporada,
            total: inscricoes.length,
            inscricoes
        });

    } catch (error) {
        console.error("[INSCRICOES] Erro ao listar:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao listar inscrições"
        });
    }
});

// =============================================================================
// GET /api/inscricoes/:ligaId/:temporada/estatisticas
// Resumo de inscrições (pendentes, renovados, etc)
// =============================================================================
router.get("/:ligaId/:temporada/estatisticas", async (req, res) => {
    try {
        const { ligaId, temporada } = req.params;

        console.log(`[INSCRICOES] GET estatísticas liga=${ligaId} temporada=${temporada}`);

        const stats = await InscricaoTemporada.estatisticas(ligaId, Number(temporada));

        // Buscar total de participantes da liga para calcular pendentes
        const liga = await Liga.findById(ligaId).lean();
        const totalParticipantes = liga?.participantes?.filter(p => p.ativo !== false).length || 0;

        // Calcular quantos ainda não decidiram
        const naoDecididos = totalParticipantes - stats.total;

        res.json({
            success: true,
            ligaId,
            temporada: Number(temporada),
            estatisticas: {
                ...stats,
                nao_decididos: Math.max(0, naoDecididos),
                total_liga: totalParticipantes
            }
        });

    } catch (error) {
        console.error("[INSCRICOES] Erro nas estatísticas:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar estatísticas"
        });
    }
});

// =============================================================================
// GET /api/inscricoes/:ligaId/:temporada/:timeId
// Buscar inscrição específica de um participante
// =============================================================================
router.get("/:ligaId/:temporada/:timeId", async (req, res) => {
    try {
        const { ligaId, temporada, timeId } = req.params;

        console.log(`[INSCRICOES] GET inscricao liga=${ligaId} time=${timeId} temporada=${temporada}`);

        const inscricao = await InscricaoTemporada.buscarPorParticipante(ligaId, Number(timeId), Number(temporada));

        if (!inscricao) {
            // Retornar status pendente se não existe inscrição
            const temporadaAnterior = Number(temporada) - 1;
            const saldo = await buscarSaldoTemporada(ligaId, Number(timeId), temporadaAnterior);

            // Buscar dados do participante
            const liga = await Liga.findById(ligaId).lean();
            const participante = liga?.participantes?.find(p => Number(p.time_id) === Number(timeId));

            return res.json({
                success: true,
                inscricao: null,
                statusImplicito: 'pendente',
                dadosParticipante: participante ? {
                    nome_time: participante.nome_time,
                    nome_cartoleiro: participante.nome_cartola || participante.nome_cartoleiro,
                    escudo: participante.escudo_url || participante.foto_time
                } : null,
                temporadaAnterior: {
                    temporada: temporadaAnterior,
                    saldo_final: saldo.saldoFinal,
                    status_quitacao: saldo.status
                }
            });
        }

        res.json({
            success: true,
            inscricao
        });

    } catch (error) {
        console.error("[INSCRICOES] Erro ao buscar:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar inscrição"
        });
    }
});

// =============================================================================
// POST /api/inscricoes/:ligaId/:temporada/renovar/:timeId
// Processar renovação de participante
// =============================================================================
router.post("/:ligaId/:temporada/renovar/:timeId", async (req, res) => {
    try {
        const { ligaId, temporada, timeId } = req.params;
        const { pagouInscricao, aproveitarCredito, observacoes, aprovadoPor } = req.body;

        console.log(`[INSCRICOES] POST renovar liga=${ligaId} time=${timeId} temporada=${temporada} pagou=${pagouInscricao}`);

        const resultado = await processarRenovacao(
            ligaId,
            Number(timeId),
            Number(temporada),
            { pagouInscricao, aproveitarCredito, observacoes, aprovadoPor }
        );

        res.json(resultado);

    } catch (error) {
        console.error("[INSCRICOES] Erro na renovação:", error);
        res.status(400).json({
            success: false,
            error: error.message || "Erro ao processar renovação"
        });
    }
});

// =============================================================================
// POST /api/inscricoes/:ligaId/:temporada/nao-participar/:timeId
// Marcar participante como não participa
// =============================================================================
router.post("/:ligaId/:temporada/nao-participar/:timeId", async (req, res) => {
    try {
        const { ligaId, temporada, timeId } = req.params;
        const { observacoes, aprovadoPor } = req.body;

        console.log(`[INSCRICOES] POST nao-participar liga=${ligaId} time=${timeId} temporada=${temporada}`);

        const resultado = await processarNaoParticipar(
            ligaId,
            Number(timeId),
            Number(temporada),
            { observacoes, aprovadoPor }
        );

        res.json(resultado);

    } catch (error) {
        console.error("[INSCRICOES] Erro ao marcar não participa:", error);
        res.status(400).json({
            success: false,
            error: error.message || "Erro ao processar"
        });
    }
});

// =============================================================================
// POST /api/inscricoes/:ligaId/:temporada/novo
// Cadastrar novo participante
// =============================================================================
router.post("/:ligaId/:temporada/novo", async (req, res) => {
    try {
        const { ligaId, temporada } = req.params;
        const { time_id, nome_time, nome_cartoleiro, escudo, pagouInscricao, observacoes, aprovadoPor } = req.body;

        console.log(`[INSCRICOES] POST novo participante liga=${ligaId} time=${time_id} temporada=${temporada} pagou=${pagouInscricao}`);

        // Validar dados obrigatórios
        if (!time_id) {
            return res.status(400).json({
                success: false,
                error: "ID do time é obrigatório (use a busca do Cartola)"
            });
        }

        const resultado = await processarNovoParticipante(
            ligaId,
            Number(temporada),
            { time_id, nome_time, nome_cartoleiro, escudo },
            { pagouInscricao, observacoes, aprovadoPor }
        );

        res.json(resultado);

    } catch (error) {
        console.error("[INSCRICOES] Erro ao cadastrar novo:", error);
        res.status(400).json({
            success: false,
            error: error.message || "Erro ao cadastrar participante"
        });
    }
});

// =============================================================================
// POST /api/inscricoes/:ligaId/:temporada/inicializar
// Inicializa inscrições pendentes para todos os participantes da liga
// =============================================================================
router.post("/:ligaId/:temporada/inicializar", async (req, res) => {
    try {
        const { ligaId, temporada } = req.params;
        const temporadaOrigem = Number(temporada) - 1;

        console.log(`[INSCRICOES] POST inicializar liga=${ligaId} de ${temporadaOrigem} para ${temporada}`);

        // Verificar se regras existem e estão abertas
        const rules = await LigaRules.buscarPorLiga(ligaId, Number(temporada));
        if (!rules) {
            return res.status(400).json({
                success: false,
                error: "Configure as regras da liga antes de inicializar"
            });
        }

        // Inicializar inscrições
        const quantidade = await InscricaoTemporada.inicializarParaLiga(
            ligaId,
            temporadaOrigem,
            Number(temporada)
        );

        res.json({
            success: true,
            message: `${quantidade} inscrições pendentes criadas`,
            quantidade
        });

    } catch (error) {
        console.error("[INSCRICOES] Erro ao inicializar:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao inicializar inscrições"
        });
    }
});

// =============================================================================
// DELETE /api/inscricoes/:ligaId/:temporada/:timeId
// Cancelar/reverter inscrição (admin only)
// =============================================================================
router.delete("/:ligaId/:temporada/:timeId", async (req, res) => {
    try {
        const { ligaId, temporada, timeId } = req.params;
        const { motivo } = req.body;

        console.log(`[INSCRICOES] DELETE inscricao liga=${ligaId} time=${timeId} temporada=${temporada}`);

        const inscricao = await InscricaoTemporada.findOne({
            liga_id: ligaId,
            time_id: Number(timeId),
            temporada: Number(temporada)
        });

        if (!inscricao) {
            return res.status(404).json({
                success: false,
                error: "Inscrição não encontrada"
            });
        }

        // Se já foi processada, precisa reverter as transações
        if (inscricao.processado) {
            // TODO: Implementar reversão de transações
            console.warn(`[INSCRICOES] Inscrição processada - transações não foram revertidas`);
        }

        // Voltar para pendente
        inscricao.status = 'pendente';
        inscricao.processado = false;
        inscricao.observacoes = `Revertido: ${motivo || 'Sem motivo'}. Original: ${inscricao.observacoes}`;
        await inscricao.save();

        res.json({
            success: true,
            message: "Inscrição revertida para pendente",
            inscricao
        });

    } catch (error) {
        console.error("[INSCRICOES] Erro ao deletar:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao reverter inscrição"
        });
    }
});

export default router;
