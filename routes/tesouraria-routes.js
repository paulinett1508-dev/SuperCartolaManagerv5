/**
 * ROTAS DE TESOURARIA - Gestão Financeira Centralizada
 *
 * Painel para gerenciar saldos de TODOS os participantes de TODAS as ligas.
 * Permite visualizar, filtrar e realizar acertos financeiros.
 *
 * @version 1.0.0
 */

import express from "express";
import mongoose from "mongoose";
import Liga from "../models/Liga.js";
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";
import AcertoFinanceiro from "../models/AcertoFinanceiro.js";
import { CURRENT_SEASON } from "../config/seasons.js";

const router = express.Router();

// =============================================================================
// FUNÇÃO AUXILIAR: Calcular saldo completo de um participante
// =============================================================================

async function calcularSaldoCompleto(ligaId, timeId, temporada = CURRENT_SEASON) {
    // 1. Saldo consolidado da temporada (cache)
    const cache = await ExtratoFinanceiroCache.findOne({
        liga_id: String(ligaId),
        time_id: timeId,
    });
    const saldoConsolidado = cache?.saldo_consolidado || 0;

    // 2. Campos manuais
    const camposManuais = await FluxoFinanceiroCampos.findOne({
        ligaId: String(ligaId),
        timeId: String(timeId),
    });
    let saldoCampos = 0;
    if (camposManuais?.campos) {
        camposManuais.campos.forEach(campo => {
            saldoCampos += campo.valor || 0;
        });
    }

    // 3. Saldo da temporada
    const saldoTemporada = saldoConsolidado + saldoCampos;

    // 4. Saldo de acertos
    const acertosInfo = await AcertoFinanceiro.calcularSaldoAcertos(
        String(ligaId),
        String(timeId),
        String(temporada)
    );

    // 5. Saldo final
    const saldoFinal = saldoTemporada + acertosInfo.saldoAcertos;

    return {
        saldoConsolidado: parseFloat(saldoConsolidado.toFixed(2)),
        saldoCampos: parseFloat(saldoCampos.toFixed(2)),
        saldoTemporada: parseFloat(saldoTemporada.toFixed(2)),
        saldoAcertos: acertosInfo.saldoAcertos,
        totalPago: acertosInfo.totalPago,
        totalRecebido: acertosInfo.totalRecebido,
        saldoFinal: parseFloat(saldoFinal.toFixed(2)),
        quantidadeAcertos: acertosInfo.quantidadeAcertos,
    };
}

// =============================================================================
// GET /api/tesouraria/participantes
// Retorna TODOS os participantes de TODAS as ligas com saldos
// ✅ v2.0: Inclui breakdown por módulo financeiro e módulos ativos por liga
// =============================================================================

