import mongoose from "mongoose";
import RodadaSnapshot from "../models/RodadaSnapshot.js";
import RankingGeralCache from "../models/RankingGeralCache.js";
import Top10Cache from "../models/Top10Cache.js";
import { calcularRankingCompleto } from "./rankingGeralCacheController.js";
import { getFluxoFinanceiroLiga } from "./fluxoFinanceiroController.js";
import { obterConfrontosPontosCorridos } from "./pontosCorridosCacheController.js";
import { obterConfrontosMataMata } from "./mataMataCacheController.js";

// ============================================================================
// 📊 BUSCAR HISTÓRICO COMPLETO CONSOLIDADO (Evita múltiplas requisições)
// ============================================================================

export const buscarHistoricoCompleto = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodadaInicio = 1, rodadaFim } = req.query;

        console.log(
            `[CONSOLIDAÇÃO-HISTÓRICO] Buscando snapshots consolidados: R${rodadaInicio}-${rodadaFim || "atual"}`,
        );

        const query = {
            liga_id: ligaId,
            rodada: { $gte: parseInt(rodadaInicio) },
        };

        if (rodadaFim) {
            query.rodada.$lte = parseInt(rodadaFim);
        }

        const snapshots = await RodadaSnapshot.find(query)
            .sort({ rodada: 1 })
            .lean();

        console.log(
            `[CONSOLIDAÇÃO-HISTÓRICO] ✅ ${snapshots.length} snapshots encontrados`,
        );

        res.json({
            success: true,
            total: snapshots.length,
            rodadas: snapshots.map((s) => ({
                rodada: s.rodada,
                status: s.status || "aberta",
                dados: s.dados_consolidados,
                status_mercado: s.status_mercado,
                atualizado_em: s.atualizado_em,
            })),
        });
    } catch (error) {
        console.error("[CONSOLIDAÇÃO-HISTÓRICO] ❌ Erro:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// ============================================================================
// 🔒 CONSOLIDA UMA RODADA ESPECÍFICA (com transação)
// ============================================================================

export const consolidarRodada = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { ligaId, rodada } = req.params;
        const rodadaNum = parseInt(rodada);

        console.log(
            `[CONSOLIDAÇÃO] 🔒 Iniciando snapshot R${rodadaNum} da liga ${ligaId}`,
        );

        // ✅ VERIFICAR SE JÁ CONSOLIDADA
        const existente = await RodadaSnapshot.findOne({
            liga_id: ligaId,
            rodada: rodadaNum,
            status: "consolidada",
        }).lean();

        if (existente) {
            console.log(
                `[CONSOLIDAÇÃO] ⚠️ R${rodadaNum} já consolidada em ${existente.status_mercado?.timestamp_consolidacao}`,
            );
            return res.json({
                success: true,
                jaConsolidada: true,
                rodada: rodadaNum,
                consolidadaEm: existente.status_mercado?.timestamp_consolidacao,
            });
        }

        session.startTransaction();

        // 1. Calcular tudo pela ÚLTIMA vez
        const [ranking, financeiro, pontosCorridos, mataMata] =
            await Promise.all([
                calcularRankingCompleto(ligaId, rodadaNum),
                getFluxoFinanceiroLiga(ligaId, rodadaNum),
                obterConfrontosPontosCorridos(ligaId, rodadaNum),
                obterConfrontosMataMata(ligaId, rodadaNum),
            ]);

        // 2. Buscar status do mercado
        const statusMercado = await fetch(
            "https://api.cartolafc.globo.com/mercado/status",
        )
            .then((r) => r.json())
            .catch(() => ({ rodada_atual: 38, mes_atual: 12 }));

        // 3. Montar snapshot CONSOLIDADO
        const snapshot = {
            liga_id: ligaId,
            rodada: rodadaNum,
            status: "consolidada",
            dados_consolidados: {
                ranking_geral: ranking,
                times_stats: financeiro,
                confrontos_pontos_corridos: pontosCorridos,
                confrontos_mata_mata: mataMata,
            },
            status_mercado: {
                rodada_atual: statusMercado.rodada_atual,
                mes_atual: statusMercado.mes_atual,
                timestamp_consolidacao: new Date(),
            },
            atualizado_em: new Date(),
        };

        // 4. Salvar snapshot (upsert)
        await RodadaSnapshot.findOneAndUpdate(
            { liga_id: ligaId, rodada: rodadaNum },
            snapshot,
            { upsert: true, new: true, session },
        );

        // 5. ✅ ATUALIZAR CACHES RELACIONADOS

        // 5a. Ranking Geral Cache
        await RankingGeralCache.findOneAndUpdate(
            {
                ligaId: new mongoose.Types.ObjectId(ligaId),
                rodadaFinal: rodadaNum,
            },
            {
                ligaId: new mongoose.Types.ObjectId(ligaId),
                rodadaFinal: rodadaNum,
                ranking: ranking,
                consolidada: true,
                atualizadoEm: new Date(),
            },
            { upsert: true, session },
        );

        // 5b. Top10 Cache (se tiver dados)
        if (ranking && ranking.length > 0) {
            const mitos = ranking.slice(0, 10);
            const micos = [...ranking]
                .sort((a, b) => a.pontos_totais - b.pontos_totais)
                .slice(0, 10);

            await Top10Cache.findOneAndUpdate(
                { liga_id: ligaId, rodada_consolidada: rodadaNum },
                {
                    mitos,
                    micos,
                    cache_permanente: true,
                    ultima_atualizacao: new Date(),
                },
                { upsert: true, session },
            );
        }

        await session.commitTransaction();

        console.log(`[CONSOLIDAÇÃO] ✅ R${rodadaNum} consolidada com sucesso!`);

        res.json({
            success: true,
            rodada: rodadaNum,
            status: "consolidada",
            timestamp: new Date(),
        });
    } catch (error) {
        await session.abortTransaction();
        console.error("[CONSOLIDAÇÃO] ❌ Erro:", error);
        res.status(500).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

// ============================================================================
// 🏭 CONSOLIDA TODAS AS RODADAS PASSADAS (script de recuperação)
// ============================================================================

export const consolidarTodasRodadasPassadas = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodadaInicio = 1, rodadaFim = 35 } = req.query;

        console.log(
            `[CONSOLIDAÇÃO-MASSA] 🏭 Consolidando R${rodadaInicio}-${rodadaFim} da liga ${ligaId}`,
        );

        const resultados = [];

        for (let r = parseInt(rodadaInicio); r <= parseInt(rodadaFim); r++) {
            try {
                console.log(`[CONSOLIDAÇÃO-MASSA] Processando R${r}...`);

                // Verifica se já está consolidada
                const existente = await RodadaSnapshot.findOne({
                    liga_id: ligaId,
                    rodada: r,
                    status: "consolidada",
                }).lean();

                if (existente) {
                    console.log(
                        `[CONSOLIDAÇÃO-MASSA] ⏭️ R${r} já consolidada, pulando...`,
                    );
                    resultados.push({
                        rodada: r,
                        success: true,
                        skipped: true,
                    });
                    continue;
                }

                // Simula request para reutilizar função existente
                const mockReq = { params: { ligaId, rodada: r } };
                const mockRes = {
                    json: (data) =>
                        resultados.push({ rodada: r, success: true, data }),
                    status: () => mockRes,
                };

                await consolidarRodada(mockReq, mockRes);

                // Pequeno delay para não sobrecarregar
                await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`[CONSOLIDAÇÃO-MASSA] ❌ Erro na R${r}:`, error);
                resultados.push({
                    rodada: r,
                    success: false,
                    error: error.message,
                });
            }
        }

        const sucessos = resultados.filter((r) => r.success).length;
        const pulados = resultados.filter((r) => r.skipped).length;

        console.log(
            `[CONSOLIDAÇÃO-MASSA] ✅ Concluído: ${sucessos}/${resultados.length} (${pulados} já consolidadas)`,
        );

        res.json({
            total: resultados.length,
            sucessos,
            pulados,
            falhas: resultados.filter((r) => !r.success).length,
            detalhes: resultados,
        });
    } catch (error) {
        console.error("[CONSOLIDAÇÃO-MASSA] ❌ Erro fatal:", error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================================================
// 📊 VERIFICAR STATUS DE CONSOLIDAÇÃO
// ============================================================================

export const verificarStatusConsolidacao = async (req, res) => {
    try {
        const { ligaId } = req.params;

        const total = await RodadaSnapshot.countDocuments({ liga_id: ligaId });
        const consolidadas = await RodadaSnapshot.countDocuments({
            liga_id: ligaId,
            status: "consolidada",
        });
        const abertas = await RodadaSnapshot.countDocuments({
            liga_id: ligaId,
            status: "aberta",
        });

        res.json({
            liga_id: ligaId,
            total_snapshots: total,
            consolidadas,
            abertas,
            pendentes: total - consolidadas,
        });
    } catch (error) {
        console.error("[CONSOLIDAÇÃO] Erro ao verificar status:", error);
        res.status(500).json({ error: error.message });
    }
};
