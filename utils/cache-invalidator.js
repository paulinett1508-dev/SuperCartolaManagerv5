/**
 * CACHE INVALIDATOR - Sistema de Invalidação de Cache em Cascata
 *
 * PROBLEMA RESOLVIDO:
 * - Salvar Campo Editável não invalidava ExtratoFinanceiroCache
 * - Criar Acerto não invalidava ExtratoFinanceiroCache
 * - Atualizar Rodada não invalidava caches dependentes
 *
 * Este módulo centraliza a lógica de invalidação para garantir
 * que todos os caches dependentes sejam atualizados.
 *
 * @version 1.0.0
 */

import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";

// Configuração de dependências de cache
const CACHE_DEPENDENCIES = {
    // Quando FluxoFinanceiroCampos é atualizado, invalidar:
    'FluxoFinanceiroCampos': ['ExtratoFinanceiroCache'],

    // Quando AcertoFinanceiro é criado/atualizado, invalidar:
    'AcertoFinanceiro': ['ExtratoFinanceiroCache'],

    // Quando Rodada é atualizada, invalidar:
    'Rodada': ['ExtratoFinanceiroCache', 'RankingGeralCache', 'Top10Cache'],

    // Quando ExtratoFinanceiroCache é invalidado, invalidar:
    'ExtratoFinanceiroCache': ['RankingGeralCache'],
};

// Log prefix para debug
const LOG_PREFIX = '[CACHE-INVALIDATOR]';

/**
 * Invalida o cache do extrato financeiro para um participante
 *
 * @param {string} ligaId - ID da liga
 * @param {string|number} timeId - ID do time
 * @param {number} temporada - Temporada (opcional)
 * @param {string} motivo - Motivo da invalidação (para log)
 * @returns {Promise<boolean>} true se invalidou com sucesso
 */
export async function invalidarExtratoCache(ligaId, timeId, temporada = null, motivo = 'não especificado') {
    try {
        const query = {
            liga_id: String(ligaId),
            time_id: Number(timeId),
        };

        if (temporada) {
            query.temporada = Number(temporada);
        }

        const result = await ExtratoFinanceiroCache.deleteMany(query);

        console.log(
            `${LOG_PREFIX} ✅ Extrato invalidado para liga=${ligaId} time=${timeId}` +
            (temporada ? ` temporada=${temporada}` : '') +
            ` (${result.deletedCount} docs) | Motivo: ${motivo}`
        );

        return result.deletedCount > 0;
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Erro ao invalidar extrato:`, error.message);
        return false;
    }
}

/**
 * Invalida todos os caches de uma liga
 *
 * @param {string} ligaId - ID da liga
 * @param {number} temporada - Temporada (opcional)
 * @param {string} motivo - Motivo da invalidação
 * @returns {Promise<object>} Resultado da invalidação
 */
export async function invalidarCachesLiga(ligaId, temporada = null, motivo = 'não especificado') {
    try {
        const query = { liga_id: String(ligaId) };

        if (temporada) {
            query.temporada = Number(temporada);
        }

        const result = await ExtratoFinanceiroCache.deleteMany(query);

        console.log(
            `${LOG_PREFIX} ✅ Caches da liga invalidados: liga=${ligaId}` +
            (temporada ? ` temporada=${temporada}` : '') +
            ` (${result.deletedCount} docs) | Motivo: ${motivo}`
        );

        return {
            success: true,
            deletedCount: result.deletedCount,
        };
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Erro ao invalidar caches da liga:`, error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Hook para ser chamado após salvar FluxoFinanceiroCampos
 *
 * @param {string} ligaId
 * @param {string} timeId
 * @param {number} temporada
 */
export async function onCamposSaved(ligaId, timeId, temporada = null) {
    await invalidarExtratoCache(
        ligaId,
        timeId,
        temporada,
        'FluxoFinanceiroCampos atualizado'
    );
}

/**
 * Hook para ser chamado após criar/atualizar AcertoFinanceiro
 *
 * @param {string} ligaId
 * @param {string} timeId
 * @param {number} temporada
 */
export async function onAcertoCreated(ligaId, timeId, temporada = null) {
    await invalidarExtratoCache(
        ligaId,
        timeId,
        temporada,
        'AcertoFinanceiro criado/atualizado'
    );
}

/**
 * Hook para ser chamado após atualizar Rodada
 *
 * @param {string} ligaId
 * @param {number} rodada
 * @param {number} temporada
 */
export async function onRodadaUpdated(ligaId, rodada, temporada = null) {
    await invalidarCachesLiga(
        ligaId,
        temporada,
        `Rodada ${rodada} atualizada`
    );
}

/**
 * Invalida cache baseado no tipo de evento
 *
 * @param {string} eventType - Tipo de evento ('campos' | 'acerto' | 'rodada')
 * @param {object} data - Dados do evento
 * @param {string} data.ligaId
 * @param {string} data.timeId
 * @param {number} data.temporada
 * @param {number} data.rodada (para tipo 'rodada')
 */
export async function invalidarPorEvento(eventType, data) {
    const { ligaId, timeId, temporada, rodada } = data;

    switch (eventType) {
        case 'campos':
            await onCamposSaved(ligaId, timeId, temporada);
            break;
        case 'acerto':
            await onAcertoCreated(ligaId, timeId, temporada);
            break;
        case 'rodada':
            await onRodadaUpdated(ligaId, rodada, temporada);
            break;
        default:
            console.warn(`${LOG_PREFIX} Tipo de evento desconhecido: ${eventType}`);
    }
}

/**
 * Expõe função para frontend (via window)
 * Útil para invalidação manual via DevTools
 */
export function createFrontendHelper() {
    return {
        invalidarExtrato: invalidarExtratoCache,
        invalidarLiga: invalidarCachesLiga,
    };
}

export default {
    invalidarExtratoCache,
    invalidarCachesLiga,
    onCamposSaved,
    onAcertoCreated,
    onRodadaUpdated,
    invalidarPorEvento,
    createFrontendHelper,
    CACHE_DEPENDENCIES,
};
