// PONTOS CORRIDOS CONFIG - Configurações Centrais
// Responsável por: configurações, constantes, validações

// Configuração da Liga Pontos Corridos
export const PONTOS_CORRIDOS_CONFIG = {
  rodadaInicial: 7,
  maxConcurrentRequests: 5,
  timeoutRequest: 10000,

  // Sistema de pontuação
  pontuacao: {
    vitoria: 3,
    empate: 1,
    derrota: 0,
    goleada: 4, // Pontos extras para goleada
  },

  // Sistema financeiro
  financeiro: {
    vitoria: 5.0,
    empate: 3.0,
    derrota: -5.0,
    goleada: 7.0,
    goleadaPerda: -7.0,
  },

  // Critérios para resultados
  criterios: {
    empateTolerancia: 0.3, // Diferença <= 0.3 = empate
    goleadaMinima: 50.0, // Diferença >= 50 = goleada
  },

  // Critérios de desempate (ordem)
  desempate: [
    "pontos", // 1. Pontos
    "vitorias", // 2. Vitórias
    "pontosGoleada", // 3. Pontos Goleada
    "saldoPontos", // 4. Saldo de Pontos
    "pontosPro", // 5. Pontos Pró
    "nomeCartola", // 6. Ordem alfabética
  ],

  // Configurações de UI
  ui: {
    maxWidth: "1000px",
    fontSize: {
      rodada: "13px",
      classificacao: "13px",
      header: "1.2rem",
      subheader: "1rem",
    },
    cores: {
      vencedor: "#198754",
      perdedor: "#dc3545",
      empate: "#333",
      goleada: "#ffc107",
    },
  },

  // Templates de texto
  textos: {
    carregando: "Carregando dados da rodada",
    erro: "Erro ao carregar dados",
    semDados: "Nenhum dado encontrado",
    dadosParciais: "Dados parciais devido a erro na busca",
  },
};

// Função para obter ID da liga
export function getLigaId() {
  if (typeof window === "undefined") return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}

// Função para calcular rodada do Brasileirão
export function calcularRodadaBrasileirao(idxRodada) {
  return PONTOS_CORRIDOS_CONFIG.rodadaInicial + idxRodada;
}

// Função para validar configuração
export function validarConfiguracao() {
  const ligaId = getLigaId();
  if (!ligaId) {
    throw new Error("ID da liga não encontrado na URL");
  }

  return {
    ligaId,
    rodadaInicial: PONTOS_CORRIDOS_CONFIG.rodadaInicial,
    valido: true,
  };
}

// Função para obter texto da rodada (CORREÇÃO para mata-mata)
export function getRodadaPontosText(rodadaLiga, edicao) {
  if (!rodadaLiga) return "Rodada não definida";

  const rodadaBrasileirao = calcularRodadaBrasileirao(rodadaLiga - 1);
  return `${rodadaLiga}ª Rodada da Liga (Rodada ${rodadaBrasileirao}ª do Brasileirão)`;
}

console.log("[PONTOS-CORRIDOS-CONFIG] Módulo carregado com sucesso");
