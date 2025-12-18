#!/usr/bin/env node
// =====================================================================
// SINCRONIZAR DADOS DO PROD PARA DEV
// =====================================================================
// Script para copiar dados financeiros do banco PROD para DEV
// Isso permite desenvolvimento local com dados reais
// =====================================================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const log = {
    info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m[OK]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

const PROD_URI = process.env.MONGO_URI;
const DEV_URI = process.env.MONGO_URI_DEV;

// Collections para sincronizar
const COLLECTIONS_TO_SYNC = [
    'rodadas',
    'extratofinanceirocaches',
    'fluxofinanceirocampos',
    'acertofinanceiros',
    'top10caches',
    'pontoscorridoscaches',
    'matamatacaches',
    'rankinggeralcaches',
    'rankingturnos',
];

async function syncCollection(prodDb, devDb, collectionName) {
    try {
        const prodCollection = prodDb.collection(collectionName);
        const devCollection = devDb.collection(collectionName);

        // Contar documentos
        const prodCount = await prodCollection.countDocuments();
        const devCount = await devCollection.countDocuments();

        if (prodCount === 0) {
            log.warn(`${collectionName}: PROD vazio, pulando`);
            return { collection: collectionName, synced: 0, skipped: true };
        }

        if (devCount > 0) {
            log.info(`${collectionName}: Limpando ${devCount} docs do DEV...`);
            await devCollection.deleteMany({});
        }

        // Buscar todos os documentos do PROD
        const docs = await prodCollection.find({}).toArray();

        if (docs.length > 0) {
            // Inserir no DEV
            await devCollection.insertMany(docs);
            log.success(`${collectionName}: ${docs.length} documentos sincronizados`);
        }

        return { collection: collectionName, synced: docs.length, skipped: false };
    } catch (error) {
        log.error(`${collectionName}: ${error.message}`);
        return { collection: collectionName, synced: 0, error: error.message };
    }
}

async function main() {
    console.log('\n========================================');
    console.log('  SYNC PROD → DEV');
    console.log('========================================\n');

    if (!PROD_URI || !DEV_URI) {
        log.error('MONGO_URI ou MONGO_URI_DEV não definidas!');
        process.exit(1);
    }

    // Conectar ao PROD
    log.info('Conectando ao PROD...');
    const prodConn = await mongoose.createConnection(PROD_URI).asPromise();
    const prodDb = prodConn.db;
    log.success('PROD conectado!');

    // Conectar ao DEV
    log.info('Conectando ao DEV...');
    const devConn = await mongoose.createConnection(DEV_URI).asPromise();
    const devDb = devConn.db;
    log.success('DEV conectado!');

    // Sincronizar cada collection
    const results = [];
    for (const collectionName of COLLECTIONS_TO_SYNC) {
        const result = await syncCollection(prodDb, devDb, collectionName);
        results.push(result);
    }

    // Fechar conexões
    await prodConn.close();
    await devConn.close();

    // Resumo
    console.log('\n========================================');
    console.log('  RESUMO DA SINCRONIZAÇÃO');
    console.log('========================================');

    let totalSynced = 0;
    results.forEach(r => {
        const status = r.error ? '❌' : (r.skipped ? '⏭️' : '✅');
        console.log(`  ${status} ${r.collection}: ${r.synced} docs`);
        totalSynced += r.synced;
    });

    console.log('----------------------------------------');
    console.log(`  Total sincronizado: ${totalSynced} documentos`);
    console.log('========================================\n');

    log.success('Sincronização concluída!');
}

main().catch(err => {
    log.error(err.message);
    process.exit(1);
});
