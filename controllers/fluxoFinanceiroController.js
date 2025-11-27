import fetch from "node-fetch";
import mongoose from "mongoose";
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import Rodada from "../models/Rodada.js";
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";

// ============================================================================
// 🛠️ FUNÇÕES AUXILIARES (CORE DO CÁLCULO)
// ============================================================================

// Função auxiliar para obter status do mercado (Sem depender de req/res)
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
            "[FLUXO-FINANCEIRO] Falha ao obter status mercado, usando fallback.",
        );
        return { rodada_atual: 38, status_mercado: 2 }; // Fallback seguro
    }
}

// Gera os confrontos de Pontos Corridos para uma rodada específica
async function calcularConfrontoPontosCorridos(
    liga,
    timeId,
    rodadaCartola,
    pontuacaoTime,
    todasPontuacoes,
) {
    const RODADA_INICIAL_LIGA =
        liga.configuracoes?.pontos_corridos?.rodadaInicial || 7;
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

    if (diferenca <= 0.3) {
        valor = 3.0;
        descricao = `Empate Pontos Corridos vs ${oponente.nome_time} (Dif: ${diferenca.toFixed(2)})`;
    } else if (pontuacaoTime > pontuacaoOponente) {
        if (diferenca >= 50) {
            valor = 7.0;
            descricao = `Vitória (Goleada) Pontos Corridos vs ${oponente.nome_time}`;
        } else {
            valor = 5.0;
            descricao = `Vitória Pontos Corridos vs ${oponente.nome_time}`;
        }
    } else {
        if (diferenca >= 50) {
            valor = -7.0;
            descricao = `Derrota (Goleada) Pontos Corridos vs ${oponente.nome_time}`;
        } else {
            valor = -5.0;
            descricao = `Derrota Pontos Corridos vs ${oponente.nome_time}`;
        }
    }

    return { valor, descricao };
}

// Calcula Mitos e Micos (Top 10)
function calcularTop10(pontuacaoTime, todasPontuacoes) {
    const rankingRodada = todasPontuacoes.sort((a, b) => b.pontos - a.pontos);

    const posicao =
        rankingRodada.findIndex(
            (p) => Math.abs(p.pontos - pontuacaoTime) < 0.01,
        ) + 1;
    const totalJogadores = rankingRodada.length;

    const PREMIO_1 = 30.0;
    const DECREMENTO = 2.0;

    // Verificar se é MITO
    if (posicao <= 10) {
        const premio = PREMIO_1 - (posicao - 1) * DECREMENTO;
        return {
            valor: premio,
            descricao: `TOP 10 MITO: ${posicao}º Lugar na Rodada`,
        };
    }

    // Verificar se é MICO
    const posicaoInversa = totalJogadores - posicao + 1;
    if (posicaoInversa <= 10) {
        const multa = (PREMIO_1 - (posicaoInversa - 1) * DECREMENTO) * -1;
        return {
            valor: multa,
            descricao: `TOP 10 MICO: ${posicao}º Lugar na Rodada`,
        };
    }

    return null;
}

