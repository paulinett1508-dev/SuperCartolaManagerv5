/**
 * Script para corrigir o campo 'saldo' de cada transação no histórico
 *
 * PROBLEMA IDENTIFICADO:
 * O campo 'saldo' de cada transação NÃO bate com a soma:
 * bonusOnus + pontosCorridos + mataMata + top10
 *
 * Este script recalcula o campo 'saldo' de cada transação e
 * recalcula o 'saldo_consolidado' corretamente.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const ExtratoSchema = new mongoose.Schema({
    liga_id: mongoose.Schema.Types.ObjectId,
    time_id: Number,
    saldo_consolidado: Number,
    historico_transacoes: Array,
    ganhos_consolidados: Number,
    perdas_consolidadas: Number,
});

async function fixSaldosTransacoes() {
    console.log('[FIX-TRANSACOES] Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);

    const ExtratoFinanceiroCache = mongoose.model('ExtratoFinanceiroCache', ExtratoSchema);

    const caches = await ExtratoFinanceiroCache.find({});

    console.log(`[FIX-TRANSACOES] Verificando ${caches.length} caches...`);

    let cachesCorrigidos = 0;
    let transacoesCorrigidas = 0;
    let somaPositivos = 0;
    let somaNegativos = 0;

    for (const cache of caches) {
        let cacheModificado = false;
        let novoSaldoConsolidado = 0;

        // Ordenar histórico por rodada
        const historico = (cache.historico_transacoes || []).sort((a, b) => a.rodada - b.rodada);
        let saldoAcumulado = 0;

        for (const t of historico) {
            // Calcular saldo correto da transação
            const bonusOnus = parseFloat(t.bonusOnus) || 0;
            const pontosCorridos = parseFloat(t.pontosCorridos) || 0;
            const mataMata = parseFloat(t.mataMata) || 0;
            const top10 = parseFloat(t.top10) || 0;

            const saldoCorreto = bonusOnus + pontosCorridos + mataMata + top10;

            // Verificar se precisa corrigir
            if (Math.abs((t.saldo || 0) - saldoCorreto) > 0.01) {
                t.saldo = saldoCorreto;
                cacheModificado = true;
                transacoesCorrigidas++;
            }

            // Recalcular saldo acumulado
            saldoAcumulado += saldoCorreto;
            t.saldoAcumulado = saldoAcumulado;

            novoSaldoConsolidado += saldoCorreto;
        }

        // Verificar se saldo_consolidado precisa de correção
        if (Math.abs((cache.saldo_consolidado || 0) - novoSaldoConsolidado) > 0.01) {
            console.log(`[FIX] Time ${cache.time_id}: saldo ${cache.saldo_consolidado?.toFixed(2)} -> ${novoSaldoConsolidado.toFixed(2)}`);
            cache.saldo_consolidado = novoSaldoConsolidado;
            cacheModificado = true;
        }

        if (cacheModificado) {
            // Recalcular ganhos e perdas
            cache.ganhos_consolidados = historico.filter(t => t.saldo > 0).reduce((acc, t) => acc + t.saldo, 0);
            cache.perdas_consolidadas = historico.filter(t => t.saldo < 0).reduce((acc, t) => acc + t.saldo, 0);
            cache.historico_transacoes = historico;

            await cache.save();
            cachesCorrigidos++;
        }

        // Somar para verificação final
        if (novoSaldoConsolidado > 0) {
            somaPositivos += novoSaldoConsolidado;
        } else {
            somaNegativos += Math.abs(novoSaldoConsolidado);
        }
    }

    console.log(`\n[FIX-TRANSACOES] ✅ Correção concluída!`);
    console.log(`[FIX-TRANSACOES] Caches corrigidos: ${cachesCorrigidos}`);
    console.log(`[FIX-TRANSACOES] Transações corrigidas: ${transacoesCorrigidas}`);
    console.log(`[FIX-TRANSACOES] Total CREDORES (A Pagar): R$ ${somaPositivos.toFixed(2)}`);
    console.log(`[FIX-TRANSACOES] Total DEVEDORES (A Receber): R$ ${somaNegativos.toFixed(2)}`);

    await mongoose.disconnect();
    console.log('[FIX-TRANSACOES] Concluído!');
}

fixSaldosTransacoes().catch(err => {
    console.error('[FIX-TRANSACOES] Erro:', err);
    process.exit(1);
});
