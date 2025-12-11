// =====================================================================
// rodadasCorrecaoRoutes.js
// Rotas para correção de rodadas corrompidas
// =====================================================================

import express from "express";
import {
  corrigirRodadas,
  verificarCorrompidos,
} from "../controllers/rodadasCorrecaoController.js";

const router = express.Router();

// =====================================================================
// ROTAS DE DIAGNÓSTICO
// =====================================================================

// Verificar rodadas corrompidas de uma liga
// GET /api/rodadas-correcao/:ligaId/verificar
router.get("/:ligaId/verificar", verificarCorrompidos);

// =====================================================================
// ROTAS DE CORREÇÃO
// =====================================================================

// Corrigir rodadas corrompidas
// POST /api/rodadas-correcao/:ligaId/corrigir
// Body: { rodadaInicio: 36, rodadaFim: 38 }
router.post("/:ligaId/corrigir", corrigirRodadas);

console.log("[RODADAS-CORRECAO-ROUTES] ✅ Rotas carregadas");

export default router;
