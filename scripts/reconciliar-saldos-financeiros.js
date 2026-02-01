/**
 * RECONCILIAÇÃO: Validar saldos financeiros entre collections
 *
 * Compara o saldo calculado (cache + campos + ajustes + acertos) com o
 * saldo_consolidado armazenado no ExtratoFinanceiroCache para detectar
 * divergências.
 *
 * VERIFICA:
 * 1. saldo_consolidado do cache vs recálculo real das transações
 * 2. Ajustes financeiros (AjusteFinanceiro) contabilizados
 * 3. Acertos financeiros (AcertoFinanceiro) contabilizados
 * 4. Campos manuais (FluxoFinanceiroCampos) contabilizados
 * 5. Saldo final completo
 *
 * USO:
 *   node scripts/reconciliar-saldos-financeiros.js --dry-run                    # Todas as ligas, temporada atual
 *   node scripts/reconciliar-saldos-financeiros.js --dry-run --temporada=2025   # Temporada específica
 *   node scripts/reconciliar-saldos-financeiros.js --dry-run --liga=ID_DA_LIGA  # Liga específica
 *   node scripts/reconciliar-saldos-financeiros.js --force                      # Gerar relatório e corrigir caches
 *
 * @version 1.0.0
 * @since 2026-02-01
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const TOLERANCIA = 0.02; // R$ 0.02 de tolerância para arredondamento

async function reconciliarSaldos() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    if (!isDryRun && !isForce) {
        console.log('❌ Use --dry-run para auditar ou --force para auditar E corrigir');
        console.log('   node scripts/reconciliar-saldos-financeiros.js --dry-run');
        console.log('   node scripts/reconciliar-saldos-financeiros.js --force');
        process.exit(1);
    }

    // Parse args
    const temporadaArg = process.argv.find(a => a.startsWith('--temporada='));
    const ligaArg = process.argv.find(a => a.startsWith('--liga='));
    const temporadaFiltro = temporadaArg ? Number(temporadaArg.split('=')[1]) : null;
    const ligaFiltro = ligaArg ? ligaArg.split('=')[1] : null;

    console.log(`\n🔍 RECONCILIAÇÃO DE SALDOS FINANCEIROS`);
    console.log(`   Modo: ${isDryRun ? '🔍 AUDITORIA (dry-run)' : '⚡ AUDITORIA + CORREÇÃO (force)'}`);
    if (temporadaFiltro) console.log(`   Temporada: ${temporadaFiltro}`);
    if (ligaFiltro) console.log(`   Liga: ${ligaFiltro}`);
    console.log('');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const db = mongoose.connection.db;
    const extratoCache = db.collection('extratofinanceirocaches');
    const fluxoCampos = db.collection('fluxofinanceirocampos');
    const acertos = db.collection('acertofinanceiros');
    const ajustes = db.collection('ajustesfinanceiros');

    // =========================================================================
    // 1. BUSCAR todos os caches de extrato
    // =========================================================================
    const filtroCache = {};
    if (temporadaFiltro) filtroCache.temporada = temporadaFiltro;
    if (ligaFiltro) filtroCache.liga_id = ligaFiltro;

    const caches = await extratoCache.find(filtroCache).toArray();
    console.log(`📊 Caches encontrados: ${caches.length}\n`);

    if (caches.length === 0) {
        console.log('✅ Nenhum cache para reconciliar.');
        await mongoose.disconnect();
        process.exit(0);
    }

    // =========================================================================
    // 2. RECONCILIAR cada participante
    // =========================================================================
    const resultados = {
        total: caches.length,
        ok: 0,
        divergentes: [],
        semTransacoes: 0,
        erros: 0,
    };

    for (const cache of caches) {
        try {
            const ligaId = String(cache.liga_id);
            const timeId = Number(cache.time_id);
            const temporada = Number(cache.temporada);

            // 2a. Recalcular saldo das transações
            let saldoTransacoes = 0;
            if (cache.historico_transacoes && cache.historico_transacoes.length > 0) {
                for (const t of cache.historico_transacoes) {
                    saldoTransacoes += (t.saldo || 0);
                }
            } else {
                resultados.semTransacoes++;
            }

            // 2b. Buscar campos manuais (FluxoFinanceiroCampos)
            const camposDoc = await fluxoCampos.findOne({
                ligaId: ligaId,
                timeId: String(timeId),
                temporada: temporada,
            });
            let totalCampos = 0;
            if (camposDoc?.campos) {
                for (const c of camposDoc.campos) {
                    totalCampos += Number(c.valor) || 0;
                }
            }

            // 2c. Buscar ajustes financeiros (AjusteFinanceiro - 2026+)
            let ligaIdObj;
            try {
                ligaIdObj = new mongoose.Types.ObjectId(ligaId);
            } catch {
                ligaIdObj = ligaId; // Se não é ObjectId válido, usar string
            }

            const ajustesDocs = await ajustes.find({
                liga_id: ligaIdObj,
                time_id: timeId,
                temporada: temporada,
                ativo: true,
            }).toArray();
            let totalAjustes = 0;
            for (const a of ajustesDocs) {
                totalAjustes += Number(a.valor) || 0;
            }

            // 2d. Buscar acertos financeiros (AcertoFinanceiro)
            const acertosDocs = await acertos.find({
                ligaId: ligaId,
                timeId: String(timeId),
                temporada: temporada,
                ativo: true,
            }).toArray();
            let totalPago = 0;
            let totalRecebido = 0;
            for (const a of acertosDocs) {
                if (a.tipo === 'pagamento') totalPago += Number(a.valor) || 0;
                else if (a.tipo === 'recebimento') totalRecebido += Number(a.valor) || 0;
            }
            const saldoAcertos = totalPago - totalRecebido;

            // 2e. Calcular saldo esperado
            const saldoEsperado = saldoTransacoes + totalCampos + totalAjustes;
            const saldoFinalEsperado = saldoEsperado + saldoAcertos;

            // 2f. Comparar com cache
            const saldoCache = cache.saldo_consolidado || 0;
            const diffConsolidado = Math.abs(saldoCache - saldoTransacoes);

            if (diffConsolidado > TOLERANCIA) {
                resultados.divergentes.push({
                    liga_id: ligaId,
                    time_id: timeId,
                    temporada,
                    saldoCache,
                    saldoRecalculado: saldoTransacoes,
                    diferenca: parseFloat((saldoCache - saldoTransacoes).toFixed(2)),
                    totalCampos,
                    totalAjustes,
                    saldoAcertos,
                    saldoFinalEsperado: parseFloat(saldoFinalEsperado.toFixed(2)),
                    rodadas: cache.historico_transacoes?.length || 0,
                    cacheId: cache._id,
                });
            } else {
                resultados.ok++;
            }
        } catch (error) {
            resultados.erros++;
            console.error(`   ❌ Erro ao processar cache ${cache._id}: ${error.message}`);
        }
    }

    // =========================================================================
    // 3. RELATÓRIO
    // =========================================================================
    console.log(`${'='.repeat(70)}`);
    console.log(`📊 RELATÓRIO DE RECONCILIAÇÃO`);
    console.log(`${'='.repeat(70)}`);
    console.log(`   Total analisados:     ${resultados.total}`);
    console.log(`   ✅ Saldos corretos:   ${resultados.ok}`);
    console.log(`   ⚠️  Divergentes:       ${resultados.divergentes.length}`);
    console.log(`   📭 Sem transações:    ${resultados.semTransacoes}`);
    console.log(`   ❌ Erros:             ${resultados.erros}`);
    console.log(`   Tolerância:           R$ ${TOLERANCIA.toFixed(2)}`);
    console.log(`${'='.repeat(70)}\n`);

    if (resultados.divergentes.length > 0) {
        console.log(`\n⚠️  DIVERGÊNCIAS ENCONTRADAS (${resultados.divergentes.length}):\n`);

        for (const d of resultados.divergentes) {
            console.log(`   Liga: ${d.liga_id} | Time: ${d.time_id} | Temporada: ${d.temporada}`);
            console.log(`     Cache (saldo_consolidado): R$ ${d.saldoCache.toFixed(2)}`);
            console.log(`     Recálculo (transações):    R$ ${d.saldoRecalculado.toFixed(2)}`);
            console.log(`     Diferença:                 R$ ${d.diferenca.toFixed(2)}`);
            console.log(`     Campos manuais:            R$ ${d.totalCampos.toFixed(2)}`);
            console.log(`     Ajustes (2026+):           R$ ${d.totalAjustes.toFixed(2)}`);
            console.log(`     Acertos (pago-recebido):   R$ ${d.saldoAcertos.toFixed(2)}`);
            console.log(`     Saldo final esperado:      R$ ${d.saldoFinalEsperado.toFixed(2)}`);
            console.log(`     Rodadas no histórico:      ${d.rodadas}`);
            console.log('');
        }

        // =========================================================================
        // 4. CORRIGIR (se --force)
        // =========================================================================
        if (isForce) {
            console.log('\n⚡ Corrigindo saldo_consolidado dos divergentes...\n');

            let corrigidos = 0;
            for (const d of resultados.divergentes) {
                try {
                    await extratoCache.updateOne(
                        { _id: d.cacheId },
                        {
                            $set: {
                                saldo_consolidado: d.saldoRecalculado,
                                'metadados.motivoRecalculo': `Reconciliação automática (diff: R$ ${d.diferenca.toFixed(2)})`,
                                'metadados.timestampCalculo': new Date(),
                                'metadados.origem': 'script:reconciliar-saldos',
                            }
                        }
                    );
                    corrigidos++;
                    console.log(`   ✅ Corrigido: time_id=${d.time_id} temporada=${d.temporada} (${d.saldoCache.toFixed(2)} → ${d.saldoRecalculado.toFixed(2)})`);
                } catch (error) {
                    console.error(`   ❌ Erro ao corrigir time_id=${d.time_id}: ${error.message}`);
                }
            }

            console.log(`\n✅ ${corrigidos}/${resultados.divergentes.length} saldos corrigidos.`);
        } else {
            console.log('🔍 DRY-RUN: Nenhuma correção aplicada.');
            console.log('   Execute com --force para corrigir os saldos divergentes.');
        }
    } else {
        console.log('✅ Todos os saldos estão corretos! Nenhuma divergência encontrada.');
    }

    await mongoose.disconnect();
}

reconciliarSaldos().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});
