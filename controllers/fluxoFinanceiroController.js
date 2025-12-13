/**
 * FLUXO-FINANCEIRO-CONTROLLER v7.2
 * ✅ v7.2: FIX DUPLICAÇÃO - MATA-MATA removido do loop de rodadas
 *   - Estava calculando MM por rodada E histórico (duplicando valores)
 *   - Agora só calcula via getResultadosMataMataCompleto() (histórico)
 * ✅ v7.1: FIX - MATA-MATA histórico calculado fora do loop (mesmo padrão TOP10)
 *   - Transações de MM são adicionadas mesmo que cache já esteja atualizado
 * ✅ v7.0: CORREÇÃO CRÍTICA - TOP10 é ranking HISTÓRICO, não por rodada!
 *   - TOP10 agora busca do cache de Top10 (ranking histórico de todo o campeonato)
 *   - BANCO continua por rodada (bônus/ônus por posição)
 * ✅ v6.1: MATA-MATA COMPLETO (todas as fases)
 * ✅ v6.0: Alinhamento completo com frontend
 */

import fetch from "node-fetch";
import mongoose from "mongoose";
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import Rodada from "../models/Rodada.js";
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";
import Top10Cache from "../models/Top10Cache.js";
import { getResultadosMataMataCompleto } from "./mata-mata-backend.js";

// ============================================================================
// 🔧 CONSTANTES E CONFIGURAÇÕES
// ============================================================================

const ID_SUPERCARTOLA_2025 = "684cb1c8af923da7c7df51de";
const ID_CARTOLEIROS_SOBRAL = "684d821cf1a7ae16d1f89572";
const RODADA_INICIAL_PONTOS_CORRIDOS = 7;

// ============================================================================
// 🛠️ FUNÇÕES AUXILIARES
// ============================================================================

async function getStatusMercadoInterno() {
    try {
        const response = await fetch(
            "https://api.cartola.globo.com/mercado/status",
            {
                headers: { "User-Agent": "SuperCartolaManager/1.0" },
            },
        );
        if (!response.ok) throw new Error("Falha na API Cartola");
        return await response.json();
    } catch (error) {
        console.warn(
            "[FLUXO-CONTROLLER] Falha ao obter status mercado, usando fallback.",
        );
        return { rodada_atual: 38, status_mercado: 2 };
    }
}

// ============================================================================
// 💰 BANCO (BÔNUS/ÔNUS POR POSIÇÃO NA RODADA)
// ============================================================================

function getBancoPorRodada(ligaId, rodada) {
    // Liga Cartoleiros do Sobral - tabela contextual por fase
    if (String(ligaId) === ID_CARTOLEIROS_SOBRAL) {
        if (rodada < 29) {
            // FASE 1 (R1-R28): 6 times ativos
            return { 1: 7.0, 2: 4.0, 3: 0.0, 4: -2.0, 5: -5.0, 6: -10.0 };
        } else {
            // FASE 2 (R29-R38): 4 times ativos
            return { 1: 5.0, 2: 0.0, 3: 0.0, 4: -5.0 };
        }
    }

    // SuperCartola 2025 (32 times) - tabela padrão
    return {
        1: 10.0,
        2: 7.0,
        3: 5.0,
        4: 3.0,
        5: 1.0,
        6: 0.0,
        7: 0.0,
        8: 0.0,
        9: 0.0,
        10: 0.0,
        11: 0.0,
        12: -1.0,
        13: -1.0,
        14: -1.0,
        15: -1.0,
        16: -1.0,
        17: -1.0,
        18: -1.0,
        19: -1.0,
        20: -1.0,
        21: -1.0,
        22: -3.0,
        23: -5.0,
        24: -7.0,
        25: -10.0,
        26: -15.0,
        27: -20.0,
        28: -25.0,
        29: -30.0,
        30: -35.0,
        31: -40.0,
        32: -50.0,
    };
}

