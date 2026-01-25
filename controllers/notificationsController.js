/**
 * Controller de Notificações Push
 * Gerencia Web Push subscriptions e envio de notificações
 *
 * FASE 2 - Backend de Push Notifications (FEAT-003)
 */

import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

// ============================================
// CONFIGURAÇÃO VAPID
// ============================================

// Verificar se as keys estão configuradas
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@supercartolamanager.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('[PUSH] VAPID configurado com sucesso');
} else {
  console.warn('[PUSH] ⚠️ VAPID keys não configuradas. Push notifications desabilitadas.');
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Verifica se o sistema de push está configurado
 */
const isPushConfigured = () => {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
};

/**
 * Obtém o timeId da sessão (participante ou admin)
 * Compatível com diferentes estruturas de sessão
 */
const getTimeIdFromSession = (req) => {
  // Sessão de participante
  if (req.session?.participante?.timeId) {
    return req.session.participante.timeId;
  }
  // Fallback para estrutura alternativa
  if (req.session?.usuario?.time_id) {
    return req.session.usuario.time_id;
  }
  return null;
};

/**
 * Verifica se é admin
 */
const isAdmin = (req) => {
  return !!(req.session?.admin);
};

// ============================================
// HANDLERS DE ROTA (req, res)
// ============================================

/**
 * Salvar/atualizar subscription do participante
 * POST /api/notifications/subscribe
 */
export const subscribe = async (req, res) => {
  try {
    if (!isPushConfigured()) {
      return res.status(503).json({ erro: 'Push notifications não configurado' });
    }

    const { subscription, preferences } = req.body;
    const timeId = getTimeIdFromSession(req);

    if (!timeId) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ erro: 'Subscription inválida' });
    }

    if (!subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({ erro: 'Keys da subscription inválidas' });
    }

    // Verificar se já existe subscription para este endpoint
    let existing = await PushSubscription.findOne({
      endpoint: subscription.endpoint
    });

    if (existing) {
      // Atualizar subscription existente
      existing.timeId = String(timeId);
      existing.keys = subscription.keys;
      existing.preferences = { ...existing.preferences, ...preferences };
      existing.active = true;
      existing.lastUsed = new Date();
      await existing.save();

      console.log(`[PUSH] Subscription atualizada para timeId ${timeId}`);

      return res.json({
        sucesso: true,
        mensagem: 'Preferências atualizadas',
        subscription: {
          id: existing._id,
          active: existing.active,
          preferences: existing.preferences
        }
      });
    }

    // Criar nova subscription
    const newSubscription = new PushSubscription({
      timeId: String(timeId),
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      preferences: preferences || {},
      active: true,
      createdAt: new Date(),
      lastUsed: new Date()
    });

    await newSubscription.save();

    console.log(`[PUSH] Nova subscription criada para timeId ${timeId}`);

    res.json({
      sucesso: true,
      mensagem: 'Notificações ativadas!',
      subscription: {
        id: newSubscription._id,
        active: newSubscription.active,
        preferences: newSubscription.preferences
      }
    });

  } catch (erro) {
    console.error('[PUSH] Erro ao salvar subscription:', erro);

    // Tratar erro de duplicidade (endpoint já existe)
    if (erro.code === 11000) {
      return res.status(400).json({ erro: 'Subscription já registrada' });
    }

    res.status(500).json({ erro: 'Erro ao ativar notificações' });
  }
};

/**
 * Remover/desativar subscription
 * POST /api/notifications/unsubscribe
 */
export const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    const timeId = getTimeIdFromSession(req);

    if (!timeId) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    if (!endpoint) {
      return res.status(400).json({ erro: 'Endpoint não informado' });
    }

    const result = await PushSubscription.findOneAndUpdate(
      { endpoint, timeId: String(timeId) },
      { active: false, lastUsed: new Date() }
    );

    if (!result) {
      return res.status(404).json({ erro: 'Subscription não encontrada' });
    }

    console.log(`[PUSH] Subscription desativada para timeId ${timeId}`);

    res.json({ sucesso: true, mensagem: 'Notificações desativadas' });

  } catch (erro) {
    console.error('[PUSH] Erro ao remover subscription:', erro);
    res.status(500).json({ erro: 'Erro ao desativar notificações' });
  }
};