// Processa UMA rodada para UM time
async function calcularFinanceiroDaRodada(liga, timeId, rodadaNumero) {
    let transacoes = [];
    let saldoRodada = 0;

    const pontuacoes = await Rodada.find({
        ligaId: liga._id,
        rodada: rodadaNumero,
    }).select("timeId pontos");

    const minhaPontuacaoObj = pontuacoes.find(
        (p) => String(p.timeId) === String(timeId),
    );

    if (!minhaPontuacaoObj) return { transacoes, saldo: 0 };

    const meusPontos = minhaPontuacaoObj.pontos;

    if (liga.modulos_ativos?.pontosCorridos) {
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

    if (liga.modulos_ativos?.top10) {
        const resultadoTop10 = calcularTop10(meusPontos, pontuacoes);
        if (resultadoTop10) {
            transacoes.push({
                rodada: rodadaNumero,
                tipo: resultadoTop10.valor > 0 ? "MITO" : "MICO",
                descricao: resultadoTop10.descricao,
                valor: resultadoTop10.valor,
                data: new Date(),
            });
            saldoRodada += resultadoTop10.valor;
        }
    }

    return { transacoes, saldo: saldoRodada };
}

// ============================================================================
// 🎮 CONTROLLERS EXPORTADOS (CORE)
// ============================================================================

export const getExtratoFinanceiro = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const forcarRecalculo = req.query.refresh === "true";

        const statusMercado = await getStatusMercadoInterno();
        const rodadaAtualCartola = statusMercado.rodada_atual;
        const mercadoAberto = statusMercado.status_mercado === 1;

        const limiteConsolidacao = mercadoAberto
            ? rodadaAtualCartola - 1
            : rodadaAtualCartola;

        let cache = await ExtratoFinanceiroCache.findOne({
            liga_id: ligaId,
            time_id: timeId,
        });

        if (forcarRecalculo && cache) {
            await ExtratoFinanceiroCache.deleteOne({ _id: cache._id });
            cache = null;
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

        let novasTransacoes = [];
        let novoSaldo = 0;
        let cacheModificado = false;

        if (cache.ultima_rodada_consolidada < limiteConsolidacao) {
            console.log(
                `[FINANCEIRO] Atualizando cache time ${timeId} (R${cache.ultima_rodada_consolidada + 1} -> R${limiteConsolidacao})`,
            );

            for (
                let r = cache.ultima_rodada_consolidada + 1;
                r <= limiteConsolidacao;
                r++
            ) {
                const resultado = await calcularFinanceiroDaRodada(
                    liga,
                    timeId,
                    r,
                );

                if (resultado.transacoes.length > 0) {
                    novasTransacoes.push(...resultado.transacoes);
                    novoSaldo += resultado.saldo;
                    cacheModificado = true;
                }
            }
        }

        if (cacheModificado) {
            cache.historico_transacoes.push(...novasTransacoes);
            cache.saldo_consolidado += novoSaldo;

            cache.ganhos_consolidados = cache.historico_transacoes
                .filter((t) => t.valor > 0)
                .reduce((acc, t) => acc + t.valor, 0);

            cache.perdas_consolidadas = cache.historico_transacoes
                .filter((t) => t.valor < 0)
                .reduce((acc, t) => acc + t.valor, 0);

            cache.ultima_rodada_consolidada = limiteConsolidacao;
            cache.data_ultima_atualizacao = new Date();

            await cache.save();
        }

        const camposManuais = await FluxoFinanceiroCampos.findOne({
            ligaId,
            timeId,
        });
        let saldoCampos = 0;
        let transacoesCampos = [];

        if (camposManuais && camposManuais.campos) {
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
        ].sort((a, b) => new Date(b.data) - new Date(a.data));

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
            },
        });
    } catch (error) {
        console.error("[FLUXO-FINANCEIRO] Erro crítico:", error);
        res.status(500).json({ error: "Erro interno ao processar financeiro" });
    }
};

export const getCampos = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        let campos = await FluxoFinanceiroCampos.findOne({ ligaId, timeId });

        // ✅ CRIAR AUTOMATICAMENTE SE NÃO EXISTIR
        if (!campos) {
            console.log(`[FLUXO-CONTROLLER] Criando campos padrão para time ${timeId}`);
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

        res.json({
            success: true,
            campos: campos.campos,
        });
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

        if (isNaN(index) || index < 0 || index > 3)
            return res.status(400).json({ error: "Índice inválido" });

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

// ============================================================================
// ➕ FUNÇÕES COMPLEMENTARES (Evitam erro de import na Rota)
// ============================================================================

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
        console.log(`[FINANCEIRO-CONSOLIDAÇÃO] Processando liga ${ligaId} até R${rodadaNumero}`);
        
        const liga = await Liga.findById(ligaId);
        if (!liga) throw new Error('Liga não encontrada');
        
        const financeiroPorTime = [];
        
        // Para cada participante da liga
        for (const participante of liga.participantes) {
            const timeId = participante.time_id;
            
            // Buscar ou criar cache
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
            
            // Atualizar cache até a rodada especificada
            if (cache.ultima_rodada_consolidada < rodadaNumero) {
                for (let r = cache.ultima_rodada_consolidada + 1; r <= rodadaNumero; r++) {
                    const resultado = await calcularFinanceiroDaRodada(liga, timeId, r);
                    
                    if (resultado.transacoes.length > 0) {
                        cache.historico_transacoes.push(...resultado.transacoes);
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
            
            // Adicionar campos manuais
            const camposManuais = await FluxoFinanceiroCampos.findOne({ ligaId, timeId });
            let saldoCampos = 0;
            
            if (camposManuais && camposManuais.campos) {
                camposManuais.campos.forEach((campo) => {
                    if (campo.valor !== 0) {
                        saldoCampos += campo.valor;
                    }
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
        
        console.log(`[FINANCEIRO-CONSOLIDAÇÃO] ✅ ${financeiroPorTime.length} times processados`);
        return financeiroPorTime;
        
    } catch (error) {
        console.error('[FINANCEIRO-CONSOLIDAÇÃO] ❌ Erro:', error);
        throw error;
    }
};