/**
 * Rotas de Análises IA - Interface Admin
 * Endpoints para solicitar e gerenciar análises via LLM
 */

import express from 'express';
import { rateLimitIA, checkRateLimitStatus, resetRateLimits } from '../middlewares/rateLimitIA.js';
import {
  solicitarNovaAnalise,
  listarAnalises,
  buscarAnalisePorId,
  deletarAnalise,
  avaliarAnalise,
  obterEstatisticas,
  limparCacheAnalises
} from '../controllers/iaAnalysisController.js';

const router = express.Router();

// Middleware: verificar se é admin (assumindo que já existe no projeto)
// Se não existir, criar middleware simples
function isAdminAuthorized(req, res, next) {
  if (!req.session?.admin?.email) {
    return res.status(401).json({
      success: false,
      error: 'Acesso restrito a administradores'
    });
  }
  next();
}

// ============================================
// ROTAS PÚBLICAS (ADMIN)
// ============================================

// Verificar status de rate limit (sem consumir)
router.get('/rate-limit/status', isAdminAuthorized, checkRateLimitStatus);

// ============================================
// ROTAS PROTEGIDAS (ADMIN + RATE LIMIT)
// ============================================

// Solicitar nova análise
router.post('/solicitar', isAdminAuthorized, rateLimitIA, solicitarNovaAnalise);

// Listar histórico de análises
router.get('/historico', isAdminAuthorized, listarAnalises);

// Buscar análise específica
router.get('/:id', isAdminAuthorized, buscarAnalisePorId);

// Deletar análise
router.delete('/:id', isAdminAuthorized, deletarAnalise);

// Avaliar análise (feedback)
router.post('/:id/avaliar', isAdminAuthorized, avaliarAnalise);

// Estatísticas de uso
router.get('/stats/estatisticas', isAdminAuthorized, obterEstatisticas);

// ============================================
// ROTAS ADMINISTRATIVAS (SUPER ADMIN)
// ============================================

// Limpar cache (dev/super admin)
router.post('/admin/limpar-cache', isAdminAuthorized, limparCacheAnalises);

// Resetar rate limits (dev/super admin)
router.post('/admin/reset-rate-limits', isAdminAuthorized, resetRateLimits);

export default router;
