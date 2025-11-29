// FLUXO-FINANCEIRO-CORE.JS - OTIMIZADO COM CACHE MONGODB v4.0
// ✅ Integração completa com backend cache - Validação inteligente

import { calcularFinanceiroConfronto } from "../pontos-corridos-utils.js";
import { obterLigaId } from "../pontos-corridos-utils.js";
import { FluxoFinanceiroCampos } from "./fluxo-financeiro-campos.js";
import {
    RODADA_INICIAL_PONTOS_CORRIDOS,
    ID_SUPERCARTOLA_2025,
    ID_CARTOLEIROS_SOBRAL,
    normalizarTimeId,
} from "./fluxo-financeiro-utils.js";
import {
    valoresBancoPadrao,
    valoresBancoCartoleirosSobral,
} from "../rodadas/rodadas-config.js";

const API_BASE_URL = window.location.origin;

export class FluxoFinanceiroCore {
    constructor(cache) {
        this.cache = cache;
        this.mataMataIntegrado = false;
        this.mataMataMap = new Map();
        this._integrarMataMata();
    }

    async _integrarMataMata() {
        try {
            const { getRankingRodadaEspecifica } = await import(
                "../rodadas.js"
            );
            const { setRankingFunction } = await import(
                "../mata-mata/mata-mata-financeiro.js"
            );
            setRankingFunction(getRankingRodadaEspecifica);
            this.mataMataIntegrado = true;
            console.log("[FLUXO-CORE] ✅ Mata-mata integrado com sucesso");
        } catch (error) {
            console.error("[FLUXO-CORE] Erro ao integrar mata-mata:", error);
            this.mataMataIntegrado = false;
        }
    }

    async _carregarMataMataMap(resultadosMataMata) {
        this.mataMataMap.clear();
        let ultimaRodadaConsolidada = 999;

        try {
            const mercadoResponse = await fetch("/api/cartola/mercado/status");
            if (mercadoResponse.ok) {
                const mercadoData = await mercadoResponse.json();
                const mercadoAberto =
                    mercadoData.mercado_aberto ||
                    mercadoData.status_mercado === 1;
                ultimaRodadaConsolidada = mercadoAberto
                    ? Math.max(1, mercadoData.rodada_atual - 1)
                    : mercadoData.rodada_atual;
            }
        } catch (error) {
            console.warn(
                "[FLUXO-CORE] Erro ao verificar mercado para Map:",
                error,
            );
        }

        resultadosMataMata.forEach((r) => {
            if (r.rodadaPontos <= ultimaRodadaConsolidada) {
                const timeIdNormalizado = normalizarTimeId(r.timeId);
                const key = `${timeIdNormalizado}_${r.rodadaPontos}`;
                this.mataMataMap.set(key, r.valor);
            }
        });
    }

