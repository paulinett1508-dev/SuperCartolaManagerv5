// FLUXO-FINANCEIRO-CORE.JS - OTIMIZADO COM PROCESSAMENTO PARALELO
import { calcularFinanceiroConfronto } from "../pontos-corridos-utils.js";
import { getLigaId } from "../pontos-corridos-utils.js";
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

    // NOVO: Carregar Map do Mata-Mata para busca O(1)
    _carregarMataMataMap(resultadosMataMata) {
        this.mataMataMap.clear();
        resultadosMataMata.forEach((r) => {
            const key = `${normalizarTimeId(r.timeId)}_${r.rodadaPontos}`;
            this.mataMataMap.set(key, r.valor);
        });
        console.log(
            `[FLUXO-CORE] Mata-Mata Map carregado: ${this.mataMataMap.size} registros`,
        );
    }

    // OTIMIZADO: Cálculo com processamento paralelo
    async calcularExtratoFinanceiro(timeId, ultimaRodadaCompleta) {
        console.log(
            `[FLUXO-CORE] Iniciando cálculo OTIMIZADO para time ${timeId} até rodada ${ultimaRodadaCompleta}`,
        );

        const ligaId = getLigaId();
        const isSuperCartola2025 = ligaId === ID_SUPERCARTOLA_2025;
        const isCartoleirosSobral = ligaId === ID_CARTOLEIROS_SOBRAL;

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
                top10: 0, // ✅ NOVO: Total TOP 10
            },
            totalTimes: 0,
            camposEditaveis: camposEditaveis,
        };

        // ✅ BUSCAR DADOS DO TOP 10
        const dadosTop10 = await this.buscarDadosTop10(timeId);
        const top10Map = new Map(dadosTop10.map((item) => [item.rodada, item]));

        // OTIMIZADO: Processar rodadas de forma síncrona (dados já em cache)
        const rodadasProcessadas = [];
        for (let rodada = 1; rodada <= ultimaRodadaCompleta; rodada++) {
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

        console.log(
            `[FLUXO-CORE] Extrato OTIMIZADO calculado: ${extrato.rodadas.length} rodadas`,
        );
        return extrato;
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

    // OTIMIZADO: Busca O(1) usando Map
    _calcularMataMataOtimizado(timeId, rodada) {
        if (!this.mataMataIntegrado || this.mataMataMap.size === 0) return 0;

        const key = `${normalizarTimeId(timeId)}_${rodada}`;
        return this.mataMataMap.get(key) || 0;
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

    // ===== BUSCAR DADOS DO TOP 10 (INTEGRADO COM MÓDULO TOP10.JS) =====
    async buscarDadosTop10(timeId) {
        try {
            const { garantirDadosCarregados } = await import("../top10.js");
            const { mitos: top10Mitos, micos: top10Micos } =
                await garantirDadosCarregados();

            const ligaId = getLigaId();
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
// FUNÇÃO GLOBAL: ATUALIZAR TOP 10
// ========================================
window.atualizarTop10 = async function (timeId) {
    try {
        console.log(`[FLUXO] Atualizando TOP 10 para time: ${timeId}`);

        // Recarregar o extrato completo para atualizar os dados do TOP 10
        if (window.selecionarParticipante) {
            await window.selecionarParticipante(timeId);
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
