// FLUXO-FINANCEIRO-CORE.JS - Lógica Principal INTEGRADA
import { calcularFinanceiroConfronto } from "../pontos-corridos-utils.js";
import { getLigaId } from "../pontos-corridos-utils.js";
import { FluxoFinanceiroCampos } from "./fluxo-financeiro-campos.js";
import {
    setRankingFunction,
    getResultadosMataMataFluxo,
} from "../mata-mata/mata-mata-financeiro.js";
import {
    valoresRodadaPadrao,
    valoresRodadaCartoleirosSobral,
    RODADA_INICIAL_PONTOS_CORRIDOS,
    ID_SUPERCARTOLA_2025,
    ID_CARTOLEIROS_SOBRAL,
    normalizarTimeId,
} from "./fluxo-financeiro-utils.js";

export class FluxoFinanceiroCore {
    constructor(cache) {
        this.cache = cache;
        this.mataMataIntegrado = false;
        this._integrarMataMata();
    }

    /**
     * Integra módulo mata-mata ao fluxo financeiro
     * @private
     */
    async _integrarMataMata() {
        try {
            // Importar função de ranking e configurar mata-mata
            const { getRankingRodadaEspecifica } = await import(
                "../rodadas.js"
            );
            const { setRankingFunction } = await import(
                "../mata-mata/mata-mata-financeiro.js"
            );

            // Configurar função no mata-mata
            setRankingFunction(getRankingRodadaEspecifica);

            this.mataMataIntegrado = true;
            console.log("[FLUXO-CORE] Mata-mata integrado com sucesso");
        } catch (error) {
            console.error("[FLUXO-CORE] Erro ao integrar mata-mata:", error);
            this.mataMataIntegrado = false;
        }
    }

    static criarInstancia(cache) {
        return new FluxoFinanceiroCore(cache);
    }

    static async buscarParticipante(timeId) {
        if (window.fluxoFinanceiroCore) {
            return await window.fluxoFinanceiroCore.buscarParticipante(timeId);
        }
        console.warn("[FLUXO-CORE] Instância global não encontrada");
        return null;
    }

    /**
     * Calcula extrato financeiro completo INTEGRADO
     */
    calcularExtratoFinanceiro(timeId, ultimaRodadaCompleta) {
        console.log(
            `[FLUXO-CORE] Iniciando cálculo de extrato INTEGRADO para time ${timeId} até rodada ${ultimaRodadaCompleta}`,
        );

        const ligaId = getLigaId();
        const isSuperCartola2025 = ligaId === ID_SUPERCARTOLA_2025;
        const isCartoleirosSobral = ligaId === ID_CARTOLEIROS_SOBRAL;

        console.log(
            `[FLUXO-CORE] Liga: ${ligaId} - SuperCartola2025: ${isSuperCartola2025} - CartoleirosSobral: ${isCartoleirosSobral}`,
        );

        const camposEditaveis =
            FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);

        // Carregar resultados mata-mata de forma integrada
        const resultadosMataMata = this.mataMataIntegrado
            ? this.cache.getResultadosMataMata()
            : [];
        console.log(
            `[FLUXO-CORE] Resultados mata-mata carregados: ${resultadosMataMata.length} registros`,
        );

        const extrato = {
            rodadas: [],
            resumo: {
                bonus: 0,
                onus: 0,
                pontosCorridos: 0,
                mataMata: 0,
                melhorMes: 0,
                campo1: camposEditaveis.campo1.valor,
                campo2: camposEditaveis.campo2.valor,
                campo3: camposEditaveis.campo3.valor,
                campo4: camposEditaveis.campo4.valor,
                vezesMito: 0,
                vezesMico: 0,
                saldo: 0,
            },
            totalTimes: 0,
            camposEditaveis: camposEditaveis,
        };

        console.log(
            `[FLUXO-CORE] Processando ${ultimaRodadaCompleta} rodadas...`,
        );

        // Processar cada rodada
        let rodadasProcessadas = 0;
        for (let rodada = 1; rodada <= ultimaRodadaCompleta; rodada++) {
            const rodadaData = this._processarRodadaIntegrada(
                timeId,
                rodada,
                isSuperCartola2025,
                isCartoleirosSobral,
                resultadosMataMata,
            );

            if (rodadaData) {
                extrato.rodadas.push(rodadaData);
                extrato.totalTimes = Math.max(
                    extrato.totalTimes,
                    rodadaData.totalTimes,
                );

                // Acumular valores no resumo
                this._acumularValoresIntegrados(
                    extrato.resumo,
                    rodadaData,
                    isSuperCartola2025,
                );
                rodadasProcessadas++;
            } else {
                console.warn(
                    `[FLUXO-CORE] Rodada ${rodada} não pôde ser processada`,
                );
            }
        }

