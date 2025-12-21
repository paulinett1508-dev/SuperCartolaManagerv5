// =====================================================================
// extratoFinanceiroCacheController.js v5.5 - Integração com Acertos Financeiros
// ✅ v5.5: FIX REFORÇADO - salvarExtratoCache SEMPRE recalcula saldo e saldoAcumulado
//   - Proteção dupla: backend não confia em dados do frontend
//   - r.saldo = recalculado a partir dos componentes individuais
//   - r.saldoAcumulado = recalculado progressivamente
// ✅ v5.4: FIX CRÍTICO - salvarExtratoCache agora recalcula saldoAcumulado
//   - Frontend enviava saldoAcumulado = 0 em todas as rodadas
//   - Agora o backend recalcula progressivamente antes de salvar
// ✅ v5.2: FIX CRÍTICO - lerCacheExtratoFinanceiro agora inclui acertos no saldo
// ✅ v5.1: Inclui acertos financeiros no extrato do participante
// ✅ v5.0: Busca extrato de snapshots quando cache não existe
// ✅ v4.0: Cache permanente para temporadas finalizadas (sem recálculos)
// ✅ v3.4: Corrige detecção de dados consolidados vs legados
// ✅ v3.3: Trava extrato financeiro para inativos na rodada_desistencia
// =====================================================================

import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import RodadaSnapshot from "../models/RodadaSnapshot.js";
import AcertoFinanceiro from "../models/AcertoFinanceiro.js";
import mongoose from "mongoose";

// ✅ v5.1: Buscar acertos financeiros do participante
async function buscarAcertosFinanceiros(ligaId, timeId, temporada = 2025) {
    try {
        const acertos = await AcertoFinanceiro.find({
            ligaId: String(ligaId),
            timeId: String(timeId),
            temporada,
            ativo: true,
        }).sort({ dataAcerto: -1 }).lean();

        if (!acertos || acertos.length === 0) {
            return {
                lista: [],
                resumo: { totalPago: 0, totalRecebido: 0, saldo: 0 },
            };
        }

        // Calcular totais
        let totalPago = 0;
        let totalRecebido = 0;
        acertos.forEach((a) => {
            if (a.tipo === "pagamento") {
                totalPago += a.valor;
            } else {
                totalRecebido += a.valor;
            }
        });

        // ✅ v5.2 FIX: Usar mesma lógica do Model (totalPago - totalRecebido)
        // PAGAMENTO = participante pagou → AUMENTA saldo (quita dívida)
        // RECEBIMENTO = participante recebeu → DIMINUI saldo (usa crédito)
        const saldo = parseFloat((totalPago - totalRecebido).toFixed(2));

        return {
            lista: acertos.map((a) => ({
                _id: a._id,
                tipo: a.tipo,
                valor: a.valor,
                descricao: a.descricao,
                metodoPagamento: a.metodoPagamento,
                dataAcerto: a.dataAcerto,
                observacoes: a.observacoes,
            })),
            resumo: {
                totalPago: parseFloat(totalPago.toFixed(2)),
                totalRecebido: parseFloat(totalRecebido.toFixed(2)),
                saldo,
            },
        };
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao buscar acertos:", error);
        return {
            lista: [],
            resumo: { totalPago: 0, totalRecebido: 0, saldo: 0 },
        };
    }
}

// ✅ v4.0: Verificar se temporada está finalizada
async function verificarTemporadaFinalizada(ligaId) {
    try {
        const liga = await Liga.findById(toLigaId(ligaId)).lean();
        if (!liga) return { finalizada: false };

        const temporada2025 = liga.configuracoes?.temporada_2025;
        if (temporada2025?.status === 'finalizada') {
            return {
                finalizada: true,
                rodadaFinal: temporada2025.rodada_final || 38,
                dataEncerramento: temporada2025.data_encerramento
            };
        }
        return { finalizada: false };
    } catch (error) {
        console.error('[CACHE-CONTROLLER] Erro ao verificar temporada:', error);
        return { finalizada: false };
    }
}

function toLigaId(ligaId) {
    if (mongoose.Types.ObjectId.isValid(ligaId)) {
        return new mongoose.Types.ObjectId(ligaId);
    }
    return ligaId;
}

// ✅ v4.1: BUSCAR STATUS DO TIME (ativo/rodada_desistencia) - busca da coleção Time
async function buscarStatusTime(ligaId, timeId) {
    try {
        // ✅ CORREÇÃO: Buscar da coleção Time (não de liga.times que é só array de IDs)
        const time = await Time.findOne(
            { id: Number(timeId) },
            { id: 1, ativo: 1, rodada_desistencia: 1 }
        ).lean();

        if (!time) {
            return { ativo: true, rodada_desistencia: null };
        }

        return {
            ativo: time.ativo !== false,
            rodada_desistencia: time.rodada_desistencia || null,
        };
    } catch (error) {
        console.error(
            "[CACHE-CONTROLLER] Erro ao buscar status do time:",
            error,
        );
        return { ativo: true, rodada_desistencia: null };
    }
}

