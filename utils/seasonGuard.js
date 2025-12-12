// =====================================================================
// seasonGuard.js v2.0 - Circuit Breaker Inteligente de Temporada
// =====================================================================
// PROPÓSITO: Controlar chamadas à API externa da Globo baseado no
// estado da temporada. Preserva código para reativação futura.
//
// PARA REATIVAR EM 2026:
//   1. Defina SEASON_ACTIVE=true no .env, OU
//   2. Altere SEASON_FINISHED para false abaixo
// =====================================================================

/**
 * CONFIGURAÇÃO CENTRAL DE TEMPORADA
 *
 * PRIORIDADE DE CONFIGURAÇÃO:
 * 1. Variável de ambiente SEASON_ACTIVE (se definida)
 * 2. Valor hardcoded SEASON_FINISHED abaixo
 *
 * Para 2026: Basta definir SEASON_ACTIVE=true no .env
 */
const ENV_SEASON_ACTIVE = process.env.SEASON_ACTIVE;
const SEASON_FINISHED_DEFAULT = true; // Temporada 2025 encerrada

export const SEASON_CONFIG = {
    // ⚠️ Calculado dinamicamente baseado em ENV ou default
    get SEASON_FINISHED() {
        // Se variável de ambiente definida, usar ela
        if (ENV_SEASON_ACTIVE !== undefined) {
            return ENV_SEASON_ACTIVE !== 'true'; // SEASON_ACTIVE=true significa temporada ATIVA (não encerrada)
        }
        return SEASON_FINISHED_DEFAULT;
    },

    // Alias para clareza: temporada está ATIVA?
    get SEASON_ACTIVE() {
        return !this.SEASON_FINISHED;
    },

    // Última rodada válida do campeonato
    LAST_ROUND: 38,

    // Ano da temporada atual
    SEASON_YEAR: 2025,

    // Data de encerramento (para logs)
    SEASON_END_DATE: '2025-12-08',

    // Mensagem padrão de bloqueio
    get BLOCK_MESSAGE() {
        return `Temporada ${this.SEASON_YEAR} encerrada. Dados servidos do banco de dados local.`;
    },

    // IDs das ligas ativas
    LEAGUES: {
        SUPER_CARTOLA: '684cb1c8af923da7c7df51de',
        CARTOLEIROS_SOBRAL: '684d821cf1a7ae16d1f89572'
    }
};

/**
 * Verifica se a temporada está encerrada
 * @returns {boolean}
 */
export function isSeasonFinished() {
    return SEASON_CONFIG.SEASON_FINISHED === true;
}

/**
 * Verifica se uma rodada é válida (dentro do range permitido)
 * @param {number} rodada
 * @returns {boolean}
 */
export function isValidRound(rodada) {
    const num = parseInt(rodada);
    return num >= 1 && num <= SEASON_CONFIG.LAST_ROUND;
}

/**
 * Guard para bloquear chamadas de API externa
 * Use este wrapper em todas as funções que fazem fetch para api.cartola.globo.com
 *
 * @param {Function} apiFn - Função que faz a chamada à API externa
 * @param {Function} fallbackFn - Função que busca dados do banco local
 * @param {string} context - Contexto para logging (ex: 'buscarTime', 'obterRodada')
 * @returns {Promise<any>}
 */
export async function guardedApiCall(apiFn, fallbackFn, context = 'unknown') {
    // Se temporada encerrada, SEMPRE usar fallback (banco local)
    if (isSeasonFinished()) {
        console.log(`[SEASON-GUARD] ⛔ API bloqueada (${context}): ${SEASON_CONFIG.BLOCK_MESSAGE}`);

        if (typeof fallbackFn === 'function') {
            return await fallbackFn();
        }

        throw new Error(SEASON_CONFIG.BLOCK_MESSAGE);
    }

    // Temporada ativa - permitir chamada à API
    return await apiFn();
}

/**
 * Middleware Express para bloquear rotas de sincronização
 * Use em rotas que tentam atualizar dados da API externa
 */
export function seasonBlockMiddleware(req, res, next) {
    if (isSeasonFinished()) {
        console.log(`[SEASON-GUARD] ⛔ Rota bloqueada: ${req.method} ${req.path}`);

        return res.status(403).json({
            error: 'Temporada encerrada',
            message: SEASON_CONFIG.BLOCK_MESSAGE,
            season: SEASON_CONFIG.SEASON_YEAR,
            lastRound: SEASON_CONFIG.LAST_ROUND,
            hint: 'Use endpoints de leitura do cache/banco de dados'
        });
    }

    next();
}

/**
 * Decorator para funções de serviço
 * Envolve uma função e bloqueia se temporada encerrada
 *
 * @param {Function} fn - Função original
 * @param {string} name - Nome da função para logging
 * @returns {Function}
 */
export function seasonGuardedFunction(fn, name) {
    return async function(...args) {
        if (isSeasonFinished()) {
            console.log(`[SEASON-GUARD] ⛔ Função bloqueada: ${name}`);
            throw new Error(`${name}: ${SEASON_CONFIG.BLOCK_MESSAGE}`);
        }
        return await fn.apply(this, args);
    };
}

/**
 * Verifica se deve buscar dados atualizados ou usar cache
 * Para temporada encerrada, SEMPRE retorna true (usar cache)
 *
 * @returns {boolean} true = usar cache, false = pode buscar API
 */
export function shouldUseCache() {
    return isSeasonFinished();
}

/**
 * Retorna status da temporada para exibição no frontend
 */
export function getSeasonStatus() {
    return {
        finished: SEASON_CONFIG.SEASON_FINISHED,
        year: SEASON_CONFIG.SEASON_YEAR,
        lastRound: SEASON_CONFIG.LAST_ROUND,
        endDate: SEASON_CONFIG.SEASON_END_DATE,
        message: isSeasonFinished()
            ? `Temporada ${SEASON_CONFIG.SEASON_YEAR} encerrada`
            : `Temporada ${SEASON_CONFIG.SEASON_YEAR} em andamento`
    };
}

/**
 * Logger especializado para operações bloqueadas
 */
export function logBlockedOperation(operation, details = {}) {
    console.warn(`[SEASON-GUARD] ⛔ OPERAÇÃO BLOQUEADA`, {
        operation,
        reason: 'Temporada encerrada',
        season: SEASON_CONFIG.SEASON_YEAR,
        timestamp: new Date().toISOString(),
        ...details
    });
}

/**
 * Verifica se uma rodada específica deve usar cache (dados locais)
 * @param {number} rodada - Número da rodada
 * @returns {boolean} true = usar cache, false = pode tentar API
 */
export function shouldUseCacheForRound(rodada) {
    // Se temporada encerrada, sempre cache
    if (isSeasonFinished()) return true;

    // Se rodada > 38, sempre cache
    const numRodada = parseInt(rodada);
    if (numRodada > SEASON_CONFIG.LAST_ROUND) return true;

    return false;
}

// Log de inicialização
const envInfo = ENV_SEASON_ACTIVE !== undefined
    ? `(via ENV: SEASON_ACTIVE=${ENV_SEASON_ACTIVE})`
    : '(via config default)';

console.log(`[SEASON-GUARD] ✅ v2.0 Carregado ${envInfo}`);
console.log(`[SEASON-GUARD] 📊 Temporada ${SEASON_CONFIG.SEASON_YEAR}: ${isSeasonFinished() ? '🔒 ENCERRADA (API bloqueada)' : '🟢 ATIVA'}`);