        console.log(
            `[FLUXO-CORE] ${rodadasProcessadas} rodadas processadas com sucesso`,
        );

        // Calcular saldo acumulado por rodada
        this._calcularSaldoAcumulado(extrato.rodadas);

        // Calcular saldo final
        extrato.resumo.saldo = this._calcularSaldoFinal(extrato.resumo);

        console.log(`[FLUXO-CORE] Extrato final integrado:`, {
            rodadas: extrato.rodadas.length,
            saldoFinal: extrato.resumo.saldo,
            bonus: extrato.resumo.bonus,
            onus: extrato.resumo.onus,
            pontosCorridos: extrato.resumo.pontosCorridos,
            mataMata: extrato.resumo.mataMata,
            melhorMes: extrato.resumo.melhorMes,
        });

        return extrato;
    }

    /**
     * Processa rodada com integração mata-mata
     * @private
     */
    _processarRodadaIntegrada(
        timeId,
        rodada,
        isSuperCartola2025,
        isCartoleirosSobral,
        resultadosMataMata,
    ) {
        console.log(
            `[FLUXO-CORE] Processando rodada ${rodada} INTEGRADA para time ${timeId}`,
        );

        const ranking = this.cache.getRankingRodada(rodada);
        console.log(
            `[FLUXO-CORE] Ranking rodada ${rodada}:`,
            ranking?.length ? `${ranking.length} times` : "vazio",
        );

        if (!ranking || !ranking.length) {
            console.warn(`[FLUXO-CORE] Sem ranking para rodada ${rodada}`);
            return null;
        }

        const posicaoIndex = ranking.findIndex((r) => {
            const rTimeId = normalizarTimeId(r.timeId || r.time_id || r.id);
            const targetTimeId = normalizarTimeId(timeId);
            return rTimeId === targetTimeId;
        });

        if (posicaoIndex !== -1) {
            console.log(
                `[FLUXO-CORE] Time ${timeId} encontrado na posição ${posicaoIndex + 1} da rodada ${rodada}`,
            );
        }

        const posicao = posicaoIndex;

        if (posicao === -1) {
            console.warn(
                `[FLUXO-CORE] Time ${timeId} não encontrado no ranking da rodada ${rodada}`,
            );
            return null;
        }

        const totalTimes = ranking.length;
        const posicaoReal = posicao + 1;
        const isMito = posicaoReal === 1;
        const isMico = posicaoReal === totalTimes;

        // Calcular bônus/ônus
        const bonusOnus = this._calcularBonusOnus(
            posicaoReal,
            isCartoleirosSobral,
        );

        // Calcular pontos corridos (apenas para SuperCartola 2025)
        const pontosCorridos = isSuperCartola2025
            ? this.calcularPontosCorridosParaRodada(timeId, rodada)
            : null;

        // INTEGRAÇÃO MATA-MATA: Buscar valor da rodada específica
        const mataMata = this._calcularMataMataIntegrado(
            timeId,
            rodada,
            resultadosMataMata,
        );

        // Calcular melhor mês
        const melhorMes = this._calcularMelhorMes(timeId, rodada);

        const rodadaData = {
            rodada,
            posicao: posicaoReal,
            totalTimes,
            bonusOnus,
            pontosCorridos,
            mataMata,
            melhorMes,
            isMito,
            isMico,
        };

        console.log(
            `[FLUXO-CORE] Rodada ${rodada} processada INTEGRADA:`,
            rodadaData,
        );
        return rodadaData;
    }

    /**
     * Calcula mata-mata integrado
     * @private
     */
    _calcularMataMataIntegrado(timeId, rodada, resultadosMataMata) {
        if (!this.mataMataIntegrado || !resultadosMataMata.length) {
            return 0;
        }

        const resultado = resultadosMataMata.find(
            (r) =>
                normalizarTimeId(r.timeId) === normalizarTimeId(timeId) &&
                r.rodada === rodada,
        );

        return resultado ? resultado.valor || 0 : 0;
    }

    /**
     * Calcula melhor mês
     * @private
     */
    _calcularMelhorMes(timeId, rodada) {
        // Implementação do cálculo do melhor mês
        return 0;
    }

    /**
     * Calcula bônus/ônus baseado na posição
     * @private
     */
    _calcularBonusOnus(posicaoReal, isCartoleirosSobral) {
        const valoresRodadaAtual = isCartoleirosSobral
            ? valoresRodadaCartoleirosSobral
            : valoresRodadaPadrao;

        return valoresRodadaAtual[posicaoReal] || 0;
    }

    /**
     * Calcula pontos corridos para rodada específica
     */
    calcularPontosCorridosParaRodada(timeId, rodada) {
        if (rodada < RODADA_INICIAL_PONTOS_CORRIDOS) {
            return null;
        }

        const idxRodada = rodada - RODADA_INICIAL_PONTOS_CORRIDOS;
        const confrontos = this.cache.getConfrontosPontosCorridos();

        if (!confrontos || idxRodada >= confrontos.length) {
            return null;
        }

        const jogos = confrontos[idxRodada];
        if (!jogos || !Array.isArray(jogos)) {
            return null;
        }

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

        if (!confronto) {
            return null;
        }

        const ranking = this.cache.getRankingRodada(rodada);
        if (!ranking || !Array.isArray(ranking)) {
            return null;
        }

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

        if (!dadosTimeA || !dadosTimeB) {
            return null;
        }

        const pontosTimeA = parseFloat(dadosTimeA.pontos);
        const pontosTimeB = parseFloat(dadosTimeB.pontos);

        if (isNaN(pontosTimeA) || isNaN(pontosTimeB)) {
            return null;
        }

        const resultado = calcularFinanceiroConfronto(pontosTimeA, pontosTimeB);
        const isTimeA = timeA_id === normalizarTimeId(timeId);
        const valorFinanceiro = isTimeA
            ? resultado.financeiroA
            : resultado.financeiroB;

        return valorFinanceiro;
    }

    /**
     * Acumula valores integrados no resumo
     * @private
     */
    _acumularValoresIntegrados(resumo, rodadaData, isSuperCartola2025) {
        if (rodadaData.bonusOnus > 0) resumo.bonus += rodadaData.bonusOnus;
        if (rodadaData.bonusOnus < 0) resumo.onus += rodadaData.bonusOnus;

        if (rodadaData.isMito) resumo.vezesMito++;
        if (rodadaData.isMico) resumo.vezesMico++;

        if (isSuperCartola2025) {
            if (typeof rodadaData.pontosCorridos === "number") {
                resumo.pontosCorridos += rodadaData.pontosCorridos;
            }
        }

        // Integrar mata-mata e melhor mês
        if (typeof rodadaData.mataMata === "number") {
            resumo.mataMata += rodadaData.mataMata;
        }

        if (typeof rodadaData.melhorMes === "number") {
            resumo.melhorMes += rodadaData.melhorMes;
        }
    }

    _calcularSaldoAcumulado(rodadas) {
        let saldoAcumulado = 0;
        rodadas.forEach((rodada) => {
            const valorRodada =
                (rodada.bonusOnus || 0) +
                (rodada.pontosCorridos || 0) +
                (rodada.mataMata || 0) +
                (rodada.melhorMes || 0);
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
            resumo.campo1 +
            resumo.campo2 +
            resumo.campo3 +
            resumo.campo4
        );
    }

    async carregarParticipantes() {
        return await this.cache.carregarParticipantes();
    }

    async carregarDadosFinanceiros(timeId) {
        return {
            timeId: timeId,
            carregado: true,
            timestamp: Date.now(),
        };
    }

    async buscarParticipante(timeId) {
        const participantes = await this.carregarParticipantes();

        const participante = participantes.find((p) => {
            return (
                String(p.time_id) === String(timeId) ||
                String(p.id) === String(timeId) ||
                String(p.timeId) === String(timeId)
            );
        });

        if (participante) {
            return {
                ...participante,
                time_id: participante.time_id || participante.id || timeId,
                id: participante.id || participante.time_id || timeId,
            };
        }

        try {
            const response = await fetch(`/api/time/${timeId}`);
            if (!response.ok) return null;

            const dados = await response.json();
            return {
                time_id: timeId,
                id: timeId,
                nome_cartoleiro:
                    dados.nome_cartoleiro || dados.nome_cartola || "N/D",
                nome_time: dados.nome_time || dados.nome || "N/D",
                url_escudo_png: dados.url_escudo_png || dados.escudo_url || "",
                clube_id: dados.clube_id || null,
            };
        } catch (error) {
            console.error(
                `[FLUXO-CORE] Erro ao buscar participante ${timeId}:`,
                error,
            );
            return null;
        }
    }
}
