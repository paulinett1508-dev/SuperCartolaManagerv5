// routes/matchday-routes.js - Rotas do Modo Matchday
import express from 'express';
import cartolaApiService from '../services/cartolaApiService.js';
import { buscarRankingParcial } from '../services/parciaisRankingService.js';

const router = express.Router();

/**
 * GET /api/matchday/status
 * Retorna status do mercado (proxy para API Cartola)
 */
router.get('/status', async (req, res) => {
  try {
    const status = await cartolaApiService.obterStatusMercado();

    // Matchday ativo quando mercado fechado (status_mercado === 2)
    const matchdayAtivo = status.status_mercado === 2;

    res.json({
      success: true,
      matchday_ativo: matchdayAtivo,
      rodada_atual: status.rodadaAtual,
      mercado_aberto: status.mercadoAberto,
      status_mercado: status.status_mercado
    });
  } catch (error) {
    console.error('[MATCHDAY] Erro obterStatus:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/matchday/parciais/:ligaId
 * Retorna parciais da liga (reusa parciaisRankingService)
 */
router.get('/parciais/:ligaId', async (req, res) => {
  try {
    const { ligaId } = req.params;

    if (!ligaId) {
      return res.status(400).json({ success: false, error: 'ligaId obrigatório' });
    }

    const parciais = await buscarRankingParcial(ligaId);

    res.json(parciais);
  } catch (error) {
    console.error('[MATCHDAY] Erro parciais:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
