/**
 * Verificar se snapshots têm dados de ranking para recalcular bonusOnus
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const ligaIdStr = '684d821cf1a7ae16d1f89572';
    const timeId = 14747183; // Carlos Henrique

    console.log('=== VERIFICANDO RANKING NOS SNAPSHOTS ===\n');

    // Buscar alguns snapshots
    const snapshots = await db.collection('rodadasnapshots')
        .find({ liga_id: ligaIdStr })
        .sort({ rodada: 1 })
        .limit(5)
        .toArray();

    console.log('Snapshots encontrados:', snapshots.length);

    for (const snap of snapshots) {
        console.log(`\n--- Rodada ${snap.rodada} ---`);

        // Verificar ranking_rodada
        const rankingRodada = snap.dados_consolidados?.ranking_rodada || [];
        console.log('ranking_rodada:', rankingRodada.length, 'participantes');

        if (rankingRodada.length > 0) {
            // Buscar Carlos
            const carlos = rankingRodada.find(r => r.time_id === timeId);
            if (carlos) {
                console.log(`  Carlos: pos=${carlos.posicao || carlos.posicao_rodada}, pontos=${carlos.pontos_rodada || carlos.pontos}`);
            }

            // Mostrar estrutura
            console.log('  Exemplo:', JSON.stringify(rankingRodada[0]).substring(0, 200));
        }

        // Verificar ranking_geral
        const rankingGeral = snap.dados_consolidados?.ranking_geral || [];
        console.log('ranking_geral:', rankingGeral.length, 'participantes');

        // Verificar times_stats
        const timesStats = snap.dados_consolidados?.times_stats || [];
        console.log('times_stats:', timesStats.length, 'participantes');

        if (timesStats.length > 0) {
            const carlos = timesStats.find(t => t.time_id === timeId);
            if (carlos) {
                console.log(`  Carlos stats: saldo=${carlos.saldo_total}, g=${carlos.g || carlos.ganhos}, z=${carlos.z || carlos.perdas}`);
            }
        }
    }

    // Verificar liga config para valores de banco
    const liga = await db.collection('ligas').findOne({ _id: new mongoose.Types.ObjectId('684d821cf1a7ae16d1f89572') });
    console.log('\n=== CONFIG DO BANCO DA LIGA ===');
    console.log('Fase 1 (R1-29):', JSON.stringify(liga.configuracoes?.ranking_rodada?.fase1?.valores));
    console.log('Fase 2 (R30-38):', JSON.stringify(liga.configuracoes?.ranking_rodada?.fase2?.valores));

    await mongoose.disconnect();
}

main().catch(console.error);
