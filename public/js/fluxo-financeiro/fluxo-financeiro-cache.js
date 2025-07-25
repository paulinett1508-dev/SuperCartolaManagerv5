// ✅ CORREÇÃO: Imports corrigidos para estrutura de pastas
import { getRankingRodadaEspecifica } from "../rodadas.js";
import {
    getLigaId,
    getConfrontosLigaPontosCorridos,
    gerarConfrontos,
    buscarTimesLiga,
} from "../pontos-corridos-utils.js";
import {
    getResultadosMataMataFluxo,
    testarDadosMataMata,
} from "../mata-mata.js";
import { getResultadosMelhorMes } from "../melhor-mes.js";
import { filtrarDadosPorTimesLigaEspecial } from "../filtro-liga-especial.js";
import {
    gerarRankingSimulado,
    ID_SUPERCARTOLA_2025,
} from "./fluxo-financeiro-utils.js";

// ==============================
// GERENCIADOR DE CACHE
// ==============================

export class FluxoFinanceiroCache {
    constructor() {
        this.cacheRankings = {};
        this.cacheConfrontosLPC = [];
        this.cacheResultadosMM = [];
        this.cacheResultadosMelhorMes = [];
        this.cacheFrontosPontosCorridos = [];
        this.timesLiga = [];
        this.participantes = [];
        this.ligaId = null;
    }

    /**
     * Inicializa o cache com uma liga específica
     * @param {string} ligaId - ID da liga
     */
    async inicializar(ligaId) {
        console.log(`🔄 [FLUXO-CACHE] Inicializando cache para liga: ${ligaId}`);

        this.ligaId = ligaId;

        try {
            // Carregar participantes primeiro
            await this.carregarParticipantes();

            // Carregar dados dos pontos corridos
            await this.carregarDadosPontosCorridos();

            // Carregar dados externos
            await this.carregarDadosExternos();

            console.log(`✅ [FLUXO-CACHE] Cache inicializado com sucesso`);
        } catch (error) {
            console.error(`❌ [FLUXO-CACHE] Erro na inicialização:`, error);
            throw error;
        }
    }

    /**
     * Define participantes no cache
     * @param {Array} participantes - Array de participantes
     */
    setParticipantes(participantes) {
        this.participantes = participantes || [];
        console.log(`📋 [FLUXO-CACHE] ${this.participantes.length} participantes definidos no cache`);
    }

    /**
     * Carrega participantes da API
     * @returns {Promise<Array>} - Array de participantes
     */
    async carregarParticipantes() {
        const ligaId = this.ligaId || getLigaId();
        if (!ligaId) {
            this.participantes = [];
            return [];
        }

        try {
            const response = await fetch(`/api/ligas/${ligaId}/times`);
            if (!response.ok) {
                throw new Error(
                    `Erro ao buscar participantes: ${response.statusText}`,
                );
            }

            const data = await response.json();
            if (!data || !Array.isArray(data) || data.length === 0) {
                this.participantes = [];
                return [];
            }

            this.participantes = data
                .map((p) => {
                    const nomeCartolaFinal =
                        p.nome_cartola || p.nome_cartoleiro || "N/D";
                    const nomeTimeFinal = p.nome_time || "Time S/ Nome";
                    const nomeFinalParaExibir =
                        nomeCartolaFinal === "N/D"
                            ? nomeTimeFinal !== "Time S/ Nome"
                                ? nomeTimeFinal
                                : "Participante S/ Nome"
                            : nomeCartolaFinal;
                    const timeId = String(p.id || p.time_id || p.timeId);

                    return {
                        time_id: timeId,
                        timeId: timeId,
                        id: timeId,
                        nome_cartola: nomeFinalParaExibir,
                        nome_time: nomeTimeFinal,
                        clube_id: p.clube_id,
                    };
                })
                .sort((a, b) =>
                    (a.nome_cartola || "").localeCompare(b.nome_cartola || ""),
                );

            return this.participantes;
        } catch (error) {
            console.error(
                "[FluxoFinanceiroCache] Erro ao carregar participantes:",
                error,
            );
            this.participantes = [];
            return [];
        }
    }

