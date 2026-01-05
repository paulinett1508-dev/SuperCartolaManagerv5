/**
 * CACHE MANAGER - Sistema de Cache Inteligente
 * Persistente (IndexedDB) + Memória (Map)
 * Sobrevive a page refreshes
 */

const CACHE_CONFIG = {
  dbName: "CartolaCache",
  dbVersion: 1,
  stores: {
    rankings: "rankings",
    participantes: "participantes",
    extrato: "extrato",
    rodadas: "rodadas",
    status: "status",
    ligas: "ligas",
  },
  ttl: {
    // TTL em milissegundos
    rankings: 10 * 60 * 1000, // 10 min
    participantes: 5 * 60 * 1000, // 5 min (reduzido para atualizar novos participantes)
    extrato: 5 * 60 * 1000, // 5 min
    rodadas: 15 * 60 * 1000, // 15 min
    status: 2 * 60 * 1000, // 2 min
    ligas: 20 * 60 * 1000, // 20 min
  },
};

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.db = null;
    this.initPromise = this.init();
  }

  // Inicializar IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        CACHE_CONFIG.dbName,
        CACHE_CONFIG.dbVersion,
      );

      request.onerror = () => {
        if (window.Log)
          Log.error("CACHE-MANAGER", "Erro ao abrir IndexedDB:", request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        if (window.Log) Log.info("CACHE-MANAGER", "✅ IndexedDB inicializado");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Criar stores se não existirem
        Object.values(CACHE_CONFIG.stores).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "key" });
          }
        });

        if (window.Log) Log.debug("CACHE-MANAGER", "🔧 Database upgraded");
      };
    });
  }

  // Gerar chave única
  _generateKey(type, params) {
    const paramsString = JSON.stringify(params);
    return `${type}_${paramsString}`;
  }

  // Verificar validade do cache
  _isValid(entry, ttl) {
    if (!entry || !entry.timestamp) return false;
    const age = Date.now() - entry.timestamp;
    return age < ttl;
  }

  // GET - com fallback memory → IndexedDB → fetch
  async get(storeName, key, fetchFn, options = {}) {
    const { force = false, ttl = CACHE_CONFIG.ttl[storeName] } = options;

    // 1. Tentar memory cache primeiro
    if (!force && this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key);
      if (this._isValid(entry, ttl)) {
        if (window.Log) Log.debug("CACHE-MANAGER", `💾 Memory hit: ${key}`);
        return entry.data;
      }
    }

    // 2. Tentar IndexedDB
    await this.initPromise;
    const dbEntry = await this._getFromDB(storeName, key);

    if (!force && dbEntry && this._isValid(dbEntry, ttl)) {
      if (window.Log) Log.debug("CACHE-MANAGER", `💿 IndexedDB hit: ${key}`);
      // Atualizar memory cache
      this.memoryCache.set(key, dbEntry);
      return dbEntry.data;
    }

    // 3. Cache miss - executar fetch
    if (fetchFn) {
      if (window.Log) Log.debug("CACHE-MANAGER", `🌐 Fetching: ${key}`);
      try {
        const data = await fetchFn();

        // Salvar em ambos caches
        await this.set(storeName, key, data);
        return data;
      } catch (error) {
        if (window.Log)
          Log.error("CACHE-MANAGER", `Erro ao buscar ${key}:`, error);
        // Tentar buscar do localStorage como fallback
        try {
          const stored = localStorage.getItem(`cache_${key}`);
          if (stored) {
            const data = JSON.parse(stored);
            if (data.expiry > Date.now()) {
              if (window.Log)
                Log.debug(
                  "CACHE-MANAGER",
                  `🛋️ Fallback localStorage hit: ${key}`,
                );
              return data.value;
            }
          }
        } catch (e) {
          if (window.Log)
            Log.warn("CACHE-MANAGER", "Fallback localStorage falhou:", e);
        }
        return null; // Retorna null se fetchFn falhar e fallback não ajudar
      }
    }

    return null;
  }

  // SET - salvar em memory + IndexedDB
  async set(storeName, key, data) {
    const entry = {
      key,
      data,
      timestamp: Date.now(),
    };

    // Salvar em memória
    this.memoryCache.set(key, entry);

    // Salvar em IndexedDB
    await this.initPromise;
    try {
      await this._saveToDB(storeName, entry);
      if (window.Log)
        Log.debug("CACHE-MANAGER", `✅ Saved to IndexedDB: ${key}`);
    } catch (error) {
      if (window.Log)
        Log.warn("CACHE-MANAGER", `Erro ao salvar em IndexedDB ${key}:`, error);
      // Fallback para localStorage se IndexedDB falhar
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
        if (window.Log)
          Log.debug(
            "CACHE-MANAGER",
            `💾 Saved to localStorage as fallback: ${key}`,
          );
      } catch (e) {
        if (window.Log)
          Log.warn(
            "CACHE-MANAGER",
            "Fallback localStorage falhou ao salvar:",
            e,
          );
      }
    }
  }

  // Invalidar cache específico
  async invalidate(storeName, key) {
    this.memoryCache.delete(key);

    await this.initPromise;
    try {
      await this._deleteFromDB(storeName, key);
      if (window.Log)
        Log.debug("CACHE-MANAGER", `🗑️ Invalidated in IndexedDB: ${key}`);
    } catch (error) {
      if (window.Log)
        Log.warn(
          "CACHE-MANAGER",
          `Erro ao invalidar em IndexedDB ${key}:`,
          error,
        );
      // Tentar invalidar do localStorage como fallback
      try {
        localStorage.removeItem(`cache_${key}`);
        if (window.Log)
          Log.debug(
            "CACHE-MANAGER",
            `🗑️ Invalidated in localStorage fallback: ${key}`,
          );
      } catch (e) {
        if (window.Log)
          Log.warn(
            "CACHE-MANAGER",
            "Fallback localStorage falhou ao invalidar:",
            e,
          );
      }
    }
  }

  // Invalidar store inteiro
  async invalidateStore(storeName) {
    // Limpar memory cache do store
    for (const [key] of this.memoryCache) {
      if (key.startsWith(storeName)) {
        this.memoryCache.delete(key);
      }
    }

    // Limpar IndexedDB
    await this.initPromise;
    try {
      await this._clearStore(storeName);
      if (window.Log)
        Log.debug(
          "CACHE-MANAGER",
          `🗑️ Store cleared in IndexedDB: ${storeName}`,
        );
    } catch (error) {
      if (window.Log)
        Log.warn(
          "CACHE-MANAGER",
          `Erro ao limpar store ${storeName} em IndexedDB:`,
          error,
        );
      // Tentar limpar do localStorage como fallback
      try {
        const keysToRemove = Object.keys(localStorage).filter((key) =>
          key.startsWith(`cache_${storeName}_`),
        );
        keysToRemove.forEach((key) => localStorage.removeItem(key));
        if (window.Log)
          Log.debug(
            "CACHE-MANAGER",
            `🗑️ Store cleared in localStorage fallback: ${storeName}`,
          );
      } catch (e) {
        if (window.Log)
          Log.warn(
            "CACHE-MANAGER",
            "Fallback localStorage falhou ao limpar store:",
            e,
          );
      }
    }
  }

  // Limpar tudo
  async clearAll() {
    this.memoryCache.clear();

    await this.initPromise;
    for (const storeName of Object.values(CACHE_CONFIG.stores)) {
      try {
        await this._clearStore(storeName);
        if (window.Log)
          Log.debug(
            "CACHE-MANAGER",
            `🗑️ Store cleared in IndexedDB: ${storeName}`,
          );
      } catch (error) {
        if (window.Log)
          Log.warn(
            "CACHE-MANAGER",
            `Erro ao limpar store ${storeName} em IndexedDB:`,
            error,
          );
      }
    }
    // Limpar também o localStorage como fallback
    try {
      const keysToRemove = Object.keys(localStorage).filter((key) =>
        key.startsWith("cache_"),
      );
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      if (window.Log)
        Log.debug(
          "CACHE-MANAGER",
          "All cache cleared from localStorage fallback",
        );
    } catch (e) {
      if (window.Log)
        Log.warn(
          "CACHE-MANAGER",
          "Fallback localStorage falhou ao limpar tudo:",
          e,
        );
    }

    if (window.Log) Log.info("CACHE-MANAGER", "🗑️ All cache cleared");
  }

  // Limpar cache expirado
  async cleanExpired() {
    let cleaned = 0;

    await this.initPromise;

    for (const storeName of Object.values(CACHE_CONFIG.stores)) {
      const ttl = CACHE_CONFIG.ttl[storeName] || 5 * 60 * 1000;
      try {
        const entries = await this._getAllFromStore(storeName);

        for (const entry of entries) {
          if (!this._isValid(entry, ttl)) {
            await this._deleteFromDB(storeName, entry.key).catch((err) => {
              if (window.Log)
                Log.warn(
                  "CACHE-MANAGER",
                  "Erro ao deletar cache expirado do IndexedDB:",
                  err,
                );
            });
            this.memoryCache.delete(entry.key);
            cleaned++;
          }
        }
      } catch (error) {
        if (window.Log)
          Log.warn(
            "CACHE-MANAGER",
            `Erro ao limpar cache expirado do store ${storeName}:`,
            error,
          );
        // Tentar limpar do localStorage como fallback
        try {
          const keysToRemove = Object.keys(localStorage).filter((key) =>
            key.startsWith(`cache_${storeName}_`),
          );
          keysToRemove.forEach((key) => {
            const storedData = JSON.parse(localStorage.getItem(key));
            if (storedData && storedData.expiry <= Date.now()) {
              localStorage.removeItem(key);
              cleaned++;
            }
          });
        } catch (e) {
          if (window.Log)
            Log.warn(
              "CACHE-MANAGER",
              "Fallback localStorage falhou ao limpar cache expirado:",
              e,
            );
        }
      }
    }

    if (window.Log)
      Log.debug("CACHE-MANAGER", `🧹 Cleaned ${cleaned} expired entries`);
    return cleaned;
  }

  // === MÉTODOS PRIVADOS INDEXEDDB ===

  _getFromDB(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error("IndexedDB not initialized"));
      }
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        if (window.Log)
          Log.error(
            "CACHE-MANAGER",
            `Erro em _getFromDB (${storeName}, ${key}):`,
            event.target.error,
          );
        reject(event.target.error);
      };
    });
  }

  _saveToDB(storeName, entry) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error("IndexedDB not initialized"));
      }
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        if (window.Log)
          Log.error(
            "CACHE-MANAGER",
            `Erro em _saveToDB (${storeName}, ${entry.key}):`,
            event.target.error,
          );
        reject(event.target.error);
      };
    });
  }

  _deleteFromDB(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error("IndexedDB not initialized"));
      }
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        if (window.Log)
          Log.error(
            "CACHE-MANAGER",
            `Erro em _deleteFromDB (${storeName}, ${key}):`,
            event.target.error,
          );
        reject(event.target.error);
      };
    });
  }

  _clearStore(storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error("IndexedDB not initialized"));
      }
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        if (window.Log)
          Log.error(
            "CACHE-MANAGER",
            `Erro em _clearStore (${storeName}):`,
            event.target.error,
          );
        reject(event.target.error);
      };
    });
  }

  _getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error("IndexedDB not initialized"));
      }
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (event) => {
        if (window.Log)
          Log.error(
            "CACHE-MANAGER",
            `Erro em _getAllFromStore (${storeName}):`,
            event.target.error,
          );
        reject(event.target.error);
      };
    });
  }

  // Estatísticas
  async getStats() {
    await this.initPromise;

    const stats = {
      memorySize: this.memoryCache.size,
      stores: {},
    };

    if (!this.db) {
      if (window.Log) Log.warn("CACHE-MANAGER", "DB not available for stats.");
      return stats;
    }

    for (const storeName of Object.values(CACHE_CONFIG.stores)) {
      try {
        const entries = await this._getAllFromStore(storeName);
        stats.stores[storeName] = entries.length;
      } catch (error) {
        if (window.Log)
          Log.warn(
            "CACHE-MANAGER",
            `Erro ao obter estatísticas para ${storeName}:`,
            error,
          );
        stats.stores[storeName] = "Error";
      }
    }

    return stats;
  }

  /**
   * Busca múltiplos times de uma vez (otimização)
   * @param {Array<number>} timeIds - IDs dos times
   * @returns {Promise<Array>} Lista de times
   */
  async buscarTimesBatch(timeIds) {
    try {
      const response = await fetch("/api/times/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: timeIds }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const times = await response.json();

      // Cachear cada time individualmente para uso futuro
      for (const time of times) {
        const cacheKey = `time_${time.id}`;
        await this.save(cacheKey, time, 300000); // 5 minutos
      }

      return times;
    } catch (error) {
      if (window.Log)
        Log.error("CACHE-MANAGER", "Erro ao buscar times em lote:", error);
      return [];
    }
  }
}

// Instância singleton
export const cacheManager = new CacheManager();

// Limpeza automática a cada 10 minutos
setInterval(
  () => {
    cacheManager.cleanExpired();
  },
  10 * 60 * 1000,
);

// Expor no window para debug
window.cacheManager = cacheManager;

if (window.Log)
  Log.info("CACHE-MANAGER", "✅ Sistema de cache inteligente carregado");
