/**
 * Script para invalidar entradas MATA_MATA do ExtratoFinanceiroCache
 *
 * Remove APENAS transações MATA_MATA e recalcula totais.
 * Na próxima consulta ao extrato, o sistema recalculará automaticamente.
 *
 * Uso:
 *   node scripts/invalidar-cache-mata-mata.js --dry-run    # Apenas mostra o que seria afetado
 *   node scripts/invalidar-cache-mata-mata.js --force      # Executa a invalidação
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI_DEV || process.env.MONGO_URI;
const isDryRun = process.argv.includes('--dry-run');
const isForced = process.argv.includes('--force');

if (!isDryRun && !isForced) {
    console.error('❌ Use --dry-run para simular ou --force para executar');
    process.exit(1);
}

async function invalidarCacheMataMata() {
    console.log(`🔧 Modo: ${isDryRun ? 'DRY-RUN (simulação)' : 'FORCE (execução real)'}`);
    console.log('🔧 Conectando ao MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado!');

    const db = mongoose.connection.db;
    const collection = db.collection('extratofinanceirocaches');

    // 1. Encontrar todos os caches que têm transações MATA_MATA
    const cachesComMM = await collection.find({
        'historico_transacoes.tipo': 'MATA_MATA'
    }).toArray();

    console.log(`\n📊 Encontrados ${cachesComMM.length} caches com transações MATA_MATA\n`);

    if (cachesComMM.length === 0) {
        console.log('✅ Nenhum cache com MATA_MATA encontrado. Nada a fazer.');
        await mongoose.disconnect();
        return;
    }

    let totalTransacoesRemovidas = 0;

    for (const cache of cachesComMM) {
        const transacoesMM = cache.historico_transacoes.filter(t => t.tipo === 'MATA_MATA');
        const transacoesOutras = cache.historico_transacoes.filter(t => t.tipo !== 'MATA_MATA');
        const valorMM = transacoesMM.reduce((acc, t) => acc + (t.valor || 0), 0);

        console.log(`  📋 Time ${cache.time_id} (Liga: ${cache.liga_id})`);
        console.log(`     → ${transacoesMM.length} transações MATA_MATA (saldo MM: R$ ${valorMM.toFixed(2)})`);
        transacoesMM.forEach(t => {
            console.log(`       - R${t.rodada} ${t.descricao}: R$ ${t.valor?.toFixed(2)}`);
        });

        totalTransacoesRemovidas += transacoesMM.length;

        if (!isDryRun) {
            // Recalcular totais sem MATA_MATA
            const novoSaldo = transacoesOutras.reduce((acc, t) => acc + (t.valor || 0), 0);
            const novosGanhos = transacoesOutras.filter(t => t.valor > 0).reduce((acc, t) => acc + t.valor, 0);
            const novasPerdas = transacoesOutras.filter(t => t.valor < 0).reduce((acc, t) => acc + Math.abs(t.valor), 0);

            await collection.updateOne(
                { _id: cache._id },
                {
                    $set: {
                        historico_transacoes: transacoesOutras,
                        saldo_consolidado: novoSaldo,
                        ganhos_consolidados: novosGanhos,
                        perdas_consolidadas: novasPerdas,
                    }
                }
            );
            console.log(`     ✅ Cache atualizado (novo saldo: R$ ${novoSaldo.toFixed(2)})`);
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 RESUMO:`);
    console.log(`   Caches afetados: ${cachesComMM.length}`);
    console.log(`   Transações MATA_MATA removidas: ${totalTransacoesRemovidas}`);
    console.log(`   Modo: ${isDryRun ? '🔍 DRY-RUN (nada foi alterado)' : '✅ EXECUTADO'}`);
    console.log(`${'='.repeat(60)}\n`);

    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB.');
}

invalidarCacheMataMata().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
