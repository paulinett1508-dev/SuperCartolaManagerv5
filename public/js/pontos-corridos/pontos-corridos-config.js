// PONTOS CORRIDOS CONFIG - v3.0 Configurações Dinâmicas
// ✅ v3.0: Busca configuração da API (sem hardcodes)
// Responsável por: configurações, constantes, validações

// Configuração FALLBACK (usado se API falhar)
const CONFIG_FALLBACK = {
  rodadaInicial: 7,
  maxConcurrentRequests: 5,
  timeoutRequest: 10000,
  pontuacao: {
    vitoria: 3,
    empate: 1,
    derrota: 0,
    goleada: 4,
  },
  financeiro: {
    vitoria: 5.0,
    empate: 3.0,
    derrota: -5.0,
    goleada: 7.0,
    goleadaPerda: -7.0,
  },
  criterios: {
    empateTolerancia: 0.3,
    goleadaMinima: 50.0,
  },
  desempate: ["pontos", "vitorias", "pontosGoleada", "saldoPontos", "pontosPro", "nomeCartola"],
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
  textos: {
    carregando: "Carregando dados da rodada",
    erro: "Erro ao carregar dados",
    semDados: "Nenhum dado encontrado",
    dadosParciais: "Dados parciais devido a erro na busca",
  },
  source: 'fallback'
};

// ✅ CONFIGURAÇÃO DINÂMICA (carregada da API)
export let PONTOS_CORRIDOS_CONFIG = { ...CONFIG_FALLBACK };

// Cache da config por liga
const configCache = new Map();
const CACHE_TTL = 300000; // 5 minutos

/**
 * Busca configuração da API
 * @param {string} ligaId - ID da liga
 * @param {number} temporada - Temporada (opcional)
 * @returns {Promise<Object>} Configuração
 */
async function buscarConfigAPI(ligaId, temporada = null) {
  try {
    const url = temporada
      ? `/api/pontos-corridos/config/${ligaId}?temporada=${temporada}`
      : `/api/pontos-corridos/config/${ligaId}`;

    console.log(`[PC-CONFIG] 🔍 Buscando config da API: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.config) {
      throw new Error('Resposta inválida da API');
    }

    console.log(`[PC-CONFIG] ✅ Config carregada da API (source: ${data.config.source})`);
    return data.config;

  } catch (error) {
    console.warn(`[PC-CONFIG] ⚠️ Erro ao buscar config da API:`, error.message);
    return null;
  }
}

/**
 * Mescla config da API com estrutura local
 * @param {Object} apiConfig - Config da API
 * @returns {Object} Config mesclada
 */
function mesclarConfig(apiConfig) {
  if (!apiConfig) {
    return { ...CONFIG_FALLBACK };
  }

  return {
    // Core settings da API
    rodadaInicial: apiConfig.rodadaInicial || CONFIG_FALLBACK.rodadaInicial,
    turnos: apiConfig.turnos || 1,
    temporada: apiConfig.temporada,
    ativo: apiConfig.ativo !== false,
    source: apiConfig.source || 'api',

    // Pontuação
    pontuacao: {
      vitoria: apiConfig.pontuacao_tabela?.vitoria || 3,
      empate: apiConfig.pontuacao_tabela?.empate || 1,
      derrota: apiConfig.pontuacao_tabela?.derrota || 0,
      goleada: 3 + (apiConfig.pontuacao_tabela?.bonus_goleada || 1), // 3 + bônus
    },

    // Financeiro
    financeiro: {
      vitoria: apiConfig.financeiro?.vitoria || 5.0,
      empate: apiConfig.financeiro?.empate || 3.0,
      derrota: apiConfig.financeiro?.derrota || -5.0,
      goleada: apiConfig.financeiro?.goleada || 7.0,
      goleadaPerda: -(apiConfig.financeiro?.goleada || 7.0),
    },

    // Critérios
    criterios: {
      empateTolerancia: apiConfig.criterios?.empateTolerancia || 0.3,
      goleadaMinima: apiConfig.criterios?.goleadaMinima || 50.0,
    },

    // UI e outros mantém fallback
    desempate: CONFIG_FALLBACK.desempate,
    ui: CONFIG_FALLBACK.ui,
    textos: CONFIG_FALLBACK.textos,
    maxConcurrentRequests: CONFIG_FALLBACK.maxConcurrentRequests,
    timeoutRequest: CONFIG_FALLBACK.timeoutRequest,
  };
}

/**
 * Inicializa configuração dinamicamente
 * @param {string} ligaId - ID da liga
 * @param {number} temporada - Temporada (opcional)
 * @param {boolean} forceRefresh - Forçar atualização ignorando cache
 * @returns {Promise<Object>} Configuração carregada
 */
export async function inicializarConfig(ligaId, temporada = null, forceRefresh = false) {
  if (!ligaId) {
    console.warn('[PC-CONFIG] ⚠️ ligaId não fornecido, usando fallback');
    PONTOS_CORRIDOS_CONFIG = { ...CONFIG_FALLBACK };
    return PONTOS_CORRIDOS_CONFIG;
  }

  // Verificar cache
  const cacheKey = `${ligaId}_${temporada || 'current'}`;
  const cached = configCache.get(cacheKey);

  if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[PC-CONFIG] 💾 Usando config do cache (${cacheKey})`);
    PONTOS_CORRIDOS_CONFIG = cached.config;
    return PONTOS_CORRIDOS_CONFIG;
  }

  // Buscar da API
  const apiConfig = await buscarConfigAPI(ligaId, temporada);
  const configFinal = mesclarConfig(apiConfig);

  // Atualizar variável global
  PONTOS_CORRIDOS_CONFIG = configFinal;

  // Armazenar no cache
  configCache.set(cacheKey, {
    config: configFinal,
    timestamp: Date.now()
  });

  console.log(`[PC-CONFIG] ✅ Config inicializada: rodada ${configFinal.rodadaInicial} (source: ${configFinal.source})`);
  return configFinal;
}

