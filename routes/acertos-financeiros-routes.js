/**
 * ROTAS DE ACERTOS FINANCEIROS - Multi-temporada
 *
 * Endpoints para registrar pagamentos e recebimentos
 * entre participantes e administração (em tempo real).
 *
 * @version 1.7.0
 * ✅ v1.7.0: FIX - Usar CURRENT_SEASON de config/seasons.js (não mais hardcoded 2025)
 * ✅ v1.6.0: FIX - Buscar nomeTime da collection times se não fornecido/genérico
 * ✅ v1.5.0: Campos manuais preservados (histórico completo) - apenas status muda
 * ✅ v1.4.0: FIX CRÍTICO - NÃO DELETAR CACHE DO EXTRATO
 *   - Acertos são armazenados em coleção separada (AcertoFinanceiro)
 *   - São integrados no momento da consulta em getExtratoFinanceiro()
 *   - Deletar cache zerava dados históricos (Timeline, P.Corridos, MataMata, etc.)
 *   - Agora o cache é preservado após POST/PUT/DELETE de acertos
 * ✅ v1.1.0: TROCO AUTOMÁTICO - Pagamento a maior gera saldo positivo
 *   - Verifica se pagamento excede a dívida do participante
 *   - Cria automaticamente um recebimento com o troco
 *   - Registra no histórico com descrição clara
 */

import express from "express";
import mongoose from "mongoose";
import { verificarAdmin, verificarAdminOuDono } from "../middleware/auth.js";
import AcertoFinanceiro from "../models/AcertoFinanceiro.js";
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";
import Time from "../models/Time.js";
import { CURRENT_SEASON } from "../config/seasons.js";
// ✅ v1.7.0: Importar calculadora de saldo centralizada
import { calcularSaldoParticipante } from "../utils/saldo-calculator.js";
// 🔔 PUSH NOTIFICATIONS - Gatilho de acerto financeiro (FASE 5)
import { triggerAcertoFinanceiro } from "../services/notificationTriggers.js";

const router = express.Router();

// =============================================================================
// FUNÇÃO AUXILIAR: Calcular saldo total do participante
// ✅ v1.7.0: Agora usa calculadora centralizada (utils/saldo-calculator.js)
// =============================================================================

/**
 * Calcula o saldo total atual de um participante (temporada + acertos)
 * @param {string} ligaId - ID da liga
 * @param {string} timeId - ID do time
 * @param {number} temporada - Temporada (default CURRENT_SEASON)
 * @returns {Object} { saldoTemporada, saldoAcertos, saldoTotal, totalPago, totalRecebido }
 */
async function calcularSaldoTotalParticipante(ligaId, timeId, temporada = CURRENT_SEASON) {
    // ✅ v1.7.0: Usar função centralizada com recálculo para precisão
    const resultado = await calcularSaldoParticipante(ligaId, timeId, temporada, {
        recalcular: true,
    });

    // Mapear para formato esperado (saldoTotal = saldoFinal)
    return {
        saldoTemporada: resultado.saldoTemporada,
        saldoAcertos: resultado.saldoAcertos,
        saldoTotal: resultado.saldoFinal,
        totalPago: resultado.totalPago,
        totalRecebido: resultado.totalRecebido,
    };
}

// =============================================================================
// ROTAS DO PARTICIPANTE (Visualização)
// =============================================================================

/**
 * GET /api/acertos/:ligaId/:timeId
 * Retorna os acertos financeiros de um participante
 * 🔒 Admin ou dono do time
 */
