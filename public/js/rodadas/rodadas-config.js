// =====================================================================
// RODADAS CONFIG v5.0.0 - SaaS DINAMICO
// Responsavel por: configuracoes de banco, ligas, endpoints
// ✅ v5.0.0: Busca configs do endpoint /api/ligas/:id/configuracoes
// ✅ v4.0: Sistema de tabelas contextuais por rodada (mantido para fallback)
// =====================================================================

// VERSAO DO SISTEMA FINANCEIRO (para invalidacao de cache)
export const VERSAO_SISTEMA_FINANCEIRO = "5.0.0";

// =====================================================================
// CACHE LOCAL DE CONFIGS (carregado do servidor)
// =====================================================================
let configsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca configuracoes da liga do servidor
 * @param {string} ligaId - ID da liga
 * @param {boolean} forceRefresh - Forcar refresh
 * @returns {Promise<Object>}
 */
export async function fetchLigaConfig(ligaId, forceRefresh = false) {
  if (!ligaId) return null;

  const cached = configsCache.get(ligaId);
  if (cached && !forceRefresh && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`/api/ligas/${ligaId}/configuracoes`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.success) throw new Error(data.erro);

    configsCache.set(ligaId, { data, timestamp: Date.now() });
    console.log(`[RODADAS-CONFIG] Configs carregadas: ${data.liga_nome}`);
    return data;
  } catch (error) {
    console.warn(`[RODADAS-CONFIG] Erro ao buscar configs, usando fallback:`, error.message);
    return cached?.data || null;
  }
}

// =====================================================================
// FALLBACK VALUES (usados se API falhar)
// =====================================================================

// Valores de banco fallback - SuperCartola (32 times)
const FALLBACK_VALORES_SUPERCARTOLA = {
  1: 20.0, 2: 19.0, 3: 18.0, 4: 17.0, 5: 16.0,
  6: 15.0, 7: 14.0, 8: 13.0, 9: 12.0, 10: 11.0, 11: 10.0,
  12: 0.0, 13: 0.0, 14: 0.0, 15: 0.0, 16: 0.0, 17: 0.0,
  18: 0.0, 19: 0.0, 20: 0.0, 21: 0.0,
  22: -10.0, 23: -11.0, 24: -12.0, 25: -13.0, 26: -14.0,
  27: -15.0, 28: -16.0, 29: -17.0, 30: -18.0, 31: -19.0, 32: -20.0,
};

// Valores de banco fallback - Sobral Fase 1 (6 times)
const FALLBACK_VALORES_SOBRAL_FASE1 = {
  1: 7.0, 2: 4.0, 3: 0.0, 4: -2.0, 5: -5.0, 6: -10.0,
};

// Valores de banco fallback - Sobral Fase 2 (4 times)
const FALLBACK_VALORES_SOBRAL_FASE2 = {
  1: 5.0, 2: 0.0, 3: 0.0, 4: -5.0,
};

// =====================================================================
// EXPORTS LEGADOS (compatibilidade com codigo existente)
// =====================================================================

// Manter exports para compatibilidade
export const valoresBancoPadrao = FALLBACK_VALORES_SUPERCARTOLA;
export const valoresFase1_6times = FALLBACK_VALORES_SOBRAL_FASE1;
export const valoresFase2_4times = FALLBACK_VALORES_SOBRAL_FASE2;
export const valoresBancoCartoleirosSobral = FALLBACK_VALORES_SOBRAL_FASE2;
export const RODADA_TRANSICAO_SOBRAL = 29;

export const faixasFase1 = {
  totalTimes: 6,
  credito: { inicio: 1, fim: 2 },
  neutro: { inicio: 3, fim: 3 },
  debito: { inicio: 4, fim: 6 },
};

export const faixasFase2 = {
  totalTimes: 4,
  credito: { inicio: 1, fim: 1 },
  neutro: { inicio: 2, fim: 3 },
  debito: { inicio: 4, fim: 4 },
};

// IDs de ligas (ainda necessarios para identificacao)
export const LIGAS_CONFIG = {
  SUPERCARTOLA: "684cb1c8af923da7c7df51de",
  CARTOLEIROS_SOBRAL: "684d821cf1a7ae16d1f89572",
};

