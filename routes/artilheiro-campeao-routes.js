// routes/artilheiro-campeao-routes.js - VERSÃO 4.0
// Rotas do módulo Artilheiro Campeão com persistência MongoDB

import express from "express";
import ArtilheiroCampeaoController from "../controllers/artilheiroCampeaoController.js";

const router = express.Router();

console.log("🚀 [ROUTES] Carregando rotas do Artilheiro Campeão v4.0...");

// ========================================
// ROTAS PRINCIPAIS
// ========================================

/**
 * GET /:ligaId/ranking
 * Retorna ranking completo com dados consolidados + parciais
 */
router.get("/:ligaId/ranking", async (req, res) => {
    await ArtilheiroCampeaoController.obterRanking(req, res);
});

/**
 * GET /:ligaId/detectar-rodada
 * Detecta rodada atual e status do mercado
 */
router.get("/:ligaId/detectar-rodada", async (req, res) => {
    await ArtilheiroCampeaoController.detectarRodada(req, res);
});

/**
 * GET /:ligaId/estatisticas
 * Retorna estatísticas do MongoDB
 */
router.get("/:ligaId/estatisticas", async (req, res) => {
    await ArtilheiroCampeaoController.obterEstatisticas(req, res);
});

/**
 * GET /:ligaId/participantes
 * Lista participantes da liga
 */
router.get("/:ligaId/participantes", async (req, res) => {
    await ArtilheiroCampeaoController.listarParticipantes(req, res);
});

/**
 * POST /:ligaId/consolidar/:rodada
 * ✅ NOVO: Consolida rodada (marca como não-parcial)
 * Chamado quando mercado abre após rodada fechar
 */
router.post("/:ligaId/consolidar/:rodada", async (req, res) => {
    await ArtilheiroCampeaoController.consolidarRodada(req, res);
});

/**
 * POST /:ligaId/coletar/:rodada
 * Força coleta de uma rodada específica (recalcula e salva no MongoDB)
 */
router.post("/:ligaId/coletar/:rodada", async (req, res) => {
    await ArtilheiroCampeaoController.coletarRodada(req, res);
});

// ========================================
// ROTAS DE COMPATIBILIDADE (v1.x/v2.x)
// ========================================

router.get("/:ligaId/acumulado", async (req, res) => {
    await ArtilheiroCampeaoController.obterRanking(req, res);
});

console.log("✅ [ROUTES] Rotas do Artilheiro Campeão v4.0 carregadas!");

export default router;
