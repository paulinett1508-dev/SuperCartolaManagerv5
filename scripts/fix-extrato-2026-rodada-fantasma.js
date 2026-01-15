/**
 * FIX: Extrato 2026 com Rodada Fantasma
 *
 * PROBLEMA: Alguns caches de extrato 2026 têm dados de "rodada 1" que não existe.
 * A temporada 2026 ainda não começou, então não deveria haver rodadas calculadas.
 *
 * CAUSA: Versão "8.6.0-limpo-pre-temporada" (inexistente no código) criou dados incorretos.
 *
 * SOLUÇÃO: Resetar caches 2026 que têm rodadas > 0 para estado limpo.
 *
 * Uso:
 *   node scripts/fix-extrato-2026-rodada-fantasma.js --dry-run    # Simula
 *   node scripts/fix-extrato-2026-rodada-fantasma.js --force      # Executa
 *
 * @version 1.0.0
 * @since 2026-01-15
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TEMPORADA = 2026;

async function corrigirExtratos2026() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForced = process.argv.includes('--force');

    if (!isDryRun && !isForced) {
        console.error('Uso: node scripts/fix-extrato-2026-rodada-fantasma.js --dry-run ou --force');
        process.exit(1);
    }

    console.log(`\n========================================`);
    console.log(`FIX: EXTRATO 2026 - RODADA FANTASMA`);
    console.log(`========================================`);
    console.log(`Modo: ${isDryRun ? 'SIMULACAO (--dry-run)' : 'EXECUCAO REAL (--force)'}\n`);

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado ao MongoDB\n');

        const db = mongoose.connection.db;
        const collection = db.collection('extratofinanceirocaches');

        // 1. Buscar caches 2026 com rodadas calculadas (anomalia)
        const cachesComProblema = await collection.find({
            temporada: TEMPORADA,
            ultima_rodada_consolidada: { $gt: 0 }
        }).toArray();

        console.log(`Caches 2026 com rodadas > 0 encontrados: ${cachesComProblema.length}\n`);

        if (cachesComProblema.length === 0) {
            console.log('Nenhum cache com anomalia encontrado. Sistema OK!');
            await mongoose.disconnect();
            return;
        }

        let corrigidos = 0;

        for (const cache of cachesComProblema) {
            console.log(`\n----------------------------------------`);
            console.log(`Time ID: ${cache.time_id}`);
            console.log(`Liga ID: ${cache.liga_id}`);
            console.log(`Versao atual: ${cache.versao_calculo}`);
            console.log(`Rodada consolidada: ${cache.ultima_rodada_consolidada}`);
            console.log(`Saldo atual: R$ ${cache.saldo_consolidado}`);
            console.log(`Transacoes: ${cache.historico_transacoes?.length || 0}`);

            // Mostrar transacoes problematicas
            if (cache.historico_transacoes?.length > 0) {
                console.log(`\nTransacoes a REMOVER:`);
                cache.historico_transacoes.forEach(t => {
                    console.log(`  - R${t.rodada}: posicao=${t.posicao}, bonusOnus=${t.bonusOnus}, saldo=${t.saldo}`);
                });
            }

            if (!isDryRun) {
                // Resetar para estado limpo (pre-temporada)
                await collection.updateOne(
                    { _id: cache._id },
                    {
                        $set: {
                            historico_transacoes: [],
                            ultima_rodada_consolidada: 0,
                            saldo_consolidado: 0,
                            ganhos_consolidados: 0,
                            perdas_consolidadas: 0,
                            versao_calculo: '8.5.0-fix-rodada-fantasma',
                            data_ultima_atualizacao: new Date(),
                            metadados: {
                                versaoCalculo: '1.0.0',
                                timestampCalculo: new Date(),
                                motivoRecalculo: 'fix-rodada-fantasma',
                                versaoAnterior: cache.versao_calculo,
                                saldoAnterior: cache.saldo_consolidado,
                            }
                        }
                    }
                );
                console.log(`\nCORRIGIDO: Cache resetado para estado limpo`);
                corrigidos++;
            } else {
                console.log(`\n[DRY-RUN] Seria corrigido`);
            }
        }

        console.log(`\n========================================`);
        console.log(`RESUMO:`);
        console.log(`  - Caches analisados: ${cachesComProblema.length}`);
        console.log(`  - Caches corrigidos: ${isDryRun ? '0 (dry-run)' : corrigidos}`);
        console.log(`  - Modo: ${isDryRun ? 'SIMULACAO' : 'EXECUTADO'}`);
        console.log(`========================================\n`);

        if (isDryRun && cachesComProblema.length > 0) {
            console.log('Para executar de verdade, rode:');
            console.log('  node scripts/fix-extrato-2026-rodada-fantasma.js --force\n');
        }

    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

corrigirExtratos2026();
