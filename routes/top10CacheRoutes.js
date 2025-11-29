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
router.post("/cache/:ligaId", salvarCacheTop10);

// GET /api/top10/cache/:ligaId?rodada=5 - Ler cache
router.get("/cache/:ligaId", lerCacheTop10);

// DELETE /api/top10/cache/:ligaId - Limpar cache da liga
router.delete("/cache/:ligaId", limparCacheTop10);

export default router;
