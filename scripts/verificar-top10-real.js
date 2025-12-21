/**
 * Verificar saldos reais de Top10 no MongoDB
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const ligaId = '684d821cf1a7ae16d1f89572';

    console.log('=== SALDOS TOP10 REAIS NO MONGODB ===\n');

    // 1. Buscar de times_stats no último snapshot
    const snap = await db.collection('rodadasnapshots')
        .findOne({ liga_id: ligaId, rodada: 38 });

    const timesStats = snap?.dados_consolidados?.times_stats || [];

    console.log('=== TIMES_STATS (Snapshot R38) ===\n');
    console.log('| Time ID    | Saldo Total | G    | Z    |');
    console.log('|------------|-------------|------|------|');
    timesStats.forEach(t => {
        console.log(`| ${String(t.time_id).padEnd(10)} | ${String(t.saldo_total || 0).padStart(11)} | ${String(t.g || t.ganhos || 0).padStart(4)} | ${String(t.z || t.perdas || 0).padStart(4)} |`);
    });

    // 2. Buscar consolidação (ranking_top10)
    console.log('\n=== RANKING TOP10 CONSOLIDADO ===\n');

    const consolidacao = await db.collection('consolidacoes')
        .findOne({ liga_id: new mongoose.Types.ObjectId(ligaId) });

    if (consolidacao?.ranking_top10) {
        console.log('Ranking Top10:');
        consolidacao.ranking_top10.forEach((r, i) => {
            console.log(`  ${i + 1}. Time ${r.time_id}: mitos=${r.mitos || 0}, micos=${r.micos || 0}, saldo=${r.saldo_top10 || r.saldo || 0}`);
        });
    } else {
        console.log('Não encontrado ranking_top10 na consolidação');
    }

    // 3. Calcular Top10 somando todas as rodadas dos snapshots
    console.log('\n=== TOP10 CALCULADO (Soma de todas as rodadas) ===\n');

    const snapshots = await db.collection('rodadasnapshots')
        .find({ liga_id: ligaId })
        .sort({ rodada: 1 })
        .toArray();

    const top10PorTime = {};

    for (const s of snapshots) {
        const top10 = s.dados_consolidados?.top10 || {};
        const mitos = top10.mitos || [];
        const micos = top10.micos || [];

        mitos.forEach(m => {
            if (!top10PorTime[m.time_id]) {
                top10PorTime[m.time_id] = { mitos: 0, micos: 0, saldo: 0, qtdMitos: 0, qtdMicos: 0 };
            }
            top10PorTime[m.time_id].mitos += m.premio || 0;
            top10PorTime[m.time_id].saldo += m.premio || 0;
            top10PorTime[m.time_id].qtdMitos++;
        });

        micos.forEach(m => {
            if (!top10PorTime[m.time_id]) {
                top10PorTime[m.time_id] = { mitos: 0, micos: 0, saldo: 0, qtdMitos: 0, qtdMicos: 0 };
            }
            top10PorTime[m.time_id].micos += m.multa || 0;
            top10PorTime[m.time_id].saldo += m.multa || 0;
            top10PorTime[m.time_id].qtdMicos++;
        });
    }

    // Buscar nomes
    const liga = await db.collection('ligas').findOne({ _id: new mongoose.Types.ObjectId(ligaId) });
    const participantes = liga.participantes || [];

    console.log('| Time                      | Mitos | Micos | Saldo Top10 |');
    console.log('|---------------------------|-------|-------|-------------|');

    for (const p of participantes) {
        const timeId = p.time_id;
        const nome = (p.nome_time || 'Sem nome').substring(0, 25).padEnd(25);
        const dados = top10PorTime[timeId] || { mitos: 0, micos: 0, saldo: 0, qtdMitos: 0, qtdMicos: 0 };

        console.log(`| ${nome} | ${String(dados.qtdMitos).padStart(5)} | ${String(dados.qtdMicos).padStart(5)} | ${String(dados.saldo).padStart(11)} |`);
    }

    // 4. Comparar com o que salvamos no cache
    console.log('\n=== COMPARAÇÃO: CACHE vs REAL ===\n');

    const caches = await db.collection('extratofinanceirocaches')
        .find({ liga_id: new mongoose.Types.ObjectId(ligaId) })
        .toArray();

    console.log('| Time                      | Top10 Cache | Top10 Real | Diferença |');
    console.log('|---------------------------|-------------|------------|-----------|');

    for (const p of participantes) {
        const timeId = p.time_id;
        const nome = (p.nome_time || 'Sem nome').substring(0, 25).padEnd(25);

        const cache = caches.find(c => c.time_id === timeId);
        const hist = cache?.historico_transacoes || [];
        const top10Cache = hist.reduce((sum, r) => sum + (parseFloat(r.top10) || 0), 0);

        const dadosReal = top10PorTime[timeId] || { saldo: 0 };
        const top10Real = dadosReal.saldo;

        const diff = top10Cache - top10Real;
        const status = diff === 0 ? '✅' : '❌';

        console.log(`| ${nome} | ${String(top10Cache).padStart(11)} | ${String(top10Real).padStart(10)} | ${status} ${String(diff).padStart(7)} |`);
    }

    await mongoose.disconnect();
}

main().catch(console.error);
