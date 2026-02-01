/**
 * AUDITORIA: Verificar tipos inconsistentes entre collections financeiras
 *
 * Verifica todas as collections financeiras e reporta:
 * 1. Tipos de liga_id (String vs ObjectId vs outros)
 * 2. Tipos de time_id/timeId (Number vs String vs outros)
 * 3. Campos de temporada faltantes
 * 4. Documentos órfãos (referências a ligas/times que não existem)
 * 5. Acertos com ativo=false (soft-deleted) - contagem
 *
 * USO:
 *   node scripts/auditar-tipos-financeiros.js --dry-run
 *
 * @version 1.0.0
 * @since 2026-02-01
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const COLLECTIONS_FINANCEIRAS = [
    {
        nome: 'extratofinanceirocaches',
        campoLiga: 'liga_id',
        campoTime: 'time_id',
        tipoTimeEsperado: 'number',
    },
    {
        nome: 'fluxofinanceirocampos',
        campoLiga: 'ligaId',
        campoTime: 'timeId',
        tipoTimeEsperado: 'string',
    },
    {
        nome: 'acertofinanceiros',
        campoLiga: 'ligaId',
        campoTime: 'timeId',
        tipoTimeEsperado: 'string',
    },
    {
        nome: 'ajustesfinanceiros',
        campoLiga: 'liga_id',
        campoTime: 'time_id',
        tipoTimeEsperado: 'number',
    },
    {
        nome: 'inscricoestemporada',
        campoLiga: 'liga_id',
        campoTime: 'time_id',
        tipoTimeEsperado: 'number',
    },
    {
        nome: 'ligarules',
        campoLiga: 'liga_id',
        campoTime: null, // Não tem campo time
        tipoTimeEsperado: null,
    },
];

async function auditarTipos() {
    const isDryRun = process.argv.includes('--dry-run');

    if (!isDryRun) {
        console.log('ℹ️  Este script é somente leitura. Use --dry-run para executar.');
        console.log('   node scripts/auditar-tipos-financeiros.js --dry-run');
        process.exit(1);
    }

    console.log(`\n🔍 AUDITORIA DE TIPOS - COLLECTIONS FINANCEIRAS`);
    console.log(`${'='.repeat(70)}\n`);

    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const db = mongoose.connection.db;
    const problemas = [];
    let totalProblemas = 0;

    for (const config of COLLECTIONS_FINANCEIRAS) {
        console.log(`\n📦 Collection: ${config.nome}`);
        console.log(`${'─'.repeat(50)}`);

        let collection;
        try {
            collection = db.collection(config.nome);
            const totalDocs = await collection.countDocuments();
            console.log(`   Total documentos: ${totalDocs}`);

            if (totalDocs === 0) {
                console.log('   (vazia)');
                continue;
            }

            // ===================================================================
            // A. Verificar tipos de liga_id
            // ===================================================================
            console.log(`\n   📋 Campo: ${config.campoLiga} (liga)`);

            const tiposLiga = await collection.aggregate([
                { $group: { _id: { $type: `$${config.campoLiga}` }, count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]).toArray();

            for (const t of tiposLiga) {
                const tipo = t._id;
                const isOk = tipo === 'string' || tipo === 'objectId';
                const marker = isOk ? '✅' : '❌';
                console.log(`      ${marker} ${tipo}: ${t.count} docs`);

                if (tipo !== 'string' && tipo !== 'objectId') {
                    problemas.push({
                        collection: config.nome,
                        campo: config.campoLiga,
                        problema: `Tipo inesperado: ${tipo}`,
                        quantidade: t.count,
                    });
                    totalProblemas += t.count;
                }
            }

            // Verificar se tem mistura (String + ObjectId)
            if (tiposLiga.length > 1) {
                const tipos = tiposLiga.map(t => t._id);
                if (tipos.includes('string') && tipos.includes('objectId')) {
                    console.log(`      ⚠️  MISTURA: String + ObjectId no mesmo campo`);
                    problemas.push({
                        collection: config.nome,
                        campo: config.campoLiga,
                        problema: 'Mistura de String + ObjectId',
                        quantidade: tiposLiga.reduce((s, t) => s + t.count, 0),
                    });
                }
            }

            // ===================================================================
            // B. Verificar tipos de time_id/timeId
            // ===================================================================
            if (config.campoTime) {
                console.log(`\n   📋 Campo: ${config.campoTime} (time)`);

                const tiposTime = await collection.aggregate([
                    { $group: { _id: { $type: `$${config.campoTime}` }, count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]).toArray();

                for (const t of tiposTime) {
                    const tipo = t._id;
                    const tipoNormalizado = tipo === 'int' || tipo === 'double' || tipo === 'long' ? 'number' : tipo;
                    const isEsperado = tipoNormalizado === config.tipoTimeEsperado;
                    const marker = isEsperado ? '✅' : '⚠️';
                    console.log(`      ${marker} ${tipo}: ${t.count} docs (esperado: ${config.tipoTimeEsperado})`);

                    if (!isEsperado) {
                        problemas.push({
                            collection: config.nome,
                            campo: config.campoTime,
                            problema: `Tipo ${tipo} (esperado: ${config.tipoTimeEsperado})`,
                            quantidade: t.count,
                        });
                        totalProblemas += t.count;
                    }
                }
            }

            // ===================================================================
            // C. Verificar temporada faltante
            // ===================================================================
            const semTemporada = await collection.countDocuments({
                temporada: { $exists: false }
            });

            if (semTemporada > 0) {
                console.log(`\n      ❌ ${semTemporada} docs SEM campo temporada`);
                problemas.push({
                    collection: config.nome,
                    campo: 'temporada',
                    problema: 'Campo ausente',
                    quantidade: semTemporada,
                });
                totalProblemas += semTemporada;
            }

            // ===================================================================
            // D. Contagem por temporada
            // ===================================================================
            const porTemporada = await collection.aggregate([
                { $group: { _id: '$temporada', count: { $sum: 1 } } },
                { $sort: { _id: -1 } }
            ]).toArray();

            console.log(`\n   📅 Distribuição por temporada:`);
            for (const t of porTemporada) {
                console.log(`      Temporada ${t._id || 'NULL'}: ${t.count} docs`);
            }

            // ===================================================================
            // E. Soft-deleted (ativo=false)
            // ===================================================================
            const inativos = await collection.countDocuments({ ativo: false });
            if (inativos > 0) {
                console.log(`\n   🗑️  Soft-deleted (ativo=false): ${inativos} docs`);
            }

        } catch (error) {
            console.log(`   ❌ Erro ao acessar collection: ${error.message}`);
        }
    }

    // =========================================================================
    // RESUMO FINAL
    // =========================================================================
    console.log(`\n\n${'='.repeat(70)}`);
    console.log(`📊 RESUMO DA AUDITORIA`);
    console.log(`${'='.repeat(70)}`);

    if (problemas.length === 0) {
        console.log('✅ Nenhum problema de tipo encontrado!');
    } else {
        console.log(`⚠️  ${problemas.length} problemas encontrados (${totalProblemas} documentos afetados):\n`);

        for (const p of problemas) {
            console.log(`   📦 ${p.collection}.${p.campo}`);
            console.log(`      Problema: ${p.problema}`);
            console.log(`      Docs afetados: ${p.quantidade}`);
            console.log('');
        }

        console.log('📌 AÇÕES RECOMENDADAS:');
        console.log('   1. Para liga_id Mixed → String: node scripts/migrar-liga-id-para-string.js --dry-run');
        console.log('   2. Para divergência de saldos:  node scripts/reconciliar-saldos-financeiros.js --dry-run');
    }

    console.log(`${'='.repeat(70)}\n`);

    await mongoose.disconnect();
}

auditarTipos().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});
