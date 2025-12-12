// =====================================================================
// PARTICIPANTE CACHE MANAGER - v1.0
// Sistema de cache local para dados do participante
// Evita recarregamentos desnecessários durante navegação
// =====================================================================

if (window.Log) Log.info('CACHE-MANAGER', '🚀 Carregando sistema de cache...');

const CACHE_PREFIX = 'participante_cache_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

class ParticipanteCacheManager {
    constructor() {
        this.memoryCache = {};
    }

    // ===== MÉTODOS GENÉRICOS DE CACHE =====

    _getCacheKey(key) {
        return `${CACHE_PREFIX}${key}`;
    }

    _isExpired(timestamp) {
        return Date.now() - timestamp > CACHE_TTL;
    }

    // Salvar no sessionStorage com TTL
    set(key, data, useSession = true) {
        const cacheData = {
            data,
            timestamp: Date.now()
        };

        this.memoryCache[key] = cacheData;

        if (useSession) {
            try {
                sessionStorage.setItem(this._getCacheKey(key), JSON.stringify(cacheData));
            } catch (e) {
                if (window.Log) Log.warn('CACHE-MANAGER', 'Erro ao salvar em sessionStorage:', e);
            }
        }
    }

    // Buscar do cache (memória primeiro, depois sessionStorage)
    get(key) {
        // Tentar memória primeiro
        if (this.memoryCache[key] && !this._isExpired(this.memoryCache[key].timestamp)) {
            return this.memoryCache[key].data;
        }

        // Tentar sessionStorage
        try {
            const stored = sessionStorage.getItem(this._getCacheKey(key));
            if (stored) {
                const parsed = JSON.parse(stored);
                if (!this._isExpired(parsed.timestamp)) {
                    this.memoryCache[key] = parsed; // Atualizar memória
                    return parsed.data;
                }
            }
        } catch (e) {
            if (window.Log) Log.warn('CACHE-MANAGER', 'Erro ao ler sessionStorage:', e);
        }

        return null;
    }

    // Limpar cache específico
    clear(key) {
        delete this.memoryCache[key];
        try {
            sessionStorage.removeItem(this._getCacheKey(key));
        } catch (e) {}
    }

    // Limpar todo o cache do participante
    clearAll() {
        this.memoryCache = {};
        try {
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith(CACHE_PREFIX)) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (e) {}
    }

    // ===== MÉTODOS ESPECÍFICOS PARA DADOS DO PARTICIPANTE =====

    // Dados básicos do participante (nome, escudo, etc.)
    setParticipanteBasico(ligaId, timeId, dados) {
        this.set(`basico_${ligaId}_${timeId}`, dados);
        if (window.Log) Log.debug('CACHE-MANAGER', '✅ Dados básicos salvos');
    }

    getParticipanteBasico(ligaId, timeId) {
        return this.get(`basico_${ligaId}_${timeId}`);
    }

    // Dados da liga
    setLiga(ligaId, dados) {
        this.set(`liga_${ligaId}`, dados);
    }

    getLiga(ligaId) {
        return this.get(`liga_${ligaId}`);
    }

    // Ranking (cache curto - pode mudar)
    setRanking(ligaId, dados) {
        this.set(`ranking_${ligaId}`, dados);
    }

    getRanking(ligaId) {
        return this.get(`ranking_${ligaId}`);
    }

    // Extrato financeiro
    setExtrato(ligaId, timeId, dados) {
        this.set(`extrato_${ligaId}_${timeId}`, dados);
    }

    getExtrato(ligaId, timeId) {
        return this.get(`extrato_${ligaId}_${timeId}`);
    }

    // Rodadas
    setRodadas(ligaId, dados) {
        this.set(`rodadas_${ligaId}`, dados);
    }

    getRodadas(ligaId) {
        return this.get(`rodadas_${ligaId}`);
    }

    // Módulos ativos
    setModulosAtivos(ligaId, dados) {
        this.set(`modulos_${ligaId}`, dados);
    }

    getModulosAtivos(ligaId) {
        return this.get(`modulos_${ligaId}`);
    }

    // ===== MÉTODOS AUXILIARES =====

    // Verificar se tem cache válido para uma chave
    has(key) {
        return this.get(key) !== null;
    }

    // Buscar com fallback (executa função se não tiver cache)
    async getOrFetch(key, fetchFn) {
        const cached = this.get(key);
        if (cached !== null) {
            if (window.Log) Log.debug('CACHE-MANAGER', `📦 Cache hit: ${key}`);
            return cached;
        }

        if (window.Log) Log.debug('CACHE-MANAGER', `🌐 Cache miss, buscando: ${key}`);
        const data = await fetchFn();
        this.set(key, data);
        return data;
    }
}

// Singleton global
window.ParticipanteCache = new ParticipanteCacheManager();

if (window.Log) Log.info('CACHE-MANAGER', '✅ Sistema de cache inicializado');