    /**
     * Carrega cache de rankings em lotes
     * @param {number} ultimaRodadaCompleta - Última rodada completa
     * @param {HTMLElement} container - Container para atualizar progresso
     */
    async carregarCacheRankingsEmLotes(ultimaRodadaCompleta, container) {
        const ligaId = this.ligaId || getLigaId();
        if (!ligaId) {
            this.cacheRankings = {};
            return;
        }

        this.cacheRankings = {};
        const tamanhoDeLote = 5;
        const totalDeLotes = Math.ceil(ultimaRodadaCompleta / tamanhoDeLote);

        for (let lote = 0; lote < totalDeLotes; lote++) {
            const rodadaInicial = lote * tamanhoDeLote + 1;
            const rodadaFinal = Math.min(
                (lote + 1) * tamanhoDeLote,
                ultimaRodadaCompleta,
            );

            // Atualizar progresso
            const progressoAtual = Math.round((lote / totalDeLotes) * 100);
            this._atualizarProgresso(
                container,
                progressoAtual,
                rodadaInicial,
                rodadaFinal,
                ultimaRodadaCompleta,
            );

            // Processar lote
            const promessasDoLote = [];
            for (let r = rodadaInicial; r <= rodadaFinal; r++) {
                promessasDoLote.push(this._carregarRankingRodada(r));
            }
            await Promise.all(promessasDoLote);
        }

        // Finalizar progresso
        this._atualizarProgresso(container, 100);
    }

    /**
     * Carrega ranking de uma rodada específica
     * @param {number} rodada - Número da rodada
     * @private
     */
    async _carregarRankingRodada(rodada) {
        const ligaId = this.ligaId || getLigaId();

        try {
            const ranking = await getRankingRodadaEspecifica(ligaId, rodada);

            if (!ranking || !Array.isArray(ranking) || ranking.length === 0) {
                const rankingSimulado = gerarRankingSimulado(
                    rodada,
                    this.participantes,
                );
                this.cacheRankings[rodada] = rankingSimulado;
                return;
            }

            const rankingNormalizado = ranking.map((item) => {
                const timeId = String(item.timeId || item.time_id || item.id);
                return {
                    ...item,
                    time_id: timeId,
                    timeId: timeId,
                    id: timeId,
                };
            });

            this.cacheRankings[rodada] = rankingNormalizado;
        } catch (error) {
            console.warn(
                `[FluxoFinanceiroCache] Erro ao carregar rodada ${rodada}:`,
                error,
            );
            const rankingSimulado = gerarRankingSimulado(
                rodada,
                this.participantes,
            );
            this.cacheRankings[rodada] = rankingSimulado;
        }
    }

    /**
     * Atualiza progresso de carregamento
     * @param {HTMLElement} container - Container para atualizar
     * @param {number} progresso - Progresso atual (0-100)
     * @param {number} rodadaInicial - Rodada inicial do lote
     * @param {number} rodadaFinal - Rodada final do lote
     * @param {number} ultimaRodadaCompleta - Última rodada completa
     * @private
     */
    _atualizarProgresso(
        container,
        progresso,
        rodadaInicial,
        rodadaFinal,
        ultimaRodadaCompleta,
    ) {
        const barraDeProgresso = document.getElementById(
            "loading-progress-bar",
        );
        if (barraDeProgresso) {
            barraDeProgresso.style.width = `${progresso}%`;
        }

        if (container && rodadaInicial && rodadaFinal) {
            const mensagemDeProgresso = container.querySelector(
                ".loading-container p:nth-child(2)",
            );
            if (mensagemDeProgresso) {
                mensagemDeProgresso.textContent = `Processando rodadas ${rodadaInicial} a ${rodadaFinal} de ${ultimaRodadaCompleta}`;
            }
        }
    }

    /**
     * Carrega dados dos confrontos de pontos corridos
     */
    async carregarDadosPontosCorridos() {
        const ligaId = this.ligaId || getLigaId();
        if (ligaId === ID_SUPERCARTOLA_2025) {
            try {
                this.timesLiga = await buscarTimesLiga(ligaId);
                this.timesLiga = this.timesLiga.filter(
                    (t) => t && typeof t.id === "number",
                );

                if (this.timesLiga.length > 0) {
                    this.cacheFrontosPontosCorridos = gerarConfrontos(
                        this.timesLiga,
                    );
                    console.log(
                        "[FluxoFinanceiroCache] Confrontos Pontos Corridos carregados:",
                        this.cacheFrontosPontosCorridos.length,
                        "rodadas",
                    );
                }
            } catch (error) {
                console.error(
                    "Erro ao carregar times para Pontos Corridos:",
                    error,
                );
                this.timesLiga = [];
                this.cacheFrontosPontosCorridos = [];
            }
        }
    }

