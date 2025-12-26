/**
 * FIX-R38-CACHE.js - Regenera cache financeiro incluindo R38
 *
 * Este script corrige o bug onde R38 não foi incluída no ExtratoFinanceiroCache
 * devido à lógica incorreta de rodadaAtual - 1.
 *
 * Uso:
 *   node scripts/fix-r38-cache.js --dry-run    # Apenas verifica
 *   node scripts/fix-r38-cache.js --force      # Executa correção
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de'; // Super Cartola 2025

async function verificarAfetados(db) {
    const ObjectId = mongoose.Types.ObjectId;

    // Buscar todos os caches que param em R37 ou menos
    const caches = await db.collection('extratofinanceirocaches').find({
        liga_id: new ObjectId(LIGA_ID),
        ultima_rodada_consolidada: { $lt: 38 }
    }).toArray();

    console.log(`\n🔍 PARTICIPANTES AFETADOS (sem R38):`);
    console.log(`   Total: ${caches.length}`);

    for (const cache of caches) {
        const rodadasNoCache = [...new Set(cache.historico_transacoes?.map(t => t.rodada) || [])];
        const temR38 = rodadasNoCache.includes(38);
        console.log(`   - Time ${cache.time_id}: ultima_rodada=${cache.ultima_rodada_consolidada}, tem R38: ${temR38 ? 'SIM' : 'NÃO'}`);
    }

    return caches;
}

async function corrigirCaches(db, dryRun = true) {
    const ObjectId = mongoose.Types.ObjectId;

    // Buscar configuração da liga
    const liga = await db.collection('ligas').findOne({ _id: new ObjectId(LIGA_ID) });
    if (!liga) {
        console.error('❌ Liga não encontrada');
        return;
    }

    // Buscar todos os participantes
    const participantes = liga.participantes || [];
    console.log(`\n📊 Liga: ${liga.nome}`);
    console.log(`   Participantes: ${participantes.length}`);

    let corrigidos = 0;
    let erros = 0;

    for (const participante of participantes) {
        const timeId = participante.time_id;

        // Buscar cache atual
        const cacheAtual = await db.collection('extratofinanceirocaches').findOne({
            liga_id: new ObjectId(LIGA_ID),
            time_id: timeId
        });

        // Buscar rodada 38 na collection rodadas (ligaId pode ser string ou ObjectId)
        const r38 = await db.collection('rodadas').findOne({
            $or: [
                { ligaId: LIGA_ID, timeId: timeId, rodada: 38 },
                { ligaId: new ObjectId(LIGA_ID), timeId: timeId, rodada: 38 }
            ]
        });

        if (!r38) {
            console.log(`   ⚠️ Time ${timeId} (${participante.nome_cartola}): Sem dados R38 na collection rodadas`);
            continue;
        }

        // Verificar se precisa correção
        const temR38NoCache = cacheAtual?.historico_transacoes?.some(t => t.rodada === 38);

        if (temR38NoCache) {
            console.log(`   ✅ Time ${timeId} (${participante.nome_cartola}): R38 já existe no cache`);
            continue;
        }

        // Precisa correção!
        console.log(`   🔧 Time ${timeId} (${participante.nome_cartola}): Corrigindo...`);

        if (dryRun) {
            console.log(`      [DRY-RUN] Seria adicionada R38 ao cache`);
            corrigidos++;
            continue;
        }

        try {
            // Buscar posição na R38 (ranking da rodada)
            const rankingR38 = await db.collection('rodadas').find({
                $or: [
                    { ligaId: LIGA_ID, rodada: 38 },
                    { ligaId: new ObjectId(LIGA_ID), rodada: 38 }
                ]
            }).sort({ pontos: -1 }).toArray();

            const posicaoR38 = rankingR38.findIndex(r => r.timeId === timeId) + 1;

            // Calcular bônus/ônus baseado na posição
            const configRanking = liga.configuracoes?.ranking_rodada?.valores || {};
            const bonusOnus = configRanking[posicaoR38] || 0;

            // Criar transação R38
            const transacaoR38 = {
                rodada: 38,
                posicao: posicaoR38,
                bonusOnus: bonusOnus,
                pontosCorridos: 0, // Calcular separadamente se necessário
                mataMata: 0,
                top10: 0,
                saldo: bonusOnus,
                isMito: false,
                isMico: false
            };

            // Atualizar cache
            const novasTransacoes = [...(cacheAtual?.historico_transacoes || []), transacaoR38];
            novasTransacoes.sort((a, b) => a.rodada - b.rodada);

            // Recalcular saldoAcumulado
            let saldoAcumulado = 0;
            novasTransacoes.forEach(t => {
                saldoAcumulado += t.saldo || 0;
                t.saldoAcumulado = saldoAcumulado;
            });

            await db.collection('extratofinanceirocaches').updateOne(
                { liga_id: new ObjectId(LIGA_ID), time_id: timeId },
                {
                    $set: {
                        historico_transacoes: novasTransacoes,
                        ultima_rodada_consolidada: 38,
                        saldo_consolidado: saldoAcumulado,
                        updatedAt: new Date(),
                        'metadados.fix_r38': new Date(),
                        'metadados.versaoCalculo': '3.5.0-fix-r38'
                    }
                }
            );

            console.log(`      ✅ R38 adicionada: posição ${posicaoR38}, bônus/ônus: ${bonusOnus}`);
            corrigidos++;
        } catch (error) {
            console.error(`      ❌ Erro: ${error.message}`);
            erros++;
        }
    }

    console.log(`\n📋 RESUMO:`);
    console.log(`   Corrigidos: ${corrigidos}`);
    console.log(`   Erros: ${erros}`);
    console.log(`   Modo: ${dryRun ? 'DRY-RUN (simulação)' : 'EXECUTADO'}`);
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--force');

    console.log('🔧 FIX-R38-CACHE - Correção do Bug R38');
    console.log('=====================================');
    console.log(`Modo: ${dryRun ? 'DRY-RUN (--force para executar)' : 'EXECUÇÃO REAL'}\n`);

    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;

        console.log('✅ Conectado ao MongoDB');

        // Verificar afetados
        await verificarAfetados(db);

        // Corrigir
        await corrigirCaches(db, dryRun);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Desconectado do MongoDB');
    }
}

main();
