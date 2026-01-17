/**
 * FIX: Extrato 2025 com Documentos Duplicados (liga_id String vs ObjectId)
 *
 * PROBLEMA: A funcao processarDecisaoUnificada usava liga_id: ObjectId com upsert: true.
 * Documentos originais tinham liga_id: String, causando duplicacao.
 * O documento duplicado tem apenas {quitacao}, sem historico_transacoes.
 *
 * SOLUCAO:
 * 1. Identificar duplicados (mesmo time_id + temporada, liga_ids diferentes)
 * 2. Manter documento com dados (historico_transacoes > 0)
 * 3. Migrar campo quitacao se necessario
 * 4. Remover documento vazio
 *
 * Uso:
 *   node scripts/fix-extrato-duplicados-liga-id.js --dry-run    # Simula
 *   node scripts/fix-extrato-duplicados-liga-id.js --force      # Executa
 *
 * @version 1.0.0
 * @since 2026-01-17
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function corrigirDuplicados() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForced = process.argv.includes('--force');

    if (!isDryRun && !isForced) {
        console.error('Uso: node scripts/fix-extrato-duplicados-liga-id.js --dry-run ou --force');
        process.exit(1);
    }

    console.log(`\n========================================`);
    console.log(`FIX: EXTRATO DUPLICADOS - LIGA_ID`);
    console.log(`========================================`);
    console.log(`Modo: ${isDryRun ? 'SIMULACAO (--dry-run)' : 'EXECUCAO REAL (--force)'}\n`);

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado ao MongoDB\n');

        const db = mongoose.connection.db;
        const collection = db.collection('extratofinanceirocaches');

        // 1. Identificar duplicados via aggregation
        console.log('Buscando duplicados (mesmo time_id + temporada)...\n');

        const duplicados = await collection.aggregate([
            {
                $group: {
                    _id: { time_id: '$time_id', temporada: '$temporada' },
                    count: { $sum: 1 },
                    docs: { $push: '$$ROOT' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]).toArray();

        console.log(`Grupos duplicados encontrados: ${duplicados.length}\n`);

        if (duplicados.length === 0) {
            console.log('Nenhum duplicado encontrado. Sistema OK!');
            await mongoose.disconnect();
            return;
        }

        let corrigidos = 0;
        let removidos = 0;

        for (const grupo of duplicados) {
            console.log(`\n----------------------------------------`);
            console.log(`Time ID: ${grupo._id.time_id} | Temporada: ${grupo._id.temporada}`);
            console.log(`Documentos: ${grupo.count}`);

            // Separar documento com dados vs documento vazio
            const docComDados = grupo.docs.find(d =>
                (d.historico_transacoes?.length > 0) ||
                (d.saldo_consolidado && d.saldo_consolidado !== 0)
            );

            const docVazio = grupo.docs.find(d =>
                (!d.historico_transacoes || d.historico_transacoes.length === 0) &&
                (!d.saldo_consolidado || d.saldo_consolidado === 0)
            );

            if (!docComDados) {
                console.log(`  AVISO: Nenhum documento com dados encontrado. Pulando...`);
                continue;
            }

            console.log(`\n  DOC COM DADOS:`);
            console.log(`    _id: ${docComDados._id}`);
            console.log(`    liga_id: ${docComDados.liga_id} (tipo: ${typeof docComDados.liga_id})`);
            console.log(`    saldo: R$ ${docComDados.saldo_consolidado}`);
            console.log(`    transacoes: ${docComDados.historico_transacoes?.length || 0}`);
            console.log(`    quitacao: ${docComDados.quitacao?.quitado ? 'SIM' : 'NAO'}`);

            if (docVazio) {
                console.log(`\n  DOC VAZIO (a remover):`);
                console.log(`    _id: ${docVazio._id}`);
                console.log(`    liga_id: ${docVazio.liga_id} (tipo: ${typeof docVazio.liga_id})`);
                console.log(`    quitacao: ${docVazio.quitacao?.quitado ? 'SIM' : 'NAO'}`);

                // Migrar quitacao se documento vazio tem e o com dados nao
                const precisaMigrarQuitacao = docVazio.quitacao?.quitado && !docComDados.quitacao?.quitado;

                if (!isDryRun) {
                    if (precisaMigrarQuitacao) {
                        console.log(`\n  MIGRANDO quitacao do doc vazio para doc com dados...`);
                        await collection.updateOne(
                            { _id: docComDados._id },
                            { $set: { quitacao: docVazio.quitacao } }
                        );
                        console.log(`  Quitacao migrada com sucesso!`);
                    }

                    // Remover documento vazio
                    await collection.deleteOne({ _id: docVazio._id });
                    console.log(`\n  REMOVIDO: Documento vazio deletado`);
                    removidos++;
                } else {
                    if (precisaMigrarQuitacao) {
                        console.log(`\n  [DRY-RUN] Seria migrada quitacao`);
                    }
                    console.log(`  [DRY-RUN] Seria removido documento vazio`);
                }

                corrigidos++;
            } else {
                console.log(`\n  AVISO: Nao encontrado documento vazio obvio. Verificar manualmente.`);
                grupo.docs.forEach((d, i) => {
                    console.log(`    Doc ${i + 1}: _id=${d._id}, transacoes=${d.historico_transacoes?.length || 0}, saldo=${d.saldo_consolidado}`);
                });
            }
        }

        console.log(`\n========================================`);
        console.log(`RESUMO:`);
        console.log(`  - Grupos analisados: ${duplicados.length}`);
        console.log(`  - Corrigidos: ${isDryRun ? '0 (dry-run)' : corrigidos}`);
        console.log(`  - Docs removidos: ${isDryRun ? '0 (dry-run)' : removidos}`);
        console.log(`  - Modo: ${isDryRun ? 'SIMULACAO' : 'EXECUTADO'}`);
        console.log(`========================================\n`);

        if (isDryRun && duplicados.length > 0) {
            console.log('Para executar de verdade, rode:');
            console.log('  node scripts/fix-extrato-duplicados-liga-id.js --force\n');
        }

    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

corrigirDuplicados();