function calcularBanco(ligaId, timeId, rodadaNumero, pontuacoes) {
    const ranking = [...pontuacoes].sort((a, b) => b.pontos - a.pontos);
    const posicao =
        ranking.findIndex((p) => String(p.timeId) === String(timeId)) + 1;

    if (posicao <= 0) return null;

    const totalTimes = ranking.length;
    const banco = getBancoPorRodada(ligaId, rodadaNumero);
    const valorBanco = banco[posicao];

    if (valorBanco === undefined || valorBanco === 0) return null;

    return {
        valor: valorBanco,
        descricao: `Banco R${rodadaNumero}: ${posicao}º lugar`,
        posicao: posicao,
        totalTimes: totalTimes,
    };
}

// ============================================================================
// 🏆 TOP10 (MITO/MICO)
// ============================================================================

function getValoresTop10(ligaId) {
    // Cartoleiros do Sobral: valores 10→1
    if (String(ligaId) === ID_CARTOLEIROS_SOBRAL) {
        return {
            mitos: {
                1: 10,
                2: 9,
                3: 8,
                4: 7,
                5: 6,
                6: 5,
                7: 4,
                8: 3,
                9: 2,
                10: 1,
            },
            micos: {
                1: -10,
                2: -9,
                3: -8,
                4: -7,
                5: -6,
                6: -5,
                7: -4,
                8: -3,
                9: -2,
                10: -1,
            },
        };
    }

    // SuperCartola 2025: valores 30→12
    return {
        mitos: {
            1: 30,
            2: 28,
            3: 26,
            4: 24,
            5: 22,
            6: 20,
            7: 18,
            8: 16,
            9: 14,
            10: 12,
        },
        micos: {
            1: -30,
            2: -28,
            3: -26,
            4: -24,
            5: -22,
            6: -20,
            7: -18,
            8: -16,
            9: -14,
            10: -12,
        },
    };
}

/**
 * ❌ FUNÇÃO DESATIVADA - Lógica estava ERRADA!
 * Esta função calculava TOP10 POR RODADA, mas o correto é:
 * TOP10 = ranking HISTÓRICO das 10 maiores/menores pontuações do campeonato
 *
 * Usar calcularTop10Historico() no lugar.
 */
function calcularTop10_DESATIVADA(ligaId, timeId, pontuacoes) {
    // ❌ DESATIVADA - retorna null sempre
    // A lógica correta está em calcularTop10Historico()
    return null;
}

/**
 * ✅ v7.0: Calcula TOP10 baseado no ranking HISTÓRICO (cache de Top10)
 * - Busca o cache de Top10 que contém os 10 maiores mitos e 10 menores micos
 * - Verifica se o time aparece nesse ranking histórico
 * - Retorna array de transações de TOP10 (pode ter múltiplas aparições)
 */
async function calcularTop10Historico(ligaId, timeId) {
    try {
        const cache = await Top10Cache.findOne({ liga_id: String(ligaId) })
            .sort({ rodada_consolidada: -1 })
            .lean();

        if (!cache || !cache.mitos || !cache.micos) {
            console.log(`[FLUXO-CONTROLLER] Top10 cache não encontrado para liga ${ligaId}`);
            return [];
        }

        const valores = getValoresTop10(ligaId);
        const transacoes = [];

        // Verificar aparições nos TOP 10 MITOS (10 maiores pontuações históricas)
        cache.mitos.slice(0, 10).forEach((m, i) => {
            const mTimeId = m.timeId || m.time_id;
            if (String(mTimeId) === String(timeId)) {
                const pos = i + 1;
                const valor = valores.mitos[pos] || 0;
                transacoes.push({
                    rodada: m.rodada,
                    tipo: "MITO",
                    descricao: `Top10 Mito: ${pos}º maior pontuação histórica (R${m.rodada})`,
                    valor: valor,
                    posicao: pos,
                    data: new Date(),
                });
            }
        });

        // Verificar aparições nos TOP 10 MICOS (10 menores pontuações históricas)
        cache.micos.slice(0, 10).forEach((m, i) => {
            const mTimeId = m.timeId || m.time_id;
            if (String(mTimeId) === String(timeId)) {
                const pos = i + 1;
                const valor = valores.micos[pos] || 0;
                transacoes.push({
                    rodada: m.rodada,
                    tipo: "MICO",
                    descricao: `Top10 Mico: ${pos}º menor pontuação histórica (R${m.rodada})`,
                    valor: valor,
                    posicao: pos,
                    data: new Date(),
                });
            }
        });

        return transacoes;
    } catch (error) {
        console.error(`[FLUXO-CONTROLLER] Erro ao calcular Top10 histórico:`, error);
        return [];
    }
}

