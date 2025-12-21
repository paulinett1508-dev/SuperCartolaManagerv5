/**
 * Rotas de Auditoria Admin
 * Super Cartola Manager
 *
 * Endpoints para auditoria de extratos financeiros
 */
import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/database.js";

const router = express.Router();

console.log("[ADMIN-AUDITORIA] Rotas de auditoria admin carregadas");

/**
 * Middleware para verificar autenticação admin
 */
function requireAdmin(req, res, next) {
    if (!req.session?.admin) {
        return res.status(401).json({
            success: false,
            message: "Acesso restrito a administradores"
        });
    }
    next();
}

/**
 * GET /api/admin/auditoria/extratos/:ligaId
 * Audita todos os extratos financeiros de uma liga
 */
router.get("/extratos/:ligaId", requireAdmin, async (req, res) => {
    try {
        const { ligaId } = req.params;
        const detalhado = req.query.detalhado === "true";
        const db = getDB();

        // Validar ligaId
        if (!ObjectId.isValid(ligaId)) {
            return res.status(400).json({
                success: false,
                message: "Liga ID inválido"
            });
        }

        const ligaObjectId = new ObjectId(ligaId);

        // Buscar liga
        const liga = await db.collection("ligas").findOne({ _id: ligaObjectId });
        if (!liga) {
            return res.status(404).json({
                success: false,
                message: "Liga não encontrada"
            });
        }

        const RODADA_FINAL = liga.configuracoes?.rodada_final || 38;
        const modulosAtivos = liga.modulos_ativos || {};

        // Estatísticas gerais
        const stats = {
            total: 0,
            ok: 0,
            erros: 0,
            semCache: 0,
            rodadasIncompletas: 0,
            saldoErrado: 0,
            acumuladoErrado: 0,
            semTop10: 0,
            semMataMata: 0,
            semPontosCorridos: 0
        };

        const problemas = [];
        const participantesOk = [];

        // Verificar cada participante
        for (const participante of (liga.participantes || [])) {
            const timeId = participante.time_id;
            const nome = participante.nome_cartola;
            stats.total++;

            // Buscar cache
            const cache = await db.collection("extratofinanceirocaches").findOne({
                liga_id: ligaObjectId,
                time_id: timeId
            });

            if (!cache) {
                stats.semCache++;
                problemas.push({
                    timeId,
                    nome,
                    tipo: "SEM_CACHE",
                    erros: ["Sem cache de extrato financeiro"]
                });
                continue;
            }

            const transacoes = cache.historico_transacoes || [];
            const rodadasNoCache = [...new Set(transacoes.map(t => t.rodada))].sort((a, b) => a - b);
            const errosParticipante = [];

            // 1. Verificar se tem todas as rodadas
            if (rodadasNoCache.length < RODADA_FINAL) {
                const faltando = [];
                for (let r = 1; r <= RODADA_FINAL; r++) {
                    if (!rodadasNoCache.includes(r)) faltando.push(r);
                }
                stats.rodadasIncompletas++;
                errosParticipante.push(`Faltam rodadas: ${faltando.join(", ")}`);
            }

            // 2. Verificar saldo consolidado
            const saldoCalculado = transacoes.reduce((acc, t) => acc + (parseFloat(t.saldo) || 0), 0);
            const saldoCache = cache.saldo_consolidado || 0;
            const diffSaldo = Math.abs(saldoCalculado - saldoCache);

            if (diffSaldo > 0.01) {
                stats.saldoErrado++;
                errosParticipante.push(`Saldo errado: cache=${saldoCache.toFixed(2)}, calculado=${saldoCalculado.toFixed(2)}`);
            }

            // 3. Verificar saldoAcumulado progressivo
            let acumuladoEsperado = 0;
            let acumuladoOk = true;
            const transacoesOrdenadas = [...transacoes].sort((a, b) => a.rodada - b.rodada);

            for (const t of transacoesOrdenadas) {
                acumuladoEsperado += parseFloat(t.saldo) || 0;
                const diffAcum = Math.abs((t.saldoAcumulado || 0) - acumuladoEsperado);
                if (diffAcum > 0.01) {
                    acumuladoOk = false;
                    break;
                }
            }

            if (!acumuladoOk) {
                stats.acumuladoErrado++;
                errosParticipante.push("SaldoAcumulado progressivo incorreto");
            }

            // 4. Verificar Top10 (se módulo ativo)
            if (modulosAtivos.top10 !== false) {
                const temTop10 = transacoes.some(t => (t.top10 || 0) !== 0 || t.isMito || t.isMico);
                if (!temTop10) {
                    stats.semTop10++;
                    errosParticipante.push("Sem transações Top10 (Mito/Mico)");
                }
            }

            // 5. Verificar Mata-Mata (se módulo ativo)
            if (modulosAtivos.mataMata !== false) {
                const temMM = transacoes.some(t => (t.mataMata || 0) !== 0);
                if (!temMM) {
                    stats.semMataMata++;
                    errosParticipante.push("Sem transações Mata-Mata");
                }
            }

            // 6. Verificar Pontos Corridos (se módulo ativo)
            if (modulosAtivos.pontosCorridos !== false) {
                const temPC = transacoes.some(t => (t.pontosCorridos || 0) !== 0);
                if (!temPC) {
                    stats.semPontosCorridos++;
                    errosParticipante.push("Sem transações Pontos Corridos");
                }
            }

            // Resultado do participante
            if (errosParticipante.length === 0) {
                stats.ok++;
                if (detalhado) {
                    participantesOk.push({
                        timeId,
                        nome,
                        rodadas: rodadasNoCache.length,
                        saldo: saldoCache.toFixed(2)
                    });
                }
            } else {
                stats.erros++;
                problemas.push({
                    timeId,
                    nome,
                    tipo: "ERROS",
                    erros: errosParticipante
                });
            }
        }

        // Verificar acertos financeiros
        const acertos = await db.collection("acertofinanceiros").find({
            ligaId: ligaId,
            ativo: true
        }).toArray();

        const acertosPorTipo = {};
        acertos.forEach(a => {
            acertosPorTipo[a.tipo] = (acertosPorTipo[a.tipo] || 0) + 1;
        });

        res.json({
            success: true,
            liga: {
                id: ligaId,
                nome: liga.nome,
                rodadaFinal: RODADA_FINAL,
                modulosAtivos
            },
            stats,
            problemas,
            participantesOk: detalhado ? participantesOk : undefined,
            acertos: {
                total: acertos.length,
                porTipo: acertosPorTipo
            },
            status: stats.erros === 0 && stats.semCache === 0 ? "OK" : "PROBLEMAS_ENCONTRADOS",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("[ADMIN-AUDITORIA] Erro na auditoria:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao executar auditoria",
            error: error.message
        });
    }
});

/**
 * POST /api/admin/auditoria/fix-saldo/:ligaId
 * Corrige t.saldo corrompidos para uma liga
 */
router.post("/fix-saldo/:ligaId", requireAdmin, async (req, res) => {
    try {
        const { ligaId } = req.params;
        const dryRun = req.query.dryRun !== "false"; // Default: dry-run
        const db = getDB();

        if (!ObjectId.isValid(ligaId)) {
            return res.status(400).json({
                success: false,
                message: "Liga ID inválido"
            });
        }

        const ligaObjectId = new ObjectId(ligaId);

        // Buscar todos os caches da liga
        const caches = await db.collection("extratofinanceirocaches").find({
            liga_id: ligaObjectId
        }).toArray();

        let totalCorrigidos = 0;
        let totalTransacoesFixadas = 0;
        const detalhes = [];

        for (const cache of caches) {
            const transacoes = cache.historico_transacoes || [];
            if (transacoes.length === 0) continue;

            let precisaCorrecao = false;
            let transacoesErradas = 0;

            // Verificar se precisa correção
            for (const t of transacoes) {
                const saldoEsperado = (parseFloat(t.bonusOnus) || 0) +
                                      (parseFloat(t.pontosCorridos) || 0) +
                                      (parseFloat(t.mataMata) || 0) +
                                      (parseFloat(t.top10) || 0);
                const saldoAtual = parseFloat(t.saldo) || 0;

                if (Math.abs(saldoEsperado - saldoAtual) > 0.01) {
                    precisaCorrecao = true;
                    transacoesErradas++;
                }
            }

            if (!precisaCorrecao) continue;

            detalhes.push({
                timeId: cache.time_id,
                transacoesErradas
            });

            if (dryRun) {
                totalCorrigidos++;
                totalTransacoesFixadas += transacoesErradas;
                continue;
            }

            // Corrigir transações
            const transacoesCorrigidas = transacoes.map(t => {
                const saldoCorreto = (parseFloat(t.bonusOnus) || 0) +
                                     (parseFloat(t.pontosCorridos) || 0) +
                                     (parseFloat(t.mataMata) || 0) +
                                     (parseFloat(t.top10) || 0);
                return { ...t, saldo: saldoCorreto };
            });

            // Recalcular saldoAcumulado
            transacoesCorrigidas.sort((a, b) => a.rodada - b.rodada);
            let acumulado = 0;
            transacoesCorrigidas.forEach(t => {
                acumulado += t.saldo;
                t.saldoAcumulado = acumulado;
            });

            // Recalcular saldo_consolidado
            const novoSaldoConsolidado = transacoesCorrigidas.reduce((acc, t) => acc + t.saldo, 0);

            // Atualizar no banco
            await db.collection("extratofinanceirocaches").updateOne(
                { _id: cache._id },
                {
                    $set: {
                        historico_transacoes: transacoesCorrigidas,
                        saldo_consolidado: novoSaldoConsolidado,
                        updatedAt: new Date(),
                        "metadados.fix_saldo_transacoes_api": new Date()
                    }
                }
            );

            totalCorrigidos++;
            totalTransacoesFixadas += transacoesErradas;
        }

        res.json({
            success: true,
            dryRun,
            cachesCorrigidos: totalCorrigidos,
            transacoesFixadas: totalTransacoesFixadas,
            detalhes,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("[ADMIN-AUDITORIA] Erro ao corrigir saldo:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao corrigir saldo",
            error: error.message
        });
    }
});

export default router;
