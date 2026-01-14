/**
 * Corrigir Caches 2025 - Liga Sobral
 *
 * Recalcula bonusOnus + Top10 para todos os participantes
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function corrigirCachesSobral() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const LIGA_SOBRAL_STR = '684d821cf1a7ae16d1f89572';
    const LIGA_SOBRAL_OID = new mongoose.Types.ObjectId(LIGA_SOBRAL_STR);

    // Buscar config da liga
    const liga = await db.collection('ligas').findOne({ _id: LIGA_SOBRAL_OID });

    if (!liga) {
        console.log('❌ Liga Sobral não encontrada!');
        process.exit(1);
    }

    console.log('='.repeat(80));
    console.log('CORREÇÃO DE CACHES 2025 - ' + liga.nome.toUpperCase());
    console.log('='.repeat(80));

    const valoresMito = liga.configuracoes?.top10?.valores_mito || {};
    const valoresMico = liga.configuracoes?.top10?.valores_mico || {};
    const valorMito1 = valoresMito['1'] || 10;
    const valorMico1 = valoresMico['1'] || -10;
    const valoresBanco = liga.configuracoes?.ranking_rodada?.valores || {};

    console.log('Top10: MITO=' + valorMito1 + ', MICO=' + valorMico1);
    console.log('Posições do banco: ' + Object.keys(valoresBanco).length);

    // Buscar todos os participantes com rodadas
    const participantes = await db.collection('rodadas')
        .aggregate([
            { $match: { ligaId: LIGA_SOBRAL_OID, temporada: 2025 } },
            { $group: { _id: '$timeId', count: { $sum: 1 } } }
        ])
        .toArray();

    console.log('\nParticipantes com rodadas: ' + participantes.length + '\n');

    let corrigidos = 0;
    let erros = 0;
    const resultados = [];

    for (const p of participantes) {
        const timeId = p._id;

        try {
            // Buscar todas as rodadas do time
            const rodadas = await db.collection('rodadas')
                .find({ timeId: timeId, temporada: 2025, ligaId: LIGA_SOBRAL_OID })
                .sort({ rodada: 1 })
                .toArray();

            if (rodadas.length === 0) continue;

            // Buscar nome do time
            const time = await db.collection('times').findOne({ id: timeId });
            const nomeTime = time?.nome_time || time?.nome_cartola || 'Time ' + timeId;

            // Reconstruir histórico completo
            const historicoTransacoes = [];
            let saldoAcumulado = 0;
            let totalMitos = 0;
            let totalMicos = 0;

            for (const rodada of rodadas) {
                // Buscar todos os participantes da mesma rodada para calcular posição
                const todosNaRodada = await db.collection('rodadas')
                    .find({ ligaId: LIGA_SOBRAL_OID, rodada: rodada.rodada, temporada: 2025 })
                    .sort({ pontos: -1 })
                    .toArray();

                const posicao = todosNaRodada.findIndex(r => r.timeId === timeId) + 1;
                const totalTimes = todosNaRodada.length;

                // Calcular bonusOnus baseado na posição
                const bonusOnus = valoresBanco[posicao] || 0;

                // Verificar se é mito/mico
                const isMito = posicao === 1;
                const isMico = posicao === totalTimes;

                // Calcular Top10
                let top10 = 0;
                let top10Status = null;
                let top10Posicao = null;

                if (isMito) {
                    top10 = valorMito1;
                    top10Status = 'MITO';
                    top10Posicao = 1;
                    totalMitos++;
                } else if (isMico) {
                    top10 = valorMico1;
                    top10Status = 'MICO';
                    top10Posicao = totalTimes;
                    totalMicos++;
                }

                // Calcular saldo da rodada
                const saldo = bonusOnus + top10;
                saldoAcumulado += saldo;

                historicoTransacoes.push({
                    rodada: rodada.rodada,
                    posicao: posicao,
                    totalTimes: totalTimes,
                    bonusOnus: bonusOnus,
                    pontosCorridos: 0,
                    mataMata: 0,
                    top10: top10,
                    saldo: saldo,
                    saldoAcumulado: saldoAcumulado,
                    isMito: isMito,
                    isMico: isMico,
                    top10Status: top10Status,
                    top10Posicao: top10Posicao
                });
            }

            const saldoConsolidado = saldoAcumulado;

            // Atualizar o cache
            const result = await db.collection('extratofinanceirocaches').updateOne(
                { time_id: timeId, liga_id: LIGA_SOBRAL_STR, temporada: 2025 },
                {
                    $set: {
                        historico_transacoes: historicoTransacoes,
                        saldo_consolidado: saldoConsolidado,
                        ultima_rodada_calculada: rodadas[rodadas.length - 1].rodada,
                        atualizado_em: new Date(),
                        corrigido_auditoria: true,
                        versao_correcao: '2025-01-14-top10-fix'
                    }
                },
                { upsert: true }
            );

            const status = result.modifiedCount > 0 || result.upsertedCount > 0 ? '✅' : '⚠️';
            const nomeFormatado = nomeTime.substring(0, 25).padEnd(25);
            console.log(status + ' ' + nomeFormatado + ' | R' + rodadas.length + ' | ' + totalMitos + 'M/' + totalMicos + 'm | Saldo: R$' + saldoConsolidado);

            resultados.push({
                timeId,
                nomeTime,
                rodadas: rodadas.length,
                mitos: totalMitos,
                micos: totalMicos,
                saldo: saldoConsolidado
            });

            corrigidos++;
        } catch (error) {
            console.log('❌ Erro time ' + timeId + ': ' + error.message);
            erros++;
        }
    }

    // Resumo final
    console.log('\n' + '='.repeat(80));
    console.log('RESUMO DA CORREÇÃO');
    console.log('='.repeat(80));
    console.log('✅ Caches corrigidos: ' + corrigidos);
    console.log('❌ Erros: ' + erros);

    // Ordenar por saldo
    resultados.sort((a, b) => b.saldo - a.saldo);

    console.log('\n📊 SALDOS FINAIS (apenas rodadas + Top10):');
    resultados.forEach((r, i) => {
        const status = r.saldo >= 0 ? '📈' : '📉';
        console.log('   ' + status + ' ' + r.nomeTime + ': R$' + r.saldo);
    });

    await mongoose.disconnect();
}

corrigirCachesSobral();
