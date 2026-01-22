/**
 * FLUXO-FINANCEIRO-CONTROLLER v8.6.0 (SaaS DINÂMICO)
 * ✅ v8.6.0: FIX PREVENTIVO - Query TOP10 agora filtra por temporada (evita cache errado)
 * ✅ v8.5.0: PROTEÇÃO DADOS HISTÓRICOS - resetarCampos/deletarCampos só permite temporada atual
 * ✅ v8.4.0: FIX CRÍTICO - Extrato 2026 não calcula rodadas (pré-temporada)
 *   - Temporadas futuras mostram apenas: inscrição + legado + ajustes
 *   - Integração com sistema de Ajustes (substitui campos manuais em 2026+)
 *   - Bloqueia cálculo de rodadas quando temporada > getFinancialSeason()
 * ✅ v8.3.0: FIX CRÍTICO - Temporada em TODAS as queries (campos, acertos)
 *   - Removido hardcoded "2025" nos acertos financeiros
 *   - getCampos(), salvarCampo(), getCamposLiga() agora filtram por temporada
 *   - getFluxoFinanceiroLiga() também inclui temporada
 * ✅ v8.2.0: FIX CRÍTICO - Temporada obrigatória em queries de cache (evita duplicados)
 * ✅ v8.1.0: Invalidação de cache em cascata ao salvar campos manuais
 * ✅ v8.0.0: MULTI-TENANT - Busca configurações de liga.configuracoes (White Label)
 *   - Remove hardcoded IDs e valores de ligas específicas
 *   - getBancoPorRodada() agora busca de liga.configuracoes.ranking_rodada
 *   - getValoresTop10() agora busca de liga.configuracoes.top10
 *   - Módulos verificados via liga.configuracoes.{modulo}.habilitado
 * ✅ v7.5: CORREÇÃO LÓGICA DE ACERTOS
 *   - Pagamento AUMENTA saldo (quita dívida)
 *   - Recebimento DIMINUI saldo (usa crédito)
 * ✅ v7.4: ACERTOS FINANCEIROS - Pagamentos/recebimentos em tempo real
 * ✅ v7.3: FIX TABELA BANCO - Valores corretos para SuperCartola
 * ✅ v7.2: FIX DUPLICAÇÃO - MATA-MATA removido do loop de rodadas
 * ✅ v7.1: FIX - MATA-MATA histórico calculado fora do loop
 * ✅ v7.0: CORREÇÃO CRÍTICA - TOP10 é ranking HISTÓRICO, não por rodada!
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
import AcertoFinanceiro from "../models/AcertoFinanceiro.js";
import AjusteFinanceiro from "../models/AjusteFinanceiro.js";
import { getResultadosMataMataCompleto } from "./mata-mata-backend.js";
// ✅ v8.1.0: Invalidação de cache em cascata
import { onCamposSaved } from "../utils/cache-invalidator.js";
// ✅ v8.2.0: FIX CRÍTICO - Temporada obrigatória em todas as queries de cache
// ✅ v8.3.0: Usa getFinancialSeason() para consistência com quitacaoController
// ✅ v8.4.0: SEASON_CONFIG para verificar status da temporada
import { CURRENT_SEASON, getFinancialSeason, SEASON_CONFIG } from "../config/seasons.js";

// ============================================================================
// 🔧 CONSTANTES DE FALLBACK (usadas apenas se liga.configuracoes não existir)
// ============================================================================

const RODADA_INICIAL_PONTOS_CORRIDOS = 7;

// ============================================================================
// ✅ v8.0: FUNÇÕES SaaS DINÂMICAS (Multi-Tenant)
// ============================================================================

/**
 * Obtém configuração de ranking_rodada (BANCO) da liga
 * @param {Object} liga - Documento da liga
 * @param {number} rodada - Número da rodada (para configs temporais)
 * @returns {Object} { valores: {posicao: valor}, temporal: boolean }
 */
