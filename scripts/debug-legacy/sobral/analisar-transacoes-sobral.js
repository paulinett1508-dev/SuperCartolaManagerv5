/**
 * Analisar transações dos participantes da Liga Sobral
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const ligaIdStr = '684d821cf1a7ae16d1f89572';
    const timeId = 14747183; // Carlos Henrique

    const snap = await db.collection('rodadasnapshots')
        .findOne({ liga_id: ligaIdStr, rodada: 38 });

    const extratos = snap.dados_consolidados?.extratos_financeiros || [];
    const extrato = extratos.find(e => e.time_id === timeId);

    if (extrato?.transacoes) {
        // Agrupar por tipo
        const porTipo = {};
        extrato.transacoes.forEach(t => {
            if (!porTipo[t.tipo]) porTipo[t.tipo] = { count: 0, total: 0 };
            porTipo[t.tipo].count++;
            porTipo[t.tipo].total += parseFloat(t.valor) || 0;
        });

        console.log('=== TRANSAÇÕES POR TIPO (Carlos Henrique) ===\n');
        Object.entries(porTipo).forEach(([tipo, info]) => {
            console.log(`${tipo}: ${info.count}x, total=${info.total.toFixed(2)}`);
        });

        console.log('\nsaldo_acumulado no snapshot:', extrato.saldo_acumulado);

        // Calcular total
        const total = extrato.transacoes.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);
        console.log('Total calculado:', total.toFixed(2));
    }

    // Verificar TODOS os participantes
    console.log('\n=== RESUMO TODOS OS PARTICIPANTES ===\n');
    for (const ext of extratos) {
        const transacoes = ext.transacoes || [];
        const total = transacoes.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);

        // Contar tipos
        const tipos = {};
        transacoes.forEach(t => {
            tipos[t.tipo] = (tipos[t.tipo] || 0) + 1;
        });

        console.log(`Time ${ext.time_id}: ${transacoes.length} trans, total=${total.toFixed(2)}`);
        console.log(`  Tipos: ${JSON.stringify(tipos)}`);
    }

    await mongoose.disconnect();
}

main().catch(console.error);
