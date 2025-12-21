/**
 * Analisar estrutura dos snapshots da liga Sobral
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RodadaSnapshot from '../models/RodadaSnapshot.js';

dotenv.config();

const LIGA_SOBRAL_ID = '684d821cf1a7ae16d1f89572';

async function analisar() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);

    console.log('=== ANÁLISE DE SNAPSHOTS - Liga Sobral ===\n');

    // Buscar um snapshot
    const snapshot = await RodadaSnapshot.findOne({ liga_id: LIGA_SOBRAL_ID, rodada: 38 }).lean();

    if (!snapshot) {
        console.log('Snapshot não encontrado!');
        await mongoose.disconnect();
        return;
    }

    console.log('Rodada:', snapshot.rodada);
    console.log('Status:', snapshot.status);
    console.log('Data consolidação:', snapshot.data_consolidacao);
    console.log('\nChaves em dados_consolidados:', Object.keys(snapshot.dados_consolidados || {}));

    const dados = snapshot.dados_consolidados || {};

    console.log('\n--- RANKING GERAL ---');
    console.log('Itens:', dados.ranking_geral?.length || 0);
    if (dados.ranking_geral?.[0]) {
        console.log('Sample:', JSON.stringify(dados.ranking_geral[0], null, 2));
    }

    console.log('\n--- RANKING RODADA ---');
    console.log('Itens:', dados.ranking_rodada?.length || 0);
    if (dados.ranking_rodada?.[0]) {
        console.log('Sample:', JSON.stringify(dados.ranking_rodada[0], null, 2));
    }

    console.log('\n--- TIMES STATS ---');
    console.log('Itens:', dados.times_stats?.length || 0);
    if (dados.times_stats?.[0]) {
        console.log('Sample:', JSON.stringify(dados.times_stats[0], null, 2));
    }

    console.log('\n--- EXTRATOS FINANCEIROS ---');
    console.log('Itens:', dados.extratos_financeiros?.length || 0);
    if (dados.extratos_financeiros?.[0]) {
        const sample = dados.extratos_financeiros[0];
        console.log('Sample (resumido):');
        console.log('  time_id:', sample.time_id);
        console.log('  saldo_consolidado:', sample.saldo_consolidado);
        console.log('  historico_transacoes:', sample.historico_transacoes?.length || 0);
        if (sample.historico_transacoes?.[0]) {
            console.log('  Primeira transação:', JSON.stringify(sample.historico_transacoes[0], null, 2));
        }
    }

    console.log('\n--- TOP10 ---');
    console.log('Mitos:', dados.top10?.mitos?.length || 0);
    console.log('Micos:', dados.top10?.micos?.length || 0);

    await mongoose.disconnect();
}

analisar().catch(console.error);
