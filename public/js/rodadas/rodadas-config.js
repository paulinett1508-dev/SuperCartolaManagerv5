// RODADAS CONFIG - Configurações e Constantes
// Responsável por: configurações de banco, ligas, endpoints

// VALORES DE BANCO PADRÃO (linhas 52-83 do original)
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

// VALORES ESPECÍFICOS PARA CARTOLEIROS SOBRAL (linhas 85-92 do original)
export const valoresBancoCartoleirosSobral = {
  1: 7.0,
  2: 4.0,
  3: 0.0,
  4: -2.0,
  5: -5.0,
  6: -10.0,
};

// CONFIGURAÇÃO DE LIGAS
export const LIGAS_CONFIG = {
  SUPERCARTOLA: "684cb1c8af923da7c7df51de",
  CARTOLEIROS_SOBRAL: "684d821cf1a7ae16d1f89572",
};

// FUNÇÃO PARA OBTER VALORES DE BANCO POR LIGA (ADICIONADA)
export function getBancoPorLiga(ligaId) {
  if (ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL) {
    return valoresBancoCartoleirosSobral;
  }
  return valoresBancoPadrao;
}

// CONFIGURAÇÃO DE ENDPOINTS (baseado nas linhas 350-367 do original)
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

// STATUS DO MERCADO DEFAULT (linha 29 do original)
export const STATUS_MERCADO_DEFAULT = {
  rodada_atual: 1,
  status_mercado: 4,
};

// CONFIGURAÇÃO DE LABELS DE POSIÇÃO (baseado na função getPosLabel do original)
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
  CARTOLEIROS_SOBRAL: {
    mito: {
      pos: 1,
      label: "MITO",
      style:
        "color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;",
    },
    g2: { pos: 2, label: "G2", className: "pos-g" },
    mico: {
      pos: 6,
      label: "MICO",
      style:
        "color:#fff; font-weight:bold; background:#dc3545; border-radius:4px; padding:1px 8px; font-size:12px;",
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