/**
 * Verificar status da subscription do participante
 * GET /api/notifications/status
 */
export const getStatus = async (req, res) => {
  try {
    const timeId = getTimeIdFromSession(req);

    if (!timeId) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    const subscriptions = await PushSubscription.find({
      timeId: String(timeId),
      active: true
    }).select('preferences createdAt lastUsed');

    res.json({
      configurado: isPushConfigured(),
      ativo: subscriptions.length > 0,
      total: subscriptions.length,
      preferences: subscriptions[0]?.preferences || {
        rodadaConsolidada: true,
        mitoMico: true,
        escalacaoPendente: false,
        acertosFinanceiros: false
      },
      ultimoUso: subscriptions[0]?.lastUsed || null
    });

  } catch (erro) {
    console.error('[PUSH] Erro ao verificar status:', erro);
    res.status(500).json({ erro: 'Erro ao verificar status' });
  }
};

/**
 * Retornar VAPID public key para o frontend
 * GET /api/notifications/vapid-key
 */
export const getVapidKey = (req, res) => {
  if (!isPushConfigured()) {
    return res.status(503).json({
      erro: 'Push notifications não configurado',
      publicKey: null
    });
  }

  res.json({
    publicKey: VAPID_PUBLIC_KEY
  });
};

/**
 * Envio manual pelo admin
 * POST /api/notifications/send
 */
export const sendManual = async (req, res) => {
  try {
    if (!isPushConfigured()) {
      return res.status(503).json({ erro: 'Push notifications não configurado' });
    }

    // Verificar se é admin
    if (!isAdmin(req)) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const { timeIds, title, body, url, tag } = req.body;

    if (!timeIds || !Array.isArray(timeIds) || timeIds.length === 0) {
      return res.status(400).json({ erro: 'timeIds é obrigatório' });
    }

    if (!title || !body) {
      return res.status(400).json({ erro: 'title e body são obrigatórios' });
    }

    const payload = {
      title,
      body,
      url: url || '/participante/home',
      tag: tag || 'admin-manual',
      timestamp: Date.now()
    };

    const stats = await sendBulkNotifications(timeIds, payload);

    res.json({
      sucesso: true,
      mensagem: `Notificações enviadas: ${stats.enviadas} sucesso, ${stats.erros} erros`,
      stats
    });

  } catch (erro) {
    console.error('[PUSH] Erro ao enviar manual:', erro);
    res.status(500).json({ erro: 'Erro ao enviar notificações' });
  }
};

// ============================================
// FUNÇÕES DE ENVIO (internas, sem req/res)
// ============================================

/**
 * Enviar notificação para um participante específico
 * @param {string} timeId - ID do participante
 * @param {object} payload - Dados da notificação {title, body, url, tag, ...}
 * @returns {object} Stats {enviadas, erros}
 */
export const sendPushNotification = async (timeId, payload) => {
  if (!isPushConfigured()) {
    console.warn('[PUSH] Sistema não configurado, ignorando envio');
    return { enviadas: 0, erros: 0 };
  }

  try {
    const subscriptions = await PushSubscription.find({
      timeId: String(timeId),
      active: true
    });

    if (subscriptions.length === 0) {
      console.log(`[PUSH] Nenhuma subscription ativa para timeId ${timeId}`);
      return { enviadas: 0, erros: 0 };
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth
              }
            },
            JSON.stringify(payload)
          );

          // Atualizar lastUsed
          sub.lastUsed = new Date();
          await sub.save();

          return { sucesso: true };

        } catch (erro) {
          console.error(`[PUSH] Erro ao enviar para endpoint:`, erro.statusCode || erro.message);

          // Se subscription expirou ou foi revogada (410 Gone, 404 Not Found)
          if (erro.statusCode === 410 || erro.statusCode === 404) {
            console.log(`[PUSH] Subscription inválida (${erro.statusCode}), desativando...`);
            sub.active = false;
            await sub.save();
          }

          return { sucesso: false, erro: erro.message };
        }
      })
    );

    const stats = results.reduce(
      (acc, result) => {
        if (result.status === 'fulfilled' && result.value.sucesso) {
          acc.enviadas++;
        } else {
          acc.erros++;
        }
        return acc;
      },
      { enviadas: 0, erros: 0 }
    );

    console.log(`[PUSH] Enviado para timeId ${timeId}:`, stats);
    return stats;

  } catch (erro) {
    console.error('[PUSH] Erro ao enviar notificação:', erro);
    return { enviadas: 0, erros: 1 };
  }
};

