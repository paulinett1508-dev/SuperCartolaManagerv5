// routes/artilheiro-campeao-routes.js - VERSÃO 5.2
// Rotas do módulo Artilheiro Campeão com persistência MongoDB
// ✅ v5.2: Session validation, audit logging, premiação endpoint

import express from "express";
import ArtilheiroCampeaoController from "../controllers/artilheiroCampeaoController.js";

const router = express.Router();

console.log("🚀 [ROUTES] Carregando rotas do Artilheiro Campeão v5.2...");

// ========================================
// ROTAS PÚBLICAS (GET)
// ========================================

router.get("/:ligaId/ranking", async (req, res) => {
    await ArtilheiroCampeaoController.obterRanking(req, res);
});

router.get("/:ligaId/detectar-rodada", async (req, res) => {
    await ArtilheiroCampeaoController.detectarRodada(req, res);
});

router.get("/:ligaId/estatisticas", async (req, res) => {
    await ArtilheiroCampeaoController.obterEstatisticas(req, res);
});

router.get("/:ligaId/participantes", async (req, res) => {
    await ArtilheiroCampeaoController.listarParticipantes(req, res);
});

router.get("/:ligaId/time/:timeId", async (req, res) => {
    await ArtilheiroCampeaoController.getDetalheTime(req, res);
});

// ========================================
// ROTAS ADMIN (POST/DELETE - requerem sessão)
// ========================================

router.post("/:ligaId/consolidar/:rodada", async (req, res) => {
    await ArtilheiroCampeaoController.consolidarRodada(req, res);
});

router.post("/:ligaId/coletar/:rodada", async (req, res) => {
    await ArtilheiroCampeaoController.coletarRodada(req, res);
});

// ✅ v5.2: Endpoint de premiação no extrato financeiro
router.post("/:ligaId/premiar", async (req, res) => {
    await ArtilheiroCampeaoController.consolidarPremiacao(req, res);
});

router.delete("/:ligaId/cache", async (req, res) => {
    await ArtilheiroCampeaoController.limparCache(req, res);
});

// ========================================
// ROTAS DE COMPATIBILIDADE (v1.x/v2.x)
// ========================================

router.get("/:ligaId/acumulado", async (req, res) => {
    await ArtilheiroCampeaoController.obterRanking(req, res);
});

console.log("✅ [ROUTES] Rotas do Artilheiro Campeão v5.2 carregadas!");

export default router;
