/**
 * Script: Adicionar transparencia ao extrato do Mauricio Wendel
 *
 * Problema: O extrato 2026 mostra apenas:
 *   SALDO_TEMPORADA_ANTERIOR: R$ 1.118,38 (valor liquido)
 *
 * Solucao: Mostrar a COMPOSICAO do saldo:
 *   CREDITO_TEMPORADA_ANTERIOR: +R$ 1.298,38
 *   INSCRICAO_PAGA:             -R$ 180,00
 *   ────────────────────────────────────────
 *   SALDO INICIAL:               R$ 1.118,38
 *
 * Uso:
 *   node scripts/fix-mauricio-transparencia.js --dry-run
 *   node scripts/fix-mauricio-transparencia.js --force
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TIME_ID = 5254799;
const TEMPORADA = 2026;
const CREDITO_2025 = 1298.38;
const TAXA_INSCRICAO = 180;
const SALDO_FINAL = CREDITO_2025 - TAXA_INSCRICAO; // 1118.38

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

if (!isDryRun && !isForce) {
    console.log('Uso: node scripts/fix-mauricio-transparencia.js [--dry-run | --force]');
    console.log('  --dry-run  Simula as alteracoes sem gravar');
    console.log('  --force    Executa as alteracoes');
    process.exit(1);
}

async function main() {
    console.log('='.repeat(60));
    console.log(`TRANSPARENCIA: Mauricio Wendel (time_id: ${TIME_ID})`);
    console.log(`Modo: ${isDryRun ? 'DRY-RUN (simulacao)' : 'FORCE (execucao real)'}`);
    console.log('='.repeat(60));

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

        const extrato = await db.collection('extratofinanceirocaches').findOne({
            time_id: TIME_ID,
            temporada: TEMPORADA
        });

        if (!extrato) {
            console.error('ERRO: Extrato 2026 nao encontrado');
            process.exit(1);
        }

        console.log('Extrato 2026:');
        console.log(`  saldo_consolidado: ${extrato.saldo_consolidado}`);
        console.log(`  transacoes: ${extrato.historico_transacoes?.length || 0}`);

        if (extrato.historico_transacoes) {
            extrato.historico_transacoes.forEach((t, i) => {
                console.log(`    [${i}] ${t.tipo}: ${t.valor}`);
            });
        }

        // 2. Criar novas transacoes com transparencia
        console.log('\n--- NOVAS TRANSACOES ---');

        const agora = new Date();
        const novasTransacoes = [
            {
                rodada: 0,
                tipo: 'CREDITO_TEMPORADA_ANTERIOR',
                valor: CREDITO_2025,
                descricao: `Credito herdado da temporada 2025`,
                data: agora
            },
            {
                rodada: 0,
                tipo: 'INSCRICAO_PAGA',
                valor: -TAXA_INSCRICAO,
                descricao: `Taxa de inscricao 2026 (PAGA com credito)`,
                data: agora
            }
        ];

        console.log('Transacoes a serem criadas:');
        novasTransacoes.forEach((t, i) => {
            const sinal = t.valor >= 0 ? '+' : '';
            console.log(`  [${i}] ${t.tipo}: ${sinal}R$ ${Math.abs(t.valor).toFixed(2)}`);
            console.log(`       "${t.descricao}"`);
        });

        console.log(`\nSaldo consolidado: R$ ${SALDO_FINAL.toFixed(2)}`);
        console.log(`Soma transacoes: R$ ${(CREDITO_2025 - TAXA_INSCRICAO).toFixed(2)}`);

        // 3. Aplicar correcao
        if (!isDryRun) {
            console.log('\n--- APLICANDO CORRECAO ---');

            await db.collection('extratofinanceirocaches').updateOne(
                { time_id: TIME_ID, temporada: TEMPORADA },
                {
                    $set: {
                        historico_transacoes: novasTransacoes,
                        saldo_consolidado: SALDO_FINAL,
                        versao_calculo: '2.0.0-transparencia'
                    }
                }
            );

            console.log('[OK] Extrato atualizado com transacoes detalhadas');

            // 4. Verificar resultado
            console.log('\n--- VERIFICACAO FINAL ---');

            const extratoFinal = await db.collection('extratofinanceirocaches').findOne({
                time_id: TIME_ID,
                temporada: TEMPORADA
            });

            console.log('Extrato 2026:');
            console.log(`  saldo_consolidado: ${extratoFinal.saldo_consolidado}`);
            console.log(`  transacoes: ${extratoFinal.historico_transacoes?.length || 0}`);

            if (extratoFinal.historico_transacoes) {
                extratoFinal.historico_transacoes.forEach((t, i) => {
                    const sinal = t.valor >= 0 ? '+' : '';
                    console.log(`    [${i}] ${t.tipo}: ${sinal}R$ ${Math.abs(t.valor).toFixed(2)}`);
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
