// routes/configuracao-routes.js
import express from 'express';
import cartolaApiService from '../services/cartolaApiService.js';
import { verificarAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/configuracao/rodada-atual
 * Retorna a rodada atual detectada dinamicamente
 */
router.get('/rodada-atual', async (req, res) => {
  try {
    console.log('[CONFIGURACAO] Buscando rodada atual dinâmica...');
    
    const rodadaAtual = await cartolaApiService.obterRodadaAtualReal();
    
    res.json({
      success: true,
      rodadaAtual: rodadaAtual,
      timestamp: new Date().toISOString(),
      fonte: 'deteccao_dinamica'
    });
    
    console.log(`[CONFIGURACAO] Rodada atual retornada: ${rodadaAtual}`);
  } catch (error) {
    console.error('[CONFIGURACAO] Erro ao obter rodada atual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter rodada atual',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/configuracao/total-rodadas
 * Retorna o total de rodadas do campeonato
 */
router.get('/total-rodadas', async (req, res) => {
  try {
    console.log('[CONFIGURACAO] Buscando total de rodadas...');
    
    const totalRodadas = cartolaApiService.obterTotalRodadas();
    
    res.json({
      success: true,
      totalRodadas: totalRodadas,
      timestamp: new Date().toISOString(),
      fonte: 'configuracao_sistema'
    });
    
    console.log(`[CONFIGURACAO] Total de rodadas retornado: ${totalRodadas}`);
  } catch (error) {
    console.error('[CONFIGURACAO] Erro ao obter total de rodadas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter total de rodadas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/configuracao/rodadas-info
 * Retorna informações completas sobre rodadas (atual e total)
 */
router.get('/rodadas-info', async (req, res) => {
  try {
    console.log('[CONFIGURACAO] Buscando informações completas de rodadas...');
    
    const rodadaAtual = await cartolaApiService.obterRodadaAtualReal();
    const totalRodadas = cartolaApiService.obterTotalRodadas();
    
    res.json({
      success: true,
      rodadaAtual: rodadaAtual,
      totalRodadas: totalRodadas,
      rodadasRestantes: totalRodadas - rodadaAtual,
      percentualConcluido: Math.round((rodadaAtual / totalRodadas) * 100),
      timestamp: new Date().toISOString(),
      fonte: 'deteccao_dinamica'
    });
    
    console.log(`[CONFIGURACAO] Informações de rodadas retornadas: atual=${rodadaAtual}, total=${totalRodadas}`);
  } catch (error) {
    console.error('[CONFIGURACAO] Erro ao obter informações de rodadas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter informações de rodadas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/configuracao/status-sistema
 * Retorna status geral do sistema de detecção dinâmica
 */
router.get('/status-sistema', async (req, res) => {
  try {
    console.log('[CONFIGURACAO] Verificando status do sistema...');
    
    const rodadaAtual = await cartolaApiService.obterRodadaAtualReal();
    const totalRodadas = cartolaApiService.obterTotalRodadas();
    const statusMercado = await cartolaApiService.obterStatusMercado();
    const statsCache = cartolaApiService.obterEstatisticasCache();
    
    res.json({
      success: true,
      sistema: {
        rodadaAtual: rodadaAtual,
        totalRodadas: totalRodadas,
        deteccaoDinamica: true,
        versao: '2.0.0'
      },
      mercado: {
        rodadaAPI: statusMercado.rodadaAtual,
        mercadoAberto: statusMercado.mercadoAberto,
        fechamento: statusMercado.fechamento
      },
      cache: {
        hits: statsCache.hits || 0,
        misses: statsCache.misses || 0,
        keys: statsCache.keys || 0
      },
      timestamp: new Date().toISOString()
    });
    
    console.log('[CONFIGURACAO] Status do sistema retornado com sucesso');
  } catch (error) {
    console.error('[CONFIGURACAO] Erro ao obter status do sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status do sistema',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/configuracao/limpar-cache
 * Limpa o cache do sistema de detecção dinâmica
 * ✅ v1.1: Adicionado verificarAdmin para segurança
 */
router.post('/limpar-cache', verificarAdmin, async (req, res) => {
  try {
    console.log('[CONFIGURACAO] Limpando cache do sistema...');
    
    cartolaApiService.limparCache();
    
    res.json({
      success: true,
      message: 'Cache limpo com sucesso',
      timestamp: new Date().toISOString()
    });
    
    console.log('[CONFIGURACAO] Cache limpo com sucesso');
  } catch (error) {
    console.error('[CONFIGURACAO] Erro ao limpar cache:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar cache',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