function getConfigRankingRodada(liga, rodada = 1) {
    const config = liga?.configuracoes?.ranking_rodada;

    if (!config) {
        console.warn(`[FLUXO] Liga ${liga?._id} sem configuracoes.ranking_rodada`);
        return { valores: {}, temporal: false };
    }

    // Config temporal (ex: Sobral com 2 fases)
    if (config.temporal) {
        const rodadaTransicao = config.rodada_transicao || 30;
        const fase = rodada < rodadaTransicao ? 'fase1' : 'fase2';
        const faseConfig = config[fase] || {};

        return {
            valores: faseConfig.valores || {},
            temporal: true,
            rodadaTransicao,
            fase,
        };
    }

    // Config simples
    return {
        valores: config.valores || {},
        temporal: false,
    };
}

/**
 * Obtém configuração de TOP10 (Mitos/Micos) da liga
 * @param {Object} liga - Documento da liga
 * @returns {Object} { mitos: {pos: valor}, micos: {pos: valor} }
 */
function getConfigTop10(liga) {
    const config = liga?.configuracoes?.top10;

    if (!config) {
        console.warn(`[FLUXO] Liga ${liga?._id} sem configuracoes.top10`);
        return { mitos: {}, micos: {} };
    }

    return {
        mitos: config.valores_mito || {},
        micos: config.valores_mico || {},
        habilitado: config.habilitado !== false,
    };
}

/**
 * Verifica se um módulo está habilitado para a liga
 * @param {Object} liga - Documento da liga
 * @param {string} modulo - Nome do módulo (pontos_corridos, mata_mata, top10, etc.)
 * @returns {boolean}
 */
function isModuloHabilitado(liga, modulo) {
    // Primeiro verifica em configuracoes.{modulo}.habilitado
    const configModulo = liga?.configuracoes?.[modulo];
    if (configModulo?.habilitado !== undefined) {
        return configModulo.habilitado;
    }

    // Fallback para modulos_ativos (compatibilidade)
    const moduloKey = modulo.replace(/_/g, ''); // pontos_corridos -> pontoscorridos
    const moduloCamel = modulo.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); // pontos_corridos -> pontosCorridos

    if (liga?.modulos_ativos?.[moduloKey] !== undefined) {
        return liga.modulos_ativos[moduloKey];
    }
    if (liga?.modulos_ativos?.[moduloCamel] !== undefined) {
        return liga.modulos_ativos[moduloCamel];
    }

    return false;
}

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

/**
 * ✅ v8.0: Calcula bônus/ônus de banco usando configuração dinâmica da liga
 * @param {Object} liga - Documento da liga (com configuracoes)
 * @param {number} timeId - ID do time
 * @param {number} rodadaNumero - Número da rodada
 * @param {Array} pontuacoes - Lista de pontuações da rodada
 * @returns {Object|null} { valor, descricao, posicao, totalTimes }
 */
