/**
 * Season Status Manager - v2.0
 *
 * Centralizador de status da temporada - Fonte única da verdade
 * v2.0: Usa endpoint unificado /api/app/system-status (via MarketGate)
 * v1.0: Consultava /api/cartola/mercado/status diretamente
 *
 * @version 2.0.0
 * @since 2026-01-31
 */

class SeasonStatusManager {
  constructor() {
    this.cache = null;
    this.lastFetch = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutos (sincronizado com backend)
    this.fetchPromise = null; // Previne múltiplas requisições simultâneas
  }

  /**
   * Obtém status atual do mercado/temporada
   * Usa cache de 5 minutos para não sobrecarregar API Cartola
   *
   * @returns {Promise<Object>} Status com rodadaAtual, statusMercado, mercadoAberto, temporada, temporadaEncerrada
   */
  async getStatus() {
    // Cache válido - retornar imediatamente
    if (this.cache && Date.now() - this.lastFetch < this.CACHE_TTL) {
      return this.cache;
    }

    // Evitar múltiplas requisições simultâneas
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Buscar da API
    this.fetchPromise = this._fetchFromAPI();

    try {
      const data = await this.fetchPromise;
      this.cache = data;
      this.lastFetch = Date.now();
      return this.cache;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Busca dados do endpoint unificado /api/app/system-status (v2.0)
   * Este endpoint usa MarketGate backend e consolida mercado + temporada + cache
   * @private
   */
  async _fetchFromAPI() {
    try {
      const response = await fetch('/api/app/system-status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Normalizar resposta do endpoint system-status
      return {
        rodadaAtual: data.mercado.rodada_atual || 1,
        statusMercado: data.mercado.status_mercado || 2,
        mercadoAberto: data.mercado.mercado_aberto === true,
        temporada: data.mercado.temporada || data.temporada.atual || 2026,
        temporadaEncerrada: data.mercado.temporada_encerrada === true,
        fechamento: data.mercado.fechamento || null,

        // Informações extras do novo endpoint
        preTemporada: data.temporada.pre_temporada === true,
        podeEscalar: data.permissoes.pode_escalar === true,
        podeVerParciais: data.permissoes.pode_ver_parciais === true,
        deveConsolidar: data.permissoes.deve_consolidar === true,

        // Metadata
        _timestamp: data._meta?.timestamp || new Date().toISOString(),
        _cache: {
          ativo: data.cache?.ativo || false,
          ttl_segundos: data.cache?.ttl_segundos || 0,
          stale: data.cache?.stale || false
        },
        _source: 'system-status-v2'
      };
    } catch (error) {
      console.error('[SEASON-STATUS] Erro ao buscar status:', error);

      // Fallback: retornar último cache conhecido ou defaults
      if (this.cache) {
        console.warn('[SEASON-STATUS] Usando último cache conhecido');
        return { ...this.cache, _stale: true };
      }

      // Defaults seguros
      return {
        rodadaAtual: 1,
        statusMercado: 2,
        mercadoAberto: false,
        temporada: 2026,
        temporadaEncerrada: false,
        preTemporada: false,
        podeEscalar: false,
        podeVerParciais: false,
        deveConsolidar: false,
        _fallback: true,
        _timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verifica se está em pré-temporada
   *
   * Pré-temporada = rodada 1 + mercado fechado + sem dados consolidados
   *
   * @returns {Promise<boolean>}
   */
  async isPreTemporada() {
    const status = await this.getStatus();
    return status.rodadaAtual === 1 && !status.mercadoAberto && !status.temporadaEncerrada;
  }

  /**
   * Verifica se temporada está ativa
   *
   * Ativa = rodadas em andamento, mercado funcionando
   *
   * @returns {Promise<boolean>}
   */
  async isAtiva() {
    const status = await this.getStatus();
    return !status.temporadaEncerrada && status.rodadaAtual >= 1;
  }

  /**
   * Verifica se temporada está encerrada
   *
   * Encerrada = status_mercado = 6 (API Cartola)
   *
   * @returns {Promise<boolean>}
   */
  async isEncerrada() {
    const status = await this.getStatus();
    return status.temporadaEncerrada === true;
  }

  /**
   * Retorna número da rodada atual
   *
   * @returns {Promise<number>}
   */
  async getRodadaAtual() {
    const status = await this.getStatus();
    return status.rodadaAtual;
  }

  /**
   * Retorna ano da temporada
   *
   * @returns {Promise<number>}
   */
  async getTemporada() {
    const status = await this.getStatus();
    return status.temporada;
  }

  /**
   * Verifica se mercado está aberto
   *
   * @returns {Promise<boolean>}
   */
  async isMercadoAberto() {
    const status = await this.getStatus();
    return status.mercadoAberto;
  }

  /**
   * Força atualização do cache (ignora TTL)
   * Útil após eventos críticos (fechamento de mercado, etc)
   *
   * @returns {Promise<Object>}
   */
  async forceRefresh() {
    this.cache = null;
    this.lastFetch = null;
    return this.getStatus();
  }

  /**
   * Retorna informações de debug
   *
   * @returns {Object}
   */
  getDebugInfo() {
    return {
      hasCache: !!this.cache,
      cacheAge: this.lastFetch ? Date.now() - this.lastFetch : null,
      cacheTTL: this.CACHE_TTL,
      cacheValid: this.cache && Date.now() - this.lastFetch < this.CACHE_TTL,
      lastFetch: this.lastFetch ? new Date(this.lastFetch).toISOString() : null,
      cache: this.cache
    };
  }
}

// Instância singleton
export const seasonStatus = new SeasonStatusManager();

// Expor também a classe para testes
export { SeasonStatusManager };

// Log de inicialização
if (window.Log) {
  window.Log.info('SEASON-STATUS', '✅ Season Status Manager inicializado (v1.0.0)');
}
