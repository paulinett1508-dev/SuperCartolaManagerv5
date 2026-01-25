/**
 * Rotas de Notificações Push
 * API para gerenciar Web Push subscriptions
 *
 * FASE 2 - Backend de Push Notifications (FEAT-003)
 */

import express from 'express';
import {
  subscribe,
  unsubscribe,
  getStatus,
  getVapidKey,
  sendManual,
  getSubscriptionStats
} from '../controllers/notificationsController.js';

const router = express.Router();

// ============================================
// ROTAS PÚBLICAS (sem autenticação)
// ============================================

/**
 * GET /api/notifications/vapid-key
 * Retorna a VAPID public key para o frontend criar subscriptions
 * Precisa ser pública para funcionar antes do login
 */
router.get('/vapid-key', getVapidKey);

// ============================================
// ROTAS PROTEGIDAS (requer participante logado)
// ============================================

/**
 * POST /api/notifications/subscribe
 * Registrar ou atualizar subscription do participante
 *
 * Body: {
 *   subscription: { endpoint, keys: { p256dh, auth } },
 *   preferences: { rodadaConsolidada, mitoMico, escalacaoPendente, acertosFinanceiros }
 * }
 */
router.post('/subscribe', subscribe);

/**
 * POST /api/notifications/unsubscribe
 * Desativar subscription do participante
 *
 * Body: { endpoint: string }
 */
router.post('/unsubscribe', unsubscribe);

/**
 * GET /api/notifications/status
 * Verificar status da subscription do participante logado
 *
 * Response: { configurado, ativo, total, preferences, ultimoUso }
 */
router.get('/status', getStatus);

// ============================================
// ROTAS ADMIN (requer admin logado)
// ============================================

/**
 * POST /api/notifications/send
 * Enviar notificação manual para participantes selecionados
 *
 * Body: {
 *   timeIds: string[],
 *   title: string,
 *   body: string,
 *   url?: string,
 *   tag?: string
 * }
 */
router.post('/send', sendManual);

/**
 * GET /api/notifications/stats
 * Estatísticas de subscriptions (apenas admin)
 */
router.get('/stats', async (req, res) => {
  try {
    // Verificar se é admin
    if (!req.session.usuario?.isAdmin) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const stats = await getSubscriptionStats();

    if (!stats) {
      return res.status(500).json({ erro: 'Erro ao obter estatísticas' });
    }

    res.json(stats);

  } catch (erro) {
    console.error('[PUSH] Erro na rota /stats:', erro);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

export default router;