// ✅ v3.3: FILTRAR RODADAS PARA INATIVOS
function filtrarRodadasParaInativo(rodadas, rodadaDesistencia) {
    if (!rodadaDesistencia || !Array.isArray(rodadas)) {
        return rodadas;
    }

    const rodadaLimite = rodadaDesistencia - 1;
    const rodadasFiltradas = rodadas.filter((r) => r.rodada <= rodadaLimite);

    console.log(
        `[CACHE-CONTROLLER] 🔒 Inativo: filtrando até R${rodadaLimite} | ${rodadas.length} → ${rodadasFiltradas.length}`,
    );

    return rodadasFiltradas;
}

// ✅ v5.0: BUSCAR EXTRATO DIRETAMENTE DOS SNAPSHOTS (fallback quando não há cache)
async function buscarExtratoDeSnapshots(ligaId, timeId) {
    try {
        console.log(`[CACHE-CONTROLLER] 📸 Buscando extrato de snapshots para time ${timeId}`);

        // Buscar o último snapshot com dados do time
        const snapshots = await RodadaSnapshot.find({
            liga_id: String(ligaId)
        }).sort({ rodada: -1 }).limit(1).lean();

        if (!snapshots || snapshots.length === 0) {
            console.log(`[CACHE-CONTROLLER] ⚠️ Nenhum snapshot encontrado para liga ${ligaId}`);
            return null;
        }

        const ultimoSnapshot = snapshots[0];
        const timesStats = ultimoSnapshot.dados_consolidados?.times_stats || [];
        const extratosFinanceiros = ultimoSnapshot.dados_consolidados?.extratos_financeiros || [];

        // Buscar dados do time nos stats
        const timeStats = timesStats.find(t => t.time_id === Number(timeId));
        const timeExtrato = extratosFinanceiros.find(t => t.time_id === Number(timeId));

        if (!timeStats) {
            console.log(`[CACHE-CONTROLLER] ⚠️ Time ${timeId} não encontrado nos snapshots`);
            return null;
        }

        console.log(`[CACHE-CONTROLLER] ✅ Encontrado nos snapshots: saldo=${timeStats.saldo_total}, ganhos=${timeStats.ganhos}`);

        // Construir array de rodadas baseado nas transações do extrato
        const rodadasArray = [];
        const transacoes = timeExtrato?.transacoes || [];

        // Agrupar transações por rodada
        const rodadasMap = {};
        transacoes.forEach(t => {
            const numRodada = t.rodada;
            if (!numRodada) return;

            if (!rodadasMap[numRodada]) {
                rodadasMap[numRodada] = {
                    rodada: numRodada,
                    posicao: null,
                    bonusOnus: 0,
                    pontosCorridos: 0,
                    mataMata: 0,
                    top10: 0,
                    saldo: 0,
                    isMito: false,
                    isMico: false,
                    top10Status: null,
                    top10Posicao: null,
                };
            }

            const r = rodadasMap[numRodada];
            const valor = parseFloat(t.valor) || 0;
            const tipo = t.tipo || '';

            switch (tipo) {
                case 'PONTOS_CORRIDOS':
                    r.pontosCorridos += valor;
                    break;
                case 'MATA_MATA':
                    r.mataMata += valor;
                    break;
                case 'MITO':
                    r.top10 += valor;
                    r.isMito = true;
                    r.top10Status = 'MITO';
                    break;
                case 'MICO':
                    r.top10 += valor;
                    r.isMico = true;
                    r.top10Status = 'MICO';
                    break;
                case 'BONUS':
                case 'BANCO_RODADA':
                    r.bonusOnus += valor;
                    break;
                case 'ONUS':
                    r.bonusOnus += valor;
                    break;
                default:
                    if (valor !== 0) {
                        r.bonusOnus += valor;
                    }
            }
            r.saldo = r.bonusOnus + r.pontosCorridos + r.mataMata + r.top10;
        });

        // Converter mapa para array e calcular acumulado
        const rodadasSorted = Object.values(rodadasMap).sort((a, b) => a.rodada - b.rodada);
        let saldoAcumulado = 0;
        rodadasSorted.forEach(r => {
            saldoAcumulado += r.saldo;
            r.saldoAcumulado = saldoAcumulado;
        });

        // Se não tem transações detalhadas, criar resumo básico
        if (rodadasSorted.length === 0 && timeStats.saldo_total) {
            console.log(`[CACHE-CONTROLLER] 📊 Usando resumo geral (sem transações detalhadas)`);
        }

        return {
            rodadas: rodadasSorted,
            resumo: {
                saldo: timeStats.saldo_total || 0,
                saldo_final: timeStats.saldo_total || 0,
                totalGanhos: timeStats.ganhos || 0,
                totalPerdas: timeStats.perdas || 0,
            },
            metadados: {
                fonte: 'snapshot',
                rodadaSnapshot: ultimoSnapshot.rodada,
                dataSnapshot: ultimoSnapshot.data_consolidacao,
            }
        };
    } catch (error) {
        console.error('[CACHE-CONTROLLER] ❌ Erro ao buscar de snapshots:', error);
        return null;
    }
}

