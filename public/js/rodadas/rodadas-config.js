// RODADAS CONFIG - Configurações e Constantes v4.0
// Responsável por: configurações de banco, ligas, endpoints
// ✅ v4.0: Sistema de tabelas contextuais por rodada

// VERSÃO DO SISTEMA FINANCEIRO (para invalidação de cache)
export const VERSAO_SISTEMA_FINANCEIRO = "4.0.0";

// VALORES DE BANCO PADRÃO (SuperCartola - 32 times)
export const valoresBancoPadrao = {
  1: 20.0,
  2: 19.0,
  3: 18.0,
  4: 17.0,
  5: 16.0,
  6: 15.0,
  7: 14.0,
  8: 13.0,
  9: 12.0,
  10: 11.0,
  11: 10.0,
  12: 0.0,
  13: 0.0,
  14: 0.0,
  15: 0.0,
  16: 0.0,
  17: 0.0,
  18: 0.0,
  19: 0.0,
  20: 0.0,
  21: 0.0,
  22: -10.0,
  23: -11.0,
  24: -12.0,
  25: -13.0,
  26: -14.0,
  27: -15.0,
  28: -16.0,
  29: -17.0,
  30: -18.0,
  31: -19.0,
  32: -20.0,
};

// =====================================================
// ✅ CARTOLEIROS SOBRAL - CONFIGURAÇÃO TEMPORAL
// Rodadas 1-29: 6 times ativos
// Rodadas 30+: 4 times ativos (2 inativos)
// =====================================================
export const CONFIG_TEMPORAL_SOBRAL = {
  rodadaTransicao: 30,
  motivo: "2 times ficaram inativos a partir da rodada 30",

  // Retorna qual fase usar baseado na rodada
  getFaseAtual(rodada) {
    return rodada < this.rodadaTransicao ? "fase1" : "fase2";
  },

  // Retorna valores de banco corretos para a rodada
  getValoresBanco(rodada) {
    const fase = this.getFaseAtual(rodada);
    return fase === "fase1"
      ? this.valoresFase1_6times
      : this.valoresFase2_4times;
  },

  // Retorna total de times ativos na rodada
  getTotalTimes(rodada) {
    return rodada < this.rodadaTransicao ? 6 : 4;
  },

  // FASE 1: Rodadas 1-29 (6 times)
  valoresFase1_6times: {
    1: 7.0,
    2: 4.0,
    3: 0.0,
    4: -2.0,
    5: -5.0,
    6: -10.0,
  },

  // FASE 2: Rodadas 30+ (4 times)
  valoresFase2_4times: {
    1: 5.0,
    2: 0.0,
    3: 0.0,
    4: -5.0,
  },

  // Faixas de premiação por fase
  faixasFase1: {
    totalTimes: 6,
    credito: { inicio: 1, fim: 2 },
    neutro: { inicio: 3, fim: 3 },
    debito: { inicio: 4, fim: 6 },
  },

  faixasFase2: {
    totalTimes: 4,
    credito: { inicio: 1, fim: 1 },
    neutro: { inicio: 2, fim: 3 },
    debito: { inicio: 4, fim: 4 },
  },

  // Retorna faixas corretas para a rodada
  getFaixas(rodada) {
    return rodada < this.rodadaTransicao ? this.faixasFase1 : this.faixasFase2;
  },
};

// Manter compatibilidade com código legado (usa fase atual = fase2)
export const valoresBancoCartoleirosSobral =
  CONFIG_TEMPORAL_SOBRAL.valoresFase2_4times;

// CONFIGURAÇÃO DE LIGAS
export const LIGAS_CONFIG = {
  SUPERCARTOLA: "684cb1c8af923da7c7df51de",
  CARTOLEIROS_SOBRAL: "684d821cf1a7ae16d1f89572",
};

// =====================================================
// ✅ FUNÇÃO PRINCIPAL: Obter valores de banco por rodada
// Esta função substitui getBancoPorLiga() quando a rodada é conhecida
// =====================================================
export function getBancoPorRodada(ligaId, rodada) {
  if (ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL) {
    return CONFIG_TEMPORAL_SOBRAL.getValoresBanco(rodada);
  }
  return valoresBancoPadrao;
}

