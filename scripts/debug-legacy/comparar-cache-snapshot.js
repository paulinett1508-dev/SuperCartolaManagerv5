/**
 * Comparar cache vs snapshot para entender diferença
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const ligaIdObj = new mongoose.Types.ObjectId('684d821cf1a7ae16d1f89572');
    const ligaIdStr = '684d821cf1a7ae16d1f89572';

    // Time que TEM cache correto
    const timeComCache = 49149009; // Matheus Coutinho

    console.log('=== COMPARANDO CACHE vs SNAPSHOT ===\n');
    console.log('Time:', timeComCache, '(Matheus Coutinho)\n');

    // 1. Buscar cache
    const cache = await db.collection('extratofinanceirocaches')
        .findOne({ liga_id: ligaIdObj, time_id: timeComCache });

    if (cache) {
        const hist = cache.historico_transacoes || [];
        console.log('CACHE:');
        console.log('  Rodadas:', hist.length);

        // Somar por categoria
        let banco = 0, top10 = 0, pc = 0, mm = 0;
        hist.forEach(r => {
            banco += parseFloat(r.bonusOnus) || 0;
            top10 += parseFloat(r.top10) || 0;
            pc += parseFloat(r.pontosCorridos) || 0;
            mm += parseFloat(r.mataMata) || 0;
        });

        console.log('  Banco (bonusOnus):', banco.toFixed(2));
        console.log('  Top10:', top10.toFixed(2));
        console.log('  Pontos Corridos:', pc.toFixed(2));
        console.log('  Mata-Mata:', mm.toFixed(2));
        console.log('  saldo_consolidado:', cache.saldo_consolidado);

        // Mostrar primeiras 3 rodadas
        console.log('\n  Primeiras 3 rodadas:');
        hist.slice(0, 3).forEach(r => {
            console.log(`    R${r.rodada}: bonusOnus=${r.bonusOnus} top10=${r.top10} pos=${r.posicao}`);
        });
    } else {
        console.log('CACHE: NÃO ENCONTRADO');
    }

    // 2. Buscar snapshot
    const snap = await db.collection('rodadasnapshots')
        .findOne({ liga_id: ligaIdStr, rodada: 38 });

    const extratos = snap?.dados_consolidados?.extratos_financeiros || [];
    const extrato = extratos.find(e => e.time_id === timeComCache);

    if (extrato) {
        const trans = extrato.transacoes || [];
        console.log('\nSNAPSHOT:');
        console.log('  Transações:', trans.length);

        // Agrupar por tipo
        const porTipo = {};
        trans.forEach(t => {
            const tipo = t.tipo || 'undefined';
            if (!porTipo[tipo]) porTipo[tipo] = { count: 0, total: 0 };
            porTipo[tipo].count++;
            porTipo[tipo].total += parseFloat(t.valor) || 0;
        });

        Object.entries(porTipo).forEach(([tipo, info]) => {
            console.log(`  ${tipo}: ${info.count}x, total=${info.total.toFixed(2)}`);
        });

        console.log('  saldo_acumulado:', extrato.saldo_acumulado);
    } else {
        console.log('\nSNAPSHOT: NÃO ENCONTRADO');
    }

    // 3. Verificar se tem dados na collection rodadas
    const rodadas = await db.collection('rodadas')
        .find({ timeId: timeComCache, ligaId: ligaIdStr })
        .toArray();

    console.log('\nCOLLECTION RODADAS:');
    console.log('  Total:', rodadas.length);

    await mongoose.disconnect();
}

main().catch(console.error);
