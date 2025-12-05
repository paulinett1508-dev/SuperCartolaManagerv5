import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";
import mongoose from "mongoose";

// Helper para converter ligaId para ObjectId se necessário
function toLigaId(ligaId) {
    if (mongoose.Types.ObjectId.isValid(ligaId)) {
        return new mongoose.Types.ObjectId(ligaId);
    }
    return ligaId;
}

// ===== FUNÇÃO AUXILIAR: Calcular resumo a partir das rodadas =====
function calcularResumoDeRodadas(rodadas, camposManuais = null) {
    if (!Array.isArray(rodadas) || rodadas.length === 0) {
        console.warn(
            "[CACHE-CONTROLLER] ⚠️ calcularResumoDeRodadas: array vazio",
        );
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

    console.log(
        "[CACHE-CONTROLLER] 📊 Calculando resumo de",
        rodadas.length,
        "rodadas",
    );

    let totalBonus = 0;
    let totalOnus = 0;
    let totalPontosCorridos = 0;
    let totalMataMata = 0;
    let totalTop10 = 0;
    let totalGanhos = 0;
    let totalPerdas = 0;

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

    // ✅ Somar campos manuais
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

    const resultado = {
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

    console.log("[CACHE-CONTROLLER] ✅ Resumo calculado:", resultado);

    return resultado;
}

// ===== FUNÇÃO: Transformar transações em rodadas consolidadas =====
function transformarTransacoesEmRodadas(transacoes, ligaId) {
    if (!Array.isArray(transacoes) || transacoes.length === 0) {
        return [];
    }

    const primeiroItem = transacoes[0];
    const jaEstaConsolidado =
        primeiroItem.bonusOnus !== undefined ||
        primeiroItem.pontosCorridos !== undefined ||
        primeiroItem.mataMata !== undefined ||
        primeiroItem.top10 !== undefined;

    if (jaEstaConsolidado) {
        console.log(
            "[CACHE-CONTROLLER] ✅ Dados já estão no formato de rodadas consolidadas",
        );
        return transacoes.map((rodada, idx) => ({
            ...rodada,
            saldoAcumulado: transacoes
                .slice(0, idx + 1)
                .reduce((acc, r) => acc + (r.saldo || 0), 0),
        }));
    }

    console.log(
        "[CACHE-CONTROLLER] 🔄 Convertendo formato antigo para rodadas consolidadas",
    );
    const rodadasMap = {};

    transacoes.forEach((t) => {
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
                r.posicao = 1;
                const matchMito = t.descricao?.match(/(\d+)º/);
                if (matchMito) r.top10Posicao = parseInt(matchMito[1]);
                break;
            case "MICO":
                r.top10 += valor;
                r.isMico = true;
                r.top10Status = "MICO";
                const matchMico = t.descricao?.match(/(\d+)º/);
                if (matchMico) {
                    r.posicao = parseInt(matchMico[1]);
                    r.top10Posicao = parseInt(matchMico[1]);
                }
                break;
            case "BONUS":
            case "ONUS":
            case "BONUS_ONUS":
                r.bonusOnus += valor;
                break;
            default:
                r.bonusOnus += valor;
        }

        r.saldo += valor;
    });

    const rodadasArray = Object.values(rodadasMap).sort(
        (a, b) => a.rodada - b.rodada,
    );

    let saldoAcumulado = 0;
    rodadasArray.forEach((r) => {
        saldoAcumulado += r.saldo;
        r.saldoAcumulado = saldoAcumulado;
    });

    return rodadasArray;
}

// ===== BUSCAR CAMPOS MANUAIS =====
async function buscarCamposManuais(ligaId, timeId) {
    try {
        const doc = await FluxoFinanceiroCampos.findOne({
            ligaId: String(ligaId),
            timeId: String(timeId),
        }).lean();

        if (!doc || !doc.campos) return [];

        return doc.campos.filter((c) => c.valor !== 0);
    } catch (error) {
        console.error(
            "[CACHE-CONTROLLER] Erro ao buscar campos manuais:",
            error,
        );
        return [];
    }
}

// ===== BUSCAR EXTRATO EM CACHE (GET) =====
export const getExtratoCache = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;

        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
        }).lean();

        if (!cache) {
            return res.status(404).json({
                cached: false,
                message: "Cache não encontrado para este time",
            });
        }

        // ✅ Buscar campos manuais
        const camposAtivos = await buscarCamposManuais(ligaId, timeId);

        if (camposAtivos.length > 0) {
            console.log(
                `[CACHE-CONTROLLER] 💰 Campos manuais para time ${timeId}:`,
                camposAtivos.map((c) => ({ nome: c.nome, valor: c.valor })),
            );
        }

        const transacoes = cache.historico_transacoes || [];
        const rodadasConsolidadas = transformarTransacoesEmRodadas(
            transacoes,
            ligaId,
        );
        const resumoCalculado = calcularResumoDeRodadas(
            rodadasConsolidadas,
            camposAtivos,
        );

        console.log("[CACHE-CONTROLLER] 📦 Cache encontrado:", {
            timeId,
            transacoes: transacoes.length,
            rodadasConsolidadas: rodadasConsolidadas.length,
            ultimaRodada: cache.ultima_rodada_consolidada,
            saldo: resumoCalculado.saldo,
            camposManuais: resumoCalculado.camposManuais,
        });

        if (rodadasConsolidadas.length === 0) {
            console.warn(
                "[CACHE-CONTROLLER] ⚠️ Cache sem rodadas consolidadas válidas",
            );
            return res.status(404).json({
                cached: false,
                message: "Cache sem dados válidos",
            });
        }

        res.json({
            cached: true,
            rodadas: rodadasConsolidadas,
            resumo: resumoCalculado,
            camposManuais: camposAtivos,
            metadados: cache.metadados,
            ultimaRodadaCalculada: cache.ultima_rodada_consolidada,
            updatedAt: cache.updatedAt,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao buscar cache:", error);
        res.status(500).json({ error: "Erro interno ao buscar cache" });
    }
};