router.get("/:ligaId/:timeId", verificarAdminOuDono, async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const temporada = parseInt(req.query.temporada) || CURRENT_SEASON;

        const acertos = await AcertoFinanceiro.buscarPorTime(ligaId, timeId, temporada);
        const saldoInfo = await AcertoFinanceiro.calcularSaldoAcertos(ligaId, timeId, temporada);

        res.json({
            success: true,
            acertos: acertos.map(a => ({
                _id: a._id,
                tipo: a.tipo,
                valor: a.valor,
                descricao: a.descricao,
                metodoPagamento: a.metodoPagamento,
                dataAcerto: a.dataAcerto,
                observacoes: a.observacoes,
            })),
            // ✅ v1.4 FIX: Mapear saldoAcertos para saldo (frontend espera "saldo")
            resumo: {
                totalPago: saldoInfo.totalPago,
                totalRecebido: saldoInfo.totalRecebido,
                saldo: saldoInfo.saldoAcertos, // Frontend espera "saldo"
                saldoAcertos: saldoInfo.saldoAcertos, // Manter para compatibilidade
                quantidadeAcertos: saldoInfo.quantidadeAcertos,
            },
        });
    } catch (error) {
        console.error("[ACERTOS] Erro ao buscar acertos:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/acertos/:ligaId/:timeId/saldo
 * Retorna apenas o saldo de acertos (para cálculo rápido)
 * 🔒 Admin ou dono do time
 */
router.get("/:ligaId/:timeId/saldo", verificarAdminOuDono, async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const temporada = parseInt(req.query.temporada) || CURRENT_SEASON;

        const saldoInfo = await AcertoFinanceiro.calcularSaldoAcertos(ligaId, timeId, temporada);

        res.json({
            success: true,
            ...saldoInfo,
            saldo: saldoInfo.saldoAcertos, // ✅ v1.4: Alias para compatibilidade
        });
    } catch (error) {
        console.error("[ACERTOS] Erro ao calcular saldo:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// ROTAS ADMIN (Gestão)
// =============================================================================

/**
 * GET /api/acertos/admin/:ligaId
 * Retorna todos os acertos de uma liga (visão admin)
 * 🔒 ADMIN ONLY
 */
router.get("/admin/:ligaId", verificarAdmin, async (req, res) => {
    try {
        const { ligaId } = req.params;
        const temporada = parseInt(req.query.temporada) || CURRENT_SEASON;

        const acertos = await AcertoFinanceiro.buscarPorLiga(ligaId, temporada);

        // Agrupar por time para facilitar visualização
        const porTime = {};
        acertos.forEach(a => {
            if (!porTime[a.timeId]) {
                porTime[a.timeId] = {
                    timeId: a.timeId,
                    nomeTime: a.nomeTime,
                    acertos: [],
                    totalPago: 0,
                    totalRecebido: 0,
                };
            }
            porTime[a.timeId].acertos.push(a);
            if (a.tipo === "pagamento") {
                porTime[a.timeId].totalPago += a.valor;
            } else {
                porTime[a.timeId].totalRecebido += a.valor;
            }
        });

        // Calcular saldo de cada time
        // ✅ v1.3 FIX: Usar mesma fórmula do Model (totalPago - totalRecebido)
        // PAGAMENTO = participante pagou à liga → AUMENTA saldo (quita dívida)
        // RECEBIMENTO = participante recebeu da liga → DIMINUI saldo (usa crédito)
        Object.values(porTime).forEach(time => {
            time.saldoAcertos = parseFloat((time.totalPago - time.totalRecebido).toFixed(2));
            time.totalPago = parseFloat(time.totalPago.toFixed(2));
            time.totalRecebido = parseFloat(time.totalRecebido.toFixed(2));
        });

        res.json({
            success: true,
            ligaId,
            temporada,
            totalAcertos: acertos.length,
            porTime: Object.values(porTime),
            acertos,
        });
    } catch (error) {
        console.error("[ACERTOS] Erro ao buscar acertos da liga:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/acertos/:ligaId/:timeId
 * Registra um novo acerto financeiro (admin only)
 * ✅ v2.0.0: Idempotência via janela de tempo (previne double-charging)
 * ✅ v2.0.0: Transação MongoDB no troco automático
 * ✅ v1.1.0: Troco automático quando pagamento > dívida
 */
router.post("/:ligaId/:timeId", verificarAdmin, async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const {
            nomeTime,
            tipo,
            valor,
            descricao,
            metodoPagamento,
            comprovante,
            observacoes,
            dataAcerto,
            temporada = CURRENT_SEASON,
            registradoPor = "admin",
        } = req.body;

        // Validações
        if (!tipo || !["pagamento", "recebimento"].includes(tipo)) {
            return res.status(400).json({
                success: false,
                error: "Tipo inválido. Use 'pagamento' ou 'recebimento'",
            });
        }

        if (!valor || isNaN(valor) || parseFloat(valor) <= 0) {
            return res.status(400).json({
                success: false,
                error: "Valor deve ser um número positivo",
            });
        }

        const valorPagamento = parseFloat(valor);

        // =========================================================================
        // ✅ v2.0.0: IDEMPOTÊNCIA - Prevenir double-charging
        // Verifica se já existe acerto idêntico nos últimos 60 segundos
        // =========================================================================
        const janelaIdempotencia = new Date(Date.now() - 60 * 1000); // 60 segundos
        const acertoDuplicado = await AcertoFinanceiro.findOne({
            ligaId,
            timeId,
            temporada: Number(temporada),
            tipo,
            valor: valorPagamento,
            ativo: true,
            createdAt: { $gte: janelaIdempotencia },
        }).lean();

        if (acertoDuplicado) {
            console.warn(`[ACERTOS] ⚠️ Acerto duplicado detectado para time ${timeId} (idempotência)`);
            return res.status(409).json({
                success: false,
                error: "Acerto duplicado detectado. Um acerto idêntico foi registrado há menos de 60 segundos.",
                acertoExistente: acertoDuplicado._id,
            });
        }

        // ✅ v1.6.0 FIX: Buscar nome real do time se não fornecido ou genérico
        let nomeTimeFinal = nomeTime;
        const nomesGenericos = ['Participante', 'Time sem nome', '', null, undefined];

        if (nomesGenericos.includes(nomeTime) || !nomeTime?.trim()) {
            // Buscar da collection times
            const time = await Time.findOne({ id: parseInt(timeId) }).lean();
            if (time?.nome_time) {
                nomeTimeFinal = time.nome_time;
                console.log(`[ACERTOS] Nome obtido da collection times: ${nomeTimeFinal}`);
            } else {
                // Fallback: usar timeId
                nomeTimeFinal = `Time ${timeId}`;
                console.warn(`[ACERTOS] Time ${timeId} não encontrado na collection times`);
            }
        }

        const dataAcertoFinal = dataAcerto ? new Date(dataAcerto) : new Date();
        let acertoTroco = null;
        let valorTroco = 0;

        // =========================================================================
        // ✅ v1.1.0: VERIFICAR TROCO EM PAGAMENTOS
        // Se é um pagamento e excede a dívida, gerar troco automático
        // =========================================================================
        if (tipo === "pagamento") {
            // Calcular saldo ANTES do novo pagamento
            const saldoAntes = await calcularSaldoTotalParticipante(ligaId, timeId, temporada);

            // Dívida atual = valor absoluto do saldo negativo (se existir)
            const dividaAtual = saldoAntes.saldoTotal < 0 ? Math.abs(saldoAntes.saldoTotal) : 0;

            console.log(`[ACERTOS] Verificando troco para ${nomeTimeFinal}:`);
            console.log(`  - Saldo antes: R$ ${saldoAntes.saldoTotal.toFixed(2)}`);
            console.log(`  - Dívida atual: R$ ${dividaAtual.toFixed(2)}`);
            console.log(`  - Pagamento: R$ ${valorPagamento.toFixed(2)}`);

            // Se há dívida e o pagamento excede a dívida
            if (dividaAtual > 0 && valorPagamento > dividaAtual) {
                valorTroco = parseFloat((valorPagamento - dividaAtual).toFixed(2));
                console.log(`[ACERTOS] ✅ TROCO DETECTADO: R$ ${valorTroco.toFixed(2)}`);
            }
        }

        // =========================================================================
        // ✅ v2.0.0: TRANSAÇÃO MongoDB - Salvar acerto + troco atomicamente
        // Previne race condition onde acerto salva mas troco falha (ou vice-versa)
        // =========================================================================
        const session = await mongoose.startSession();
        let novoAcerto;

        try {
            await session.withTransaction(async () => {
                // Salvar acerto principal
                novoAcerto = new AcertoFinanceiro({
                    ligaId,
                    timeId,
                    nomeTime: nomeTimeFinal,
                    temporada,
                    tipo,
                    valor: valorPagamento,
                    descricao: descricao || `Acerto financeiro - ${tipo}`,
                    metodoPagamento: metodoPagamento || "pix",
                    comprovante: comprovante || null,
                    observacoes: observacoes || null,
                    dataAcerto: dataAcertoFinal,
                    registradoPor,
                });

                await novoAcerto.save({ session });

                // Salvar troco se existir
                if (valorTroco > 0) {
                    acertoTroco = new AcertoFinanceiro({
                        ligaId,
                        timeId,
                        nomeTime: nomeTimeFinal,
                        temporada,
                        tipo: "recebimento",
                        valor: valorTroco,
                        descricao: `TROCO - Pagamento a maior (Dívida: R$ ${(valorPagamento - valorTroco).toFixed(2)})`,
                        metodoPagamento: metodoPagamento || "pix",
                        comprovante: null,
                        observacoes: `Gerado automaticamente. Pagamento original: R$ ${valorPagamento.toFixed(2)} - ${descricao || "Acerto financeiro"}`,
                        dataAcerto: dataAcertoFinal,
                        registradoPor: "sistema_troco",
                    });

                    await acertoTroco.save({ session });
                    console.log(`[ACERTOS] ✅ Troco de R$ ${valorTroco.toFixed(2)} salvo para ${nomeTimeFinal}`);
                }
            });
        } finally {
            await session.endSession();
        }

        // =========================================================================
        // 🔔 PUSH NOTIFICATION - Gatilho de acerto financeiro (FASE 5)
        // Executar em background para nao atrasar resposta
        // =========================================================================
        setImmediate(async () => {
            try {
                await triggerAcertoFinanceiro(timeId, {
                    tipo,
                    valor: valorPagamento,
                    descricao: descricao || `Acerto financeiro - ${tipo}`
                });
            } catch (notifError) {
                console.error(`[ACERTOS] ⚠️ Erro ao enviar notificacao:`, notifError.message);
                // Nao falha o registro por erro de notificacao
            }
        });

        // =========================================================================
        // ✅ v1.4.0: NÃO DELETAR CACHE DO EXTRATO
        // Acertos são armazenados em coleção separada (AcertoFinanceiro) e são
        // integrados no momento da consulta em getExtratoFinanceiro().
        // Deletar o cache zerava todos os dados históricos (Timeline, P.Corridos, etc.)
        // =========================================================================
        // Cache do extrato NÃO precisa ser invalidado - acertos são calculados separadamente
        console.log(`[ACERTOS] ✅ Acerto registrado para time ${timeId} (cache preservado)`);

        // Calcular novo saldo (já incluindo o troco se houver)
        const saldoInfo = await AcertoFinanceiro.calcularSaldoAcertos(ligaId, timeId, temporada);

        // =========================================================================
        // ✅ v1.5.0: Campos manuais NÃO são zerados (mantém histórico completo)
        // O status (Quitado/Devedor/Credor) é calculado pelo saldo final
        // que considera: temporada + campos + acertos
        // =========================================================================

        // Montar resposta
        const response = {
            success: true,
            message: acertoTroco
                ? `Pagamento de R$ ${valorPagamento.toFixed(2)} registrado. TROCO de R$ ${valorTroco.toFixed(2)} creditado!`
                : `Acerto de R$ ${valorPagamento.toFixed(2)} registrado com sucesso`,
            acerto: novoAcerto,
            novoSaldo: saldoInfo,
        };

        // Adicionar info de troco se existir
        if (acertoTroco) {
            response.troco = {
                valor: valorTroco,
                acerto: acertoTroco,
                mensagem: `Pagamento excedeu a dívida. R$ ${valorTroco.toFixed(2)} foram creditados como saldo positivo.`,
            };
        }

        res.status(201).json(response);
    } catch (error) {
        console.error("[ACERTOS] Erro ao registrar acerto:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/acertos/:id
 * Atualiza um acerto existente (admin only)
 */
router.put("/:id", verificarAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Campos permitidos para atualização
        const camposPermitidos = [
            "tipo",
            "valor",
            "descricao",
            "metodoPagamento",
            "comprovante",
            "observacoes",
            "dataAcerto",
        ];

        const updateObj = {};
        camposPermitidos.forEach(campo => {
            if (updates[campo] !== undefined) {
                updateObj[campo] = updates[campo];
            }
        });

        if (updateObj.valor) {
            updateObj.valor = parseFloat(updateObj.valor);
        }
        if (updateObj.dataAcerto) {
            updateObj.dataAcerto = new Date(updateObj.dataAcerto);
        }

        const acertoAtualizado = await AcertoFinanceiro.findByIdAndUpdate(
            id,
            { $set: updateObj },
            { new: true },
        );

        if (!acertoAtualizado) {
            return res.status(404).json({
                success: false,
                error: "Acerto não encontrado",
            });
        }

        // ✅ v1.4.0: NÃO deletar cache - acertos são calculados separadamente
        console.log(`[ACERTOS] ✅ Acerto atualizado (cache preservado)`);

        // Calcular novo saldo
        const saldoInfo = await AcertoFinanceiro.calcularSaldoAcertos(
            acertoAtualizado.ligaId,
            acertoAtualizado.timeId,
            acertoAtualizado.temporada,
        );

        res.json({
            success: true,
            message: "Acerto atualizado com sucesso",
            acerto: acertoAtualizado,
            novoSaldo: saldoInfo,
        });
    } catch (error) {
        console.error("[ACERTOS] Erro ao atualizar acerto:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/acertos/:id
 * Remove um acerto (soft delete - mantém histórico)
 * ✅ v2.0.0: Removido hard delete por segurança - apenas soft delete
 */
router.delete("/:id", verificarAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const acerto = await AcertoFinanceiro.findById(id);

        if (!acerto) {
            return res.status(404).json({
                success: false,
                error: "Acerto não encontrado",
            });
        }

        // Soft delete (marca como inativo - mantém histórico para auditoria)
        acerto.ativo = false;
        await acerto.save();

        console.log(`[ACERTOS] ✅ Acerto ${id} desativado (soft delete, cache preservado)`);

        // Calcular novo saldo
        const saldoInfo = await AcertoFinanceiro.calcularSaldoAcertos(
            acerto.ligaId,
            acerto.timeId,
            acerto.temporada,
        );

        res.json({
            success: true,
            message: "Acerto desativado com sucesso",
            novoSaldo: saldoInfo,
        });
    } catch (error) {
        console.error("[ACERTOS] Erro ao remover acerto:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/acertos/admin/:ligaId/resumo
 * Retorna resumo financeiro de todos os participantes da liga
 * 🔒 ADMIN ONLY
 */
router.get("/admin/:ligaId/resumo", verificarAdmin, async (req, res) => {
    try {
        const { ligaId } = req.params;
        const temporada = parseInt(req.query.temporada) || CURRENT_SEASON;

        const acertos = await AcertoFinanceiro.aggregate([
            {
                $match: {
                    ligaId,
                    temporada,
                    ativo: true,
                },
            },
            {
                $group: {
                    _id: "$timeId",
                    nomeTime: { $first: "$nomeTime" },
                    totalPago: {
                        $sum: {
                            $cond: [{ $eq: ["$tipo", "pagamento"] }, "$valor", 0],
                        },
                    },
                    totalRecebido: {
                        $sum: {
                            $cond: [{ $eq: ["$tipo", "recebimento"] }, "$valor", 0],
                        },
                    },
                    quantidadeAcertos: { $sum: 1 },
                    ultimoAcerto: { $max: "$dataAcerto" },
                },
            },
            {
                // ✅ v1.3 FIX: Usar mesma fórmula do Model (totalPago - totalRecebido)
                $project: {
                    _id: 0,
                    timeId: "$_id",
                    nomeTime: 1,
                    totalPago: { $round: ["$totalPago", 2] },
                    totalRecebido: { $round: ["$totalRecebido", 2] },
                    saldoAcertos: {
                        $round: [{ $subtract: ["$totalPago", "$totalRecebido"] }, 2],
                    },
                    quantidadeAcertos: 1,
                    ultimoAcerto: 1,
                },
            },
            { $sort: { nomeTime: 1 } },
        ]);

        const totais = acertos.reduce(
            (acc, t) => {
                acc.totalPago += t.totalPago;
                acc.totalRecebido += t.totalRecebido;
                acc.totalAcertos += t.quantidadeAcertos;
                return acc;
            },
            { totalPago: 0, totalRecebido: 0, totalAcertos: 0 },
        );

        res.json({
            success: true,
            ligaId,
            temporada,
            times: acertos,
            totais: {
                totalPago: parseFloat(totais.totalPago.toFixed(2)),
                totalRecebido: parseFloat(totais.totalRecebido.toFixed(2)),
                // ✅ v1.3 FIX: Usar mesma fórmula do Model (totalPago - totalRecebido)
                saldoGeral: parseFloat((totais.totalPago - totais.totalRecebido).toFixed(2)),
                totalAcertos: totais.totalAcertos,
                timesComAcertos: acertos.length,
            },
        });
    } catch (error) {
        console.error("[ACERTOS] Erro ao gerar resumo:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
