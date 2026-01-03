// controllers/top10CacheController.js
import Top10Cache from "../models/Top10Cache.js";
import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;

export const salvarCacheTop10 = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodada, mitos, micos, permanent } = req.body;
        if (!rodada || !mitos || !micos) {
            return res
                .status(400)
                .json({ error: "Dados incompletos para cache" });
        }
        // Converter para ObjectId se for um ID válido
        const ligaIdQuery = ObjectId.isValid(ligaId) ? new ObjectId(ligaId) : ligaId;
        // Upsert: Atualiza ou Cria
        await Top10Cache.findOneAndUpdate(
            { liga_id: ligaIdQuery, rodada_consolidada: rodada },
            {
                mitos,
                micos,
                cache_permanente: permanent || false,
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
        // Converter para ObjectId se for um ID válido
        const ligaIdQuery = ObjectId.isValid(ligaId) ? new ObjectId(ligaId) : ligaId;
        const query = { liga_id: ligaIdQuery };
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

export const limparCacheTop10 = async (req, res) => {
    try {
        const { ligaId } = req.params;
        // Converter para ObjectId se for um ID válido
        const ligaIdQuery = ObjectId.isValid(ligaId) ? new ObjectId(ligaId) : ligaId;
        const result = await Top10Cache.deleteMany({ liga_id: ligaIdQuery });
        console.log(
            `[CACHE-TOP10] Cache limpo: Liga ${ligaId}, ${result.deletedCount} registros removidos`,
        );
        res.json({
            success: true,
            message: `Cache limpo para liga ${ligaId}`,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        console.error("[CACHE-TOP10] Erro ao limpar:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};
