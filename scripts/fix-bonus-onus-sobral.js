/**
 * fix-bonus-onus-sobral.js - Corrigir bonusOnus zerados na Liga Cartoleiros do Sobral
 *
 * PROBLEMA IDENTIFICADO:
 * Os caches de extrato financeiro da Liga "Cartoleiros do Sobral" foram gerados
 * com bonusOnus: 0 em todas as rodadas, mas a liga tem configuração de ranking_rodada
 * com valores de bônus/ônus por posição.
 *
 * SOLUÇÃO:
 * Recalcular o bonusOnus de cada rodada baseado na posição do participante
 * e na configuração da liga.
 *
 * USO:
 *   node scripts/fix-bonus-onus-sobral.js --dry-run    # Simular
 *   node scripts/fix-bonus-onus-sobral.js --force      # Executar
 */

import 'dotenv/config';
import mongoose from 'mongoose';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================
const LIGA_ID = '684d821cf1a7ae16d1f89572'; // Cartoleiros do Sobral
const TEMPORADA = 2025;

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

if (!isDryRun && !isForce) {
    console.error('❌ ERRO: Especifique --dry-run ou --force');
    console.log('');
    console.log('Uso:');
    console.log('  node scripts/fix-bonus-onus-sobral.js --dry-run    # Simular');
    console.log('  node scripts/fix-bonus-onus-sobral.js --force      # Executar');
    process.exit(1);
}

// ============================================================================
// CONEXÃO MONGODB
// ============================================================================
async function conectar() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGO_URI não configurada');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Conectado ao MongoDB');
}

// ============================================================================
// BUSCAR CONFIGURAÇÃO DA LIGA
// ============================================================================
async function buscarConfigLiga() {
    const db = mongoose.connection.db;
    const liga = await db.collection('ligas').findOne({
        _id: new mongoose.Types.ObjectId(LIGA_ID)
    });

    if (!liga) {
        console.error(`❌ Liga ${LIGA_ID} não encontrada`);
        process.exit(1);
    }

    console.log(`📋 Liga: ${liga.nome}`);

    const config = liga.configuracoes?.ranking_rodada;
    if (!config) {
        console.error('❌ Liga não tem configuração de ranking_rodada');
        process.exit(1);
    }

    console.log(`📊 Configuração de ranking_rodada:`);
    console.log(`   - Temporal: ${config.temporal}`);
    console.log(`   - Rodada transição: ${config.rodada_transicao}`);
    console.log(`   - Fase 1 valores:`, config.fase1?.valores);
    console.log(`   - Fase 2 valores:`, config.fase2?.valores);

    return config;
}

// ============================================================================
// CALCULAR BONUS/ONUS BASEADO NA CONFIGURAÇÃO
// ============================================================================
function calcularBonusOnus(posicao, rodada, config) {
    // Determinar qual fase usar
    const rodadaTransicao = config.rodada_transicao || 30;
    const fase = rodada < rodadaTransicao ? config.fase1 : config.fase2;

    if (!fase || !fase.valores) {
        return 0;
    }

    // Buscar valor para a posição
    const valor = fase.valores[String(posicao)];
    return valor !== undefined ? valor : 0;
}

