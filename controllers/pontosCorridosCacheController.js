// controllers/pontosCorridosCacheController.js
import PontosCorridosCache from "../models/PontosCorridosCache.js";

export const salvarCachePontosCorridos = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodada, classificacao, permanent } = req.body;

        if (!rodada || !classificacao) {
            return res.status(400).json({ error: "Dados incompletos" });
        }

        await PontosCorridosCache.findOneAndUpdate(
            { liga_id: ligaId, rodada_consolidada: rodada },
            {
                classificacao: classificacao,
                cache_permanente: permanent || false, // ✅ Marca como permanente
                ultima_atualizacao: new Date(),
            },
            { new: true, upsert: true },
        );

        const msg = permanent
            ? `[CACHE-PC] Cache PERMANENTE salvo: Liga ${ligaId}, Rodada ${rodada}`
            : `[CACHE-PC] Cache temporário salvo: Liga ${ligaId}, Rodada ${rodada}`;
        console.log(msg);
        res.json({ success: true, permanent });
    } catch (error) {
        console.error("[CACHE-PC] Erro ao salvar:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

export const lerCachePontosCorridos = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodada } = req.query;

        // Busca o cache da rodada específica ou o mais recente
        const query = { liga_id: ligaId };
        if (rodada) query.rodada_consolidada = Number(rodada);

        console.log(
            `[CACHE-PC] 🔍 Buscando cache: Liga ${ligaId}, Rodada ${rodada || "mais recente"}`,
        );

        // Pega o ranking mais recente (maior rodada)
        const cache = await PontosCorridosCache.findOne(query).sort({
            rodada_consolidada: -1,
        });

        if (!cache) {
            console.log(
                `[CACHE-PC] ❌ Cache NÃO ENCONTRADO para rodada ${rodada}`,
            );
            return res.status(404).json({ cached: false });
        }

        // ✅ Validar se o cache está na rodada esperada (se rodada foi especificada)
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
            `[CACHE-PC] ✅ Cache PERMANENTE encontrado: R${cache.rodada_consolidada} (${cache.classificacao?.length || 0} times)`,
        );

        res.json({
            cached: true,
            rodada: cache.rodada_consolidada,
            classificacao: cache.classificacao,
            updatedAt: cache.ultima_atualizacao,
        });
    } catch (error) {
        console.error("[CACHE-PC] Erro ao ler:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

// ✅ FUNÇÃO PARA OBTER CONFRONTOS DE PONTOS CORRIDOS (para consolidação)
export const obterConfrontosPontosCorridos = async (ligaId, rodada) => {
    try {
        const cache = await PontosCorridosCache.findOne({
            liga_id: ligaId,
            rodada_consolidada: rodada,
        });

        if (cache && cache.classificacao) {
            console.log(
                `[CONSOLIDAÇÃO] ✅ Carregando confrontos pontos corridos: Liga ${ligaId}, R${rodada}`,
            );
            return cache.classificacao;
        }

        console.log(
            `[CONSOLIDAÇÃO] ⚠️ Confrontos pontos corridos não encontrados: Liga ${ligaId}, R${rodada}`,
        );
        return [];
    } catch (error) {
        console.error(
            "[CONSOLIDAÇÃO] ❌ Erro ao obter confrontos pontos corridos:",
            error,
        );
        return [];
    }
};
