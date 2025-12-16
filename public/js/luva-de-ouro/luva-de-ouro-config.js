// LUVA DE OURO CONFIG - Configurações e constantes (v2.0 SaaS)
// ✅ v2.0: Removido liga IDs hardcoded - config vem do servidor

console.log("🥅 [LUVA-CONFIG] Módulo de configuração v2.0 SaaS carregando...");

const LuvaDeOuroConfig = {
  // ==============================
  // v2.0: IDs removidos - usar getLigaIdAtual()
  // ==============================

  // Obter liga ID da URL (dinâmico)
  getLigaIdAtual: function() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
  },

  // ==============================
  // ENDPOINTS DA API
  // ==============================

  API: {
    BASE: "/api/luva-de-ouro",
    RANKING: (ligaId) => `/api/luva-de-ouro/${ligaId}/ranking`,
    DETECTAR_RODADA: (ligaId) => `/api/luva-de-ouro/${ligaId}/detectar-rodada`,
    ESTATISTICAS: (ligaId) => `/api/luva-de-ouro/${ligaId}/estatisticas`,
    COLETAR: (ligaId) => `/api/luva-de-ouro/${ligaId}/coletar`,
    DETALHES_PARTICIPANTE: (ligaId, participanteId) =>
      `/api/luva-de-ouro/${ligaId}/participante/${participanteId}/detalhes`,
    DIAGNOSTICO: (ligaId) => `/api/luva-de-ouro/${ligaId}/diagnostico`,
  },

  // ==============================
  // SELETORES DOM
  // ==============================

  SELECTORS: {
    CONTENT: "#luvaDeOuroContent",
    RODADAS_CARDS: "#luvaRodadasCards",
    RANKING_BODY: "#luvaRankingBody",
    INFO_STATUS: "#luvaInfoStatus",
    TITULO_RODADA: "#luvaTituloRodada",
    STATS_CONTAINER: "#luvaStatsContainer",
  },

  // ==============================
  // v2.0: ESCUDOS agora vêm da API /api/ligas/:id
  // Não mais hardcoded - usar buscarEscudosParticipantes()
  // ==============================

  // ==============================
  // CONFIGURAÇÕES DE RODADAS
  // ==============================

  RODADAS: {
    MIN: 1,
    MAX: 38,
    DEFAULT_INICIO: 1,
  },

  // ==============================
  // CACHE
  // ==============================

  CACHE: {
    TTL_PARCIAL: 5 * 60 * 1000, // 5 minutos
    TTL_CONSOLIDADO: 24 * 60 * 60 * 1000, // 24 horas
    STORAGE_PREFIX: "luva_cache_",
  },

  // ==============================
  // MENSAGENS
  // ==============================

  MESSAGES: {
    LOADING: "Carregando dados dos goleiros...",
    LOADING_COLETA: "Coletando novos dados da API...",
    LOADING_RANKING: "Buscando ranking...",
    DETECTANDO_RODADA: "Detectando última rodada...",
    ERRO_CONTAINER: "Container não encontrado",
    ERRO_API: "Erro ao buscar dados",
    ERRO_REDE: "Erro de conexão com o servidor",
  },

  // ==============================
  // ESTADO INICIAL
  // ==============================

  INITIAL_STATE: {
    ranking: null,
    rodadaAtual: null,
    mercadoAberto: false,
    rodadaSelecionada: null,
    rodadasComDados: [],
    carregando: false,
    inicializado: false,
  },
};

// Exportar para window
window.LuvaDeOuroConfig = LuvaDeOuroConfig;

console.log("✅ [LUVA-CONFIG] Módulo de configuração carregado");
