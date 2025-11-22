
// SISTEMA DE CACHE ROBUSTO PARA PARTICIPANTE
console.log('[PARTICIPANTE-CACHE] Carregando sistema de cache...');

class ParticipanteCache {
    constructor() {
        this.db = null;
        this.dbName = 'ParticipanteCacheDB';
        this.version = 1;
        this.inicializar();
    }

    async inicializar() {
        try {
            this.db = await this.abrirIndexedDB();
            console.log('[PARTICIPANTE-CACHE] ✅ IndexedDB inicializado');
        } catch (error) {
            console.error('[PARTICIPANTE-CACHE] ❌ Erro ao inicializar:', error);
        }
    }

    abrirIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store para dados dos módulos
                if (!db.objectStoreNames.contains('modulos')) {
                    db.createObjectStore('modulos', { keyPath: 'id' });
                }

                // Store para ranking
                if (!db.objectStoreNames.contains('ranking')) {
                    db.createObjectStore('ranking', { keyPath: 'id' });
                }

                // Store para rodadas
                if (!db.objectStoreNames.contains('rodadas')) {
                    db.createObjectStore('rodadas', { keyPath: 'id' });
                }

                // Store para extrato
                if (!db.objectStoreNames.contains('extrato')) {
                    db.createObjectStore('extrato', { keyPath: 'id' });
                }
            };
        });
    }

    async salvar(store, chave, dados, ttl = 300000) { // 5 minutos padrão
        try {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);

            const registro = {
                id: chave,
                dados: dados,
                timestamp: Date.now(),
                expira: Date.now() + ttl
            };

            await objectStore.put(registro);
            console.log(`[PARTICIPANTE-CACHE] 💾 Salvou: ${store}/${chave}`);
            return true;
        } catch (error) {
            console.error('[PARTICIPANTE-CACHE] Erro ao salvar:', error);
            return false;
        }
    }

    async buscar(store, chave) {
        try {
            const transaction = this.db.transaction([store], 'readonly');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.get(chave);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const resultado = request.result;

                    if (!resultado) {
                        console.log(`[PARTICIPANTE-CACHE] ❌ Não encontrado: ${store}/${chave}`);
                        resolve(null);
                        return;
                    }

                    // Verificar expiração
                    if (Date.now() > resultado.expira) {
                        console.log(`[PARTICIPANTE-CACHE] ⏰ Expirado: ${store}/${chave}`);
                        this.remover(store, chave);
                        resolve(null);
                        return;
                    }

                    console.log(`[PARTICIPANTE-CACHE] ✅ Cache hit: ${store}/${chave}`);
                    resolve(resultado.dados);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('[PARTICIPANTE-CACHE] Erro ao buscar:', error);
            return null;
        }
    }

    async remover(store, chave) {
        try {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            await objectStore.delete(chave);
            console.log(`[PARTICIPANTE-CACHE] 🗑️ Removido: ${store}/${chave}`);
        } catch (error) {
            console.error('[PARTICIPANTE-CACHE] Erro ao remover:', error);
        }
    }

    async limpar(store) {
        try {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            await objectStore.clear();
            console.log(`[PARTICIPANTE-CACHE] 🧹 Store limpo: ${store}`);
        } catch (error) {
            console.error('[PARTICIPANTE-CACHE] Erro ao limpar:', error);
        }
    }

    async limparExpirados() {
        const stores = ['modulos', 'ranking', 'rodadas', 'extrato'];
        
        for (const store of stores) {
            try {
                const transaction = this.db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                const request = objectStore.openCursor();

                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        if (Date.now() > cursor.value.expira) {
                            cursor.delete();
                        }
                        cursor.continue();
                    }
                };
            } catch (error) {
                console.error(`[PARTICIPANTE-CACHE] Erro ao limpar ${store}:`, error);
            }
        }
    }
}

// Instância global
const participanteCache = new ParticipanteCache();

// Limpar expirados a cada 5 minutos
setInterval(() => participanteCache.limparExpirados(), 300000);

console.log('[PARTICIPANTE-CACHE] ✅ Sistema carregado');