    // ===================================================================
    // ✅ MÉTODO PRINCIPAL - CALCULAR EXTRATO COM CACHE INTELIGENTE
    // ===================================================================
    async calcularExtratoFinanceiro(
        timeId,
        ultimaRodadaCompleta,
        forcarRecalculo = false,
    ) {
        const ligaId = obterLigaId();
        let rodadaParaCalculo = ultimaRodadaCompleta;
        let mercadoAberto = false;

        // ✅ PASSO 1: Verificar status do mercado
        try {
            const mercadoResponse = await fetch("/api/cartola/mercado/status");
            if (mercadoResponse.ok) {
                const mercadoData = await mercadoResponse.json();
                mercadoAberto =
                    mercadoData.mercado_aberto ||
                    mercadoData.status_mercado === 1;
                const rodadaAtualMercado = mercadoData.rodada_atual;
                if (mercadoAberto) {
                    rodadaParaCalculo = Math.max(1, rodadaAtualMercado - 1);
                }
            }
        } catch (error) {
            console.warn("[FLUXO-CORE] Erro ao verificar mercado:", error);
        }

        console.log(
            `[FLUXO-CORE] 🎯 Iniciando extrato time ${timeId} até R${rodadaParaCalculo} (forçar: ${forcarRecalculo})`,
        );

        // ===================================================================
        // ✅ PASSO 2: VERIFICAR CACHE MONGODB (PRIORIDADE MÁXIMA)
        // ===================================================================
        if (!forcarRecalculo) {
            const cacheValido = await this._verificarCacheMongoDB(
                ligaId,
                timeId,
                rodadaParaCalculo,
                mercadoAberto,
            );

            if (cacheValido && cacheValido.valido) {
                // ✅ VALIDAR QUE RODADAS É ARRAY COM DADOS
                const rodadasArray = cacheValido.rodadas || [];

                console.log(`[FLUXO-CORE] 📊 Debug cache:`, {
                    temRodadas: Array.isArray(rodadasArray),
                    qtdRodadas: rodadasArray.length,
                    primeiraRodada: rodadasArray[0],
                    ultimaRodada: rodadasArray[rodadasArray.length - 1],
                });

                // ✅ VALIDAÇÃO CRÍTICA: Verificar se rodadas têm campos essenciais
                const primeiraRodada = rodadasArray[0];
                const cacheIncompleto =
                    !primeiraRodada ||
                    primeiraRodada.bonusOnus === undefined ||
                    primeiraRodada.posicao === undefined;

                // Se não tiver rodadas válidas OU cache incompleto, forçar recálculo
                if (
                    !Array.isArray(rodadasArray) ||
                    rodadasArray.length === 0 ||
                    cacheIncompleto
                ) {
                    console.warn(
                        `[FLUXO-CORE] ⚠️ Cache incompleto/corrompido - forçando recálculo`,
                    );
                    console.log(
                        `[FLUXO-CORE] 📊 Campos da primeira rodada:`,
                        Object.keys(primeiraRodada || {}),
                    );
                    // Continua para recalcular
                } else {
                    console.log(
                        `[FLUXO-CORE] ⚡ CACHE MONGODB VÁLIDO - ZERO RECÁLCULO!`,
                    );

                    // Carregar campos editáveis atuais (podem ter mudado)
                    const camposEditaveis =
                        await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(
                            timeId,
                        );

                    // ✅ Recalcular resumo baseado nas rodadas do cache
                    const resumoRecalculado = this._recalcularResumoDoCache(
                        rodadasArray,
                        camposEditaveis,
                    );

                    // ✅ CRÍTICO: Recalcular saldo acumulado de cada rodada
                    this._calcularSaldoAcumulado(rodadasArray);

                    // Montar extrato com dados do cache + campos atuais
                    const extratoDoCache = {
                        rodadas: rodadasArray,
                        resumo: {
                            ...resumoRecalculado,
                            campo1:
                                parseFloat(camposEditaveis.campo1?.valor) || 0,
                            campo2:
                                parseFloat(camposEditaveis.campo2?.valor) || 0,
                            campo3:
                                parseFloat(camposEditaveis.campo3?.valor) || 0,
                            campo4:
                                parseFloat(camposEditaveis.campo4?.valor) || 0,
                        },
                        camposEditaveis: camposEditaveis,
                        totalTimes: rodadasArray[0]?.totalTimes || 32,
                        updatedAt: cacheValido.updatedAt,
                    };

                    // Recalcular saldo final com campos editáveis atualizados
                    extratoDoCache.resumo.saldo = this._calcularSaldoFinal(
                        extratoDoCache.resumo,
                    );

                    console.log(`[FLUXO-CORE] ✅ Extrato do cache montado:`, {
                        rodadas: extratoDoCache.rodadas.length,
                        saldo: extratoDoCache.resumo.saldo,
                    });

                    return extratoDoCache;
                }
            }
        }

        // ===================================================================
        // ✅ PASSO 3: CACHE NÃO VÁLIDO - CALCULAR DO ZERO
        // ===================================================================
        console.log(
            `[FLUXO-CORE] 🔄 Calculando extrato completo para time ${timeId}...`,
        );

        const isSuperCartola2025 = ligaId === ID_SUPERCARTOLA_2025;
        const isCartoleirosSobral = ligaId === ID_CARTOLEIROS_SOBRAL;

        // Garantir rankings carregados
        await this.cache.carregarCacheRankingsEmLotes(rodadaParaCalculo, null);

        // Carregar campos editáveis
        const camposEditaveis =
            await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);

        // Carregar Mata-Mata
        const resultadosMataMata = this.mataMataIntegrado
            ? this.cache.getResultadosMataMata()
            : [];
        if (resultadosMataMata.length > 0) {
            this._carregarMataMataMap(resultadosMataMata);
        }

