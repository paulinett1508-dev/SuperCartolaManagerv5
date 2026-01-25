/**
 * Script: fix-cache-permanente-2025.js
 * Objetivo: Corrigir flag cache_permanente para true nos extratos da temporada 2025
 *
 * A temporada 2025 já encerrou, portanto todos os caches devem ser permanentes.
 *
 * Uso:
 *   node scripts/fix-cache-permanente-2025.js --dry-run    # Simula
 *   node scripts/fix-cache-permanente-2025.js --force      # Executa
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const isDryRun = process.argv.includes('--dry-run');
const isForced = process.argv.includes('--force');

if (!isDryRun && !isForced) {
    console.error('❌ Uso: node scripts/fix-cache-permanente-2025.js [--dry-run|--force]');
    console.error('   --dry-run  Simula a operação sem modificar dados');
    console.error('   --force    Executa a atualização');
    process.exit(1);
}

async function main() {
    console.log('🔧 Fix cache_permanente 2025');
    console.log('=' .repeat(50));
    console.log(`Modo: ${isDryRun ? '🔍 DRY-RUN (simulação)' : '⚡ FORCE (execução real)'}`);
    console.log();

    try {
        // Conectar ao MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('extratofinanceirocaches');

        // Contar documentos afetados (false ou null)
        const countBefore = await collection.countDocuments({
            temporada: 2025,
            $or: [
                { cache_permanente: false },
                { cache_permanente: null },
                { cache_permanente: { $exists: false } }
            ]
        });

        console.log(`\n📊 Documentos com cache_permanente: false/null na temporada 2025: ${countBefore}`);

        if (countBefore === 0) {
            console.log('\n✅ Nenhum documento para atualizar. Tudo já está correto!');
            return;
        }

        // Listar alguns exemplos
        const exemplos = await collection.find({
            temporada: 2025,
            $or: [
                { cache_permanente: false },
                { cache_permanente: null },
                { cache_permanente: { $exists: false } }
            ]
        }).limit(5).toArray();

        console.log('\n📋 Exemplos de documentos a serem atualizados:');
        exemplos.forEach((doc, i) => {
            console.log(`   ${i + 1}. time_id: ${doc.time_id}, rodada: ${doc.rodada}`);
        });

        if (isDryRun) {
            console.log('\n🔍 DRY-RUN: Nenhuma alteração foi feita.');
            console.log(`   Seriam atualizados ${countBefore} documentos.`);
        } else {
            // Executar atualização
            console.log('\n⚡ Executando atualização...');

            const result = await collection.updateMany(
                {
                    temporada: 2025,
                    $or: [
                        { cache_permanente: false },
                        { cache_permanente: null },
                        { cache_permanente: { $exists: false } }
                    ]
                },
                { $set: { cache_permanente: true } }
            );

            console.log(`\n✅ Atualização concluída!`);
            console.log(`   Documentos encontrados: ${result.matchedCount}`);
            console.log(`   Documentos modificados: ${result.modifiedCount}`);

            // Verificar resultado
            const countAfter = await collection.countDocuments({
                temporada: 2025,
                $or: [
                    { cache_permanente: false },
                    { cache_permanente: null },
                    { cache_permanente: { $exists: false } }
                ]
            });

            console.log(`\n📊 Verificação pós-atualização:`);
            console.log(`   Documentos com cache_permanente: false restantes: ${countAfter}`);

            if (countAfter === 0) {
                console.log('\n🎉 Sucesso! Todos os extratos 2025 agora têm cache_permanente: true');
            } else {
                console.log('\n⚠️ Atenção: Ainda existem documentos não atualizados');
            }
        }

        // Estatísticas gerais
        const stats = await collection.aggregate([
            { $match: { temporada: 2025 } },
            { $group: {
                _id: '$cache_permanente',
                count: { $sum: 1 }
            }}
        ]).toArray();

        console.log('\n📈 Estatísticas finais (temporada 2025):');
        stats.forEach(s => {
            console.log(`   cache_permanente: ${s._id} → ${s.count} documentos`);
        });

    } catch (error) {
        console.error('\n❌ Erro:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Desconectado do MongoDB');
    }
}

main();
