/**
 * Script para corrigir saldos duplicados no cache
 * Recalcula saldo_consolidado baseado nas transações do histórico
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const ExtratoSchema = new mongoose.Schema({
    liga_id: String,
    time_id: String,
    saldo_consolidado: Number,
    historico_transacoes: Array,
    ganhos_consolidados: Number,
    perdas_consolidadas: Number,
});

async function fixSaldos() {
    console.log('[FIX-SALDOS] Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);

    const ExtratoFinanceiroCache = mongoose.model('ExtratoFinanceiroCache', ExtratoSchema);

    // Buscar TODOS os caches de TODAS as ligas
    const caches = await ExtratoFinanceiroCache.find({});

    console.log(`[FIX-SALDOS] Verificando ${caches.length} caches...`);

    let corrigidos = 0;
    let somaPositivos = 0;
    let somaNegativos = 0;

    for (const cache of caches) {
        // Recalcular saldo baseado nas transações
        // O campo correto é 'saldo' (valor de cada rodada), não 'valor'
        const saldoCorreto = cache.historico_transacoes.reduce((acc, t) => acc + (t.saldo || 0), 0);
        const ganhos = cache.historico_transacoes.filter(t => t.saldo > 0).reduce((acc, t) => acc + t.saldo, 0);
        const perdas = cache.historico_transacoes.filter(t => t.saldo < 0).reduce((acc, t) => acc + t.saldo, 0);

        const diff = Math.abs(cache.saldo_consolidado - saldoCorreto);

        if (diff > 0.01) {
            console.log(`[FIX] Time ${cache.time_id}: ${cache.saldo_consolidado.toFixed(2)} -> ${saldoCorreto.toFixed(2)} (diff: ${diff.toFixed(2)})`);
            cache.saldo_consolidado = saldoCorreto;
            cache.ganhos_consolidados = ganhos;
            cache.perdas_consolidadas = perdas;
            await cache.save();
            corrigidos++;
        }

        // Somar para verificação final
        if (saldoCorreto > 0) {
            somaPositivos += saldoCorreto;
        } else {
            somaNegativos += Math.abs(saldoCorreto);
        }
    }

    console.log(`\n[FIX-SALDOS] ${corrigidos} caches corrigidos!`);
    console.log(`[FIX-SALDOS] Soma saldos positivos (credores): R$ ${somaPositivos.toFixed(2)}`);
    console.log(`[FIX-SALDOS] Soma saldos negativos (devedores): R$ ${somaNegativos.toFixed(2)}`);

    await mongoose.disconnect();
    console.log('[FIX-SALDOS] Concluído!');
}

fixSaldos().catch(err => {
    console.error('[FIX-SALDOS] Erro:', err);
    process.exit(1);
});