        // Montar estrutura do extrato
        const extrato = {
            rodadas: [],
            resumo: {
                totalGanhos: 0,
                totalPerdas: 0,
                bonus: 0,
                onus: 0,
                pontosCorridos: isSuperCartola2025 ? 0 : null,
                mataMata: 0,
                melhorMes: 0,
                campo1: parseFloat(camposEditaveis.campo1?.valor) || 0,
                campo2: parseFloat(camposEditaveis.campo2?.valor) || 0,
                campo3: parseFloat(camposEditaveis.campo3?.valor) || 0,
                campo4: parseFloat(camposEditaveis.campo4?.valor) || 0,
                vezesMito: 0,
                vezesMico: 0,
                saldo: 0,
                top10: 0,
            },
            totalTimes: 0,
            camposEditaveis: camposEditaveis,
        };

        // Buscar dados Top10 (Mitos/Micos)
        const dadosTop10 = await this.buscarDadosTop10(timeId);
        const top10Map = new Map(dadosTop10.map((item) => [item.rodada, item]));

        // ===================================================================
        // ✅ PASSO 4: PROCESSAR CADA RODADA
        // ===================================================================
        const rodadasProcessadas = [];
        for (let rodada = 1; rodada <= rodadaParaCalculo; rodada++) {
            const rodadaData = this._processarRodadaIntegrada(
                timeId,
                rodada,
                isSuperCartola2025,
                isCartoleirosSobral,
            );

            if (rodadaData) {
                // Adicionar dados Top10
                const top10Data = top10Map.get(rodada);
                rodadaData.top10 = top10Data ? top10Data.valor || 0 : 0;
                rodadaData.top10Status = top10Data ? top10Data.status : null;
                rodadaData.top10Posicao = top10Data ? top10Data.posicao : null;

                rodadasProcessadas.push(rodadaData);
                extrato.totalTimes = Math.max(
                    extrato.totalTimes,
                    rodadaData.totalTimes,
                );
                this._acumularValoresIntegrados(
                    extrato.resumo,
                    rodadaData,
                    isSuperCartola2025,
                );
            }
        }

        extrato.rodadas = rodadasProcessadas;
        this._calcularSaldoAcumulado(extrato.rodadas, camposEditaveis);
        extrato.resumo.saldo = this._calcularSaldoFinal(extrato.resumo);
        this._calcularTotaisConsolidados(extrato.resumo, extrato.rodadas);

        // ===================================================================
        // ✅ PASSO 5: SALVAR NO CACHE MONGODB
        // ===================================================================
        await this._salvarCacheMongoDB(
            ligaId,
            timeId,
            extrato,
            rodadaParaCalculo,
            "calculo_completo",
        );

        console.log(
            `[FLUXO-CORE] ✅ Extrato calculado: ${extrato.rodadas.length} rodadas | Saldo: R$ ${extrato.resumo.saldo.toFixed(2)}`,
        );

