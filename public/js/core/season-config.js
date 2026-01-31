/**
 * CONFIGURAÇÃO DE TEMPORADA - Frontend
 *
 * Este arquivo espelha as configurações de temporada do backend
 * (config/seasons.js) para uso no frontend.
 *
 * ⚠️ IMPORTANTE: Estes valores são FALLBACKS estáticos.
 * Para dados DINÂMICOS em tempo real, use:
 *   - SeasonStatusManager (season-status-manager.js)
 *   - Endpoint: /api/app/system-status
 *
 * QUANDO ATUALIZAR: Virada de ano ou mudança de status da temporada
 *
 * @version 2.0.0
 */

// =============================================================================
// TEMPORADA ATUAL - FALLBACK ESTÁTICO
// =============================================================================
export const CURRENT_SEASON = 2026;

// Status da temporada: 'preparando' | 'ativa' | 'encerrada'
// ⚠️ FALLBACK: Use SeasonStatusManager.getStatus() para dados dinâmicos
export const SEASON_STATUS = 'ativa';

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
// BUSCAR CONFIG DO SERVIDOR - v2.0 (usa endpoint unificado)
// =============================================================================

let serverConfig = null;

/**
 * Busca configurações de temporada do servidor
 * v2.0: Usa /api/app/system-status (endpoint unificado com MarketGate)
 * v1.0: Usava /api/app/season-config (legado)
 *
 * ⚠️ RECOMENDAÇÃO: Para dados em tempo real do mercado/rodadas,
 * use SeasonStatusManager ao invés desta função.
 *
 * @returns {Promise<object>}
 */
export async function fetchSeasonConfig() {
    if (serverConfig) return serverConfig;

    try {
        // v2.0: Endpoint unificado
        const response = await fetch('/api/app/system-status');
        if (response.ok) {
            const data = await response.json();

            // Converter para formato compatível com SEASON_CONFIG
            serverConfig = {
                current: data.temporada.atual,
                status: data.temporada.status,
                rodadaFinal: data.temporada.rodada_final,
                encerrado: data.temporada.encerrada,
                dataMercadoAbre: data.temporada.data_inicio,
                dataPrimeiraRodada: data.temporada.data_inicio,
                dataFim: data.temporada.data_fim,
                historico: [],

                // Extras do endpoint unificado
                preTemporada: data.temporada.pre_temporada,
                mercadoAberto: data.mercado.mercado_aberto,
                rodadaAtual: data.mercado.rodada_atual
            };

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
