// =====================================================================
// rodada-xray-routes.js - Rotas do Raio-X da Rodada
// =====================================================================

import express from "express";
import { obterRaioXRodada } from "../controllers/rodadaXrayController.js";

const router = express.Router();

// GET /api/rodada-xray/:ligaId/:rodada/:timeId
// Retorna análise detalhada (raio-x) de uma rodada para um time
router.get("/:ligaId/:rodada/:timeId", obterRaioXRodada);

console.log("[RODADA-XRAY-ROUTES] ✅ Rotas carregadas");

export default router;
