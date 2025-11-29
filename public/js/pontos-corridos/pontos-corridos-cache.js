// PONTOS CORRIDOS CACHE - Sistema de Cache
// Responsável por: cache de dados, otimização de performance

// Cache global do módulo
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutos

// Estrutura do cache
const cacheKeys = {
  STATUS_MERCADO: "status_mercado",
  TIMES_LIGA: "times_liga",
  RANKING_RODADA: "ranking_rodada",
  CONFRONTOS_BASE: "confrontos_base",
  CLASSIFICACAO: "classificacao",
};

// Função para criar chave de cache
function criarChaveCache(tipo, ...params) {
  return `${tipo}_${params.join("_")}`;
}

// Função para verificar se cache está válido
function isCacheValido(timestamp) {
  return Date.now() - timestamp < CACHE_TTL;
}

// Função para armazenar no cache
export function setCache(tipo, dados, ...params) {
  const chave = criarChaveCache(tipo, ...params);
  cache.set(chave, {
    dados,
    timestamp: Date.now(),
  });

  console.log(`[PONTOS-CORRIDOS-CACHE] Dados armazenados: ${chave}`);
}

// Função para recuperar do cache
export function getCache(tipo, ...params) {
  const chave = criarChaveCache(tipo, ...params);
  const entrada = cache.get(chave);

  if (!entrada) {
    return null;
  }

  if (!isCacheValido(entrada.timestamp)) {
    cache.delete(chave);
    console.log(`[PONTOS-CORRIDOS-CACHE] Cache expirado removido: ${chave}`);
    return null;
  }

  console.log(`[PONTOS-CORRIDOS-CACHE] Dados recuperados do cache: ${chave}`);
  return entrada.dados;
}

// Função para limpar cache específico
export function clearCache(tipo, ...params) {
  if (tipo && params.length > 0) {
    const chave = criarChaveCache(tipo, ...params);
    cache.delete(chave);
    console.log(`[PONTOS-CORRIDOS-CACHE] Cache limpo: ${chave}`);
  } else if (tipo) {
    // Limpar todos os caches de um tipo
    const chaves = Array.from(cache.keys()).filter((k) => k.startsWith(tipo));
    chaves.forEach((chave) => cache.delete(chave));
    console.log(
      `[PONTOS-CORRIDOS-CACHE] Caches do tipo ${tipo} limpos: ${chaves.length}`,
    );
  } else {
    // Limpar todo o cache
    cache.clear();
    console.log("[PONTOS-CORRIDOS-CACHE] Todo o cache foi limpo");
  }
}

// Cache para status do mercado
export async function getStatusMercadoCache() {
  let status = getCache(cacheKeys.STATUS_MERCADO);

  if (!status) {
    try {
      const res = await fetch("/api/cartola/mercado/status");
      if (!res.ok) throw new Error("Erro ao buscar status do mercado");

      status = await res.json();
      setCache(cacheKeys.STATUS_MERCADO, status);
    } catch (err) {
      console.error("Erro ao buscar status do mercado:", err);
      status = { rodada_atual: 1, status_mercado: 2 };
    }
  }

  return status;
}

// Cache para times da liga
export async function getTimesLigaCache(ligaId) {
  let times = getCache(cacheKeys.TIMES_LIGA, ligaId);

  if (!times) {
    try {
      const res = await fetch(`/api/ligas/${ligaId}/times`);
      if (!res.ok) throw new Error("Erro ao buscar times da liga");

      times = await res.json();
      setCache(cacheKeys.TIMES_LIGA, times, ligaId);
    } catch (err) {
      console.error("Erro ao buscar times da liga:", err);
      times = [];
    }
  }

  return times;
}

