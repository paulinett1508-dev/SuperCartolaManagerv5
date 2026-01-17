/**
 * Script: Fix All 2026 Renewals with Credit Bug
 *
 * BUG: Quando pagouInscricao=true com credor, o codigo antigo nao transferia
 * o credito restante apos pagar a taxa.
 *
 * LOGICA CORRETA:
 * - Se pagou com credito e credito > taxa: saldoTransferido = credito - taxa
 * - Se pagou com credito e credito <= taxa: saldoTransferido = 0 (credito usado integralmente)
 *
 * EXCECOES (nao processar):
 * - status = nao_participa (nao renovaram, credito fica em 2025)
 * - ja tem fix_aplicado (ja foi corrigido)
 *
 * USO:
 *   node scripts/fix-renovacoes-credito-2026.js --dry-run  # Simula
 *   node scripts/fix-renovacoes-credito-2026.js --force    # Executa
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de';
const TEMPORADA = 2026;
const TAXA_PADRAO = 180;

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    if (!isDryRun && !isForce) {
        console.error('ERRO: Use --dry-run para simular ou --force para executar');
        process.exit(1);
    }

    console.log('============================================');
    console.log(`FIX: Renovacoes 2026 com bug de credito (${isDryRun ? 'DRY-RUN' : 'EXECUCAO REAL'})`);
    console.log('============================================');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado ao MongoDB');

        const db = mongoose.connection.db;
        const agora = new Date();
        // NOTA: liga_id deve ser String (toLigaId retorna String no controller)
        const ligaIdStr = String(LIGA_ID);

        // Buscar inscricoes afetadas:
        // - pagou_inscricao = true
        // - saldo_transferido = 0
        // - temporada_anterior.status_quitacao = credor
        // - temporada_anterior.saldo_final > taxa (tinha credito restante)
        // - status = renovado (excluir nao_participa)
        // - sem fix_aplicado (nao ja corrigido)
        const afetados = await db.collection('inscricoestemporada').find({
            temporada: TEMPORADA,
            pagou_inscricao: true,
            saldo_transferido: 0,
            'temporada_anterior.status_quitacao': 'credor',
            status: 'renovado',
            fix_aplicado: { $exists: false }
        }).toArray();

        // Filtrar apenas os que tem credito > taxa (teriam saldo restante)
        const precisamFix = afetados.filter(i => {
            const credito = i.temporada_anterior?.saldo_final || 0;
            const taxa = i.taxa_inscricao || TAXA_PADRAO;
            return credito > taxa;
        });

        console.log(`\nTotal inscricoes analisadas: ${afetados.length}`);
        console.log(`Precisam de fix (credito > taxa): ${precisamFix.length}`);
        console.log('--------------------------------------------');

        if (precisamFix.length === 0) {
            console.log('\nNenhum participante precisa de correcao!');
            process.exit(0);
        }

        let fixados = 0;
        for (const inscricao of precisamFix) {
            const credito = inscricao.temporada_anterior.saldo_final;
            const taxa = inscricao.taxa_inscricao || TAXA_PADRAO;
            const saldoRestante = credito - taxa;
            const nome = inscricao.dados_participante?.nome_cartoleiro || inscricao.time_id;

            console.log(`\n[${fixados + 1}/${precisamFix.length}] ${nome} (time_id: ${inscricao.time_id})`);
            console.log(`  Credito 2025: R$ ${credito.toFixed(2)}`);
            console.log(`  Taxa: R$ ${taxa.toFixed(2)}`);
            console.log(`  Saldo restante: R$ ${saldoRestante.toFixed(2)}`);

            if (isDryRun) {
                console.log(`  [DRY-RUN] Seria corrigido: saldo_transferido = ${saldoRestante}`);
                fixados++;
                continue;
            }

            // Atualizar inscricao
            const transacaoSaldo = {
                tipo: 'SALDO_TEMPORADA_ANTERIOR',
                valor: saldoRestante,
                ref_id: `saldo_anterior_${LIGA_ID}_${inscricao.time_id}_${TEMPORADA}`,
                data: agora
            };

            await db.collection('inscricoestemporada').updateOne(
                { _id: inscricao._id },
                {
                    $set: {
                        saldo_transferido: saldoRestante,
                        saldo_inicial_temporada: saldoRestante,
                        transacoes_criadas: [transacaoSaldo],
                        atualizado_em: agora,
                        fix_aplicado: {
                            versao: 'fix-renovacoes-credito-2026',
                            data: agora,
                            valores_anteriores: {
                                saldo_transferido: inscricao.saldo_transferido,
                                saldo_inicial_temporada: inscricao.saldo_inicial_temporada
                            }
                        }
                    }
                }
            );

            // Criar/atualizar extrato 2026
            const extrato2026 = await db.collection('extratofinanceirocaches').findOne({
                time_id: inscricao.time_id,
                temporada: TEMPORADA
            });

            const transacaoExtrato = {
                rodada: 0,
                tipo: 'SALDO_TEMPORADA_ANTERIOR',
                valor: saldoRestante,
                descricao: `Credito aproveitado da temporada ${TEMPORADA - 1}`,
                data: agora
            };

            if (extrato2026) {
                await db.collection('extratofinanceirocaches').updateOne(
                    { _id: extrato2026._id },
                    {
                        $set: { saldo_consolidado: saldoRestante, atualizado_em: agora },
                        $push: { historico_transacoes: transacaoExtrato }
                    }
                );
            } else {
                await db.collection('extratofinanceirocaches').insertOne({
                    liga_id: ligaIdStr,
                    time_id: inscricao.time_id,
                    temporada: TEMPORADA,
                    saldo_consolidado: saldoRestante,
                    ganhos_consolidados: saldoRestante,
                    perdas_consolidadas: 0,
                    ultima_rodada_consolidada: 0,
                    historico_transacoes: [transacaoExtrato],
                    criado_em: agora,
                    atualizado_em: agora,
                    versao_calculo: 'fix-renovacoes-credito-2026'
                });
            }

            console.log(`  [FIXADO] saldo_transferido = ${saldoRestante}, extrato criado/atualizado`);
            fixados++;
        }

        console.log('\n============================================');
        console.log(`RESUMO: ${fixados}/${precisamFix.length} participantes ${isDryRun ? 'seriam corrigidos' : 'corrigidos'}`);
        console.log('============================================');

    } catch (error) {
        console.error('\nERRO:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

main();
