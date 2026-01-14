/**
 * MIGRACAO UNICA - Integrar Modulos ao Extrato 2025
 *
 * Script de migracao para corrigir os caches de extrato financeiro 2025
 * integrando dados de Pontos Corridos, Mata-Mata e Top10.
 *
 * IMPORTANTE: Temporada 2025 e IMUTAVEL e HISTORICA.
 * Esta migracao e executada UMA UNICA VEZ para corrigir dados incompletos.
 *
 * O problema: Os caches de extrato foram criados com formato legado que
 * nao incluia os valores de PC, MM e Top10.
 *
 * A solucao: Ler dos caches de modulos e integrar ao extrato.
 *
 * Uso:
 *   node scripts/migrar-modulos-extrato-2025.js --dry-run  # Simular
 *   node scripts/migrar-modulos-extrato-2025.js --execute  # Executar
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de';
const TEMPORADA = 2025;

async function buscarDadosPontosCorridos(db) {
    console.log('\n[PC] Buscando dados de Pontos Corridos...');

    const pcCaches = await db.collection('pontoscorridoscaches')
        .find({ liga_id: new mongoose.Types.ObjectId(LIGA_ID) })
        .sort({ rodada_consolidada: 1 })
        .toArray();

    console.log(`[PC] Encontrados ${pcCaches.length} rodadas de PC`);

    // Mapear financeiro por rodada e time
    // PC inicia na rodada 7 do Brasileirao = rodada 1 do PC
    const pcPorTimeRodada = {};

    pcCaches.forEach(cache => {
        const rodadaPC = cache.rodada_consolidada;
        const rodadaBrasileirao = rodadaPC + 6; // PC rodada 1 = Brasileirao rodada 7

        (cache.classificacao || []).forEach(item => {
            const timeId = item.timeId || item.time_id;
            if (!timeId) return;

            const key = `${timeId}_${rodadaBrasileirao}`;
            pcPorTimeRodada[key] = {
                financeiro: item.financeiro || 0,
                rodadaPC,
                rodadaBrasileirao
            };
        });
    });

    const totalEntradas = Object.keys(pcPorTimeRodada).length;
    console.log(`[PC] Mapeadas ${totalEntradas} entradas (time_rodada)`);

    return pcPorTimeRodada;
}

async function buscarDadosMataMata(db) {
    console.log('\n[MM] Buscando dados de Mata-Mata...');

    // Buscar config de valores do MM
    const liga = await db.collection('ligas').findOne({ _id: new mongoose.Types.ObjectId(LIGA_ID) });
    const valorVitoria = liga?.configuracoes?.mata_mata?.valores?.vitoria || 10;
    const valorDerrota = liga?.configuracoes?.mata_mata?.valores?.derrota || -10;
    console.log(`[MM] Valores: vitoria=${valorVitoria}, derrota=${valorDerrota}`);

    const mmCaches = await db.collection('matamatacaches')
        .find({ liga_id: new mongoose.Types.ObjectId(LIGA_ID) })
        .toArray();

    console.log(`[MM] Encontrados ${mmCaches.length} registros de MM`);

    // Mapear resultados por time
    const mmPorTime = {};

    // Mapear rodada de cada edicao/fase
    const rodadaPorEdicaoFase = {
        // Edicao 1: R3-R6
        '1_primeira': 3, '1_oitavas': 4, '1_quartas': 5, '1_semis': 6, '1_final': 6,
        // Edicao 2: R10-R13
        '2_primeira': 10, '2_oitavas': 11, '2_quartas': 12, '2_semis': 13, '2_final': 13,
        // Edicao 3: R17-R20
        '3_primeira': 17, '3_oitavas': 18, '3_quartas': 19, '3_semis': 20, '3_final': 20,
        // Edicao 4: R24-R27
        '4_primeira': 24, '4_oitavas': 25, '4_quartas': 26, '4_semis': 27, '4_final': 27,
        // Edicao 5: R31-R34
        '5_primeira': 31, '5_oitavas': 32, '5_quartas': 33, '5_semis': 34, '5_final': 34
    };

    const fases = ['primeira', 'oitavas', 'quartas', 'semis', 'final'];

    mmCaches.forEach(cache => {
        const edicao = cache.edicao;
        if (!cache.dados_torneio) return;

        fases.forEach(fase => {
            const confrontos = cache.dados_torneio[fase];
            if (!confrontos || confrontos.length === 0) return;

            const rodadaKey = `${edicao}_${fase}`;
            const rodada = rodadaPorEdicaoFase[rodadaKey] || null;
            if (!rodada) return;

            confrontos.forEach(c => {
                const pontosA = c.timeA?.pontos || 0;
                const pontosB = c.timeB?.pontos || 0;
                const timeIdA = String(c.timeA?.timeId || c.timeA?.time_id);
                const timeIdB = String(c.timeB?.timeId || c.timeB?.time_id);

                // Determinar vencedor (maior pontuacao)
                let valorA = 0;
                let valorB = 0;
                if (pontosA > pontosB) {
                    valorA = valorVitoria;
                    valorB = valorDerrota;
                } else if (pontosB > pontosA) {
                    valorA = valorDerrota;
                    valorB = valorVitoria;
                }
                // Empate = ninguem ganha/perde

                // Time A
                if (timeIdA && timeIdA !== 'undefined' && valorA !== 0) {
                    if (!mmPorTime[timeIdA]) mmPorTime[timeIdA] = [];
                    mmPorTime[timeIdA].push({
                        rodada,
                        fase,
                        edicao,
                        valor: valorA
                    });
                }

                // Time B
                if (timeIdB && timeIdB !== 'undefined' && valorB !== 0) {
                    if (!mmPorTime[timeIdB]) mmPorTime[timeIdB] = [];
                    mmPorTime[timeIdB].push({
                        rodada,
                        fase,
                        edicao,
                        valor: valorB
                    });
                }
            });
        });
    });

    const totalTimes = Object.keys(mmPorTime).length;
    const totalResultados = Object.values(mmPorTime).reduce((acc, arr) => acc + arr.length, 0);
    console.log(`[MM] Mapeados ${totalResultados} resultados para ${totalTimes} times`);

    return mmPorTime;
}

async function buscarDadosTop10(db) {
    console.log('\n[T10] Buscando dados de Top10...');

    const top10Cache = await db.collection('top10caches')
        .findOne({ liga_id: LIGA_ID })

    if (!top10Cache) {
        console.log('[T10] Cache de Top10 nao encontrado');
        return { mitos: {}, micos: {} };
    }

    // Buscar config da liga para valores
    const liga = await db.collection('ligas').findOne({ _id: new mongoose.Types.ObjectId(LIGA_ID) });
    const valoresMito = liga?.configuracoes?.top10?.valores_mito || { '1': 30 };
    const valoresMico = liga?.configuracoes?.top10?.valores_mico || { '1': -30 };

    // Mapear mitos/micos por time e rodada
    const mitosPorTime = {};
    const micosPorTime = {};

    (top10Cache.mitos || []).forEach((mito, idx) => {
        const timeId = String(mito.timeId || mito.time_id);
        const posicao = idx + 1;
        const valor = valoresMito[posicao] || valoresMito[String(posicao)] || 0;

        if (!mitosPorTime[timeId]) mitosPorTime[timeId] = [];
        mitosPorTime[timeId].push({
            rodada: mito.rodada,
            posicao,
            valor
        });
    });

    (top10Cache.micos || []).forEach((mico, idx) => {
        const timeId = String(mico.timeId || mico.time_id);
        const posicao = idx + 1;
        const valor = valoresMico[posicao] || valoresMico[String(posicao)] || 0;

        if (!micosPorTime[timeId]) micosPorTime[timeId] = [];
        micosPorTime[timeId].push({
            rodada: mico.rodada,
            posicao,
            valor
        });
    });

    console.log(`[T10] Mapeados ${Object.keys(mitosPorTime).length} times com mitos`);
    console.log(`[T10] Mapeados ${Object.keys(micosPorTime).length} times com micos`);

    return { mitos: mitosPorTime, micos: micosPorTime };
}

async function migrarExtratos(db, pcData, mmData, top10Data, dryRun) {
    console.log('\n' + '='.repeat(80));
    console.log('MIGRACAO DE EXTRATOS 2025');
    console.log('='.repeat(80));

    // Buscar todos os caches de extrato 2025
    const extratos = await db.collection('extratofinanceirocaches')
        .find({
            liga_id: LIGA_ID,
            temporada: TEMPORADA
        })
        .toArray();

    console.log(`\nExtratos encontrados: ${extratos.length}`);

    let atualizados = 0;
    let semAlteracao = 0;
    let erros = 0;
    const resultados = [];

    for (const extrato of extratos) {
        const timeId = String(extrato.time_id);

        try {
            // Buscar nome do time
            const time = await db.collection('times').findOne({ id: Number(timeId) });
            const nomeTime = time?.nome_time || time?.nome_cartola || `Time ${timeId}`;

            // Processar historico_transacoes
            const historicoAtualizado = [];
            let saldoAcumulado = 0;
            let totalPCAdicionado = 0;
            let totalMMAdicionado = 0;
            let totalTop10Adicionado = 0;

            // Ordenar transacoes por rodada
            const transacoes = (extrato.historico_transacoes || []).sort((a, b) => a.rodada - b.rodada);

            // Buscar dados de MM para este time
            const mmDoTime = mmData[timeId] || [];
            const mitosDoTime = top10Data.mitos[timeId] || [];
            const micosDoTime = top10Data.micos[timeId] || [];

            for (const t of transacoes) {
                const rodada = t.rodada;

                // Valor atual de bonusOnus
                const bonusOnus = t.bonusOnus || 0;

                // Buscar PC para esta rodada
                const pcKey = `${timeId}_${rodada}`;
                const pcDados = pcData[pcKey];
                const pontosCorridos = pcDados?.financeiro || 0;
                if (pontosCorridos !== 0) totalPCAdicionado++;

                // Buscar MM para esta rodada (pode ter multiplos por rodada)
                const mmDaRodada = mmDoTime.filter(m => m.rodada === rodada);
                const mataMata = mmDaRodada.reduce((acc, m) => acc + (m.valor || 0), 0);
                if (mataMata !== 0) totalMMAdicionado++;

                // Buscar Top10 para esta rodada
                const mitosDaRodada = mitosDoTime.filter(m => m.rodada === rodada);
                const micosDaRodada = micosDoTime.filter(m => m.rodada === rodada);
                let top10 = 0;
                let isMito = false;
                let isMico = false;
                let top10Status = null;
                let top10Posicao = null;

                if (mitosDaRodada.length > 0) {
                    top10 = mitosDaRodada[0].valor;
                    isMito = true;
                    top10Status = 'MITO';
                    top10Posicao = mitosDaRodada[0].posicao;
                    totalTop10Adicionado++;
                } else if (micosDaRodada.length > 0) {
                    top10 = micosDaRodada[0].valor;
                    isMico = true;
                    top10Status = 'MICO';
                    top10Posicao = micosDaRodada[0].posicao;
                    totalTop10Adicionado++;
                }

                // Calcular saldo da rodada
                const saldo = bonusOnus + pontosCorridos + mataMata + top10;
                saldoAcumulado += saldo;

                historicoAtualizado.push({
                    rodada,
                    posicao: t.posicao || null,
                    bonusOnus,
                    pontosCorridos,
                    mataMata,
                    top10,
                    saldo,
                    saldoAcumulado,
                    isMito,
                    isMico,
                    top10Status,
                    top10Posicao
                });
            }

            // Verificar se houve alteracao significativa
            const houveMudanca = totalPCAdicionado > 0 || totalMMAdicionado > 0 || totalTop10Adicionado > 0;

            if (!houveMudanca) {
                semAlteracao++;
                continue;
            }

            // Atualizar no banco (se nao for dry-run)
            if (!dryRun) {
                await db.collection('extratofinanceirocaches').updateOne(
                    { _id: extrato._id },
                    {
                        $set: {
                            historico_transacoes: historicoAtualizado,
                            saldo_consolidado: saldoAcumulado,
                            migracao_modulos_2025: {
                                data: new Date(),
                                pc_adicionados: totalPCAdicionado,
                                mm_adicionados: totalMMAdicionado,
                                top10_adicionados: totalTop10Adicionado,
                                versao: '1.0.0'
                            }
                        }
                    }
                );
            }

            const nomeFormatado = nomeTime.substring(0, 20).padEnd(20);
            console.log(
                `${dryRun ? '[DRY]' : '[OK] '} ${nomeFormatado} | ` +
                `PC:+${totalPCAdicionado} MM:+${totalMMAdicionado} T10:+${totalTop10Adicionado} | ` +
                `Saldo: R$ ${saldoAcumulado}`
            );

            atualizados++;
            resultados.push({
                timeId,
                nomeTime,
                saldo: saldoAcumulado,
                pc: totalPCAdicionado,
                mm: totalMMAdicionado,
                top10: totalTop10Adicionado
            });

        } catch (error) {
            console.log(`[ERR] Time ${timeId}: ${error.message}`);
            erros++;
        }
    }

    // Resumo
    console.log('\n' + '='.repeat(80));
    console.log('RESUMO DA MIGRACAO');
    console.log('='.repeat(80));
    console.log(`Modo: ${dryRun ? 'DRY-RUN (simulacao)' : 'EXECUCAO REAL'}`);
    console.log(`Total extratos: ${extratos.length}`);
    console.log(`Atualizados: ${atualizados}`);
    console.log(`Sem alteracao: ${semAlteracao}`);
    console.log(`Erros: ${erros}`);

    if (resultados.length > 0) {
        // Top 5 saldos positivos e negativos
        resultados.sort((a, b) => b.saldo - a.saldo);

        console.log('\nTOP 5 CREDORES (apos migracao):');
        resultados.slice(0, 5).forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.nomeTime}: R$ ${r.saldo}`);
        });

        console.log('\nTOP 5 DEVEDORES (apos migracao):');
        resultados.slice(-5).reverse().forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.nomeTime}: R$ ${r.saldo}`);
        });
    }

    if (dryRun) {
        console.log('\n[AVISO] Executado em modo DRY-RUN. Nenhum dado foi alterado.');
        console.log('Para executar de verdade, use: node scripts/migrar-modulos-extrato-2025.js --execute');
    }
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--execute');

    if (!dryRun && !args.includes('--confirm')) {
        console.log('ATENCAO: Este script vai MODIFICAR dados HISTORICOS da temporada 2025.');
        console.log('Esta e uma migracao UNICA para corrigir dados incompletos.');
        console.log('\nPara confirmar, execute com: node scripts/migrar-modulos-extrato-2025.js --execute');
        console.log('Para simular, execute com:   node scripts/migrar-modulos-extrato-2025.js --dry-run');
        process.exit(0);
    }

    console.log('='.repeat(80));
    console.log('MIGRACAO: INTEGRAR MODULOS AO EXTRATO FINANCEIRO 2025');
    console.log('='.repeat(80));
    console.log(`Liga: ${LIGA_ID}`);
    console.log(`Temporada: ${TEMPORADA}`);
    console.log(`Modo: ${dryRun ? 'DRY-RUN' : 'EXECUCAO REAL'}`);

    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    try {
        // 1. Buscar dados de Pontos Corridos
        const pcData = await buscarDadosPontosCorridos(db);

        // 2. Buscar dados de Mata-Mata
        const mmData = await buscarDadosMataMata(db);

        // 3. Buscar dados de Top10
        const top10Data = await buscarDadosTop10(db);

        // 4. Migrar extratos
        await migrarExtratos(db, pcData, mmData, top10Data, dryRun);

    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
