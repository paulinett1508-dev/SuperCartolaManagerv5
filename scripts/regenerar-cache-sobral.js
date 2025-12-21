/**
 * REGENERAR CACHE DE EXTRATO - Liga Cartoleiros do Sobral
 *
 * Script para reconstruir os caches de extrato financeiro a partir dos snapshots
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExtratoFinanceiroCache from '../models/ExtratoFinanceiroCache.js';
import RodadaSnapshot from '../models/RodadaSnapshot.js';
import Liga from '../models/Liga.js';

dotenv.config();

const LIGA_SOBRAL_ID = '684d821cf1a7ae16d1f89572';

async function regenerarCaches() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.log('URI do MongoDB não encontrada');
        return;
    }

    await mongoose.connect(uri);
    console.log('=== REGENERAR CACHES - Liga Cartoleiros do Sobral ===\n');

    try {
        // 1. Buscar liga
        const liga = await Liga.findById(LIGA_SOBRAL_ID).lean();
        if (!liga) {
            console.log('Liga não encontrada!');
            return;
        }
        console.log(`Liga: ${liga.nome}`);
        console.log(`Participantes: ${liga.participantes.length}`);

        // 2. Buscar todos os snapshots da liga
        const snapshots = await RodadaSnapshot.find({ liga_id: LIGA_SOBRAL_ID }).sort({ rodada: 1 }).lean();
        console.log(`Snapshots encontrados: ${snapshots.length}`);

        if (snapshots.length === 0) {
            console.log('Nenhum snapshot encontrado!');
            return;
        }

        // 3. Limpar caches antigos da liga
        const deletados = await ExtratoFinanceiroCache.deleteMany({
            $or: [
                { liga_id: LIGA_SOBRAL_ID },
                { liga_id: new mongoose.Types.ObjectId(LIGA_SOBRAL_ID) }
            ]
        });
        console.log(`Caches antigos removidos: ${deletados.deletedCount}`);

        // 4. Para cada participante, reconstruir o cache
        const ligaIdObj = new mongoose.Types.ObjectId(LIGA_SOBRAL_ID);

        for (const participante of liga.participantes) {
            const timeId = participante.time_id;
            console.log(`\n--- Processando: ${participante.nome_time} (${timeId}) ---`);

            // Coletar todas as transações do histórico de snapshots
            const historicoTransacoes = [];
            let saldoConsolidado = 0;
            let ganhosConsolidados = 0;
            let perdasConsolidadas = 0;

            for (const snapshot of snapshots) {
                const rodada = snapshot.rodada;

                // Buscar extrato do participante neste snapshot
                const extratosSnap = snapshot.dados_consolidados?.extratos_financeiros || [];
                const extratoTime = extratosSnap.find(e =>
                    String(e.time_id) === String(timeId) ||
                    String(e.timeId) === String(timeId)
                );

                if (extratoTime) {
                    // Buscar transação mais recente (desta rodada)
                    const transRodada = extratoTime.historico_transacoes?.find(t => t.rodada === rodada);

                    if (transRodada) {
                        // Adicionar transação ao histórico
                        historicoTransacoes.push({
                            rodada: transRodada.rodada,
                            posicao: transRodada.posicao || null,
                            bonusOnus: transRodada.bonusOnus || 0,
                            pontosCorridos: transRodada.pontosCorridos || 0,
                            mataMata: transRodada.mataMata || 0,
                            top10: transRodada.top10 || 0,
                            saldo: transRodada.saldo || 0,
                            saldoAcumulado: transRodada.saldoAcumulado || 0,
                            isMito: transRodada.isMito || false,
                            isMico: transRodada.isMico || false,
                            top10Status: transRodada.top10Status || null,
                            top10Posicao: transRodada.top10Posicao || null,
                        });

                        const saldo = transRodada.saldo || 0;
                        saldoConsolidado = transRodada.saldoAcumulado || saldoConsolidado + saldo;
                        if (saldo > 0) ganhosConsolidados += saldo;
                        if (saldo < 0) perdasConsolidadas += saldo;
                    }
                }

                // Também buscar no times_stats
                const timesStats = snapshot.dados_consolidados?.times_stats || [];
                const statTime = timesStats.find(t =>
                    String(t.time_id) === String(timeId) ||
                    String(t.timeId) === String(timeId)
                );

                // Se não encontrou no extratos_financeiros, tentar construir do times_stats
                if (!extratoTime && statTime && !historicoTransacoes.find(t => t.rodada === rodada)) {
                    const saldo = (statTime.bonusOnus || 0) + (statTime.pontosCorridos || 0) +
                                  (statTime.mataMata || 0) + (statTime.top10 || 0);

                    if (saldo !== 0 || statTime.posicao) {
                        historicoTransacoes.push({
                            rodada: rodada,
                            posicao: statTime.posicao || null,
                            bonusOnus: statTime.bonusOnus || 0,
                            pontosCorridos: statTime.pontosCorridos || 0,
                            mataMata: statTime.mataMata || 0,
                            top10: statTime.top10 || 0,
                            saldo: saldo,
                            saldoAcumulado: 0, // Será recalculado
                            isMito: false,
                            isMico: false,
                            top10Status: null,
                            top10Posicao: null,
                        });
                    }
                }
            }

            // Recalcular saldos acumulados
            let acumulado = 0;
            historicoTransacoes.sort((a, b) => a.rodada - b.rodada);
            for (const t of historicoTransacoes) {
                acumulado += t.saldo;
                t.saldoAcumulado = acumulado;
            }

            saldoConsolidado = acumulado;
            ganhosConsolidados = historicoTransacoes.filter(t => t.saldo > 0).reduce((acc, t) => acc + t.saldo, 0);
            perdasConsolidadas = historicoTransacoes.filter(t => t.saldo < 0).reduce((acc, t) => acc + t.saldo, 0);

            console.log(`  Transações: ${historicoTransacoes.length}`);
            console.log(`  Saldo: R$ ${saldoConsolidado.toFixed(2)}`);

            // Criar novo cache
            if (historicoTransacoes.length > 0) {
                const novoCache = new ExtratoFinanceiroCache({
                    liga_id: ligaIdObj, // ObjectId
                    time_id: timeId, // Number
                    temporada: 2025,
                    ultima_rodada_consolidada: 38,
                    cache_permanente: true,
                    versao_calculo: '4.0.0',
                    rodadas_imutaveis: [],
                    saldo_consolidado: saldoConsolidado,
                    ganhos_consolidados: ganhosConsolidados,
                    perdas_consolidadas: perdasConsolidadas,
                    historico_transacoes: historicoTransacoes,
                    data_ultima_atualizacao: new Date(),
                    metadados: {
                        versaoCalculo: '4.0.0',
                        timestampCalculo: new Date(),
                        motivoRecalculo: 'regeneracao_via_script'
                    }
                });

                await novoCache.save();
                console.log(`  ✅ Cache criado com sucesso!`);
            } else {
                console.log(`  ⚠️ Sem transações para criar cache`);
            }
        }

        // 5. Verificar caches criados
        const cachesNovos = await ExtratoFinanceiroCache.countDocuments({ liga_id: ligaIdObj });
        console.log(`\n=== RESULTADO ===`);
        console.log(`Caches criados: ${cachesNovos}`);

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await mongoose.disconnect();
    }
}

regenerarCaches();
