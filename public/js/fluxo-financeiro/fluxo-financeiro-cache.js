// FLUXO-FINANCEIRO-CACHE.JS - OTIMIZADO
import { getRankingRodadaEspecifica } from "../rodadas.js";
import {
    obterLigaId,
    getConfrontosLigaPontosCorridos,
    gerarConfrontos,
    buscarTimesLiga,
} from "../pontos-corridos-utils.js";
import {
    getResultadosMataMataFluxo,
    testarDadosMataMata,
} from "../mata-mata/mata-mata-financeiro.js";
import { getResultadosMelhorMes } from "../melhor-mes.js";
import { filtrarDadosPorTimesLigaEspecial } from "../filtro-liga-especial.js";
import {
    gerarRankingSimulado,
    ID_SUPERCARTOLA_2025,
} from "./fluxo-financeiro-utils.js";

import { cacheManager } from "../core/cache-manager.js";

// ✅ CACHE PERSISTENTE - NÃO EXPIRA AUTOMATICAMENTE
const CACHE_NEVER_EXPIRE = Infinity;
const cache = new Map();
let ultimaLigaId = null;
let ultimaAtualizacaoManual = null;

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
        this.ultimaRodadaCompleta = 0;
        this.cacheManager = cacheManager;
    }

    async inicializar(ligaId) {
        console.log('[FLUXO-CACHE] Inicializando cache para liga:', ligaId);

        // ✅ ARMAZENAR ligaId globalmente para uso pelos módulos
        this.ligaId = ligaId;
        window.ligaId = ligaId; // Expor globalmente também

        // Aguardar carregamento de participantes
        await this.carregarParticipantes();

        // Carregar dados externos (Mata-Mata, Pontos Corridos, etc.)
        await this.carregarDadosExternos();

        console.log('[FLUXO-CACHE] Cache inicializado com sucesso');
    }

    getUltimaRodadaCompleta() {
        return this.ultimaRodadaCompleta;
    }

    setUltimaRodadaCompleta(rodada) {
        this.ultimaRodadaCompleta = rodada;
    }

    setParticipantes(participantes) {
        this.participantes = participantes || [];
    }

    async carregarParticipantes() {
        const ligaId = this.ligaId || obterLigaId();
        if (!ligaId) {
            this.participantes = [];
            return [];
        }

        const cacheKey = `participantes_${ligaId}`;

        try {
            const data = await this.cacheManager.get(
                "participantes",
                cacheKey,
                async () => {
                    const response = await fetch(`/api/ligas/${ligaId}/times`);
                    if (!response.ok)
                        throw new Error(
                            `Erro ao buscar participantes: ${response.statusText}`,
                        );
                    return await response.json();
                }
            );
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
                        url_escudo_png: p.url_escudo_png,
                        escudo_url: p.escudo_url,
                    };
                })
                .sort((a, b) =>
                    (a.nome_cartola || "").localeCompare(b.nome_cartola || ""),
                );

            return this.participantes;
        } catch (error) {
            console.error(
                "[FLUXO-CACHE] Erro ao carregar participantes:",
                error,
            );
            this.participantes = [];
            return [];
        }
    }

    // OTIMIZADO: Carregamento em lotes com Promise.all
    async carregarCacheRankingsEmLotes(ultimaRodadaCompleta, container) {
        const ligaId = this.ligaId || obterLigaId();
        if (!ligaId) {
            this.cacheRankings = {};
            return;
        }

        this.setUltimaRodadaCompleta(ultimaRodadaCompleta);
        this.cacheRankings = {};

        const tamanhoDeLote = 5;
        const totalDeLotes = Math.ceil(ultimaRodadaCompleta / tamanhoDeLote);

        for (let lote = 0; lote < totalDeLotes; lote++) {
            const rodadaInicial = lote * tamanhoDeLote + 1;
            const rodadaFinal = Math.min(
                (lote + 1) * tamanhoDeLote,
                ultimaRodadaCompleta,
            );

            const progressoAtual = Math.round((lote / totalDeLotes) * 100);
            this._atualizarProgresso(
                container,
                progressoAtual,
                rodadaInicial,
                rodadaFinal,
                ultimaRodadaCompleta,
            );

            // OTIMIZADO: Promise.all para processar lote em paralelo
            const promessasDoLote = [];
            for (let r = rodadaInicial; r <= rodadaFinal; r++) {
                promessasDoLote.push(this._carregarRankingRodada(r));
            }
            await Promise.all(promessasDoLote);
        }

        this._atualizarProgresso(container, 100);
        console.log(
            `[FLUXO-CACHE] Cache carregado: ${Object.keys(this.cacheRankings).length} rodadas`,
        );
    }

    async _carregarRankingRodada(rodada) {
        const ligaId = this.ligaId || obterLigaId();
        const cacheKey = `ranking_${ligaId}_${rodada}`;

        try {
            // Tentar cache persistente primeiro
            const ranking = await this.cacheManager.get(
                "rankings",
                cacheKey,
                async () => {
                    // Cache miss - buscar da API
                    const data = await getRankingRodadaEspecifica(ligaId, rodada);

                    if (!data || !Array.isArray(data) || data.length === 0) {
                        return gerarRankingSimulado(rodada, this.participantes);
                    }

                    return data.map((item) => {
                        const timeId = String(item.timeId || item.time_id || item.id);
                        return { ...item, time_id: timeId, timeId: timeId, id: timeId };
                    });
                }
            );

            this.cacheRankings[rodada] = ranking;
        } catch (error) {
            console.warn(
                `[FLUXO-CACHE] Erro ao carregar rodada ${rodada}:`,
                error,
            );
            this.cacheRankings[rodada] = gerarRankingSimulado(
                rodada,
                this.participantes,
            );
        }
    }

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
            if ( mensagemDeProgresso) {
                mensagemDeProgresso.textContent = `Processando rodadas ${rodadaInicial} a ${rodadaFinal} de ${ultimaRodadaCompleta}`;
            }
        }
    }

    async carregarDadosPontosCorridos() {
        const ligaId = this.ligaId || obterLigaId();
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
                        `[FLUXO-CACHE] Confrontos Pontos Corridos: ${this.cacheFrontosPontosCorridos.length} rodadas`,
                    );
                }
            } catch (error) {
                console.error(
                    "[FLUXO-CACHE] Erro ao carregar Pontos Corridos:",
                    error,
                );
                this.timesLiga = [];
                this.cacheFrontosPontosCorridos = [];
            }
        }
    }

    async carregarDadosExternos() {
        console.log('[FLUXO-CACHE] Carregando dados externos...');

        try {
            // Validar ligaId
            if (!this.ligaId) {
                console.warn('[FLUXO-CACHE] ⚠️ ligaId não disponível, pulando dados externos');
                this.cacheConfrontosLPC = [];
                this.cacheResultadosMM = [];
                this.cacheResultadosMelhorMes = [];
                return;
            }

            // Buscar confrontos de Pontos Corridos
            console.log('[FLUXO-CACHE] 🔑 Usando ligaId:', this.ligaId);
            const confrontosLPC = await getConfrontosLigaPontosCorridos(this.ligaId);
            const resultadosMM = await getResultadosMataMataFluxo().catch(() => ({
                participantes: [],
                edicoes: [],
            }));
            // Só buscar Melhor Mês se ligaId for válido
            const resultadosMelhorMes = this.ligaId ? await getResultadosMelhorMes(this.ligaId).catch(() => []) : Promise.resolve([]);

            // Armazenar resultados
            this.cacheConfrontosLPC = confrontosLPC || [];
            this.cacheResultadosMM = resultadosMM || { participantes: [], edicoes: [] };
            this.cacheResultadosMelhorMes = Array.isArray(resultadosMelhorMes)
                ? resultadosMelhorMes
                : [];

            if (this.cacheResultadosMelhorMes.length > 0) {
                try {
                    this.cacheResultadosMelhorMes =
                        await filtrarDadosPorTimesLigaEspecial(
                            this.cacheResultadosMelhorMes,
                        );
                } catch (error) {
                    console.warn("[FLUXO-CACHE] Erro ao aplicar filtro:", error);
                }
            }

            this._processarResultadosMataMataCorrigido(this.cacheResultadosMM);

            console.log(`[FLUXO-CACHE] Dados externos carregados:`);
            console.log(`- Confrontos LPC: ${this.cacheConfrontosLPC.length}`);
            console.log(`- Mata-Mata: ${this.cacheResultadosMM.length}`);
            console.log(`- Melhor Mês: ${this.cacheResultadosMelhorMes.length}`);
        } catch (error) {
            console.error("[FLUXO-CACHE] Erro geral ao carregar dados externos:", error);
            // Resetar caches em caso de erro para evitar dados inconsistentes
            this.cacheConfrontosLPC = [];
            this.cacheResultadosMM = [];
            this.cacheResultadosMelhorMes = [];
        }
    }

    _processarResultadosMataMataCorrigido(resultadosMM) {
        this.cacheResultadosMM = [];

        if (
            !resultadosMM ||
            !resultadosMM.participantes ||
            !Array.isArray(resultadosMM.participantes)
        ) {
            console.warn("[FLUXO-CACHE] Dados do Mata-Mata inválidos");
            return;
        }

        resultadosMM.participantes.forEach((participante) => {
            if (!participante.edicoes || !Array.isArray(participante.edicoes))
                return;

            participante.edicoes.forEach((edicao) => {
                const rodadaPontos =
                    edicao.rodadaPontos ||
                    this._calcularRodadaPontosCorrigido(
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
            `[FLUXO-CACHE] Mata-Mata carregado: ${this.cacheResultadosMM.length} registros`,
        );
    }

    _calcularRodadaPontosCorrigido(edicao, fase) {
        // ✅ USAR DADOS DO CONFIG AO INVÉS DE HARDCODE
        const edicaoConfig = {
            1: { rodadaBase: 2 },   // ✅ CORRIGIDO
            2: { rodadaBase: 9 },   // ✅ CORRIGIDO
            3: { rodadaBase: 15 },  // ✅ CORRIGIDO
            4: { rodadaBase: 22 },  // ✅ CORRIGIDO
            5: { rodadaBase: 31 },  // ✅ JÁ ESTAVA CORRETO
        };

        const faseOffset = {
            primeira: 0,
            oitavas: 1,
            quartas: 2,
            semis: 3,
            final: 4,
        };

        const config = edicaoConfig[edicao];
        const offset = faseOffset[fase];

        if (!config || offset === undefined) return 0;

        // Edição 5 não tem semis, final é rodadaBase + 4
        if (edicao === 5 && fase === "final") return config.rodadaBase + 4;

        return config.rodadaBase + offset;
    }

    getRankingRodada(rodada) {
        return this.cacheRankings[rodada] || [];
    }

    getConfrontosPontosCorridos() {
        return this.cacheFrontosPontosCorridos;
    }

    getResultadosMataMata() {
        return this.cacheResultadosMM;
    }

    getConfrontosLPC() {
        return this.cacheConfrontosLPC;
    }

    getResultadosMelhorMes() {
        return this.cacheResultadosMelhorMes;
    }

    getParticipantes() {
        return this.participantes;
    }

    debugCache() {
        const stats = {
            participantes: this.participantes?.length || 0,
            rankingsCarregados: Object.keys(this.cacheRankings).length,
            confrontosPontosCorridos:
                this.cacheFrontosPontosCorridos?.length || 0,
            resultadosMataMata: this.cacheResultadosMM?.length || 0,
            ultimaRodadaCompleta: this.ultimaRodadaCompleta,
        };

        console.log("[FLUXO-CACHE] Estado do cache:", stats);
        return stats;
    }
}

// Gera a chave única para o cache, considerando ligaId e participante
function generateCacheKey(ligaId, participante = null) {
    if (participante) {
        return `${ligaId}-${participante.timeId}`;
    }
    return `${ligaId}-geral`;
}

// Obtém dados do cache, sem expiração automática
export async function getCachedFluxoFinanceiro(ligaId, participante = null) {
  const key = generateCacheKey(ligaId, participante);
  const cached = cache.get(key);

  if (cached) {
    console.log('[FLUXO-CACHE] ⚡ Cache persistente encontrado (última atualização manual:',
      ultimaAtualizacaoManual ? new Date(ultimaAtualizacaoManual).toLocaleString('pt-BR') : 'nunca',
      ')');
    return cached.data;
  }

  console.log('[FLUXO-CACHE] ⏱️ Nenhum cache encontrado - primeira carga');
  return null;
}

// Armazena dados no cache persistente
export function setCachedFluxoFinanceiro(ligaId, data, participante = null) {
    const key = generateCacheKey(ligaId, participante);
    // Armazena o timestamp da última atualização manual, se existir
    cache.set(key, {
        data: data,
        timestamp: ultimaAtualizacaoManual || Date.now() // Usa timestamp manual se disponível
    });
    console.log('[FLUXO-CACHE] 💾 Dados armazenados em cache:', key);
}

// Limpa o cache (todo ou específico)
export function invalidateCache(ligaId = null, participante = null) {
  if (!ligaId) {
    cache.clear();
    ultimaAtualizacaoManual = null;
    console.log('[FLUXO-CACHE] 🗑️ Todo cache limpo');
    return;
  }

  const key = generateCacheKey(ligaId, participante);
  cache.delete(key);
  console.log('[FLUXO-CACHE] 🗑️ Cache invalidado para:', key);
}

// ✅ NOVA FUNÇÃO: Refresh manual do usuário
export function forceRefresh(ligaId, participante = null) {
  invalidateCache(ligaId, participante);
  ultimaAtualizacaoManual = Date.now();
  console.log('[FLUXO-CACHE] 🔄 Refresh manual acionado pelo usuário');
  return true;
}