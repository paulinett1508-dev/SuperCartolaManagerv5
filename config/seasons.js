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

    // ==========================================================================
    // DATAS CARTOLA FC 2026
    // ==========================================================================

    // Mercado abre (16 dias antes da 1ª rodada)
    dataMercadoAbre: new Date('2026-01-12'),

    // Primeira rodada do Brasileirão 2026
    dataPrimeiraRodada: new Date('2026-01-28'),

    // Data de início da temporada (= primeira rodada)
    dataInicio: new Date('2026-01-28'),

    // Data de fim da temporada (aproximada - dezembro)
    dataFim: new Date('2026-12-08'),

    // ==========================================================================
    // REGRAS CARTOLA 2026
    // ==========================================================================

    // Patrimônio inicial em cartoletas
    patrimonioInicial: 100,

    // Preços "Bom e Barato" 2026 (mudou de C$5 para novos valores)
    precosBomEBarato: {
        goleiro: 6,
        defensor: 7,
        meia: 8,
        atacante: 9,
    },

    // Temporadas anteriores (para consulta histórica)
    historico: [2025],

    // Status da temporada atual
    // 'preparando' = antes da 1ª rodada (mercado pode estar aberto)
    // 'ativa' = temporada em andamento
    // 'encerrada' = após última rodada
    status: 'preparando',
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
 * ✅ v1.1: Retorna a temporada ativa para dados FINANCEIROS
 * Durante pré-temporada ('preparando'), retorna temporada ANTERIOR
 * pois os dados financeiros ainda são da temporada que acabou de encerrar.
 * @returns {number}
 */
export const getFinancialSeason = () => {
    if (SEASON_CONFIG.status === 'preparando') {
        // Durante pré-temporada, dados financeiros são da temporada anterior
        return CURRENT_SEASON - 1;
    }
    return CURRENT_SEASON;
};

/**
 * ✅ v1.1: Temporada anterior (para referência)
 */
export const PREVIOUS_SEASON = CURRENT_SEASON - 1;

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
    PREVIOUS_SEASON,
    SEASON_CONFIG,
    getSeasonFilter,
    isCurrentSeason,
    isHistoricalSeason,
    getAvailableSeasons,
    getFinancialSeason,
    SEASON_SCHEMA_DEFAULT,
};
