/**
 * Script: Corrigir Sistema de Classificação para Temporada 2026
 *
 * Problema: Índice antigo `ligaId_1_turno_1` (sem temporada) bloqueava
 * criação de novos rankings para 2026.
 *
 * Ações:
 * 1. Dropar índice antigo que não considera temporada
 * 2. Limpar cache de RankingTurno de 2025
 *
 * Uso:
 *   node scripts/fix-ranking-temporada-2026.js --dry-run
 *   node scripts/fix-ranking-temporada-2026.js --force
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_SUPERCARTOLA_ID = '684cb1c8af923da7c7df51de';
const OLD_INDEX_NAME = 'ligaId_1_turno_1';

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    if (!isDryRun && !isForce) {
        console.log('❌ Uso: node scripts/fix-ranking-temporada-2026.js [--dry-run | --force]');
        console.log('   --dry-run  Apenas mostra o que seria feito');
        console.log('   --force    Executa as alterações');
        process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  FIX RANKING TEMPORADA 2026');
    console.log(`  Modo: ${isDryRun ? 'DRY-RUN (simulação)' : 'FORCE (execução real)'}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    try {
        // Conectar ao MongoDB
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI não configurado');
        }

        console.log('📡 Conectando ao MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Conectado!\n');

        const db = mongoose.connection.db;
        const rankingTurnosCollection = db.collection('rankingturnos');

        // ═══════════════════════════════════════════════════════════
        // FASE 1: Verificar e dropar índice antigo
        // ═══════════════════════════════════════════════════════════
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('FASE 1: Verificar índices');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const indexes = await rankingTurnosCollection.indexes();
        console.log('📋 Índices atuais:');
        indexes.forEach(idx => {
            const isOld = idx.name === OLD_INDEX_NAME;
            console.log(`   ${isOld ? '⚠️ ' : '✅ '} ${idx.name}: ${JSON.stringify(idx.key)}${isOld ? ' [SERÁ REMOVIDO]' : ''}`);
        });
        console.log('');

        const hasOldIndex = indexes.some(idx => idx.name === OLD_INDEX_NAME);

        if (hasOldIndex) {
            console.log(`🔧 Índice problemático '${OLD_INDEX_NAME}' encontrado!`);
            if (isDryRun) {
                console.log('   [DRY-RUN] Seria removido');
            } else {
                await rankingTurnosCollection.dropIndex(OLD_INDEX_NAME);
                console.log('   ✅ Índice removido com sucesso!');
            }
        } else {
            console.log(`✅ Índice '${OLD_INDEX_NAME}' não existe (já foi removido)`);
        }
        console.log('');

        // ═══════════════════════════════════════════════════════════
        // FASE 2: Limpar rankings 2025
        // ═══════════════════════════════════════════════════════════
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('FASE 2: Limpar RankingTurno de 2025');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Contar registros 2025
        const count2025 = await rankingTurnosCollection.countDocuments({
            ligaId: LIGA_SUPERCARTOLA_ID,
            temporada: 2025
        });

        console.log(`📊 Registros de 2025 na liga SuperCartola: ${count2025}`);

        if (count2025 > 0) {
            // Mostrar quais registros serão removidos
            const registros = await rankingTurnosCollection.find({
                ligaId: LIGA_SUPERCARTOLA_ID,
                temporada: 2025
            }).project({ turno: 1, status: 1, rodada_atual: 1 }).toArray();

            console.log('📋 Registros a serem removidos:');
            registros.forEach(r => {
                console.log(`   - turno: ${r.turno}, status: ${r.status}, rodada: ${r.rodada_atual}`);
            });

            if (isDryRun) {
                console.log(`\n   [DRY-RUN] ${count2025} registros seriam removidos`);
            } else {
                const result = await rankingTurnosCollection.deleteMany({
                    ligaId: LIGA_SUPERCARTOLA_ID,
                    temporada: 2025
                });
                console.log(`\n   ✅ ${result.deletedCount} registros removidos!`);
            }
        } else {
            console.log('✅ Nenhum registro de 2025 para remover');
        }
        console.log('');

        // ═══════════════════════════════════════════════════════════
        // FASE 3: Verificar estado final
        // ═══════════════════════════════════════════════════════════
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('FASE 3: Verificação final');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (!isDryRun) {
            // Verificar índices após remoção
            const newIndexes = await rankingTurnosCollection.indexes();
            console.log('📋 Índices após correção:');
            newIndexes.forEach(idx => {
                console.log(`   ✅ ${idx.name}: ${JSON.stringify(idx.key)}`);
            });
            console.log('');

            // Contar registros restantes
            const countTotal = await rankingTurnosCollection.countDocuments({
                ligaId: LIGA_SUPERCARTOLA_ID
            });
            const count2026 = await rankingTurnosCollection.countDocuments({
                ligaId: LIGA_SUPERCARTOLA_ID,
                temporada: 2026
            });

            console.log(`📊 Registros restantes da liga SuperCartola:`);
            console.log(`   - Total: ${countTotal}`);
            console.log(`   - Temporada 2026: ${count2026}`);
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        if (isDryRun) {
            console.log('  ✅ DRY-RUN COMPLETO');
            console.log('  Execute com --force para aplicar as mudanças');
        } else {
            console.log('  ✅ CORREÇÃO APLICADA COM SUCESSO!');
            console.log('  O módulo Classificação agora mostrará corretamente');
            console.log('  "Sem dados" para temporada 2026.');
        }
        console.log('═══════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n📡 Desconectado do MongoDB');
    }
}

main();
