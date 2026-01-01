/**
 * CONFIGURAÇÃO DE TEMPORADAS - Super Cartola Manager
 *
 * Este arquivo é a FONTE ÚNICA DE VERDADE para a temporada atual.
 * Quando virar o ano, mude apenas CURRENT_SEASON aqui e o sistema
 * iniciará uma nova temporada "em branco".
 *
 * @version 1.0.0
 */

// =============================================================================
// TEMPORADA ATUAL - MUDE APENAS AQUI PARA VIRAR O ANO
// =============================================================================
export const CURRENT_SEASON = 2026;

// =============================================================================
// CONFIGURAÇÕES DE TEMPORADA
// =============================================================================
export const SEASON_CONFIG = {
    // Temporada atual ativa
    current: CURRENT_SEASON,

    // Primeira rodada do campeonato
    rodadaInicial: 1,

    // Última rodada do campeonato (Brasileirão = 38)
    rodadaFinal: 38,

    // Data de início da temporada (aproximada)
    dataInicio: new Date(`${CURRENT_SEASON}-04-01`),

    // Data de fim da temporada (aproximada)
    dataFim: new Date(`${CURRENT_SEASON}-12-15`),

    // Temporadas anteriores (para consulta histórica)
    historico: [2025],

    // Status da temporada atual
    status: 'preparando', // 'ativa' | 'encerrada' | 'preparando'
};

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Retorna o filtro padrão de temporada para queries
 * @param {number} temporada - Temporada específica (opcional)
 * @returns {object} Filtro MongoDB
 */
export const getSeasonFilter = (temporada = null) => ({
    temporada: temporada || CURRENT_SEASON,
});

/**
 * Verifica se uma temporada é a atual
 * @param {number} temporada
 * @returns {boolean}
 */
export const isCurrentSeason = (temporada) => temporada === CURRENT_SEASON;

/**
 * Verifica se pode acessar dados históricos
 * @param {number} temporada
 * @returns {boolean}
 */
export const isHistoricalSeason = (temporada) =>
    SEASON_CONFIG.historico.includes(temporada) && temporada !== CURRENT_SEASON;

/**
 * Retorna todas as temporadas disponíveis
 * @returns {number[]}
 */
export const getAvailableSeasons = () => [
    CURRENT_SEASON,
    ...SEASON_CONFIG.historico.filter((t) => t !== CURRENT_SEASON),
];

/**
 * Valor padrão para campo temporada em schemas Mongoose
 */
export const SEASON_SCHEMA_DEFAULT = {
    type: Number,
    required: true,
    default: CURRENT_SEASON,
    index: true,
};

// =============================================================================
// EXPORT DEFAULT
// =============================================================================
export default {
    CURRENT_SEASON,
    SEASON_CONFIG,
    getSeasonFilter,
    isCurrentSeason,
    isHistoricalSeason,
    getAvailableSeasons,
    SEASON_SCHEMA_DEFAULT,
};