// Função legada (manter compatibilidade) - usa valores atuais
export function getBancoPorLiga(ligaId) {
  if (ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL) {
    return valoresBancoCartoleirosSobral;
  }
  return valoresBancoPadrao;
}

// ✅ FUNÇÃO: Obter faixas de premiação por rodada
export function getFaixasPorRodada(ligaId, rodada) {
  if (ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL) {
    return CONFIG_TEMPORAL_SOBRAL.getFaixas(rodada);
  }
  // SuperCartola - faixas fixas
  return {
    totalTimes: 32,
    credito: { inicio: 1, fim: 11 },
    neutro: { inicio: 12, fim: 21 },
    debito: { inicio: 22, fim: 32 },
  };
}

// ✅ FUNÇÃO: Obter total de times ativos por rodada
export function getTotalTimesPorRodada(ligaId, rodada) {
  if (ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL) {
    return CONFIG_TEMPORAL_SOBRAL.getTotalTimes(rodada);
  }
  return 32; // SuperCartola
}

// CONFIGURAÇÃO DE ENDPOINTS
export const RODADAS_ENDPOINTS = {
  getEndpoints: (ligaId, rodadaNum, baseUrl = "") => [
    `${baseUrl}/api/rodadas/${ligaId}/rodadas?inicio=${rodadaNum}&fim=${rodadaNum}`,
    `${baseUrl}/api/ligas/${ligaId}/rodadas?rodada=${rodadaNum}`,
    `${baseUrl}/api/ligas/${ligaId}/ranking/${rodadaNum}`,
  ],
  mercadoStatus: "/api/cartola/mercado/status",
  liga: (ligaId, baseUrl = "") => `${baseUrl}/api/ligas/${ligaId}`,
  pontuacoesParciais: "/api/cartola/atletas/pontuados",
  timeEscalacao: (timeId, rodada, baseUrl = "") =>
    `${baseUrl}/api/cartola/time/id/${timeId}/${rodada}`,
};

// STATUS DO MERCADO DEFAULT
export const STATUS_MERCADO_DEFAULT = {
  rodada_atual: 1,
  status_mercado: 4,
};

// ✅ ATUALIZADO: CONFIGURAÇÃO DE LABELS DE POSIÇÃO (contextual)
export const POSICAO_CONFIG = {
  SUPERCARTOLA: {
    mito: {
      pos: 1,
      label: "MITO",
      style:
        "color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;",
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
  // ✅ Cartoleiros Sobral - Configuração por fase
  CARTOLEIROS_SOBRAL: {
    // Função para obter config baseado na rodada
    getPorRodada(rodada) {
      const fase = CONFIG_TEMPORAL_SOBRAL.getFaseAtual(rodada);
      return fase === "fase1" ? this.fase1 : this.fase2;
    },
    // Fase 1: Rodadas 1-29 (6 times)
    fase1: {
      totalTimes: 6,
      mito: { pos: 1, label: "MITO" },
      g2: { pos: 2, label: "G2", className: "pos-g" },
      neutro: { pos: 3, label: "3º", className: "pos-neutro" },
      z3: { pos: 4, label: "Z3", className: "pos-z" },
      z2: { pos: 5, label: "Z2", className: "pos-z" },
      mico: { pos: 6, label: "MICO", className: "pos-mico" },
    },
    // Fase 2: Rodadas 30+ (4 times)
    fase2: {
      totalTimes: 4,
      mito: { pos: 1, label: "MITO" },
      neutro1: { pos: 2, label: "2º", className: "pos-neutro" },
      neutro2: { pos: 3, label: "3º", className: "pos-neutro" },
      mico: { pos: 4, label: "MICO", className: "pos-mico" },
    },
  },
};

// CONFIGURAÇÃO DE TIMEOUTS E DELAYS
export const TIMEOUTS_CONFIG = {
  renderizacao: 500,
  imageLoad: 3000,
  apiTimeout: 8000,
  retryDelay: 1000,
};

console.log("[RODADAS-CONFIG] Módulo carregado com sucesso");