// ============================================================================
// ⚽ PONTOS CORRIDOS
// ============================================================================

async function calcularConfrontoPontosCorridos(
    liga,
    timeId,
    rodadaCartola,
    pontuacaoTime,
    todasPontuacoes,
) {
    const RODADA_INICIAL_LIGA =
        liga.configuracoes?.pontos_corridos?.rodadaInicial ||
        RODADA_INICIAL_PONTOS_CORRIDOS;
    const rodadaLiga = rodadaCartola - (RODADA_INICIAL_LIGA - 1);

    if (rodadaLiga < 1) return null;

    const participantesOrdenados = liga.participantes
        .slice()
        .sort((a, b) => a.nome_cartola.localeCompare(b.nome_cartola));

    const totalTimes = participantesOrdenados.length;
    const meuIndex = participantesOrdenados.findIndex(
        (p) => String(p.time_id) === String(timeId),
    );

    if (meuIndex === -1) return null;

    const oponenteIndex = (meuIndex + rodadaLiga) % totalTimes;
    if (oponenteIndex === meuIndex) return null;

    const oponente = participantesOrdenados[oponenteIndex];
    const pontuacaoOponenteObj = todasPontuacoes.find(
        (p) => String(p.timeId) === String(oponente.time_id),
    );
    const pontuacaoOponente = pontuacaoOponenteObj
        ? pontuacaoOponenteObj.pontos
        : 0;

    const diferenca = Math.abs(pontuacaoTime - pontuacaoOponente);
    let valor = 0;
    let descricao = "";

    // Empate: diferença ≤ 0.3
    if (diferenca <= 0.3) {
        valor = 3.0;
        descricao = `Empate PC vs ${oponente.nome_time}`;
    }
    // Vitória
    else if (pontuacaoTime > pontuacaoOponente) {
        // Goleada: diferença ≥ 50
        if (diferenca >= 50) {
            valor = 7.0; // 5 + 2 (bônus goleada)
            descricao = `Vitória Goleada PC vs ${oponente.nome_time}`;
        } else {
            valor = 5.0;
            descricao = `Vitória PC vs ${oponente.nome_time}`;
        }
    }
    // Derrota
    else {
        // Goleada sofrida
        if (diferenca >= 50) {
            valor = -7.0; // -5 - 2 (penalidade goleada)
            descricao = `Derrota Goleada PC vs ${oponente.nome_time}`;
        } else {
            valor = -5.0;
            descricao = `Derrota PC vs ${oponente.nome_time}`;
        }
    }

    return { valor, descricao, oponente: oponente.nome_time };
}

// ============================================================================
// 🥊 MATA-MATA (via módulo mata-mata-backend.js)
// ============================================================================

// ✅ v7.2: MATA-MATA é calculado via getResultadosMataMataCompleto() em getExtratoFinanceiro()
// Não há mais função por rodada - cálculo é feito historicamente (mesmo padrão TOP10)

// ============================================================================
// 🎯 CÁLCULO PRINCIPAL DE UMA RODADA
// ============================================================================

