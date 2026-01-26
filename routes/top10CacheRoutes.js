// routes/top10CacheRoutes.js
import express from "express";
import {
    salvarCacheTop10,
    lerCacheTop10,
    limparCacheTop10,
} from "../controllers/top10CacheController.js";

const router = express.Router();

// Rotas para cache do Top 10
// POST /api/top10/cache/:ligaId - Salvar cache
// Body: { rodada, mitos, micos, permanent?, temporada? }
router.post("/cache/:ligaId", salvarCacheTop10);

// GET /api/top10/cache/:ligaId?rodada=5&temporada=2026 - Ler cache
// Query: rodada (opcional), temporada (opcional, default=CURRENT_SEASON)
router.get("/cache/:ligaId", lerCacheTop10);

// DELETE /api/top10/cache/:ligaId?temporada=2026&all=true - Limpar cache
// Query: temporada (opcional), all=true para limpar todas temporadas
router.delete("/cache/:ligaId", limparCacheTop10);

export default router;