// ===== SALVAR/ATUALIZAR CACHE (POST) =====
export const salvarExtratoCache = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const {
            extrato,
            historico_transacoes,
            ultimaRodadaCalculada,
            motivoRecalculo,
            saldo,
            resumo,
        } = req.body;

        const dadosParaSalvar = historico_transacoes || extrato || [];

        let rodadasArray = dadosParaSalvar;

        if (!Array.isArray(dadosParaSalvar) && dadosParaSalvar?.rodadas) {
            rodadasArray = dadosParaSalvar.rodadas;
        }

        const rodadaCalculadaReal =
            ultimaRodadaCalculada ||
            (Array.isArray(rodadasArray) && rodadasArray.length > 0
                ? Math.max(...rodadasArray.map((r) => r.rodada || 0))
                : 0);

        const resumoCalculado = calcularResumoDeRodadas(rodadasArray);

        console.log(`[CACHE-CONTROLLER] 💾 Salvando cache:`, {
            timeId,
            rodadasRecebidas: rodadasArray?.length || 0,
            ultimaRodadaCalculada: rodadaCalculadaReal,
            saldoCalculado: resumoCalculado.saldo,
            motivoRecalculo,
        });

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
                versaoCalculo: "3.2.0",
                timestampCalculo: new Date(),
                motivoRecalculo: motivoRecalculo || "atualizacao_frontend",
                origem: "participante_app",
            },
        };

        const cache = await ExtratoFinanceiroCache.findOneAndUpdate(
            { liga_id: toLigaId(ligaId), time_id: Number(timeId) },
            cacheData,
            { new: true, upsert: true },
        );

        console.log(
            `[CACHE] Cache salvo com sucesso: Time ${timeId} | Saldo: ${cacheData.saldo_consolidado}`,
        );

        res.json({
            success: true,
            message: "Cache atualizado com sucesso",
            updatedAt: cache.updatedAt,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao salvar cache:", error);
        if (error.name === "StrictModeError") {
            console.error(
                "⚠️ ERRO DE SCHEMA: Campo não permitido no Model.",
                error.path,
            );
        }
        res.status(500).json({ error: "Erro ao salvar cache do extrato" });
    }
};

