/**
 * Corrigir valores de Top10 nos caches da Liga Sobral
 *
 * Problema: O script anterior usou extratos_financeiros que tinha dados incorretos
 * Solução: Recalcular Top10 usando top10.mitos e top10.micos de cada snapshot
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '684d821cf1a7ae16d1f89572';
const LIGA_ID_OBJ = new mongoose.Types.ObjectId(LIGA_ID);

async function main() {
    const dryRun = process.argv.includes('--dry-run');

    if (dryRun) {
        console.log('🔍 MODO DRY-RUN: Nenhuma alteração será feita\n');
    }

    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('=== CORRIGIR TOP10 NOS CACHES - LIGA SOBRAL ===\n');

    // 1. Buscar todos os snapshots
    const snapshots = await db.collection('rodadasnapshots')
        .find({ liga_id: LIGA_ID })
        .sort({ rodada: 1 })
        .toArray();

    console.log(`Snapshots: ${snapshots.length}\n`);

    // 2. Construir mapa de Top10 por rodada e time
    // Estrutura: { timeId: { rodada: { isMito, isMico, valor } } }
    const top10PorTimeRodada = {};

    for (const snap of snapshots) {
        const rodada = snap.rodada;
        const top10 = snap.dados_consolidados?.top10 || {};
        const mitos = top10.mitos || [];
        const micos = top10.micos || [];

        // Processar mitos
        mitos.forEach(m => {
            if (!top10PorTimeRodada[m.time_id]) {
                top10PorTimeRodada[m.time_id] = {};
            }
            if (!top10PorTimeRodada[m.time_id][rodada]) {
                top10PorTimeRodada[m.time_id][rodada] = { isMito: false, isMico: false, valor: 0 };
            }
            top10PorTimeRodada[m.time_id][rodada].isMito = true;
            top10PorTimeRodada[m.time_id][rodada].valor += m.premio || 0;
        });

        // Processar micos
        micos.forEach(m => {
            if (!top10PorTimeRodada[m.time_id]) {
                top10PorTimeRodada[m.time_id] = {};
            }
            if (!top10PorTimeRodada[m.time_id][rodada]) {
                top10PorTimeRodada[m.time_id][rodada] = { isMito: false, isMico: false, valor: 0 };
            }
            top10PorTimeRodada[m.time_id][rodada].isMico = true;
            top10PorTimeRodada[m.time_id][rodada].valor += m.multa || 0; // multa já é negativo
        });
    }

    // 3. Buscar todos os caches e corrigir
    const caches = await db.collection('extratofinanceirocaches')
        .find({ liga_id: LIGA_ID_OBJ })
        .toArray();

    const liga = await db.collection('ligas').findOne({ _id: LIGA_ID_OBJ });
    const participantes = liga.participantes || [];

    console.log('Corrigindo caches...\n');

    for (const cache of caches) {
        const timeId = cache.time_id;
        const participante = participantes.find(p => p.time_id === timeId);
        const nomeTime = participante?.nome_time || `Time ${timeId}`;

        console.log(`🔄 ${nomeTime} (${timeId})`);

        const historicoAtualizado = [];
        let saldoAcumulado = 0;
        let totalTop10Antigo = 0;
        let totalTop10Novo = 0;

        for (const rodada of cache.historico_transacoes || []) {
            const numRodada = rodada.rodada;

            // Pegar Top10 correto
            const top10Info = top10PorTimeRodada[timeId]?.[numRodada] || { isMito: false, isMico: false, valor: 0 };
            const top10Novo = top10Info.valor;

            totalTop10Antigo += parseFloat(rodada.top10) || 0;
            totalTop10Novo += top10Novo;

            // Recalcular saldo
            const bonusOnus = parseFloat(rodada.bonusOnus) || 0;
            const saldo = bonusOnus + top10Novo;
            saldoAcumulado += saldo;

            historicoAtualizado.push({
                ...rodada,
                top10: top10Novo,
                isMito: top10Info.isMito,
                isMico: top10Info.isMico,
                top10Status: top10Info.isMito ? 'MITO' : (top10Info.isMico ? 'MICO' : null),
                saldo: saldo,
                saldoAcumulado: saldoAcumulado
            });
        }

        const saldoConsolidado = saldoAcumulado;

        console.log(`  Top10 antigo: ${totalTop10Antigo}, Top10 novo: ${totalTop10Novo}`);
        console.log(`  Saldo consolidado: ${saldoConsolidado}`);

        if (!dryRun) {
            await db.collection('extratofinanceirocaches').updateOne(
                { _id: cache._id },
                {
                    $set: {
                        historico_transacoes: historicoAtualizado,
                        saldo_consolidado: saldoConsolidado,
                        'metadados.motivoRecalculo': 'correcao_top10_v2',
                        'metadados.timestampCalculo': new Date()
                    }
                }
            );
            console.log('  ✅ Corrigido!');
        } else {
            console.log('  [DRY-RUN] Não salvo');
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(dryRun ? '🔍 DRY-RUN concluído' : '✅ Correção concluída!');

    await mongoose.disconnect();
}

main().catch(console.error);