async function calcularFinanceiroDaRodada(
    liga,
    timeId,
    rodadaNumero,
    rodadaAtual,
) {
    const transacoes = [];
    let saldoRodada = 0;
    const ligaId = liga._id;

    // Buscar pontuações da rodada
    const pontuacoes = await Rodada.find({
        ligaId: ligaId,
        rodada: rodadaNumero,
    }).select("timeId pontos nome_time nome_cartola");

    const minhaPontuacaoObj = pontuacoes.find(
        (p) => String(p.timeId) === String(timeId),
    );
    if (!minhaPontuacaoObj) return { transacoes, saldo: 0 };

    const meusPontos = minhaPontuacaoObj.pontos;

    // 1. BANCO (BÔNUS/ÔNUS)
    if (liga.modulos_ativos?.banco !== false) {
        const resultadoBanco = calcularBanco(
            ligaId,
            timeId,
            rodadaNumero,
            pontuacoes,
        );
        if (resultadoBanco) {
            transacoes.push({
                rodada: rodadaNumero,
                tipo: resultadoBanco.valor > 0 ? "BONUS" : "ONUS",
                descricao: resultadoBanco.descricao,
                valor: resultadoBanco.valor,
                posicao: resultadoBanco.posicao,
                data: new Date(),
            });
            saldoRodada += resultadoBanco.valor;
        }
    }

    // 2. TOP10 (MITO/MICO)
    // ✅ v7.0: TOP10 é calculado SEPARADAMENTE (ranking histórico)
    // NÃO calcular por rodada! Ver calcularTop10Historico()
    // if (liga.modulos_ativos?.top10 !== false) { ... }

    // 3. PONTOS CORRIDOS (apenas SuperCartola)
    if (
        liga.modulos_ativos?.pontosCorridos &&
        String(ligaId) === ID_SUPERCARTOLA_2025
    ) {
        const resultadoPC = await calcularConfrontoPontosCorridos(
            liga,
            timeId,
            rodadaNumero,
            meusPontos,
            pontuacoes,
        );
        if (resultadoPC) {
            transacoes.push({
                rodada: rodadaNumero,
                tipo: "PONTOS_CORRIDOS",
                descricao: resultadoPC.descricao,
                valor: resultadoPC.valor,
                data: new Date(),
            });
            saldoRodada += resultadoPC.valor;
        }
    }

    // 4. MATA-MATA (apenas SuperCartola)
    // ✅ v7.2: MATA-MATA é calculado SEPARADAMENTE (histórico completo)
    // NÃO calcular por rodada! Ver cálculo histórico em getExtratoFinanceiro()
    // Mesmo padrão aplicado ao TOP10

    return { transacoes, saldo: saldoRodada };
}

// ============================================================================
// 🎮 CONTROLLERS EXPORTADOS
// ============================================================================

