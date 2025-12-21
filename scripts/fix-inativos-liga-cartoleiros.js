/**
 * Fix Participantes Inativos - Liga Cartoleiros
 *
 * Remove transações após rodada_desistencia
 * Recalcula saldos até a rodada de saída
 *
 * Regra: "corta-se todo acesso a vida dele (financeira, json e etc)
 * Informações históricas e consolidadas apenas até onde ele estava ativo"
 *
 * Estrutura do historico_transacoes:
 * - rodada: número da rodada
 * - saldo: valor da transação (positivo = ganho, negativo = perda)
 * - saldoAcumulado: saldo acumulado até esta transação
 * - bonusOnus, pontosCorridos, mataMata, top10: componentes
 */

import connectDB, { getDB } from '../config/database.js';

// IDs dos participantes inativos identificados
const INATIVOS = [
    { time_id: 50180257, nome: 'Hivisson' },
    { time_id: 49149388, nome: 'Junior Brasilino' }
];

async function fixInativosLigaCartoleiros() {
    console.log('=== Fix Participantes Inativos - Liga Cartoleiros ===\n');

    await connectDB();
    const db = getDB();

    try {
        for (const inativo of INATIVOS) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Participante: ${inativo.nome}`);
            console.log(`Time ID: ${inativo.time_id}`);
            console.log('='.repeat(60));

            // 1. Buscar dados do participante
            const time = await db.collection('times').findOne({
                $or: [{ id: inativo.time_id }, { id: String(inativo.time_id) }]
            });

            if (!time) {
                console.log('❌ Participante não encontrado na collection times');
                continue;
            }

            const rodadaLimite = time.rodada_desistencia;
            console.log(`Rodada Desistência: R${rodadaLimite}`);
            console.log(`Status ativo: ${time.ativo}`);

            if (!rodadaLimite) {
                console.log('❌ Sem rodada_desistencia definida');
                continue;
            }

            // 2. Buscar cache de extrato
            const cache = await db.collection('extratofinanceirocaches').findOne({
                $or: [{ time_id: inativo.time_id }, { time_id: String(inativo.time_id) }]
            });

            if (!cache) {
                console.log('❌ Cache não encontrado');
                continue;
            }

            const transacoes = cache.historico_transacoes || [];

            // 3. Separar transações válidas e inválidas
            const transacoesValidas = transacoes.filter(t => t.rodada <= rodadaLimite);
            const transacoesRemovidas = transacoes.filter(t => t.rodada > rodadaLimite);

            console.log(`\nTransações totais: ${transacoes.length}`);
            console.log(`Válidas (até R${rodadaLimite}): ${transacoesValidas.length}`);
            console.log(`A remover (após R${rodadaLimite}): ${transacoesRemovidas.length}`);

            if (transacoesRemovidas.length === 0) {
                console.log('✅ Nenhuma transação indevida');
                continue;
            }

            // Mostrar o que será removido
            console.log('\n📋 Transações a remover:');
            transacoesRemovidas.forEach(t => {
                const valor = t.saldo || 0;
                console.log(`   R${t.rodada}: saldo=${valor > 0 ? '+' : ''}${valor}`);
            });

            // 4. Recalcular saldoAcumulado nas transações válidas
            // Campo correto é 'saldo', não 'valor'
            let saldoAcumulado = 0;
            let ganhos = 0;
            let perdas = 0;

            transacoesValidas.forEach(t => {
                const valor = t.saldo || 0;
                saldoAcumulado += valor;
                t.saldoAcumulado = saldoAcumulado;
                if (valor > 0) ganhos += valor;
                else if (valor < 0) perdas += Math.abs(valor);
            });

            const saldoFinal = saldoAcumulado;

            console.log(`\n💰 Saldo original: ${cache.saldo_consolidado}`);
            console.log(`💰 Novo saldo (até R${rodadaLimite}): ${saldoFinal}`);
            console.log(`📊 Ganhos: +${ganhos} | Perdas: -${perdas}`);

            // 5. Atualizar cache
            const updateResult = await db.collection('extratofinanceirocaches').updateOne(
                { _id: cache._id },
                {
                    $set: {
                        historico_transacoes: transacoesValidas,
                        saldo_consolidado: saldoFinal,
                        ganhos_consolidados: ganhos,
                        perdas_consolidadas: perdas,
                        ultima_rodada_consolidada: rodadaLimite,
                        rodadas_imutaveis: Array.from({ length: rodadaLimite }, (_, i) => i + 1),
                        participante_inativo: true,
                        rodada_desistencia: rodadaLimite,
                        data_ultima_atualizacao: new Date(),
                        metadados: {
                            ...(cache.metadados || {}),
                            corrigido_em: new Date(),
                            transacoes_removidas: transacoesRemovidas.length,
                            motivo: `Participante desistiu na R${rodadaLimite}`
                        }
                    }
                }
            );

            if (updateResult.modifiedCount > 0) {
                console.log(`\n✅ Cache corrigido!`);
                console.log(`   - ${transacoesRemovidas.length} transações removidas`);
                console.log(`   - Saldo ajustado: ${cache.saldo_consolidado} → ${saldoFinal}`);
                console.log(`   - Última rodada: R${rodadaLimite}`);
            }
        }

        console.log('\n\n=== Correção Concluída ===');

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        process.exit(0);
    }
}

fixInativosLigaCartoleiros();