// =====================================================================
// ✅ v5.0: FUNCOES DINAMICAS (buscam do servidor)
// =====================================================================

/**
 * Obtem valores de banco para uma rodada especifica
 * @param {string} ligaId - ID da liga
 * @param {number} rodada - Numero da rodada
 * @returns {Promise<Object>} Mapa de posicao -> valor
 */
export async function getBancoPorRodadaAsync(ligaId, rodada) {
  const config = await fetchLigaConfig(ligaId);

  if (config?.ranking_rodada) {
    const rankingConfig = config.ranking_rodada;

    if (rankingConfig.temporal) {
      const rodadaTransicao = rankingConfig.rodada_transicao || 30;
      const fase = rodada < rodadaTransicao ? "fase1" : "fase2";
      return rankingConfig[fase]?.valores || {};
    }

    return rankingConfig.valores || {};
  }

  // Fallback para valores hardcoded
  return getBancoPorRodada(ligaId, rodada);
}

/**
 * Obtem faixas de premiacao para uma rodada
 * @param {string} ligaId - ID da liga
 * @param {number} rodada - Numero da rodada
 * @returns {Promise<Object>}
 */
export async function getFaixasPorRodadaAsync(ligaId, rodada) {
  const config = await fetchLigaConfig(ligaId);

  if (config?.ranking_rodada) {
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

  // Fallback
  return getFaixasPorRodada(ligaId, rodada);
}

/**
 * Obtem total de times ativos para uma rodada
 * @param {string} ligaId - ID da liga
 * @param {number} rodada - Numero da rodada
 * @returns {Promise<number>}
 */
export async function getTotalTimesPorRodadaAsync(ligaId, rodada) {
  const config = await fetchLigaConfig(ligaId);

  if (config?.ranking_rodada) {
    const rankingConfig = config.ranking_rodada;

    if (rankingConfig.temporal) {
      const rodadaTransicao = rankingConfig.rodada_transicao || 30;
      const fase = rodada < rodadaTransicao ? "fase1" : "fase2";
      return rankingConfig[fase]?.total_participantes || 0;
    }

    return rankingConfig.total_participantes || config.total_participantes || 0;
  }

  // Fallback
  return getTotalTimesPorRodada(ligaId, rodada);
}

/**
 * Verifica se um modulo esta habilitado
 * @param {string} ligaId - ID da liga
 * @param {string} modulo - Nome do modulo
 * @returns {Promise<boolean>}
 */
export async function isModuloHabilitadoAsync(ligaId, modulo) {
  const config = await fetchLigaConfig(ligaId);
  if (!config) return false;

  const configModulo = config.configuracoes?.[modulo];
  if (configModulo?.habilitado !== undefined) {
    return configModulo.habilitado;
  }

  const moduloCamel = modulo.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return config.modulos_ativos?.[moduloCamel] || false;
}

/**
 * Obtem cards desabilitados da liga
 * @param {string} ligaId - ID da liga
 * @returns {Promise<Array>}
 */
export async function getCardsDesabilitadosAsync(ligaId) {
  const config = await fetchLigaConfig(ligaId);
  return config?.cards_desabilitados || [];
}

// =====================================================================
// FUNCOES SINCRONAS (fallback - compatibilidade)
// =====================================================================

export function getBancoPorRodada(ligaId, rodada) {
  if (ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL) {
    return rodada < RODADA_TRANSICAO_SOBRAL
      ? FALLBACK_VALORES_SOBRAL_FASE1
      : FALLBACK_VALORES_SOBRAL_FASE2;
  }
  return FALLBACK_VALORES_SUPERCARTOLA;
}

export function getBancoPorLiga(ligaId) {
  if (ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL) {
    return FALLBACK_VALORES_SOBRAL_FASE2;
  }
  return FALLBACK_VALORES_SUPERCARTOLA;
}

export function getFaixasPorRodada(ligaId, rodada) {
  if (ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL) {
    return rodada < RODADA_TRANSICAO_SOBRAL ? faixasFase1 : faixasFase2;
  }
  return {
    totalTimes: 32,
    credito: { inicio: 1, fim: 11 },
    neutro: { inicio: 12, fim: 21 },
    debito: { inicio: 22, fim: 32 },
  };
}

export function getTotalTimesPorRodada(ligaId, rodada) {
  if (ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL) {
    return rodada < RODADA_TRANSICAO_SOBRAL ? 6 : 4;
  }
  return 32;
}

// =====================================================================
// CONFIGURACAO DE ENDPOINTS
// =====================================================================

export const RODADAS_ENDPOINTS = {
  getEndpoints: (ligaId, rodadaNum, baseUrl = "") => [
    `${baseUrl}/api/rodadas/${ligaId}/rodadas?inicio=${rodadaNum}&fim=${rodadaNum}`,
    `${baseUrl}/api/ligas/${ligaId}/rodadas?rodada=${rodadaNum}`,
    `${baseUrl}/api/ligas/${ligaId}/ranking/${rodadaNum}`,
  ],
  mercadoStatus: "/api/cartola/mercado/status",
  liga: (ligaId, baseUrl = "") => `${baseUrl}/api/ligas/${ligaId}`,
  configuracoes: (ligaId, baseUrl = "") => `${baseUrl}/api/ligas/${ligaId}/configuracoes`,
  pontuacoesParciais: "/api/cartola/atletas/pontuados",
  timeEscalacao: (timeId, rodada, baseUrl = "") =>
    `${baseUrl}/api/cartola/time/id/${timeId}/${rodada}`,
};

export const STATUS_MERCADO_DEFAULT = {
  rodada_atual: 1,
  status_mercado: 4,
};

// =====================================================================
// CONFIGURACAO DE LABELS DE POSICAO
// =====================================================================

export const POSICAO_CONFIG = {
  SUPERCARTOLA: {
    mito: {
      pos: 1,
      label: "MITO",
      style: "color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;",
    },
    g2_g11: {
      range: [2, 11],
      getLabel: (pos) => `G${pos}`,
      className: "pos-g",
    },
    zona: {
      condition: (pos, total) => pos >= total - 10 && pos < total,
      getLabel: (pos, total) => `${pos}° | Z${total - pos}`,
      className: "pos-z",
    },
    mico: {
      condition: (pos, total) => pos === total && total > 1,
      label: "MICO",
      className: "pos-mico",
    },
  },
  CARTOLEIROS_SOBRAL: {
    mito: { pos: 1, label: "MITO", style: "color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;" },
    g2: { pos: 2, label: "2º", className: "pos-neutro" },
    neutro: { pos: 3, label: "3º", className: "pos-neutro" },
    mico: { pos: 4, label: "MICO", style: "color:#fff; font-weight:bold; background:#dc3545; border-radius:4px; padding:1px 8px; font-size:12px;" },
  },
  CARTOLEIROS_SOBRAL_FASES: {
    fase1: {
      totalTimes: 6,
      mito: { pos: 1, label: "MITO" },
      g2: { pos: 2, label: "G2", className: "pos-g" },
      neutro: { pos: 3, label: "3º", className: "pos-neutro" },
      z3: { pos: 4, label: "Z3", className: "pos-z" },
      z2: { pos: 5, label: "Z2", className: "pos-z" },
      mico: { pos: 6, label: "MICO", className: "pos-mico" },
    },
    fase2: {
      totalTimes: 4,
      mito: { pos: 1, label: "MITO" },
      neutro1: { pos: 2, label: "2º", className: "pos-neutro" },
      neutro2: { pos: 3, label: "3º", className: "pos-neutro" },
      mico: { pos: 4, label: "MICO", className: "pos-mico" },
    },
  },
};

export function getPosicaoConfigPorRodada(ligaId, rodada) {
  if (ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL) {
    return rodada < RODADA_TRANSICAO_SOBRAL
      ? POSICAO_CONFIG.CARTOLEIROS_SOBRAL_FASES.fase1
      : POSICAO_CONFIG.CARTOLEIROS_SOBRAL_FASES.fase2;
  }
  return POSICAO_CONFIG.SUPERCARTOLA;
}

export const TIMEOUTS_CONFIG = {
  renderizacao: 500,
  imageLoad: 3000,
  apiTimeout: 8000,
  retryDelay: 1000,
};

console.log("[RODADAS-CONFIG] v5.0.0 SaaS Dinamico carregado");
