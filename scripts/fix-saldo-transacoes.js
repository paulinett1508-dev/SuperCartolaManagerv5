/**
 * FIX-SALDO-TRANSACOES.js - Corrige campo t.saldo em transações
 *
 * Problema: t.saldo está armazenando saldoAcumulado ao invés do saldo individual
 * Solução: Recalcular t.saldo = bonusOnus + pontosCorridos + mataMata + top10
 *
 * Uso:
 *   node scripts/fix-saldo-transacoes.js --dry-run
 *   node scripts/fix-saldo-transacoes.js --force
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de';

async function main() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--force');

    console.log('🔧 FIX-SALDO-TRANSACOES');
    console.log('========================');
    console.log(`Modo: ${dryRun ? 'DRY-RUN' : 'EXECUÇÃO REAL'}\n`);

    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        const ObjectId = mongoose.Types.ObjectId;

        // Buscar todos os caches da liga
        const caches = await db.collection('extratofinanceirocaches').find({
            liga_id: new ObjectId(LIGA_ID)
        }).toArray();

        console.log(`Total de caches: ${caches.length}\n`);

        let totalCorrigidos = 0;
        let totalTransacoesFixadas = 0;

        for (const cache of caches) {
            const transacoes = cache.historico_transacoes || [];
            if (transacoes.length === 0) continue;

            let precisaCorrecao = false;
            let transacoesErradas = 0;

            // Verificar se precisa correção
            for (const t of transacoes) {
                const saldoEsperado = (parseFloat(t.bonusOnus) || 0) +
                                      (parseFloat(t.pontosCorridos) || 0) +
                                      (parseFloat(t.mataMata) || 0) +
                                      (parseFloat(t.top10) || 0);
                const saldoAtual = parseFloat(t.saldo) || 0;

                if (Math.abs(saldoEsperado - saldoAtual) > 0.01) {
                    precisaCorrecao = true;
                    transacoesErradas++;
                }
            }

            if (!precisaCorrecao) {
                console.log(`✅ Time ${cache.time_id}: OK`);
                continue;
            }

            console.log(`🔧 Time ${cache.time_id}: ${transacoesErradas} transações para corrigir`);

            if (dryRun) {
                totalCorrigidos++;
                totalTransacoesFixadas += transacoesErradas;
                continue;
            }

            // Corrigir transações
            const transacoesCorrigidas = transacoes.map(t => {
                const saldoCorreto = (parseFloat(t.bonusOnus) || 0) +
                                     (parseFloat(t.pontosCorridos) || 0) +
                                     (parseFloat(t.mataMata) || 0) +
                                     (parseFloat(t.top10) || 0);
                return { ...t, saldo: saldoCorreto };
            });

            // Recalcular saldoAcumulado
            transacoesCorrigidas.sort((a, b) => a.rodada - b.rodada);
            let acumulado = 0;
            transacoesCorrigidas.forEach(t => {
                acumulado += t.saldo;
                t.saldoAcumulado = acumulado;
            });

            // Recalcular saldo_consolidado
            const novoSaldoConsolidado = transacoesCorrigidas.reduce((acc, t) => acc + t.saldo, 0);

            // Atualizar no banco
            await db.collection('extratofinanceirocaches').updateOne(
                { _id: cache._id },
                {
                    $set: {
                        historico_transacoes: transacoesCorrigidas,
                        saldo_consolidado: novoSaldoConsolidado,
                        updatedAt: new Date(),
                        'metadados.fix_saldo_transacoes': new Date()
                    }
                }
            );

            console.log(`   ✅ Corrigido: saldo_consolidado = ${novoSaldoConsolidado.toFixed(2)}`);
            totalCorrigidos++;
            totalTransacoesFixadas += transacoesErradas;
        }

        console.log('\n📋 RESUMO:');
        console.log(`   Caches corrigidos: ${totalCorrigidos}`);
        console.log(`   Transações fixadas: ${totalTransacoesFixadas}`);
        console.log(`   Modo: ${dryRun ? 'DRY-RUN' : 'EXECUTADO'}`);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Desconectado');
    }
}

main();