/**
 * Enviar notificações em lote para múltiplos participantes
 * @param {string[]} timeIds - Lista de IDs dos participantes
 * @param {object|function} payloadOrFn - Payload fixo ou função que gera payload por timeId
 * @returns {object} Stats totais {enviadas, erros}
 */
export const sendBulkNotifications = async (timeIds, payloadOrFn) => {
  if (!isPushConfigured()) {
    console.warn('[PUSH] Sistema não configurado, ignorando envio em lote');
    return { enviadas: 0, erros: 0 };
  }

  try {
    const results = await Promise.allSettled(
      timeIds.map(async (timeId) => {
        // Se payloadOrFn for função, executar para obter payload personalizado
        const payload = typeof payloadOrFn === 'function'
          ? await payloadOrFn(timeId)
          : payloadOrFn;

        // Se payload for null, pular este participante
        if (!payload) {
          return { enviadas: 0, erros: 0 };
        }

        return sendPushNotification(timeId, payload);
      })
    );

    const totalStats = results.reduce(
      (acc, result) => {
        if (result.status === 'fulfilled') {
          acc.enviadas += result.value.enviadas || 0;
          acc.erros += result.value.erros || 0;
        } else {
          acc.erros++;
        }
        return acc;
      },
      { enviadas: 0, erros: 0 }
    );

    console.log('[PUSH] Total em lote:', totalStats);
    return totalStats;

  } catch (erro) {
    console.error('[PUSH] Erro ao enviar lote:', erro);
    return { enviadas: 0, erros: timeIds.length };
  }
};

// ============================================
// FUNÇÕES DE MANUTENÇÃO
// ============================================

/**
 * Limpar subscriptions expiradas e inativas antigas
 * Executar via cron job (semanalmente)
 */
export const cleanExpiredSubscriptions = async () => {
  if (!isPushConfigured()) {
    return 0;
  }

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await PushSubscription.deleteMany({
      $or: [
        // Expiradas pelo TTL
        { expiresAt: { $lt: new Date(), $ne: null } },
        // Inativas há mais de 90 dias
        { active: false, lastUsed: { $lt: ninetyDaysAgo } }
      ]
    });

    console.log(`[PUSH] Limpeza: ${result.deletedCount} subscriptions removidas`);
    return result.deletedCount;

  } catch (erro) {
    console.error('[PUSH] Erro ao limpar subscriptions:', erro);
    return 0;
  }
};

/**
 * Obter estatísticas de subscriptions
 * Útil para monitoramento/admin
 */
export const getSubscriptionStats = async () => {
  try {
    const [total, ativas, porPreferencia] = await Promise.all([
      PushSubscription.countDocuments(),
      PushSubscription.countDocuments({ active: true }),
      PushSubscription.aggregate([
        { $match: { active: true } },
        {
          $group: {
            _id: null,
            rodadaConsolidada: { $sum: { $cond: ['$preferences.rodadaConsolidada', 1, 0] } },
            mitoMico: { $sum: { $cond: ['$preferences.mitoMico', 1, 0] } },
            escalacaoPendente: { $sum: { $cond: ['$preferences.escalacaoPendente', 1, 0] } },
            acertosFinanceiros: { $sum: { $cond: ['$preferences.acertosFinanceiros', 1, 0] } }
          }
        }
      ])
    ]);

    return {
      total,
      ativas,
      inativas: total - ativas,
      preferencias: porPreferencia[0] || {
        rodadaConsolidada: 0,
        mitoMico: 0,
        escalacaoPendente: 0,
        acertosFinanceiros: 0
      }
    };

  } catch (erro) {
    console.error('[PUSH] Erro ao obter stats:', erro);
    return null;
  }
};

// ============================================
// EXPORT DEFAULT PARA CONVENIÊNCIA
// ============================================

export default {
  // Handlers de rota
  subscribe,
  unsubscribe,
  getStatus,
  getVapidKey,
  sendManual,

  // Funções de envio
  sendPushNotification,
  sendBulkNotifications,

  // Manutenção
  cleanExpiredSubscriptions,
  getSubscriptionStats,

  // Utils
  isPushConfigured
};
