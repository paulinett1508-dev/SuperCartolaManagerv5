/**
 * Script: Corrigir inscricao do Mauricio Wendel
 *
 * Problema: Modal de inscricao criou contradicao:
 * - pagou_inscricao: false (taxa virou debito -180)
 * - saldo_transferido: 1298.38 (credito completo)
 *
 * Correcao: Refletir que inscricao foi PAGA com credito
 * - pagou_inscricao: true
 * - Remover transacao de debito separada
 * - Manter saldo = 1118.38 (credito - taxa)
 *
 * Uso:
 *   node scripts/fix-mauricio-wendel-inscricao.js --dry-run
 *   node scripts/fix-mauricio-wendel-inscricao.js --force
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TIME_ID = 5254799;
const TEMPORADA = 2026;
const LIGA_ID = '684cb1c8af923da7c7df51de';

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

if (!isDryRun && !isForce) {
    console.log('Uso: node scripts/fix-mauricio-wendel-inscricao.js [--dry-run | --force]');
    console.log('  --dry-run  Simula as alteracoes sem gravar');
    console.log('  --force    Executa as alteracoes');
    process.exit(1);
}

async function main() {
    console.log('='.repeat(60));
    console.log(`CORRECAO: Mauricio Wendel (time_id: ${TIME_ID})`);
    console.log(`Modo: ${isDryRun ? 'DRY-RUN (simulacao)' : 'FORCE (execucao real)'}`);
    console.log('='.repeat(60));

    // Conectar ao MongoDB
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('ERRO: MONGO_URI nao configurada');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Conectado ao MongoDB');

    const db = mongoose.connection.db;

    try {
        // 1. Buscar estado atual
        console.log('\n--- ESTADO ATUAL ---');

        const inscricao = await db.collection('inscricoestemporada').findOne({
            time_id: TIME_ID,
            temporada: TEMPORADA
        });

        const extrato = await db.collection('extratofinanceirocaches').findOne({
            time_id: TIME_ID,
            temporada: TEMPORADA
        });

        if (!inscricao) {
            console.error('ERRO: Inscricao nao encontrada');
            process.exit(1);
        }

        console.log('Inscricao:');
        console.log(`  status: ${inscricao.status}`);
        console.log(`  pagou_inscricao: ${inscricao.pagou_inscricao}`);
        console.log(`  saldo_transferido: ${inscricao.saldo_transferido}`);
        console.log(`  saldo_inicial_temporada: ${inscricao.saldo_inicial_temporada}`);
        console.log(`  taxa_inscricao: ${inscricao.taxa_inscricao}`);

        console.log('\nExtrato 2026:');
        console.log(`  saldo_consolidado: ${extrato?.saldo_consolidado}`);
        console.log(`  transacoes: ${extrato?.historico_transacoes?.length || 0}`);

        if (extrato?.historico_transacoes) {
            extrato.historico_transacoes.forEach((t, i) => {
                console.log(`    [${i}] ${t.tipo}: ${t.valor} - "${t.descricao?.substring(0, 50)}..."`);
            });
        }

        // 2. Calcular valores corretos
        const creditoOriginal = inscricao.temporada_anterior?.saldo_final || 1298.38;
        const taxa = inscricao.taxa_inscricao || 180;
        const saldoCorreto = creditoOriginal - taxa; // 1118.38

        console.log('\n--- CALCULOS ---');
        console.log(`Credito 2025: R$ ${creditoOriginal.toFixed(2)}`);
        console.log(`Taxa inscricao: R$ ${taxa.toFixed(2)}`);
        console.log(`Saldo correto 2026: R$ ${saldoCorreto.toFixed(2)}`);

        // 3. Aplicar correcoes
        console.log('\n--- CORRECOES ---');

        if (isDryRun) {
            console.log('[DRY-RUN] Correcoes que seriam aplicadas:');
        }

        // 3.1 Atualizar inscricaotemporada
        const updateInscricao = {
            $set: {
                pagou_inscricao: true,
                saldo_transferido: saldoCorreto,
                observacoes: `[CORRIGIDO ${new Date().toISOString()}] Inscricao paga com credito. Antes: taxa como debito separado.`
            }
        };

        console.log('\n[inscricoestemporada]');
        console.log(`  pagou_inscricao: ${inscricao.pagou_inscricao} -> true`);
        console.log(`  saldo_transferido: ${inscricao.saldo_transferido} -> ${saldoCorreto}`);

        if (!isDryRun) {
            await db.collection('inscricoestemporada').updateOne(
                { time_id: TIME_ID, temporada: TEMPORADA },
                updateInscricao
            );
            console.log('  [OK] Atualizado');
        }

        // 3.2 Atualizar extratofinanceirocaches
        console.log('\n[extratofinanceirocaches]');

        // Verificar se tem transacao de INSCRICAO_TEMPORADA para remover
        const temDebitoInscricao = extrato?.historico_transacoes?.some(t => t.tipo === 'INSCRICAO_TEMPORADA');

        if (temDebitoInscricao) {
            console.log('  Removendo transacao INSCRICAO_TEMPORADA (-180)');

            if (!isDryRun) {
                await db.collection('extratofinanceirocaches').updateOne(
                    { time_id: TIME_ID, temporada: TEMPORADA },
                    {
                        $pull: {
                            historico_transacoes: { tipo: 'INSCRICAO_TEMPORADA' }
                        }
                    }
                );
            }
        }

        // Atualizar transacao de SALDO_TEMPORADA_ANTERIOR
        console.log(`  Atualizando SALDO_TEMPORADA_ANTERIOR: ${creditoOriginal} -> ${saldoCorreto}`);
        console.log(`  Nova descricao: "Credito aproveitado da temporada 2025 (descontada taxa R$ ${taxa})"`);

        if (!isDryRun) {
            // Primeiro, buscar o documento atual para modificar
            const extratoAtual = await db.collection('extratofinanceirocaches').findOne({
                time_id: TIME_ID,
                temporada: TEMPORADA
            });

            if (extratoAtual?.historico_transacoes) {
                // Filtrar transacoes, remover INSCRICAO_TEMPORADA e atualizar SALDO_TEMPORADA_ANTERIOR
                const novasTransacoes = extratoAtual.historico_transacoes
                    .filter(t => t.tipo !== 'INSCRICAO_TEMPORADA')
                    .map(t => {
                        if (t.tipo === 'SALDO_TEMPORADA_ANTERIOR') {
                            return {
                                ...t,
                                valor: saldoCorreto,
                                descricao: `Credito aproveitado da temporada 2025 (descontada taxa R$ ${taxa})`
                            };
                        }
                        return t;
                    });

                await db.collection('extratofinanceirocaches').updateOne(
                    { time_id: TIME_ID, temporada: TEMPORADA },
                    {
                        $set: {
                            historico_transacoes: novasTransacoes,
                            saldo_consolidado: saldoCorreto
                        }
                    }
                );
            }
            console.log('  [OK] Atualizado');
        }

        // 4. Verificar resultado
        if (!isDryRun) {
            console.log('\n--- VERIFICACAO FINAL ---');

            const inscricaoFinal = await db.collection('inscricoestemporada').findOne({
                time_id: TIME_ID,
                temporada: TEMPORADA
            });

            const extratoFinal = await db.collection('extratofinanceirocaches').findOne({
                time_id: TIME_ID,
                temporada: TEMPORADA
            });

            console.log('Inscricao:');
            console.log(`  pagou_inscricao: ${inscricaoFinal.pagou_inscricao}`);
            console.log(`  saldo_transferido: ${inscricaoFinal.saldo_transferido}`);

            console.log('\nExtrato 2026:');
            console.log(`  saldo_consolidado: ${extratoFinal?.saldo_consolidado}`);
            console.log(`  transacoes: ${extratoFinal?.historico_transacoes?.length || 0}`);

            if (extratoFinal?.historico_transacoes) {
                extratoFinal.historico_transacoes.forEach((t, i) => {
                    console.log(`    [${i}] ${t.tipo}: ${t.valor}`);
                });
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(isDryRun ? 'DRY-RUN completo. Use --force para executar.' : 'CORRECAO CONCLUIDA!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('ERRO:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

main();