function calcularResumoDeRodadas(rodadas, camposManuais = null) {
    if (!Array.isArray(rodadas) || rodadas.length === 0) {
        return {
            saldo: 0,
            totalGanhos: 0,
            totalPerdas: 0,
            bonus: 0,
            onus: 0,
            pontosCorridos: 0,
            mataMata: 0,
            top10: 0,
            camposManuais: 0,
        };
    }

    let totalBonus = 0,
        totalOnus = 0,
        totalPontosCorridos = 0,
        totalMataMata = 0,
        totalTop10 = 0,
        totalGanhos = 0,
        totalPerdas = 0;

    rodadas.forEach((r) => {
        const bonusOnus = parseFloat(r.bonusOnus) || 0;
        if (bonusOnus > 0) totalBonus += bonusOnus;
        else totalOnus += bonusOnus;

        const pc = parseFloat(r.pontosCorridos) || 0;
        totalPontosCorridos += pc;

        const mm = parseFloat(r.mataMata) || 0;
        totalMataMata += mm;

        const t10 = parseFloat(r.top10) || 0;
        totalTop10 += t10;

        const saldoRodada = bonusOnus + pc + mm + t10;
        if (saldoRodada > 0) totalGanhos += saldoRodada;
        else totalPerdas += saldoRodada;
    });

    let totalCamposManuais = 0;
    if (camposManuais && Array.isArray(camposManuais)) {
        camposManuais.forEach((campo) => {
            const valor = parseFloat(campo.valor) || 0;
            totalCamposManuais += valor;
            if (valor > 0) totalGanhos += valor;
            else if (valor < 0) totalPerdas += valor;
        });
    }

    const saldo =
        totalBonus +
        totalOnus +
        totalPontosCorridos +
        totalMataMata +
        totalTop10 +
        totalCamposManuais;

    return {
        saldo,
        saldo_final: saldo,
        totalGanhos,
        totalPerdas,
        bonus: totalBonus,
        onus: totalOnus,
        pontosCorridos: totalPontosCorridos,
        mataMata: totalMataMata,
        top10: totalTop10,
        camposManuais: totalCamposManuais,
    };
}

// ✅ v3.4: FUNÇÃO MELHORADA - Detecta corretamente cache corrompido
function transformarTransacoesEmRodadas(transacoes, ligaId) {
    if (!Array.isArray(transacoes) || transacoes.length === 0) return [];

    const primeiroItem = transacoes[0];

    // ✅ v3.4: Verificar se tem dados legados (tipo/valor)
    const temDadosLegados =
        primeiroItem.tipo !== undefined && primeiroItem.valor !== undefined;

    // ✅ v3.4: Verificar se os dados consolidados estão REALMENTE preenchidos
    const temDadosConsolidadosReais = transacoes.some(
        (r) =>
            (parseFloat(r.bonusOnus) || 0) !== 0 ||
            (parseFloat(r.pontosCorridos) || 0) !== 0 ||
            (parseFloat(r.mataMata) || 0) !== 0 ||
            (parseFloat(r.top10) || 0) !== 0 ||
            (parseFloat(r.saldo) || 0) !== 0,
    );

    // ✅ v3.4: Só considera consolidado se TEM valores reais OU não tem dados legados
    const jaEstaConsolidado = temDadosConsolidadosReais || !temDadosLegados;

    if (jaEstaConsolidado && !temDadosLegados) {
        // ✅ v4.0: Já consolidado corretamente, apenas recalcular acumulado
        return transacoes.map((rodada, idx) => ({
            ...rodada,
            saldoAcumulado: transacoes
                .slice(0, idx + 1)
                .reduce((acc, r) => acc + (parseFloat(r.saldo) || 0), 0),
        }));
    }

    // ✅ v3.4: Se tem dados legados E consolidados zerados = reconstruir
    if (temDadosLegados && !temDadosConsolidadosReais) {
        console.log(
            `[CACHE-CONTROLLER] ⚠️ Cache corrompido detectado - reconstruindo de dados legados`,
        );
    }

    // ✅ v4.0: Formato legado - reconstruir com valores contextuais
    const rodadasMap = {};
    transacoes.forEach((t) => {
        const numRodada = t.rodada;
        if (!numRodada) return;

        if (!rodadasMap[numRodada]) {
            rodadasMap[numRodada] = {
                rodada: numRodada,
                posicao: t.posicao || null,
                bonusOnus: 0,
                pontosCorridos: 0,
                mataMata: 0,
                top10: 0,
                saldo: 0,
                isMito: false,
                isMico: false,
                top10Status: null,
                top10Posicao: null,
            };
        }

        const r = rodadasMap[numRodada];
        const valor = parseFloat(t.valor) || 0;

        switch (t.tipo) {
            case "PONTOS_CORRIDOS":
                r.pontosCorridos += valor;
                break;
            case "MATA_MATA":
                r.mataMata += valor;
                break;
            case "MITO":
                r.top10 += valor;
                r.isMito = true;
                r.top10Status = "MITO";
                // Extrair posição do top10 da descrição se disponível
                if (t.descricao) {
                    const match = t.descricao.match(/(\d+)º/);
                    if (match) r.top10Posicao = parseInt(match[1]);
                }
                break;
            case "MICO":
                r.top10 += valor;
                r.isMico = true;
                r.top10Status = "MICO";
                if (t.descricao) {
                    const match = t.descricao.match(/(\d+)º/);
                    if (match) r.top10Posicao = parseInt(match[1]);
                }
                break;
            case "BONUS":
            case "BANCO_RODADA":
                r.bonusOnus += valor;
                break;
            case "ONUS":
                r.bonusOnus += valor; // valor já é negativo
                break;
            default:
                // Tipo desconhecido ou genérico vai para bonusOnus
                if (valor !== 0) {
                    r.bonusOnus += valor;
                }
        }
        r.saldo = r.bonusOnus + r.pontosCorridos + r.mataMata + r.top10;
    });

    const rodadasArray = Object.values(rodadasMap).sort(
        (a, b) => a.rodada - b.rodada,
    );
    let saldoAcumulado = 0;
    rodadasArray.forEach((r) => {
        saldoAcumulado += r.saldo;
        r.saldoAcumulado = saldoAcumulado;
    });

    console.log(
        `[CACHE-CONTROLLER] ✅ Dados reconstruídos: ${rodadasArray.length} rodadas | Saldo: R$ ${saldoAcumulado.toFixed(2)}`,
    );
    return rodadasArray;
}

