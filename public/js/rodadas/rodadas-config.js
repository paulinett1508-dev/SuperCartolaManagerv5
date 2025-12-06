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
//
// HISTÓRICO:
// - Rodadas 1-29: 6 times ativos (inativos ainda figuravam no ranking)
// - Rodadas 30-38: 4 times ativos (2 times desistiram e foram removidos)
//
// REGRA: rodada < 30 = fase1 | rodada >= 30 = fase2
// =====================================================
export const RODADA_TRANSICAO_SOBRAL = 30;

// FASE 1: Rodadas 1-29 (6 times - antes da desistência)
export const valoresFase1_6times = {
  1: 7.0, // MITO
  2: 4.0, // G2
  3: 0.0, // Neutro
  4: -2.0, // Z3
  5: -5.0, // Z2
  6: -10.0, // MICO
};

// FASE 2: Rodadas 30-38 (4 times - após desistência de 2 participantes)
export const valoresFase2_4times = {
  1: 5.0, // MITO
  2: 0.0, // Neutro
  3: 0.0, // Neutro
  4: -5.0, // MICO
};

// Faixas de premiação - FASE 1 (rodadas 1-29)
export const faixasFase1 = {
  totalTimes: 6,
  credito: { inicio: 1, fim: 2 }, // Posições 1-2 ganham
  neutro: { inicio: 3, fim: 3 }, // Posição 3 empata
  debito: { inicio: 4, fim: 6 }, // Posições 4-6 perdem
};

// Faixas de premiação - FASE 2 (rodadas 30-38)
export const faixasFase2 = {
  totalTimes: 4,
  credito: { inicio: 1, fim: 1 }, // Só posição 1 ganha (MITO)
  neutro: { inicio: 2, fim: 3 }, // Posições 2-3 empatam
  debito: { inicio: 4, fim: 4 }, // Só posição 4 perde (MICO)
};

// Manter compatibilidade com código legado (usa fase atual = fase2)
export const valoresBancoCartoleirosSobral = valoresFase2_4times;

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
    return rodada < RODADA_TRANSICAO_SOBRAL
      ? valoresFase1_6times
      : valoresFase2_4times;
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
    return rodada < RODADA_TRANSICAO_SOBRAL ? faixasFase1 : faixasFase2;
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
    return rodada < RODADA_TRANSICAO_SOBRAL ? 6 : 4;
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
  // ✅ Cartoleiros Sobral - Estrutura compatível (usa fase atual = fase2)
  // Para compatibilidade com rodadas-ui.js que não passa rodada
  CARTOLEIROS_SOBRAL: {
    mito: {
      pos: 1,
      label: "MITO",
      style:
        "color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;",
    },
    g2: {
      pos: 2,
      label: "2º",
      className: "pos-neutro",
    },
    neutro: {
      pos: 3,
      label: "3º",
      className: "pos-neutro",
    },
    mico: {
      pos: 4,
      label: "MICO",
      style:
        "color:#fff; font-weight:bold; background:#dc3545; border-radius:4px; padding:1px 8px; font-size:12px;",
    },
  },
  // Configurações por fase para uso contextual
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

// Função para obter config de posição por rodada (para uso contextual)
export function getPosicaoConfigPorRodada(ligaId, rodada) {
  if (ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL) {
    return rodada < RODADA_TRANSICAO_SOBRAL
      ? POSICAO_CONFIG.CARTOLEIROS_SOBRAL_FASES.fase1
      : POSICAO_CONFIG.CARTOLEIROS_SOBRAL_FASES.fase2;
  }
  return POSICAO_CONFIG.SUPERCARTOLA;
}

// CONFIGURAÇÃO DE TIMEOUTS E DELAYS
export const TIMEOUTS_CONFIG = {
  renderizacao: 500,
  imageLoad: 3000,
  apiTimeout: 8000,
  retryDelay: 1000,
};

console.log("[RODADAS-CONFIG] Módulo carregado com sucesso");