    /**
     * Carrega dados externos (confrontos, mata-mata, melhor mês)
     * ✅ CORREÇÃO: Implementa TODAS as funcionalidades do arquivo original
     */
    async carregarDadosExternos() {
        // Testar dados do mata-mata antes do processamento
        console.log("[FluxoFinanceiroCache] Testando dados do Mata-Mata...");
        try {
            await testarDadosMataMata();
        } catch (error) {
            console.warn(
                "[FluxoFinanceiroCache] Aviso ao testar dados do Mata-Mata:",
                error,
            );
        }

        const [confrontosLPC, resultadosMM, resultadosMelhorMes] =
            await Promise.all([
                getConfrontosLigaPontosCorridos(),
                getResultadosMataMataFluxo().catch((err) => {
                    console.error(
                        "Erro ao carregar resultados do Mata-Mata:",
                        err,
                    );
                    return { participantes: [], edicoes: [] };
                }),
                getResultadosMelhorMes().catch((err) => {
                    console.warn(
                        "Erro ao carregar resultados do Melhor Mês:",
                        err,
                    );
                    return [];
                }),
            ]);

        this.cacheConfrontosLPC = confrontosLPC || [];
        this.cacheResultadosMelhorMes = Array.isArray(resultadosMelhorMes)
            ? resultadosMelhorMes
            : [];

        // Aplicar filtro de liga especial se necessário
        if (this.cacheResultadosMelhorMes.length > 0) {
            try {
                this.cacheResultadosMelhorMes =
                    await filtrarDadosPorTimesLigaEspecial(
                        this.cacheResultadosMelhorMes,
                    );
                console.log(
                    "[FluxoFinanceiroCache] Filtro de liga especial aplicado ao Melhor Mês",
                );
            } catch (error) {
                console.warn(
                    "[FluxoFinanceiroCache] Erro ao aplicar filtro de liga especial:",
                    error,
                );
            }
        }

        // Processar resultados do Mata-Mata
        this._processarResultadosMataMata(resultadosMM);

        console.log("[FluxoFinanceiroCache] Dados externos carregados:");
        console.log(`- Confrontos LPC: ${this.cacheConfrontosLPC.length}`);
        console.log(`- Mata-Mata: ${this.cacheResultadosMM.length}`);
        console.log(`- Melhor Mês: ${this.cacheResultadosMelhorMes.length}`);
    }

    /**
     * Processa resultados do Mata-Mata
     * @param {Object} resultadosMM - Dados do mata-mata
     * @private
     */
    _processarResultadosMataMata(resultadosMM) {
        console.log(
            "[FluxoFinanceiroCache] Processando resultados do Mata-Mata...",
        );

        this.cacheResultadosMM = [];

        if (
            !resultadosMM ||
            !resultadosMM.participantes ||
            !Array.isArray(resultadosMM.participantes)
        ) {
            console.warn(
                "[FluxoFinanceiroCache] Dados do Mata-Mata inválidos ou vazios",
            );
            return;
        }

        resultadosMM.participantes.forEach((participante) => {
            if (!participante.edicoes || !Array.isArray(participante.edicoes)) {
                return;
            }

            participante.edicoes.forEach((edicao) => {
                const rodadaPontos = this._calcularRodadaPontos(
                    edicao.edicao,
                    edicao.fase,
                );

                if (rodadaPontos > 0) {
                    this.cacheResultadosMM.push({
                        timeId: participante.timeId,
                        fase: edicao.fase,
                        rodadaPontos: rodadaPontos,
                        valor: edicao.valor,
                    });
                }
            });
        });

        console.log(
            "[FluxoFinanceiroCache] Cache Mata-Mata carregado:",
            this.cacheResultadosMM.length,
            "registros",
        );
    }

