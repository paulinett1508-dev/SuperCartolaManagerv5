// ✅ ARTILHEIRO-CAMPEAO-CACHE.JS v1.0
// Sistema inteligente de cache para o módulo de artilheiros

console.log("📦 [ARTILHEIRO-CACHE] Módulo v1.0 carregando...");

// ✅ IMPORTAÇÕES
import { ArtilheiroUtils } from "./artilheiro-campeao-utils.js";

// ✅ CONFIGURAÇÕES DO CACHE
const CACHE_CONFIG = {
  // TTL por tipo de dados (em milissegundos)
  ttl: {
    participantes: 10 * 60 * 1000, // 10 minutos
    gols_rodada: 30 * 60 * 1000, // 30 minutos
    dados_completos: 5 * 60 * 1000, // 5 minutos
    configuracao: 15 * 60 * 1000, // 15 minutos
    deteccao_rodada: 2 * 60 * 1000, // 2 minutos
    detalhamento_rodada: 10 * 60 * 1000, // 10 minutos
  },

  // Limites de tamanho
  maxEntries: 100,
  maxMemoryMB: 50,

  // Prefixos para organização
  prefixes: {
    participantes: "part_",
    gols: "gols_",
    completo: "comp_",
    config: "conf_",
    rodada: "rod_",
  },
};

