// routes/pontosCorridosMigracaoRoutes.js
// Endpoint para popular cache histórico do Pontos Corridos

import express from "express";
import PontosCorridosCache from "../models/PontosCorridosCache.js";
import Rodada from "../models/Rodada.js";
import Liga from "../models/Liga.js";

const router = express.Router();

// Configuração do Pontos Corridos
const CONFIG = {
    rodadaInicial: 7, // Rodada do Brasileirão onde começa o Pontos Corridos
    criterios: {
        empateTolerancia: 0.3,
        goleadaMinima: 50.0,
    },
    financeiro: {
        vitoria: 5.0,
        empate: 3.0,
        goleada: 7.0,
    },
};

/**
 * POST /api/pontos-corridos/migrar/:ligaId
 * Popula o cache MongoDB com todas as rodadas históricas
 */
router.post("/migrar/:ligaId", async (req, res) => {
    const { ligaId } = req.params;
    const { forcarRecalculo } = req.body;

    console.log(`[MIGRAÇÃO-PC] 🚀 Iniciando migração para liga ${ligaId}...`);

    try {
        // 1. Buscar times da liga
        const liga = await Liga.findById(ligaId).lean();
        if (!liga) {
            return res.status(404).json({ error: "Liga não encontrada" });
        }

        const times = liga.participantes || [];
        if (times.length < 2) {
            return res
                .status(400)
                .json({ error: "Liga precisa ter ao menos 2 participantes" });
        }

        console.log(`[MIGRAÇÃO-PC] 📋 ${times.length} times encontrados`);

        // 2. Gerar confrontos base (todos contra todos)
        const confrontosBase = gerarConfrontos(times);
        const totalRodadasLiga = confrontosBase.length;

        console.log(
            `[MIGRAÇÃO-PC] ⚽ ${totalRodadasLiga} rodadas de confrontos geradas`,
        );

        // 3. Buscar todas as pontuações do histórico
        const rodadasDB = await Rodada.find({ liga_id: ligaId })
            .sort({ rodada: 1 })
            .lean();

        // Mapear pontuações por rodada do Brasileirão
        const pontuacoesPorRodada = {};
        rodadasDB.forEach((r) => {
            const rodadaBr = r.rodada;
            if (!pontuacoesPorRodada[rodadaBr]) {
                pontuacoesPorRodada[rodadaBr] = {};
            }
            const timeId = r.time_id || r.timeId;
            pontuacoesPorRodada[rodadaBr][timeId] = r.pontos || 0;
        });

        console.log(
            `[MIGRAÇÃO-PC] 📊 Pontuações carregadas de ${Object.keys(pontuacoesPorRodada).length} rodadas`,
        );

        // 4. Processar cada rodada da liga
        const classificacaoAcumulada = inicializarClassificacao(times);
        let rodadasMigradas = 0;
        let rodadasPuladas = 0;

        for (let rodadaLiga = 1; rodadaLiga <= totalRodadasLiga; rodadaLiga++) {
            const rodadaBrasileirao = CONFIG.rodadaInicial + (rodadaLiga - 1);
            const pontuacoesRodada =
                pontuacoesPorRodada[rodadaBrasileirao] || {};

            // Verificar se tem dados para esta rodada
            if (Object.keys(pontuacoesRodada).length === 0) {
                console.log(
                    `[MIGRAÇÃO-PC] ⏭️ Rodada ${rodadaLiga} (BR ${rodadaBrasileirao}) sem dados, pulando...`,
                );
                rodadasPuladas++;
                continue;
            }

            // Verificar se já existe cache (se não forçar recálculo)
            if (!forcarRecalculo) {
                const cacheExistente = await PontosCorridosCache.findOne({
                    liga_id: ligaId,
                    rodada_consolidada: rodadaLiga,
                }).lean();

                if (cacheExistente && cacheExistente.confrontos?.length > 0) {
                    console.log(
                        `[MIGRAÇÃO-PC] ✅ Rodada ${rodadaLiga} já tem cache, pulando...`,
                    );
                    rodadasPuladas++;
                    continue;
                }
            }

            // Processar confrontos da rodada
            const jogosDaRodada = confrontosBase[rodadaLiga - 1] || [];
            const confrontosProcessados = [];

            for (const jogo of jogosDaRodada) {
                const timeAId = String(jogo.timeA.time_id || jogo.timeA.id);
                const timeBId = String(jogo.timeB.time_id || jogo.timeB.id);

                const pontosA = pontuacoesRodada[timeAId] ?? null;
                const pontosB = pontuacoesRodada[timeBId] ?? null;

                const resultado = calcularResultado(pontosA, pontosB);

                // Atualizar classificação acumulada
                atualizarClassificacao(
                    classificacaoAcumulada,
                    timeAId,
                    timeBId,
                    pontosA,
                    pontosB,
                    resultado,
                );

                confrontosProcessados.push({
                    time1: {
                        id: timeAId,
                        nome:
                            jogo.timeA.nome_time || jogo.timeA.nome || "Time A",
                        escudo:
                            jogo.timeA.url_escudo_png ||
                            jogo.timeA.foto_time ||
                            "",
                        pontos: pontosA,
                    },
                    time2: {
                        id: timeBId,
                        nome:
                            jogo.timeB.nome_time || jogo.timeB.nome || "Time B",
                        escudo:
                            jogo.timeB.url_escudo_png ||
                            jogo.timeB.foto_time ||
                            "",
                        pontos: pontosB,
                    },
                    diferenca:
                        pontosA !== null && pontosB !== null
                            ? Math.abs(pontosA - pontosB)
                            : null,
                    valor: resultado.valorFinanceiro,
                    tipo: resultado.tipo,
                });
            }

            // Ordenar e adicionar posição
            const classificacaoOrdenada = ordenarClassificacao(
                classificacaoAcumulada,
            );

            // Salvar no MongoDB
            await PontosCorridosCache.findOneAndUpdate(
                { liga_id: ligaId, rodada_consolidada: rodadaLiga },
                {
                    confrontos: confrontosProcessados,
                    classificacao: classificacaoOrdenada,
                    cache_permanente: true,
                    ultima_atualizacao: new Date(),
                },
                { upsert: true, new: true },
            );

            rodadasMigradas++;
            console.log(
                `[MIGRAÇÃO-PC] 💾 Rodada ${rodadaLiga} salva (${confrontosProcessados.length} confrontos)`,
            );
        }

        console.log(`[MIGRAÇÃO-PC] ✅ Migração concluída!`);
        console.log(
            `[MIGRAÇÃO-PC] 📊 ${rodadasMigradas} rodadas migradas, ${rodadasPuladas} puladas`,
        );

        res.json({
            success: true,
            ligaId,
            totalRodadas: totalRodadasLiga,
            rodadasMigradas,
            rodadasPuladas,
            message: `Migração concluída: ${rodadasMigradas} rodadas populadas`,
        });
    } catch (error) {
        console.error("[MIGRAÇÃO-PC] ❌ Erro:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/pontos-corridos/migrar/:ligaId/status
 * Verifica status da migração
 */
router.get("/migrar/:ligaId/status", async (req, res) => {
    const { ligaId } = req.params;

    try {
        const caches = await PontosCorridosCache.find({ liga_id: ligaId })
            .sort({ rodada_consolidada: 1 })
            .select(
                "rodada_consolidada confrontos classificacao ultima_atualizacao",
            )
            .lean();

        const rodadasPopuladas = caches.filter((c) => c.confrontos?.length > 0);

        res.json({
            ligaId,
            totalDocumentos: caches.length,
            rodadasComDados: rodadasPopuladas.length,
            rodadas: rodadasPopuladas.map((c) => ({
                rodada: c.rodada_consolidada,
                confrontos: c.confrontos?.length || 0,
                classificacao: c.classificacao?.length || 0,
                atualizadoEm: c.ultima_atualizacao,
            })),
        });
    } catch (error) {
        console.error("[MIGRAÇÃO-PC] ❌ Erro ao verificar status:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function gerarConfrontos(times) {
    const n = times.length;
    const rodadas = [];
    const lista = [...times];

    if (n % 2 !== 0) lista.push(null);

    const totalRodadas = lista.length - 1;

    for (let rodada = 0; rodada < totalRodadas; rodada++) {
        const jogos = [];
        for (let i = 0; i < lista.length / 2; i++) {
            const timeA = lista[i];
            const timeB = lista[lista.length - 1 - i];
            if (timeA && timeB) {
                jogos.push({ timeA, timeB });
            }
        }
        rodadas.push(jogos);
        lista.splice(1, 0, lista.pop());
    }

    return rodadas;
}

function inicializarClassificacao(times) {
    const classificacao = {};

    times.forEach((time) => {
        const timeId = String(time.time_id || time.id);
        classificacao[timeId] = {
            timeId: timeId,
            nome: time.nome_time || time.nome || "Time",
            escudo: time.url_escudo_png || time.foto_time || "",
            pontos: 0,
            jogos: 0,
            vitorias: 0,
            empates: 0,
            derrotas: 0,
            gols_pro: 0,
            gols_contra: 0,
            saldo_gols: 0,
            financeiro: 0,
        };
    });

    return classificacao;
}

function calcularResultado(pontosA, pontosB) {
    if (pontosA === null || pontosB === null) {
        return {
            tipo: "pendente",
            pontosTime1: 0,
            pontosTime2: 0,
            valorFinanceiro: 0,
        };
    }

    const A = parseFloat(pontosA);
    const B = parseFloat(pontosB);
    const diferenca = Math.abs(A - B);

    // Empate
    if (diferenca <= CONFIG.criterios.empateTolerancia) {
        return {
            tipo: "empate",
            pontosTime1: 1,
            pontosTime2: 1,
            financeiroA: CONFIG.financeiro.empate,
            financeiroB: CONFIG.financeiro.empate,
            valorFinanceiro: CONFIG.financeiro.empate,
        };
    }

    // Goleada
    if (diferenca >= CONFIG.criterios.goleadaMinima) {
        if (A > B) {
            return {
                tipo: "goleada",
                pontosTime1: 3,
                pontosTime2: 0,
                financeiroA: CONFIG.financeiro.goleada,
                financeiroB: -CONFIG.financeiro.goleada,
                valorFinanceiro: CONFIG.financeiro.goleada,
            };
        } else {
            return {
                tipo: "goleada",
                pontosTime1: 0,
                pontosTime2: 3,
                financeiroA: -CONFIG.financeiro.goleada,
                financeiroB: CONFIG.financeiro.goleada,
                valorFinanceiro: CONFIG.financeiro.goleada,
            };
        }
    }

    // Vitória simples
    if (A > B) {
        return {
            tipo: "vitoria",
            pontosTime1: 3,
            pontosTime2: 0,
            financeiroA: CONFIG.financeiro.vitoria,
            financeiroB: -CONFIG.financeiro.vitoria,
            valorFinanceiro: CONFIG.financeiro.vitoria,
        };
    } else {
        return {
            tipo: "vitoria",
            pontosTime1: 0,
            pontosTime2: 3,
            financeiroA: -CONFIG.financeiro.vitoria,
            financeiroB: CONFIG.financeiro.vitoria,
            valorFinanceiro: CONFIG.financeiro.vitoria,
        };
    }
}

function atualizarClassificacao(
    classificacao,
    timeAId,
    timeBId,
    pontosA,
    pontosB,
    resultado,
) {
    if (!classificacao[timeAId] || !classificacao[timeBId]) return;

    // Time A
    classificacao[timeAId].jogos += 1;
    classificacao[timeAId].pontos += resultado.pontosTime1;
    classificacao[timeAId].gols_pro += pontosA || 0;
    classificacao[timeAId].gols_contra += pontosB || 0;
    classificacao[timeAId].saldo_gols =
        classificacao[timeAId].gols_pro - classificacao[timeAId].gols_contra;
    classificacao[timeAId].financeiro += resultado.financeiroA || 0;

    if (resultado.pontosTime1 === 3) classificacao[timeAId].vitorias += 1;
    else if (resultado.pontosTime1 === 1) classificacao[timeAId].empates += 1;
    else if (resultado.pontosTime1 === 0 && resultado.tipo !== "pendente")
        classificacao[timeAId].derrotas += 1;

    // Time B
    classificacao[timeBId].jogos += 1;
    classificacao[timeBId].pontos += resultado.pontosTime2;
    classificacao[timeBId].gols_pro += pontosB || 0;
    classificacao[timeBId].gols_contra += pontosA || 0;
    classificacao[timeBId].saldo_gols =
        classificacao[timeBId].gols_pro - classificacao[timeBId].gols_contra;
    classificacao[timeBId].financeiro += resultado.financeiroB || 0;

    if (resultado.pontosTime2 === 3) classificacao[timeBId].vitorias += 1;
    else if (resultado.pontosTime2 === 1) classificacao[timeBId].empates += 1;
    else if (resultado.pontosTime2 === 0 && resultado.tipo !== "pendente")
        classificacao[timeBId].derrotas += 1;
}

function ordenarClassificacao(classificacaoObj) {
    const array = Object.values(classificacaoObj);

    array.sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.saldo_gols !== a.saldo_gols) return b.saldo_gols - a.saldo_gols;
        return b.vitorias - a.vitorias;
    });

    return array.map((time, idx) => ({
        ...time,
        posicao: idx + 1,
    }));
}

export default router;
