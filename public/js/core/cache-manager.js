
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
    participantes: 30 * 60 * 1000, // 30 min
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
        CACHE_CONFIG.dbVersion
      );

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log("✅ [CACHE-MANAGER] IndexedDB inicializado");
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

        console.log("🔧 [CACHE-MANAGER] Database upgraded");
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
        console.log(`💾 [CACHE-MANAGER] Memory hit: ${key}`);
        return entry.data;
      }
    }

    // 2. Tentar IndexedDB
    await this.initPromise;
    const dbEntry = await this._getFromDB(storeName, key);

    if (!force && dbEntry && this._isValid(dbEntry, ttl)) {
      console.log(`💿 [CACHE-MANAGER] IndexedDB hit: ${key}`);
      // Atualizar memory cache
      this.memoryCache.set(key, dbEntry);
      return dbEntry.data;
    }

    // 3. Cache miss - executar fetch
    if (fetchFn) {
      console.log(`🌐 [CACHE-MANAGER] Fetching: ${key}`);
      const data = await fetchFn();

      // Salvar em ambos caches
      await this.set(storeName, key, data);
      return data;
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
    await this._saveToDB(storeName, entry);

    console.log(`✅ [CACHE-MANAGER] Saved: ${key}`);
  }

  // Invalidar cache específico
  async invalidate(storeName, key) {
    this.memoryCache.delete(key);

    await this.initPromise;
    await this._deleteFromDB(storeName, key);

    console.log(`🗑️ [CACHE-MANAGER] Invalidated: ${key}`);
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
    await this._clearStore(storeName);

    console.log(`🗑️ [CACHE-MANAGER] Store cleared: ${storeName}`);
  }

  // Limpar tudo
  async clearAll() {
    this.memoryCache.clear();

    await this.initPromise;
    for (const storeName of Object.values(CACHE_CONFIG.stores)) {
      await this._clearStore(storeName);
    }

    console.log("🗑️ [CACHE-MANAGER] All cache cleared");
  }

  // Limpar cache expirado
  async cleanExpired() {
    let cleaned = 0;

    await this.initPromise;

    for (const storeName of Object.values(CACHE_CONFIG.stores)) {
      const ttl = CACHE_CONFIG.ttl[storeName] || 5 * 60 * 1000;
      const entries = await this._getAllFromStore(storeName);

      for (const entry of entries) {
        if (!this._isValid(entry, ttl)) {
          await this._deleteFromDB(storeName, entry.key);
          this.memoryCache.delete(entry.key);
          cleaned++;
        }
      }
    }

    console.log(`🧹 [CACHE-MANAGER] Cleaned ${cleaned} expired entries`);
    return cleaned;
  }

  // === MÉTODOS PRIVADOS INDEXEDDB ===

  _getFromDB(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  _saveToDB(storeName, entry) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  _deleteFromDB(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  _clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  _getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Estatísticas
  async getStats() {
    await this.initPromise;

    const stats = {
      memorySize: this.memoryCache.size,
      stores: {},
    };

    for (const storeName of Object.values(CACHE_CONFIG.stores)) {
      const entries = await this._getAllFromStore(storeName);
      stats.stores[storeName] = entries.length;
    }

    return stats;
  }
}

// Instância singleton
export const cacheManager = new CacheManager();

// Limpeza automática a cada 10 minutos
setInterval(() => {
  cacheManager.cleanExpired();
}, 10 * 60 * 1000);

// Expor no window para debug
window.cacheManager = cacheManager;

console.log("✅ [CACHE-MANAGER] Sistema de cache inteligente carregado");