export const getExtratoFinanceiro = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const forcarRecalculo = req.query.refresh === "true";

        console.log(
            `[FLUXO-CONTROLLER] Extrato time ${timeId} | refresh=${forcarRecalculo}`,
        );

        const statusMercado = await getStatusMercadoInterno();
        const rodadaAtualCartola = statusMercado.rodada_atual;
        const mercadoAberto = statusMercado.status_mercado === 1;

        const limiteConsolidacao = mercadoAberto
            ? rodadaAtualCartola - 1
            : rodadaAtualCartola;

        // Buscar ou criar cache
        let cache = await ExtratoFinanceiroCache.findOne({
            liga_id: ligaId,
            time_id: timeId,
        });

        if (forcarRecalculo && cache) {
            await ExtratoFinanceiroCache.deleteOne({ _id: cache._id });
            cache = null;
            console.log(`[FLUXO-CONTROLLER] Cache limpo para recálculo`);
        }

        if (!cache) {
            cache = new ExtratoFinanceiroCache({
                liga_id: ligaId,
                time_id: timeId,
                ultima_rodada_consolidada: 0,
                saldo_consolidado: 0,
                historico_transacoes: [],
            });
        }

        const liga = await Liga.findById(ligaId);
        if (!liga)
            return res.status(404).json({ error: "Liga não encontrada" });

        // Verificar se time é inativo
        const participante = liga.participantes.find(
            (p) => String(p.time_id) === String(timeId),
        );
        const isInativo = participante?.ativo === false;
        const rodadaDesistencia = participante?.rodada_desistencia;

        // Limitar rodada para inativos
        let rodadaLimite = limiteConsolidacao;
        if (isInativo && rodadaDesistencia) {
            rodadaLimite = Math.min(limiteConsolidacao, rodadaDesistencia - 1);
            console.log(
                `[FLUXO-CONTROLLER] Inativo: limitando até R${rodadaLimite}`,
            );
        }

        // Calcular rodadas pendentes
        let novasTransacoes = [];
        let novoSaldo = 0;
        let cacheModificado = false;

        if (cache.ultima_rodada_consolidada < rodadaLimite) {
            console.log(
                `[FLUXO-CONTROLLER] Calculando R${cache.ultima_rodada_consolidada + 1} → R${rodadaLimite}`,
            );

            for (
                let r = cache.ultima_rodada_consolidada + 1;
                r <= rodadaLimite;
                r++
            ) {
                const resultado = await calcularFinanceiroDaRodada(
                    liga,
                    timeId,
                    r,
                    rodadaAtualCartola,
                );

                if (resultado.transacoes.length > 0) {
                    novasTransacoes.push(...resultado.transacoes);
                    novoSaldo += resultado.saldo;
                    cacheModificado = true;
                }
            }
        }

        // ✅ v7.0: Calcular TOP10 histórico (separado do loop de rodadas)
        if (liga.modulos_ativos?.top10 !== false) {
            // Verificar se já tem transações de TOP10 no cache
            const temTop10NoCache = cache.historico_transacoes.some(
                (t) => t.tipo === "MITO" || t.tipo === "MICO"
            );

            if (!temTop10NoCache || forcarRecalculo) {
                // Remover transações de TOP10 antigas (se houver)
                cache.historico_transacoes = cache.historico_transacoes.filter(
                    (t) => t.tipo !== "MITO" && t.tipo !== "MICO"
                );

                // Calcular TOP10 histórico
                const transacoesTop10 = await calcularTop10Historico(ligaId, timeId);
                if (transacoesTop10.length > 0) {
                    novasTransacoes.push(...transacoesTop10);
                    transacoesTop10.forEach((t) => (novoSaldo += t.valor));
                    cacheModificado = true;
                    console.log(
                        `[FLUXO-CONTROLLER] TOP10 histórico: ${transacoesTop10.length} transações`
                    );
                }
            }
        }

        // ✅ v7.1: Calcular MATA-MATA histórico (separado do loop de rodadas)
        // Fix: Se cache foi populado antes da integração de MM, transações não existem
        if (liga.modulos_ativos?.mataMata !== false && String(ligaId) === ID_SUPERCARTOLA_2025) {
            const temMataMataNcache = cache.historico_transacoes.some(
                (t) => t.tipo === "MATA_MATA"
            );

            if (!temMataMataNcache || forcarRecalculo) {
                // Remover transações de MATA_MATA antigas (se houver, para recálculo)
                if (forcarRecalculo) {
                    cache.historico_transacoes = cache.historico_transacoes.filter(
                        (t) => t.tipo !== "MATA_MATA"
                    );
                }

                console.log(`[FLUXO-CONTROLLER] Calculando MATA-MATA histórico para time ${timeId}`);

                // Calcular TODOS os resultados de Mata-Mata
                const resultadosMM = await getResultadosMataMataCompleto(ligaId, rodadaAtualCartola + 1);

                // Filtrar apenas resultados deste time
                const transacoesMM = resultadosMM
                    .filter((r) => String(r.timeId) === String(timeId))
                    .map((r) => {
                        const faseLabel = {
                            primeira: "1ª Fase",
                            oitavas: "Oitavas",
                            quartas: "Quartas",
                            semis: "Semis",
                            final: "Final",
                        }[r.fase] || r.fase;

                        return {
                            rodada: r.rodadaPontos,
                            tipo: "MATA_MATA",
                            descricao: `${r.valor > 0 ? "Vitória" : "Derrota"} M-M ${faseLabel}`,
                            valor: r.valor,
                            fase: r.fase,
                            edicao: r.edicao,
                            data: new Date(),
                        };
                    });

                if (transacoesMM.length > 0) {
                    novasTransacoes.push(...transacoesMM);
                    transacoesMM.forEach((t) => (novoSaldo += t.valor));
                    cacheModificado = true;
                    console.log(
                        `[FLUXO-CONTROLLER] MATA-MATA histórico: ${transacoesMM.length} transações`
                    );
                }
            }
        }

        // Atualizar cache
        if (cacheModificado) {
            cache.historico_transacoes.push(...novasTransacoes);
            cache.saldo_consolidado += novoSaldo;

            cache.ganhos_consolidados = cache.historico_transacoes
                .filter((t) => t.valor > 0)
                .reduce((acc, t) => acc + t.valor, 0);

            cache.perdas_consolidadas = cache.historico_transacoes
                .filter((t) => t.valor < 0)
                .reduce((acc, t) => acc + t.valor, 0);

            cache.ultima_rodada_consolidada = rodadaLimite;
            cache.data_ultima_atualizacao = new Date();

            await cache.save();
            console.log(
                `[FLUXO-CONTROLLER] Cache atualizado: ${cache.historico_transacoes.length} transações`,
            );
        }

        // Adicionar campos manuais
        const camposManuais = await FluxoFinanceiroCampos.findOne({
            ligaId,
            timeId,
        });
        let saldoCampos = 0;
        let transacoesCampos = [];

        if (camposManuais?.campos) {
            camposManuais.campos.forEach((campo) => {
                if (campo.valor !== 0) {
                    saldoCampos += campo.valor;
                    transacoesCampos.push({
                        rodada: null,
                        tipo: "AJUSTE_MANUAL",
                        descricao: campo.nome,
                        valor: campo.valor,
                        data: camposManuais.updatedAt,
                    });
                }
            });
        }

        const saldoTotal = cache.saldo_consolidado + saldoCampos;
        const todasTransacoes = [
            ...cache.historico_transacoes,
            ...transacoesCampos,
        ].sort((a, b) => (b.rodada || 999) - (a.rodada || 999));

        res.json({
            success: true,
            saldo_atual: saldoTotal,
            extrato: todasTransacoes,
            resumo: {
                ganhos:
                    (cache.ganhos_consolidados || 0) +
                    (saldoCampos > 0 ? saldoCampos : 0),
                perdas:
                    (cache.perdas_consolidadas || 0) +
                    (saldoCampos < 0 ? saldoCampos : 0),
                saldo_final: saldoTotal,
            },
            metadados: {
                atualizado_em: cache.data_ultima_atualizacao,
                rodada_consolidada: cache.ultima_rodada_consolidada,
                rodada_atual_cartola: rodadaAtualCartola,
                inativo: isInativo,
                rodada_desistencia: rodadaDesistencia,
            },
        });
    } catch (error) {
        console.error("[FLUXO-CONTROLLER] Erro crítico:", error);
        res.status(500).json({ error: "Erro interno ao processar financeiro" });
    }
};

