/**
 * SCRIPT DE RESTAURAÇÃO COMPLETA DO BACKUP PRE-WIPE
 * Restaura todas as collections afetadas pelo turn_key_2026.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../data/backups/pre-wipe-2026-01-01T22-52-14');
const SOBRAL_ID = '684d821cf1a7ae16d1f89572';
const SUPERCARTOLA_ID = '684cb1c8af923da7c7df51de';

// Collections para restaurar (ordem importa para dependencias)
const COLLECTIONS_TO_RESTORE = [
    { name: 'rodadas', file: 'rodadas.json', ligaField: 'ligaId', useObjectId: true },
    { name: 'goleiros', file: 'goleiros.json', ligaField: 'ligaId', useObjectId: false },
    { name: 'golsconsolidados', file: 'golsconsolidados.json', ligaField: 'ligaId', useObjectId: false },
    { name: 'rodadasnapshots', file: 'rodadasnapshots.json', ligaField: 'ligaId', useObjectId: true },
    { name: 'top10caches', file: 'top10caches.json', ligaField: 'liga_id', useObjectId: false },
    { name: 'melhor_mes_cache', file: 'melhor_mes_cache.json', ligaField: 'liga_id', useObjectId: false },
    { name: 'matamatacaches', file: 'matamatacaches.json', ligaField: 'liga_id', useObjectId: false },
    { name: 'pontoscorridoscaches', file: 'pontoscorridoscaches.json', ligaField: 'liga_id', useObjectId: false },
    { name: 'rankinggeralcaches', file: 'rankinggeralcaches.json', ligaField: 'liga_id', useObjectId: false },
    { name: 'extratofinanceirocaches', file: 'extratofinanceirocaches.json', ligaField: 'liga_id', useObjectId: false },
    { name: 'ranking_turno_caches', file: 'ranking_turno_caches.json', ligaField: 'liga_id', useObjectId: false },
    { name: 'rankingturnos', file: 'rankingturnos.json', ligaField: 'ligaId', useObjectId: false },
    { name: 'artilheirocampeaos', file: 'artilheirocampeaos.json', ligaField: 'ligaId', useObjectId: false },
];

function getLigaIdFromDoc(doc, ligaField) {
    const value = doc[ligaField];
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value['$oid']) return value['$oid'];
    if (value.toString) return value.toString();
    return null;
}

async function restaurarCollection(db, config, dryRun = false) {
    const filePath = path.join(BACKUP_DIR, config.file);

    if (!fs.existsSync(filePath)) {
        console.log(`  ⏭️  ${config.name}: arquivo não encontrado`);
        return { restored: 0, deleted: 0 };
    }

    const backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Filtrar documentos das ligas conhecidas
    const docsToRestore = backup.filter(doc => {
        const ligaId = getLigaIdFromDoc(doc, config.ligaField);
        return ligaId === SOBRAL_ID || ligaId === SUPERCARTOLA_ID;
    });

    if (docsToRestore.length === 0) {
        console.log(`  ⏭️  ${config.name}: nenhum documento das ligas encontrado`);
        return { restored: 0, deleted: 0 };
    }

    // Preparar documentos (remover _id antigo, converter campos)
    const preparedDocs = docsToRestore.map(doc => {
        const { _id, ...rest } = doc;

        // Converter ligaId para ObjectId se necessario
        if (config.useObjectId && rest[config.ligaField]) {
            const ligaIdStr = getLigaIdFromDoc(rest, config.ligaField);
            rest[config.ligaField] = new ObjectId(ligaIdStr);
        }

        // Converter datas
        if (rest.createdAt) rest.createdAt = new Date(rest.createdAt);
        if (rest.updatedAt) rest.updatedAt = new Date(rest.updatedAt);
        if (rest.dataColeta) rest.dataColeta = new Date(rest.dataColeta);
        if (rest.timestamp) rest.timestamp = new Date(rest.timestamp);
        if (rest.ultima_atualizacao) rest.ultima_atualizacao = new Date(rest.ultima_atualizacao);

        rest.restaurado_em = new Date();
        rest.fonte_backup = 'pre-wipe-2026-01-01T22-52-14';

        return rest;
    });

    if (dryRun) {
        console.log(`  🔍 ${config.name}: ${preparedDocs.length} documentos seriam restaurados`);
        return { restored: preparedDocs.length, deleted: 0 };
    }

    // Deletar documentos atuais das ligas
    const deleteQuery = {};
    deleteQuery[config.ligaField] = { $in: [SOBRAL_ID, SUPERCARTOLA_ID] };

    // Tentar tambem com ObjectId
    if (config.useObjectId) {
        deleteQuery[config.ligaField] = {
            $in: [
                SOBRAL_ID, SUPERCARTOLA_ID,
                new ObjectId(SOBRAL_ID), new ObjectId(SUPERCARTOLA_ID)
            ]
        };
    }

    const deleteResult = await db.collection(config.name).deleteMany(deleteQuery);

    // Inserir documentos restaurados
    let insertResult = { insertedCount: 0 };
    if (preparedDocs.length > 0) {
        insertResult = await db.collection(config.name).insertMany(preparedDocs);
    }

    console.log(`  ✅ ${config.name}: ${deleteResult.deletedCount} removidos, ${insertResult.insertedCount} restaurados`);

    return {
        restored: insertResult.insertedCount,
        deleted: deleteResult.deletedCount
    };
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const forceRun = process.argv.includes('--force');

    console.log('═'.repeat(60));
    console.log('🔄 RESTAURAÇÃO COMPLETA DO BACKUP PRE-WIPE');
    console.log('═'.repeat(60));
    console.log(`📁 Diretório: ${BACKUP_DIR}`);
    console.log(`🎯 Ligas: SOBRAL + SUPERCARTOLA`);
    console.log(`🔧 Modo: ${dryRun ? 'DRY-RUN (simulação)' : 'EXECUÇÃO REAL'}`);
    console.log('═'.repeat(60));

    if (!dryRun && !forceRun) {
        console.log('\n⚠️  ATENÇÃO: Este script vai SUBSTITUIR dados atuais!');
        console.log('   Use --dry-run para simular ou --force para executar\n');
        process.exit(1);
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db();

    let totalRestored = 0;
    let totalDeleted = 0;

    console.log('\n📦 Restaurando collections...\n');

    for (const config of COLLECTIONS_TO_RESTORE) {
        try {
            const result = await restaurarCollection(db, config, dryRun);
            totalRestored += result.restored;
            totalDeleted += result.deleted;
        } catch (error) {
            console.error(`  ❌ ${config.name}: ${error.message}`);
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMO:');
    console.log(`   Documentos removidos: ${totalDeleted}`);
    console.log(`   Documentos restaurados: ${totalRestored}`);
    console.log('═'.repeat(60));

    await client.close();
    console.log('\n✅ Processo concluído!\n');
}

main().catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
});
