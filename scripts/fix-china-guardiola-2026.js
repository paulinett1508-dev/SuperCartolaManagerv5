/**
 * Script: Fix China Guardiola 2026 Inscription Data
 *
 * BUG: Quando pagouInscricao=true, o codigo antigo nao transferia
 * o credito restante apos pagar a taxa.
 *
 * China Guardiola (time_id: 1097804):
 * - Credito 2025: 421.54
 * - Taxa inscricao: 180
 * - Pagou com credito: true
 * - Restante esperado: 421.54 - 180 = 241.54
 * - Armazenado: saldo_transferido=0, saldo_inicial=0 (BUG!)
 *
 * Este script corrige:
 * 1. inscricoestemporada: saldo_transferido, saldo_inicial_temporada, transacoes_criadas
 * 2. extratofinanceirocaches: cria/atualiza com saldo e transacao
 *
 * USO:
 *   node scripts/fix-china-guardiola-2026.js --dry-run  # Simula
 *   node scripts/fix-china-guardiola-2026.js --force    # Executa
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Dados do participante
const TIME_ID = 1097804;
const LIGA_ID = '684cb1c8af923da7c7df51de';
const TEMPORADA = 2026;

// Valores corretos (calculados manualmente)
const CREDITO_2025 = 421.54;
const TAXA_INSCRICAO = 180;
const SALDO_RESTANTE = CREDITO_2025 - TAXA_INSCRICAO; // 241.54

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    if (!isDryRun && !isForce) {
        console.error('ERRO: Use --dry-run para simular ou --force para executar');
        process.exit(1);
    }

    console.log('============================================');
    console.log(`FIX: China Guardiola 2026 (${isDryRun ? 'DRY-RUN' : 'EXECUCAO REAL'})`);
    console.log('============================================');
    console.log(`Time ID: ${TIME_ID}`);
    console.log(`Liga ID: ${LIGA_ID}`);
    console.log(`Temporada: ${TEMPORADA}`);
    console.log(`Credito 2025: R$ ${CREDITO_2025.toFixed(2)}`);
    console.log(`Taxa inscricao: R$ ${TAXA_INSCRICAO.toFixed(2)}`);
    console.log(`Saldo restante correto: R$ ${SALDO_RESTANTE.toFixed(2)}`);
    console.log('--------------------------------------------');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado ao MongoDB');

        const db = mongoose.connection.db;
        const agora = new Date();

        // 1. Verificar dados atuais
        const inscricao = await db.collection('inscricoestemporada').findOne({
            time_id: TIME_ID,
            temporada: TEMPORADA
        });

        if (!inscricao) {
            console.error('ERRO: Inscricao nao encontrada!');
            process.exit(1);
        }

        console.log('\n[ANTES] Inscricao:');
        console.log(`  - saldo_transferido: ${inscricao.saldo_transferido}`);
        console.log(`  - saldo_inicial_temporada: ${inscricao.saldo_inicial_temporada}`);
        console.log(`  - transacoes_criadas: ${JSON.stringify(inscricao.transacoes_criadas)}`);

        // 2. Verificar extrato 2026
        const extrato2026 = await db.collection('extratofinanceirocaches').findOne({
            time_id: TIME_ID,
            temporada: TEMPORADA
        });

        if (extrato2026) {
            console.log('\n[ANTES] Extrato 2026:');
            console.log(`  - saldo_consolidado: ${extrato2026.saldo_consolidado}`);
            console.log(`  - transacoes: ${extrato2026.historico_transacoes?.length || 0}`);
        } else {
            console.log('\n[ANTES] Extrato 2026: NAO EXISTE');
        }

        if (isDryRun) {
            console.log('\n[DRY-RUN] Operacoes que seriam executadas:');
            console.log('  1. Atualizar inscricoestemporada:');
            console.log(`     - saldo_transferido: 0 -> ${SALDO_RESTANTE}`);
            console.log(`     - saldo_inicial_temporada: 0 -> ${SALDO_RESTANTE}`);
            console.log(`     - transacoes_criadas: adicionar SALDO_TEMPORADA_ANTERIOR`);
            console.log('  2. Criar/atualizar extratofinanceirocaches:');
            console.log(`     - saldo_consolidado: ${SALDO_RESTANTE}`);
            console.log(`     - adicionar transacao SALDO_TEMPORADA_ANTERIOR: +${SALDO_RESTANTE}`);
            console.log('\n[DRY-RUN] Nenhuma alteracao foi feita. Use --force para executar.');
            process.exit(0);
        }

        // 3. Executar correcoes
        console.log('\n[EXECUTANDO] Corrigindo dados...');

        // 3a. Atualizar inscricao
        // NOTA: liga_id deve ser String (toLigaId retorna String no controller)
        const ligaIdStr = String(LIGA_ID);
        const transacaoSaldo = {
            tipo: 'SALDO_TEMPORADA_ANTERIOR',
            valor: SALDO_RESTANTE,
            ref_id: `saldo_anterior_${LIGA_ID}_${TIME_ID}_${TEMPORADA}`,
            data: agora
        };

        await db.collection('inscricoestemporada').updateOne(
            { time_id: TIME_ID, temporada: TEMPORADA },
            {
                $set: {
                    saldo_transferido: SALDO_RESTANTE,
                    saldo_inicial_temporada: SALDO_RESTANTE,
                    transacoes_criadas: [transacaoSaldo],
                    atualizado_em: agora,
                    fix_aplicado: {
                        versao: 'fix-china-guardiola-2026',
                        data: agora,
                        valores_anteriores: {
                            saldo_transferido: inscricao.saldo_transferido,
                            saldo_inicial_temporada: inscricao.saldo_inicial_temporada
                        }
                    }
                }
            }
        );
        console.log('  - Inscricao atualizada');

        // 3b. Criar/atualizar extrato 2026
        const transacaoExtrato = {
            rodada: 0,
            tipo: 'SALDO_TEMPORADA_ANTERIOR',
            valor: SALDO_RESTANTE,
            descricao: `Credito aproveitado da temporada ${TEMPORADA - 1}`,
            data: agora
        };

        if (extrato2026) {
            // Extrato existe - atualizar
            await db.collection('extratofinanceirocaches').updateOne(
                { time_id: TIME_ID, temporada: TEMPORADA },
                {
                    $set: {
                        saldo_consolidado: SALDO_RESTANTE,
                        atualizado_em: agora
                    },
                    $push: {
                        historico_transacoes: transacaoExtrato
                    }
                }
            );
            console.log('  - Extrato 2026 atualizado');
        } else {
            // Extrato nao existe - criar
            await db.collection('extratofinanceirocaches').insertOne({
                liga_id: ligaIdStr,
                time_id: TIME_ID,
                temporada: TEMPORADA,
                saldo_consolidado: SALDO_RESTANTE,
                ganhos_consolidados: SALDO_RESTANTE,
                perdas_consolidadas: 0,
                ultima_rodada_consolidada: 0,
                historico_transacoes: [transacaoExtrato],
                criado_em: agora,
                atualizado_em: agora,
                versao_calculo: 'fix-china-guardiola-2026'
            });
            console.log('  - Extrato 2026 criado');
        }

        // 4. Verificar resultado
        console.log('\n[DEPOIS] Verificando resultado...');

        const inscricaoFix = await db.collection('inscricoestemporada').findOne({
            time_id: TIME_ID,
            temporada: TEMPORADA
        });

        console.log('  Inscricao:');
        console.log(`    - saldo_transferido: ${inscricaoFix.saldo_transferido}`);
        console.log(`    - saldo_inicial_temporada: ${inscricaoFix.saldo_inicial_temporada}`);
        console.log(`    - transacoes_criadas: ${inscricaoFix.transacoes_criadas?.length || 0}`);

        const extratoFix = await db.collection('extratofinanceirocaches').findOne({
            time_id: TIME_ID,
            temporada: TEMPORADA
        });

        console.log('  Extrato 2026:');
        console.log(`    - saldo_consolidado: ${extratoFix.saldo_consolidado}`);
        console.log(`    - transacoes: ${extratoFix.historico_transacoes?.length || 0}`);

        console.log('\n============================================');
        console.log('FIX CONCLUIDO COM SUCESSO!');
        console.log('============================================');
        console.log('Verificar no app: Extrato 2026 do China Guardiola');
        console.log(`Saldo esperado: R$ ${SALDO_RESTANTE.toFixed(2)} (credor)`);

    } catch (error) {
        console.error('\nERRO:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

main();
