// RODADAS CACHE - Sistema de Cache e Performance
// Responsável por: cache de dados, performance, otimizações

// CONFIGURAÇÃO DE CACHE
const CACHE_CONFIG = {
  maxAge: 5 * 60 * 1000, // 5 minutos
  maxEntries: 100,
  cleanupInterval: 60 * 1000, // 1 minuto
};

// STORE DE CACHE
class RodadasCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.setupCleanup();
  }

  // GERAR CHAVE DO CACHE
  generateKey(ligaId, rodada, tipo = "ranking") {
    return `${tipo}_${ligaId}_${rodada}`;
  }

  // ARMAZENAR NO CACHE
  set(key, data) {
    if (this.cache.size >= CACHE_CONFIG.maxEntries) {
      this.cleanup();
    }

    this.cache.set(key, data);
    this.timestamps.set(key, Date.now());

    console.log(`[RODADAS-CACHE] Dados armazenados: ${key}`);
  }

  // RECUPERAR DO CACHE
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const timestamp = this.timestamps.get(key);
    if (Date.now() - timestamp > CACHE_CONFIG.maxAge) {
      this.delete(key);
      console.log(`[RODADAS-CACHE] Cache expirado removido: ${key}`);
      return null;
    }

    console.log(`[RODADAS-CACHE] Cache hit: ${key}`);
    return this.cache.get(key);
  }

  // REMOVER DO CACHE
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  // LIMPEZA AUTOMÁTICA
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > CACHE_CONFIG.maxAge) {
        this.delete(key);
        removed++;
      }
    }

    console.log(
      `[RODADAS-CACHE] Limpeza automática: ${removed} itens removidos`,
    );
  }

  // CONFIGURAR LIMPEZA PERIÓDICA
  setupCleanup() {
    setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.cleanupInterval);

    console.log(
      `[RODADAS-CACHE] Limpeza automática configurada (${CACHE_CONFIG.cleanupInterval}ms)`,
    );
  }

  // LIMPAR TUDO
  clear() {
    this.cache.clear();
    this.timestamps.clear();
    console.log("[RODADAS-CACHE] Cache completamente limpo");
  }

  // ESTATÍSTICAS
  getStats() {
    return {
      size: this.cache.size,
      maxEntries: CACHE_CONFIG.maxEntries,
      maxAge: CACHE_CONFIG.maxAge,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// INSTÂNCIA SINGLETON
const rodadasCache = new RodadasCache();

// ==============================
// FUNÇÕES DE CACHE PARA RANKINGS
// ==============================

// CACHE PARA RANKINGS DE RODADA
export function cacheRankingRodada(ligaId, rodada, data) {
  const key = rodadasCache.generateKey(ligaId, rodada, "ranking");
  rodadasCache.set(key, data);
}

export function getCachedRankingRodada(ligaId, rodada) {
  const key = rodadasCache.generateKey(ligaId, rodada, "ranking");
  return rodadasCache.get(key);
}

// CACHE PARA DADOS PARCIAIS
export function cacheParciais(ligaId, rodada, data) {
  const key = rodadasCache.generateKey(ligaId, rodada, "parciais");
  rodadasCache.set(key, data);
}

export function getCachedParciais(ligaId, rodada) {
  const key = rodadasCache.generateKey(ligaId, rodada, "parciais");
  return rodadasCache.get(key);
}

// CACHE PARA STATUS DO MERCADO
export function cacheStatusMercado(data) {
  const key = "status_mercado";
  rodadasCache.set(key, data);
}

export function getCachedStatusMercado() {
  const key = "status_mercado";
  return rodadasCache.get(key);
}

// CACHE PARA DADOS DE LIGA
export function cacheLiga(ligaId, data) {
  const key = rodadasCache.generateKey(ligaId, "all", "liga");
  rodadasCache.set(key, data);
}

export function getCachedLiga(ligaId) {
  const key = rodadasCache.generateKey(ligaId, "all", "liga");
  return rodadasCache.get(key);
}

// ==============================
// FUNÇÕES DE CONTROLE
// ==============================

// INVALIDAR CACHE DE UMA RODADA ESPECÍFICA
export function invalidarCacheRodada(ligaId, rodada) {
  const rankingKey = rodadasCache.generateKey(ligaId, rodada, "ranking");
  const parciaisKey = rodadasCache.generateKey(ligaId, rodada, "parciais");

  rodadasCache.delete(rankingKey);
  rodadasCache.delete(parciaisKey);

  console.log(`[RODADAS-CACHE] Cache invalidado para rodada ${rodada}`);
}

// INVALIDAR CACHE DE UMA LIGA
export function invalidarCacheLiga(ligaId) {
  const stats = rodadasCache.getStats();
  let removed = 0;

  stats.keys.forEach((key) => {
    if (key.includes(ligaId)) {
      rodadasCache.delete(key);
      removed++;
    }
  });

  console.log(
    `[RODADAS-CACHE] Cache da liga ${ligaId} invalidado: ${removed} itens`,
  );
}

// LIMPAR TODO O CACHE
export function limparCache() {
  rodadasCache.clear();
}

// OBTER ESTATÍSTICAS
export function getEstatatisticasCache() {
  return rodadasCache.getStats();
}

// ==============================
// CACHE PARA ELEMENTOS DOM
// ==============================

class DOMCache {
  constructor() {
    this.elements = new Map();
  }

  get(id) {
    if (!this.elements.has(id)) {
      const element = document.getElementById(id);
      if (element) {
        this.elements.set(id, element);
      }
      return element;
    }
    return this.elements.get(id);
  }

  clear() {
    this.elements.clear();
    console.log("[RODADAS-CACHE] Cache DOM limpo");
  }

  remove(id) {
    this.elements.delete(id);
  }
}

const domCache = new DOMCache();

export function getElementCached(id) {
  return domCache.get(id);
}

export function clearDOMCache() {
  domCache.clear();
}

// ==============================
// UTILITÁRIOS DE PERFORMANCE
// ==============================

// DEBOUNCE PARA FUNÇÕES FREQUENTES
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// THROTTLE PARA EVENTOS
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// CACHE PARA IMAGENS DE ESCUDOS
class ImageCache {
  constructor() {
    this.cache = new Map();
    this.loading = new Set();
  }

  async preloadImage(src) {
    if (this.cache.has(src) || this.loading.has(src)) {
      return this.cache.get(src) || Promise.resolve();
    }

    this.loading.add(src);

    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, img);
        this.loading.delete(src);
        resolve(img);
      };
      img.onerror = () => {
        this.loading.delete(src);
        reject(new Error(`Falha ao carregar imagem: ${src}`));
      };
      img.src = src;
    });

    return promise;
  }

  get(src) {
    return this.cache.get(src);
  }

  clear() {
    this.cache.clear();
    this.loading.clear();
  }
}

const imageCache = new ImageCache();

export function preloadEscudo(clubeId) {
  const src = `/escudos/${clubeId}.png`;
  return imageCache.preloadImage(src);
}

export function preloadEscudos(rankings) {
  const promises = rankings
    .filter((rank) => rank.clube_id)
    .map((rank) => preloadEscudo(rank.clube_id));

  return Promise.allSettled(promises);
}

// ==============================
// MONITORAMENTO E DEBUG
// ==============================

// EXPOR FUNÇÕES DE DEBUG NO WINDOW
if (typeof window !== "undefined") {
  window.rodadasCacheDebug = {
    getStats: getEstatatisticasCache,
    clearCache: limparCache,
    clearDOMCache,
    invalidarCacheRodada,
    invalidarCacheLiga,
    cache: rodadasCache,
  };
}

console.log("[RODADAS-CACHE] Sistema de cache inicializado");
console.log("[RODADAS-CACHE] Limpeza automática configurada (5min)");