/**
 * Invalida cache de configuração
 * @param {string} ligaId - ID da liga (opcional, limpa tudo se não fornecido)
 */
export function invalidarCacheConfig(ligaId = null) {
  if (ligaId) {
    // Limpar apenas essa liga
    for (const key of configCache.keys()) {
      if (key.startsWith(ligaId)) {
        configCache.delete(key);
      }
    }
    console.log(`[PC-CONFIG] 🗑️ Cache invalidado para liga ${ligaId}`);
  } else {
    configCache.clear();
    console.log('[PC-CONFIG] 🗑️ Todo cache invalidado');
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Obtém ID da liga da URL
 */
export function getLigaId() {
  if (typeof window === "undefined") return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}

/**
 * Calcula rodada do Brasileirão
 */
export function calcularRodadaBrasileirao(idxRodada) {
  return PONTOS_CORRIDOS_CONFIG.rodadaInicial + idxRodada;
}

/**
 * Valida configuração
 */
export function validarConfiguracao() {
  const ligaId = getLigaId();
  if (!ligaId) {
    throw new Error("ID da liga não encontrado na URL");
  }

  return {
    ligaId,
    rodadaInicial: PONTOS_CORRIDOS_CONFIG.rodadaInicial,
    temporada: PONTOS_CORRIDOS_CONFIG.temporada,
    valido: true,
  };
}

/**
 * Obtém texto da rodada
 */
export function getRodadaPontosText(rodadaLiga, edicao) {
  if (!rodadaLiga) return "Rodada não definida";

  const rodadaBrasileirao = calcularRodadaBrasileirao(rodadaLiga - 1);
  const temp = PONTOS_CORRIDOS_CONFIG.temporada || new Date().getFullYear();
  return `${rodadaLiga}ª Rodada da Liga ${temp} (Rodada ${rodadaBrasileirao}ª do Brasileirão)`;
}

// Garantir disponibilidade global
if (typeof window !== "undefined") {
  window.getRodadaPontosText = getRodadaPontosText;
  window.PONTOS_CORRIDOS_CONFIG = PONTOS_CORRIDOS_CONFIG;
}

console.log("[PC-CONFIG] ✅ v3.0 Módulo carregado (config dinâmica)");