async function buscarCamposManuais(ligaId, timeId) {
    try {
        const doc = await FluxoFinanceiroCampos.findOne({
            ligaId: String(ligaId),
            timeId: String(timeId),
        }).lean();
        if (!doc || !doc.campos) return [];
        return doc.campos.filter((c) => c.valor !== 0);
    } catch (error) {
        return [];
    }
}

// ✅ v5.0: GET EXTRATO CACHE COM FALLBACK PARA SNAPSHOTS
export const getExtratoCache = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const statusTime = await buscarStatusTime(ligaId, timeId);
        const isInativo = statusTime.ativo === false;
        const rodadaDesistencia = statusTime.rodada_desistencia;

        // ✅ v5.1: Buscar acertos financeiros em paralelo
        const acertosPromise = buscarAcertosFinanceiros(ligaId, timeId);

        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
        }).lean();

        // ✅ v5.1: Aguardar acertos
        const acertos = await acertosPromise;

        // ✅ v5.0: Se não tem cache, tentar buscar dos snapshots
        if (!cache) {
            console.log(`[CACHE-CONTROLLER] Cache não encontrado para time ${timeId}, tentando snapshots...`);

            const dadosSnapshot = await buscarExtratoDeSnapshots(ligaId, timeId);

            if (dadosSnapshot) {
                const camposAtivos = await buscarCamposManuais(ligaId, timeId);

                // ✅ v5.3 FIX: Calcular resumo COMPLETO a partir das rodadas (igual cache)
                // Isso garante que campos detalhados (bonus, onus, pontosCorridos, mataMata, top10)
                // estejam disponíveis no resumo para exibição correta de débitos/créditos no app
                let resumoFinal = calcularResumoDeRodadas(dadosSnapshot.rodadas, camposAtivos);

                // ✅ v5.2 FIX: Incluir saldo de acertos no cálculo do saldo final
                const saldoAcertosSnap = acertos?.resumo?.saldo ?? 0;
                resumoFinal.saldo_temporada = resumoFinal.saldo; // Preservar saldo sem acertos
                resumoFinal.saldo_acertos = saldoAcertosSnap;
                resumoFinal.saldo = resumoFinal.saldo + saldoAcertosSnap;
                resumoFinal.saldo_final = resumoFinal.saldo;
                resumoFinal.saldo_atual = resumoFinal.saldo;

                return res.json({
                    cached: true,
                    fonte: 'snapshot',
                    qtdRodadas: dadosSnapshot.rodadas.length,
                    rodadas: dadosSnapshot.rodadas,
                    resumo: resumoFinal,
                    camposManuais: camposAtivos,
                    acertos: acertos, // ✅ v5.1: Incluir acertos
                    metadados: dadosSnapshot.metadados,
                    inativo: isInativo,
                    rodadaDesistencia,
                    extratoTravado: isInativo && rodadaDesistencia,
                    rodadaTravada: rodadaDesistencia ? rodadaDesistencia - 1 : null,
                });
            }

            // Se não tem cache nem snapshot, retorna 404
            return res.status(404).json({
                cached: false,
                message: "Cache não encontrado",
                acertos: acertos, // ✅ v5.1: Incluir acertos mesmo sem cache
                inativo: isInativo,
                rodadaDesistencia,
                extratoTravado: isInativo && rodadaDesistencia,
            });
        }

        const camposAtivos = await buscarCamposManuais(ligaId, timeId);
        let rodadasConsolidadas = transformarTransacoesEmRodadas(
            cache.historico_transacoes || [],
            ligaId,
        );

        if (isInativo && rodadaDesistencia) {
            rodadasConsolidadas = filtrarRodadasParaInativo(
                rodadasConsolidadas,
                rodadaDesistencia,
            );
        }

        const resumoCalculado = calcularResumoDeRodadas(
            rodadasConsolidadas,
            camposAtivos,
        );

        // ✅ v5.2 FIX: Incluir saldo de acertos no cálculo do saldo final
        const saldoAcertosCc = acertos?.resumo?.saldo ?? 0;
        resumoCalculado.saldo_temporada = resumoCalculado.saldo;
        resumoCalculado.saldo_acertos = saldoAcertosCc;
        resumoCalculado.saldo = resumoCalculado.saldo + saldoAcertosCc;
        resumoCalculado.saldo_final = resumoCalculado.saldo;
        resumoCalculado.saldo_atual = resumoCalculado.saldo;

        // ✅ v5.1: Adicionar acertos ao retorno
        res.json({
            cached: true,
            fonte: 'cache',
            qtdRodadas: rodadasConsolidadas.length,
            rodadas: rodadasConsolidadas,
            resumo: resumoCalculado,
            camposManuais: camposAtivos,
            acertos: acertos, // ✅ v5.1: Incluir acertos
            metadados: cache.metadados,
            ultimaRodadaCalculada: cache.ultima_rodada_consolidada,
            updatedAt: cache.updatedAt,
            inativo: isInativo,
            rodadaDesistencia,
            extratoTravado: isInativo && rodadaDesistencia,
            rodadaTravada: rodadaDesistencia ? rodadaDesistencia - 1 : null,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

// ✅ v3.3: SALVAR CACHE COM VALIDAÇÃO DE INATIVO
export const salvarExtratoCache = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const {
            historico_transacoes,
            extrato,
            ultimaRodadaCalculada,
            motivoRecalculo,
        } = req.body;

        const statusTime = await buscarStatusTime(ligaId, timeId);
        const isInativo = statusTime.ativo === false;
        const rodadaDesistencia = statusTime.rodada_desistencia;

        let rodadasArray = historico_transacoes || extrato || [];
        if (!Array.isArray(rodadasArray) && rodadasArray?.rodadas)
            rodadasArray = rodadasArray.rodadas;

        if (isInativo && rodadaDesistencia && Array.isArray(rodadasArray)) {
            const rodadaLimite = rodadaDesistencia - 1;
            rodadasArray = rodadasArray.filter((r) => r.rodada <= rodadaLimite);
        }

        const rodadaCalculadaReal =
            ultimaRodadaCalculada ||
            (Array.isArray(rodadasArray) && rodadasArray.length > 0
                ? Math.max(...rodadasArray.map((r) => r.rodada || 0))
                : 0);

        // ✅ v5.5 FIX: SEMPRE recalcular saldo e saldoAcumulado antes de salvar
        // Proteção dupla: mesmo se frontend enviar dados corrompidos, backend corrige
        // - r.saldo = soma dos componentes INDIVIDUAIS da rodada
        // - r.saldoAcumulado = soma PROGRESSIVA de todos os saldos
        if (Array.isArray(rodadasArray) && rodadasArray.length > 0) {
            // Ordenar por rodada
            rodadasArray.sort((a, b) => (a.rodada || 0) - (b.rodada || 0));

            // SEMPRE recalcular saldo e saldoAcumulado (não confiar no frontend)
            let saldoAcumulado = 0;
            rodadasArray.forEach((r) => {
                // SEMPRE recalcular saldo individual da rodada a partir dos componentes
                // Isso protege contra bug onde frontend enviava saldo = acumulado
                r.saldo = (parseFloat(r.bonusOnus) || 0) +
                          (parseFloat(r.pontosCorridos) || 0) +
                          (parseFloat(r.mataMata) || 0) +
                          (parseFloat(r.top10) || 0);

                // Acumular progressivamente
                saldoAcumulado += r.saldo;
                r.saldoAcumulado = saldoAcumulado;
            });

            console.log(`[CACHE-CONTROLLER] ✅ saldo e saldoAcumulado recalculados para ${rodadasArray.length} rodadas (final: ${saldoAcumulado.toFixed(2)})`);
        }

        const resumoCalculado = calcularResumoDeRodadas(rodadasArray);

        const cacheData = {
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
            ultima_rodada_consolidada: rodadaCalculadaReal,
            historico_transacoes: rodadasArray,
            data_ultima_atualizacao: new Date(),
            saldo_consolidado: resumoCalculado.saldo,
            ganhos_consolidados: resumoCalculado.totalGanhos,
            perdas_consolidadas: resumoCalculado.totalPerdas,
            metadados: {
                versaoCalculo: "3.4.0",
                timestampCalculo: new Date(),
                motivoRecalculo: motivoRecalculo || "atualizacao",
                inativo: isInativo,
                rodadaDesistencia,
            },
        };

        const cache = await ExtratoFinanceiroCache.findOneAndUpdate(
            { liga_id: toLigaId(ligaId), time_id: Number(timeId) },
            cacheData,
            { new: true, upsert: true },
        );

        res.json({
            success: true,
            message: "Cache atualizado",
            updatedAt: cache.updatedAt,
            inativo: isInativo,
            extratoTravado: isInativo && rodadaDesistencia,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro:", error);
        res.status(500).json({ error: "Erro ao salvar cache" });
    }
};

// ✅ v4.0: VERIFICAR CACHE VÁLIDO COM SUPORTE A TEMPORADA FINALIZADA
export const verificarCacheValido = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { rodadaAtual, mercadoAberto } = req.query;

        const statusTime = await buscarStatusTime(ligaId, timeId);
        const isInativo = statusTime.ativo === false;
        const rodadaDesistencia = statusTime.rodada_desistencia;

        // ✅ v4.0: Verificar se temporada está finalizada
        const statusTemporada = await verificarTemporadaFinalizada(ligaId);

        const cacheExistente = await ExtratoFinanceiroCache.findOne({
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
        }).lean();

        if (!cacheExistente) {
            return res.json({
                valido: false,
                motivo: "cache_nao_encontrado",
                inativo: isInativo,
                rodadaDesistencia,
                temporadaFinalizada: statusTemporada.finalizada,
            });
        }

        // ✅ v5.2 FIX: Buscar acertos financeiros para incluir no saldo
        const acertos = await buscarAcertosFinanceiros(ligaId, timeId);
        const saldoAcertosVal = acertos?.resumo?.saldo ?? 0;

        // Helper para adicionar acertos ao resumo
        const adicionarAcertosAoResumo = (resumo) => {
            resumo.saldo_temporada = resumo.saldo;
            resumo.saldo_acertos = saldoAcertosVal;
            resumo.saldo = resumo.saldo + saldoAcertosVal;
            resumo.saldo_final = resumo.saldo;
            resumo.saldo_atual = resumo.saldo;
            return resumo;
        };

        // ✅ v4.0: Se temporada finalizada E cache permanente, retorna imediatamente
        if (statusTemporada.finalizada && cacheExistente.cache_permanente) {
            console.log(`[CACHE-CONTROLLER] 🏁 Temporada finalizada - retornando cache permanente para time ${timeId}`);

            let rodadasConsolidadas = transformarTransacoesEmRodadas(
                cacheExistente.historico_transacoes || [],
                ligaId,
            );

            if (isInativo && rodadaDesistencia) {
                rodadasConsolidadas = filtrarRodadasParaInativo(
                    rodadasConsolidadas,
                    rodadaDesistencia,
                );
            }

            const camposAtivos = await buscarCamposManuais(ligaId, timeId);
            const resumoCalculado = calcularResumoDeRodadas(
                rodadasConsolidadas,
                camposAtivos,
            );
            adicionarAcertosAoResumo(resumoCalculado); // ✅ v5.2: Incluir acertos

            return res.json({
                valido: true,
                cached: true,
                permanente: true,
                temporadaFinalizada: true,
                motivo: "temporada_finalizada_cache_permanente",
                ultimaRodada: cacheExistente.ultima_rodada_consolidada,
                rodadaFinal: statusTemporada.rodadaFinal,
                updatedAt: cacheExistente.updatedAt,
                rodadas: rodadasConsolidadas,
                resumo: resumoCalculado,
                camposManuais: camposAtivos,
                acertos: acertos, // ✅ v5.2: Incluir acertos
                inativo: isInativo,
                rodadaDesistencia,
                extratoTravado: isInativo && rodadaDesistencia,
            });
        }

        const mercadoEstaAberto = mercadoAberto === "true";
        const rodadaAtualInt = parseInt(rodadaAtual);

        // Para inativos, cache é válido se tiver até rodada_desistencia - 1
        if (isInativo && rodadaDesistencia) {
            const rodadaLimite = rodadaDesistencia - 1;
            if (cacheExistente.ultima_rodada_consolidada >= rodadaLimite) {
                let rodadasConsolidadas = transformarTransacoesEmRodadas(
                    cacheExistente.historico_transacoes || [],
                    ligaId,
                );
                rodadasConsolidadas = filtrarRodadasParaInativo(
                    rodadasConsolidadas,
                    rodadaDesistencia,
                );
                const camposAtivos = await buscarCamposManuais(ligaId, timeId);
                const resumoCalculado = calcularResumoDeRodadas(
                    rodadasConsolidadas,
                    camposAtivos,
                );
                adicionarAcertosAoResumo(resumoCalculado); // ✅ v5.2: Incluir acertos

                return res.json({
                    valido: true,
                    cached: true,
                    permanente: true,
                    motivo: "inativo_extrato_travado",
                    ultimaRodada: rodadaLimite,
                    updatedAt: cacheExistente.updatedAt,
                    rodadas: rodadasConsolidadas,
                    resumo: resumoCalculado,
                    camposManuais: camposAtivos,
                    acertos: acertos, // ✅ v5.2: Incluir acertos
                    inativo: true,
                    rodadaDesistencia,
                    extratoTravado: true,
                    rodadaTravada: rodadaLimite,
                });
            }
        }

        // Validação normal para ativos
        const rodadaEsperada = mercadoEstaAberto
            ? rodadaAtualInt - 1
            : rodadaAtualInt;
        if (cacheExistente.ultima_rodada_consolidada >= rodadaEsperada) {
            const rodadasConsolidadas = transformarTransacoesEmRodadas(
                cacheExistente.historico_transacoes || [],
                ligaId,
            );
            const camposAtivos = await buscarCamposManuais(ligaId, timeId);
            const resumoCalculado = calcularResumoDeRodadas(
                rodadasConsolidadas,
                camposAtivos,
            );
            adicionarAcertosAoResumo(resumoCalculado); // ✅ v5.2: Incluir acertos

            return res.json({
                valido: true,
                cached: true,
                permanente: !mercadoEstaAberto,
                motivo: mercadoEstaAberto
                    ? "mercado_aberto_cache_valido"
                    : "rodada_fechada_cache_permanente",
                ultimaRodada: cacheExistente.ultima_rodada_consolidada,
                updatedAt: cacheExistente.updatedAt,
                rodadas: rodadasConsolidadas,
                resumo: resumoCalculado,
                camposManuais: camposAtivos,
                acertos: acertos, // ✅ v5.2: Incluir acertos
                inativo: isInativo,
                rodadaDesistencia,
                extratoTravado: isInativo && rodadaDesistencia,
            });
        }

        res.json({
            valido: false,
            motivo: "cache_desatualizado",
            cacheRodada: cacheExistente.ultima_rodada_consolidada,
            rodadaEsperada,
            inativo: isInativo,
            rodadaDesistencia,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro:", error);
        res.status(500).json({ error: "Erro na validação" });
    }
};

// ✅ v3.3: LER CACHE COM SUPORTE A INATIVOS
export const lerCacheExtratoFinanceiro = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { rodadaAtual } = req.query;
        const rodadaAtualNum = parseInt(rodadaAtual) || 1;

        const statusTime = await buscarStatusTime(ligaId, timeId);
        const isInativo = statusTime.ativo === false;
        const rodadaDesistencia = statusTime.rodada_desistencia;
        const rodadaLimiteInativo = rodadaDesistencia
            ? rodadaDesistencia - 1
            : null;

        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
        }).lean();

        if (!cache) {
            return res.status(404).json({
                cached: false,
                message: "Cache não encontrado",
                needsRecalc: true,
                inativo: isInativo,
                rodadaDesistencia,
                extratoTravado: isInativo && rodadaDesistencia,
            });
        }

        const rodadaCache = cache.ultima_rodada_consolidada || 0;

        // Verificação de cache desatualizado
        if (
            isInativo &&
            rodadaLimiteInativo &&
            rodadaCache < rodadaLimiteInativo
        ) {
            return res.status(200).json({
                cached: true,
                needsRecalc: true,
                message: `Cache inativo desatualizado`,
                rodada_cache: rodadaCache,
                expectedUntil: rodadaLimiteInativo,
                inativo: true,
                rodadaDesistencia,
                extratoTravado: true,
            });
        } else if (!isInativo && rodadaCache < rodadaAtualNum) {
            return res.status(200).json({
                cached: true,
                needsRecalc: true,
                message: `Cache desatualizado`,
                rodada_cache: rodadaCache,
                expectedUntil: rodadaAtualNum,
                inativo: false,
            });
        }

        let rodadasConsolidadas = transformarTransacoesEmRodadas(
            cache.historico_transacoes || [],
            ligaId,
        );

        if (isInativo && rodadaDesistencia) {
            rodadasConsolidadas = filtrarRodadasParaInativo(
                rodadasConsolidadas,
                rodadaDesistencia,
            );
        }

        const camposAtivos = await buscarCamposManuais(ligaId, timeId);
        const resumoCalculado = calcularResumoDeRodadas(
            rodadasConsolidadas,
            camposAtivos,
        );

        // ✅ v5.2 FIX: Buscar acertos financeiros e incluir no saldo final
        const acertos = await buscarAcertosFinanceiros(ligaId, timeId);
        const saldoAcertos = acertos?.resumo?.saldo ?? 0;

        // Adicionar saldo de acertos ao resumo
        const saldoTemporada = resumoCalculado.saldo; // Saldo SEM acertos (só rodadas + campos)
        resumoCalculado.saldo_temporada = saldoTemporada; // Preservar saldo original
        resumoCalculado.saldo_acertos = saldoAcertos;
        resumoCalculado.saldo = saldoTemporada + saldoAcertos; // Saldo COM acertos
        resumoCalculado.saldo_final = resumoCalculado.saldo;
        resumoCalculado.saldo_atual = resumoCalculado.saldo; // ✅ Usado pelo UI do App

        // Atualizar ganhos/perdas com acertos
        if (saldoAcertos > 0) {
            resumoCalculado.totalGanhos = (resumoCalculado.totalGanhos || 0) + saldoAcertos;
        } else if (saldoAcertos < 0) {
            resumoCalculado.totalPerdas = (resumoCalculado.totalPerdas || 0) + saldoAcertos;
        }

        console.log(`[CACHE-EXTRATO] ✅ Extrato time ${timeId}: Saldo rodadas=${(resumoCalculado.saldo - saldoAcertos).toFixed(2)} + Acertos=${saldoAcertos.toFixed(2)} = Final=${resumoCalculado.saldo.toFixed(2)}`);

        res.json({
            cached: true,
            qtdRodadas: rodadasConsolidadas.length,
            rodada_calculada: rodadaCache,
            dados: rodadasConsolidadas,
            dados_extrato: rodadasConsolidadas,
            rodadas: rodadasConsolidadas,
            saldo_total: resumoCalculado.saldo,
            resumo: resumoCalculado,
            camposManuais: camposAtivos,
            acertos: acertos, // ✅ v5.2: Incluir acertos na resposta
            updatedAt: cache.updatedAt || cache.data_ultima_atualizacao,
            inativo: isInativo,
            rodadaDesistencia,
            extratoTravado: isInativo && rodadaDesistencia,
            rodadaTravada: rodadaLimiteInativo,
        });
    } catch (error) {
        console.error("[CACHE-EXTRATO] Erro:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

// Funções de limpeza mantidas
export const limparCacheLiga = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const resultado = await ExtratoFinanceiroCache.deleteMany({
            liga_id: toLigaId(ligaId),
        });
        res.json({
            success: true,
            message: `Cache limpo`,
            deletedCount: resultado.deletedCount,
            ligaId,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao limpar cache" });
    }
};

export const limparCacheTime = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const resultado = await ExtratoFinanceiroCache.deleteOne({
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
        });
        res.json({
            success: true,
            message: `Cache limpo`,
            deletedCount: resultado.deletedCount,
            ligaId,
            timeId,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao limpar cache" });
    }
};

export const limparCachesCorrompidos = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const filtro = {
            $or: [
                { historico_transacoes: { $type: "number" } },
                { historico_transacoes: { $exists: false } },
                { historico_transacoes: { $size: 0 } },
            ],
        };
        if (ligaId) filtro.liga_id = ligaId;
        const resultado = await ExtratoFinanceiroCache.deleteMany(filtro);
        res.json({
            success: true,
            message: `Caches corrompidos limpos`,
            deletedCount: resultado.deletedCount,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao limpar caches" });
    }
};

export const limparTodosCaches = async (req, res) => {
    try {
        const { confirmar } = req.query;
        if (confirmar !== "sim")
            return res.status(400).json({ error: "Adicione ?confirmar=sim" });
        const resultado = await ExtratoFinanceiroCache.deleteMany({});
        res.json({
            success: true,
            message: `Todos caches limpos`,
            deletedCount: resultado.deletedCount,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao limpar caches" });
    }
};

export const estatisticasCache = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const filtroBase = ligaId ? { liga_id: toLigaId(ligaId) } : {};
        const total = await ExtratoFinanceiroCache.countDocuments(filtroBase);
        const corrompidos = await ExtratoFinanceiroCache.countDocuments({
            ...filtroBase,
            $or: [
                { historico_transacoes: { $type: "number" } },
                { historico_transacoes: { $size: 0 } },
            ],
        });
        res.json({
            success: true,
            estatisticas: {
                total,
                validos: total - corrompidos,
                corrompidos,
                percentualValido:
                    total > 0
                        ? (((total - corrompidos) / total) * 100).toFixed(1) +
                          "%"
                        : "0%",
            },
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao obter estatísticas" });
    }
};

console.log("[CACHE-CONTROLLER] ✅ v5.0 carregado (fallback para snapshots)");

// ✅ v5.6: Exportar funções auxiliares para uso em outros módulos (tesouraria, etc.)
export {
    calcularResumoDeRodadas,
    transformarTransacoesEmRodadas,
    buscarCamposManuais,
    buscarAcertosFinanceiros,
};
