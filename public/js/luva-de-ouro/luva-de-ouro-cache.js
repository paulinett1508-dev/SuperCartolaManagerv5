// public/js/luva-de-ouro/luva-de-ouro-cache.js
console.log("📦 [LUVA-CACHE] Módulo de cache carregando...");

/**
 * Módulo Cache - Sistema de cache de dados
 */
const LuvaDeOuroCache = {
  // Armazenamento em memória
  _cache: new Map(),
  _timestamps: new Map(),

  // Tempo de vida do cache (5 minutos)
  TTL: 5 * 60 * 1000,

  /**
   * Gera chave única para cache
   */
  _gerarChave(tipo, params) {
    return `${tipo}_${JSON.stringify(params)}`;
  },

  /**
   * Verifica se cache está válido
   */
  _cacheValido(chave) {
    if (!this._timestamps.has(chave)) {
      return false;
    }

    const timestamp = this._timestamps.get(chave);
    const agora = Date.now();

    return agora - timestamp < this.TTL;
  },

  /**
   * Armazena dados no cache
   */
  set(tipo, params, dados) {
    const chave = this._gerarChave(tipo, params);
    this._cache.set(chave, dados);
    this._timestamps.set(chave, Date.now());

    console.log(`📦 [CACHE] Dados armazenados: ${chave}`);
  },

  /**
   * Recupera dados do cache
   */
  get(tipo, params) {
    const chave = this._gerarChave(tipo, params);

    if (!this._cacheValido(chave)) {
      console.log(`📦 [CACHE] Cache expirado ou não encontrado: ${chave}`);
      return null;
    }

    console.log(`✅ [CACHE] Dados recuperados: ${chave}`);
    return this._cache.get(chave);
  },

  /**
   * Limpa cache específico
   */
  invalidar(tipo, params) {
    const chave = this._gerarChave(tipo, params);
    this._cache.delete(chave);
    this._timestamps.delete(chave);

    console.log(`🗑️ [CACHE] Cache invalidado: ${chave}`);
  },

  /**
   * Limpa todo o cache
   */
  limparTudo() {
    this._cache.clear();
    this._timestamps.clear();

    console.log("🗑️ [CACHE] Todo cache limpo");
  },

  /**
   * Limpa cache expirado automaticamente
   */
  limparExpirados() {
    const agora = Date.now();
    let removidos = 0;

    for (const [chave, timestamp] of this._timestamps.entries()) {
      if (agora - timestamp >= this.TTL) {
        this._cache.delete(chave);
        this._timestamps.delete(chave);
        removidos++;
      }
    }

    if (removidos > 0) {
      console.log(`🧹 [CACHE] ${removidos} cache(s) expirado(s) removido(s)`);
    }
  },

  /**
   * Retorna estatísticas do cache
   */
  stats() {
    return {
      total: this._cache.size,
      chaves: Array.from(this._cache.keys()),
      tamanhoBytes: JSON.stringify(Array.from(this._cache.values())).length,
    };
  },
};

// Configurar limpeza automática a cada 5 minutos
setInterval(
  () => {
    LuvaDeOuroCache.limparExpirados();
  },
  5 * 60 * 1000,
);

window.LuvaDeOuroCache = LuvaDeOuroCache;

console.log("✅ [LUVA-CACHE] Sistema de cache inicializado");
console.log("🧹 Limpeza automática configurada (5min)");