// ✅ SISTEMA DE CACHE
export const ArtilheiroCache = {
  version: "1.0.0",

  // Cache em memória
  _cache: new Map(),

  // Estatísticas do cache
  _stats: {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    clears: 0,
  },

  // Obter dados do cache ou executar função
  async obterComCache(chave, funcao, ttl = null) {
    const agora = Date.now();
    const cached = this._cache.get(chave);

    // Verificar se existe e não expirou
    if (
      cached &&
      agora - cached.timestamp < (ttl || this._getTTLPorTipo(chave))
    ) {
      this._stats.hits++;
      console.log(`Cache hit: ${chave}`);
      return cached.data;
    }

    // Cache miss - executar função
    this._stats.misses++;
    console.log(`Cache miss: ${chave}`);

    try {
      const resultado = await funcao();

      if (resultado !== null && resultado !== undefined) {
        this.set(chave, resultado, ttl);
      }

      return resultado;
    } catch (error) {
      console.error(`Erro ao executar função para cache ${chave}:`, error);
      throw error;
    }
  },

  // Definir valor no cache
  set(chave, valor, ttl = null) {
    const agora = Date.now();

    // Limpar cache se necessário
    this._verificarLimites();

    const entrada = {
      data: valor,
      timestamp: agora,
      ttl: ttl || this._getTTLPorTipo(chave),
      size: this._calcularTamanho(valor),
    };

    this._cache.set(chave, entrada);
    this._stats.sets++;

    console.log(`Cache set: ${chave} (TTL: ${entrada.ttl}ms)`);
  },

  // Obter valor do cache
  get(chave) {
    const agora = Date.now();
    const cached = this._cache.get(chave);

    if (!cached) {
      this._stats.misses++;
      return null;
    }

    // Verificar expiração
    if (agora - cached.timestamp >= cached.ttl) {
      this._cache.delete(chave);
      this._stats.misses++;
      console.log(`Cache expired: ${chave}`);
      return null;
    }

    this._stats.hits++;
    return cached.data;
  },

  // Verificar se chave existe no cache
  has(chave) {
    return this.get(chave) !== null;
  },

  // Remover entrada específica
  delete(chave) {
    const removido = this._cache.delete(chave);
    if (removido) {
      this._stats.deletes++;
      console.log(`Cache delete: ${chave}`);
    }
    return removido;
  },

  // Limpar todo o cache
  clear() {
    const tamanhoAnterior = this._cache.size;
    this._cache.clear();
    this._stats.clears++;

    console.log(`Cache limpo: ${tamanhoAnterior} entradas removidas`);
  },

  // Limpar cache por prefixo
  clearByPrefix(prefixo) {
    let removidos = 0;

    for (const chave of this._cache.keys()) {
      if (chave.startsWith(prefixo)) {
        this._cache.delete(chave);
        removidos++;
      }
    }

    console.log(
      `Cache limpo por prefixo "${prefixo}": ${removidos} entradas removidas`,
    );
    return removidos;
  },

  // Limpar entradas expiradas
  limparExpirados() {
    const agora = Date.now();
    let removidos = 0;

    for (const [chave, entrada] of this._cache.entries()) {
      if (agora - entrada.timestamp >= entrada.ttl) {
        this._cache.delete(chave);
        removidos++;
      }
    }

    if (removidos > 0) {
      console.log(`Cache expirados removidos: ${removidos} entradas`);
    }

    return removidos;
  },

  // Obter estatísticas do cache
  getStats() {
    const totalOperacoes = this._stats.hits + this._stats.misses;
    const hitRate =
      totalOperacoes > 0
        ? ((this._stats.hits / totalOperacoes) * 100).toFixed(2)
        : 0;

    return {
      ...this._stats,
      hitRate: `${hitRate}%`,
      totalEntries: this._cache.size,
      memoryUsage: this._calcularUsoMemoria(),
    };
  },

  // Obter informações detalhadas do cache
  getInfo() {
    const agora = Date.now();
    const entradas = [];

    for (const [chave, entrada] of this._cache.entries()) {
      const tempoRestante = entrada.ttl - (agora - entrada.timestamp);
      const expirado = tempoRestante <= 0;

      entradas.push({
        chave,
        tamanho: entrada.size,
        criadoEm: new Date(entrada.timestamp),
        ttl: entrada.ttl,
        tempoRestante: Math.max(0, tempoRestante),
        expirado,
      });
    }

    return {
      entradas: entradas.sort((a, b) => b.criadoEm - a.criadoEm),
      estatisticas: this.getStats(),
    };
  },

  // Pré-carregar dados importantes
  async precarregar(ligaId, participantes = []) {
    console.log("🔄 Pré-carregando cache importante...");

    try {
      const promises = [];

      // Pré-carregar configurações
      promises.push(this._precarregarConfiguracoes(ligaId));

      // Pré-carregar dados básicos dos participantes se fornecidos
      if (participantes.length > 0) {
        promises.push(this._precarregarParticipantes(ligaId, participantes));
      }

      await Promise.allSettled(promises);

      console.log("✅ Pré-carregamento concluído");
    } catch (error) {
      console.error("❌ Erro no pré-carregamento:", error);
    }
  },

  // ✅ MÉTODOS PRIVADOS

  // Obter TTL baseado no tipo de dados
  _getTTLPorTipo(chave) {
    for (const [tipo, prefixo] of Object.entries(CACHE_CONFIG.prefixes)) {
      if (chave.startsWith(prefixo)) {
        return CACHE_CONFIG.ttl[tipo] || CACHE_CONFIG.ttl.dados_completos;
      }
    }

    // TTL padrão se não encontrar tipo específico
    return CACHE_CONFIG.ttl.dados_completos;
  },

  // Calcular tamanho aproximado dos dados
  _calcularTamanho(dados) {
    try {
      return new Blob([JSON.stringify(dados)]).size;
    } catch {
      return JSON.stringify(dados).length * 2; // Aproximação
    }
  },

  // Calcular uso de memória total
  _calcularUsoMemoria() {
    let tamanhoTotal = 0;

    for (const entrada of this._cache.values()) {
      tamanhoTotal += entrada.size || 0;
    }

    return ArtilheiroUtils.formatarBytes(tamanhoTotal);
  },

  // Verificar limites e limpar se necessário
  _verificarLimites() {
    // Limpar expirados primeiro
    this.limparExpirados();

    // Verificar limite de entradas
    if (this._cache.size >= CACHE_CONFIG.maxEntries) {
      this._removerEntradaMaisAntiga();
    }

    // Verificar limite de memória (aproximado)
    const usoMemoria = this._calcularUsoMemoriaMB();
    if (usoMemoria > CACHE_CONFIG.maxMemoryMB) {
      this._removerEntradasPorTamanho();
    }
  },

  // Calcular uso de memória em MB
  _calcularUsoMemoriaMB() {
    let tamanhoTotal = 0;

    for (const entrada of this._cache.values()) {
      tamanhoTotal += entrada.size || 0;
    }

    return tamanhoTotal / (1024 * 1024); // Converter para MB
  },

  // Remover entrada mais antiga
  _removerEntradaMaisAntiga() {
    let chaveAntiga = null;
    let timestampAntigo = Date.now();

    for (const [chave, entrada] of this._cache.entries()) {
      if (entrada.timestamp < timestampAntigo) {
        timestampAntigo = entrada.timestamp;
        chaveAntiga = chave;
      }
    }

    if (chaveAntiga) {
      this._cache.delete(chaveAntiga);
      console.log(`Entrada mais antiga removida: ${chaveAntiga}`);
    }
  },

  // Remover entradas maiores para liberar memória
  _removerEntradasPorTamanho() {
    const entradas = Array.from(this._cache.entries()).sort(
      ([, a], [, b]) => (b.size || 0) - (a.size || 0),
    );

    // Remover as 20% maiores entradas
    const quantidadeRemover = Math.ceil(entradas.length * 0.2);

    for (let i = 0; i < quantidadeRemover && i < entradas.length; i++) {
      const [chave] = entradas[i];
      this._cache.delete(chave);
    }

    console.log(
      `${quantidadeRemover} entradas grandes removidas para liberar memória`,
    );
  },

  // Pré-carregar configurações
  async _precarregarConfiguracoes(ligaId) {
    const chave = `${CACHE_CONFIG.prefixes.config}${ligaId}`;

    if (!this.has(chave)) {
      // Aqui você colocaria a lógica para buscar configurações
      // Por enquanto, vamos simular
      const configuracoes = {
        ligaId,
        precarregado: true,
        timestamp: Date.now(),
      };

      this.set(chave, configuracoes);
    }
  },

  // Pré-carregar dados básicos dos participantes
  async _precarregarParticipantes(ligaId, participantes) {
    const chave = `${CACHE_CONFIG.prefixes.participantes}${ligaId}`;

    if (!this.has(chave)) {
      this.set(chave, participantes);
    }
  },

  // Inicializar sistema de limpeza automática
  iniciarLimpezaAutomatica(intervalo = 5 * 60 * 1000) {
    // 5 minutos
    setInterval(() => {
      this.limparExpirados();
    }, intervalo);

    console.log(`🧹 Limpeza automática iniciada (intervalo: ${intervalo}ms)`);
  },
};

// ✅ INICIALIZAR LIMPEZA AUTOMÁTICA
ArtilheiroCache.iniciarLimpezaAutomatica();

console.log("✅ [ARTILHEIRO-CACHE] Módulo carregado com sucesso!");
