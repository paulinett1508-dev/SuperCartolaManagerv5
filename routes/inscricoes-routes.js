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
import { verificarAdmin } from "../middleware/auth.js";
import InscricaoTemporada from "../models/InscricaoTemporada.js";
import LigaRules from "../models/LigaRules.js";
import Liga from "../models/Liga.js";
import { CURRENT_SEASON } from "../config/seasons.js";
import {
    processarRenovacao,
    processarNaoParticipar,
    processarNovoParticipante,
    buscarSaldoTemporada,
    buscarDadosDecisao,
    processarDecisaoUnificada
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

        // Buscar liga para enriquecer com clube_id (time do coracao)
        const liga = await Liga.findById(ligaId).lean();
        const participantesMap = new Map();
        if (liga?.participantes) {
            liga.participantes.forEach(p => {
                participantesMap.set(Number(p.time_id), {
                    clube_id: p.clube_id,
                    contato: p.contato
                });
            });
        }

        // Enriquecer inscricoes com clube_id
        const inscricoesEnriquecidas = inscricoes.map(i => {
            const dadosLiga = participantesMap.get(Number(i.time_id)) || {};
            return {
                ...i.toObject ? i.toObject() : i,
                clube_id: dadosLiga.clube_id || null
            };
        });

        res.json({
            success: true,
            ligaId,
            temporada,
            total: inscricoesEnriquecidas.length,
            inscricoes: inscricoesEnriquecidas
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
// Processar renovação de participante (admin only)
// =============================================================================
router.post("/:ligaId/:temporada/renovar/:timeId", verificarAdmin, async (req, res) => {
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
// Marcar participante como não participa (admin only)
// =============================================================================
router.post("/:ligaId/:temporada/nao-participar/:timeId", verificarAdmin, async (req, res) => {
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
// Cadastrar novo participante (suporta cadastro manual sem ID)
// =============================================================================
router.post("/:ligaId/:temporada/novo", verificarAdmin, async (req, res) => {
    try {
        const { ligaId, temporada } = req.params;
        const {
            time_id,
            nome_time,
            nome_cartoleiro,
            escudo,
            time_coracao,
            contato,
            pendente_sincronizacao,
            cadastro_manual,
            pagouInscricao,
            observacoes,
            aprovadoPor,
            // Campos adicionais da API Cartola (dados completos)
            slug,
            assinante,
            patrimonio,
            pontos_campeonato,
            dados_cartola
        } = req.body;

        const isCadastroManual = cadastro_manual === true || pendente_sincronizacao === true;

        console.log(`[INSCRICOES] POST novo participante liga=${ligaId} time=${time_id || 'MANUAL'} temporada=${temporada} pagou=${pagouInscricao} manual=${isCadastroManual}`);

        // Validar dados obrigatórios
        if (!isCadastroManual && !time_id) {
            return res.status(400).json({
                success: false,
                error: "ID do time é obrigatório (use a busca do Cartola ou cadastro manual)"
            });
        }

        // Para cadastro manual, nome é obrigatório
        if (isCadastroManual && !nome_cartoleiro && !nome_time) {
            return res.status(400).json({
                success: false,
                error: "Nome do participante é obrigatório para cadastro manual"
            });
        }

        const resultado = await processarNovoParticipante(
            ligaId,
            Number(temporada),
            {
                time_id: time_id || null,
                nome_time,
                nome_cartoleiro,
                escudo,
                time_coracao,
                contato,
                pendente_sincronizacao: isCadastroManual && !time_id,
                cadastro_manual: isCadastroManual,
                // Dados completos da API Cartola
                slug,
                assinante,
                patrimonio,
                pontos_campeonato,
                dados_cartola
            },
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
// PATCH /api/inscricoes/:ligaId/:temporada/:timeId/marcar-pago
// Marca inscrição como paga (remove débito da taxa de inscrição)
// =============================================================================
router.patch("/:ligaId/:temporada/:timeId/marcar-pago", verificarAdmin, async (req, res) => {
    try {
        const { ligaId, temporada, timeId } = req.params;

        console.log(`[INSCRICOES] PATCH marcar-pago liga=${ligaId} time=${timeId} temporada=${temporada}`);

        // Buscar inscrição
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

        // Verificar se já está paga
        if (inscricao.pagou_inscricao) {
            return res.json({
                success: true,
                message: "Inscrição já estava marcada como paga",
                jaEstavaPaga: true
            });
        }

        // Marcar como paga
        inscricao.pagou_inscricao = true;
        inscricao.data_pagamento_inscricao = new Date();
        await inscricao.save();

        // ✅ v1.1: Remover/estornar o débito da taxa de inscrição do extrato
        const mongoose = (await import('mongoose')).default;
        const db = mongoose.connection.db;
        const ligaObjId = new mongoose.Types.ObjectId(ligaId);
        
        // Remover transação de INSCRICAO_TEMPORADA do extrato cache
        const updateResult = await db.collection('extratofinanceirocaches').updateOne(
            {
                liga_id: ligaObjId,
                time_id: Number(timeId),
                temporada: Number(temporada)
            },
            {
                $pull: {
                    historico_transacoes: { tipo: 'INSCRICAO_TEMPORADA' }
                },
                $inc: {
                    saldo_consolidado: inscricao.taxa_inscricao || 0  // Estorna o valor (positivo)
                }
            }
        );
        
        console.log(`[INSCRICOES] Extrato atualizado:`, {
            matched: updateResult.matchedCount,
            modified: updateResult.modifiedCount,
            valorEstornado: inscricao.taxa_inscricao
        });

        console.log(`[INSCRICOES] Inscrição marcada como PAGA: liga=${ligaId} time=${timeId}`);

        res.json({
            success: true,
            message: "Inscrição marcada como paga com sucesso",
            inscricao: {
                time_id: inscricao.time_id,
                pagou_inscricao: inscricao.pagou_inscricao,
                data_pagamento: inscricao.data_pagamento_inscricao
            }
        });

    } catch (error) {
        console.error("[INSCRICOES] Erro ao marcar pago:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao marcar inscrição como paga"
        });
    }
});

// =============================================================================
// POST /api/inscricoes/:ligaId/:temporada/inicializar
// Inicializa inscrições pendentes para todos os participantes da liga
// =============================================================================
router.post("/:ligaId/:temporada/inicializar", verificarAdmin, async (req, res) => {
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
router.delete("/:ligaId/:temporada/:timeId", verificarAdmin, async (req, res) => {
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

// =============================================================================
// GET /api/inscricoes/:ligaId/:temporada/decisao-preview/:timeId
// Busca dados completos para o modal de decisao unificada
// =============================================================================
router.get("/:ligaId/:temporada/decisao-preview/:timeId", async (req, res) => {
    try {
        const { ligaId, temporada, timeId } = req.params;

        console.log(`[INSCRICOES] GET decisao-preview liga=${ligaId} time=${timeId} temporada=${temporada}`);

        const dados = await buscarDadosDecisao(ligaId, Number(timeId), Number(temporada));

        res.json({
            success: true,
            ...dados
        });

    } catch (error) {
        console.error("[INSCRICOES] Erro ao buscar dados decisao:", error);
        res.status(400).json({
            success: false,
            error: error.message || "Erro ao buscar dados para decisao"
        });
    }
});

// =============================================================================
// POST /api/inscricoes/:ligaId/:temporada/decisao/:timeId
// Processa decisao unificada (quitacao + renovacao/nao-participar)
// =============================================================================
router.post("/:ligaId/:temporada/decisao/:timeId", verificarAdmin, async (req, res) => {
    try {
        const { ligaId, temporada, timeId } = req.params;
        const decisao = req.body;

        console.log(`[INSCRICOES] POST decisao liga=${ligaId} time=${timeId} temporada=${temporada}`);
        console.log(`[INSCRICOES] Payload:`, JSON.stringify(decisao, null, 2));

        // Validar payload
        if (!decisao.decisao || !['renovar', 'nao_participar'].includes(decisao.decisao)) {
            return res.status(400).json({
                success: false,
                error: "Campo 'decisao' obrigatorio. Use 'renovar' ou 'nao_participar'"
            });
        }

        const resultado = await processarDecisaoUnificada(
            ligaId,
            Number(timeId),
            Number(temporada),
            decisao
        );

        res.json(resultado);

    } catch (error) {
        console.error("[INSCRICOES] Erro ao processar decisao:", error);
        res.status(400).json({
            success: false,
            error: error.message || "Erro ao processar decisao"
        });
    }
});

// =============================================================================
// POST /api/inscricoes/:ligaId/:temporada/batch
// Processa ações em lote para múltiplos participantes
// =============================================================================
router.post("/:ligaId/:temporada/batch", verificarAdmin, async (req, res) => {
    try {
        const { ligaId, temporada } = req.params;
        const { timeIds, acao, opcoes } = req.body;

        console.log(`[INSCRICOES] POST batch liga=${ligaId} temporada=${temporada} acao=${acao} times=${timeIds?.length}`);

        // Validar payload
        if (!Array.isArray(timeIds) || timeIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: "timeIds deve ser um array não vazio"
            });
        }

        if (!acao) {
            return res.status(400).json({
                success: false,
                error: "Campo 'acao' é obrigatório"
            });
        }

        // Importar função batch do controller
        const { processarBatchInscricoes } = await import("../controllers/inscricoesController.js");

        const resultado = await processarBatchInscricoes(
            ligaId,
            Number(temporada),
            timeIds,
            acao,
            opcoes || {}
        );

        res.json(resultado);

    } catch (error) {
        console.error("[INSCRICOES] Erro no batch:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Erro ao processar batch"
        });
    }
});

export default router;
