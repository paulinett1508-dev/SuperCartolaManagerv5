// controllers/pontosCorridosCacheController.js
import PontosCorridosCache from "../models/PontosCorridosCache.js";

export const salvarCachePontosCorridos = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodada, classificacao } = req.body;

        if (!rodada || !classificacao) {
            return res.status(400).json({ error: "Dados incompletos" });
        }

        // Upsert: Atualiza se existir, cria se não
        const cache = await PontosCorridosCache.findOneAndUpdate(
            { liga_id: ligaId, rodada_consolidada: rodada },
            {
                classificacao,
                ultima_atualizacao: new Date(),
            },
            { new: true, upsert: true },
        );

        console.log(
            `[CACHE-PC] Ranking da liga ${ligaId} (Rodada ${rodada}) salvo com sucesso.`,
        );
        res.json({ success: true, message: "Cache salvo", id: cache._id });
    } catch (error) {
        console.error("[CACHE-PC] Erro ao salvar:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

export const lerCachePontosCorridos = async (req, res) => {
    try {
        const { ligaId, rodada } = req.params;

        // Busca o cache da rodada específica ou o mais recente
        const query = { liga_id: ligaId };
        if (rodada) query.rodada_consolidada = Number(rodada);

        // Pega o ranking mais recente (maior rodada)
        const cache = await PontosCorridosCache.findOne(query).sort({
            rodada_consolidada: -1,
        });

        if (!cache) {
            return res.status(404).json({ cached: false });
        }

        // ✅ Validar se o cache está na rodada esperada (se rodada foi especificada)
        if (rodada && cache.rodada_consolidada !== Number(rodada)) {
            console.log(`[CACHE-PC] ⚠️ Cache desatualizado: esperava R${rodada}, tinha R${cache.rodada_consolidada}`);
            return res.status(404).json({ 
                cached: false,
                reason: 'outdated',
                cachedUntil: cache.rodada_consolidada,
                expectedUntil: Number(rodada)
            });
        }

        console.log(`[CACHE-PC] ✅ Cache válido: R${cache.rodada_consolidada}`);

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