router.get("/participantes", async (req, res) => {
    try {
        const { temporada = CURRENT_SEASON } = req.query;
        const startTime = Date.now();

        console.log(`[TESOURARIA] Buscando participantes - Temporada ${temporada}`);

        // Buscar todas as ligas ativas
        const ligas = await Liga.find({ ativo: { $ne: false } }).lean();

        if (!ligas || ligas.length === 0) {
            return res.json({
                success: true,
                participantes: [],
                totais: { credores: 0, devedores: 0, quitados: 0, total: 0 },
            });
        }

        // ✅ v2.0: Coletar todos os timeIds para bulk queries
        const allTimeIds = [];
        const ligaMap = new Map();

        for (const liga of ligas) {
            const ligaId = liga._id.toString();
            ligaMap.set(ligaId, liga);
            for (const p of liga.participantes || []) {
                allTimeIds.push(p.time_id);
            }
        }

        // ✅ v2.0: Bulk queries para todos os dados
        const [todosExtratos, todosCampos, todosAcertos] = await Promise.all([
            ExtratoFinanceiroCache.find({ time_id: { $in: allTimeIds } }).lean(),
            FluxoFinanceiroCampos.find({ timeId: { $in: allTimeIds.map(String) } }).lean(),
            AcertoFinanceiro.find({ temporada: String(temporada) }).lean()
        ]);

        // Criar mapas para acesso O(1) - chave composta liga_time
        const extratoMap = new Map();
        todosExtratos.forEach(e => {
            const key = `${e.liga_id}_${e.time_id}`;
            extratoMap.set(key, e);
        });

        const camposMap = new Map();
        todosCampos.forEach(c => {
            const key = `${c.ligaId}_${c.timeId}`;
            camposMap.set(key, c);
        });

        // Agrupar acertos por liga_time
        const acertosMap = new Map();
        todosAcertos.forEach(a => {
            const key = `${a.ligaId}_${a.timeId}`;
            if (!acertosMap.has(key)) acertosMap.set(key, []);
            acertosMap.get(key).push(a);
        });

        const participantes = [];
        let totalCredores = 0;
        let totalDevedores = 0;
        let quantidadeCredores = 0;
        let quantidadeDevedores = 0;
        let quantidadeQuitados = 0;

        // Processar cada liga
        for (const liga of ligas) {
            const ligaId = liga._id.toString();
            const ligaNome = liga.nome || "Liga sem nome";

            // ✅ v2.0: Extrair módulos ativos desta liga
            const modulosAtivos = {
                banco: liga.modulos_ativos?.banco !== false,
                pontosCorridos: liga.modulos_ativos?.pontosCorridos === true || liga.configuracoes?.pontos_corridos?.habilitado === true,
                mataMata: liga.modulos_ativos?.mataMata === true || liga.configuracoes?.mata_mata?.habilitado === true,
                top10: liga.modulos_ativos?.top10 !== false || liga.configuracoes?.top10?.habilitado !== false,
                melhorMes: liga.modulos_ativos?.melhorMes === true || liga.configuracoes?.melhor_mes?.habilitado === true,
                artilheiro: liga.modulos_ativos?.artilheiro === true || liga.configuracoes?.artilheiro?.habilitado === true,
                luvaOuro: liga.modulos_ativos?.luvaOuro === true || liga.configuracoes?.luva_ouro?.habilitado === true,
            };

            // Processar cada participante da liga
            for (const participante of liga.participantes || []) {
                const timeId = String(participante.time_id);
                const nomeTime = participante.nome_time || "Time sem nome";
                const nomeCartola = participante.nome_cartola || "";
                const escudo = participante.escudo_url || participante.escudo || null;
                const ativo = participante.ativo !== false;

                const key = `${ligaId}_${timeId}`;

                // Buscar dados do cache
                const extrato = extratoMap.get(key);
                const saldoConsolidado = extrato?.saldo_consolidado || 0;

                // ✅ v2.0: Calcular breakdown por módulo
                const historico = extrato?.historico_transacoes || [];
                const breakdown = {
                    banco: 0,
                    pontosCorridos: 0,
                    mataMata: 0,
                    top10: 0,
                    melhorMes: 0,
                    artilheiro: 0,
                    luvaOuro: 0,
                };

                historico.forEach(t => {
                    if (t.bonusOnus !== undefined) breakdown.banco += t.bonusOnus || 0;
                    if (t.pontosCorridos !== undefined) breakdown.pontosCorridos += t.pontosCorridos || 0;
                    if (t.mataMata !== undefined) breakdown.mataMata += t.mataMata || 0;
                    if (t.top10 !== undefined) breakdown.top10 += t.top10 || 0;

                    // Formato legado
                    if (t.tipo === 'BONUS' || t.tipo === 'ONUS') breakdown.banco += t.valor || 0;
                    else if (t.tipo === 'PONTOS_CORRIDOS') breakdown.pontosCorridos += t.valor || 0;
                    else if (t.tipo === 'MATA_MATA') breakdown.mataMata += t.valor || 0;
                    else if (t.tipo === 'MITO' || t.tipo === 'MICO') breakdown.top10 += t.valor || 0;
                    else if (t.tipo === 'MELHOR_MES') breakdown.melhorMes += t.valor || 0;
                    else if (t.tipo === 'ARTILHEIRO') breakdown.artilheiro += t.valor || 0;
                    else if (t.tipo === 'LUVA_OURO') breakdown.luvaOuro += t.valor || 0;
                });

                // Campos manuais
                const camposDoc = camposMap.get(key);
                let saldoCampos = 0;
                if (camposDoc?.campos) {
                    camposDoc.campos.forEach(c => saldoCampos += c.valor || 0);
                }
                breakdown.campos = parseFloat(saldoCampos.toFixed(2));

                // Calcular saldo de acertos
                const acertosList = acertosMap.get(key) || [];
                let totalPago = 0;
                let totalRecebido = 0;
                acertosList.forEach(a => {
                    if (a.tipo === 'pagamento') totalPago += a.valor || 0;
                    else if (a.tipo === 'recebimento') totalRecebido += a.valor || 0;
                });
                // ✅ v1.1.0 FIX: Usar mesma fórmula do Model (totalPago - totalRecebido)
                // PAGAMENTO = participante pagou à liga → AUMENTA saldo (quita dívida)
                // RECEBIMENTO = participante recebeu da liga → DIMINUI saldo (usa crédito)
                const saldoAcertos = totalPago - totalRecebido;

                // Calcular saldos finais
                const saldoTemporada = saldoConsolidado + saldoCampos;
                const saldoFinal = saldoTemporada + saldoAcertos;

                // Classificar situação financeira
                let situacao = "quitado";
                if (saldoFinal > 0.01) {
                    situacao = "credor";
                    totalCredores += saldoFinal;
                    quantidadeCredores++;
                } else if (saldoFinal < -0.01) {
                    situacao = "devedor";
                    totalDevedores += Math.abs(saldoFinal);
                    quantidadeDevedores++;
                } else {
                    quantidadeQuitados++;
                }

                participantes.push({
                    ligaId,
                    ligaNome,
                    timeId,
                    nomeTime,
                    nomeCartola,
                    escudo,
                    ativo,
                    temporada,
                    saldoTemporada: parseFloat(saldoTemporada.toFixed(2)),
                    saldoAcertos: parseFloat(saldoAcertos.toFixed(2)),
                    totalPago: parseFloat(totalPago.toFixed(2)),
                    totalRecebido: parseFloat(totalRecebido.toFixed(2)),
                    saldoFinal: parseFloat(saldoFinal.toFixed(2)),
                    situacao,
                    quantidadeAcertos: acertosList.length,
                    // ✅ v2.0: Breakdown e módulos ativos
                    breakdown: {
                        banco: parseFloat(breakdown.banco.toFixed(2)),
                        pontosCorridos: parseFloat(breakdown.pontosCorridos.toFixed(2)),
                        mataMata: parseFloat(breakdown.mataMata.toFixed(2)),
                        top10: parseFloat(breakdown.top10.toFixed(2)),
                        melhorMes: parseFloat(breakdown.melhorMes.toFixed(2)),
                        artilheiro: parseFloat(breakdown.artilheiro.toFixed(2)),
                        luvaOuro: parseFloat(breakdown.luvaOuro.toFixed(2)),
                        campos: breakdown.campos,
                    },
                    modulosAtivos,
                });
            }
        }

        // Ordenar por saldo (devedores primeiro, depois credores)
        participantes.sort((a, b) => a.saldoFinal - b.saldoFinal);

        const elapsed = Date.now() - startTime;
        console.log(`[TESOURARIA] ✅ ${participantes.length} participantes em ${elapsed}ms`);

        res.json({
            success: true,
            temporada,
            participantes,
            totais: {
                totalParticipantes: participantes.length,
                quantidadeCredores,
                quantidadeDevedores,
                quantidadeQuitados,
                totalAReceber: parseFloat(totalDevedores.toFixed(2)),
                totalAPagar: parseFloat(totalCredores.toFixed(2)),
                saldoGeral: parseFloat((totalDevedores - totalCredores).toFixed(2)),
            },
        });
    } catch (error) {
        console.error("[TESOURARIA] Erro ao buscar participantes:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// GET /api/tesouraria/liga/:ligaId
// Retorna participantes de UMA LIGA específica com saldos (para módulo Fluxo Financeiro)
// ✅ OTIMIZADO: Usa bulk queries em vez de queries individuais por participante
// =============================================================================

router.get("/liga/:ligaId", async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { temporada = CURRENT_SEASON } = req.query;
        const startTime = Date.now();

        console.log(`[TESOURARIA] Buscando participantes da liga ${ligaId}`);

        const liga = await Liga.findById(ligaId).lean();
        if (!liga) {
            return res.status(404).json({ success: false, error: "Liga não encontrada" });
        }

        const timeIds = (liga.participantes || []).map(p => p.time_id);

        // ✅ BULK QUERIES - Buscar todos os dados de uma vez (4 queries em vez de ~96)
        const objectIdLiga = new mongoose.Types.ObjectId(ligaId);

        const [todosExtratos, todosCampos, todosAcertos] = await Promise.all([
            // 1. Todos os extratos da liga (liga_id é ObjectId no schema)
            ExtratoFinanceiroCache.find({
                liga_id: objectIdLiga,
                time_id: { $in: timeIds }
            }).lean(),

            // 2. Todos os campos manuais da liga
            FluxoFinanceiroCampos.find({
                ligaId: String(ligaId),
                timeId: { $in: timeIds.map(String) }
            }).lean(),

            // 3. Todos os acertos da liga na temporada
            AcertoFinanceiro.find({
                ligaId: String(ligaId),
                temporada: String(temporada)
            }).lean()
        ]);

        // Criar mapas para acesso O(1)
        const extratoMap = new Map();
        todosExtratos.forEach(e => extratoMap.set(String(e.time_id), e));

        const camposMap = new Map();
        todosCampos.forEach(c => camposMap.set(String(c.timeId), c));

        // Agrupar acertos por timeId
        const acertosMap = new Map();
        todosAcertos.forEach(a => {
            const key = String(a.timeId);
            if (!acertosMap.has(key)) acertosMap.set(key, []);
            acertosMap.get(key).push(a);
        });

        console.log(`[TESOURARIA] Bulk queries: ${todosExtratos.length} extratos, ${todosCampos.length} campos, ${todosAcertos.length} acertos`);

        // ✅ v2.0: Extrair módulos ativos da liga para enviar ao frontend
        const modulosAtivos = {
            banco: liga.modulos_ativos?.banco !== false,
            pontosCorridos: liga.modulos_ativos?.pontosCorridos === true || liga.configuracoes?.pontos_corridos?.habilitado === true,
            mataMata: liga.modulos_ativos?.mataMata === true || liga.configuracoes?.mata_mata?.habilitado === true,
            top10: liga.modulos_ativos?.top10 !== false || liga.configuracoes?.top10?.habilitado !== false,
            melhorMes: liga.modulos_ativos?.melhorMes === true || liga.configuracoes?.melhor_mes?.habilitado === true,
            artilheiro: liga.modulos_ativos?.artilheiro === true || liga.configuracoes?.artilheiro?.habilitado === true,
            luvaOuro: liga.modulos_ativos?.luvaOuro === true || liga.configuracoes?.luva_ouro?.habilitado === true,
        };

        // Processar participantes em memória (sem queries adicionais)
        const participantes = [];
        let totalCredores = 0;
        let totalDevedores = 0;
        let quantidadeCredores = 0;
        let quantidadeDevedores = 0;
        let quantidadeQuitados = 0;

        for (const participante of liga.participantes || []) {
            const timeId = String(participante.time_id);

            // Calcular saldo do extrato
            const extrato = extratoMap.get(timeId);
            const saldoConsolidado = extrato?.saldo_consolidado || 0;

            // ✅ v2.0: Calcular breakdown por módulo (baseado no histórico de transações)
            const historico = extrato?.historico_transacoes || [];
            const breakdown = {
                banco: 0,        // BONUS + ONUS
                pontosCorridos: 0,
                mataMata: 0,
                top10: 0,        // MITO + MICO
                melhorMes: 0,
                artilheiro: 0,
                luvaOuro: 0,
            };

            historico.forEach(t => {
                // Formato novo (campos diretos)
                if (t.bonusOnus !== undefined) breakdown.banco += t.bonusOnus || 0;
                if (t.pontosCorridos !== undefined) breakdown.pontosCorridos += t.pontosCorridos || 0;
                if (t.mataMata !== undefined) breakdown.mataMata += t.mataMata || 0;
                if (t.top10 !== undefined) breakdown.top10 += t.top10 || 0;

                // Formato legado (tipo de transação)
                if (t.tipo === 'BONUS' || t.tipo === 'ONUS') {
                    breakdown.banco += t.valor || 0;
                } else if (t.tipo === 'PONTOS_CORRIDOS') {
                    breakdown.pontosCorridos += t.valor || 0;
                } else if (t.tipo === 'MATA_MATA') {
                    breakdown.mataMata += t.valor || 0;
                } else if (t.tipo === 'MITO' || t.tipo === 'MICO') {
                    breakdown.top10 += t.valor || 0;
                } else if (t.tipo === 'MELHOR_MES') {
                    breakdown.melhorMes += t.valor || 0;
                } else if (t.tipo === 'ARTILHEIRO') {
                    breakdown.artilheiro += t.valor || 0;
                } else if (t.tipo === 'LUVA_OURO') {
                    breakdown.luvaOuro += t.valor || 0;
                }
            });

            // Calcular saldo dos campos manuais
            const camposDoc = camposMap.get(timeId);
            let saldoCampos = 0;
            if (camposDoc?.campos) {
                camposDoc.campos.forEach(c => saldoCampos += c.valor || 0);
            }

            // Calcular saldo dos acertos
            const acertosList = acertosMap.get(timeId) || [];
            let totalPago = 0;
            let totalRecebido = 0;
            acertosList.forEach(a => {
                if (a.tipo === 'pagamento') totalPago += a.valor || 0;
                else if (a.tipo === 'recebimento') totalRecebido += a.valor || 0;
            });
            // ✅ v1.1.0 FIX: Usar mesma fórmula do Model (totalPago - totalRecebido)
            // PAGAMENTO = participante pagou à liga → AUMENTA saldo (quita dívida)
            // RECEBIMENTO = participante recebeu da liga → DIMINUI saldo (usa crédito)
            const saldoAcertos = totalPago - totalRecebido;

            // Calcular saldos finais
            const saldoTemporada = saldoConsolidado + saldoCampos;
            const saldoFinal = saldoTemporada + saldoAcertos;

            // Classificar situação
            let situacao = "quitado";
            if (saldoFinal > 0.01) {
                situacao = "credor";
                totalCredores += saldoFinal;
                quantidadeCredores++;
            } else if (saldoFinal < -0.01) {
                situacao = "devedor";
                totalDevedores += Math.abs(saldoFinal);
                quantidadeDevedores++;
            } else {
                quantidadeQuitados++;
            }

            participantes.push({
                timeId,
                nomeTime: participante.nome_time || "Time sem nome",
                nomeCartola: participante.nome_cartola || "",
                escudo: participante.escudo_url || participante.escudo || null,
                ativo: participante.ativo !== false,
                saldoTemporada: parseFloat(saldoTemporada.toFixed(2)),
                saldoAcertos: parseFloat(saldoAcertos.toFixed(2)),
                totalPago: parseFloat(totalPago.toFixed(2)),
                totalRecebido: parseFloat(totalRecebido.toFixed(2)),
                saldoFinal: parseFloat(saldoFinal.toFixed(2)),
                situacao,
                quantidadeAcertos: acertosList.length,
                // ✅ v2.0: Breakdown por módulo financeiro
                breakdown: {
                    banco: parseFloat(breakdown.banco.toFixed(2)),
                    pontosCorridos: parseFloat(breakdown.pontosCorridos.toFixed(2)),
                    mataMata: parseFloat(breakdown.mataMata.toFixed(2)),
                    top10: parseFloat(breakdown.top10.toFixed(2)),
                    melhorMes: parseFloat(breakdown.melhorMes.toFixed(2)),
                    artilheiro: parseFloat(breakdown.artilheiro.toFixed(2)),
                    luvaOuro: parseFloat(breakdown.luvaOuro.toFixed(2)),
                    campos: parseFloat(saldoCampos.toFixed(2)),
                },
            });
        }

        // Ordenar por nome
        participantes.sort((a, b) => (a.nomeCartola || '').localeCompare(b.nomeCartola || ''));

        const elapsed = Date.now() - startTime;
        console.log(`[TESOURARIA] ✅ ${participantes.length} participantes em ${elapsed}ms`);

        res.json({
            success: true,
            ligaId,
            ligaNome: liga.nome,
            temporada,
            // ✅ v2.0: Incluir módulos ativos para renderização condicional no frontend
            modulosAtivos,
            participantes,
            totais: {
                totalParticipantes: participantes.length,
                quantidadeCredores,
                quantidadeDevedores,
                quantidadeQuitados,
                totalAReceber: parseFloat(totalDevedores.toFixed(2)),
                totalAPagar: parseFloat(totalCredores.toFixed(2)),
                saldoGeral: parseFloat((totalDevedores - totalCredores).toFixed(2)),
            },
        });
    } catch (error) {
        console.error("[TESOURARIA] Erro ao buscar participantes da liga:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// GET /api/tesouraria/participante/:ligaId/:timeId
// Retorna detalhes completos de um participante (incluindo histórico de acertos)
// =============================================================================

router.get("/participante/:ligaId/:timeId", async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { temporada = CURRENT_SEASON } = req.query;

        // Buscar liga
        const liga = await Liga.findById(ligaId).lean();
        if (!liga) {
            return res.status(404).json({ success: false, error: "Liga não encontrada" });
        }

        // Buscar participante
        const participante = liga.participantes?.find(
            p => String(p.time_id) === String(timeId)
        );
        if (!participante) {
            return res.status(404).json({ success: false, error: "Participante não encontrado" });
        }

        // Calcular saldo completo
        const saldo = await calcularSaldoCompleto(ligaId, timeId, temporada);

        // Buscar histórico de acertos
        const acertos = await AcertoFinanceiro.buscarPorTime(ligaId, timeId, temporada);

        // Classificar situação
        let situacao = "quitado";
        if (saldo.saldoFinal > 0.01) situacao = "credor";
        else if (saldo.saldoFinal < -0.01) situacao = "devedor";

        res.json({
            success: true,
            participante: {
                ligaId,
                ligaNome: liga.nome,
                timeId: String(timeId),
                nomeTime: participante.nome_time,
                nomeCartola: participante.nome_cartola,
                escudo: participante.escudo_url || participante.escudo,
                ativo: participante.ativo !== false,
            },
            financeiro: {
                temporada,
                saldoConsolidado: saldo.saldoConsolidado,
                saldoCampos: saldo.saldoCampos,
                saldoTemporada: saldo.saldoTemporada,
                saldoAcertos: saldo.saldoAcertos,
                totalPago: saldo.totalPago,
                totalRecebido: saldo.totalRecebido,
                saldoFinal: saldo.saldoFinal,
                situacao,
            },
            acertos: acertos.map(a => ({
                _id: a._id,
                tipo: a.tipo,
                valor: a.valor,
                descricao: a.descricao,
                metodoPagamento: a.metodoPagamento,
                dataAcerto: a.dataAcerto,
                observacoes: a.observacoes,
                registradoPor: a.registradoPor,
                createdAt: a.createdAt,
            })),
        });
    } catch (error) {
        console.error("[TESOURARIA] Erro ao buscar detalhes:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// POST /api/tesouraria/acerto
// Registra um novo acerto financeiro (mesma lógica do extrato)
// =============================================================================

router.post("/acerto", async (req, res) => {
    try {
        const {
            ligaId,
            timeId,
            nomeTime,
            tipo,
            valor,
            descricao,
            metodoPagamento = "pix",
            observacoes,
            dataAcerto,
            temporada = String(CURRENT_SEASON),
            registradoPor = "admin_tesouraria",
        } = req.body;

        // Validações
        if (!ligaId || !timeId) {
            return res.status(400).json({
                success: false,
                error: "ligaId e timeId são obrigatórios",
            });
        }

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

        const valorNumerico = parseFloat(valor);
        const dataAcertoFinal = dataAcerto ? new Date(dataAcerto) : new Date();

        // Buscar nome do time se não fornecido
        let nomeTimeFinal = nomeTime;
        if (!nomeTimeFinal) {
            const liga = await Liga.findById(ligaId).lean();
            const participante = liga?.participantes?.find(
                p => String(p.time_id) === String(timeId)
            );
            nomeTimeFinal = participante?.nome_time || `Time ${timeId}`;
        }

        // =========================================================================
        // VERIFICAR TROCO EM PAGAMENTOS (mesma lógica do acertos-financeiros-routes)
        // =========================================================================
        let acertoTroco = null;
        let valorTroco = 0;

        if (tipo === "pagamento") {
            const saldoAntes = await calcularSaldoCompleto(ligaId, timeId, temporada);
            const dividaAtual = saldoAntes.saldoFinal < 0 ? Math.abs(saldoAntes.saldoFinal) : 0;

            console.log(`[TESOURARIA] Verificando troco para ${nomeTimeFinal}:`);
            console.log(`  - Saldo antes: R$ ${saldoAntes.saldoFinal.toFixed(2)}`);
            console.log(`  - Dívida atual: R$ ${dividaAtual.toFixed(2)}`);
            console.log(`  - Pagamento: R$ ${valorNumerico.toFixed(2)}`);

            if (dividaAtual > 0 && valorNumerico > dividaAtual) {
                valorTroco = parseFloat((valorNumerico - dividaAtual).toFixed(2));

                console.log(`[TESOURARIA] ✅ TROCO DETECTADO: R$ ${valorTroco.toFixed(2)}`);

                acertoTroco = new AcertoFinanceiro({
                    ligaId: String(ligaId),
                    timeId: String(timeId),
                    nomeTime: nomeTimeFinal,
                    temporada,
                    tipo: "recebimento",
                    valor: valorTroco,
                    descricao: `TROCO - Pagamento a maior (Dívida: R$ ${dividaAtual.toFixed(2)})`,
                    metodoPagamento,
                    comprovante: null,
                    observacoes: `Gerado automaticamente via Tesouraria. Pagamento original: R$ ${valorNumerico.toFixed(2)}`,
                    dataAcerto: dataAcertoFinal,
                    registradoPor: "sistema_troco_tesouraria",
                });
            }
        }

        // Criar o acerto principal
        const novoAcerto = new AcertoFinanceiro({
            ligaId: String(ligaId),
            timeId: String(timeId),
            nomeTime: nomeTimeFinal,
            temporada,
            tipo,
            valor: valorNumerico,
            descricao: descricao || `Acerto via Tesouraria - ${tipo}`,
            metodoPagamento,
            comprovante: null,
            observacoes: observacoes || null,
            dataAcerto: dataAcertoFinal,
            registradoPor,
        });

        await novoAcerto.save();

        // Salvar troco se existir
        if (acertoTroco) {
            await acertoTroco.save();
            console.log(`[TESOURARIA] ✅ Troco de R$ ${valorTroco.toFixed(2)} salvo`);
        }

        // Invalidar cache do extrato
        try {
            await ExtratoFinanceiroCache.deleteOne({
                liga_id: ligaId,
                time_id: parseInt(timeId, 10) || timeId,
            });
            console.log(`[TESOURARIA] ♻️ Cache invalidado para time ${timeId}`);
        } catch (cacheError) {
            console.warn(`[TESOURARIA] ⚠️ Falha ao invalidar cache:`, cacheError.message);
        }

        // Calcular novo saldo
        const novoSaldo = await calcularSaldoCompleto(ligaId, timeId, temporada);

        // Resposta
        const response = {
            success: true,
            message: acertoTroco
                ? `Pagamento de R$ ${valorNumerico.toFixed(2)} registrado. TROCO de R$ ${valorTroco.toFixed(2)} creditado!`
                : `Acerto de R$ ${valorNumerico.toFixed(2)} registrado com sucesso`,
            acerto: {
                _id: novoAcerto._id,
                tipo: novoAcerto.tipo,
                valor: novoAcerto.valor,
                descricao: novoAcerto.descricao,
                dataAcerto: novoAcerto.dataAcerto,
            },
            novoSaldo: {
                saldoTemporada: novoSaldo.saldoTemporada,
                saldoAcertos: novoSaldo.saldoAcertos,
                saldoFinal: novoSaldo.saldoFinal,
            },
        };

        if (acertoTroco) {
            response.troco = {
                valor: valorTroco,
                mensagem: `Pagamento excedeu a dívida. R$ ${valorTroco.toFixed(2)} creditados.`,
            };
        }

        res.status(201).json(response);
    } catch (error) {
        console.error("[TESOURARIA] Erro ao registrar acerto:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// DELETE /api/tesouraria/acerto/:id
// Remove um acerto financeiro (soft delete)
// =============================================================================

router.delete("/acerto/:id", async (req, res) => {
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
            await AcertoFinanceiro.findByIdAndDelete(id);
        } else {
            acerto.ativo = false;
            await acerto.save();
        }

        // Invalidar cache
        try {
            await ExtratoFinanceiroCache.deleteOne({
                liga_id: acerto.ligaId,
                time_id: parseInt(acerto.timeId, 10) || acerto.timeId,
            });
        } catch (cacheError) {
            console.warn(`[TESOURARIA] ⚠️ Falha ao invalidar cache:`, cacheError.message);
        }

        // Calcular novo saldo
        const novoSaldo = await calcularSaldoCompleto(
            acerto.ligaId,
            acerto.timeId,
            acerto.temporada
        );

        res.json({
            success: true,
            message: hardDelete === "true" ? "Acerto removido permanentemente" : "Acerto desativado",
            novoSaldo: {
                saldoTemporada: novoSaldo.saldoTemporada,
                saldoAcertos: novoSaldo.saldoAcertos,
                saldoFinal: novoSaldo.saldoFinal,
            },
        });
    } catch (error) {
        console.error("[TESOURARIA] Erro ao remover acerto:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// GET /api/tesouraria/resumo
// Retorna resumo financeiro geral (totais por liga)
// =============================================================================

router.get("/resumo", async (req, res) => {
    try {
        const { temporada = CURRENT_SEASON } = req.query;

        const ligas = await Liga.find({ ativo: { $ne: false } }).lean();

        const resumoPorLiga = [];
        let totalGeralCredores = 0;
        let totalGeralDevedores = 0;

        for (const liga of ligas) {
            const ligaId = liga._id.toString();
            let credores = 0;
            let devedores = 0;
            let qtdCredores = 0;
            let qtdDevedores = 0;
            let qtdQuitados = 0;

            for (const participante of liga.participantes || []) {
                const saldo = await calcularSaldoCompleto(ligaId, participante.time_id, temporada);

                if (saldo.saldoFinal > 0.01) {
                    credores += saldo.saldoFinal;
                    qtdCredores++;
                } else if (saldo.saldoFinal < -0.01) {
                    devedores += Math.abs(saldo.saldoFinal);
                    qtdDevedores++;
                } else {
                    qtdQuitados++;
                }
            }

            totalGeralCredores += credores;
            totalGeralDevedores += devedores;

            resumoPorLiga.push({
                ligaId,
                ligaNome: liga.nome,
                totalParticipantes: liga.participantes?.length || 0,
                qtdCredores,
                qtdDevedores,
                qtdQuitados,
                totalAReceber: parseFloat(credores.toFixed(2)),
                totalAPagar: parseFloat(devedores.toFixed(2)),
                saldoLiga: parseFloat((credores - devedores).toFixed(2)),
            });
        }

        res.json({
            success: true,
            temporada,
            ligas: resumoPorLiga,
            totaisGerais: {
                totalAReceber: parseFloat(totalGeralCredores.toFixed(2)),
                totalAPagar: parseFloat(totalGeralDevedores.toFixed(2)),
                saldoGeral: parseFloat((totalGeralCredores - totalGeralDevedores).toFixed(2)),
            },
        });
    } catch (error) {
        console.error("[TESOURARIA] Erro ao gerar resumo:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

console.log("[TESOURARIA] ✅ Rotas carregadas");

export default router;
