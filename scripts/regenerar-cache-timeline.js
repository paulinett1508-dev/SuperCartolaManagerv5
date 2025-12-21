/**
 * Regenerar Cache com Timeline (bonusOnus) correto
 *
 * Este script recalcula o bonusOnus baseado na posição real
 * de cada participante em cada rodada.
 *
 * Uso:
 *   node scripts/regenerar-cache-timeline.js <timeId>
 *   node scripts/regenerar-cache-timeline.js 3300583
 *   node scripts/regenerar-cache-timeline.js --all  (todos com problema)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function regenerarCache(db, timeId, ligaId, valoresBanco) {
    console.log(`\n🔄 Regenerando cache para time ${timeId}...`);

    // 1. Buscar todas as rodadas do time na collection rodadas
    const rodadas = await db.collection('rodadas')
        .find({ timeId: timeId })
        .sort({ rodada: 1 })
        .toArray();

    if (rodadas.length === 0) {
        console.log(`   ❌ Time ${timeId} não tem dados na collection rodadas`);
        return false;
    }

    console.log(`   📊 Encontradas ${rodadas.length} rodadas`);

    // 2. Para cada rodada, calcular a posição
    const historicoTransacoes = [];
    let saldoAcumulado = 0;

    for (const rodada of rodadas) {
        // Buscar todos os participantes da mesma rodada e liga
        const todosNaRodada = await db.collection('rodadas')
            .find({ ligaId: ligaId, rodada: rodada.rodada })
            .sort({ pontos: -1 })
            .toArray();

        const posicao = todosNaRodada.findIndex(r => r.timeId === timeId) + 1;
        const totalTimes = todosNaRodada.length;

        // Calcular bonusOnus baseado na posição
        const bonusOnus = valoresBanco[posicao] || 0;

        // Verificar se é mito/mico
        const isMito = posicao === 1;
        const isMico = posicao === totalTimes;

        // Calcular saldo da rodada (por enquanto só bonusOnus, sem PC/MM/Top10)
        const saldo = bonusOnus;
        saldoAcumulado += saldo;

        historicoTransacoes.push({
            rodada: rodada.rodada,
            posicao: posicao,
            totalTimes: totalTimes,
            bonusOnus: bonusOnus,
            pontosCorridos: 0, // Será calculado separadamente se necessário
            mataMata: 0,       // Será calculado separadamente se necessário
            top10: 0,          // Será calculado separadamente se necessário
            saldo: saldo,
            saldoAcumulado: saldoAcumulado,
            isMito: isMito,
            isMico: isMico,
            top10Status: null,
            top10Posicao: null
        });
    }

    // 3. Calcular saldo consolidado
    const saldoConsolidado = historicoTransacoes.reduce((sum, h) => sum + h.bonusOnus, 0);

    // 4. Atualizar o cache
    const result = await db.collection('extratofinanceirocaches').updateOne(
        { time_id: timeId },
        {
            $set: {
                historico_transacoes: historicoTransacoes,
                saldo_consolidado: saldoConsolidado,
                ultima_rodada_calculada: rodadas[rodadas.length - 1].rodada,
                atualizado_em: new Date(),
                regenerado_via_script: true
            }
        },
        { upsert: true }
    );

    console.log(`   ✅ Cache atualizado! Saldo bonusOnus: ${saldoConsolidado}`);
    console.log(`      Rodadas: ${historicoTransacoes.length} | Primeira: R${historicoTransacoes[0].rodada} | Última: R${historicoTransacoes[historicoTransacoes.length - 1].rodada}`);

    return true;
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Uso:');
        console.log('  node scripts/regenerar-cache-timeline.js <timeId>');
        console.log('  node scripts/regenerar-cache-timeline.js --all');
        console.log('  node scripts/regenerar-cache-timeline.js --diagnostico');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Conectado ao MongoDB\n');

        const db = mongoose.connection.db;

        // Buscar configuração do banco da liga (valores por posição)
        const ligaId = new mongoose.Types.ObjectId('684cb1c8af923da7c7df51de');
        const liga = await db.collection('ligas').findOne({ _id: ligaId });

        if (!liga) {
            console.log('❌ Liga não encontrada!');
            process.exit(1);
        }

        console.log(`Liga: ${liga.nome}`);

        // Valores do banco por posição
        const valoresBanco = liga.configuracoes?.ranking_rodada?.valores || {};
        console.log('Valores do banco configurados:', Object.keys(valoresBanco).length, 'posições');

        if (args[0] === '--diagnostico') {
            // Mostrar participantes com problema
            console.log('\n=== PARTICIPANTES COM TIMELINE ZERADO ===');

            const extratos = await db.collection('extratofinanceirocaches')
                .find({ liga_id: ligaId })
                .toArray();

            const problematicos = [];
            for (const ext of extratos) {
                const hist = ext.historico_transacoes || [];
                const totalBonusOnus = hist.reduce((sum, h) => sum + (h.bonusOnus || 0), 0);

                if (totalBonusOnus === 0 && hist.length > 5) {
                    const time = await db.collection('times').findOne({ id: ext.time_id });
                    problematicos.push({
                        timeId: ext.time_id,
                        nome: time?.nome_time || 'Desconhecido',
                        rodadas: hist.length
                    });
                }
            }

            if (problematicos.length === 0) {
                console.log('✅ Nenhum participante com problema encontrado!');
            } else {
                console.log(`⚠️ ${problematicos.length} participante(s) com Timeline zerado:`);
                problematicos.forEach(p => {
                    console.log(`   - ${p.nome} (ID: ${p.timeId}) - ${p.rodadas} rodadas`);
                });
            }

        } else if (args[0] === '--all') {
            // Regenerar todos com problema
            console.log('\n=== REGENERANDO TODOS OS CACHES COM PROBLEMA ===');

            const extratos = await db.collection('extratofinanceirocaches')
                .find({ liga_id: ligaId })
                .toArray();

            let corrigidos = 0;
            for (const ext of extratos) {
                const hist = ext.historico_transacoes || [];
                const totalBonusOnus = hist.reduce((sum, h) => sum + (h.bonusOnus || 0), 0);

                if (totalBonusOnus === 0 && hist.length > 5) {
                    const sucesso = await regenerarCache(db, ext.time_id, ligaId, valoresBanco);
                    if (sucesso) corrigidos++;
                }
            }

            console.log(`\n✅ ${corrigidos} cache(s) regenerado(s)!`);

        } else {
            // Regenerar um time específico
            const timeId = parseInt(args[0], 10);

            if (isNaN(timeId)) {
                console.log('❌ TimeId inválido:', args[0]);
                process.exit(1);
            }

            await regenerarCache(db, timeId, ligaId, valoresBanco);
        }

        await mongoose.disconnect();
        console.log('\nDesconectado.');

    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

main();