function calcularBanco(liga, timeId, rodadaNumero, pontuacoes) {
    const ranking = [...pontuacoes].sort((a, b) => b.pontos - a.pontos);
    const posicao =
        ranking.findIndex((p) => String(p.timeId) === String(timeId)) + 1;

    if (posicao <= 0) return null;

    const totalTimes = ranking.length;

    // ✅ v8.0: Buscar valores do banco da configuração da liga
    const configRanking = getConfigRankingRodada(liga, rodadaNumero);
    const valorBanco = configRanking.valores[posicao] || configRanking.valores[String(posicao)] || 0;

    if (valorBanco === 0) return null;

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

/**
 * ✅ v8.6: Calcula TOP10 baseado no ranking HISTÓRICO (cache de Top10)
 * - Busca o cache de Top10 que contém os 10 maiores mitos e 10 menores micos
 * - Verifica se o time aparece nesse ranking histórico
 * - Retorna array de transações de TOP10 (pode ter múltiplas aparições)
 * @param {Object} liga - Documento da liga (com configuracoes)
 * @param {number} timeId - ID do time
 * @param {number} temporada - Temporada para filtrar o cache
 */
async function calcularTop10Historico(liga, timeId, temporada) {
    try {
        const ligaId = liga._id;
        // ✅ v8.6: FIX - Filtrar TOP10 por temporada (evita retornar cache errado)
        const cache = await Top10Cache.findOne({
            liga_id: String(ligaId),
            temporada: temporada
        })
            .sort({ rodada_consolidada: -1 })
            .lean();

        if (!cache || !cache.mitos || !cache.micos) {
            console.log(`[FLUXO-CONTROLLER] Top10 cache não encontrado para liga ${ligaId}`);
            return [];
        }

        // ✅ v8.0: Buscar valores do TOP10 da configuração da liga
        const configTop10 = getConfigTop10(liga);
        const transacoes = [];

        // Verificar aparições nos TOP 10 MITOS (10 maiores pontuações históricas)
        cache.mitos.slice(0, 10).forEach((m, i) => {
            const mTimeId = m.timeId || m.time_id;
            if (String(mTimeId) === String(timeId)) {
                const pos = i + 1;
                const valor = configTop10.mitos[pos] || configTop10.mitos[String(pos)] || 0;
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
                const valor = configTop10.micos[pos] || configTop10.micos[String(pos)] || 0;
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
    }).select("timeId pontos nome_time nome_cartola").lean();

    const minhaPontuacaoObj = pontuacoes.find(
        (p) => String(p.timeId) === String(timeId),
    );
    if (!minhaPontuacaoObj) return { transacoes, saldo: 0 };

    const meusPontos = minhaPontuacaoObj.pontos;

    // 1. BANCO (BÔNUS/ÔNUS)
    // ✅ v8.0: Verifica via configuracoes ou modulos_ativos
    if (liga.modulos_ativos?.banco !== false) {
        const resultadoBanco = calcularBanco(
            liga, // ✅ v8.0: Passa liga ao invés de ligaId
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

    // 3. PONTOS CORRIDOS
    // ✅ v8.0: Usa isModuloHabilitado ao invés de hardcoded ID
    if (isModuloHabilitado(liga, 'pontos_corridos') || liga.modulos_ativos?.pontosCorridos) {
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

    // 4. MATA-MATA
    // ✅ v7.2: MATA-MATA é calculado SEPARADAMENTE (histórico completo)
    // NÃO calcular por rodada! Ver cálculo histórico em getExtratoFinanceiro()

    return { transacoes, saldo: saldoRodada };
}

// ============================================================================
// 🎮 CONTROLLERS EXPORTADOS
// ============================================================================

export const getExtratoFinanceiro = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const forcarRecalculo = req.query.refresh === "true";

        // ✅ v8.3.0 FIX: Aceitar temporada via query param para fluxo de renovação
        // Durante pré-temporada (renovação), default é getFinancialSeason() (2025)
        // Mas permite ?temporada=2026 para ver extrato da nova temporada
        const temporadaSolicitada = req.query.temporada ? parseInt(req.query.temporada) : null;
        const temporadaAtual = temporadaSolicitada || getFinancialSeason();

        console.log(
            `[FLUXO-CONTROLLER] Extrato time ${timeId} | temporada=${temporadaAtual} | refresh=${forcarRecalculo}`,
        );

        const statusMercado = await getStatusMercadoInterno();
        const rodadaAtualCartola = statusMercado.rodada_atual;
        const mercadoAberto = statusMercado.status_mercado === 1;

        const limiteConsolidacao = mercadoAberto
            ? rodadaAtualCartola - 1
            : rodadaAtualCartola;

        // ✅ v8.2.0 FIX: Buscar ou criar cache COM TEMPORADA (evita duplicados)
        // ✅ v8.3.0: Usa temporadaAtual dinâmica (pode ser 2025 ou 2026)

        let cache = await ExtratoFinanceiroCache.findOne({
            liga_id: ligaId,
            time_id: timeId,
            temporada: temporadaAtual,
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
                temporada: temporadaAtual,
                ultima_rodada_consolidada: 0,
                saldo_consolidado: 0,
                historico_transacoes: [],
            });
        }

        const liga = await Liga.findById(ligaId).lean();
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

        // ✅ v8.4.0: Verificar se é temporada FUTURA (ainda não começou)
        // Durante pré-temporada (status='preparando'), getFinancialSeason() retorna temporada anterior
        // Se temporadaAtual > getFinancialSeason(), significa que estamos consultando uma temporada futura
        const temporadaFinanceira = getFinancialSeason();
        const isTemporadaFutura = temporadaAtual > temporadaFinanceira;

        if (isTemporadaFutura) {
            console.log(
                `[FLUXO-CONTROLLER] ⚠️ Temporada FUTURA (${temporadaAtual} > ${temporadaFinanceira}) - NÃO calcular rodadas`
            );
        }

        // Calcular rodadas pendentes
        // ✅ v8.4.0: BLOQUEAR cálculo de rodadas para temporadas futuras
        let novasTransacoes = [];
        let novoSaldo = 0;
        let cacheModificado = false;

        // Só calcular rodadas se NÃO for temporada futura
        if (!isTemporadaFutura && cache.ultima_rodada_consolidada < rodadaLimite) {
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

        // ✅ v8.0: Calcular TOP10 histórico (separado do loop de rodadas)
        // ✅ v8.4.0: Só calcular se NÃO for temporada futura
        const top10Habilitado = isModuloHabilitado(liga, 'top10') || liga.modulos_ativos?.top10 !== false;
        if (top10Habilitado && !isTemporadaFutura) {
            // Verificar se já tem transações de TOP10 no cache
            const temTop10NoCache = cache.historico_transacoes.some(
                (t) => t.tipo === "MITO" || t.tipo === "MICO"
            );

            if (!temTop10NoCache || forcarRecalculo) {
                // Remover transações de TOP10 antigas (se houver)
                cache.historico_transacoes = cache.historico_transacoes.filter(
                    (t) => t.tipo !== "MITO" && t.tipo !== "MICO"
                );

                // ✅ v8.6: Passa temporada para filtrar cache correto
                const transacoesTop10 = await calcularTop10Historico(liga, timeId, temporadaAtual);
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

        // ✅ v8.0: Calcular MATA-MATA histórico (separado do loop de rodadas)
        // Usa isModuloHabilitado ao invés de hardcoded ID
        // ✅ v8.4.0: Só calcular se NÃO for temporada futura
        const mataHabilitado = isModuloHabilitado(liga, 'mata_mata') || liga.modulos_ativos?.mataMata;
        if (mataHabilitado && !isTemporadaFutura) {
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

        // ✅ v8.4.0: Para temporada 2026+, usar Ajustes. Para anteriores, usar campos manuais
        let saldoCampos = 0;
        let transacoesCampos = [];

        if (temporadaAtual >= 2026) {
            // ✅ v8.4.0: AJUSTES DINÂMICOS (substituem campos manuais em 2026+)
            const ajustes = await AjusteFinanceiro.listarPorParticipante(ligaId, timeId, temporadaAtual);
            const totaisAjustes = await AjusteFinanceiro.calcularTotal(ligaId, timeId, temporadaAtual);

            saldoCampos = totaisAjustes.total || 0;

            if (ajustes && ajustes.length > 0) {
                transacoesCampos = ajustes.map(a => ({
                    rodada: null,
                    tipo: "AJUSTE",
                    descricao: a.descricao,
                    valor: a.valor,
                    data: a.criado_em,
                    _id: a._id,
                }));
                console.log(`[FLUXO-CONTROLLER] Ajustes 2026+: ${ajustes.length} transações, total R$ ${saldoCampos}`);
            }
        } else {
            // Campos manuais (temporadas anteriores a 2026)
            // ✅ v8.3.0 FIX: Incluir temporada na query (evita mistura de dados entre temporadas)
            const camposManuais = await FluxoFinanceiroCampos.findOne({
                ligaId,
                timeId,
                temporada: temporadaAtual,
            }).lean();

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
        }

        // ✅ v7.4: Buscar acertos financeiros (pagamentos/recebimentos em tempo real)
        // ✅ v8.3.0 FIX: Usar temporadaAtual ao invés de hardcoded "2025"
        const acertosInfo = await AcertoFinanceiro.calcularSaldoAcertos(ligaId, timeId, temporadaAtual);
        const acertos = await AcertoFinanceiro.buscarPorTime(ligaId, timeId, temporadaAtual);
        let transacoesAcertos = [];

        if (acertos && acertos.length > 0) {
            // ✅ v7.5: CORREÇÃO - Pagamento AUMENTA saldo (quita dívida)
            // PAGAMENTO → valor positivo (participante pagou, saldo aumenta)
            // RECEBIMENTO → valor negativo (participante recebeu, saldo diminui)
            transacoesAcertos = acertos.map(a => ({
                rodada: null,
                tipo: "ACERTO_FINANCEIRO",
                subtipo: a.tipo, // 'pagamento' ou 'recebimento'
                descricao: a.descricao,
                valor: a.tipo === "pagamento" ? a.valor : -a.valor,
                data: a.dataAcerto,
                metodoPagamento: a.metodoPagamento,
            }));
            console.log(`[FLUXO-CONTROLLER] Acertos financeiros: ${acertos.length} transações`);
        }

        // Saldo da temporada (sem acertos)
        const saldoTemporada = cache.saldo_consolidado + saldoCampos;

        // Saldo total (temporada + acertos)
        // acertosInfo.saldoAcertos: recebido - pago
        const saldoTotal = saldoTemporada + acertosInfo.saldoAcertos;

        const todasTransacoes = [
            ...cache.historico_transacoes,
            ...transacoesCampos,
            ...transacoesAcertos,
        ].sort((a, b) => {
            // Ordenar por data (mais recente primeiro), rodadas antes de acertos
            const rodadaA = a.rodada || 0;
            const rodadaB = b.rodada || 0;
            if (rodadaA !== rodadaB) return rodadaB - rodadaA;
            // Se mesma rodada (ou null), ordenar por data
            const dataA = new Date(a.data || 0).getTime();
            const dataB = new Date(b.data || 0).getTime();
            return dataB - dataA;
        });

        res.json({
            success: true,
            saldo_atual: saldoTotal,
            saldo_temporada: saldoTemporada,
            saldo_acertos: acertosInfo.saldoAcertos,
            extrato: todasTransacoes,
            acertos: {
                lista: transacoesAcertos,
                resumo: acertosInfo,
            },
            resumo: {
                ganhos:
                    (cache.ganhos_consolidados || 0) +
                    (saldoCampos > 0 ? saldoCampos : 0),
                perdas:
                    (cache.perdas_consolidadas || 0) +
                    (saldoCampos < 0 ? saldoCampos : 0),
                saldo_temporada: saldoTemporada,
                saldo_acertos: acertosInfo.saldoAcertos,
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
        // ✅ v8.3.0 FIX: Aceitar temporada via query param, default getFinancialSeason()
        const temporadaAtual = req.query.temporada ? parseInt(req.query.temporada) : getFinancialSeason();
        let campos = await FluxoFinanceiroCampos.findOne({ ligaId, timeId, temporada: temporadaAtual }).lean();

        if (!campos) {
            console.log(
                `[FLUXO-CONTROLLER] Criando campos padrão para time ${timeId} (temporada ${temporadaAtual})`,
            );
            campos = await FluxoFinanceiroCampos.create({
                ligaId,
                timeId,
                temporada: temporadaAtual,
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
        const { nome, valor, temporada } = req.body;
        const index = parseInt(campoIndex);
        // ✅ v8.3.0 FIX: Aceitar temporada via body ou query, default getFinancialSeason()
        const temporadaAtual = temporada ? parseInt(temporada) : (req.query.temporada ? parseInt(req.query.temporada) : getFinancialSeason());

        if (isNaN(index) || index < 0 || index > 3) {
            return res.status(400).json({ error: "Índice inválido" });
        }

        let documento = await FluxoFinanceiroCampos.findOne({ ligaId, timeId, temporada: temporadaAtual });
        if (!documento) {
            documento = new FluxoFinanceiroCampos({
                ligaId,
                timeId,
                temporada: temporadaAtual,
                campos: [{}, {}, {}, {}],
            });
        }

        if (nome !== undefined) documento.campos[index].nome = nome;
        if (valor !== undefined)
            documento.campos[index].valor = parseFloat(valor) || 0;

        documento.updatedAt = new Date();
        await documento.save();

        // ✅ v8.1.0: Invalidar cache para recalcular saldos
        await onCamposSaved(ligaId, timeId);

        res.json(documento);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao salvar campo" });
    }
};

export const getCamposLiga = async (req, res) => {
    try {
        const { ligaId } = req.params;
        // ✅ v8.3.0 FIX: Aceitar temporada via query, default getFinancialSeason()
        const temporadaAtual = req.query.temporada ? parseInt(req.query.temporada) : getFinancialSeason();
        const todosCampos = await FluxoFinanceiroCampos.find({ ligaId, temporada: temporadaAtual }).lean();
        res.json(todosCampos);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar campos da liga" });
    }
};

export const salvarCampos = async (req, res) => {
    res.json({ message: "Use a rota patch individual para maior precisão" });
};

/**
 * ✅ v8.5.0: PROTEÇÃO DE DADOS HISTÓRICOS
 * Só permite resetar/deletar campos da temporada ATUAL (CURRENT_SEASON)
 * Temporadas anteriores são IMUTÁVEIS (dados históricos congelados)
 */
export const resetarCampos = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const temporada = Number(req.query.temporada) || CURRENT_SEASON;

        // 🔒 PROTEÇÃO: Só permite operações na temporada atual ou futura
        if (temporada < CURRENT_SEASON) {
            return res.status(403).json({
                error: `Operação bloqueada: temporada ${temporada} é histórica e imutável`,
                temporada_atual: CURRENT_SEASON
            });
        }

        await FluxoFinanceiroCampos.deleteOne({ ligaId, timeId, temporada });
        console.log(`[FLUXO] Campos resetados: liga=${ligaId}, time=${timeId}, temporada=${temporada}`);
        res.json({ message: "Campos resetados com sucesso", temporada });
    } catch (error) {
        console.error('[FLUXO] Erro ao resetar campos:', error);
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

        const liga = await Liga.findById(ligaId).lean();
        if (!liga) throw new Error("Liga não encontrada");

        const financeiroPorTime = [];
        // ✅ v8.2.0 FIX: Usar temporada atual em todas as queries
        const temporadaAtual = CURRENT_SEASON;

        for (const participante of liga.participantes) {
            const timeId = participante.time_id;

            // ✅ v8.2.0 FIX: Incluir temporada na query (evita duplicados)
            let cache = await ExtratoFinanceiroCache.findOne({
                liga_id: ligaId,
                time_id: timeId,
                temporada: temporadaAtual,
            });

            if (!cache) {
                cache = new ExtratoFinanceiroCache({
                    liga_id: ligaId,
                    time_id: timeId,
                    temporada: temporadaAtual,
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

                // ✅ v8.0: Calcular TOP10 histórico na consolidação
                const top10Habilitado = isModuloHabilitado(liga, 'top10') || liga.modulos_ativos?.top10 !== false;
                if (top10Habilitado) {
                    // ✅ FIX: Subtrair TOP10 antigos do saldo ANTES de remover do array
                    const top10Antigos = cache.historico_transacoes.filter(
                        (t) => t.tipo === "MITO" || t.tipo === "MICO"
                    );
                    top10Antigos.forEach((t) => (cache.saldo_consolidado -= t.valor));

                    // Remover TOP10 antigos do array
                    cache.historico_transacoes = cache.historico_transacoes.filter(
                        (t) => t.tipo !== "MITO" && t.tipo !== "MICO"
                    );

                    // ✅ v8.6: Passa temporada para filtrar cache correto
                    const transacoesTop10 = await calcularTop10Historico(liga, timeId, temporadaAtual);
                    if (transacoesTop10.length > 0) {
                        cache.historico_transacoes.push(...transacoesTop10);
                        transacoesTop10.forEach((t) => (cache.saldo_consolidado += t.valor));
                    }
                }

                // ✅ v8.0: Calcular MATA-MATA histórico na consolidação
                // Usa isModuloHabilitado ao invés de hardcoded ID
                const mataHabilitado = isModuloHabilitado(liga, 'mata_mata') || liga.modulos_ativos?.mataMata;
                if (mataHabilitado) {
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

            // ✅ v8.3.0 FIX: Incluir temporada na query (segregação de dados)
            const camposManuais = await FluxoFinanceiroCampos.findOne({
                ligaId,
                timeId,
                temporada: temporadaAtual,
            }).lean();
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

console.log("[FLUXO-CONTROLLER] ✅ v8.4.0 carregado (Extrato 2026 + Ajustes Dinâmicos)");
