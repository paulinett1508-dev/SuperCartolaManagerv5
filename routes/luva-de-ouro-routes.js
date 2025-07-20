// routes/luva-de-ouro-routes.js
import express from "express";
import LuvaDeOuroController from "../controllers/luvaDeOuroController.js";

const router = express.Router();

// Rota principal: obter ranking de goleiros
router.get("/:ligaId/ranking", LuvaDeOuroController.obterRanking);

// Rota para coletar dados específicos
router.get("/:ligaId/coletar", LuvaDeOuroController.coletarDados);

// Rota para detectar última rodada concluída
router.get("/:ligaId/detectar-rodada", LuvaDeOuroController.detectarRodada);

// Rota para obter estatísticas gerais
router.get("/:ligaId/estatisticas", LuvaDeOuroController.obterEstatisticas);

// Rota para listar participantes válidos
router.get("/:ligaId/participantes", LuvaDeOuroController.listarParticipantes);

export default router;
