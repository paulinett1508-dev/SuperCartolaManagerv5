// controllers/pontosCorridosCacheController.js
import PontosCorridosCache from "../models/PontosCorridosCache.js";

// ✅ SALVAR CACHE (CONFRONTOS + CLASSIFICAÇÃO)
export const salvarCachePontosCorridos = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodada, classificacao, confrontos, permanent } = req.body;

        if (!rodada) {
            return res.status(400).json({ error: "Rodada é obrigatória" });
        }

        if (!classificacao && !confrontos) {
            return res
                .status(400)
                .json({
                    error: "Dados incompletos (classificação ou confrontos)",
                });
        }

        const updateData = {
            cache_permanente: permanent || false,
            ultima_atualizacao: new Date(),
        };

        if (classificacao) updateData.classificacao = classificacao;
        if (confrontos) updateData.confrontos = confrontos;

        const result = await PontosCorridosCache.findOneAndUpdate(
            { liga_id: ligaId, rodada_consolidada: rodada },
            updateData,
            { new: true, upsert: true },
        );

        const tipoCache = permanent ? "PERMANENTE" : "temporário";
        console.log(
            `[CACHE-PC] ✅ Cache ${tipoCache} salvo: Liga ${ligaId}, Rodada ${rodada}`,
        );
        console.log(
            `[CACHE-PC] 📊 ${confrontos?.length || 0} confrontos, ${classificacao?.length || 0} times`,
        );

        res.json({
            success: true,
            permanent,
            id: result._id,
            confrontos: confrontos?.length || 0,
            classificacao: classificacao?.length || 0,
        });
    } catch (error) {
        console.error("[CACHE-PC] ❌ Erro ao salvar:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

// ✅ LER CACHE (CONFRONTOS + CLASSIFICAÇÃO)
export const lerCachePontosCorridos = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodada } = req.query;

        const query = { liga_id: ligaId };
        if (rodada) query.rodada_consolidada = Number(rodada);

        console.log(
            `[CACHE-PC] 🔍 Buscando cache: Liga ${ligaId}, Rodada ${rodada || "mais recente"}`,
        );

        const cache = await PontosCorridosCache.findOne(query).sort({
            rodada_consolidada: -1,
        });

        if (!cache) {
            console.log(`[CACHE-PC] ❌ Cache NÃO ENCONTRADO`);
            return res.status(404).json({ cached: false });
        }

        if (rodada && cache.rodada_consolidada !== Number(rodada)) {
            console.log(
                `[CACHE-PC] ⚠️ Cache desatualizado: esperava R${rodada}, tinha R${cache.rodada_consolidada}`,
            );
            return res.status(404).json({
                cached: false,
                reason: "outdated",
                cachedUntil: cache.rodada_consolidada,
                expectedUntil: Number(rodada),
            });
        }

        console.log(
            `[CACHE-PC] ✅ Cache encontrado: R${cache.rodada_consolidada} (${cache.confrontos?.length || 0} confrontos, ${cache.classificacao?.length || 0} times)`,
        );

        res.json({
            cached: true,
            rodada: cache.rodada_consolidada,
            confrontos: cache.confrontos || [],
            classificacao: cache.classificacao || [],
            permanent: cache.cache_permanente,
            updatedAt: cache.ultima_atualizacao,
        });
    } catch (error) {
        console.error("[CACHE-PC] ❌ Erro ao ler:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

// ✅ OBTER TODAS AS RODADAS PARA O PARTICIPANTE
export const obterConfrontosPontosCorridos = async (
    ligaId,
    rodadaFiltro = null,
) => {
    try {
        const query = { liga_id: ligaId };
        if (rodadaFiltro) {
            query.rodada_consolidada = Number(rodadaFiltro);
        }

        const caches = await PontosCorridosCache.find(query)
            .sort({ rodada_consolidada: 1 })
            .lean();

        if (!caches || caches.length === 0) {
            console.log(
                `[PONTOS-CORRIDOS] ⚠️ Nenhum cache encontrado: Liga ${ligaId}`,
            );
            return [];
        }

        // Estrutura completa por rodada
        const dadosPorRodada = caches.map((cache) => ({
            rodada: cache.rodada_consolidada,
            confrontos: cache.confrontos || [],
            classificacao: cache.classificacao || [],
            permanent: cache.cache_permanente,
            updatedAt: cache.ultima_atualizacao,
        }));

        console.log(
            `[PONTOS-CORRIDOS] ✅ ${dadosPorRodada.length} rodadas carregadas: Liga ${ligaId}`,
        );

        return dadosPorRodada;
    } catch (error) {
        console.error("[PONTOS-CORRIDOS] ❌ Erro ao obter dados:", error);
        return [];
    }
};

// ✅ OBTER CLASSIFICAÇÃO GERAL (última rodada disponível)
export const obterClassificacaoGeral = async (ligaId) => {
    try {
        const cache = await PontosCorridosCache.findOne({ liga_id: ligaId })
            .sort({ rodada_consolidada: -1 })
            .lean();

        if (!cache) {
            console.log(
                `[PONTOS-CORRIDOS] ⚠️ Nenhuma classificação encontrada: Liga ${ligaId}`,
            );
            return null;
        }

        return {
            rodada: cache.rodada_consolidada,
            classificacao: cache.classificacao || [],
            permanent: cache.cache_permanente,
            updatedAt: cache.ultima_atualizacao,
        };
    } catch (error) {
        console.error(
            "[PONTOS-CORRIDOS] ❌ Erro ao obter classificação:",
            error,
        );
        return null;
    }
};
