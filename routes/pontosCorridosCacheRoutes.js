
// routes/pontosCorridosCacheRoutes.js
import express from "express";
import {
    salvarCachePontosCorridos,
    lerCachePontosCorridos,
    obterConfrontosPontosCorridos
} from "../controllers/pontosCorridosCacheController.js";
import { buscarConfigSimplificada } from "../utils/moduleConfigHelper.js";
import { CURRENT_SEASON } from "../config/seasons.js";

const router = express.Router();

// Rota para BUSCAR CONFIGURAÇÃO do módulo (GET)
// Ex: GET /api/pontos-corridos/config/684cb1c8af923da7c7df51de?temporada=2026
router.get("/config/:ligaId", async (req, res) => {
    try {
        const { ligaId } = req.params;
        const temporada = req.query.temporada ? Number(req.query.temporada) : CURRENT_SEASON;

        console.log(`[API-PC-CONFIG] 🔍 Buscando config: Liga ${ligaId}, Temporada ${temporada}`);

        const config = await buscarConfigSimplificada(ligaId, 'pontos_corridos', temporada);

        res.json({
            success: true,
            config,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("[API-PC-CONFIG] ❌ Erro ao buscar configuração:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar configuração do módulo",
            message: error.message
        });
    }
});

// Rota para BUSCAR CONFRONTOS completos (GET)
// Ex: GET /api/pontos-corridos/684cb1c8af923da7c7df51de
router.get("/:ligaId", async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodada } = req.query; // opcional: filtrar por rodada específica

        // Buscar confrontos do cache ou calcular
        const confrontos = await obterConfrontosPontosCorridos(ligaId, rodada);

        res.json(confrontos);
    } catch (error) {
        console.error("[PONTOS-CORRIDOS] Erro ao buscar confrontos:", error);
        res.status(500).json({ error: "Erro ao buscar confrontos" });
    }
});

// Rota para SALVAR o snapshot (POST)
// Ex: POST /api/pontos-corridos/cache/684d821cf1a7ae16d1f89572
router.post("/cache/:ligaId", salvarCachePontosCorridos);

// Rota para LER o snapshot (GET)
// Ex: GET /api/pontos-corridos/cache/684d821cf1a7ae16d1f89572?rodada=5
router.get("/cache/:ligaId", lerCachePontosCorridos);

export default router;
