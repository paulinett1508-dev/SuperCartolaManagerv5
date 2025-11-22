// FLUXO-FINANCEIRO-CORE.JS - OTIMIZADO COM PROCESSAMENTO PARALELO
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

export class FluxoFinanceiroCore {
    constructor(cache) {
        this.cache = cache;
        this.mataMataIntegrado = false;
        this.mataMataMap = new Map(); // NOVO: Map para busca O(1)
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
            console.log("[FLUXO-CORE] Mata-mata integrado com sucesso");
        } catch (error) {
            console.error("[FLUXO-CORE] Erro ao integrar mata-mata:", error);
            this.mataMataIntegrado = false;
        }
    }

    // NOVO: Carregar Map do Mata-Mata para busca O(1) (SOMENTE RODADAS CONSOLIDADAS)
    async _carregarMataMataMap(resultadosMataMata) {
        this.mataMataMap.clear();

        // ✅ Obter última rodada consolidada
        let ultimaRodadaConsolidada = 999;
        try {
            const mercadoResponse = await fetch('/api/cartola/mercado/status');
            if (mercadoResponse.ok) {
                const mercadoData = await mercadoResponse.json();
                const mercadoAberto = mercadoData.mercado_aberto || mercadoData.status_mercado === 1;
                ultimaRodadaConsolidada = mercadoAberto 
                    ? Math.max(1, mercadoData.rodada_atual - 1)
                    : mercadoData.rodada_atual;
                console.log(`[FLUXO-CORE] 📊 Mata-Mata Map - última rodada consolidada: R${ultimaRodadaConsolidada}`);
            }
        } catch (error) {
            console.warn('[FLUXO-CORE] Erro ao verificar mercado para Map:', error);
        }

        let registrosCarregados = 0;
        let registrosIgnorados = 0;

        resultadosMataMata.forEach((r) => {
            // ✅ FILTRAR: só adicionar rodadas já consolidadas
            if (r.rodadaPontos <= ultimaRodadaConsolidada) {
                const timeIdNormalizado = normalizarTimeId(r.timeId);
                const key = `${timeIdNormalizado}_${r.rodadaPontos}`;
                this.mataMataMap.set(key, r.valor);
                registrosCarregados++;

                if (r.valor !== 0) {
                    console.log(`[FLUXO-CORE] ✅ Map add R${r.rodadaPontos}: ${key} = ${r.valor > 0 ? '+' : ''}R$ ${r.valor.toFixed(2)}`);
                }
            } else {
                registrosIgnorados++;
                console.log(`[FLUXO-CORE] ⏭️ Ignorado R${r.rodadaPontos} (futura/pendente) - aguardando consolidação`);
            }
        });

        console.log(
            `[FLUXO-CORE] 📦 Mata-Mata Map: ${registrosCarregados} carregados, ${registrosIgnorados} ignorados (futuras)`,
        );
    }

    // OTIMIZADO: Cálculo com cache persistente (SEM expiração automática para participantes)
    async calcularExtratoFinanceiro(timeId, ultimaRodadaCompleta, forcarRecalculo = false) {
        const ligaId = obterLigaId();

        // ✅ SEMPRE validar mercado e usar rodada anterior se aberto
        let rodadaParaCalculo = ultimaRodadaCompleta;
        let mercadoAberto = false;

        try {
            const mercadoResponse = await fetch('/api/cartola/mercado/status');
            if (mercadoResponse.ok) {
                const mercadoData = await mercadoResponse.json();
                mercadoAberto = mercadoData.mercado_aberto || mercadoData.status_mercado === 1;
                const rodadaAtualMercado = mercadoData.rodada_atual;

                // ✅ SE MERCADO ABERTO, SEMPRE USAR RODADA ANTERIOR (dados não consolidados)
                if (mercadoAberto) {
                    rodadaParaCalculo = Math.max(1, rodadaAtualMercado - 1);
                    console.log(`[FLUXO-CORE] 🔄 Mercado ABERTO (R${rodadaAtualMercado}) - usando R${rodadaParaCalculo} (última consolidada)`);
                } else {
                    console.log(`[FLUXO-CORE] ✅ Mercado FECHADO - usando R${rodadaParaCalculo}`);
                }
            }
        } catch (error) {
            console.warn('[FLUXO-CORE] Erro ao verificar status do mercado:', error);
        }

        // ✅ SE NÃO FORÇAR RECÁLCULO, VERIFICAR SE CACHE ESTÁ COMPLETO E ÍNTEGRO
            if (!forcarRecalculo) {
                const cacheExistente = await this._verificarEUsarCache(ligaId, timeId, rodadaParaCalculo);
                if (cacheExistente) {
                    // ✅ VALIDAÇÃO 1: VERIFICAR SE CACHE TEM TODAS AS RODADAS COM DADOS
                    const rodadasComDados = cacheExistente.rodadas.filter(r => r.totalTimes > 0).length;

                    if (rodadasComDados < rodadaParaCalculo) {
                        console.log(`[FLUXO-CORE] ⚠️ Cache desatualizado: ${rodadasComDados}/${rodadaParaCalculo} rodadas com dados - recalculando`);
                        await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache`, { method: 'DELETE' });
                    } 
                    // ✅ VALIDAÇÃO 2: VERIFICAR SE HÁ VALORES DE MATA-MATA EM RODADAS FUTURAS (BUG ANTIGO)
                    else {
                        const rodadasComMataMataInvalido = cacheExistente.rodadas.filter(r => 
                            r.rodada > rodadaParaCalculo && r.mataMata !== 0
                        );

                        if (rodadasComMataMataInvalido.length > 0) {
                            console.log(`[FLUXO-CORE] ⚠️ Cache corrompido: ${rodadasComMataMataInvalido.length} rodadas futuras com Mata-Mata inválido - recalculando`);
                            await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache`, { method: 'DELETE' });
                        } 
                        // ✅ VALIDAÇÃO 3: VERIFICAR SE RODADA 34 TEM MATA-MATA (SE APLICÁVEL)
                        else {
                            const rodada34 = cacheExistente.rodadas.find(r => r.rodada === 34);
                            if (rodadaParaCalculo >= 34 && rodada34 && rodada34.mataMata === 0) {
                                console.log('[FLUXO-CORE] ⚠️ Rodada 34 sem Mata-Mata - cache pode estar desatualizado - recalculando');
                                await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache`, { method: 'DELETE' });
                            } else {
                                console.log(`[FLUXO-CORE] 💾 Usando extrato em cache para time ${timeId} (última atualização: ${new Date(cacheExistente.updatedAt || Date.now()).toLocaleString()})`);
                                return cacheExistente;
                            }
                        }
                    }
                }
            }

        console.log(
            `[FLUXO-CORE] Calculando extrato para time ${timeId} até rodada ${rodadaParaCalculo}`,
        );
        const isSuperCartola2025 = ligaId === ID_SUPERCARTOLA_2025;
        const isCartoleirosSobral = ligaId === ID_CARTOLEIROS_SOBRAL;

        // ✅ CARREGAR RANKINGS DAS RODADAS (CRÍTICO PARA O CÁLCULO)
        console.log(`[FLUXO-CORE] 📊 Carregando rankings das rodadas (1-${rodadaParaCalculo})...`);
        await this.cache.carregarCacheRankingsEmLotes(rodadaParaCalculo, null);
        console.log(`[FLUXO-CORE] ✅ Rankings carregados com sucesso`);

        // ✅ AGUARDAR CARREGAMENTO DOS CAMPOS DO MONGODB
        const camposEditaveis =
            await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);

        const resultadosMataMata = this.mataMataIntegrado
            ? this.cache.getResultadosMataMata()
            : [];

        // NOVO: Carregar Map do Mata-Mata
        if (resultadosMataMata.length > 0) {
            this._carregarMataMataMap(resultadosMataMata);
        }

        const extrato = {
            rodadas: [],
            resumo: {
                totalGanhos: 0, // ✅ NOVO: Soma de TUDO que é positivo
                totalPerdas: 0, // ✅ NOVO: Soma de TUDO que é negativo
                // Mantidos para cálculos internos (não exibidos no cabeçalho)
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

        // ✅ BUSCAR DADOS DO TOP 10
        const dadosTop10 = await this.buscarDadosTop10(timeId);
        const top10Map = new Map(dadosTop10.map((item) => [item.rodada, item]));

        // OTIMIZADO: Processar rodadas de forma síncrona (dados já em cache)
        const rodadasProcessadas = [];
        for (let rodada = 1; rodada <= rodadaParaCalculo; rodada++) {
            const rodadaData = this._processarRodadaIntegrada(
                timeId,
                rodada,
                isSuperCartola2025,
                isCartoleirosSobral,
            );

            if (rodadaData) {
                // ✅ BUSCAR DADOS DO TOP 10 PARA ESTA RODADA
                const top10Data = top10Map.get(rodada);
                const top10Valor = top10Data ? top10Data.valor || 0 : 0;
                const top10Status = top10Data ? top10Data.status : null;
                const top10Posicao = top10Data ? top10Data.posicao : null;

                rodadaData.top10 = top10Valor;
                rodadaData.top10Status = top10Status;
                rodadaData.top10Posicao = top10Posicao;

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

        // ✅ CALCULAR TOTAIS CONSOLIDADOS - passar rodadas
        this._calcularTotaisConsolidados(extrato.resumo, extrato.rodadas);

        console.log(
            `[FLUXO-CORE] Extrato calculado: ${extrato.rodadas.length} rodadas`,
        );

        // ✅ SALVAR NO CACHE
        await this._salvarNoCache(ligaId, timeId, extrato, rodadaParaCalculo, "calculo_automatico");

        return extrato;
    }

    // ===== VERIFICAR SE HOUVE MUDANÇA DE RODADA =====
    async _verificarMudancaRodada(ligaId, timeId) {
        try {
            // Buscar última rodada calculada do cache
            const response = await fetch(
                `/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=1`
            );

            if (!response.ok) return true; // Se não tem cache, precisa calcular

            const data = await response.json();

            if (!data.cached) return true;

            // Buscar rodada atual do mercado
            const mercadoResponse = await fetch('/api/cartola/mercado-status');
            if (!mercadoResponse.ok) return false;

            const mercadoData = await mercadoResponse.json();
            const rodadaAtualMercado = mercadoData.rodada_atual;

            // Se a rodada atual é maior que a última calculada, precisa recalcular
            const precisaRecalcular = rodadaAtualMercado > data.ultimaRodadaCalculada;

            if (precisaRecalcular) {
                console.log(`[FLUXO-CORE] 🔄 Nova rodada detectada (${rodadaAtualMercado} > ${data.ultimaRodadaCalculada}) - recálculo necessário`);
            }

            return precisaRecalcular;
        } catch (error) {
            console.warn("[FLUXO-CORE] Erro ao verificar mudança de rodada:", error);
            return false; // Em caso de erro, não força recálculo
        }
    }

    // ===== VERIFICAR E USAR CACHE (sem verificação de TTL) =====
    async _verificarEUsarCache(ligaId, timeId, rodadaAtual) {
        try {
            const response = await fetch(
                `/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${rodadaAtual}`
            );

            if (!response.ok) return null;

            const data = await response.json();

            if (!data.cached || !data.data) return null;

            // ✅ RETORNAR CACHE SEM VERIFICAR EXPIRAÇÃO (cache infinito)
            console.log(`[FLUXO-CORE] 💾 Cache encontrado (última atualização: ${new Date(data.updatedAt).toLocaleString()})`);

            // Adicionar timestamp de atualização ao objeto retornado
            data.data.updatedAt = data.updatedAt;

            return data.data;
        } catch (error) {
            console.warn("[FLUXO-CORE] Erro ao verificar cache:", error);
            return null;
        }
    }

    // ===== SALVAR NO CACHE =====
    async _salvarNoCache(ligaId, timeId, extrato, ultimaRodadaCalculada, motivo) {
        try {
            const response = await fetch(
                `/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        extrato,
                        ultimaRodadaCalculada,
                        motivoRecalculo: motivo,
                    }),
                }
            );

            if (response.ok) {
                console.log(`[FLUXO-CORE] ✅ Extrato salvo no cache`);
            }
        } catch (error) {
            console.warn("[FLUXO-CORE] Erro ao salvar cache:", error);
        }
    }

    _processarRodadaIntegrada(
        timeId,
        rodada,
        isSuperCartola2025,
        isCartoleirosSobral,
    ) {
        const ranking = this.cache.getRankingRodada(rodada);

        // ✅ SEMPRE RETORNA RODADA, MESMO SEM DADOS
        if (!ranking || !ranking.length) {
            return {
                rodada,
                posicao: null,
                totalTimes: 0,
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

        const posicaoIndex = ranking.findIndex((r) => {
            const rTimeId = normalizarTimeId(r.timeId || r.time_id || r.id);
            return rTimeId === normalizarTimeId(timeId);
        });

        // ✅ MESMO SEM POSIÇÃO, RETORNA RODADA COM VALORES ZERADOS
        if (posicaoIndex === -1) {
            return {
                rodada,
                posicao: null,
                totalTimes: ranking.length,
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
        const melhorMes = 0;

        return {
            rodada,
            posicao: posicaoReal,
            totalTimes,
            bonusOnus,
            pontosCorridos,
            mataMata,
            melhorMes,
            top10: 0, // Será preenchido no calcularExtratoFinanceiro
            top10Status: null,
            isMito,
            isMico,
        };
    }

    // OTIMIZADO: Busca O(1) usando Map (COM VALIDAÇÃO DE RODADAS FUTURAS)
    _calcularMataMataOtimizado(timeId, rodada) {
        if (!this.mataMataIntegrado || this.mataMataMap.size === 0) {
            return 0;
        }

        const timeIdNormalizado = normalizarTimeId(timeId);
        const key = `${timeIdNormalizado}_${rodada}`;
        const valor = this.mataMataMap.get(key) || 0;

        // ✅ Log apenas quando há valor (reduzir poluição de console)
        if (valor !== 0) {
            console.log(`[FLUXO-CORE] 💰 Mata-Mata R${rodada} - Time ${timeId}: ${valor > 0 ? '+' : ''}R$ ${valor.toFixed(2)}`);
        }

        return valor;
    }

    _calcularBonusOnus(posicaoReal, isCartoleirosSobral) {
        const valoresRodadaAtual = isCartoleirosSobral
            ? valoresBancoCartoleirosSobral
            : valoresBancoPadrao;
        return valoresRodadaAtual[posicaoReal] || 0;
    }

    calcularPontosCorridosParaRodada(timeId, rodada) {
        if (rodada < RODADA_INICIAL_PONTOS_CORRIDOS) return null;

        const idxRodada = rodada - RODADA_INICIAL_PONTOS_CORRIDOS;
        const confrontos = this.cache.getConfrontosPontosCorridos();

        if (!confrontos || idxRodada >= confrontos.length) return null;

        const jogos = confrontos[idxRodada];
        if (!jogos || !Array.isArray(jogos)) return null;

        const confronto = jogos.find((jogo) => {
            const timeA_id = normalizarTimeId(
                jogo.timeA?.id || jogo.timeA?.time_id || jogo.timeA?.timeId,
            );
            const timeB_id = normalizarTimeId(
                jogo.timeB?.id || jogo.timeB?.time_id || jogo.timeB?.timeId,
            );
            return (
                timeA_id === normalizarTimeId(timeId) ||
                timeB_id === normalizarTimeId(timeId)
            );
        });

        if (!confronto) return null;

        const ranking = this.cache.getRankingRodada(rodada);
        if (!ranking || !Array.isArray(ranking)) return null;

        const timeA_id = normalizarTimeId(
            confronto.timeA?.id ||
                confronto.timeA?.time_id ||
                confronto.timeA?.timeId,
        );
        const timeB_id = normalizarTimeId(
            confronto.timeB?.id ||
                confronto.timeB?.time_id ||
                confronto.timeB?.timeId,
        );

        const dadosTimeA = ranking.find(
            (r) => normalizarTimeId(r.timeId || r.time_id || r.id) === timeA_id,
        );
        const dadosTimeB = ranking.find(
            (r) => normalizarTimeId(r.timeId || r.time_id || r.id) === timeB_id,
        );

        if (!dadosTimeA || !dadosTimeB) return null;

        const pontosTimeA = parseFloat(dadosTimeA.pontos);
        const pontosTimeB = parseFloat(dadosTimeB.pontos);

        if (isNaN(pontosTimeA) || isNaN(pontosTimeB)) return null;

        const resultado = calcularFinanceiroConfronto(pontosTimeA, pontosTimeB);
        const isTimeA = timeA_id === normalizarTimeId(timeId);

        return isTimeA ? resultado.financeiroA : resultado.financeiroB;
    }

    _acumularValoresIntegrados(resumo, rodadaData, isSuperCartola2025) {
        if (rodadaData.bonusOnus > 0) resumo.bonus += rodadaData.bonusOnus;
        if (rodadaData.bonusOnus < 0) resumo.onus += rodadaData.bonusOnus;
        if (rodadaData.isMito) resumo.vezesMito++;
        if (rodadaData.isMico) resumo.vezesMico++;

        if (
            isSuperCartola2025 &&
            typeof rodadaData.pontosCorridos === "number"
        ) {
            resumo.pontosCorridos += rodadaData.pontosCorridos;
        }
        if (typeof rodadaData.mataMata === "number")
            resumo.mataMata += rodadaData.mataMata;
        if (typeof rodadaData.melhorMes === "number")
            resumo.melhorMes += rodadaData.melhorMes;

        // ✅ Acumular TOP 10
        if (typeof rodadaData.top10 === "number")
            resumo.top10 += rodadaData.top10;
    }

    _calcularSaldoAcumulado(rodadas, camposEditaveis = null) {
        let saldoAcumulado = 0;

        rodadas.forEach((rodada) => {
            const valorRodada =
                (rodada.bonusOnus || 0) +
                (rodada.pontosCorridos || 0) +
                (rodada.mataMata || 0) +
                (rodada.melhorMes || 0) +
                (rodada.top10 || 0);

            saldoAcumulado += valorRodada;
            rodada.saldo = saldoAcumulado;
        });
    }

    _calcularSaldoFinal(resumo) {
        return (
            resumo.bonus +
            resumo.onus +
            resumo.pontosCorridos +
            resumo.mataMata +
            resumo.melhorMes +
            resumo.top10 +
            resumo.campo1 +
            resumo.campo2 +
            resumo.campo3 +
            resumo.campo4
        );
    }

    _calcularTotaisConsolidados(resumo, rodadas) {
        // Resetar totais
        resumo.totalGanhos = 0;
        resumo.totalPerdas = 0;

        console.log("[DEBUG-TOTAIS] === INICIANDO CÁLCULO ===");

        // PERCORRER RODADAS para separar valores positivos e negativos
        if (rodadas && Array.isArray(rodadas)) {
            rodadas.forEach((rodada) => {
                // Bônus/Ônus
                if (rodada.bonusOnus > 0)
                    resumo.totalGanhos += rodada.bonusOnus;
                if (rodada.bonusOnus < 0)
                    resumo.totalPerdas += rodada.bonusOnus;

                // Pontos Corridos
                if (rodada.pontosCorridos > 0)
                    resumo.totalGanhos += rodada.pontosCorridos;
                if (rodada.pontosCorridos < 0)
                    resumo.totalPerdas += rodada.pontosCorridos;

                // Mata-Mata
                if (rodada.mataMata > 0) resumo.totalGanhos += rodada.mataMata;
                if (rodada.mataMata < 0) resumo.totalPerdas += rodada.mataMata;

                // Melhor Mês
                if (rodada.melhorMes > 0)
                    resumo.totalGanhos += rodada.melhorMes;
                if (rodada.melhorMes < 0)
                    resumo.totalPerdas += rodada.melhorMes;

                // TOP 10
                if (rodada.top10 > 0) resumo.totalGanhos += rodada.top10;
                if (rodada.top10 < 0) resumo.totalPerdas += rodada.top10;
            });
        }

        // Adicionar campos editáveis (valores globais)
        if (resumo.campo1 > 0) resumo.totalGanhos += resumo.campo1;
        if (resumo.campo1 < 0) resumo.totalPerdas += resumo.campo1;
        if (resumo.campo2 > 0) resumo.totalGanhos += resumo.campo2;
        if (resumo.campo2 < 0) resumo.totalPerdas += resumo.campo2;
        if (resumo.campo3 > 0) resumo.totalGanhos += resumo.campo3;
        if (resumo.campo3 < 0) resumo.totalPerdas += resumo.campo3;
        if (resumo.campo4 > 0) resumo.totalGanhos += resumo.campo4;
        if (resumo.campo4 < 0) resumo.totalPerdas += resumo.campo4;

        console.log(
            `[FLUXO-CORE] ✅ Totais: Ganhou=${resumo.totalGanhos.toFixed(2)} | Perdeu=${resumo.totalPerdas.toFixed(2)} | Saldo=${(resumo.totalGanhos + resumo.totalPerdas).toFixed(2)}`,
        );
        console.log("[DEBUG-TOTAIS] === FIM CÁLCULO ===");
    }

    // ===== BUSCAR DADOS DO TOP 10 (INTEGRADO COM MÓDULO TOP10.JS) =====
    async buscarDadosTop10(timeId) {
        try {
            const { garantirDadosCarregados } = await import("../top10.js");
            const { mitos: top10Mitos, micos: top10Micos } =
                await garantirDadosCarregados();

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

            // Verificar MITOS
            top10Mitos.forEach((mito, index) => {
                const mitoTimeId = normalizarTimeId(
                    mito.timeId || mito.time_id || mito.id,
                );

                if (mitoTimeId === timeIdNormalizado) {
                    const posicao = index + 1;
                    const valor = valoresMitos[posicao] || 0;

                    historico.push({
                        rodada: mito.rodada,
                        valor: valor,
                        status: "MITO",
                        posicao: posicao,
                        pontos: mito.pontos,
                        tipo: `Mito #${posicao}`,
                    });
                }
            });

            // Verificar MICOS
            top10Micos.forEach((mico, index) => {
                const micoTimeId = normalizarTimeId(
                    mico.timeId || mico.time_id || mico.id,
                );

                if (micoTimeId === timeIdNormalizado) {
                    const posicao = index + 1;
                    const valor = valoresMicos[posicao] || 0;

                    historico.push({
                        rodada: mico.rodada,
                        valor: valor,
                        status: "MICO",
                        posicao: posicao,
                        pontos: mico.pontos,
                        tipo: `Mico #${posicao}`,
                    });
                }
            });

            return historico;
        } catch (error) {
            console.error("[FLUXO-CORE] Erro ao buscar dados TOP 10:", error);
            return [];
        }
    }

    async carregarParticipantes() {
        return await this.cache.carregarParticipantes();
    }

    async buscarParticipante(timeId) {
        const participantes = await this.carregarParticipantes();
        return participantes.find((p) => {
            return (
                String(p.time_id) === String(timeId) ||
                String(p.id) === String(timeId) ||
                String(p.timeId) === String(timeId)
            );
        });
    }
}

// ========================================
// FUNÇÕES GLOBAIS: GERENCIAMENTO DE CACHE
// ========================================

// Forçar refresh do extrato (para botão manual)
window.forcarRefreshExtrato = async function (timeId) {
    try {
        console.log(`[FLUXO] 🔄 Forçando atualização manual do extrato para time ${timeId}`);

        // Mostrar loading
        if (window.fluxoFinanceiroUI) {
            window.fluxoFinanceiroUI.renderizarLoading("Atualizando dados...");
        }

        // Invalidar cache
        const ligaId = window.obterLigaId();
        await window.invalidarCacheTime(ligaId, timeId);

        // Recalcular com força
        if (window.calcularEExibirExtrato) {
            await window.calcularEExibirExtrato(timeId, true); // Passar true para forçar recálculo
            console.log("[FLUXO] ✅ Extrato atualizado com sucesso");
        }
    } catch (error) {
        console.error("[FLUXO] ❌ Erro ao forçar refresh:", error);
        alert("Erro ao atualizar dados. Tente novamente.");
    }
};

// Invalidar cache de um time específico
window.invalidarCacheTime = async function (ligaId, timeId) {
    try {
        const response = await fetch(
            `/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
            { method: "DELETE" }
        );

        if (response.ok) {
            console.log(`[FLUXO] Cache invalidado para time ${timeId}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("[FLUXO] Erro ao invalidar cache:", error);
        return false;
    }
};

// Invalidar cache de toda a liga (ADMIN)
window.invalidarCacheLiga = async function (ligaId) {
    try {
        const response = await fetch(
            `/api/extrato-cache/${ligaId}/cache`,
            { method: "DELETE" }
        );

        if (response.ok) {
            const data = await response.json();
            console.log(`[FLUXO] ${data.deletedCount} caches invalidados`);
            return data.deletedCount;
        }
        return 0;
    } catch (error) {
        console.error("[FLUXO] Erro ao invalidar cache da liga:", error);
        return 0;
    }
};

// Forçar recálculo de um time
window.forcarRecalculoExtrato = async function (timeId) {
    try {
        const ligaId = window.obterLigaId();
        await window.invalidarCacheTime(ligaId, timeId);

        if (window.selecionarParticipante) {
            await window.selecionarParticipante(timeId, true); // Passar true para forçar recálculo
            console.log("[FLUXO] Extrato recalculado com sucesso");
        }
    } catch (error) {
        console.error("[FLUXO] Erro ao forçar recálculo:", error);
    }
};

// ========================================
// FUNÇÃO GLOBAL: ATUALIZAR TOP 10
// ========================================
window.atualizarTop10 = async function (timeId) {
    try {
        console.log(`[FLUXO] Atualizando TOP 10 para time: ${timeId}`);

        // Recarregar o extrato completo para atualizar os dados do TOP 10
        if (window.selecionarParticipante) {
            await window.selecionarParticipante(timeId, true); // Passar true para forçar recálculo
            console.log("[FLUXO] TOP 10 atualizado com sucesso");
        } else {
            console.warn(
                "[FLUXO] Função selecionarParticipante não encontrada",
            );
        }
    } catch (error) {
        console.error("[FLUXO] Erro ao atualizar TOP 10:", error);
        alert("Erro ao atualizar dados do TOP 10. Tente novamente.");
    }
};