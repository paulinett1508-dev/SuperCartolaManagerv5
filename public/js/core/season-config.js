/**
 * CONFIGURAÇÃO DE TEMPORADA - Frontend
 *
 * Este arquivo espelha as configurações de temporada do backend
 * (config/seasons.js) para uso no frontend.
 *
 * IMPORTANTE: Quando virar o ano, atualize CURRENT_SEASON e SEASON_STATUS.
 *
 * @version 1.0.0
 */

// =============================================================================
// TEMPORADA ATUAL - MUDE AQUI PARA VIRAR O ANO
// =============================================================================
export const CURRENT_SEASON = 2026;

// Status da temporada: 'preparando' | 'ativa' | 'encerrada'
export const SEASON_STATUS = 'preparando';

// Última rodada do Brasileirão
export const RODADA_FINAL_CAMPEONATO = 38;

// Flag derivada do status
export const CAMPEONATO_ENCERRADO = SEASON_STATUS === 'encerrada';

// =============================================================================
// CONFIGURAÇÕES AUXILIARES
// =============================================================================
export const SEASON_CONFIG = {
    current: CURRENT_SEASON,
    status: SEASON_STATUS,
    rodadaFinal: RODADA_FINAL_CAMPEONATO,
    encerrado: CAMPEONATO_ENCERRADO,

    // Datas importantes (para exibição no frontend)
    dataMercadoAbre: '2026-01-12',
    dataPrimeiraRodada: '2026-01-28',
    dataFim: '2026-12-08',

    // Temporadas disponíveis para histórico
    historico: [2025],
};

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Verifica se uma temporada é a atual
 * @param {number} temporada
 * @returns {boolean}
 */
export const isCurrentSeason = (temporada) => Number(temporada) === CURRENT_SEASON;

/**
 * Verifica se o campeonato está encerrado
 * @returns {boolean}
 */
export const isCampeonatoEncerrado = () => CAMPEONATO_ENCERRADO;

/**
 * Retorna a última rodada disponível
 * @returns {number}
 */
export const getUltimaRodada = () => RODADA_FINAL_CAMPEONATO;

/**
 * Retorna temporadas disponíveis para seletor
 * @returns {number[]}
 */
export const getTemporadasDisponiveis = () => [
    CURRENT_SEASON,
    ...SEASON_CONFIG.historico,
];

// =============================================================================
// BUSCAR CONFIG DO SERVIDOR (opcional - para sync automático)
// =============================================================================

let serverConfig = null;

/**
 * Busca configurações de temporada do servidor
 * Útil para garantir sincronia com backend
 * @returns {Promise<object>}
 */
export async function fetchSeasonConfig() {
    if (serverConfig) return serverConfig;

    try {
        const response = await fetch('/api/app/season-config');
        if (response.ok) {
            serverConfig = await response.json();
            return serverConfig;
        }
    } catch (error) {
        console.warn('[SEASON-CONFIG] Usando config local (servidor indisponível)');
    }

    return SEASON_CONFIG;
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================
export default {
    CURRENT_SEASON,
    SEASON_STATUS,
    RODADA_FINAL_CAMPEONATO,
    CAMPEONATO_ENCERRADO,
    SEASON_CONFIG,
    isCurrentSeason,
    isCampeonatoEncerrado,
    getUltimaRodada,
    getTemporadasDisponiveis,
    fetchSeasonConfig,
};
