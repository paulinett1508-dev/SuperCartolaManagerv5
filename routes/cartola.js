import express from "express";
import fetch from "node-fetch";
import {
  listarClubes,
  obterTimePorId,
  obterPontuacao,
  obterEscalacao,
  getMercadoStatus,
  getParciais,
  getClubes,
  sincronizarDadosCartola,
  obterDadosCompletosCartola,
} from "../controllers/cartolaController.js";

const router = express.Router();

router.get("/clubes", listarClubes);

// ===== DADOS COMPLETOS DO TIME (PARA MODAL) =====
// IMPORTANTE: Esta rota DEVE vir ANTES de /time/:id para não ser interceptada
router.get("/time/:id/completo", obterDadosCompletosCartola);

// ===== SINCRONIZAR DADOS DO PARTICIPANTE =====
router.post("/time/:id/sincronizar", sincronizarDadosCartola);

// Rotas básicas de time
router.get("/time/:id", obterTimePorId);
router.get("/time/:id/:rodada", obterPontuacao);
router.get("/time/:id/:rodada/escalacao", obterEscalacao);
// ===== BUSCAR STATUS DO MERCADO (RODADA ATUAL) =====
router.get('/mercado-status', async (req, res) => {
    try {
        // Usar a API diretamente já que não há função específica no service
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('https://api.cartola.globo.com/mercado/status', {
            signal: controller.signal,
            headers: {
                'User-Agent': 'SuperCartolaManager/1.0'
            }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('[CARTOLA-ROUTES] Erro ao buscar mercado-status:', error.message);
        // Fallback com valores padrão para não quebrar o frontend
        res.json({
            temporada: new Date().getFullYear(),
            rodada_atual: 1,
            status_mercado: 1,
            erro_interno: true,
            mensagem: 'Usando dados de fallback'
        });
    }
});

// ===== BUSCAR STATUS DO MERCADO (RODADA ATUAL) - ROTA ALTERNATIVA =====
router.get('/status', async (req, res) => {
    try {
        const response = await fetch('https://api.cartola.globo.com/mercado/status');
        const data = await response.json();
        res.json(data);
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