// ===== INVALIDAR CACHE DE UM TIME =====
export const invalidarCacheTime = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        await ExtratoFinanceiroCache.findOneAndDelete({
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
        });
        res.json({ success: true, message: "Cache invalidado" });
    } catch (error) {
        res.status(500).json({ error: "Erro ao invalidar cache" });
    }
};

// ===== INVALIDAR CACHE DE TODA A LIGA =====
export const invalidarCacheLiga = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const result = await ExtratoFinanceiroCache.deleteMany({
            liga_id: toLigaId(ligaId),
        });
        res.json({
            success: true,
            message: `${result.deletedCount} caches invalidados`,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao invalidar cache da liga" });
    }
};

// ===== VERIFICAR STATUS DO CACHE (VALIDAÇÃO INTELIGENTE) =====
export const verificarCacheValido = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { rodadaAtual, mercadoAberto } = req.query;

        const cacheExistente = await ExtratoFinanceiroCache.findOne({
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
        }).lean();

        if (!cacheExistente) {
            return res.json({ valido: false, motivo: "cache_nao_encontrado" });
        }

        const rodadaAtualNum = parseInt(rodadaAtual);
        const mercadoEstaAberto = mercadoAberto === "true";
        const rodadaAtualInt = parseInt(rodadaAtual);

        let validacao = { valido: false, motivo: "erro_simulacao" };

        if (
            !mercadoEstaAberto &&
            cacheExistente.ultima_rodada_consolidada >= rodadaAtualInt
        ) {
            const transacoes = cacheExistente.historico_transacoes || [];
            const rodadasConsolidadas = transformarTransacoesEmRodadas(
                transacoes,
                ligaId,
            );
            const camposAtivos = await buscarCamposManuais(ligaId, timeId);
            const resumoCalculado = calcularResumoDeRodadas(
                rodadasConsolidadas,
                camposAtivos,
            );

            validacao = {
                valido: true,
                cached: true,
                permanente: true,
                motivo: "rodada_fechada_cache_permanente",
                ultimaRodada: cacheExistente.ultima_rodada_consolidada,
                mercadoStatus: "fechado",
                updatedAt: cacheExistente.updatedAt,
                rodadas: rodadasConsolidadas,
                resumo: resumoCalculado,
                camposManuais: camposAtivos,
            };
        } else if (mercadoEstaAberto) {
            const rodadaAnterior = Math.max(1, rodadaAtualInt - 1);

            if (cacheExistente.ultima_rodada_consolidada >= rodadaAnterior) {
                const timestampCache =
                    cacheExistente.updatedAt ||
                    cacheExistente.data_ultima_atualizacao;
                const idadeCache =
                    Date.now() - new Date(timestampCache).getTime();
                const CACHE_TTL_MERCADO_ABERTO = 5 * 60 * 1000;

                if (idadeCache < CACHE_TTL_MERCADO_ABERTO) {
                    const transacoes =
                        cacheExistente.historico_transacoes || [];
                    const rodadasConsolidadas = transformarTransacoesEmRodadas(
                        transacoes,
                        ligaId,
                    );
                    const camposAtivos = await buscarCamposManuais(
                        ligaId,
                        timeId,
                    );
                    const resumoCalculado = calcularResumoDeRodadas(
                        rodadasConsolidadas,
                        camposAtivos,
                    );

                    validacao = {
                        valido: true,
                        cached: true,
                        permanente: false,
                        motivo: "cache_mercado_aberto_recente",
                        ultimaRodada: cacheExistente.ultima_rodada_consolidada,
                        mercadoStatus: "aberto",
                        idadeMinutos: Math.floor(idadeCache / 60000),
                        updatedAt: cacheExistente.updatedAt,
                        rodadas: rodadasConsolidadas,
                        resumo: resumoCalculado,
                        camposManuais: camposAtivos,
                    };
                } else {
                    validacao = {
                        valido: false,
                        motivo: "cache_expirado_mercado_aberto",
                        ultimaRodada: cacheExistente.ultima_rodada_consolidada,
                        mercadoStatus: "aberto",
                        idadeMinutos: Math.floor(idadeCache / 60000),
                    };
                }
            } else {
                validacao = {
                    valido: false,
                    motivo: "cache_desatualizado",
                    ultimaRodadaCache: cacheExistente.ultima_rodada_consolidada,
                    rodadaAtual: rodadaAtualInt,
                };
            }
        } else {
            validacao = {
                valido: false,
                motivo: "cache_desatualizado",
                ultimaRodadaCache: cacheExistente.ultima_rodada_consolidada,
                rodadaAtual: rodadaAtualInt,
            };
        }

        res.json(validacao);
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao verificar cache:", error);
        res.status(500).json({ error: "Erro ao verificar cache" });
    }
};

