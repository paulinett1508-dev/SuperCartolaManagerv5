// LUVA DE OURO CACHE - Sistema de cache (REFATORADO)
// Integração com super cache e snapshots

console.log("📦 [LUVA-CACHE] Módulo de cache carregando...");

const LuvaDeOuroCache = {
  // Cache em memória
  _memory: new Map(),
  _timestamps: new Map(),

  // TTL padrão: 5 minutos para dados parciais
  TTL_PARCIAL: 5 * 60 * 1000,

  // TTL para rodadas consolidadas: 24 horas (dados não mudam)
  TTL_CONSOLIDADO: 24 * 60 * 60 * 1000,

  // Prefixo para localStorage
  STORAGE_PREFIX: "luva_cache_",

  // ==============================
  // FUNÇÕES PRINCIPAIS
  // ==============================

  /**
   * Gera chave única para cache
   */
  _gerarChave(tipo, params) {
    return `${tipo}_${JSON.stringify(params)}`;
  },

  /**
   * Determina TTL baseado no tipo de dado
   */
  _getTTL(tipo, params) {
    // Se rodadaFim é menor que rodada atual, é consolidado (TTL longo)
    if (params?.fim && window.LuvaDeOuroOrquestrador?.estado?.rodadaAtual) {
      const rodadaAtual = window.LuvaDeOuroOrquestrador.estado.rodadaAtual;
      const mercadoAberto = window.LuvaDeOuroOrquestrador.estado.mercadoAberto;

      // Se está vendo rodadas passadas (consolidadas)
      if (
        params.fim < rodadaAtual ||
        (params.fim === rodadaAtual && !mercadoAberto)
      ) {
        return this.TTL_CONSOLIDADO;
      }
    }

    return this.TTL_PARCIAL;
  },

  /**
   * Armazena dados no cache
   */
  async set(tipo, params, dados) {
    const chave = this._gerarChave(tipo, params);
    const ttl = this._getTTL(tipo, params);
    const timestamp = Date.now();

    // Salvar em memória
    this._memory.set(chave, dados);
    this._timestamps.set(chave, timestamp);

    // Salvar em localStorage para persistência
    try {
      const cacheEntry = {
        dados,
        timestamp,
        ttl,
      };
      localStorage.setItem(
        this.STORAGE_PREFIX + chave,
        JSON.stringify(cacheEntry),
      );
      console.log(`📦 [LUVA-CACHE] Salvo: ${chave} (TTL: ${ttl / 1000}s)`);
    } catch (error) {
      console.warn(
        `📦 [LUVA-CACHE] Erro ao salvar localStorage:`,
        error.message,
      );
    }

    return true;
  },

  /**
   * Recupera dados do cache
   */
  async get(tipo, params) {
    const chave = this._gerarChave(tipo, params);
    const agora = Date.now();

    // Tentar memória primeiro
    if (this._memory.has(chave)) {
      const timestamp = this._timestamps.get(chave);
      const ttl = this._getTTL(tipo, params);

      if (agora - timestamp < ttl) {
        console.log(`✅ [LUVA-CACHE] Hit memória: ${chave}`);
        return this._memory.get(chave);
      }
    }

    // Tentar localStorage
    try {
      const stored = localStorage.getItem(this.STORAGE_PREFIX + chave);
      if (stored) {
        const cacheEntry = JSON.parse(stored);
        const { dados, timestamp, ttl } = cacheEntry;

        if (agora - timestamp < ttl) {
          // Restaurar para memória
          this._memory.set(chave, dados);
          this._timestamps.set(chave, timestamp);
          console.log(`✅ [LUVA-CACHE] Hit localStorage: ${chave}`);
          return dados;
        } else {
          // Cache expirado, remover
          localStorage.removeItem(this.STORAGE_PREFIX + chave);
        }
      }
    } catch (error) {
      console.warn(`📦 [LUVA-CACHE] Erro ao ler localStorage:`, error.message);
    }

    console.log(`📦 [LUVA-CACHE] Miss: ${chave}`);
    return null;
  },

  /**
   * Invalida cache específico
   */
  invalidar(tipo, params) {
    const chave = this._gerarChave(tipo, params);

    this._memory.delete(chave);
    this._timestamps.delete(chave);

    try {
      localStorage.removeItem(this.STORAGE_PREFIX + chave);
    } catch (e) {}

    console.log(`🗑️ [LUVA-CACHE] Invalidado: ${chave}`);
  },

  /**
   * Limpa todo o cache do módulo
   */
  limparTudo() {
    this._memory.clear();
    this._timestamps.clear();

    // Limpar localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}

    console.log("🗑️ [LUVA-CACHE] Todo cache limpo");
  },

  /**
   * Limpa caches expirados
   */
  limparExpirados() {
    const agora = Date.now();
    let removidos = 0;

    // Limpar memória
    for (const [chave, timestamp] of this._timestamps.entries()) {
      // Usar TTL mais longo para verificação
      if (agora - timestamp >= this.TTL_CONSOLIDADO) {
        this._memory.delete(chave);
        this._timestamps.delete(chave);
        removidos++;
      }
    }

    // Limpar localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          try {
            const entry = JSON.parse(localStorage.getItem(key));
            if (agora - entry.timestamp >= entry.ttl) {
              localStorage.removeItem(key);
              removidos++;
            }
          } catch (e) {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (e) {}

    if (removidos > 0) {
      console.log(`🧹 [LUVA-CACHE] ${removidos} entradas expiradas removidas`);
    }

    return removidos;
  },

  /**
   * Estatísticas do cache
   */
  stats() {
    let localStorageCount = 0;
    let localStorageSize = 0;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          localStorageCount++;
          localStorageSize += localStorage.getItem(key).length;
        }
      });
    } catch (e) {}

    return {
      memoria: {
        entradas: this._memory.size,
        chaves: Array.from(this._memory.keys()),
      },
      localStorage: {
        entradas: localStorageCount,
        tamanhoBytes: localStorageSize,
      },
    };
  },
};

// Limpeza automática a cada 5 minutos
setInterval(
  () => {
    LuvaDeOuroCache.limparExpirados();
  },
  5 * 60 * 1000,
);

// Exportar para window
window.LuvaDeOuroCache = LuvaDeOuroCache;

console.log("✅ [LUVA-CACHE] Módulo carregado com suporte a localStorage");
