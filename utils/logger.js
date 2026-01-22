/**
 * Logger Configurável - Super Cartola Manager
 *
 * Em DEV: loga tudo (log, warn, error)
 * Em PROD: loga apenas warn e error (silencia log)
 *
 * Uso:
 *   import logger from '../utils/logger.js';
 *   logger.log('[MODULO] Mensagem de debug');   // Só aparece em DEV
 *   logger.warn('[MODULO] Aviso importante');   // Sempre aparece
 *   logger.error('[MODULO] Erro crítico');      // Sempre aparece
 *   logger.info('[MODULO] Info geral');         // Só aparece em DEV
 *
 * Forçar logs em PROD (debug temporário):
 *   DEBUG=true npm start
 *
 * @version 1.0.0
 * @since 2026-01-22
 */

const isProd = process.env.NODE_ENV === 'production';
const debugEnabled = process.env.DEBUG === 'true';

// Em PROD, só loga se DEBUG=true
const shouldLogDebug = !isProd || debugEnabled;

const logger = {
    /**
     * Log de debug - silenciado em produção
     * Use para informações de fluxo, debugging, etc.
     */
    log: (...args) => {
        if (shouldLogDebug) {
            console.log(...args);
        }
    },

    /**
     * Log de informação - silenciado em produção
     * Use para informações gerais não críticas
     */
    info: (...args) => {
        if (shouldLogDebug) {
            console.info(...args);
        }
    },

    /**
     * Log de aviso - sempre aparece
     * Use para situações anormais mas não críticas
     */
    warn: (...args) => {
        console.warn(...args);
    },

    /**
     * Log de erro - sempre aparece
     * Use para erros e exceções
     */
    error: (...args) => {
        console.error(...args);
    },

    /**
     * Log forçado - sempre aparece (mesmo em PROD)
     * Use para logs críticos que precisam aparecer sempre
     */
    force: (...args) => {
        console.log(...args);
    },

    /**
     * Log de debug com timestamp
     * Útil para profiling e análise de performance
     */
    debug: (...args) => {
        if (shouldLogDebug) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}]`, ...args);
        }
    }
};

export default logger;