export const getCampos = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        let campos = await FluxoFinanceiroCampos.findOne({ ligaId, timeId });

        if (!campos) {
            console.log(
                `[FLUXO-CONTROLLER] Criando campos padrão para time ${timeId}`,
            );
            campos = await FluxoFinanceiroCampos.create({
                ligaId,
                timeId,
                campos: [
                    { nome: "Campo 1", valor: 0 },
                    { nome: "Campo 2", valor: 0 },
                    { nome: "Campo 3", valor: 0 },
                    { nome: "Campo 4", valor: 0 },
                ],
            });
        }

        res.json({ success: true, campos: campos.campos });
    } catch (error) {
        console.error("Erro ao buscar campos:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao buscar campos editáveis",
        });
    }
};

export const salvarCampo = async (req, res) => {
    try {
        const { ligaId, timeId, campoIndex } = req.params;
        const { nome, valor } = req.body;
        const index = parseInt(campoIndex);

        if (isNaN(index) || index < 0 || index > 3) {
            return res.status(400).json({ error: "Índice inválido" });
        }

        let documento = await FluxoFinanceiroCampos.findOne({ ligaId, timeId });
        if (!documento) {
            documento = new FluxoFinanceiroCampos({
                ligaId,
                timeId,
                campos: [{}, {}, {}, {}],
            });
        }

        if (nome !== undefined) documento.campos[index].nome = nome;
        if (valor !== undefined)
            documento.campos[index].valor = parseFloat(valor) || 0;

        documento.updatedAt = new Date();
        await documento.save();

        res.json(documento);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao salvar campo" });
    }
};

