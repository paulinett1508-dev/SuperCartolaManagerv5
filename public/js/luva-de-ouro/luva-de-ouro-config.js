// public/js/luva-de-ouro/luva-de-ouro-config.js
console.log("🥅 [LUVA-CONFIG] Módulo de configuração carregando...");

/**
 * Configurações e constantes do módulo Luva de Ouro
 */
const LuvaDeOuroConfig = {
  // Identificadores
  LIGA_SOBRAL_ID: "684d821cf1a7ae16d1f89572",

  // Endpoints da API
  API: {
    BASE: "/api/luva-de-ouro",
    RANKING: (ligaId) => `/api/luva-de-ouro/${ligaId}/ranking`,
    DETECTAR_RODADA: (ligaId) => `/api/luva-de-ouro/${ligaId}/detectar-rodada`,
    ESTATISTICAS: (ligaId) => `/api/luva-de-ouro/${ligaId}/estatisticas`,
    DETALHES_PARTICIPANTE: (ligaId, participanteId) =>
      `/api/luva-de-ouro/${ligaId}/participante/${participanteId}/detalhes`,
  },

  // Seletores DOM
  SELECTORS: {
    CONTENT: "#luvaDeOuroContent",
    EXPORT_BTN_CONTAINER: "#luvaDeOuroExportBtnContainer",
    RODADA_INICIO: "#luvaRodadaInicio",
    RODADA_FIM: "#luvaRodadaFim",
    INFO_TEXTO: "#luvaInfoTexto",
    BTN_RANKING: "#luvaRankingBtn",
    BTN_ULTIMA_RODADA: "#luvaUltimaRodadaBtn",
    BTN_FORCAR_COLETA: "#luvaForcarColetaBtn",
    BTN_EXPORT: "#exportLuvaImagem",
    MODAL_DETALHES: "#modalDetalhesParticipante",
  },

  // Mapeamento de escudos dos participantes
  ESCUDOS_PARTICIPANTES: {
    1926323: 262, // Daniel Barbosa - Flamengo
    13935277: 263, // Paulinett Miranda - Botafogo
    14747183: 264, // Carlos Henrique - Corinthians
    49149009: 266, // Matheus Coutinho - Fluminense
    49149388: 267, // Junior Brasilino - Vasco
    50180257: 275, // Hivisson - Palmeiras
  },

  // Configurações de rodadas
  RODADAS: {
    MIN: 1,
    MAX: 38,
    DEFAULT_INICIO: 1,
  },

  // Configurações de exportação
  EXPORT: {
    WIDTH: 800,
    SCALE: 3,
    FORMAT: "image/png",
    QUALITY: 0.95,
    HTML2CANVAS_URL:
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  },

  // Mensagens do sistema
  MESSAGES: {
    LOADING: "Carregando dados dos goleiros...",
    LOADING_COLETA: "Coletando novos dados...",
    LOADING_RANKING: "Buscando ranking...",
    DETECTANDO_RODADA: "Detectando última rodada...",
    ERRO_CONTAINER: "Container não encontrado",
    ERRO_API: "Erro ao buscar dados",
    SUCESSO_EXPORT: "Imagem exportada com sucesso!",
    ERRO_EXPORT: "Erro ao exportar imagem. Usando CSV.",
    INFO_INICIAL: "Clique em 'Até Última Rodada' para detectar automaticamente",
  },

  // Configurações de notificações
  NOTIFICATION: {
    DURATION: 3000,
    POSITION: { top: "20px", right: "20px" },
    COLORS: {
      success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724" },
      error: { bg: "#f8d7da", border: "#f5c6cb", text: "#721c24" },
      info: { bg: "#d1ecf1", border: "#bee5eb", text: "#0c5460" },
      warning: { bg: "#fff3cd", border: "#ffeaa7", text: "#856404" },
    },
  },

  // Estado inicial
  INITIAL_STATE: {
    ranking: [],
    estatisticas: {},
    ultimaRodada: 0,
    rodadaDetectada: null,
    carregando: false,
  },
};

// Exportar configuração
window.LuvaDeOuroConfig = LuvaDeOuroConfig;

console.log("✅ [LUVA-CONFIG] Módulo de configuração carregado");
