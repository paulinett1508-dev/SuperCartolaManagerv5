// routes/ranking-turno-routes.js
import express from "express";
import { 
    getRankingTurno, 
    consolidarTurnos,
    limparCache 
} from "../controllers/rankingTurnoController.js";

const router = express.Router();

console.log("[ROUTES] 🏆 Carregando rotas de Ranking por Turno...");

// GET /api/ranking-turno/:ligaId?turno=1|2|geral
// Busca ranking de um turno específico
router.get("/:ligaId", getRankingTurno);

// POST /api/ranking-turno/:ligaId/consolidar
// Força reconsolidação de todos os turnos
router.post("/:ligaId/consolidar", consolidarTurnos);

// DELETE /api/ranking-turno/:ligaId/cache
// Invalida cache de turnos não consolidados
router.delete("/:ligaId/cache", limparCache);

console.log("[ROUTES] ✅ Rotas de Ranking por Turno carregadas");

export default router;