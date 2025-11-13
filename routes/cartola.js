import express from "express";
import {
  listarClubes,
  obterTimePorId,
  obterPontuacao,
  obterEscalacao,
  getMercadoStatus,
  getParciais,
  getClubes,
} from "../controllers/cartolaController.js";
import cartolaService from '../services/cartolaService.js'; // Importar o serviço

const router = express.Router();

router.get("/clubes", listarClubes);
router.get("/time/:id", obterTimePorId);
router.get("/time/:id/:rodada", obterPontuacao);
router.get("/time/:id/:rodada/escalacao", obterEscalacao);
// ===== BUSCAR STATUS DO MERCADO (RODADA ATUAL) =====
router.get('/mercado-status', async (req, res) => {
    try {
        const mercadoStatus = await cartolaService.obterMercadoStatus();
        res.json(mercadoStatus);
    } catch (error) {
        console.error('[CARTOLA-ROUTES] Erro ao buscar mercado-status:', error);
        res.status(500).json({
            erro: 'Erro ao buscar status do mercado',
            rodada_atual: 1 // Fallback
        });
    }
});

// ===== BUSCAR STATUS DO MERCADO (RODADA ATUAL) - ROTA ALTERNATIVA =====
router.get('/status', async (req, res) => {
    try {
        const mercadoStatus = await cartolaService.obterMercadoStatus();
        res.json(mercadoStatus);
    } catch (error) {
        console.error('[CARTOLA-ROUTES] Erro ao buscar mercado-status:', error);
        res.status(500).json({
            erro: 'Erro ao buscar status do mercado',
            rodada_atual: 1 // Fallback
        });
    }
});
router.get("/version", (req, res) =>
  res.status(200).json({ version: "1.0.0" }),
);

export default router;