// ===== VERIFICAR SE CACHE EXISTE E ESTÁ ATUALIZADO =====
export const verificarCacheExiste = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;

        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
        })
            .select("ultima_rodada_consolidada data_ultima_atualizacao")
            .lean();

        if (!cache) {
            return res.json({ existe: false });
        }

        res.json({
            existe: true,
            ultimaRodada: cache.ultima_rodada_consolidada,
            atualizadoEm: cache.data_ultima_atualizacao,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao verificar cache" });
    }
};

// ===== BUSCAR EXTRATO PARA PARTICIPANTE (ALIAS SIMPLIFICADO) =====
export const getExtratoParticipante = async (req, res) => {
    return getExtratoCache(req, res);
};

// ===== LER CACHE EXTRATO FINANCEIRO (VALIDAÇÃO INTELIGENTE) =====
export const lerCacheExtratoFinanceiro = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { rodadaAtual, statusMercado } = req.query;

        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
        }).lean();

        if (!cache) {
            return res.status(404).json({ cached: false });
        }

        const rodadaAtualNum = parseInt(rodadaAtual) || 0;
        const mercadoFechado = parseInt(statusMercado) === 2;

        const rodadaCache =
            cache.ultima_rodada_consolidada || cache.rodada_calculada || 0;
        let cacheValido = false;

        if (mercadoFechado) {
            cacheValido = rodadaCache >= rodadaAtualNum;
        } else {
            cacheValido = rodadaCache >= rodadaAtualNum - 1;
        }

        if (!cacheValido) {
            console.log(
                `[CACHE-EXTRATO] ❌ Cache desatualizado: calculado até R${rodadaCache}, esperado R${rodadaAtualNum}`,
            );
            return res.status(404).json({
                cached: false,
                reason: "outdated",
                cachedUntil: rodadaCache,
                expectedUntil: rodadaAtualNum,
            });
        }

        const transacoes = cache.historico_transacoes || [];
        const rodadasConsolidadas = transformarTransacoesEmRodadas(
            transacoes,
            ligaId,
        );
        const camposAtivos = await buscarCamposManuais(ligaId, timeId);
        const resumoCalculado = calcularResumoDeRodadas(
            rodadasConsolidadas,
            camposAtivos,
        );

        console.log(
            `[CACHE-EXTRATO] ✅ Cache válido: R${rodadaCache} (atual: R${rodadaAtualNum})`,
        );
        console.log(
            `[CACHE-EXTRATO] 📊 Retornando ${rodadasConsolidadas.length} rodadas consolidadas`,
        );

        res.json({
            cached: true,
            rodada_calculada: rodadaCache,
            dados: rodadasConsolidadas,
            dados_extrato: rodadasConsolidadas,
            rodadas: rodadasConsolidadas,
            saldo_total: resumoCalculado.saldo,
            resumo: resumoCalculado,
            camposManuais: camposAtivos,
            updatedAt: cache.updatedAt || cache.data_ultima_atualizacao,
        });
    } catch (error) {
        console.error("[CACHE-EXTRATO] Erro ao ler:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

// ===== LER CACHE COM VALIDAÇÃO (ENDPOINT PRINCIPAL) =====
export const lerCacheComValidacao = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { rodadaAtual } = req.query;

        const rodadaAtualNum = parseInt(rodadaAtual) || 1;

        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
        }).lean();

        if (!cache) {
            return res.status(404).json({
                cached: false,
                message: "Cache não encontrado",
                needsRecalc: true,
            });
        }

        const rodadaCache = cache.ultima_rodada_consolidada || 0;

        if (rodadaCache < rodadaAtualNum) {
            return res.status(200).json({
                cached: true,
                needsRecalc: true,
                message: `Cache desatualizado (R${rodadaCache} < R${rodadaAtualNum})`,
                rodada_cache: rodadaCache,
                expectedUntil: rodadaAtualNum,
            });
        }

        const transacoes = cache.historico_transacoes || [];
        const rodadasConsolidadas = transformarTransacoesEmRodadas(
            transacoes,
            ligaId,
        );
        const camposAtivos = await buscarCamposManuais(ligaId, timeId);
        const resumoCalculado = calcularResumoDeRodadas(
            rodadasConsolidadas,
            camposAtivos,
        );

        console.log(
            `[CACHE-EXTRATO] ✅ Cache válido: R${rodadaCache} (atual: R${rodadaAtualNum})`,
        );
        console.log(
            `[CACHE-EXTRATO] 📊 Retornando ${rodadasConsolidadas.length} rodadas consolidadas`,
        );

        res.json({
            cached: true,
            rodada_calculada: rodadaCache,
            dados: rodadasConsolidadas,
            dados_extrato: rodadasConsolidadas,
            rodadas: rodadasConsolidadas,
            saldo_total: resumoCalculado.saldo,
            resumo: resumoCalculado,
            camposManuais: camposAtivos,
            updatedAt: cache.updatedAt || cache.data_ultima_atualizacao,
        });
    } catch (error) {
        console.error("[CACHE-EXTRATO] Erro ao ler:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

// =====================================================================
// FUNÇÕES DE LIMPEZA DE CACHE
// =====================================================================

// ===== LIMPAR CACHE DE UMA LIGA ESPECÍFICA =====
export const limparCacheLiga = async (req, res) => {
    try {
        const { ligaId } = req.params;

        console.log(`[CACHE-LIMPEZA] 🗑️ Limpando caches da liga: ${ligaId}`);

        const resultado = await ExtratoFinanceiroCache.deleteMany({
            liga_id: toLigaId(ligaId),
        });

        console.log(
            `[CACHE-LIMPEZA] ✅ ${resultado.deletedCount} caches removidos`,
        );

        res.json({
            success: true,
            message: `Cache da liga limpo com sucesso`,
            deletedCount: resultado.deletedCount,
            ligaId,
        });
    } catch (error) {
        console.error("[CACHE-LIMPEZA] ❌ Erro:", error);
        res.status(500).json({ error: "Erro ao limpar cache da liga" });
    }
};

// ===== LIMPAR CACHE DE UM TIME ESPECÍFICO =====
export const limparCacheTime = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;

        console.log(
            `[CACHE-LIMPEZA] 🗑️ Limpando cache do time ${timeId} na liga ${ligaId}`,
        );

        const resultado = await ExtratoFinanceiroCache.deleteOne({
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
        });

        console.log(
            `[CACHE-LIMPEZA] ✅ ${resultado.deletedCount} cache removido`,
        );

        res.json({
            success: true,
            message: `Cache do time limpo com sucesso`,
            deletedCount: resultado.deletedCount,
            ligaId,
            timeId,
        });
    } catch (error) {
        console.error("[CACHE-LIMPEZA] ❌ Erro:", error);
        res.status(500).json({ error: "Erro ao limpar cache do time" });
    }
};

