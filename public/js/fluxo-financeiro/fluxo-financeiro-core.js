// FLUXO-FINANCEIRO-CORE.JS v4.1 - SUPORTE A INATIVOS
// ✅ v4.1: Trava extrato para inativos na rodada_desistencia

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
    getBancoPorRodada,
    LIGAS_CONFIG,
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
            console.log("[FLUXO-CORE] ✅ Mata-mata integrado");
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
            console.warn("[FLUXO-CORE] Erro ao verificar mercado:", error);
        }

        resultadosMataMata.forEach((r) => {
            if (r.rodadaPontos <= ultimaRodadaConsolidada) {
                const timeIdNormalizado = normalizarTimeId(r.timeId);
                const key = `${timeIdNormalizado}_${r.rodadaPontos}`;
                this.mataMataMap.set(key, r.valor);
            }
        });
    }

    // =====================================================================
    // ✅ v4.1: BUSCAR STATUS DO PARTICIPANTE (ativo/rodada_desistencia)
    // =====================================================================
    async _buscarStatusParticipante(timeId) {
        try {
            const ligaId = obterLigaId();
            const response = await fetch(`/api/ligas/${ligaId}/times`);
            if (!response.ok) return { ativo: true, rodada_desistencia: null };

            const times = await response.json();
            const time = (Array.isArray(times) ? times : []).find(
                (t) => String(t.id || t.time_id) === String(timeId),
            );

            if (!time) return { ativo: true, rodada_desistencia: null };

            return {
                ativo: time.ativo !== false,
                rodada_desistencia: time.rodada_desistencia || null,
            };
        } catch (error) {
            console.warn(
                "[FLUXO-CORE] Erro ao buscar status do participante:",
                error,
            );
            return { ativo: true, rodada_desistencia: null };
        }
    }

    // =====================================================================
    // ✅ MÉTODO PRINCIPAL - CALCULAR EXTRATO COM SUPORTE A INATIVOS
    // =====================================================================
    async calcularExtratoFinanceiro(
        timeId,
        ultimaRodadaCompleta,
        forcarRecalculo = false,
    ) {
        const ligaId = obterLigaId();
        let rodadaParaCalculo = ultimaRodadaCompleta;
        let mercadoAberto = false;

        // ✅ v4.1: Buscar status do participante
        const statusParticipante = await this._buscarStatusParticipante(timeId);
        const isInativo = statusParticipante.ativo === false;
        const rodadaDesistencia = statusParticipante.rodada_desistencia;

        // ✅ v4.1: Limitar rodada de cálculo para inativos
        if (isInativo && rodadaDesistencia) {
            const rodadaLimite = rodadaDesistencia - 1;
            rodadaParaCalculo = Math.min(rodadaParaCalculo, rodadaLimite);
            console.log(
                `[FLUXO-CORE] 🔒 Inativo: limitando cálculo até R${rodadaLimite}`,
            );
        }

        // Verificar status do mercado
        try {
            const mercadoResponse = await fetch("/api/cartola/mercado/status");
            if (mercadoResponse.ok) {
                const mercadoData = await mercadoResponse.json();
                mercadoAberto =
                    mercadoData.mercado_aberto ||
                    mercadoData.status_mercado === 1;
                const rodadaAtualMercado = mercadoData.rodada_atual;
                if (mercadoAberto && !isInativo) {
                    rodadaParaCalculo = Math.max(1, rodadaAtualMercado - 1);
                }
            }
        } catch (error) {
            console.warn("[FLUXO-CORE] Erro ao verificar mercado:", error);
        }

        console.log(
            `[FLUXO-CORE] 🎯 Extrato time ${timeId} até R${rodadaParaCalculo} | Inativo: ${isInativo}`,
        );

        // =====================================================================
        // VERIFICAR CACHE MONGODB
        // =====================================================================
        if (!forcarRecalculo) {
            const cacheValido = await this._verificarCacheMongoDB(
                ligaId,
                timeId,
                rodadaParaCalculo,
                mercadoAberto,
            );

            if (cacheValido && cacheValido.valido) {
                const rodadasArray = cacheValido.rodadas || [];

                if (Array.isArray(rodadasArray) && rodadasArray.length > 0) {
                    const primeiraRodada = rodadasArray[0];
                    const cacheIncompleto =
                        !primeiraRodada ||
                        primeiraRodada.bonusOnus === undefined;

                    if (!cacheIncompleto) {
                        console.log(`[FLUXO-CORE] ⚡ CACHE VÁLIDO!`);

                        // ✅ v4.1: FILTRAR rodadas do cache para inativos
                        let rodadasFiltradas = rodadasArray;
                        if (isInativo && rodadaDesistencia) {
                            const rodadaLimite = rodadaDesistencia - 1;
                            rodadasFiltradas = rodadasArray.filter(
                                (r) => r.rodada <= rodadaLimite,
                            );
                            console.log(
                                `[FLUXO-CORE] 🔒 Inativo: filtrando cache ${rodadasArray.length} → ${rodadasFiltradas.length} rodadas (até R${rodadaLimite})`,
                            );
                        }

                        const camposEditaveis =
                            await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(
                                timeId,
                            );
                        const resumoRecalculado = this._recalcularResumoDoCache(
                            rodadasFiltradas,
                            camposEditaveis,
                        );
                        this._calcularSaldoAcumulado(rodadasFiltradas);

                        // Montar resumo com campos editáveis
                        const resumoCompleto = {
                            ...resumoRecalculado,
                            campo1:
                                parseFloat(camposEditaveis.campo1?.valor) || 0,
                            campo2:
                                parseFloat(camposEditaveis.campo2?.valor) || 0,
                            campo3:
                                parseFloat(camposEditaveis.campo3?.valor) || 0,
                            campo4:
                                parseFloat(camposEditaveis.campo4?.valor) || 0,
                        };

                        // ✅ v4.2: CALCULAR SALDO FINAL (estava faltando!)
                        resumoCompleto.saldo =
                            this._calcularSaldoFinal(resumoCompleto);

                        const extratoDoCache = {
                            rodadas: rodadasFiltradas,
                            resumo: resumoCompleto,
                            camposEditaveis: camposEditaveis,
                            totalTimes: rodadasFiltradas[0]?.totalTimes || 32,
                            updatedAt: cacheValido.updatedAt,
                            // ✅ v4.1: Informações de inativo
                            inativo: isInativo,
                            rodadaDesistencia: rodadaDesistencia,
                            extratoTravado: isInativo && rodadaDesistencia,
                            rodadaTravada: rodadaDesistencia
                                ? rodadaDesistencia - 1
                                : null,
                        };

                        console.log(
                            `[FLUXO-CORE] ✅ Extrato do cache: ${rodadasFiltradas.length} rodadas | Saldo: R$ ${extratoDoCache.resumo.saldo.toFixed(2)}${isInativo ? " | TRAVADO" : ""}`,
                        );

                        return extratoDoCache;
                    }
                }
            }
        }

        // =====================================================================
        // CALCULAR DO ZERO
        // =====================================================================
        console.log(`[FLUXO-CORE] 🔄 Calculando extrato completo...`);

        const isSuperCartola2025 = ligaId === ID_SUPERCARTOLA_2025;
        const isCartoleirosSobral = ligaId === ID_CARTOLEIROS_SOBRAL;

        await this.cache.carregarCacheRankingsEmLotes(rodadaParaCalculo, null);

        const camposEditaveis =
            await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);

        const resultadosMataMata = this.mataMataIntegrado
            ? this.cache.getResultadosMataMata()
            : [];
        if (resultadosMataMata.length > 0) {
            this._carregarMataMataMap(resultadosMataMata);
        }

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
            // ✅ v4.1: Informações de inativo
            inativo: isInativo,
            rodadaDesistencia: rodadaDesistencia,
            extratoTravado: isInativo && rodadaDesistencia,
            rodadaTravada: rodadaDesistencia ? rodadaDesistencia - 1 : null,
        };

        const dadosTop10 = await this.buscarDadosTop10(timeId);
        const top10Map = new Map(dadosTop10.map((item) => [item.rodada, item]));

        // ✅ v4.1: Loop até rodadaParaCalculo (já limitada para inativos)
        const rodadasProcessadas = [];
        for (let rodada = 1; rodada <= rodadaParaCalculo; rodada++) {
            const rodadaData = this._processarRodadaIntegrada(
                timeId,
                rodada,
                isSuperCartola2025,
                isCartoleirosSobral,
            );

            if (rodadaData) {
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

        // Salvar no cache
        await this._salvarCacheMongoDB(
            ligaId,
            timeId,
            extrato,
            rodadaParaCalculo,
            "calculo_completo",
        );

        console.log(
            `[FLUXO-CORE] ✅ Extrato: ${extrato.rodadas.length} rodadas | Saldo: R$ ${extrato.resumo.saldo.toFixed(2)}${isInativo ? " | TRAVADO" : ""}`,
        );

        return extrato;
    }

    // =====================================================================
    // VERIFICAR CACHE MONGODB
    // =====================================================================
    async _verificarCacheMongoDB(ligaId, timeId, rodadaAtual, mercadoAberto) {
        try {
            const timestamp = Date.now();
            const url = `${API_BASE_URL}/api/extrato-cache/${ligaId}/times/${timeId}/cache/valido?rodadaAtual=${rodadaAtual}&mercadoAberto=${mercadoAberto}&_=${timestamp}`;

            const response = await fetch(url);
            if (!response.ok) return null;

            const cacheData = await response.json();

            if (cacheData.valido && cacheData.cached) {
                const temRodadasArray =
                    Array.isArray(cacheData.rodadas) ||
                    Array.isArray(cacheData.data);
                if (!temRodadasArray) return null;

                const rodadasArray = Array.isArray(cacheData.rodadas)
                    ? cacheData.rodadas
                    : cacheData.data;

                console.log(
                    `[FLUXO-CORE] ⚡ Cache válido: ${rodadasArray?.length || 0} rodadas${cacheData.extratoTravado ? " | TRAVADO" : ""}`,
                );

                return { ...cacheData, rodadas: rodadasArray };
            }

            return null;
        } catch (error) {
            console.warn(
                `[FLUXO-CORE] Erro ao verificar cache:`,
                error.message,
            );
            return null;
        }
    }

    // =====================================================================
    // SALVAR CACHE MONGODB
    // =====================================================================
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

            const response = await fetch(
                `${API_BASE_URL}/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                console.log(`[FLUXO-CORE] ✅ Cache MongoDB salvo`);
            }
        } catch (error) {
            console.warn("[FLUXO-CORE] Erro ao salvar cache:", error.message);
        }
    }

    // =====================================================================
    // MÉTODOS DE PROCESSAMENTO
    // =====================================================================
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
            rodada,
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

    _recalcularResumoDoCache(rodadasArray, camposEditaveis) {
        let bonus = 0,
            onus = 0,
            pontosCorridos = 0,
            mataMata = 0,
            top10 = 0,
            totalGanhos = 0,
            totalPerdas = 0;

        for (const rodada of rodadasArray) {
            const bonusOnusValor = parseFloat(rodada.bonusOnus) || 0;
            if (bonusOnusValor > 0) {
                bonus += bonusOnusValor;
                totalGanhos += bonusOnusValor;
            } else if (bonusOnusValor < 0) {
                onus += bonusOnusValor;
                totalPerdas += Math.abs(bonusOnusValor);
            }

            const pcValor = parseFloat(rodada.pontosCorridos) || 0;
            pontosCorridos += pcValor;
            if (pcValor > 0) totalGanhos += pcValor;
            else if (pcValor < 0) totalPerdas += Math.abs(pcValor);

            const mmValor = parseFloat(rodada.mataMata) || 0;
            mataMata += mmValor;
            if (mmValor > 0) totalGanhos += mmValor;
            else if (mmValor < 0) totalPerdas += Math.abs(mmValor);

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
            saldo: 0,
        };
    }

    _calcularBonusOnus(posicaoReal, isCartoleirosSobral, rodada = null) {
        if (isCartoleirosSobral && rodada) {
            // ✅ v4.0: Usar tabela contextual para Cartoleiros Sobral
            const ligaId = obterLigaId();
            const valoresContextuais = getBancoPorRodada(ligaId, rodada);
            return valoresContextuais[posicaoReal] || 0;
        }

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
        if (isSuper && typeof r.pontosCorridos === "number")
            resumo.pontosCorridos += r.pontosCorridos;
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

window.forcarRefreshExtrato = async function (timeId) {
    const ligaId = window.obterLigaId();
    console.log(
        `[FLUXO-CORE] 🔄 Forçando refresh do extrato para time ${timeId}...`,
    );

    try {
        await fetch(
            `${API_BASE_URL}/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
            { method: "DELETE" },
        );
        console.log(`[FLUXO-CORE] 🗑️ Cache invalidado`);
    } catch (error) {
        console.warn("[FLUXO-CORE] Erro ao invalidar cache:", error);
    }

    window.location.reload();
};

console.log("[FLUXO-CORE] ✅ v4.2 carregado (tabelas contextuais corrigidas)");
