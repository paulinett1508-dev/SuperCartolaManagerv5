// FLUXO-FINANCEIRO-CACHE.JS - OTIMIZADO
import { getRankingRodadaEspecifica } from "../rodadas.js";
import {
    obterLigaId,
    getConfrontosLigaPontosCorridos,
    gerarConfrontos,
    buscarTimesLiga,
} from "../pontos-corridos-utils.js";
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

        // ✅ GARANTIR ligaId ESTÁ DISPONÍVEL (fallback para obterLigaId())
        this.ligaId = ligaId || obterLigaId();

        if (!this.ligaId) {
            console.error('[FLUXO-CACHE] ❌ ligaId não disponível, impossível inicializar cache');
            return;
        }

        window.ligaId = this.ligaId; // Expor globalmente
        console.log('[FLUXO-CACHE] ✅ ligaId confirmado:', this.ligaId);

        // SEQUÊNCIA GARANTIDA: participantes → pontos corridos → dados externos
        await this.carregarParticipantes();
        await this.carregarDadosPontosCorridos();
        await this.carregarDadosExternos();

        console.log('[FLUXO-CACHE] ✅ Cache inicializado com sucesso');
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
        console.log(`[FLUXO-CACHE] 🔍 Verificando cache de rodadas (1-${ultimaRodadaCompleta})...`);

        // ✅ VERIFICAR QUAIS RODADAS JÁ ESTÃO EM CACHE
        const rodadasFaltantes = [];

        for (let rodada = 1; rodada <= ultimaRodadaCompleta; rodada++) {
            const cacheKey = `ranking_${this.ligaId}_${rodada}`;

            // Verificar cache persistente (IndexedDB)
            const cached = await this.cacheManager.get("rankings", cacheKey, null, { force: false });

            if (!cached || !Array.isArray(cached) || cached.length === 0) {
                rodadasFaltantes.push(rodada);
            } else {
                // Já está em cache - apenas armazenar em memória
                this.cacheRankings[rodada] = cached;
            }
        }

        // ✅ SE TUDO JÁ ESTÁ EM CACHE, NÃO PRECISA BUSCAR NADA
        if (rodadasFaltantes.length === 0) {
            console.log(`[FLUXO-CACHE] ✅ Todas as ${ultimaRodadaCompleta} rodadas já estão em cache`);
            this._atualizarProgresso(container, 100, 1, ultimaRodadaCompleta, ultimaRodadaCompleta);
            return;
        }

        console.log(`[FLUXO-CACHE] 📥 Buscando ${rodadasFaltantes.length} rodadas faltantes:`, rodadasFaltantes);

        // ✅ CARREGAR APENAS RODADAS FALTANTES EM PARALELO (lotes de 5)
        const rodadasPorLote = 5;
        const totalLotes = Math.ceil(rodadasFaltantes.length / rodadasPorLote);

        for (let loteIdx = 0; loteIdx < totalLotes; loteIdx++) {
            const inicio = loteIdx * rodadasPorLote;
            const fim = Math.min(inicio + rodadasPorLote, rodadasFaltantes.length);
            const rodadasDoLote = rodadasFaltantes.slice(inicio, fim);

            // Carregar lote em paralelo
            await Promise.all(rodadasDoLote.map(rodada => this._carregarRodada(rodada)));

            const progresso = Math.round(((fim / rodadasFaltantes.length) * 100));
            this._atualizarProgresso(
                container,
                progresso,
                rodadasDoLote[0],
                rodadasDoLote[rodadasDoLote.length - 1],
                ultimaRodadaCompleta,
            );
        }

        console.log(`[FLUXO-CACHE] ✅ Cache completo com ${ultimaRodadaCompleta} rodadas`);
    }


    async _carregarRodada(rodada) {
        const cacheKey = `ranking_${this.ligaId}_${rodada}`;

        try {
            // Buscar com cache persistente
            const ranking = await this.cacheManager.get(
                "rankings",
                cacheKey,
                async () => {
                    // Cache miss - buscar da API
                    console.log(`[FLUXO-CACHE] 🌐 Buscando rodada ${rodada} da API...`);
                    const data = await getRankingRodadaEspecifica(this.ligaId, rodada);

                    if (!data || !Array.isArray(data) || data.length === 0) {
                        console.warn(`[FLUXO-CACHE] ⚠️ Rodada ${rodada} sem dados - usando simulação`);
                        return gerarRankingSimulado(rodada, this.participantes);
                    }

                    return data.map((item) => {
                        const timeId = String(item.timeId || item.time_id || item.id);
                        return { ...item, time_id: timeId, timeId: timeId, id: timeId };
                    });
                },
                { ttl: 30 * 60 * 1000 } // 30 minutos de TTL
            );

            this.cacheRankings[rodada] = ranking;
        } catch (error) {
            console.warn(
                `[FLUXO-CACHE] ❌ Erro ao carregar rodada ${rodada}:`,
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

        if (container) {
            const statusText = container.querySelector("p:last-child");
            if (statusText) {
                if (progresso === 100) {
                    statusText.textContent = `✅ Cache completo (${ultimaRodadaCompleta} rodadas)`;
                } else {
                    statusText.textContent = `Buscando rodadas ${rodadaInicial}-${rodadaFinal}... (${progresso}%)`;
                }
            }
        }
    }

    async carregarDadosPontosCorridos() {
        // ✅ VALIDAR ligaId ANTES DE PROSSEGUIR
        if (!this.ligaId) {
            console.warn('[FLUXO-CACHE] ⚠️ ligaId não disponível, pulando Pontos Corridos');
            this.timesLiga = [];
            this.cacheFrontosPontosCorridos = [];
            return;
        }

        try {
            // ✅ FUNCIONA PARA TODAS AS LIGAS (não só ID_SUPERCARTOLA_2025)
            this.timesLiga = await buscarTimesLiga(this.ligaId);
            this.timesLiga = this.timesLiga.filter(
                (t) => t && typeof t.id === "number",
            );

            if (this.timesLiga.length > 0) {
                this.cacheFrontosPontosCorridos = gerarConfrontos(
                    this.timesLiga,
                );
                console.log(
                    `[FLUXO-CACHE] ✅ Confrontos Pontos Corridos: ${this.cacheFrontosPontosCorridos.length} rodadas para ${this.timesLiga.length} times`,
                );
            } else {
                console.warn('[FLUXO-CACHE] ⚠️ Nenhum time encontrado para gerar confrontos');
                this.cacheFrontosPontosCorridos = [];
            }
        } catch (error) {
            console.error(
                "[FLUXO-CACHE] ❌ Erro ao carregar Pontos Corridos:",
                error,
            );
            this.timesLiga = [];
            this.cacheFrontosPontosCorridos = [];
        }
    }

    async carregarDadosExternos() {
        console.log('[FLUXO-CACHE] Carregando dados externos...');

        // Carregar confrontos de Pontos Corridos
        if (!this.cacheConfrontosLPC || this.cacheConfrontosLPC.length === 0) {
          await this.carregarConfrontosLPC();
        }

        // Invalidar cache do Mata-Mata se versão antiga (forçar recálculo da 5ª edição)
        const cacheKey = "mataMataFluxo_v2_invalidated";
        const cacheInvalidado = localStorage.getItem(cacheKey);
        if (!cacheInvalidado) {
          console.warn("[FLUXO-CACHE] 🔄 Invalidando cache de Mata-Mata (correção 5ª edição)");
          localStorage.removeItem("mataMataFluxo");
          localStorage.setItem(cacheKey, "true");
        }

        // Carregar Mata-Mata
        try {
            // ✅ INJETAR DEPENDÊNCIA ANTES DE USAR
            const { getResultadosMataMataFluxo, setRankingFunction } = await import('../mata-mata/mata-mata-financeiro.js');

            // Injetar função necessária
            setRankingFunction(getRankingRodadaEspecifica);
            console.log('[FLUXO-CACHE] ✅ Dependência do Mata-Mata injetada');

            const resultadosMataMataFluxo = await getResultadosMataMataFluxo(this.ligaId);

            // Processar resultados do mata-mata
            this.cacheResultadosMM = this._processarResultadosMataMataCorrigido(resultadosMataMataFluxo);
        } catch (error) {
            console.warn('[FLUXO-CACHE] Erro ao carregar Mata-Mata:', error);
            this.cacheResultadosMM = [];
        }

        // Só buscar Melhor do Mês (passar ligaId explicitamente)
        const resultadosMelhorMes = this.ligaId ? await getResultadosMelhorMes(this.ligaId).catch(() => []) : Promise.resolve([]);

        // Armazenar resultados
        this.cacheConfrontosLPC = this.cacheConfrontosLPC || []; // Garantir que esta linha seja executada
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

        console.log(`[FLUXO-CACHE] Dados externos carregados:`);
        console.log(`- Confrontos LPC: ${this.cacheConfrontosLPC.length}`);
        console.log(`- Mata-Mata: ${this.cacheResultadosMM.length}`);
        console.log(`- Melhor Mês: ${this.cacheResultadosMelhorMes.length}`);
    }

    // Novo método para carregar confrontos LPC
    async carregarConfrontosLPC() {
      try {
        this.cacheConfrontosLPC = await getConfrontosLigaPontosCorridos(this.ligaId);
      } catch (error) {
        console.error("[FLUXO-CACHE] Erro ao carregar confrontos LPC:", error);
        this.cacheConfrontosLPC = [];
      }
    }

    _processarResultadosMataMataCorrigido(resultadosMM) {
        const processedResults = [];

        if (
            !resultadosMM ||
            !resultadosMM.participantes ||
            !Array.isArray(resultadosMM.participantes)
        ) {
            console.warn("[FLUXO-CACHE] Dados do Mata-Mata inválidos");
            return [];
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
                    processedResults.push({
                        timeId: participante.timeId,
                        fase: edicao.fase,
                        rodadaPontos: rodadaPontos,
                        valor: edicao.valor,
                    });
                }
            });
        });

        console.log(
            `[FLUXO-CACHE] Mata-Mata processado: ${processedResults.length} registros`,
        );
        return processedResults;
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