// ===== LIMPAR TODOS OS CACHES CORROMPIDOS =====
export const limparCachesCorrompidos = async (req, res) => {
    try {
        const { ligaId } = req.params;

        console.log(`[CACHE-LIMPEZA] 🔍 Identificando caches corrompidos...`);

        const filtro = {
            $or: [
                { historico_transacoes: { $type: "number" } },
                { historico_transacoes: { $exists: false } },
                { historico_transacoes: { $size: 0 } },
                { "historico_transacoes.0.bonusOnus": { $exists: false } },
                { "historico_transacoes.0.posicao": { $exists: false } },
            ],
        };

        if (ligaId) {
            filtro.liga_id = ligaId;
        }

        const contagem = await ExtratoFinanceiroCache.countDocuments(filtro);

        console.log(
            `[CACHE-LIMPEZA] 📊 Encontrados ${contagem} caches corrompidos`,
        );

        if (contagem === 0) {
            return res.json({
                success: true,
                message: "Nenhum cache corrompido encontrado",
                deletedCount: 0,
            });
        }

        const resultado = await ExtratoFinanceiroCache.deleteMany(filtro);

        console.log(
            `[CACHE-LIMPEZA] ✅ ${resultado.deletedCount} caches corrompidos removidos`,
        );

        res.json({
            success: true,
            message: `Caches corrompidos limpos com sucesso`,
            deletedCount: resultado.deletedCount,
            ligaId: ligaId || "todas",
        });
    } catch (error) {
        console.error("[CACHE-LIMPEZA] ❌ Erro:", error);
        res.status(500).json({ error: "Erro ao limpar caches corrompidos" });
    }
};

