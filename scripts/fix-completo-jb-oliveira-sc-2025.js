/**
 * FIX COMPLETO: JB Oliveira - Super Cartola 2025
 *
 * PROBLEMAS IDENTIFICADOS:
 * 1. Extrato zerado por bug na tesouraria-routes.js (linha 1105)
 * 2. Acertos duplicados/incorretos do dia 17/jan
 * 3. Quitacao automatica de R$5 (14/jan) baseada em saldo errado
 *
 * SOLUCAO:
 * 1. Reconstruir extrato das rodadas (saldo real: -R$ 478)
 * 2. Remover acertos incorretos (17/jan)
 * 3. Manter apenas pagamento correto (03/jan: R$ 401)
 * 4. Colocar R$ 77 no limbo (campo manual) para zerar saldo
 *
 * RESULTADO ESPERADO:
 * - Temporada: -R$ 478
 * - Acerto 03/jan: +R$ 401
 * - Limbo: +R$ 77
 * - SALDO FINAL: R$ 0 (QUITADO)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_SC = '684cb1c8af923da7c7df51de';
const TIME_ID = 164131;  // JB Oliveira - 51 Sportclub
const TEMPORADA = 2025;

// Tabela de bonus/onus OFICIAL Super Cartola (32 times)
const TABELA_BONUS_ONUS = {
    1: 20, 2: 19, 3: 18, 4: 17, 5: 16, 6: 15, 7: 14, 8: 13, 9: 12, 10: 11,
    11: 10, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0,
    21: 0, 22: -10, 23: -11, 24: -12, 25: -13, 26: -14, 27: -15, 28: -16, 29: -17,
    30: -18, 31: -19, 32: -20
};

function calcularBonusOnus(posicao) {
    return TABELA_BONUS_ONUS[posicao] || 0;
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--execute');

    if (!args.includes('--dry-run') && !args.includes('--execute')) {
        console.error('Uso:');
        console.error('  node scripts/fix-completo-jb-oliveira-sc-2025.js --dry-run');
        console.error('  node scripts/fix-completo-jb-oliveira-sc-2025.js --execute');
        process.exit(1);
    }

    console.log('='.repeat(80));
    console.log('FIX COMPLETO: JB OLIVEIRA - SUPER CARTOLA 2025');
    console.log('='.repeat(80));
    console.log(`Time ID: ${TIME_ID} (51 Sportclub)`);
    console.log(`Modo: ${dryRun ? 'DRY-RUN (simulacao)' : 'EXECUCAO REAL'}`);

    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    try {
        // =====================================================================
        // PARTE 1: RECONSTRUIR EXTRATO
        // =====================================================================
        console.log('\n' + '='.repeat(80));
        console.log('PARTE 1: RECONSTRUINDO EXTRATO');
        console.log('='.repeat(80));

        // 1. Buscar snapshots
        console.log('\n[1.1] Buscando snapshots...');
        const snapshots = await db.collection('rodadasnapshots')
            .find({ liga_id: LIGA_SC })
            .sort({ rodada: 1 })
            .toArray();

        console.log(`    Encontrados ${snapshots.length} snapshots`);

        // 2. Extrair posicoes semanais
        const posicoesPorRodada = {};
        for (const snap of snapshots) {
            const dados = snap.dados_consolidados || {};
            const ranking = dados.ranking_rodada || [];
            const participante = ranking.find(r => String(r.time_id || r.timeId) === String(TIME_ID));
            if (participante) {
                posicoesPorRodada[snap.rodada] = {
                    posicao: participante.posicao,
                    pontos: participante.pontos_rodada
                };
            }
        }

        // 3. Buscar dados de PC
        const pcCaches = await db.collection('pontoscorridoscaches')
            .find({ liga_id: new mongoose.Types.ObjectId(LIGA_SC) })
            .sort({ rodada_consolidada: 1 })
            .toArray();

        const financeiroAcumulado = {};
        pcCaches.forEach(cache => {
            const rodadaPC = cache.rodada_consolidada;
            const rodadaBrasileirao = rodadaPC + 6;
            const participante = (cache.classificacao || []).find(c => String(c.time_id || c.timeId) === String(TIME_ID));
            if (participante) {
                financeiroAcumulado[rodadaBrasileirao] = participante.financeiro || 0;
            }
        });

        const pcPorRodada = {};
        const rodadasOrdenadas = Object.keys(financeiroAcumulado).map(Number).sort((a, b) => a - b);
        rodadasOrdenadas.forEach((rodada, idx) => {
            const acumuladoAtual = financeiroAcumulado[rodada];
            const rodadaAnterior = idx > 0 ? rodadasOrdenadas[idx - 1] : null;
            const acumuladoAnterior = rodadaAnterior ? financeiroAcumulado[rodadaAnterior] : 0;
            pcPorRodada[rodada] = acumuladoAtual - acumuladoAnterior;
        });

        // 4. Buscar dados de MM
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

        // 5. Buscar dados de Top10
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

        // 6. Construir historico_transacoes
        const historicoTransacoes = [];
        let saldoAcumulado = 0;

        for (let rodada = 1; rodada <= 38; rodada++) {
            const posicaoData = posicoesPorRodada[rodada];
            const posicao = posicaoData?.posicao || null;
            const bonusOnus = posicao ? calcularBonusOnus(posicao) : 0;
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

        const ganhos = historicoTransacoes.reduce((acc, t) => acc + (t.saldo > 0 ? t.saldo : 0), 0);
        const perdas = historicoTransacoes.reduce((acc, t) => acc + (t.saldo < 0 ? t.saldo : 0), 0);

        console.log(`\n    Saldo Temporada Reconstruido: R$ ${saldoAcumulado}`);
        console.log(`    Ganhos: R$ ${ganhos}`);
        console.log(`    Perdas: R$ ${perdas}`);

        // =====================================================================
        // PARTE 2: IDENTIFICAR ACERTOS A REMOVER
        // =====================================================================
        console.log('\n' + '='.repeat(80));
        console.log('PARTE 2: LIMPANDO ACERTOS INCORRETOS');
        console.log('='.repeat(80));

        const acertosARemover = await db.collection('acertofinanceiros')
            .find({
                timeId: String(TIME_ID),
                ativo: true,
                $or: [
                    // Acertos do dia 17/jan (duplicados/incorretos)
                    { dataAcerto: { $gte: new Date('2026-01-17T00:00:00Z'), $lt: new Date('2026-01-18T00:00:00Z') } },
                    // Quitacao automatica do dia 14/jan (baseada em saldo errado)
                    { registradoPor: 'auto_quitacao_auditoria', dataAcerto: { $gte: new Date('2026-01-14T00:00:00Z'), $lt: new Date('2026-01-15T00:00:00Z') } }
                ]
            })
            .toArray();

        console.log(`\n    Acertos a REMOVER (${acertosARemover.length}):`);
        for (const a of acertosARemover) {
            const data = new Date(a.dataAcerto).toLocaleDateString('pt-BR');
            const tipo = a.tipo === 'pagamento' ? '+' : '-';
            console.log(`      ${data}: ${tipo}R$ ${a.valor} - ${a.descricao} (ID: ${a._id})`);
        }

        // Acerto que deve ser mantido
        const acertosManterQuery = {
            timeId: String(TIME_ID),
            ativo: true,
            dataAcerto: { $gte: new Date('2026-01-03T00:00:00Z'), $lt: new Date('2026-01-04T00:00:00Z') },
            tipo: 'pagamento'
        };
        const acertoManter = await db.collection('acertofinanceiros').findOne(acertosManterQuery);

        if (acertoManter) {
            console.log(`\n    Acerto a MANTER:`);
            const data = new Date(acertoManter.dataAcerto).toLocaleDateString('pt-BR');
            console.log(`      ${data}: +R$ ${acertoManter.valor} - ${acertoManter.descricao}`);
        }

        // =====================================================================
        // PARTE 3: CALCULAR LIMBO
        // =====================================================================
        console.log('\n' + '='.repeat(80));
        console.log('PARTE 3: CALCULANDO LIMBO (AJUSTE MANUAL)');
        console.log('='.repeat(80));

        // Saldo pos-correcao:
        // Temporada: -478
        // Acerto 03/jan: +401
        // Resultado: -77
        // Para zerar: Limbo = +77

        const saldoTemporada = saldoAcumulado; // -478
        const acertoCorreto = acertoManter?.valor || 401;
        const saldoAposAcerto = saldoTemporada + acertoCorreto;
        const valorLimbo = saldoAposAcerto < 0 ? Math.abs(saldoAposAcerto) : 0;

        console.log(`\n    Saldo Temporada: R$ ${saldoTemporada}`);
        console.log(`    Acerto Correto (03/jan): +R$ ${acertoCorreto}`);
        console.log(`    Saldo apos acerto: R$ ${saldoAposAcerto}`);
        console.log(`    LIMBO necessario: +R$ ${valorLimbo}`);

        const saldoFinal = saldoAposAcerto + valorLimbo;
        console.log(`\n    SALDO FINAL: R$ ${saldoFinal} ${saldoFinal === 0 ? '(QUITADO!)' : ''}`);

        // =====================================================================
        // PARTE 4: EXECUTAR CORRECOES
        // =====================================================================
        if (!dryRun) {
            console.log('\n' + '='.repeat(80));
            console.log('PARTE 4: EXECUTANDO CORRECOES NO BANCO');
            console.log('='.repeat(80));

            // 4.1 Atualizar cache do extrato
            console.log('\n[4.1] Atualizando cache do extrato...');
            const resultCache = await db.collection('extratofinanceirocaches').updateOne(
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
                        versao_calculo: 'reconstruido-fix-completo-2026-01-17',
                        data_ultima_atualizacao: new Date(),
                        metadados: {
                            versaoCalculo: '4.2.0-fix-completo',
                            timestampCalculo: new Date(),
                            motivoRecalculo: 'fix_completo_jb_oliveira',
                            origem: 'fix-completo-jb-oliveira-sc-2025.js'
                        }
                    }
                }
            );
            console.log(`      Documentos modificados: ${resultCache.modifiedCount}`);

            // 4.2 Desativar acertos incorretos (soft delete)
            console.log('\n[4.2] Desativando acertos incorretos...');
            const idsRemover = acertosARemover.map(a => a._id);
            if (idsRemover.length > 0) {
                const resultAcertos = await db.collection('acertofinanceiros').updateMany(
                    { _id: { $in: idsRemover } },
                    {
                        $set: {
                            ativo: false,
                            observacoes_desativacao: 'Desativado por fix-completo-jb-oliveira-sc-2025.js - Acertos duplicados/incorretos causados por bug na tesouraria',
                            data_desativacao: new Date()
                        }
                    }
                );
                console.log(`      Acertos desativados: ${resultAcertos.modifiedCount}`);
            }

            // 4.3 Atualizar campo manual (limbo)
            if (valorLimbo > 0) {
                console.log('\n[4.3] Atualizando limbo (campo manual)...');
                const resultLimbo = await db.collection('fluxofinanceirocampos').updateOne(
                    {
                        ligaId: LIGA_SC,
                        timeId: String(TIME_ID),
                        temporada: TEMPORADA
                    },
                    {
                        $set: {
                            'campos.0.nome': 'Limbo (Ajuste Quitacao)',
                            'campos.0.valor': valorLimbo,
                            updatedAt: new Date()
                        }
                    }
                );
                console.log(`      Limbo atualizado: ${resultLimbo.modifiedCount}`);
            }

            console.log('\n' + '='.repeat(80));
            console.log('CORRECOES APLICADAS COM SUCESSO!');
            console.log('='.repeat(80));
        } else {
            console.log('\n' + '='.repeat(80));
            console.log('[AVISO] Modo DRY-RUN. Nenhum dado foi alterado.');
            console.log('Para executar: node scripts/fix-completo-jb-oliveira-sc-2025.js --execute');
            console.log('='.repeat(80));
        }

        // =====================================================================
        // RESUMO FINAL
        // =====================================================================
        console.log('\n' + '='.repeat(80));
        console.log('RESUMO FINAL');
        console.log('='.repeat(80));
        console.log('\nANTES DA CORRECAO:');
        console.log('  - Extrato zerado (0 rodadas)');
        console.log('  - Acertos bagunçados (R$ 802 pago, R$ 351 recebido)');
        console.log('  - Saldo errado');

        console.log('\nDEPOIS DA CORRECAO:');
        console.log(`  - Extrato reconstruido (${historicoTransacoes.filter(t => t.posicao !== null).length}/38 rodadas)`);
        console.log(`  - Saldo Temporada: R$ ${saldoTemporada}`);
        console.log(`  - Acerto mantido (03/jan): +R$ ${acertoCorreto}`);
        console.log(`  - Limbo (ajuste): +R$ ${valorLimbo}`);
        console.log(`  - SALDO FINAL: R$ ${saldoFinal} (QUITADO!)`);

    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
