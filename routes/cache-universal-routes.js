
import express from "express";

const router = express.Router();

// ===== ENDPOINT UNIVERSAL DE CACHE =====
// Serve: Extrato, Ranking, Rodadas, Top10, Mata-Mata, Pontos Corridos, etc.

router.get("/:ligaId/modulo/:moduloNome/cache", async (req, res) => {
    try {
        const { ligaId, moduloNome } = req.params;
        const { rodadaAtual, mercadoAberto } = req.query;

        // Mapear módulo para collection
        const collections = {
            'extrato': 'ExtratoFinanceiroCache',
            'ranking': 'RankingCache',
            'top10': 'Top10Cache',
            'matamata': 'MataMataCache',
            'pontoscorridos': 'PontosCorridosCache',
            'rodadas': 'RodadasCache',
        };

        const collectionName = collections[moduloNome.toLowerCase()];
        if (!collectionName) {
            return res.status(400).json({ error: "Módulo inválido" });
        }

        // Buscar cache (implementação específica por módulo)
        // ... lógica similar ao extrato

        res.json({
            cached: true,
            permanente: mercadoAberto !== 'true',
            modulo: moduloNome,
            data: {}, // dados do cache
        });
    } catch (error) {
        console.error("[CACHE-UNIVERSAL] Erro:", error);
        res.status(500).json({ error: "Erro ao buscar cache" });
    }
});

export default router;
