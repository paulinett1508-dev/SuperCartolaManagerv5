// =====================================================================
// LIGA CONFIG SERVICE v1.0.0 - Servico Central de Configuracoes
// Busca e cacheia configuracoes da liga do endpoint /api/ligas/:id/configuracoes
// =====================================================================

const LigaConfigService = (function () {
  // Cache de configuracoes por liga
  const configCache = new Map();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Busca configuracoes da liga do servidor
   * @param {string} ligaId - ID da liga
   * @param {boolean} forceRefresh - Forcar refresh do cache
   * @returns {Promise<Object>} Configuracoes da liga
   */
  async function getConfig(ligaId, forceRefresh = false) {
    if (!ligaId) {
      console.warn("[LIGA-CONFIG] ligaId nao fornecido");
      return null;
    }

    // Verificar cache
    const cached = configCache.get(ligaId);
    if (cached && !forceRefresh) {
      const age = Date.now() - cached.timestamp;
      if (age < CACHE_TTL) {
        return cached.data;
      }
    }

    try {
      console.log(`[LIGA-CONFIG] Buscando configs para liga ${ligaId}...`);
      const response = await fetch(`/api/ligas/${ligaId}/configuracoes`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.erro || "Erro desconhecido");
      }

      // Salvar no cache
      configCache.set(ligaId, {
        data: data,
        timestamp: Date.now(),
      });

      console.log(`[LIGA-CONFIG] Configs carregadas para ${data.liga_nome}`);
      return data;
    } catch (error) {
      console.error(`[LIGA-CONFIG] Erro ao buscar configs:`, error);

      // Retornar cache expirado se existir
      if (cached) {
        console.warn("[LIGA-CONFIG] Usando cache expirado");
        return cached.data;
      }

      return null;
    }
  }

  /**
   * Obtem valores de banco (ranking_rodada) para uma posicao
   * @param {string} ligaId - ID da liga
   * @param {number} rodada - Numero da rodada
   * @param {number} posicao - Posicao do participante
   * @returns {Promise<number>} Valor financeiro
   */
  async function getValorBanco(ligaId, rodada, posicao) {
    const config = await getConfig(ligaId);
    if (!config || !config.ranking_rodada) return 0;

    const rankingConfig = config.ranking_rodada;

    // Config temporal (ex: Sobral com fases)
    if (rankingConfig.temporal) {
      const rodadaTransicao = rankingConfig.rodada_transicao || 30;
      const fase = rodada < rodadaTransicao ? "fase1" : "fase2";
      const faseConfig = rankingConfig[fase];
      const valores = faseConfig?.valores || {};
      return valores[posicao] || valores[String(posicao)] || 0;
    }

    // Config simples
    const valores = rankingConfig.valores || {};
    return valores[posicao] || valores[String(posicao)] || 0;
  }

  /**
   * Obtem tabela completa de valores de banco para uma rodada
   * @param {string} ligaId - ID da liga
   * @param {number} rodada - Numero da rodada
   * @returns {Promise<Object>} Mapa de posicao -> valor
   */
  async function getValoresBancoRodada(ligaId, rodada) {
    const config = await getConfig(ligaId);
    if (!config || !config.ranking_rodada) return {};

    const rankingConfig = config.ranking_rodada;

    // Config temporal
    if (rankingConfig.temporal) {
      const rodadaTransicao = rankingConfig.rodada_transicao || 30;
      const fase = rodada < rodadaTransicao ? "fase1" : "fase2";
      const faseConfig = rankingConfig[fase];
      return faseConfig?.valores || {};
    }

    return rankingConfig.valores || {};
  }

  /**
   * Obtem faixas de premiacao (credito/neutro/debito)
   * @param {string} ligaId - ID da liga
   * @param {number} rodada - Numero da rodada
   * @returns {Promise<Object>} Faixas de premiacao
   */
  async function getFaixas(ligaId, rodada) {
    const config = await getConfig(ligaId);
    if (!config || !config.ranking_rodada) {
      return { totalTimes: 32, credito: { inicio: 1, fim: 11 }, neutro: { inicio: 12, fim: 21 }, debito: { inicio: 22, fim: 32 } };
    }

    const rankingConfig = config.ranking_rodada;

    if (rankingConfig.temporal) {
      const rodadaTransicao = rankingConfig.rodada_transicao || 30;
      const fase = rodada < rodadaTransicao ? "fase1" : "fase2";
      const faseConfig = rankingConfig[fase];
      return {
        totalTimes: faseConfig?.total_participantes || 0,
        ...faseConfig?.faixas,
      };
    }

    return {
      totalTimes: rankingConfig.total_participantes || 32,
      ...rankingConfig.faixas,
    };
  }

  /**
   * Obtem valores de TOP10 (mitos/micos)
   * @param {string} ligaId - ID da liga
   * @returns {Promise<Object>} { mitos: {...}, micos: {...} }
   */
  async function getValoresTop10(ligaId) {
    const config = await getConfig(ligaId);
    if (!config || !config.top10) {
      return { mitos: {}, micos: {} };
    }

    return {
      mitos: config.top10.valores_mito || {},
      micos: config.top10.valores_mico || {},
    };
  }

  /**
   * Verifica se um modulo esta habilitado
   * @param {string} ligaId - ID da liga
   * @param {string} modulo - Nome do modulo (pontos_corridos, mata_mata, etc.)
   * @returns {Promise<boolean>}
   */
  async function isModuloHabilitado(ligaId, modulo) {
    const config = await getConfig(ligaId);
    if (!config) return false;

    // Verificar em configuracoes.{modulo}.habilitado
    const configModulo = config.configuracoes?.[modulo];
    if (configModulo?.habilitado !== undefined) {
      return configModulo.habilitado;
    }

    // Fallback para modulos_ativos
    const moduloCamel = modulo.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    return config.modulos_ativos?.[moduloCamel] || config.modulos_ativos?.[modulo] || false;
  }

  /**
   * Obtem lista de cards desabilitados
   * @param {string} ligaId - ID da liga
   * @returns {Promise<Array>}
   */
  async function getCardsDesabilitados(ligaId) {
    const config = await getConfig(ligaId);
    return config?.cards_desabilitados || [];
  }

  /**
   * Obtem rodada de transicao (para configs temporais)
   * @param {string} ligaId - ID da liga
   * @returns {Promise<number|null>}
   */
  async function getRodadaTransicao(ligaId) {
    const config = await getConfig(ligaId);
    if (!config?.ranking_rodada?.temporal) return null;
    return config.ranking_rodada.rodada_transicao || 30;
  }

  /**
   * Verifica se a liga tem config temporal
   * @param {string} ligaId - ID da liga
   * @returns {Promise<boolean>}
   */
  async function isConfigTemporal(ligaId) {
    const config = await getConfig(ligaId);
    return config?.ranking_rodada?.temporal || false;
  }

  /**
   * Obtem total de participantes para uma rodada
   * @param {string} ligaId - ID da liga
   * @param {number} rodada - Numero da rodada
   * @returns {Promise<number>}
   */
  async function getTotalParticipantes(ligaId, rodada) {
    const config = await getConfig(ligaId);
    if (!config) return 0;

    const rankingConfig = config.ranking_rodada;
    if (!rankingConfig) return config.total_participantes || 0;

    if (rankingConfig.temporal) {
      const rodadaTransicao = rankingConfig.rodada_transicao || 30;
      const fase = rodada < rodadaTransicao ? "fase1" : "fase2";
      return rankingConfig[fase]?.total_participantes || 0;
    }

    return rankingConfig.total_participantes || config.total_participantes || 0;
  }

  /**
   * Limpa o cache de uma liga ou todo o cache
   * @param {string} ligaId - ID da liga (opcional)
   */
  function clearCache(ligaId = null) {
    if (ligaId) {
      configCache.delete(ligaId);
    } else {
      configCache.clear();
    }
    console.log("[LIGA-CONFIG] Cache limpo");
  }

  /**
   * Pre-carrega configs de uma liga
   * @param {string} ligaId - ID da liga
   */
  async function preload(ligaId) {
    await getConfig(ligaId, true);
  }

  // API publica
  return {
    getConfig,
    getValorBanco,
    getValoresBancoRodada,
    getFaixas,
    getValoresTop10,
    isModuloHabilitado,
    getCardsDesabilitados,
    getRodadaTransicao,
    isConfigTemporal,
    getTotalParticipantes,
    clearCache,
    preload,
  };
})();

// Exportar para uso global e ES modules
if (typeof window !== "undefined") {
  window.LigaConfigService = LigaConfigService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = LigaConfigService;
}

console.log("[LIGA-CONFIG-SERVICE] v1.0.0 carregado");
