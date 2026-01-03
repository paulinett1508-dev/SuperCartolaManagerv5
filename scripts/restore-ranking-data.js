/**
 * Script para restaurar dados de ranking do backup
 * Restaura: rankinggeralcaches, rodadas, ranking_turno_caches
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, '../data/backups/pre-wipe-2026-01-01T22-52-14');

const COLLECTIONS_TO_RESTORE = [
    'rankinggeralcaches',
    'rodadas',
    'ranking_turno_caches'
];

async function restore() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    if (!isDryRun && !isForce) {
        console.log('Uso: node scripts/restore-ranking-data.js [--dry-run | --force]');
        console.log('  --dry-run  Simula a restauracao sem alterar o banco');
        console.log('  --force    Executa a restauracao');
        process.exit(1);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESTAURACAO DE DADOS DE RANKING`);
    console.log(`Modo: ${isDryRun ? 'DRY-RUN (simulacao)' : 'FORCE (execucao real)'}`);
    console.log(`${'='.repeat(60)}\n`);

    const client = new MongoClient(process.env.MONGO_URI);

    try {
        await client.connect();
        const db = client.db();
        console.log('Conectado ao MongoDB\n');

        for (const collName of COLLECTIONS_TO_RESTORE) {
            const backupFile = path.join(BACKUP_DIR, `${collName}.json`);

            if (!fs.existsSync(backupFile)) {
                console.log(`[SKIP] ${collName} - arquivo de backup nao encontrado`);
                continue;
            }

            const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
            const currentCount = await db.collection(collName).countDocuments();

            console.log(`\n[${collName}]`);
            console.log(`  Backup: ${backupData.length} documentos`);
            console.log(`  Atual:  ${currentCount} documentos`);

            if (isDryRun) {
                console.log(`  [DRY-RUN] Seria restaurado: ${backupData.length} documentos`);
            } else {
                // Limpar collection atual
                if (currentCount > 0) {
                    await db.collection(collName).deleteMany({});
                    console.log(`  Limpo: ${currentCount} documentos removidos`);
                }

                // Inserir dados do backup
                if (backupData.length > 0) {
                    // Converter _id strings para ObjectId se necessario
                    const docsToInsert = backupData.map(doc => {
                        const newDoc = { ...doc };
                        // Manter _id como string para evitar problemas
                        return newDoc;
                    });

                    await db.collection(collName).insertMany(docsToInsert);
                    console.log(`  Restaurado: ${backupData.length} documentos inseridos`);
                }
            }
        }

        console.log(`\n${'='.repeat(60)}`);
        if (isDryRun) {
            console.log('DRY-RUN concluido. Use --force para executar a restauracao.');
        } else {
            console.log('RESTAURACAO CONCLUIDA COM SUCESSO!');
        }
        console.log(`${'='.repeat(60)}\n`);

    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

restore();