        return extrato;
    }

    // ===================================================================
    // ✅ NOVO: Verificar cache MongoDB via API de validação
    // ===================================================================
    async _verificarCacheMongoDB(ligaId, timeId, rodadaAtual, mercadoAberto) {
        try {
            const timestamp = Date.now();
            const url = `${API_BASE_URL}/api/extrato-cache/${ligaId}/times/${timeId}/cache/valido?rodadaAtual=${rodadaAtual}&mercadoAberto=${mercadoAberto}&_=${timestamp}`;

            console.log(`[FLUXO-CORE] 🔍 Verificando cache MongoDB...`);

            const response = await fetch(url);

            if (!response.ok) {
                console.log(
                    `[FLUXO-CORE] ⚠️ Cache não encontrado (${response.status})`,
                );
                return null;
            }

            const cacheData = await response.json();

            // ✅ VALIDAÇÃO CRÍTICA: Verificar se rodadas é um ARRAY
            if (cacheData.valido && cacheData.cached) {
                // Verificar estrutura correta
                const temRodadasArray =
                    Array.isArray(cacheData.rodadas) ||
                    Array.isArray(cacheData.data);

                if (!temRodadasArray) {
                    console.warn(
                        `[FLUXO-CORE] ⚠️ Cache encontrado mas sem array de rodadas - forçando recálculo`,
                    );
                    console.log(
                        `[FLUXO-CORE] 📊 Estrutura recebida:`,
                        Object.keys(cacheData),
                    );
                    return null; // Forçar recálculo
                }

                // Normalizar estrutura - rodadas pode vir em 'rodadas' ou 'data'
                const rodadasArray = Array.isArray(cacheData.rodadas)
                    ? cacheData.rodadas
                    : cacheData.data;

                console.log(`[FLUXO-CORE] ⚡ Cache válido encontrado:`, {
                    motivo: cacheData.motivo,
                    permanente: cacheData.permanente,
                    rodadas: rodadasArray?.length || 0,
                    saldo: cacheData.resumo?.saldo,
                });

                return {
                    ...cacheData,
                    rodadas: rodadasArray, // Garantir que rodadas é array
                };
            }

            console.log(`[FLUXO-CORE] ⚠️ Cache inválido: ${cacheData.motivo}`);
            return null;
        } catch (error) {
            console.warn(
                `[FLUXO-CORE] ❌ Erro ao verificar cache:`,
                error.message,
            );
            return null;
        }
    }

    // ===================================================================
    // ✅ NOVO: Salvar cache no MongoDB
    // ===================================================================
    async _salvarCacheMongoDB(
        ligaId,
        timeId,
        extrato,
        ultimaRodadaCalculada,
        motivo,
    ) {
        try {
            const payload = {
                historico_transacoes: extrato.rodadas,
                ultimaRodadaCalculada,
                motivoRecalculo: motivo,
                resumo: {
                    saldo: extrato.resumo.saldo,
                    totalGanhos: extrato.resumo.totalGanhos,
                    totalPerdas: extrato.resumo.totalPerdas,
                    bonus: extrato.resumo.bonus,
                    onus: extrato.resumo.onus,
                    pontosCorridos: extrato.resumo.pontosCorridos,
                    mataMata: extrato.resumo.mataMata,
                    top10: extrato.resumo.top10,
                },
                saldo: extrato.resumo.saldo,
            };

            console.log(
                `[FLUXO-CORE] 💾 Salvando cache MongoDB: ${payload.historico_transacoes?.length} rodadas até R${ultimaRodadaCalculada}`,
            );

            const response = await fetch(
                `${API_BASE_URL}/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                console.log(`[FLUXO-CORE] ✅ Cache MongoDB salvo com sucesso`);
            } else {
                console.warn(
                    `[FLUXO-CORE] ⚠️ Falha ao salvar cache: ${response.status}`,
                );
            }
        } catch (error) {
            console.warn(
                "[FLUXO-CORE] ❌ Erro ao salvar cache:",
                error.message,
            );
        }
    }

    // ===================================================================
    // MÉTODOS DE PROCESSAMENTO (mantidos)
    // ===================================================================
    _processarRodadaIntegrada(
        timeId,
        rodada,
        isSuperCartola2025,
        isCartoleirosSobral,
    ) {
        const ranking = this.cache.getRankingRodada(rodada);
        if (!ranking || !ranking.length) {
            return this._criarRodadaVazia(rodada, isSuperCartola2025);
        }

        const posicaoIndex = ranking.findIndex((r) => {
            const rTimeId = normalizarTimeId(r.timeId || r.time_id || r.id);
            return rTimeId === normalizarTimeId(timeId);
        });

        if (posicaoIndex === -1) {
            return this._criarRodadaVazia(
                rodada,
                isSuperCartola2025,
                ranking.length,
            );
        }

        const totalTimes = ranking.length;
        const posicaoReal = posicaoIndex + 1;
        const isMito = posicaoReal === 1;
        const isMico = posicaoReal === totalTimes;

        const bonusOnus = this._calcularBonusOnus(
            posicaoReal,
            isCartoleirosSobral,
        );
        const pontosCorridos = isSuperCartola2025
            ? this.calcularPontosCorridosParaRodada(timeId, rodada)
            : null;
        const mataMata = this._calcularMataMataOtimizado(timeId, rodada);

        return {
            rodada,
            posicao: posicaoReal,
            totalTimes,
            bonusOnus,
            pontosCorridos,
            mataMata,
            melhorMes: 0,
            top10: 0,
            top10Status: null,
            isMito,
            isMico,
        };
    }

    _criarRodadaVazia(rodada, isSuperCartola2025, totalTimes = 0) {
        return {
            rodada,
            posicao: null,
            totalTimes,
            bonusOnus: 0,
            pontosCorridos: isSuperCartola2025 ? 0 : null,
            mataMata: 0,
            melhorMes: 0,
            top10: 0,
            top10Status: null,
            isMito: false,
            isMico: false,
        };
    }

    _calcularMataMataOtimizado(timeId, rodada) {
        if (!this.mataMataIntegrado || this.mataMataMap.size === 0) return 0;
        const key = `${normalizarTimeId(timeId)}_${rodada}`;
        return this.mataMataMap.get(key) || 0;
    }

    // ===================================================================
    // ✅ NOVO: Recalcular resumo a partir das rodadas do cache
    // ===================================================================
    _recalcularResumoDoCache(rodadasArray, camposEditaveis) {
        let bonus = 0;
        let onus = 0;
        let pontosCorridos = 0;
        let mataMata = 0;
        let top10 = 0;
        let totalGanhos = 0;
        let totalPerdas = 0;

        for (const rodada of rodadasArray) {
            // Bônus/Ônus
            const bonusOnusValor = parseFloat(rodada.bonusOnus) || 0;
            if (bonusOnusValor > 0) {
                bonus += bonusOnusValor;
                totalGanhos += bonusOnusValor;
            } else if (bonusOnusValor < 0) {
                onus += bonusOnusValor;
                totalPerdas += Math.abs(bonusOnusValor);
            }

            // Pontos Corridos
            const pcValor = parseFloat(rodada.pontosCorridos) || 0;
            pontosCorridos += pcValor;
            if (pcValor > 0) totalGanhos += pcValor;
            else if (pcValor < 0) totalPerdas += Math.abs(pcValor);

            // Mata-Mata
            const mmValor = parseFloat(rodada.mataMata) || 0;
            mataMata += mmValor;
            if (mmValor > 0) totalGanhos += mmValor;
            else if (mmValor < 0) totalPerdas += Math.abs(mmValor);

            // Top 10
            const t10Valor = parseFloat(rodada.top10) || 0;
            top10 += t10Valor;
            if (t10Valor > 0) totalGanhos += t10Valor;
            else if (t10Valor < 0) totalPerdas += Math.abs(t10Valor);
        }

        return {
            bonus,
            onus,
            pontosCorridos,
            mataMata,
            top10,
            totalGanhos,
            totalPerdas,
            saldo: 0, // Será recalculado depois com campos editáveis
        };
    }

    _calcularBonusOnus(posicaoReal, isCartoleirosSobral) {
        const valores = isCartoleirosSobral
            ? valoresBancoCartoleirosSobral
            : valoresBancoPadrao;
        return valores[posicaoReal] || 0;
    }

    calcularPontosCorridosParaRodada(timeId, rodada) {
        if (rodada < RODADA_INICIAL_PONTOS_CORRIDOS) return null;
        const idxRodada = rodada - RODADA_INICIAL_PONTOS_CORRIDOS;
        const confrontos = this.cache.getConfrontosPontosCorridos();
        if (!confrontos || idxRodada >= confrontos.length) return null;

        const jogos = confrontos[idxRodada];
        if (!jogos) return null;

        const timeIdNorm = normalizarTimeId(timeId);
        const confronto = jogos.find(
            (j) =>
                normalizarTimeId(j.timeA?.id || j.timeA?.time_id) ===
                    timeIdNorm ||
                normalizarTimeId(j.timeB?.id || j.timeB?.time_id) ===
                    timeIdNorm,
        );

        if (!confronto) return null;

        const ranking = this.cache.getRankingRodada(rodada);
        if (!ranking) return null;

        const timeA_id = normalizarTimeId(
            confronto.timeA?.id || confronto.timeA?.time_id,
        );
        const timeB_id = normalizarTimeId(
            confronto.timeB?.id || confronto.timeB?.time_id,
        );

        const dadosTimeA = ranking.find(
            (r) => normalizarTimeId(r.timeId || r.time_id || r.id) === timeA_id,
        );
        const dadosTimeB = ranking.find(
            (r) => normalizarTimeId(r.timeId || r.time_id || r.id) === timeB_id,
        );

        if (!dadosTimeA || !dadosTimeB) return null;

        const resultado = calcularFinanceiroConfronto(
            parseFloat(dadosTimeA.pontos),
            parseFloat(dadosTimeB.pontos),
        );
        return timeA_id === timeIdNorm
            ? resultado.financeiroA
            : resultado.financeiroB;
    }

    _acumularValoresIntegrados(resumo, r, isSuper) {
        if (r.bonusOnus > 0) resumo.bonus += r.bonusOnus;
        if (r.bonusOnus < 0) resumo.onus += r.bonusOnus;
        if (isSuper && typeof r.pontosCorridos === "number") {
            resumo.pontosCorridos += r.pontosCorridos;
        }
        resumo.mataMata += r.mataMata || 0;
        resumo.top10 += r.top10 || 0;
    }

    _calcularSaldoAcumulado(rodadas) {
        let saldo = 0;
        rodadas.forEach((r) => {
            saldo +=
                (r.bonusOnus || 0) +
                (r.pontosCorridos || 0) +
                (r.mataMata || 0) +
                (r.top10 || 0);
            r.saldo = saldo;
        });
    }

    _calcularSaldoFinal(resumo) {
        const pontosCorridos =
            resumo.pontosCorridos === null ? 0 : resumo.pontosCorridos;
        return (
            resumo.bonus +
            resumo.onus +
            pontosCorridos +
            resumo.mataMata +
            resumo.top10 +
            resumo.campo1 +
            resumo.campo2 +
            resumo.campo3 +
            resumo.campo4
        );
    }

    _calcularTotaisConsolidados(resumo, rodadas) {
        resumo.totalGanhos = 0;
        resumo.totalPerdas = 0;

        if (rodadas) {
            rodadas.forEach((r) => {
                const val =
                    (r.bonusOnus || 0) +
                    (r.pontosCorridos || 0) +
                    (r.mataMata || 0) +
                    (r.top10 || 0);
                if (val > 0) resumo.totalGanhos += val;
                else resumo.totalPerdas += val;
            });
        }

        [1, 2, 3, 4].forEach((i) => {
            const val = resumo[`campo${i}`];
            if (val > 0) resumo.totalGanhos += val;
            else resumo.totalPerdas += val;
        });
    }

    async buscarDadosTop10(timeId) {
        try {
            const { garantirDadosCarregados } = await import("../top10.js");
            const { mitos, micos } = await garantirDadosCarregados();

            const ligaId = obterLigaId();
            const isCartoleirosSobral = ligaId === ID_CARTOLEIROS_SOBRAL;

            const valoresMitos = isCartoleirosSobral
                ? {
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
                  }
                : {
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
                  };

            const valoresMicos = isCartoleirosSobral
                ? {
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
                  }
                : {
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
                  };

            const timeIdNormalizado = normalizarTimeId(timeId);
            const historico = [];

            mitos.forEach((mito, idx) => {
                if (normalizarTimeId(mito.timeId) === timeIdNormalizado) {
                    historico.push({
                        rodada: mito.rodada,
                        valor: valoresMitos[idx + 1] || 0,
                        status: "MITO",
                        posicao: idx + 1,
                    });
                }
            });

            micos.forEach((mico, idx) => {
                if (normalizarTimeId(mico.timeId) === timeIdNormalizado) {
                    historico.push({
                        rodada: mico.rodada,
                        valor: valoresMicos[idx + 1] || 0,
                        status: "MICO",
                        posicao: idx + 1,
                    });
                }
            });

            return historico;
        } catch (e) {
            console.warn("[FLUXO-CORE] Erro ao buscar Top10:", e);
            return [];
        }
    }

    async carregarParticipantes() {
        return await this.cache.carregarParticipantes();
    }

    async buscarParticipante(timeId) {
        const parts = await this.carregarParticipantes();
        return parts.find((p) => String(p.time_id) === String(timeId));
    }
}

// ===================================================================
// FUNÇÃO GLOBAL PARA FORÇAR REFRESH
// ===================================================================
window.forcarRefreshExtrato = async function (timeId) {
    const ligaId = window.obterLigaId();

    console.log(
        `[FLUXO-CORE] 🔄 Forçando refresh do extrato para time ${timeId}...`,
    );

    // Invalidar cache MongoDB
    try {
        await fetch(
            `${API_BASE_URL}/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
            {
                method: "DELETE",
            },
        );
        console.log(`[FLUXO-CORE] 🗑️ Cache MongoDB invalidado`);
    } catch (error) {
        console.warn("[FLUXO-CORE] Erro ao invalidar cache:", error);
    }

    // Recarregar página
    window.location.reload();
};
