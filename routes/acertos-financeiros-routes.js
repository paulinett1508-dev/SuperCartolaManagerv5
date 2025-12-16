/**
 * ROTAS DE ACERTOS FINANCEIROS - Temporada 2025+
 *
 * Endpoints para registrar pagamentos e recebimentos
 * entre participantes e administração (em tempo real).
 *
 * @version 1.1.0
 * ✅ v1.1.0: TROCO AUTOMÁTICO - Pagamento a maior gera saldo positivo
 *   - Verifica se pagamento excede a dívida do participante
 *   - Cria automaticamente um recebimento com o troco
 *   - Registra no histórico com descrição clara
 */

import express from "express";
import AcertoFinanceiro from "../models/AcertoFinanceiro.js";
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";

const router = express.Router();

// =============================================================================
// FUNÇÃO AUXILIAR: Calcular saldo total do participante
// =============================================================================

/**
 * Calcula o saldo total atual de um participante (temporada + acertos)
 * @param {string} ligaId - ID da liga
 * @param {string} timeId - ID do time
 * @param {string} temporada - Temporada (default "2025")
 * @returns {Object} { saldoTemporada, saldoAcertos, saldoTotal }
 */
async function calcularSaldoTotalParticipante(ligaId, timeId, temporada = "2025") {
    // 1. Buscar saldo consolidado da temporada (do cache)
    const cache = await ExtratoFinanceiroCache.findOne({ ligaId, timeId });
    const saldoConsolidado = cache?.saldo_consolidado || 0;

    // 2. Buscar campos manuais
    const camposManuais = await FluxoFinanceiroCampos.findOne({ ligaId, timeId });
    let saldoCampos = 0;
    if (camposManuais?.campos) {
        camposManuais.campos.forEach(campo => {
            saldoCampos += campo.valor || 0;
        });
    }

    // 3. Saldo da temporada = consolidado + campos manuais
    const saldoTemporada = saldoConsolidado + saldoCampos;

    // 4. Buscar saldo de acertos existentes
    const acertosInfo = await AcertoFinanceiro.calcularSaldoAcertos(ligaId, timeId, temporada);

    // 5. Saldo total = temporada + acertos
    // Nota: saldoAcertos = totalRecebido - totalPago
    // Se participante PAGOU, saldoAcertos fica negativo (ele "gastou")
    // Se participante RECEBEU, saldoAcertos fica positivo (ele "ganhou")
    const saldoTotal = saldoTemporada + acertosInfo.saldoAcertos;

    return {
        saldoTemporada: parseFloat(saldoTemporada.toFixed(2)),
        saldoAcertos: acertosInfo.saldoAcertos,
        saldoTotal: parseFloat(saldoTotal.toFixed(2)),
        totalPago: acertosInfo.totalPago,
        totalRecebido: acertosInfo.totalRecebido,
    };
}

// =============================================================================
// ROTAS DO PARTICIPANTE (Visualização)
// =============================================================================

/**
 * GET /api/acertos/:ligaId/:timeId
 * Retorna os acertos financeiros de um participante
 */
