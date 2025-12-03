// routes/pontosCorridosCacheRoutes.js
import express from "express";
import {
    salvarCachePontosCorridos,
    lerCachePontosCorridos,


// Rota para BUSCAR CONFRONTOS completos (GET)
// Ex: GET /api/pontos-corridos/684cb1c8af923da7c7df51de
import { obterConfrontosPontosCorridos } from "../controllers/pontosCorridosCacheController.js";

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


} from "../controllers/pontosCorridosCacheController.js";

const router = express.Router();

// Rota para SALVAR o snapshot (POST)
// Ex: POST /api/pontos-corridos/cache/684d821cf1a7ae16d1f89572
router.post("/cache/:ligaId", salvarCachePontosCorridos);

// Rota para LER o snapshot (GET)
// Ex: GET /api/pontos-corridos/cache/684d821cf1a7ae16d1f89572?rodada=5
router.get("/cache/:ligaId", lerCachePontosCorridos);

export default router;
