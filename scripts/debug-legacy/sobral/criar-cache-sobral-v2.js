/**
 * CRIAR CACHE DE EXTRATO - Liga Cartoleiros do Sobral v2
 *
 * Usa os dados de times_stats dos snapshots para reconstruir
 * os caches de extrato de forma simples.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExtratoFinanceiroCache from '../models/ExtratoFinanceiroCache.js';
import RodadaSnapshot from '../models/RodadaSnapshot.js';
import Liga from '../models/Liga.js';
import Rodada from '../models/Rodada.js';
import Top10Cache from '../models/Top10Cache.js';

dotenv.config();

const LIGA_SOBRAL_ID = '684d821cf1a7ae16d1f89572';

async function criarCaches() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);

    console.log('=== CRIAR CACHES v2 - Liga Cartoleiros do Sobral ===\n');

    try {
        // 1. Buscar liga com configurações
        const liga = await Liga.findById(LIGA_SOBRAL_ID);
        if (!liga) {
            console.log('Liga não encontrada!');
            return;
        }
        console.log(`Liga: ${liga.nome}`);
        console.log(`Participantes: ${liga.participantes.length}`);
        console.log('Configurações de ranking_rodada:', !!liga.configuracoes?.ranking_rodada);

        // Configuração de ranking da liga
        const configRanking = liga.configuracoes?.ranking_rodada;
        console.log('Config temporal:', configRanking?.temporal);
        console.log('Rodada transição:', configRanking?.rodada_transicao);

        // 2. Limpar caches antigos
        const ligaIdObj = new mongoose.Types.ObjectId(LIGA_SOBRAL_ID);
        const deletados = await ExtratoFinanceiroCache.deleteMany({
            $or: [
                { liga_id: LIGA_SOBRAL_ID },
                { liga_id: ligaIdObj }
            ]
        });
        console.log(`\nCaches antigos removidos: ${deletados.deletedCount}`);

        // 3. Buscar todas as rodadas da liga
        const rodadasPontos = await Rodada.find({ ligaId: LIGA_SOBRAL_ID }).sort({ rodada: 1 }).lean();
        console.log(`Rodadas encontradas: ${rodadasPontos.length}`);

        // Agrupar pontuações por rodada
        const pontuacoesPorRodada = {};
        rodadasPontos.forEach(r => {
            if (!pontuacoesPorRodada[r.rodada]) {
                pontuacoesPorRodada[r.rodada] = [];
            }
            pontuacoesPorRodada[r.rodada].push({
                timeId: r.timeId,
                pontos: r.pontos,
                nome_time: r.nome_time
            });
        });

        const rodadasDisponiveis = Object.keys(pontuacoesPorRodada).map(Number).sort((a, b) => a - b);
        console.log(`Rodadas com dados: ${rodadasDisponiveis.join(', ')}`);

        // 4. Buscar configuração de TOP10
        const configTop10 = liga.configuracoes?.top10;
        console.log('TOP10 habilitado:', configTop10?.habilitado);

        // 5. Para cada participante, calcular o extrato
        for (const participante of liga.participantes) {
            const timeId = participante.time_id;
            const isInativo = participante.ativo === false;
            const rodadaDesistencia = participante.rodada_desistencia;

            console.log(`\n--- ${participante.nome_time} (${timeId}) ${isInativo ? `[INATIVO R${rodadaDesistencia}]` : ''} ---`);

            const historicoTransacoes = [];
            let saldoAcumulado = 0;

            for (const numRodada of rodadasDisponiveis) {
                // Se inativo, parar antes da rodada de desistência
                if (isInativo && rodadaDesistencia && numRodada >= rodadaDesistencia) {
                    continue;
                }

                const pontuacoes = pontuacoesPorRodada[numRodada] || [];
                const ranking = [...pontuacoes].sort((a, b) => b.pontos - a.pontos);
                const posicao = ranking.findIndex(p => String(p.timeId) === String(timeId)) + 1;

                if (posicao === 0) continue; // Time não jogou essa rodada

                // Calcular BANCO (bônus/ônus)
                let bonusOnus = 0;
                if (configRanking) {
                    let valores;
                    if (configRanking.temporal) {
                        const fase = numRodada < (configRanking.rodada_transicao || 30) ? 'fase1' : 'fase2';
                        valores = configRanking[fase]?.valores || {};
                    } else {
                        valores = configRanking.valores || {};
                    }
                    bonusOnus = valores[posicao] || valores[String(posicao)] || 0;
                }

                const saldoRodada = bonusOnus;
                saldoAcumulado += saldoRodada;

                if (saldoRodada !== 0 || posicao > 0) {
                    historicoTransacoes.push({
                        rodada: numRodada,
                        posicao: posicao,
                        bonusOnus: bonusOnus,
                        pontosCorridos: 0,
                        mataMata: 0,
                        top10: 0,
                        saldo: saldoRodada,
                        saldoAcumulado: saldoAcumulado,
                        isMito: false,
                        isMico: false,
                        top10Status: null,
                        top10Posicao: null,
                    });
                }
            }

            // Calcular TOP10 histórico
            if (configTop10?.habilitado) {
                // Buscar cache de TOP10 da liga
                const top10Data = await Top10Cache.findOne({ liga_id: String(LIGA_SOBRAL_ID) })
                    .sort({ rodada_consolidada: -1 }).lean();

                if (top10Data) {
                    // Mitos
                    top10Data.mitos?.slice(0, 10).forEach((m, idx) => {
                        if (String(m.timeId || m.time_id) === String(timeId)) {
                            const pos = idx + 1;
                            const valor = configTop10.valores_mito?.[pos] || configTop10.valores_mito?.[String(pos)] || 0;
                            if (valor !== 0) {
                                // Atualizar a rodada correspondente
                                const trans = historicoTransacoes.find(t => t.rodada === m.rodada);
                                if (trans) {
                                    trans.top10 = valor;
                                    trans.isMito = true;
                                    trans.top10Status = 'MITO';
                                    trans.top10Posicao = pos;
                                    trans.saldo += valor;
                                    // Recalcular acumulado a partir desta rodada
                                }
                                console.log(`  MITO R${m.rodada}: +R$ ${valor}`);
                            }
                        }
                    });

                    // Micos
                    top10Data.micos?.slice(0, 10).forEach((m, idx) => {
                        if (String(m.timeId || m.time_id) === String(timeId)) {
                            const pos = idx + 1;
                            const valor = configTop10.valores_mico?.[pos] || configTop10.valores_mico?.[String(pos)] || 0;
                            if (valor !== 0) {
                                const trans = historicoTransacoes.find(t => t.rodada === m.rodada);
                                if (trans) {
                                    trans.top10 = valor;
                                    trans.isMico = true;
                                    trans.top10Status = 'MICO';
                                    trans.top10Posicao = pos;
                                    trans.saldo += valor;
                                }
                                console.log(`  MICO R${m.rodada}: R$ ${valor}`);
                            }
                        }
                    });
                }
            }

            // Recalcular saldos acumulados
            let acumulado = 0;
            let ganhos = 0;
            let perdas = 0;
            for (const t of historicoTransacoes) {
                acumulado += t.saldo;
                t.saldoAcumulado = acumulado;
                if (t.saldo > 0) ganhos += t.saldo;
                if (t.saldo < 0) perdas += t.saldo;
            }

            console.log(`  Transações: ${historicoTransacoes.length}`);
            console.log(`  Saldo: R$ ${acumulado}`);

            // Criar cache
            if (historicoTransacoes.length > 0) {
                const novoCache = new ExtratoFinanceiroCache({
                    liga_id: ligaIdObj,
                    time_id: timeId,
                    temporada: 2025,
                    ultima_rodada_consolidada: 38,
                    cache_permanente: true,
                    versao_calculo: '4.0.0',
                    saldo_consolidado: acumulado,
                    ganhos_consolidados: ganhos,
                    perdas_consolidadas: perdas,
                    historico_transacoes: historicoTransacoes,
                    data_ultima_atualizacao: new Date(),
                    metadados: {
                        versaoCalculo: '4.0.0',
                        timestampCalculo: new Date(),
                        motivoRecalculo: 'regeneracao_script_v2'
                    }
                });

                await novoCache.save();
                console.log(`  ✅ Cache criado!`);
            }
        }

        // 6. Verificar resultado
        const cachesNovos = await ExtratoFinanceiroCache.find({ liga_id: ligaIdObj }).lean();
        console.log(`\n=== RESULTADO ===`);
        console.log(`Caches criados: ${cachesNovos.length}`);
        cachesNovos.forEach(c => {
            console.log(`  ${c.time_id}: ${c.historico_transacoes.length} transações, saldo R$ ${c.saldo_consolidado}`);
        });

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await mongoose.disconnect();
    }
}

criarCaches();
