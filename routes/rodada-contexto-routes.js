// =====================================================================
// rodada-contexto-routes.js - Rotas do Contexto de Rodada
// =====================================================================

import express from "express";
import { obterContextoRodada } from "../controllers/rodadaContextoController.js";

const router = express.Router();

// GET /api/rodada-contexto/:ligaId/:rodada/:timeId
// Retorna contexto completo de disputas internas (foco em liga, não escalação)
router.get("/:ligaId/:rodada/:timeId", obterContextoRodada);

console.log("[RODADA-CONTEXTO-ROUTES] ✅ Rotas carregadas");

export default router;