// ============================================================================
// PROCESSAR CACHES
// ============================================================================
async function processarCaches(configRanking) {
    const db = mongoose.connection.db;
    const caches = await db.collection('extratofinanceirocaches').find({
        liga_id: LIGA_ID,
        temporada: TEMPORADA
    }).toArray();

    console.log(`\n📦 Encontrados ${caches.length} caches para processar\n`);

    let totalCorrigidos = 0;
    let totalRodadasAlteradas = 0;

    for (const cache of caches) {
        const transacoes = cache.historico_transacoes || [];
        if (transacoes.length === 0) continue;

        let alteracoes = [];
        let novoSaldoAcumulado = 0;
        let novosGanhos = 0;
        let novasPerdas = 0;

        // Processar cada rodada
        const novasTransacoes = transacoes.map((t, idx) => {
            const bonusOnusCorreto = calcularBonusOnus(t.posicao, t.rodada, configRanking);
            const bonusOnusAtual = t.bonusOnus || 0;

            // Recalcular saldo da rodada
            const novoSaldo = bonusOnusCorreto + (t.pontosCorridos || 0) + (t.mataMata || 0) + (t.top10 || 0);
            novoSaldoAcumulado += novoSaldo;

            // Acumular ganhos e perdas
            if (bonusOnusCorreto > 0) novosGanhos += bonusOnusCorreto;
            if (bonusOnusCorreto < 0) novasPerdas += bonusOnusCorreto;
            if (t.pontosCorridos > 0) novosGanhos += t.pontosCorridos;
            if (t.pontosCorridos < 0) novasPerdas += t.pontosCorridos;
            if (t.mataMata > 0) novosGanhos += t.mataMata;
            if (t.mataMata < 0) novasPerdas += t.mataMata;
            if (t.top10 > 0) novosGanhos += t.top10;
            if (t.top10 < 0) novasPerdas += t.top10;

            if (bonusOnusAtual !== bonusOnusCorreto) {
                alteracoes.push({
                    rodada: t.rodada,
                    posicao: t.posicao,
                    antes: bonusOnusAtual,
                    depois: bonusOnusCorreto
                });
            }

            return {
                ...t,
                bonusOnus: bonusOnusCorreto,
                saldo: novoSaldo,
                saldoAcumulado: novoSaldoAcumulado
            };
        });

        if (alteracoes.length > 0) {
            console.log(`\n🔧 Time ${cache.time_id}:`);
            console.log(`   Rodadas alteradas: ${alteracoes.length}`);
            alteracoes.slice(0, 5).forEach(a => {
                console.log(`   - R${a.rodada}: pos ${a.posicao} → bonusOnus: ${a.antes} → ${a.depois}`);
            });
            if (alteracoes.length > 5) {
                console.log(`   ... e mais ${alteracoes.length - 5} alterações`);
            }
            console.log(`   Saldo final: ${cache.saldo_consolidado} → ${novoSaldoAcumulado}`);

            if (!isDryRun) {
                await db.collection('extratofinanceirocaches').updateOne(
                    { _id: cache._id },
                    {
                        $set: {
                            historico_transacoes: novasTransacoes,
                            saldo_consolidado: novoSaldoAcumulado,
                            ganhos_consolidados: novosGanhos,
                            perdas_consolidadas: novasPerdas,
                            'metadados.fix_bonus_onus': new Date().toISOString(),
                            'metadados.versao_fix': 'fix-bonus-onus-sobral-v1'
                        }
                    }
                );
                console.log(`   ✅ Atualizado no banco`);
            } else {
                console.log(`   ⏸️  DRY-RUN: não atualizado`);
            }

            totalCorrigidos++;
            totalRodadasAlteradas += alteracoes.length;
        }
    }

    return { totalCorrigidos, totalRodadasAlteradas };
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  FIX BONUS/ONUS - LIGA CARTOLEIROS DO SOBRAL');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Modo: ${isDryRun ? '🔍 DRY-RUN (simulação)' : '⚡ FORCE (execução)'}`);
    console.log(`Liga ID: ${LIGA_ID}`);
    console.log(`Temporada: ${TEMPORADA}`);
    console.log('');

    await conectar();

    const configRanking = await buscarConfigLiga();
    const { totalCorrigidos, totalRodadasAlteradas } = await processarCaches(configRanking);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  RESUMO');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Caches corrigidos: ${totalCorrigidos}`);
    console.log(`Rodadas alteradas: ${totalRodadasAlteradas}`);

    if (isDryRun && totalCorrigidos > 0) {
        console.log('\n⚠️  Execute com --force para aplicar as correções');
    }

    await mongoose.disconnect();
    console.log('\n✅ Concluído!');
}

main().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