    /**
     * Calcula rodada de pontos baseada na edição e fase
     * @param {number} edicao - Número da edição
     * @param {string} fase - Fase do mata-mata
     * @returns {number} - Rodada de pontos
     * @private
     */
    _calcularRodadaPontos(edicao, fase) {
        const faseToRodada = {
            primeira: 0,
            oitavas: 1,
            quartas: 2,
            semis: 3,
            final: 4,
        };

        const rodadaBase = {
            1: 3, // 1ª edição (rodadas 3-7)
            2: 10, // 2ª edição (rodadas 10-14)
            4: 24, // 4ª edição (rodadas 24-28)
            5: 31, // 5ª edição (rodadas 31-35)
        };

        const base = rodadaBase[edicao];
        const offset = faseToRodada[fase];

        return base && offset !== undefined ? base + offset : 0;
    }

    /**
     * Obtém ranking de uma rodada específica
     * @param {number} rodada - Número da rodada
     * @returns {Array} - Ranking da rodada
     */
    getRankingRodada(rodada) {
        return this.cacheRankings[rodada] || [];
    }

    /**
     * Obtém confrontos de pontos corridos
     * @returns {Array} - Array de confrontos
     */
    getConfrontosPontosCorridos() {
        return this.cacheFrontosPontosCorridos;
    }

    /**
     * Obtém resultados do mata-mata
     * @returns {Array} - Array de resultados
     */
    getResultadosMataMata() {
        return this.cacheResultadosMM;
    }

    /**
     * Obtém confrontos LPC (Liga Pontos Corridos)
     * ✅ CORREÇÃO: Funcionalidade que estava faltando
     * @returns {Array} - Array de confrontos LPC
     */
    getConfrontosLPC() {
        return this.cacheConfrontosLPC;
    }

    /**
     * Obtém resultados do melhor mês
     * ✅ CORREÇÃO: Funcionalidade que estava faltando
     * @returns {Array} - Array de resultados do melhor mês
     */
    getResultadosMelhorMes() {
        return this.cacheResultadosMelhorMes;
    }

    /**
     * Obtém participantes
     * @returns {Array} - Array de participantes
     */
    getParticipantes() {
        return this.participantes;
    }

    /**
     * Obtém dados completos do cache para debug
     * @returns {Object} - Objeto com todos os dados do cache
     */
    getDadosCompletos() {
        return {
            rankings: this.cacheRankings,
            confrontosLPC: this.cacheConfrontosLPC,
            resultadosMM: this.cacheResultadosMM,
            resultadosMelhorMes: this.cacheResultadosMelhorMes,
            confrontosPontosCorridos: this.cacheFrontosPontosCorridos,
            timesLiga: this.timesLiga,
            participantes: this.participantes,
        };
    }

    // Verificar se há confrontos carregados
    hasConfrontosPontosCorridos() {
        return this.confrontosPontosCorridos && this.confrontosPontosCorridos.length > 0;
    }

    // Obter confrontos dos pontos corridos
    getConfrontosPontosCorridos() {
        return this.confrontosPontosCorridos || [];
    }

    // Método de debug para verificar estado do cache
    debugCache() {
        const stats = {
            participantes: this.participantes?.length || 0,
            rankingsCarregados: Object.keys(this.cacheRankings).length,
            confrontosPontosCorridos: this.confrontosPontosCorridos?.length || 0,
            ultimaRodadaCompleta: this.ultimaRodadaCompleta,
            rodadasComDados: []
        };

        // Verificar quais rodadas têm dados
        for (let rodada = 1; rodada <= (this.ultimaRodadaCompleta || 20); rodada++) {
            const ranking = this.getRankingRodada(rodada);
            if (ranking && ranking.length > 0) {
                stats.rodadasComDados.push(rodada);
            }
        }

        console.log('🔍 [FLUXO-CACHE] Estado do cache:', stats);

        // Verificar um ranking específico como exemplo
        if (stats.rodadasComDados.length > 0) {
            const primeiraRodada = stats.rodadasComDados[0];
            const exemploRanking = this.getRankingRodada(primeiraRodada);
            console.log(`🔍 [FLUXO-CACHE] Exemplo ranking rodada ${primeiraRodada} (${exemploRanking.length} times):`, 
                exemploRanking.slice(0, 3).map(r => ({
                    timeId: r.timeId || r.time_id || r.id,
                    nome: r.nome_cartola || r.nome_cartoleiro,
                    pontos: r.pontos
                }))
            );
        }

        return stats;
    }
}