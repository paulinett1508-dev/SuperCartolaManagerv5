// =====================================================================
// rodadas-routes.js - Rotas de Rodadas
// Compatível com rodadaController.js v2.2
// =====================================================================

import express from "express";
import {
  popularRodadas,
  obterRodadas,
  criarIndiceUnico,
} from "../controllers/rodadaController.js";

const router = express.Router();

// =====================================================================
// ROTAS DE CONSULTA (GET)
// =====================================================================

// Obter rodadas de uma liga
// GET /api/rodadas/:ligaId/rodadas?rodada=X
// GET /api/rodadas/:ligaId/rodadas?inicio=X&fim=Y
router.get("/:ligaId/rodadas", obterRodadas);

// =====================================================================
// ROTAS DE POPULAÇÃO (POST)
// =====================================================================

// Popular rodadas a partir da API do Cartola FC
// POST /api/rodadas/:ligaId/rodadas
// Body: { rodada: 38 } OU { inicio: 1, fim: 38, repopular: true }
router.post("/:ligaId/rodadas", popularRodadas);

// =====================================================================
// ROTAS DE CONFIGURAÇÃO
// =====================================================================

// Criar índice único (ligaId + rodada + timeId)
// POST /api/rodadas/criar-indice-unico
router.post("/criar-indice-unico", criarIndiceUnico);

console.log("[RODADAS-ROUTES] ✅ Rotas carregadas");

export default router;