export const getCamposLiga = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const todosCampos = await FluxoFinanceiroCampos.find({ ligaId });
        res.json(todosCampos);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar campos da liga" });
    }
};

export const salvarCampos = async (req, res) => {
    res.json({ message: "Use a rota patch individual para maior precisão" });
};

export const resetarCampos = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        await FluxoFinanceiroCampos.deleteOne({ ligaId, timeId });
        res.json({ message: "Campos resetados com sucesso" });
    } catch (error) {
        res.status(500).json({ error: "Erro ao resetar campos" });
    }
};

export const deletarCampos = async (req, res) => {
    return resetarCampos(req, res);
};

// ============================================================================
// 🔒 FUNÇÃO PARA CONSOLIDAÇÃO DE SNAPSHOTS
// ============================================================================

export const getFluxoFinanceiroLiga = async (ligaId, rodadaNumero) => {
    try {
        console.log(
            `[FLUXO-CONSOLIDAÇÃO] Processando liga ${ligaId} até R${rodadaNumero}`,
        );

        const liga = await Liga.findById(ligaId);
        if (!liga) throw new Error("Liga não encontrada");

        const financeiroPorTime = [];

        for (const participante of liga.participantes) {
            const timeId = participante.time_id;

            let cache = await ExtratoFinanceiroCache.findOne({
                liga_id: ligaId,
                time_id: timeId,
            });

            if (!cache) {
                cache = new ExtratoFinanceiroCache({
                    liga_id: ligaId,
                    time_id: timeId,
                    ultima_rodada_consolidada: 0,
                    saldo_consolidado: 0,
                    historico_transacoes: [],
                });
            }

            if (cache.ultima_rodada_consolidada < rodadaNumero) {
                for (
                    let r = cache.ultima_rodada_consolidada + 1;
                    r <= rodadaNumero;
                    r++
                ) {
                    // rodadaNumero + 1 como rodadaAtual pois estamos consolidando até rodadaNumero
                    const resultado = await calcularFinanceiroDaRodada(
                        liga,
                        timeId,
                        r,
                        rodadaNumero + 1,
                    );

                    if (resultado.transacoes.length > 0) {
                        cache.historico_transacoes.push(
                            ...resultado.transacoes,
                        );
                        cache.saldo_consolidado += resultado.saldo;
                    }
                }

                // ✅ v7.0: Calcular TOP10 histórico na consolidação
                if (liga.modulos_ativos?.top10 !== false) {
                    // Remover TOP10 antigos
                    cache.historico_transacoes = cache.historico_transacoes.filter(
                        (t) => t.tipo !== "MITO" && t.tipo !== "MICO"
                    );

                    // Calcular TOP10 histórico
                    const transacoesTop10 = await calcularTop10Historico(ligaId, timeId);
                    if (transacoesTop10.length > 0) {
                        cache.historico_transacoes.push(...transacoesTop10);
                        transacoesTop10.forEach((t) => (cache.saldo_consolidado += t.valor));
                    }
                }

                // ✅ v7.1: Calcular MATA-MATA histórico na consolidação (mesmo padrão do TOP10)
                // Fix: Se cache foi populado antes da integração de MM, transações não existem
                if (liga.modulos_ativos?.mataMata !== false && String(ligaId) === ID_SUPERCARTOLA_2025) {
                    // Verificar se já tem transações de MATA_MATA no cache
                    const temMataMataNcache = cache.historico_transacoes.some(
                        (t) => t.tipo === "MATA_MATA"
                    );

                    if (!temMataMataNcache) {
                        console.log(`[FLUXO-CONSOLIDAÇÃO] Recalculando MATA-MATA histórico para time ${timeId}`);

                        // Calcular TODOS os resultados de Mata-Mata
                        const { getResultadosMataMataCompleto } = await import("./mata-mata-backend.js");
                        const resultadosMM = await getResultadosMataMataCompleto(ligaId, rodadaNumero + 1);

                        // Filtrar apenas resultados deste time
                        const transacoesMM = resultadosMM
                            .filter((r) => String(r.timeId) === String(timeId))
                            .map((r) => {
                                const faseLabel = {
                                    primeira: "1ª Fase",
                                    oitavas: "Oitavas",
                                    quartas: "Quartas",
                                    semis: "Semis",
                                    final: "Final",
                                }[r.fase] || r.fase;

                                return {
                                    rodada: r.rodadaPontos,
                                    tipo: "MATA_MATA",
                                    descricao: `${r.valor > 0 ? "Vitória" : "Derrota"} M-M ${faseLabel}`,
                                    valor: r.valor,
                                    fase: r.fase,
                                    edicao: r.edicao,
                                    data: new Date(),
                                };
                            });

                        if (transacoesMM.length > 0) {
                            cache.historico_transacoes.push(...transacoesMM);
                            transacoesMM.forEach((t) => (cache.saldo_consolidado += t.valor));
                            console.log(`[FLUXO-CONSOLIDAÇÃO] ✅ MATA-MATA: ${transacoesMM.length} transações adicionadas para time ${timeId}`);
                        }
                    }
                }

                cache.ganhos_consolidados = cache.historico_transacoes
                    .filter((t) => t.valor > 0)
                    .reduce((acc, t) => acc + t.valor, 0);

                cache.perdas_consolidadas = cache.historico_transacoes
                    .filter((t) => t.valor < 0)
                    .reduce((acc, t) => acc + t.valor, 0);

                cache.ultima_rodada_consolidada = rodadaNumero;
                cache.data_ultima_atualizacao = new Date();

                await cache.save();
            }

            const camposManuais = await FluxoFinanceiroCampos.findOne({
                ligaId,
                timeId,
            });
            let saldoCampos = 0;

            if (camposManuais?.campos) {
                camposManuais.campos.forEach((campo) => {
                    if (campo.valor !== 0) saldoCampos += campo.valor;
                });
            }

            financeiroPorTime.push({
                time_id: timeId,
                nome_time: participante.nome_time,
                nome_cartola: participante.nome_cartola,
                saldo_total: cache.saldo_consolidado + saldoCampos,
                ganhos: cache.ganhos_consolidados || 0,
                perdas: cache.perdas_consolidadas || 0,
                transacoes: cache.historico_transacoes.length,
            });
        }

        console.log(
            `[FLUXO-CONSOLIDAÇÃO] ✅ ${financeiroPorTime.length} times processados`,
        );
        return financeiroPorTime;
    } catch (error) {
        console.error("[FLUXO-CONSOLIDAÇÃO] ❌ Erro:", error);
        throw error;
    }
};

console.log("[FLUXO-CONTROLLER] ✅ v7.2 carregado (FIX DUPLICAÇÃO MM)");
