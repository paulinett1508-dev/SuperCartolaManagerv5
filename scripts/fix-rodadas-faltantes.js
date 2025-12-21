/**
 * FIX-RODADAS-FALTANTES.js - Adiciona rodadas faltantes ao cache
 *
 * Problema: Alguns participantes têm rodadas no banco (collection rodadas)
 *           que não foram incluídas no ExtratoFinanceiroCache
 *
 * Uso:
 *   node scripts/fix-rodadas-faltantes.js --dry-run
 *   node scripts/fix-rodadas-faltantes.js --force
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de';

async function main() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--force');

    console.log('🔧 FIX-RODADAS-FALTANTES');
    console.log('========================');
    console.log(`Modo: ${dryRun ? 'DRY-RUN' : 'EXECUÇÃO REAL'}\n`);

    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        const ObjectId = mongoose.Types.ObjectId;

        // Buscar liga e configurações
        const liga = await db.collection('ligas').findOne({ _id: new ObjectId(LIGA_ID) });
        if (!liga) {
            console.error('❌ Liga não encontrada');
            return;
        }

        const configRanking = liga.configuracoes?.ranking_rodada?.valores || {};
        console.log(`Liga: ${liga.nome}`);
        console.log(`Participantes: ${liga.participantes?.length || 0}\n`);

        let totalCorrigidos = 0;
        let totalRodadasAdicionadas = 0;

        for (const participante of (liga.participantes || [])) {
            const timeId = participante.time_id;
            const nome = participante.nome_cartola;

            // Buscar rodadas no DB (usando number porque é como está salvo)
            const timeIdNum = typeof timeId === 'number' ? timeId : parseInt(timeId, 10);

            const rodadasDB = await db.collection('rodadas').find({
                $or: [
                    { ligaId: LIGA_ID, timeId: timeIdNum },
                    { ligaId: new ObjectId(LIGA_ID), timeId: timeIdNum },
                    { ligaId: LIGA_ID, timeId: String(timeIdNum) },
                    { ligaId: new ObjectId(LIGA_ID), timeId: String(timeIdNum) }
                ]
            }).toArray();

            // Buscar cache existente
            const cache = await db.collection('extratofinanceirocaches').findOne({
                liga_id: new ObjectId(LIGA_ID),
                time_id: timeIdNum
            });

            if (!cache && rodadasDB.length === 0) continue;

            const rodadasNoDB = rodadasDB.map(r => r.rodada).sort((a, b) => a - b);
            const transacoesExistentes = cache?.historico_transacoes || [];
            const rodadasNoCache = transacoesExistentes.map(t => t.rodada);

            // Encontrar rodadas faltantes
            const faltantes = rodadasNoDB.filter(r => !rodadasNoCache.includes(r));

            if (faltantes.length === 0) continue;

            console.log(`🔧 ${nome} (${timeIdNum}): ${faltantes.length} rodadas faltantes`);
            console.log(`   Rodadas: ${faltantes.join(', ')}`);

            if (dryRun) {
                totalCorrigidos++;
                totalRodadasAdicionadas += faltantes.length;
                continue;
            }

            // Criar transações para rodadas faltantes
            const novasTransacoes = [];

            for (const rodadaNum of faltantes) {
                const rodadaData = rodadasDB.find(r => r.rodada === rodadaNum);
                if (!rodadaData) continue;

                // Buscar posição no ranking da rodada
                const todasRodadas = await db.collection('rodadas').find({
                    $or: [
                        { ligaId: LIGA_ID, rodada: rodadaNum },
                        { ligaId: new ObjectId(LIGA_ID), rodada: rodadaNum }
                    ]
                }).sort({ pontos: -1 }).toArray();

                const posicao = todasRodadas.findIndex(r =>
                    r.timeId === timeIdNum || r.timeId === String(timeIdNum)
                ) + 1;

                const bonusOnus = configRanking[posicao] || 0;

                // Criar transação
                const transacao = {
                    rodada: rodadaNum,
                    posicao: posicao,
                    bonusOnus: bonusOnus,
                    pontosCorridos: 0,
                    mataMata: 0,
                    top10: 0,
                    saldo: bonusOnus, // Será recalculado depois
                    isMito: false,
                    isMico: false
                };

                novasTransacoes.push(transacao);
                console.log(`   + R${rodadaNum}: pos=${posicao}, bonus=${bonusOnus}`);
            }

            // Mesclar com transações existentes
            const todasTransacoes = [...transacoesExistentes, ...novasTransacoes];
            todasTransacoes.sort((a, b) => a.rodada - b.rodada);

            // Recalcular saldoAcumulado
            let acumulado = 0;
            todasTransacoes.forEach(t => {
                // Recalcular saldo individual
                t.saldo = (parseFloat(t.bonusOnus) || 0) +
                          (parseFloat(t.pontosCorridos) || 0) +
                          (parseFloat(t.mataMata) || 0) +
                          (parseFloat(t.top10) || 0);
                acumulado += t.saldo;
                t.saldoAcumulado = acumulado;
            });

            const novoSaldoConsolidado = acumulado;
            const ultimaRodada = Math.max(...todasTransacoes.map(t => t.rodada));

            // Atualizar ou criar cache
            if (cache) {
                await db.collection('extratofinanceirocaches').updateOne(
                    { _id: cache._id },
                    {
                        $set: {
                            historico_transacoes: todasTransacoes,
                            saldo_consolidado: novoSaldoConsolidado,
                            ultima_rodada_consolidada: ultimaRodada,
                            updatedAt: new Date(),
                            'metadados.fix_rodadas_faltantes': new Date()
                        }
                    }
                );
            } else {
                await db.collection('extratofinanceirocaches').insertOne({
                    liga_id: new ObjectId(LIGA_ID),
                    time_id: timeIdNum,
                    historico_transacoes: todasTransacoes,
                    saldo_consolidado: novoSaldoConsolidado,
                    ultima_rodada_consolidada: ultimaRodada,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    metadados: {
                        fix_rodadas_faltantes: new Date(),
                        versaoCalculo: '3.5.1-fix-faltantes'
                    }
                });
            }

            console.log(`   ✅ Corrigido: ${todasTransacoes.length} rodadas, saldo=${novoSaldoConsolidado.toFixed(2)}`);
            totalCorrigidos++;
            totalRodadasAdicionadas += faltantes.length;
        }

        console.log('\n📋 RESUMO:');
        console.log(`   Participantes corrigidos: ${totalCorrigidos}`);
        console.log(`   Rodadas adicionadas: ${totalRodadasAdicionadas}`);
        console.log(`   Modo: ${dryRun ? 'DRY-RUN' : 'EXECUTADO'}`);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Desconectado');
    }
}

main();
