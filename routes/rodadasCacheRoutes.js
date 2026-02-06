// =====================================================================
// rodadasCacheRoutes.js v1.1 - SEGURO
// Rotas de Recálculo e Estatísticas (SEM funções destrutivas)
// =====================================================================

import express from "express";
import {
  recalcularRodadas,
  estatisticasCache,
} from "../controllers/rodadasCacheController.js";

const router = express.Router();

// =====================================================================
// ROTAS DE RECÁLCULO (SEGURAS - APENAS ATUALIZAM CAMPOS)
// =====================================================================

// Recalcular rodadas de uma liga
// POST /api/rodadas-cache/:ligaId/recalcular
// Body: { rodadaInicio: 1, rodadaFim: 38, temporada?: 2025 }
router.post("/:ligaId/recalcular", recalcularRodadas);

// =====================================================================
// ROTAS DE ESTATÍSTICAS (APENAS LEITURA)
// =====================================================================

// Estatísticas gerais de cache (todas as ligas)
// GET /api/rodadas-cache/stats
router.get("/stats", estatisticasCache);

// Estatísticas de uma liga específica
// GET /api/rodadas-cache/:ligaId/stats
router.get("/:ligaId/stats", estatisticasCache);

// =====================================================================
// ROTAS DESTRUTIVAS REMOVIDAS POR SEGURANÇA
// =====================================================================
// ❌ DELETE /api/rodadas-cache/:ligaId/limpar - REMOVIDA
// ❌ DELETE /api/rodadas-cache/:ligaId/corrompidos/limpar - REMOVIDA
// ❌ DELETE /api/rodadas-cache/:ligaId/times/:timeId/limpar - REMOVIDA
// ❌ DELETE /api/rodadas-cache/corrompidos/limpar - REMOVIDA
// ❌ DELETE /api/rodadas-cache/todos/limpar - REMOVIDA
//
// Razão: Funções destrutivas que apagavam dados permanentes foram
// removidas para evitar perda acidental de dados históricos.
// =====================================================================

console.log(
  "[RODADAS-CACHE-ROUTES] ✅ Rotas seguras carregadas (funções destrutivas removidas)",
);

export default router;
