// FLUXO-FINANCEIRO-CORE.JS - OTIMIZADO COM PROCESSAMENTO PARALELO
import { calcularFinanceiroConfronto } from "../pontos-corridos-utils.js";
import { getLigaId } from "../pontos-corridos-utils.js";
import { FluxoFinanceiroCampos } from "./fluxo-financeiro-campos.js";
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
    calcularExtratoFinanceiro(timeId, ultimaRodadaCompleta) {
        console.log(
            `[FLUXO-CORE] Iniciando cálculo OTIMIZADO para time ${timeId} até rodada ${ultimaRodadaCompleta}`,
        );

        const ligaId = getLigaId();
        const isSuperCartola2025 = ligaId === ID_SUPERCARTOLA_2025;
        const isCartoleirosSobral = ligaId === ID_CARTOLEIROS_SOBRAL;

        const camposEditaveis =
            FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);
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
                pontosCorridos: 0,
                mataMata: 0,
                melhorMes: 0,
                campo1: camposEditaveis.campo1?.valor || 0,
                campo2: camposEditaveis.campo2?.valor || 0,
                campo3: camposEditaveis.campo3?.valor || 0,
                campo4: camposEditaveis.campo4?.valor || 0,
                vezesMito: 0,
                vezesMico: 0,
                saldo: 0,
            },
            totalTimes: 0,
            camposEditaveis: camposEditaveis,
        };

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
        this._calcularSaldoAcumulado(extrato.rodadas);
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
            ? valoresRodadaCartoleirosSobral
            : valoresRodadaPadrao;
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
        const saldoBase = 
            (resumo.bonus || 0) +
            (resumo.onus || 0) +
            (resumo.pontosCorridos || 0) +
            (resumo.mataMata || 0) +
            (resumo.melhorMes || 0);
        
        const camposEditaveis = 
            (parseFloat(resumo.campo1) || 0) +
            (parseFloat(resumo.campo2) || 0) +
            (parseFloat(resumo.campo3) || 0) +
            (parseFloat(resumo.campo4) || 0);
        
        const saldoFinal = saldoBase + camposEditaveis;
        
        console.log(`[FLUXO-CORE] Saldo Base: ${saldoBase.toFixed(2)}, Campos Editáveis: ${camposEditaveis.toFixed(2)}, Saldo Final: ${saldoFinal.toFixed(2)}`);
        
        return saldoFinal;
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
