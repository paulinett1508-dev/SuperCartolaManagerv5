/**
 * Script: Limpar Cache Extrato 2026
 *
 * Remove transações de rodadas erroneamente adicionadas ao cache de extrato 2026.
 * Mantém apenas: INSCRICAO_TEMPORADA, SALDO_TEMPORADA_ANTERIOR
 *
 * Uso:
 *   node scripts/limpar-cache-2026.js --dry-run    # Simula sem alterar
 *   node scripts/limpar-cache-2026.js --force      # Executa de verdade
 *
 * @version 1.0.0
 * @since 2026-01-10
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TEMPORADA = 2026;

// Tipos de transações PERMITIDOS no extrato 2026 (pré-temporada)
const TIPOS_PERMITIDOS = [
    'INSCRICAO_TEMPORADA',
    'SALDO_TEMPORADA_ANTERIOR',
    'AJUSTE'  // Ajustes manuais do admin
];

async function limparCache2026() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForced = process.argv.includes('--force');

    if (!isDryRun && !isForced) {
        console.error('❌ Uso: node scripts/limpar-cache-2026.js --dry-run ou --force');
        process.exit(1);
    }

    console.log(`\n🧹 LIMPEZA DE CACHE EXTRATO ${TEMPORADA}`);
    console.log(`   Modo: ${isDryRun ? 'SIMULAÇÃO (--dry-run)' : '🔴 EXECUÇÃO REAL (--force)'}\n`);

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        const db = mongoose.connection.db;
        const collection = db.collection('extratofinanceirocaches');

        // 1. Buscar todos os caches de 2026
        const caches = await collection.find({ temporada: TEMPORADA }).toArray();
        console.log(`📊 Encontrados ${caches.length} caches de temporada ${TEMPORADA}\n`);

        let cachesCorrigidos = 0;
        let transacoesRemovidas = 0;

        for (const cache of caches) {
            const transacoesOriginais = cache.historico_transacoes || [];

            // Filtrar apenas transações permitidas
            const transacoesLimpas = transacoesOriginais.filter(t =>
                TIPOS_PERMITIDOS.includes(t.tipo)
            );

            const removidas = transacoesOriginais.length - transacoesLimpas.length;

            if (removidas > 0) {
                cachesCorrigidos++;
                transacoesRemovidas += removidas;

                // Recalcular saldo apenas com transações permitidas
                const novoSaldo = transacoesLimpas.reduce((acc, t) => acc + (t.valor || 0), 0);

                console.log(`🔧 Time ${cache.time_id}:`);
                console.log(`   - Transações: ${transacoesOriginais.length} → ${transacoesLimpas.length} (${removidas} removidas)`);
                console.log(`   - Saldo: ${cache.saldo_consolidado} → ${novoSaldo}`);

                // Mostrar o que será mantido
                transacoesLimpas.forEach(t => {
                    console.log(`   ✅ ${t.tipo}: ${t.descricao} = R$ ${t.valor}`);
                });

                if (!isDryRun) {
                    await collection.updateOne(
                        { _id: cache._id },
                        {
                            $set: {
                                historico_transacoes: transacoesLimpas,
                                saldo_consolidado: novoSaldo,
                                ganhos_consolidados: transacoesLimpas.filter(t => t.valor > 0).reduce((acc, t) => acc + t.valor, 0),
                                perdas_consolidadas: transacoesLimpas.filter(t => t.valor < 0).reduce((acc, t) => acc + t.valor, 0),
                                ultima_rodada_consolidada: 0,
                                versao_calculo: '8.4.0-limpo',
                                data_ultima_atualizacao: new Date(),
                            }
                        }
                    );
                    console.log(`   ✅ Cache atualizado!\n`);
                } else {
                    console.log(`   ⏸️  [DRY-RUN] Nenhuma alteração feita\n`);
                }
            }
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log(`📊 RESUMO:`);
        console.log(`   - Caches analisados: ${caches.length}`);
        console.log(`   - Caches corrigidos: ${cachesCorrigidos}`);
        console.log(`   - Transações removidas: ${transacoesRemovidas}`);
        console.log(`   - Modo: ${isDryRun ? 'SIMULAÇÃO' : 'EXECUTADO'}`);
        console.log(`${'='.repeat(50)}\n`);

        if (isDryRun && cachesCorrigidos > 0) {
            console.log('💡 Para executar de verdade, rode: node scripts/limpar-cache-2026.js --force\n');
        }

    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

limparCache2026();
