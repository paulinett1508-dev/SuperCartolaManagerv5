/**
 * UTILITÁRIO: Limpar Cache Pontos Corridos
 *
 * Execute no console do navegador:
 *
 * const script = document.createElement('script');
 * script.src = '/js/clear-pontos-corridos-cache.js';
 * document.head.appendChild(script);
 */

(async function clearPontosCorridosCache() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  LIMPEZA DE CACHE - PONTOS CORRIDOS   ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
        // 1. Limpar IndexedDB
        if (window.OfflineCache) {
            console.log('📦 Limpando IndexedDB...');

            const ligaId = window.participanteData?.ligaId || localStorage.getItem('ligaId');

            if (ligaId) {
                // Limpar cache antigo (sem temporada)
                try {
                    await window.OfflineCache.delete('pontosCorridos', ligaId);
                    console.log('  ✅ Cache antigo removido (sem temporada)');
                } catch (e) {
                    console.log('  ℹ️ Sem cache antigo');
                }

                // Limpar cache 2025
                try {
                    await window.OfflineCache.delete('pontosCorridos', `${ligaId}:2025`);
                    console.log('  ✅ Cache 2025 removido');
                } catch (e) {
                    console.log('  ℹ️ Sem cache 2025');
                }

                // Limpar cache 2026
                try {
                    await window.OfflineCache.delete('pontosCorridos', `${ligaId}:2026`);
                    console.log('  ✅ Cache 2026 removido');
                } catch (e) {
                    console.log('  ℹ️ Sem cache 2026');
                }
            }
        }

        // 2. Limpar LocalStorage
        console.log('\n📦 Limpando LocalStorage...');
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('pontosCorridos')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`  ✅ ${keysToRemove.length} chaves removidas`);

        // 3. Limpar SessionStorage
        console.log('\n📦 Limpando SessionStorage...');
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.includes('pontosCorridos')) {
                sessionKeysToRemove.push(key);
            }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
        console.log(`  ✅ ${sessionKeysToRemove.length} chaves removidas`);

        // 4. Recarregar módulo
        console.log('\n🔄 Recarregando módulo...');
        if (window.inicializarPontosCorridosParticipante) {
            await window.inicializarPontosCorridosParticipante({
                ligaId: window.participanteData?.ligaId,
                timeId: window.participanteData?.timeId,
                participante: window.participanteData
            });
            console.log('  ✅ Módulo recarregado');
        }

        console.log('\n╔════════════════════════════════════════╗');
        console.log('║  ✅ LIMPEZA CONCLUÍDA COM SUCESSO     ║');
        console.log('╚════════════════════════════════════════╝\n');
        console.log('📋 Próximos passos:');
        console.log('  1. Recarregue a página (F5)');
        console.log('  2. Navegue para Pontos Corridos');
        console.log('  3. Verifique se ano está correto');

    } catch (error) {
        console.error('\n❌ Erro durante limpeza:', error);
    }
})();
