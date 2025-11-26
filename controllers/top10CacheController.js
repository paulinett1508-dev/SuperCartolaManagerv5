// controllers/top10CacheController.js
import Top10Cache from "../models/Top10Cache.js";

export const salvarCacheTop10 = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodada, mitos, micos, permanent } = req.body;

        if (!rodada || !mitos || !micos) {
            return res
                .status(400)
                .json({ error: "Dados incompletos para cache" });
        }

        // Upsert: Atualiza ou Cria
        await Top10Cache.findOneAndUpdate(
            { liga_id: ligaId, rodada_consolidada: rodada },
            {
                mitos,
                micos,
                cache_permanente: permanent || false, // ✅ Marca como permanente
                ultima_atualizacao: new Date(),
            },
            { new: true, upsert: true },
        );

        const msg = permanent 
            ? `[CACHE-TOP10] Cache PERMANENTE salvo: Liga ${ligaId}, Rodada ${rodada}`
            : `[CACHE-TOP10] Cache temporário salvo: Liga ${ligaId}, Rodada ${rodada}`;
        console.log(msg);
        res.json({ success: true, permanent });
    } catch (error) {
        console.error("[CACHE-TOP10] Erro ao salvar:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

export const lerCacheTop10 = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodada } = req.query;

        const query = { liga_id: ligaId };
        if (rodada) query.rodada_consolidada = Number(rodada);

        // Busca o mais recente
        const cache = await Top10Cache.findOne(query).sort({
            rodada_consolidada: -1,
        });

        if (!cache) {
            return res.status(404).json({ cached: false });
        }

        res.json({
            cached: true,
            rodada: cache.rodada_consolidada,
            mitos: cache.mitos,
            micos: cache.micos,
            updatedAt: cache.ultima_atualizacao,
        });
    } catch (error) {
        console.error("[CACHE-TOP10] Erro ao ler:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};
