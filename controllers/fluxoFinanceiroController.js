/**
 * FLUXO-FINANCEIRO-CONTROLLER v6.1
 * ✅ v6.1: MATA-MATA COMPLETO (todas as fases)
 * ✅ v6.0: Alinhamento completo com frontend
 *   - MATA-MATA implementado (+10/-10 por confronto)
 *   - TOP10 por liga (SuperCartola: 30→12, Cartoleiros: 10→1)
 *   - BANCO contextual por liga e rodada
 *   - Suporte a inativos (rodada_desistencia)
 */

import fetch from "node-fetch";
import mongoose from "mongoose";
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import Rodada from "../models/Rodada.js";
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";
import { calcularMataMataParaTime } from "./mata-mata-backend.js";

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
    // Liga Cartoleiros do Sobral - tabela contextual
    if (String(ligaId) === ID_CARTOLEIROS_SOBRAL) {
        if (rodada < 30) {
            // Fase 1: 6 times
            return { 1: 7.0, 2: 4.0, 3: 0.0, 4: -2.0, 5: -5.0, 6: -10.0 };
        } else {
            // Fase 2: 4 times (a partir da R30)
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

function calcularTop10(ligaId, timeId, pontuacoes) {
    const ranking = [...pontuacoes].sort((a, b) => b.pontos - a.pontos);
    const posicao =
        ranking.findIndex((p) => String(p.timeId) === String(timeId)) + 1;
    const totalJogadores = ranking.length;

    if (posicao <= 0) return null;

    const valores = getValoresTop10(ligaId);

    // Verificar MITO (top 10)
    if (posicao <= 10) {
        const premio = valores.mitos[posicao];
        return {
            valor: premio,
            descricao: `MITO: ${posicao}º lugar na rodada`,
            tipo: "MITO",
            posicao: posicao,
        };
    }

    // Verificar MICO (últimos 10)
    const posicaoInversa = totalJogadores - posicao + 1;
    if (posicaoInversa <= 10) {
        const multa = valores.micos[posicaoInversa];
        return {
            valor: multa,
            descricao: `MICO: ${posicao}º lugar na rodada`,
            tipo: "MICO",
            posicao: posicao,
        };
    }

    return null;
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

// Função integrada - usa o módulo completo
async function calcularMataMataRodada(
    ligaId,
    timeId,
    rodadaNumero,
    rodadaAtual,
) {
    // Delega para o módulo que implementa a lógica completa do frontend
    return await calcularMataMataParaTime(
        ligaId,
        timeId,
        rodadaNumero,
        rodadaAtual,
    );
}

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
    if (liga.modulos_ativos?.top10 !== false) {
        const resultadoTop10 = calcularTop10(ligaId, timeId, pontuacoes);
        if (resultadoTop10) {
            transacoes.push({
                rodada: rodadaNumero,
                tipo: resultadoTop10.tipo,
                descricao: resultadoTop10.descricao,
                valor: resultadoTop10.valor,
                posicao: resultadoTop10.posicao,
                data: new Date(),
            });
            saldoRodada += resultadoTop10.valor;
        }
    }

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
    if (
        liga.modulos_ativos?.mataMata !== false &&
        String(ligaId) === ID_SUPERCARTOLA_2025
    ) {
        const resultadoMM = await calcularMataMataRodada(
            ligaId,
            timeId,
            rodadaNumero,
            rodadaAtual,
        );
        if (resultadoMM) {
            transacoes.push({
                rodada: rodadaNumero,
                tipo: "MATA_MATA",
                descricao: resultadoMM.descricao,
                valor: resultadoMM.valor,
                fase: resultadoMM.fase,
                edicao: resultadoMM.edicao,
                data: new Date(),
            });
            saldoRodada += resultadoMM.valor;
        }
    }

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

console.log("[FLUXO-CONTROLLER] ✅ v6.1 carregado (MATA-MATA COMPLETO)");