// Cache para ranking de rodada específica
export async function getRankingRodadaCache(
  ligaId,
  rodada,
  getRankingFunction,
) {
  let ranking = getCache(cacheKeys.RANKING_RODADA, ligaId, rodada);

  if (!ranking && getRankingFunction) {
    try {
      ranking = await getRankingFunction(ligaId, rodada);
      if (ranking && Array.isArray(ranking)) {
        setCache(cacheKeys.RANKING_RODADA, ranking, ligaId, rodada);
      }
    } catch (err) {
      console.error(`Erro ao buscar ranking da rodada ${rodada}:`, err);
      ranking = [];
    }
  }

  return ranking || [];
}

// Cache para confrontos base
export function getConfrontosBaseCache(times) {
  const timesKey = times
    .map((t) => t.id)
    .sort()
    .join(",");
  let confrontos = getCache(cacheKeys.CONFRONTOS_BASE, timesKey);

  if (!confrontos) {
    // Importa função de geração dinamicamente para evitar dependência circular
    import("./pontos-corridos-core.js").then((module) => {
      confrontos = module.gerarConfrontos(times);
      setCache(cacheKeys.CONFRONTOS_BASE, confrontos, timesKey);
    });
  }

  return confrontos || [];
}

// Cache para classificação calculada
export function getClassificacaoCache(ligaId, ultimaRodada) {
  return getCache(cacheKeys.CLASSIFICACAO, ligaId, ultimaRodada);
}

export function setClassificacaoCache(classificacao, ligaId, ultimaRodada) {
  setCache(cacheKeys.CLASSIFICACAO, classificacao, ligaId, ultimaRodada);
}

// Função de limpeza automática
function limpezaAutomatica() {
  const agora = Date.now();
  let removidos = 0;

  for (const [chave, entrada] of cache.entries()) {
    if (!isCacheValido(entrada.timestamp)) {
      cache.delete(chave);
      removidos++;
    }
  }

  if (removidos > 0) {
    console.log(
      `[PONTOS-CORRIDOS-CACHE] Limpeza automática: ${removidos} entradas removidas`,
    );
  }
}

// Configurar limpeza automática
setInterval(limpezaAutomatica, CACHE_TTL);

// Função para obter estatísticas do cache
export function getEstatisticasCache() {
  return {
    entradas: cache.size,
    tipos: Array.from(
      new Set(Array.from(cache.keys()).map((k) => k.split("_")[0])),
    ),
    ultimaLimpeza: Date.now(),
  };
}

// Função para salvar cache persistente no MongoDB
export async function salvarCachePersistente(
  ligaId,
  rodadaLiga,
  classificacao,
) {
  try {
    console.log(
      `[CACHE-PC] 💾 Salvando classificação da rodada ${rodadaLiga} no MongoDB...`,
    );

    // ✅ Determinar se é cache permanente
    const statusMercado = getStatusMercado(); // Assume que getStatusMercado está disponível e retorna um objeto com rodada_atual
    const isPermanent = statusMercado.rodada_atual > rodadaLiga;

    const response = await fetch(`/api/pontos-corridos/cache/${ligaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rodada: rodadaLiga,
        classificacao: classificacao,
        permanent: isPermanent, // ✅ Sinaliza se é cache permanente
      }),
    });

    if (response.ok) {
      const msg = isPermanent
        ? `[CACHE-PC] ✅ Cache PERMANENTE salvo (Rodada ${rodadaLiga} consolidada)`
        : `[CACHE-PC] ✅ Cache temporário salvo (Rodada ${rodadaLiga})`;
      console.log(msg);
      return true;
    } else {
      console.warn(`[CACHE-PC] ⚠️ Falha ao salvar cache: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error("[CACHE-PC] ❌ Erro ao salvar cache persistente:", error);
    return false;
  }
}

console.log("[PONTOS-CORRIDOS-CACHE] Sistema de cache inicializado");
console.log("[PONTOS-CORRIDOS-CACHE] Limpeza automática configurada (5min)");

// Cleanup em unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    cache.clear();
    console.log("[PONTOS-CORRIDOS-CACHE] Cache limpo no unload");
  });
}