// ===== LIMPAR TODOS OS CACHES (ADMIN) =====
export const limparTodosCaches = async (req, res) => {
    try {
        const { confirmar } = req.query;

        if (confirmar !== "sim") {
            return res.status(400).json({
                error: "Operação perigosa! Adicione ?confirmar=sim para executar",
                message:
                    "Esta operação irá deletar TODOS os caches de extrato financeiro",
            });
        }

        console.log(`[CACHE-LIMPEZA] ⚠️ LIMPANDO TODOS OS CACHES!`);

        const resultado = await ExtratoFinanceiroCache.deleteMany({});

        console.log(
            `[CACHE-LIMPEZA] ✅ ${resultado.deletedCount} caches removidos`,
        );

        res.json({
            success: true,
            message: `Todos os caches foram limpos`,
            deletedCount: resultado.deletedCount,
        });
    } catch (error) {
        console.error("[CACHE-LIMPEZA] ❌ Erro:", error);
        res.status(500).json({ error: "Erro ao limpar todos os caches" });
    }
};

// ===== ESTATÍSTICAS DE CACHE =====
export const estatisticasCache = async (req, res) => {
    try {
        const { ligaId } = req.params;

        const filtroBase = ligaId ? { liga_id: toLigaId(ligaId) } : {};

        const total = await ExtratoFinanceiroCache.countDocuments(filtroBase);

        const corrompidos = await ExtratoFinanceiroCache.countDocuments({
            ...filtroBase,
            $or: [
                { historico_transacoes: { $type: "number" } },
                { historico_transacoes: { $exists: false } },
                { historico_transacoes: { $size: 0 } },
                { "historico_transacoes.0.bonusOnus": { $exists: false } },
                { "historico_transacoes.0.posicao": { $exists: false } },
            ],
        });

        const validos = total - corrompidos;

        const ultimoCache = await ExtratoFinanceiroCache.findOne(filtroBase)
            .sort({ updatedAt: -1 })
            .select("updatedAt liga_id time_id")
            .lean();

        res.json({
            success: true,
            estatisticas: {
                total,
                validos,
                corrompidos,
                percentualValido:
                    total > 0
                        ? ((validos / total) * 100).toFixed(1) + "%"
                        : "0%",
                ultimaAtualizacao: ultimoCache?.updatedAt || null,
                ligaId: ligaId || "todas",
            },
        });
    } catch (error) {
        console.error("[CACHE-STATS] ❌ Erro:", error);
        res.status(500).json({ error: "Erro ao obter estatísticas" });
    }
};
