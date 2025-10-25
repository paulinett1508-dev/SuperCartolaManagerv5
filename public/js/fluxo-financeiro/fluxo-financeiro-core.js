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
    async calcularExtratoFinanceiro(timeId, ultimaRodadaCompleta) {
        console.log(
            `[FLUXO-CORE] Iniciando cálculo OTIMIZADO para time ${timeId} até rodada ${ultimaRodadaCompleta}`,
        );

        const ligaId = getLigaId();
        const isSuperCartola2025 = ligaId === ID_SUPERCARTOLA_2025;
        const isCartoleirosSobral = ligaId === ID_CARTOLEIROS_SOBRAL;

        // ✅ AGUARDAR CARREGAMENTO DOS CAMPOS DO MONGODB
        const camposEditaveis = await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);
        console.log('[FLUXO-CORE] Campos editáveis carregados:', camposEditaveis);
        const resultadosMataMata = this.mataMataIntegrado
            ? this.cache.getResultadosMataMata()
            : [];

        // NOVO: Carregar Map do Mata-Mata
        if (resultadosMataMata.length > 0) {
            this._carregarMataMataMap(resultadosMataMata);
        }

        // ✅ DETECTAR DISPUTAS ATIVAS NA LIGA
        const disputasAtivas = await this._detectarDisputasAtivas(
            ultimaRodadaCompleta,
            isSuperCartola2025,
            resultadosMataMata
        );

        // ✅ GARANTIR QUE TODOS OS VALORES DO RESUMO SEJAM NÚMEROS
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
            },
            totalTimes: 0,
            camposEditaveis: camposEditaveis,
            disputasAtivas: disputasAtivas, // ✅ NOVO: Informação sobre disputas ativas
        };

        console.log('[FLUXO-CORE] Resumo inicializado:', {
            pontosCorridos: extrato.resumo.pontosCorridos,
            mataMata: extrato.resumo.mataMata,
            campo1: extrato.resumo.campo1,
            campo2: extrato.resumo.campo2,
            campo3: extrato.resumo.campo3,
            campo4: extrato.resumo.campo4,
        });

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
        // Acumular Bônus e Ônus
        if (rodadaData.bonusOnus > 0) resumo.bonus += rodadaData.bonusOnus;
        if (rodadaData.bonusOnus < 0) resumo.onus += rodadaData.bonusOnus;

        // Contar MITO e MICO
        if (rodadaData.isMito) resumo.vezesMito++;
        if (rodadaData.isMico) resumo.vezesMico++;

        // ✅ GARANTIR que Pontos Corridos seja acumulado (mesmo que seja 0)
        if (isSuperCartola2025) {
            const valorPC = typeof rodadaData.pontosCorridos === "number" ? rodadaData.pontosCorridos : 0;
            resumo.pontosCorridos += valorPC;
        }

        // ✅ GARANTIR que Mata-Mata seja acumulado (mesmo que seja 0)
        const valorMM = typeof rodadaData.mataMata === "number" ? rodadaData.mataMata : 0;
        resumo.mataMata += valorMM;

        // Melhor Mês (futuro)
        const valorBM = typeof rodadaData.melhorMes === "number" ? rodadaData.melhorMes : 0;
        resumo.melhorMes += valorBM;
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

    // ✅ NOVO: Detectar quais disputas estão ativas na liga
    async _detectarDisputasAtivas(ultimaRodadaCompleta, isSuperCartola2025, resultadosMataMata) {
        const disputas = {
            bonusOnus: true, // Sempre ativo
            pontosCorridos: false,
            mataMata: false,
            melhorMes: false, // Futuro
        };

        // Verificar Pontos Corridos
        if (isSuperCartola2025) {
            const confrontos = this.cache.getConfrontosPontosCorridos();
            disputas.pontosCorridos = confrontos && confrontos.length > 0;
        }

        // Verificar Mata-Mata
        disputas.mataMata = this.mataMataIntegrado && resultadosMataMata.length > 0;

        console.log('[FLUXO-CORE] Disputas ativas detectadas:', disputas);
        return disputas;
    }

    _calcularSaldoFinal(resumo) {
        // ✅ CONVERTER TODOS OS VALORES PARA NÚMERO COM SEGURANÇA
        const bonus = parseFloat(resumo.bonus) || 0;
        const onus = parseFloat(resumo.onus) || 0;
        const pontosCorridos = parseFloat(resumo.pontosCorridos) || 0;
        const mataMata = parseFloat(resumo.mataMata) || 0;
        const melhorMes = parseFloat(resumo.melhorMes) || 0;

        const saldoBase = bonus + onus + pontosCorridos + mataMata + melhorMes;

        // ✅ GARANTIR QUE CAMPOS EDITÁVEIS SEJAM NÚMEROS
        const campo1 = parseFloat(resumo.campo1) || 0;
        const campo2 = parseFloat(resumo.campo2) || 0;
        const campo3 = parseFloat(resumo.campo3) || 0;
        const campo4 = parseFloat(resumo.campo4) || 0;

        const camposEditaveis = campo1 + campo2 + campo3 + campo4;
        const saldoFinal = saldoBase + camposEditaveis;

        // ✅ LOGS DETALHADOS PARA DEBUG
        console.log(`[FLUXO-CORE] ========== CÁLCULO SALDO FINAL ==========`);
        console.log(`[FLUXO-CORE] Bônus: R$ ${bonus.toFixed(2)}`);
        console.log(`[FLUXO-CORE] Ônus: R$ ${onus.toFixed(2)}`);
        console.log(`[FLUXO-CORE] Pontos Corridos: R$ ${pontosCorridos.toFixed(2)}`);
        console.log(`[FLUXO-CORE] Mata-Mata: R$ ${mataMata.toFixed(2)}`);
        console.log(`[FLUXO-CORE] Melhor Mês: R$ ${melhorMes.toFixed(2)}`);
        console.log(`[FLUXO-CORE] -----------------------------------------`);
        console.log(`[FLUXO-CORE] Saldo Base: R$ ${saldoBase.toFixed(2)}`);
        console.log(`[FLUXO-CORE] -----------------------------------------`);
        console.log(`[FLUXO-CORE] Campo1: R$ ${campo1.toFixed(2)}`);
        console.log(`[FLUXO-CORE] Campo2: R$ ${campo2.toFixed(2)}`);
        console.log(`[FLUXO-CORE] Campo3: R$ ${campo3.toFixed(2)}`);
        console.log(`[FLUXO-CORE] Campo4: R$ ${campo4.toFixed(2)}`);
        console.log(`[FLUXO-CORE] Campos Editáveis Total: R$ ${camposEditaveis.toFixed(2)}`);
        console.log(`[FLUXO-CORE] -----------------------------------------`);
        console.log(`[FLUXO-CORE] SALDO FINAL: R$ ${saldoFinal.toFixed(2)}`);
        console.log(`[FLUXO-CORE] ==========================================`);

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