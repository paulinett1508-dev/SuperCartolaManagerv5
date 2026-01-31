// =====================================================================
// MARKET GATE - Singleton Backend para Status do Mercado Cartola FC
// v1.0 - Centraliza toda lógica de status do mercado em um único ponto
// =====================================================================

import NodeCache from 'node-cache';
import { CURRENT_SEASON } from '../config/seasons.js';

// Cache de 5 minutos (sincronizado com cartolaApiService)
const cache = new NodeCache({ stdTTL: 300 });
const CACHE_KEY = 'mercado_status';

class MarketGate {
    constructor() {
        if (MarketGate.instance) {
            return MarketGate.instance;
        }

        this.ultimoStatus = null;
        this.ultimaAtualizacao = null;

        MarketGate.instance = this;
    }

    /**
     * Busca status do mercado da API Cartola FC
     * Com cache de 5 minutos
     */
    async fetchStatus() {
        try {
            // Verificar cache primeiro
            const cached = cache.get(CACHE_KEY);
            if (cached) {
                console.log('[MARKET-GATE] Status do cache (TTL restante:', cache.getTtl(CACHE_KEY) - Date.now(), 'ms)');
                this.ultimoStatus = cached;
                return cached;
            }

            // Buscar da API
            console.log('[MARKET-GATE] Buscando status da API Cartola...');
            const response = await fetch('https://api.cartolafc.globo.com/mercado/status');

            if (!response.ok) {
                throw new Error(`API Cartola retornou ${response.status}`);
            }

            const data = await response.json();

            // Enriquecer dados
            const status = {
                ...data,
                mercado_aberto: data.status_mercado === 1,
                mercado_fechado: data.status_mercado === 2,
                rodada_encerrada: data.status_mercado >= 4,
                temporada_encerrada: data.status_mercado === 6 || data.game_over === true,

                // Helpers
                pode_escalar: data.status_mercado === 1,
                tem_parciais: data.status_mercado === 2,
                deve_consolidar: data.status_mercado >= 4 && data.status_mercado < 6,

                // Metadata
                _fetched_at: new Date().toISOString(),
                _cache_ttl: 300 // 5 minutos em segundos
            };

            // Salvar no cache
            cache.set(CACHE_KEY, status);
            this.ultimoStatus = status;
            this.ultimaAtualizacao = new Date();

            return status;
        } catch (error) {
            console.error('[MARKET-GATE] Erro ao buscar status:', error.message);

            // Retornar último status conhecido ou status seguro de fallback
            if (this.ultimoStatus) {
                console.warn('[MARKET-GATE] Usando último status conhecido (stale)');
                return {
                    ...this.ultimoStatus,
                    _stale: true,
                    _error: error.message
                };
            }

            // Fallback seguro
            return this.getFallbackStatus(error.message);
        }
    }

    /**
     * Status de fallback seguro quando API falha
     */
    getFallbackStatus(errorMessage) {
        return {
            rodada_atual: 1,
            status_mercado: 2, // Fechado por segurança
            mercado_aberto: false,
            mercado_fechado: true,
            rodada_encerrada: false,
            temporada_encerrada: false,
            temporada: CURRENT_SEASON,

            pode_escalar: false,
            tem_parciais: false,
            deve_consolidar: false,

            _fallback: true,
            _error: errorMessage,
            _fetched_at: new Date().toISOString()
        };
    }

    /**
     * Verifica se mercado está aberto
     */
    async isMercadoAberto() {
        const status = await this.fetchStatus();
        return status.mercado_aberto === true;
    }

    /**
     * Verifica se está em pré-temporada
     * (mercado fechado, rodada 1, temporada da API < temporada esperada)
     */
    async isPreTemporada() {
        const status = await this.fetchStatus();
        return (
            status.rodada_atual === 1 &&
            status.mercado_fechado === true &&
            status.temporada < CURRENT_SEASON
        );
    }

    /**
     * Verifica se pode mostrar parciais
     */
    async canShowParciais() {
        const status = await this.fetchStatus();
        return status.tem_parciais === true;
    }

    /**
     * Verifica se pode aceitar escalações
     */
    async canEscalar() {
        const status = await this.fetchStatus();
        return status.pode_escalar === true;
    }

    /**
     * Verifica se rodada deve ser consolidada
     */
    async shouldConsolidate() {
        const status = await this.fetchStatus();
        return status.deve_consolidar === true;
    }

    /**
     * Obtém rodada atual
     */
    async getRodadaAtual() {
        const status = await this.fetchStatus();
        return status.rodada_atual || 1;
    }

    /**
     * Obtém temporada atual da API
     */
    async getTemporadaAPI() {
        const status = await this.fetchStatus();
        return status.temporada || CURRENT_SEASON;
    }

    /**
     * Limpa cache forçando nova busca
     */
    clearCache() {
        cache.del(CACHE_KEY);
        console.log('[MARKET-GATE] Cache limpo');
    }

    /**
     * Obtém estatísticas do cache
     */
    getCacheStats() {
        const ttl = cache.getTtl(CACHE_KEY);
        const hasCache = cache.has(CACHE_KEY);

        return {
            has_cache: hasCache,
            ttl_ms: ttl ? ttl - Date.now() : 0,
            ttl_seconds: ttl ? Math.floor((ttl - Date.now()) / 1000) : 0,
            last_update: this.ultimaAtualizacao,
            cache_keys: cache.keys()
        };
    }

    /**
     * Retorna status completo para debugging
     */
    async getFullStatus() {
        const status = await this.fetchStatus();
        const cacheStats = this.getCacheStats();

        return {
            mercado: status,
            cache: cacheStats,
            helpers: {
                is_mercado_aberto: status.mercado_aberto,
                is_pre_temporada: await this.isPreTemporada(),
                can_escalar: status.pode_escalar,
                can_show_parciais: status.tem_parciais,
                should_consolidate: status.deve_consolidar
            }
        };
    }
}

// Exportar singleton
const marketGate = new MarketGate();
export default marketGate;

// Exports nomeados para compatibilidade
export {
    marketGate as MarketGate,
    MarketGate as MarketGateClass
};
