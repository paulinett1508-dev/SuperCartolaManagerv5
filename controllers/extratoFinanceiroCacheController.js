
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";

// ===== BUSCAR EXTRATO EM CACHE =====
export const getExtratoCache = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;

        const cache = await ExtratoFinanceiroCache.findOne({ ligaId, timeId });

        if (!cache) {
            return res.status(404).json({ 
                cached: false,
                message: "Cache não encontrado" 
            });
        }

        res.json({
            cached: true,
            data: cache.extrato,
            metadados: cache.metadados,
            ultimaRodadaCalculada: cache.ultimaRodadaCalculada,
            updatedAt: cache.updatedAt,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao buscar cache:", error);
        res.status(500).json({ error: "Erro ao buscar cache do extrato" });
    }
};

// ===== SALVAR/ATUALIZAR CACHE =====
export const salvarExtratoCache = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { extrato, ultimaRodadaCalculada, motivoRecalculo } = req.body;

        const cacheData = {
            ligaId,
            timeId,
            ultimaRodadaCalculada,
            extrato,
            metadados: {
                versaoCalculo: "1.0.0",
                timestampCalculo: new Date(),
                motivoRecalculo: motivoRecalculo || "desconhecido",
            },
        };

        const cache = await ExtratoFinanceiroCache.findOneAndUpdate(
            { ligaId, timeId },
            cacheData,
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            message: "Cache atualizado com sucesso",
            updatedAt: cache.updatedAt,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao salvar cache:", error);
        res.status(500).json({ error: "Erro ao salvar cache do extrato" });
    }
};

// ===== INVALIDAR CACHE DE UM TIME =====
export const invalidarCacheTime = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;

        await ExtratoFinanceiroCache.findOneAndDelete({ ligaId, timeId });

        res.json({ 
            success: true, 
            message: "Cache invalidado com sucesso" 
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao invalidar cache:", error);
        res.status(500).json({ error: "Erro ao invalidar cache" });
    }
};

// ===== INVALIDAR CACHE DE TODA A LIGA =====
export const invalidarCacheLiga = async (req, res) => {
    try {
        const { ligaId } = req.params;

        const result = await ExtratoFinanceiroCache.deleteMany({ ligaId });

        res.json({
            success: true,
            message: `${result.deletedCount} caches invalidados`,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao invalidar cache da liga:", error);
        res.status(500).json({ error: "Erro ao invalidar cache da liga" });
    }
};

// ===== VERIFICAR SE CACHE ESTÁ VÁLIDO =====
export const verificarCacheValido = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { rodadaAtual } = req.query;

        const cache = await ExtratoFinanceiroCache.findOne({ ligaId, timeId });

        if (!cache) {
            return res.json({ valido: false, motivo: "cache_nao_encontrado" });
        }

        // Cache inválido se rodada atual mudou
        if (rodadaAtual && cache.ultimaRodadaCalculada < parseInt(rodadaAtual)) {
            return res.json({ 
                valido: false, 
                motivo: "rodada_desatualizada",
                cacheRodada: cache.ultimaRodadaCalculada,
                rodadaAtual: parseInt(rodadaAtual)
            });
        }

        res.json({ 
            valido: true, 
            ultimaRodada: cache.ultimaRodadaCalculada,
            updatedAt: cache.updatedAt
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao verificar cache:", error);
        res.status(500).json({ error: "Erro ao verificar cache" });
    }
};
