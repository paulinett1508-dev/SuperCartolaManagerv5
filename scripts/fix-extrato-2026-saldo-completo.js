/**
 * Script: Fix Extrato 2026 - Saldo Completo
 *
 * PROBLEMA 1: Acertos não refletidos no cache
 * - Participante tem acerto (pagamento) registrado
 * - Cache não inclui esse valor no saldo_consolidado
 * - Exemplo: Antonio Luis - cache mostra -180, deveria ser -120
 *
 * PROBLEMA 2: Cache não criado para quem pagou com crédito
 * - pagouInscricao=true com crédito > taxa
 * - saldo transferido existe, mas cache não foi criado
 * - Exemplo: Cássio Marques - deveria ter cache com 163.38
 *
 * USO:
 *   node scripts/fix-extrato-2026-saldo-completo.js --dry-run  # Simula
 *   node scripts/fix-extrato-2026-saldo-completo.js --force    # Executa
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de';
const TEMPORADA = 2026;

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    if (!isDryRun && !isForce) {
        console.error('ERRO: Use --dry-run para simular ou --force para executar');
        process.exit(1);
    }

    console.log('============================================');
    console.log(`FIX: Saldo Completo 2026 (${isDryRun ? 'DRY-RUN' : 'EXECUCAO'})`);
    console.log('============================================');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado ao MongoDB\n');

        const db = mongoose.connection.db;
        const agora = new Date();
        const ligaIdObj = new mongoose.Types.ObjectId(LIGA_ID);

        // 1. Buscar todas as inscrições 2026 (renovados e novos)
        const inscricoes = await db.collection('inscricoestemporada').find({
            liga_id: ligaIdObj,
            temporada: TEMPORADA,
            status: { $in: ['renovado', 'novo'] }
        }).toArray();

        console.log(`Total de inscrições 2026: ${inscricoes.length}\n`);

        let corrigidos = 0;
        let semCorrecao = 0;
        let erros = 0;

        for (const inscricao of inscricoes) {
            const timeId = inscricao.time_id;
            const nome = inscricao.dados_participante?.nome_cartoleiro || `Time ${timeId}`;

            try {
                // 2. Buscar cache atual
                const cacheAtual = await db.collection('extratofinanceirocaches').findOne({
                    $or: [
                        { liga_id: String(LIGA_ID) },
                        { liga_id: ligaIdObj }
                    ],
                    time_id: Number(timeId),
                    temporada: TEMPORADA
                });

                // 3. Buscar acertos do participante
                const acertos = await db.collection('acertofinanceiros').find({
                    ligaId: String(LIGA_ID),
                    timeId: String(timeId),
                    temporada: TEMPORADA,
                    ativo: true
                }).toArray();

                // Calcular saldo de acertos (pagamento = +, recebimento = -)
                let saldoAcertos = 0;
                acertos.forEach(a => {
                    if (a.tipo === 'pagamento') saldoAcertos += a.valor || 0;
                    else if (a.tipo === 'recebimento') saldoAcertos -= a.valor || 0;
                });

                // 4. Calcular saldo esperado
                const taxa = inscricao.taxa_inscricao || 0;
                const pagouInscricao = inscricao.pagou_inscricao === true;
                const saldoTransferido = inscricao.saldo_transferido || 0;
                const saldoInicialTemporada = inscricao.saldo_inicial_temporada || 0;

                // Saldo do cache (lançamentos iniciais)
                // Se pagou com crédito: saldo = saldoInicialTemporada (restante após taxa)
                // Se não pagou: saldo = -taxa + saldoTransferido
                // NOTA: saldo_inicial_temporada já contém a lógica correta da inscrição
                const saldoLancamentosEsperado = saldoInicialTemporada;

                const saldoTotalEsperado = saldoLancamentosEsperado + saldoAcertos;

                // 5. Verificar se precisa correção
                const saldoCacheAtual = cacheAtual?.saldo_consolidado ?? null;
                const precisaCorrecao = !cacheAtual ||
                    Math.abs((saldoCacheAtual || 0) - saldoLancamentosEsperado) > 0.01;

                if (!precisaCorrecao) {
                    semCorrecao++;
                    continue;
                }

                console.log(`\n[${nome}] (time_id: ${timeId})`);
                console.log(`  pagouInscricao: ${pagouInscricao}`);
                console.log(`  taxa: ${taxa}, saldoTransferido: ${saldoTransferido}`);
                console.log(`  saldoInicialTemporada (inscricao): ${saldoInicialTemporada}`);
                console.log(`  acertos: ${acertos.length} registros, saldo: ${saldoAcertos.toFixed(2)}`);
                console.log(`  cache atual: ${saldoCacheAtual !== null ? saldoCacheAtual.toFixed(2) : 'INEXISTENTE'}`);
                console.log(`  saldo esperado (cache): ${saldoLancamentosEsperado.toFixed(2)}`);
                console.log(`  saldo total (com acertos): ${saldoTotalEsperado.toFixed(2)}`);

                if (isDryRun) {
                    console.log(`  [DRY-RUN] Seria corrigido`);
                    corrigidos++;
                    continue;
                }

                // 6. Criar/atualizar cache
                const transacoes = [];

                // Transação de inscrição (se não pagou)
                if (!pagouInscricao && taxa > 0) {
                    transacoes.push({
                        rodada: 0,
                        tipo: 'INSCRICAO_TEMPORADA',
                        valor: -taxa,
                        descricao: `Taxa de inscrição temporada ${TEMPORADA} (pendente)`,
                        data: agora
                    });
                }

                // Transação de saldo transferido (se houver)
                if (saldoTransferido !== 0) {
                    const descricaoSaldo = saldoTransferido > 0
                        ? `Crédito aproveitado da temporada ${TEMPORADA - 1}`
                        : `Dívida transferida da temporada ${TEMPORADA - 1}`;
                    transacoes.push({
                        rodada: 0,
                        tipo: 'SALDO_TEMPORADA_ANTERIOR',
                        valor: saldoTransferido,
                        descricao: descricaoSaldo,
                        data: agora
                    });
                }

                if (cacheAtual) {
                    // Atualizar cache existente
                    // Preservar transações existentes que não sejam de inscrição/saldo anterior
                    const transacoesExistentes = (cacheAtual.historico_transacoes || []).filter(t =>
                        t.tipo !== 'INSCRICAO_TEMPORADA' && t.tipo !== 'SALDO_TEMPORADA_ANTERIOR'
                    );

                    await db.collection('extratofinanceirocaches').updateOne(
                        { _id: cacheAtual._id },
                        {
                            $set: {
                                saldo_consolidado: saldoLancamentosEsperado,
                                historico_transacoes: [...transacoes, ...transacoesExistentes],
                                data_ultima_atualizacao: agora,
                                versao_calculo: '1.4.0-fix-saldo-completo',
                                'metadados.fix_aplicado': {
                                    versao: 'fix-extrato-2026-saldo-completo',
                                    data: agora,
                                    saldo_anterior: saldoCacheAtual,
                                    saldo_corrigido: saldoLancamentosEsperado
                                }
                            }
                        }
                    );
                    console.log(`  [ATUALIZADO] saldo_consolidado: ${saldoLancamentosEsperado.toFixed(2)}`);
                } else {
                    // Criar cache novo
                    await db.collection('extratofinanceirocaches').insertOne({
                        liga_id: ligaIdObj,
                        time_id: Number(timeId),
                        temporada: TEMPORADA,
                        saldo_consolidado: saldoLancamentosEsperado,
                        ganhos_consolidados: saldoTransferido > 0 ? saldoTransferido : 0,
                        perdas_consolidadas: pagouInscricao ? 0 : -taxa,
                        ultima_rodada_consolidada: 0,
                        historico_transacoes: transacoes,
                        criado_em: agora,
                        data_ultima_atualizacao: agora,
                        versao_calculo: '1.4.0-fix-saldo-completo'
                    });
                    console.log(`  [CRIADO] saldo_consolidado: ${saldoLancamentosEsperado.toFixed(2)}`);
                }

                corrigidos++;

            } catch (error) {
                console.error(`  [ERRO] ${nome}: ${error.message}`);
                erros++;
            }
        }

        console.log('\n============================================');
        console.log('RESUMO');
        console.log('============================================');
        console.log(`Total analisados: ${inscricoes.length}`);
        console.log(`Corrigidos: ${corrigidos}`);
        console.log(`Já corretos: ${semCorrecao}`);
        console.log(`Erros: ${erros}`);
        console.log('============================================');

        if (isDryRun) {
            console.log('\n[DRY-RUN] Nenhuma alteração foi feita. Use --force para executar.');
        }

    } catch (error) {
        console.error('ERRO FATAL:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

main();
