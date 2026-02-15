/**
 * Rate Limit Middleware para Análises IA
 *
 * Protege contra abuso da API Claude (custo alto)
 *
 * Limites:
 * - 10 análises/hora por admin
 * - 50 análises/dia no total (global)
 * - 100 análises/dia por admin (acumulado)
 */

import NodeCache from 'node-cache';

// Cache para contadores de rate limit
// TTL de 1 hora para limites horários
const hourlyCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// TTL de 24 horas para limites diários
const dailyCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

// Configuração de limites
const LIMITS = {
  perAdminPerHour: 10,
  perAdminPerDay: 100,
  globalPerDay: 50
};

// Obter chave de cache para admin
function getAdminKey(adminEmail, type = 'hourly') {
  return `${type}:${adminEmail}`;
}

// Obter chave global
function getGlobalKey() {
  return 'global:daily';
}

/**
 * Middleware de rate limiting
 */
export function rateLimitIA(req, res, next) {
  try {
    const adminEmail = req.session?.admin?.email || 'unknown';

    // Validar sessão admin
    if (!req.session?.admin?.email) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida ou expirada'
      });
    }

    // Chaves de cache
    const hourlyKey = getAdminKey(adminEmail, 'hourly');
    const dailyKey = getAdminKey(adminEmail, 'daily');
    const globalKey = getGlobalKey();

    // Contadores atuais
    const hourlyCount = hourlyCache.get(hourlyKey) || 0;
    const dailyCount = dailyCache.get(dailyKey) || 0;
    const globalCount = dailyCache.get(globalKey) || 0;

    // Verificar limite horário por admin
    if (hourlyCount >= LIMITS.perAdminPerHour) {
      return res.status(429).json({
        success: false,
        error: 'Limite horário excedido',
        limite: LIMITS.perAdminPerHour,
        usado: hourlyCount,
        resetaEm: hourlyCache.getTtl(hourlyKey),
        tipo: 'perAdminPerHour'
      });
    }

    // Verificar limite diário por admin
    if (dailyCount >= LIMITS.perAdminPerDay) {
      return res.status(429).json({
        success: false,
        error: 'Limite diário excedido',
        limite: LIMITS.perAdminPerDay,
        usado: dailyCount,
        resetaEm: dailyCache.getTtl(dailyKey),
        tipo: 'perAdminPerDay'
      });
    }

    // Verificar limite global diário
    if (globalCount >= LIMITS.globalPerDay) {
      return res.status(429).json({
        success: false,
        error: 'Limite global diário excedido',
        limite: LIMITS.globalPerDay,
        usado: globalCount,
        resetaEm: dailyCache.getTtl(globalKey),
        tipo: 'globalPerDay',
        mensagem: 'Sistema atingiu limite de análises por dia. Tente novamente amanhã.'
      });
    }

    // Incrementar contadores
    hourlyCache.set(hourlyKey, hourlyCount + 1);
    dailyCache.set(dailyKey, dailyCount + 1);
    dailyCache.set(globalKey, globalCount + 1);

    // Adicionar informações de rate limit ao request
    req.rateLimitInfo = {
      hourlyUsed: hourlyCount + 1,
      hourlyLimit: LIMITS.perAdminPerHour,
      hourlyRemaining: LIMITS.perAdminPerHour - (hourlyCount + 1),
      dailyUsed: dailyCount + 1,
      dailyLimit: LIMITS.perAdminPerDay,
      dailyRemaining: LIMITS.perAdminPerDay - (dailyCount + 1),
      globalUsed: globalCount + 1,
      globalLimit: LIMITS.globalPerDay,
      globalRemaining: LIMITS.globalPerDay - (globalCount + 1)
    };

    // Headers informativos
    res.set({
      'X-RateLimit-Hourly-Limit': LIMITS.perAdminPerHour,
      'X-RateLimit-Hourly-Remaining': req.rateLimitInfo.hourlyRemaining,
      'X-RateLimit-Daily-Limit': LIMITS.perAdminPerDay,
      'X-RateLimit-Daily-Remaining': req.rateLimitInfo.dailyRemaining,
      'X-RateLimit-Global-Remaining': req.rateLimitInfo.globalRemaining
    });

    next();

  } catch (error) {
    console.error('[RATE-LIMIT-IA] Erro ao verificar rate limit:', error);
    // Em caso de erro, permite continuar (fail open)
    next();
  }
}

/**
 * Endpoint para verificar status de rate limit (sem consumir)
 */
export function checkRateLimitStatus(req, res) {
  try {
    const adminEmail = req.session?.admin?.email || 'unknown';

    if (!req.session?.admin?.email) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida'
      });
    }

    const hourlyKey = getAdminKey(adminEmail, 'hourly');
    const dailyKey = getAdminKey(adminEmail, 'daily');
    const globalKey = getGlobalKey();

    const hourlyCount = hourlyCache.get(hourlyKey) || 0;
    const dailyCount = dailyCache.get(dailyKey) || 0;
    const globalCount = dailyCache.get(globalKey) || 0;

    res.json({
      success: true,
      adminEmail,
      limits: {
        hourly: {
          limit: LIMITS.perAdminPerHour,
          used: hourlyCount,
          remaining: LIMITS.perAdminPerHour - hourlyCount,
          resetAt: hourlyCache.getTtl(hourlyKey) || Date.now() + 3600000
        },
        daily: {
          limit: LIMITS.perAdminPerDay,
          used: dailyCount,
          remaining: LIMITS.perAdminPerDay - dailyCount,
          resetAt: dailyCache.getTtl(dailyKey) || Date.now() + 86400000
        },
        global: {
          limit: LIMITS.globalPerDay,
          used: globalCount,
          remaining: LIMITS.globalPerDay - globalCount,
          resetAt: dailyCache.getTtl(globalKey) || Date.now() + 86400000
        }
      }
    });

  } catch (error) {
    console.error('[RATE-LIMIT-IA] Erro ao verificar status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar limites'
    });
  }
}

/**
 * Reseta contadores (apenas para debugging/admin super)
 */
export function resetRateLimits(req, res) {
  try {
    // Apenas para ambiente dev ou admin super autorizado
    if (process.env.NODE_ENV === 'production' && !req.session?.admin?.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Operação permitida apenas para super admins'
      });
    }

    hourlyCache.flushAll();
    dailyCache.flushAll();

    res.json({
      success: true,
      message: 'Todos os rate limits foram resetados'
    });

  } catch (error) {
    console.error('[RATE-LIMIT-IA] Erro ao resetar limites:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao resetar limites'
    });
  }
}

export default {
  rateLimitIA,
  checkRateLimitStatus,
  resetRateLimits,
  LIMITS
};
