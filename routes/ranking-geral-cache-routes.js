
// routes/ranking-geral-cache-routes.js
import express from "express";
import { 
  buscarRankingConsolidado, 
  invalidarCacheRanking 
} from "../controllers/rankingGeralCacheController.js";

const router = express.Router();

// GET /api/ranking-cache/:ligaId - Buscar ranking consolidado
router.get("/:ligaId", buscarRankingConsolidado);

// DELETE /api/ranking-cache/:ligaId - Invalidar cache
router.delete("/:ligaId", invalidarCacheRanking);

export default router;
