// =====================================================================
// RECÁLCULO COMPLETO DOS EXTRATOS FINANCEIROS
// Integra: Banco (BONUS/ONUS) + Pontos Corridos + Mata-Mata + TOP10
// =====================================================================

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const LIGA_SUPERCARTOLA = "684cb1c8af923da7c7df51de";
const LIGA_SOBRAL = "684d821cf1a7ae16d1f89572";

// Tabelas TOP10
const VALORES_TOP10 = {
    [LIGA_SUPERCARTOLA]: {
        mitos: { 1: 30, 2: 28, 3: 26, 4: 24, 5: 22, 6: 20, 7: 18, 8: 16, 9: 14, 10: 12 },
        micos: { 1: -30, 2: -28, 3: -26, 4: -24, 5: -22, 6: -20, 7: -18, 8: -16, 9: -14, 10: -12 }
    },
    [LIGA_SOBRAL]: {
        mitos: { 1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 },
        micos: { 1: -10, 2: -9, 3: -8, 4: -7, 5: -6, 6: -5, 7: -4, 8: -3, 9: -2, 10: -1 }
    }
};

async function recalcularExtratosCompletos() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("=== RECÁLCULO COMPLETO DOS EXTRATOS ===\n");

    const ExtratoCache = mongoose.model("ExtratoCache", new mongoose.Schema({}, { strict: false }), "extratofinanceirocaches");
    const PCCache = mongoose.model("PCCache", new mongoose.Schema({}, { strict: false }), "pontoscorridoscaches");
    const Top10Cache = mongoose.model("Top10Cache", new mongoose.Schema({}, { strict: false }), "top10caches");
    const MMCache = mongoose.model("MMCache", new mongoose.Schema({}, { strict: false }), "matamatacaches");

    // Processar cada liga
    for (const ligaId of [LIGA_SUPERCARTOLA, LIGA_SOBRAL]) {
        const ligaNome = ligaId === LIGA_SUPERCARTOLA ? "SuperCartola" : "Sobral";
        console.log(`\n========== ${ligaNome} ==========`);

        // 1. Buscar todos os caches de extrato da liga (string ou ObjectId)
        const extratos = await ExtratoCache.find({
            $or: [
                { liga_id: ligaId },
                { liga_id: new mongoose.Types.ObjectId(ligaId) }
            ]
        }).lean();
        console.log(`Extratos encontrados: ${extratos.length}`);

        // 2. Buscar dados de Pontos Corridos (todas as rodadas)
        const pcDados = await PCCache.find({ liga_id: ligaId }).lean();
        console.log(`Pontos Corridos - rodadas: ${pcDados.length}`);

        // Indexar PC por rodada e timeId
        // Estrutura real: confrontos[{time1:{id,pontos}, time2:{id,pontos}, valor, tipo}]
        // tipo: "vitoria" (time com mais pontos) ou "empate"
        // Valores: V=+5, E=+3, D=-5, Goleada=+7/-7
        const pcPorRodadaTime = {};
        pcDados.forEach(pc => {
            pc.confrontos?.forEach(conf => {
                const t1 = conf.time1;
                const t2 = conf.time2;
                if (!t1?.id || !t2?.id) return;

                const rodada = pc.rodada_consolidada;
                const diferenca = conf.diferenca || Math.abs(t1.pontos - t2.pontos);
                const isGoleada = diferenca >= 30;

                // Determinar vencedor pelos pontos
                let vencedor, perdedor;
                if (t1.pontos > t2.pontos) {
                    vencedor = t1;
                    perdedor = t2;
                } else if (t2.pontos > t1.pontos) {
                    vencedor = t2;
                    perdedor = t1;
                }

                if (vencedor) {
                    // Vencedor
                    const keyV = `${rodada}_${vencedor.id}`;
                    pcPorRodadaTime[keyV] = {
                        rodada,
                        timeId: vencedor.id,
                        resultado: isGoleada ? "Goleada" : "Vitória",
                        valorFinanceiro: isGoleada ? 7 : 5,
                        adversario: perdedor.nome
                    };
                    // Perdedor
                    const keyP = `${rodada}_${perdedor.id}`;
                    pcPorRodadaTime[keyP] = {
                        rodada,
                        timeId: perdedor.id,
                        resultado: isGoleada ? "Goleada sofrida" : "Derrota",
                        valorFinanceiro: isGoleada ? -7 : -5,
                        adversario: vencedor.nome
                    };
                } else {
                    // Empate
                    const keyE1 = `${rodada}_${t1.id}`;
                    const keyE2 = `${rodada}_${t2.id}`;
                    pcPorRodadaTime[keyE1] = {
                        rodada,
                        timeId: t1.id,
                        resultado: "Empate",
                        valorFinanceiro: 3,
                        adversario: t2.nome
                    };
                    pcPorRodadaTime[keyE2] = {
                        rodada,
                        timeId: t2.id,
                        resultado: "Empate",
                        valorFinanceiro: 3,
                        adversario: t1.nome
                    };
                }
            });
        });
        console.log(`Pontos Corridos - registros indexados: ${Object.keys(pcPorRodadaTime).length}`);

        // 3. Buscar dados de TOP10 (mitos e micos históricos)
        // Estrutura: array de 10 melhores/piores pontuações do campeonato
        // Cada entrada tem {timeId, rodada, pontos}
        const top10 = await Top10Cache.findOne({ liga_id: ligaId }).lean();

        // Indexar por timeId (um time pode aparecer múltiplas vezes)
        const mitosPorTime = {}; // timeId -> [{posicao, rodada, pontos}]
        const micosPorTime = {};

        if (top10) {
            top10.mitos?.forEach((m, idx) => {
                if (m.timeId) {
                    if (!mitosPorTime[m.timeId]) mitosPorTime[m.timeId] = [];
                    mitosPorTime[m.timeId].push({
                        posicao: idx + 1,
                        rodada: m.rodada,
                        pontos: m.pontos
                    });
                }
            });
            top10.micos?.forEach((m, idx) => {
                if (m.timeId) {
                    if (!micosPorTime[m.timeId]) micosPorTime[m.timeId] = [];
                    micosPorTime[m.timeId].push({
                        posicao: idx + 1,
                        rodada: m.rodada,
                        pontos: m.pontos
                    });
                }
            });
        }
        const totalMitos = Object.values(mitosPorTime).flat().length;
        const totalMicos = Object.values(micosPorTime).flat().length;
        console.log(`TOP10 - Mitos: ${totalMitos}, Micos: ${totalMicos}`);

        // 4. Buscar dados de Mata-Mata
        const mmDados = await MMCache.find({ liga_id: ligaId }).lean();
        const mmPorRodadaTime = {};
        mmDados.forEach(mm => {
            Object.values(mm.fases || {}).forEach(fase => {
                fase.forEach(conf => {
                    // Processar time1 e time2
                    [
                        { time: conf.time1, oponente: conf.time2 },
                        { time: conf.time2, oponente: conf.time1 }
                    ].forEach(({ time, oponente }) => {
                        if (!time?.timeId || time.valorFinanceiro === undefined) return;

                        // Usar rodada do confronto se disponível
                        const rodada = conf.rodada || mm.rodada_inicio;
                        if (!rodada) return;

                        const key = `${rodada}_${time.timeId}`;
                        if (!mmPorRodadaTime[key]) {
                            mmPorRodadaTime[key] = {
                                rodada,
                                timeId: time.timeId,
                                valorFinanceiro: time.valorFinanceiro,
                                resultado: time.resultado,
                                adversario: oponente?.nome,
                                fase: conf.fase
                            };
                        }
                    });
                });
            });
        });
        console.log(`Mata-Mata - registros: ${Object.keys(mmPorRodadaTime).length}`);

        // 5. Recalcular cada extrato
        let atualizados = 0;
        for (const extrato of extratos) {
            const timeId = extrato.time_id;
            const transacoesAtuais = extrato.historico_transacoes || [];

            // Criar mapa das transações atuais (por rodada_tipo para evitar duplicatas)
            const transacoesMap = new Map();
            transacoesAtuais.forEach(t => {
                const key = `${t.rodada}_${t.tipo}`;
                transacoesMap.set(key, t);
            });

            let adicionadas = 0;

            // Adicionar Pontos Corridos
            for (let rodada = 1; rodada <= 38; rodada++) {
                const pcKey = `${rodada}_${timeId}`;
                const pc = pcPorRodadaTime[pcKey];
                if (pc && pc.valorFinanceiro !== 0) {
                    const transKey = `${rodada}_PONTOS_CORRIDOS`;
                    if (!transacoesMap.has(transKey)) {
                        transacoesMap.set(transKey, {
                            rodada,
                            tipo: "PONTOS_CORRIDOS",
                            descricao: `PC R${rodada}: ${pc.resultado} vs ${pc.adversario || 'N/D'}`,
                            valor: pc.valorFinanceiro,
                            data: new Date()
                        });
                        adicionadas++;
                    }
                }
            }

            // Adicionar TOP10 Mitos (do time atual)
            const mitosDoTime = mitosPorTime[timeId] || [];
            mitosDoTime.forEach(mito => {
                const valores = VALORES_TOP10[ligaId]?.mitos || {};
                const valor = valores[mito.posicao] || 0;
                if (valor !== 0) {
                    const transKey = `${mito.rodada}_MITO`;
                    if (!transacoesMap.has(transKey)) {
                        transacoesMap.set(transKey, {
                            rodada: mito.rodada,
                            tipo: "MITO",
                            descricao: `TOP10: ${mito.posicao}º Mito (${mito.pontos?.toFixed(2)} pts)`,
                            valor,
                            posicaoTop10: mito.posicao,
                            data: new Date()
                        });
                        adicionadas++;
                    }
                }
            });

            // Adicionar TOP10 Micos (do time atual)
            const micosDoTime = micosPorTime[timeId] || [];
            micosDoTime.forEach(mico => {
                const valores = VALORES_TOP10[ligaId]?.micos || {};
                const valor = valores[mico.posicao] || 0;
                if (valor !== 0) {
                    const transKey = `${mico.rodada}_MICO`;
                    if (!transacoesMap.has(transKey)) {
                        transacoesMap.set(transKey, {
                            rodada: mico.rodada,
                            tipo: "MICO",
                            descricao: `TOP10: ${mico.posicao}º Mico (${mico.pontos?.toFixed(2)} pts)`,
                            valor,
                            posicaoTop10: mico.posicao,
                            data: new Date()
                        });
                        adicionadas++;
                    }
                }
            });

            // Adicionar Mata-Mata
            for (let rodada = 1; rodada <= 38; rodada++) {
                const mmKey = `${rodada}_${timeId}`;
                const mm = mmPorRodadaTime[mmKey];
                if (mm && mm.valorFinanceiro !== 0) {
                    const transKey = `${rodada}_MATA_MATA`;
                    if (!transacoesMap.has(transKey)) {
                        transacoesMap.set(transKey, {
                            rodada,
                            tipo: "MATA_MATA",
                            descricao: `MM ${mm.fase || ''} R${rodada}: ${mm.resultado} vs ${mm.adversario || 'N/D'}`,
                            valor: mm.valorFinanceiro,
                            data: new Date()
                        });
                        adicionadas++;
                    }
                }
            }

            // Se adicionou algo, atualizar o cache
            if (adicionadas > 0) {
                const novasTransacoes = Array.from(transacoesMap.values())
                    .sort((a, b) => a.rodada - b.rodada);

                // Recalcular saldos
                let saldoTotal = 0;
                let ganhos = 0;
                let perdas = 0;
                novasTransacoes.forEach(t => {
                    saldoTotal += t.valor || 0;
                    if (t.valor > 0) ganhos += t.valor;
                    if (t.valor < 0) perdas += Math.abs(t.valor);
                });

                await ExtratoCache.updateOne(
                    { _id: extrato._id },
                    {
                        $set: {
                            historico_transacoes: novasTransacoes,
                            saldo_consolidado: saldoTotal,
                            ganhos_consolidados: ganhos,
                            perdas_consolidadas: perdas,
                            versao: "9.0.0-extrato-completo",
                            data_ultima_atualizacao: new Date()
                        }
                    }
                );
                atualizados++;
                console.log(`  ✅ Time ${timeId}: +${adicionadas} transações (total: ${novasTransacoes.length})`);
            }
        }

        console.log(`\n${ligaNome}: ${atualizados}/${extratos.length} extratos atualizados`);
    }

    await mongoose.disconnect();
    console.log("\n=== RECÁLCULO COMPLETO FINALIZADO ===");
}

recalcularExtratosCompletos().catch(console.error);
