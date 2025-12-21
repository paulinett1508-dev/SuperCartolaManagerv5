/**
 * Regenerar caches faltantes da Liga Sobral
 *
 * Problema identificado:
 * - 3 participantes não têm cache (Carlos, Daniel, Paulinett)
 * - Os snapshots têm ranking_rodada com posições
 * - Podemos calcular bonusOnus a partir das posições
 *
 * Uso:
 *   node scripts/regenerar-caches-sobral.js
 *   node scripts/regenerar-caches-sobral.js --dry-run
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '684d821cf1a7ae16d1f89572';
const LIGA_ID_OBJ = new mongoose.Types.ObjectId(LIGA_ID);

// Valores de banco por posição (da config da liga)
const VALORES_BANCO = {
    fase1: { // R1-29 (6 participantes)
        1: 7, 2: 4, 3: 0, 4: -2, 5: -5, 6: -10
    },
    fase2: { // R30-38 (4 participantes ativos)
        1: 5, 2: 0, 3: 0, 4: -5
    },
    rodadaTransicao: 30
};

function getBonusOnus(posicao, rodada) {
    if (rodada >= VALORES_BANCO.rodadaTransicao) {
        return VALORES_BANCO.fase2[posicao] || 0;
    }
    return VALORES_BANCO.fase1[posicao] || 0;
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');

    if (dryRun) {
        console.log('🔍 MODO DRY-RUN: Nenhuma alteração será feita\n');
    }

    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('=== REGENERAR CACHES FALTANTES - LIGA SOBRAL ===\n');

    // 1. Buscar liga e participantes
    const liga = await db.collection('ligas').findOne({ _id: LIGA_ID_OBJ });
    const participantes = liga.participantes || [];
    console.log(`Liga: ${liga.nome}`);
    console.log(`Participantes: ${participantes.length}\n`);

    // 2. Verificar quem tem cache
    const caches = await db.collection('extratofinanceirocaches')
        .find({ liga_id: LIGA_ID_OBJ })
        .toArray();

    const timeIdsComCache = new Set(caches.map(c => c.time_id));
    const semCache = participantes.filter(p => !timeIdsComCache.has(p.time_id));

    console.log(`Com cache: ${timeIdsComCache.size}`);
    console.log(`Sem cache: ${semCache.length}`);

    if (semCache.length === 0) {
        console.log('\n✅ Todos os participantes já têm cache!');
        await mongoose.disconnect();
        return;
    }

    console.log('\nParticipantes sem cache:');
    semCache.forEach(p => {
        console.log(`  - ${p.nome_time} (${p.time_id}) ${p.ativo === false ? '[INATIVO]' : ''}`);
    });

    // 3. Buscar todos os snapshots
    const snapshots = await db.collection('rodadasnapshots')
        .find({ liga_id: LIGA_ID })
        .sort({ rodada: 1 })
        .toArray();

    console.log(`\nSnapshots encontrados: ${snapshots.length}\n`);

    // 4. Para cada participante sem cache, gerar cache
    for (const participante of semCache) {
        const timeId = participante.time_id;
        const nomeTime = participante.nome_time;
        const isInativo = participante.ativo === false;
        const rodadaDesistencia = participante.rodada_desistencia;

        console.log(`\n🔄 Processando: ${nomeTime} (${timeId})`);

        const historicoTransacoes = [];
        let saldoAcumulado = 0;

        for (const snap of snapshots) {
            const rodada = snap.rodada;

            // Se inativo, ignorar rodadas após desistência
            if (isInativo && rodadaDesistencia && rodada >= rodadaDesistencia) {
                continue;
            }

            // Buscar posição no ranking_rodada
            const rankingRodada = snap.dados_consolidados?.ranking_rodada || [];
            const posicaoInfo = rankingRodada.find(r => r.time_id === timeId);
            const posicao = posicaoInfo?.posicao || null;

            // Calcular bonusOnus
            const bonusOnus = posicao ? getBonusOnus(posicao, rodada) : 0;

            // Buscar Top10 do extrato_financeiros
            const extratos = snap.dados_consolidados?.extratos_financeiros || [];
            const extrato = extratos.find(e => e.time_id === timeId);
            const transacoesRodada = extrato?.transacoes?.filter(t => t.rodada === rodada) || [];

            let top10 = 0;
            let isMito = false;
            let isMico = false;
            let top10Posicao = null;

            transacoesRodada.forEach(t => {
                if (t.tipo === 'MITO') {
                    top10 += parseFloat(t.valor) || 0;
                    isMito = true;
                } else if (t.tipo === 'MICO') {
                    top10 += parseFloat(t.valor) || 0;
                    isMico = true;
                }
            });

            // Calcular saldo da rodada
            const saldo = bonusOnus + top10;
            saldoAcumulado += saldo;

            historicoTransacoes.push({
                rodada,
                posicao,
                bonusOnus,
                pontosCorridos: 0, // Liga não tem PC
                mataMata: 0,       // Liga não tem MM
                top10,
                saldo,
                saldoAcumulado,
                isMito,
                isMico,
                top10Status: isMito ? 'MITO' : (isMico ? 'MICO' : null),
                top10Posicao
            });
        }

        // Calcular totais
        const saldoConsolidado = saldoAcumulado;
        const ganhos = historicoTransacoes.reduce((sum, r) => {
            const s = (r.bonusOnus > 0 ? r.bonusOnus : 0) + (r.top10 > 0 ? r.top10 : 0);
            return sum + s;
        }, 0);
        const perdas = historicoTransacoes.reduce((sum, r) => {
            const s = (r.bonusOnus < 0 ? r.bonusOnus : 0) + (r.top10 < 0 ? r.top10 : 0);
            return sum + s;
        }, 0);

        console.log(`  Rodadas processadas: ${historicoTransacoes.length}`);
        console.log(`  Saldo consolidado: ${saldoConsolidado}`);
        console.log(`  Ganhos: ${ganhos}, Perdas: ${perdas}`);

        // Mostrar primeiras 3 rodadas
        console.log('  Primeiras 3 rodadas:');
        historicoTransacoes.slice(0, 3).forEach(r => {
            console.log(`    R${r.rodada}: pos=${r.posicao} bonusOnus=${r.bonusOnus} top10=${r.top10} saldo=${r.saldo}`);
        });

        if (!dryRun) {
            // Salvar cache
            const cacheData = {
                liga_id: LIGA_ID_OBJ,
                time_id: timeId,
                temporada: 2025,
                ultima_rodada_consolidada: historicoTransacoes.length > 0
                    ? historicoTransacoes[historicoTransacoes.length - 1].rodada
                    : 0,
                data_ultima_atualizacao: new Date(),
                saldo_consolidado: saldoConsolidado,
                ganhos_consolidados: ganhos,
                perdas_consolidadas: perdas,
                historico_transacoes: historicoTransacoes,
                cache_permanente: true, // Temporada finalizada
                versao_calculo: '6.3.0-regenerado',
                metadados: {
                    versaoCalculo: '6.3.0',
                    timestampCalculo: new Date(),
                    motivoRecalculo: 'regenerado_script_sobral',
                    origem: 'scripts/regenerar-caches-sobral.js'
                }
            };

            await db.collection('extratofinanceirocaches').updateOne(
                { liga_id: LIGA_ID_OBJ, time_id: timeId },
                { $set: cacheData },
                { upsert: true }
            );

            console.log(`  ✅ Cache salvo!`);
        } else {
            console.log(`  [DRY-RUN] Cache NÃO foi salvo`);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(dryRun ? '🔍 DRY-RUN concluído' : '✅ Regeneração concluída!');

    await mongoose.disconnect();
}

main().catch(console.error);