router.get("/:ligaId/:timeId", async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { temporada = "2025" } = req.query;

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
            resumo: saldoInfo,
        });
    } catch (error) {
        console.error("[ACERTOS] Erro ao buscar acertos:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/acertos/:ligaId/:timeId/saldo
 * Retorna apenas o saldo de acertos (para cálculo rápido)
 */
router.get("/:ligaId/:timeId/saldo", async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { temporada = "2025" } = req.query;

        const saldoInfo = await AcertoFinanceiro.calcularSaldoAcertos(ligaId, timeId, temporada);

        res.json({
            success: true,
            ...saldoInfo,
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
 */
router.get("/admin/:ligaId", async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { temporada = "2025" } = req.query;

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
        Object.values(porTime).forEach(time => {
            time.saldoAcertos = parseFloat((time.totalRecebido - time.totalPago).toFixed(2));
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
 * ✅ v1.1.0: Troco automático quando pagamento > dívida
 */
router.post("/:ligaId/:timeId", async (req, res) => {
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
            temporada = "2025",
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

        if (!nomeTime) {
            return res.status(400).json({
                success: false,
                error: "Nome do time é obrigatório",
            });
        }

        const valorPagamento = parseFloat(valor);
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
            // Se saldo é -100, dívida = 100
            // Se saldo é +50 (credor), dívida = 0
            const dividaAtual = saldoAntes.saldoTotal < 0 ? Math.abs(saldoAntes.saldoTotal) : 0;

            console.log(`[ACERTOS] Verificando troco para ${nomeTime}:`);
            console.log(`  - Saldo antes: R$ ${saldoAntes.saldoTotal.toFixed(2)}`);
            console.log(`  - Dívida atual: R$ ${dividaAtual.toFixed(2)}`);
            console.log(`  - Pagamento: R$ ${valorPagamento.toFixed(2)}`);

            // Se há dívida e o pagamento excede a dívida
            if (dividaAtual > 0 && valorPagamento > dividaAtual) {
                valorTroco = parseFloat((valorPagamento - dividaAtual).toFixed(2));

                console.log(`[ACERTOS] ✅ TROCO DETECTADO: R$ ${valorTroco.toFixed(2)}`);

                // Criar registro de troco como RECEBIMENTO (saldo positivo)
                acertoTroco = new AcertoFinanceiro({
                    ligaId,
                    timeId,
                    nomeTime,
                    temporada,
                    tipo: "recebimento",
                    valor: valorTroco,
                    descricao: `TROCO - Pagamento a maior (Dívida: R$ ${dividaAtual.toFixed(2)})`,
                    metodoPagamento: metodoPagamento || "pix",
                    comprovante: null,
                    observacoes: `Gerado automaticamente. Pagamento original: R$ ${valorPagamento.toFixed(2)} - ${descricao || "Acerto financeiro"}`,
                    dataAcerto: dataAcertoFinal,
                    registradoPor: "sistema_troco",
                });
            }
        }

        // Salvar o acerto principal
        const novoAcerto = new AcertoFinanceiro({
            ligaId,
            timeId,
            nomeTime,
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

        await novoAcerto.save();

        // Salvar troco se existir
        if (acertoTroco) {
            await acertoTroco.save();
            console.log(`[ACERTOS] ✅ Troco de R$ ${valorTroco.toFixed(2)} salvo para ${nomeTime}`);
        }

        // Calcular novo saldo (já incluindo o troco se houver)
        const saldoInfo = await AcertoFinanceiro.calcularSaldoAcertos(ligaId, timeId, temporada);

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
router.put("/:id", async (req, res) => {
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
 */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { hardDelete = false } = req.query;

        const acerto = await AcertoFinanceiro.findById(id);

        if (!acerto) {
            return res.status(404).json({
                success: false,
                error: "Acerto não encontrado",
            });
        }

        if (hardDelete === "true") {
            // Hard delete (remove definitivamente)
            await AcertoFinanceiro.findByIdAndDelete(id);
        } else {
            // Soft delete (marca como inativo)
            acerto.ativo = false;
            await acerto.save();
        }

        // Calcular novo saldo
        const saldoInfo = await AcertoFinanceiro.calcularSaldoAcertos(
            acerto.ligaId,
            acerto.timeId,
            acerto.temporada,
        );

        res.json({
            success: true,
            message: hardDelete === "true" ? "Acerto removido permanentemente" : "Acerto desativado",
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
 */
router.get("/admin/:ligaId/resumo", async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { temporada = "2025" } = req.query;

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
                $project: {
                    _id: 0,
                    timeId: "$_id",
                    nomeTime: 1,
                    totalPago: { $round: ["$totalPago", 2] },
                    totalRecebido: { $round: ["$totalRecebido", 2] },
                    saldoAcertos: {
                        $round: [{ $subtract: ["$totalRecebido", "$totalPago"] }, 2],
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
                saldoGeral: parseFloat((totais.totalRecebido - totais.totalPago).toFixed(2)),
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
