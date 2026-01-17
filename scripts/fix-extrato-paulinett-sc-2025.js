/**
 * FIX: Reconstruir extrato do Paulinett Miranda na Super Cartola 2025
 *
 * PROBLEMA:
 * - Extrato foi criado vazio em 2026-01-17
 * - Dados existem nos snapshots e caches de modulos
 *
 * SOLUCAO:
 * - Extrair posicao semanal dos rodadasnapshots
 * - Integrar PC/MM/Top10 dos caches de modulos
 * - Reconstruir historico_transacoes completo
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_SC = '684cb1c8af923da7c7df51de';
const TIME_ID = 13935277;
const TEMPORADA = 2025;

// Tabela de bonus/onus por posicao (32 times)
function calcularBonusOnus(posicao, totalTimes = 32) {
    if (posicao <= 5) return 11 - posicao; // 1=10, 2=9, 3=8, 4=7, 5=6
    if (posicao <= 10) return 16 - posicao; // 6=10... wait, isso nao bate

    // Tabela padrao Super Cartola
    const tabela = {
        1: 10, 2: 9, 3: 8, 4: 7, 5: 6,
        6: 5, 7: 4, 8: 3, 9: 2, 10: 1,
        11: 0, 12: 0, 13: 0, 14: 0, 15: 0,
        16: 0, 17: 0, 18: 0, 19: 0, 20: 0,
        21: 0, 22: -1, 23: -2, 24: -3, 25: -4,
        26: -5, 27: -6, 28: -8, 29: -8, 30: -9,
        31: -10, 32: -11
    };

    return tabela[posicao] || 0;
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--execute');

    if (!args.includes('--dry-run') && !args.includes('--execute')) {
        console.error('Uso:');
        console.error('  node scripts/fix-extrato-paulinett-sc-2025.js --dry-run');
        console.error('  node scripts/fix-extrato-paulinett-sc-2025.js --execute');
        process.exit(1);
    }

    console.log('='.repeat(80));
    console.log('FIX: EXTRATO PAULINETT MIRANDA - SUPER CARTOLA 2025');
    console.log('='.repeat(80));
    console.log(`Time ID: ${TIME_ID}`);
    console.log(`Modo: ${dryRun ? 'DRY-RUN' : 'EXECUCAO REAL'}`);

    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    try {
        // 1. Buscar snapshots
        console.log('\n[1] Buscando snapshots...');
        const snapshots = await db.collection('rodadasnapshots')
            .find({ liga_id: LIGA_SC })
            .sort({ rodada: 1 })
            .toArray();

        console.log(`    Encontrados ${snapshots.length} snapshots`);

        // 2. Extrair posicoes semanais
        console.log('\n[2] Extraindo posicoes semanais...');
        const posicoesPorRodada = {};

        for (const snap of snapshots) {
            const dados = snap.dados_consolidados || {};
            const ranking = dados.ranking_rodada || [];

            const paulinett = ranking.find(r =>
                String(r.time_id || r.timeId) === String(TIME_ID)
            );

            if (paulinett) {
                posicoesPorRodada[snap.rodada] = {
                    posicao: paulinett.posicao,
                    pontos: paulinett.pontos_rodada
                };
            }
        }

        console.log(`    Posicoes encontradas: ${Object.keys(posicoesPorRodada).length} rodadas`);

        // 3. Buscar dados de PC
        console.log('\n[3] Buscando Pontos Corridos...');
        const pcCaches = await db.collection('pontoscorridoscaches')
            .find({ liga_id: new mongoose.Types.ObjectId(LIGA_SC) })
            .sort({ rodada_consolidada: 1 })
            .toArray();

        // Mapear financeiro acumulado por rodada
        const financeiroAcumulado = {};
        pcCaches.forEach(cache => {
            const rodadaPC = cache.rodada_consolidada;
            const rodadaBrasileirao = rodadaPC + 6;

            const paulinett = (cache.classificacao || []).find(c =>
                String(c.time_id || c.timeId) === String(TIME_ID)
            );

            if (paulinett) {
                financeiroAcumulado[rodadaBrasileirao] = paulinett.financeiro || 0;
            }
        });

        // Calcular delta por rodada
        const pcPorRodada = {};
        const rodadasOrdenadas = Object.keys(financeiroAcumulado).map(Number).sort((a, b) => a - b);

        rodadasOrdenadas.forEach((rodada, idx) => {
            const acumuladoAtual = financeiroAcumulado[rodada];
            const rodadaAnterior = idx > 0 ? rodadasOrdenadas[idx - 1] : null;
            const acumuladoAnterior = rodadaAnterior ? financeiroAcumulado[rodadaAnterior] : 0;

            pcPorRodada[rodada] = acumuladoAtual - acumuladoAnterior;
        });

        console.log(`    PC encontrado em ${Object.keys(pcPorRodada).length} rodadas`);

        // 4. Buscar dados de MM
        console.log('\n[4] Buscando Mata-Mata...');
        const liga = await db.collection('ligas').findOne({ _id: new mongoose.Types.ObjectId(LIGA_SC) });
        const valorVitoria = liga?.configuracoes?.mata_mata?.valores?.vitoria || 10;
        const valorDerrota = liga?.configuracoes?.mata_mata?.valores?.derrota || -10;

        const mmCaches = await db.collection('matamatacaches')
            .find({ liga_id: new mongoose.Types.ObjectId(LIGA_SC) })
            .toArray();

        const rodadaPorEdicaoFase = {
            '1_primeira': 3, '1_oitavas': 4, '1_quartas': 5, '1_semis': 6, '1_final': 6,
            '2_primeira': 10, '2_oitavas': 11, '2_quartas': 12, '2_semis': 13, '2_final': 13,
            '3_primeira': 17, '3_oitavas': 18, '3_quartas': 19, '3_semis': 20, '3_final': 20,
            '4_primeira': 24, '4_oitavas': 25, '4_quartas': 26, '4_semis': 27, '4_final': 27,
            '5_primeira': 31, '5_oitavas': 32, '5_quartas': 33, '5_semis': 34, '5_final': 34
        };

        const mmPorRodada = {};
        const fases = ['primeira', 'oitavas', 'quartas', 'semis', 'final'];

        for (const cache of mmCaches) {
            const edicao = cache.edicao;
            if (!cache.dados_torneio) continue;

            for (const fase of fases) {
                const confrontos = cache.dados_torneio[fase];
                if (!confrontos || confrontos.length === 0) continue;

                const rodadaKey = `${edicao}_${fase}`;
                const rodada = rodadaPorEdicaoFase[rodadaKey];
                if (!rodada) continue;

                for (const c of confrontos) {
                    const timeAId = String(c.timeA?.timeId || c.timeA?.time_id);
                    const timeBId = String(c.timeB?.timeId || c.timeB?.time_id);

                    if (timeAId !== String(TIME_ID) && timeBId !== String(TIME_ID)) continue;

                    const pontosA = c.timeA?.pontos || 0;
                    const pontosB = c.timeB?.pontos || 0;

                    let valor = 0;
                    if (timeAId === String(TIME_ID)) {
                        valor = pontosA > pontosB ? valorVitoria : (pontosA < pontosB ? valorDerrota : 0);
                    } else {
                        valor = pontosB > pontosA ? valorVitoria : (pontosB < pontosA ? valorDerrota : 0);
                    }

                    if (valor !== 0) {
                        mmPorRodada[rodada] = (mmPorRodada[rodada] || 0) + valor;
                    }
                }
            }
        }

        console.log(`    MM encontrado em ${Object.keys(mmPorRodada).length} rodadas`);

        // 5. Buscar dados de Top10
        console.log('\n[5] Buscando Top10...');
        const top10Cache = await db.collection('top10caches').findOne({ liga_id: LIGA_SC });

        const top10PorRodada = {};
        if (top10Cache) {
            const valoresMito = liga?.configuracoes?.top10?.valores_mito || { '1': 30 };
            const valoresMico = liga?.configuracoes?.top10?.valores_mico || { '1': -30 };

            for (const mito of (top10Cache.mitos || [])) {
                if (String(mito.timeId || mito.time_id) === String(TIME_ID)) {
                    const posicao = mito.posicao || 1;
                    const valor = valoresMito[posicao] || valoresMito[String(posicao)] || 0;
                    top10PorRodada[mito.rodada] = { tipo: 'MITO', posicao, valor };
                }
            }

            for (const mico of (top10Cache.micos || [])) {
                if (String(mico.timeId || mico.time_id) === String(TIME_ID)) {
                    const posicao = mico.posicao || 1;
                    const valor = valoresMico[posicao] || valoresMico[String(posicao)] || 0;
                    top10PorRodada[mico.rodada] = { tipo: 'MICO', posicao, valor };
                }
            }
        }

        console.log(`    Top10 encontrado em ${Object.keys(top10PorRodada).length} rodadas`);

        // 6. Construir historico_transacoes
        console.log('\n[6] Construindo historico_transacoes...');
        const historicoTransacoes = [];
        let saldoAcumulado = 0;

        for (let rodada = 1; rodada <= 38; rodada++) {
            const posicaoData = posicoesPorRodada[rodada];
            const posicao = posicaoData?.posicao || null;
            const bonusOnus = posicao ? calcularBonusOnus(posicao, 32) : 0;
            const pontosCorridos = pcPorRodada[rodada] || 0;
            const mataMata = mmPorRodada[rodada] || 0;
            const top10Data = top10PorRodada[rodada];
            const top10 = top10Data?.valor || 0;

            const saldo = bonusOnus + pontosCorridos + mataMata + top10;
            saldoAcumulado += saldo;

            historicoTransacoes.push({
                rodada,
                posicao,
                bonusOnus,
                pontosCorridos,
                mataMata,
                top10,
                saldo,
                saldoAcumulado,
                isMito: top10Data?.tipo === 'MITO',
                isMico: top10Data?.tipo === 'MICO',
                top10Status: top10Data?.tipo || null,
                top10Posicao: top10Data?.posicao || null
            });
        }

        // 7. Exibir resumo
        console.log('\n' + '='.repeat(80));
        console.log('RESUMO DO EXTRATO RECONSTRUIDO');
        console.log('='.repeat(80));

        const ganhos = historicoTransacoes.reduce((acc, t) => acc + (t.saldo > 0 ? t.saldo : 0), 0);
        const perdas = historicoTransacoes.reduce((acc, t) => acc + (t.saldo < 0 ? t.saldo : 0), 0);

        console.log(`Rodadas: ${historicoTransacoes.length}`);
        console.log(`Saldo Final: R$ ${saldoAcumulado}`);
        console.log(`Ganhos: R$ ${ganhos}`);
        console.log(`Perdas: R$ ${perdas}`);

        console.log('\nAmostra de transacoes:');
        for (const t of historicoTransacoes.slice(0, 5)) {
            console.log(`  R${t.rodada}: pos=${t.posicao} B/O=${t.bonusOnus} PC=${t.pontosCorridos} MM=${t.mataMata} T10=${t.top10} => ${t.saldo} (acum: ${t.saldoAcumulado})`);
        }
        console.log('  ...');
        for (const t of historicoTransacoes.slice(-3)) {
            console.log(`  R${t.rodada}: pos=${t.posicao} B/O=${t.bonusOnus} PC=${t.pontosCorridos} MM=${t.mataMata} T10=${t.top10} => ${t.saldo} (acum: ${t.saldoAcumulado})`);
        }

        // 8. Atualizar no banco
        if (!dryRun) {
            console.log('\n[7] Atualizando no banco...');

            const result = await db.collection('extratofinanceirocaches').updateOne(
                {
                    liga_id: LIGA_SC,
                    time_id: TIME_ID,
                    temporada: TEMPORADA
                },
                {
                    $set: {
                        historico_transacoes: historicoTransacoes,
                        saldo_consolidado: saldoAcumulado,
                        ganhos_consolidados: ganhos,
                        perdas_consolidadas: perdas,
                        ultima_rodada_consolidada: 38,
                        versao_calculo: 'reconstruido-snapshots-2026-01-17',
                        data_ultima_atualizacao: new Date(),
                        metadados: {
                            versaoCalculo: '4.1.0-reconstruido',
                            timestampCalculo: new Date(),
                            motivoRecalculo: 'reconstrucao_snapshots',
                            origem: 'fix-extrato-paulinett-sc-2025.js'
                        },
                        migracao_modulos_2025: {
                            data: new Date(),
                            pc_adicionados: Object.keys(pcPorRodada).length,
                            mm_adicionados: Object.keys(mmPorRodada).length,
                            top10_adicionados: Object.keys(top10PorRodada).length,
                            versao: '3.1.0',
                            correcao: 'fix-extrato-paulinett-sc-2025.js'
                        }
                    }
                }
            );

            console.log(`    Documentos modificados: ${result.modifiedCount}`);
        }

        if (dryRun) {
            console.log('\n[AVISO] Modo DRY-RUN. Nenhum dado foi alterado.');
            console.log('Para executar: node scripts/fix-extrato-paulinett-sc-2025.js --execute');
        } else {
            console.log('\n[OK] Extrato reconstruido com sucesso!');
        }

    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
