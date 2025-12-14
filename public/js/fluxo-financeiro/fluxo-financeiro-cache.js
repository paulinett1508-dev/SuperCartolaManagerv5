// FLUXO-FINANCEIRO-CACHE.JS - OTIMIZADO COM MONGODB
// ✅ VERSÃO 4.1 - Integração completa com backend cache + verificação de módulos ativos

import {
    getRankingRodadaEspecifica,
    getRankingsEmLote,
    preCarregarRodadas,
} from "../rodadas.js";
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

// ===== CONSTANTES =====
const API_BASE_URL = window.location.origin;
const TTL_CACHE_MEMORIA = 30 * 60 * 1000; // 30 minutos para IndexedDB local

// Cache em memória para sessão
const cache = new Map();
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

        // ✅ NOVO: Controle de cache MongoDB
        this.extratosCacheados = new Map(); // timeId -> extrato
        this.statusMercado = null;

        // ✅ NOVO v4.1: Módulos ativos da liga
        this.modulosAtivos = {
            "mata-mata": true,
            "melhor-mes": true,
            "pontos-corridos": true,
            "luva-de-ouro": true,
            "artilheiro-campeao": true,
        };
    }

    // ===================================================================
    // ✅ v4.2: BUSCAR MÓDULOS ATIVOS DA LIGA (endpoint correto)
    // ===================================================================
    async _buscarModulosAtivos() {
        try {
            const response = await fetch(
                `/api/ligas/${this.ligaId}/modulos-ativos`,
            );
            if (response.ok) {
                const config = await response.json();

                // Formato esperado: { "mata-mata": true, "melhor-mes": false, ... }
                if (config && typeof config === "object") {
                    Object.keys(config).forEach((modulo) => {
                        if (typeof config[modulo] === "boolean") {
                            this.modulosAtivos[modulo] = config[modulo];
                        }
                    });
                }

                console.log(
                    "[FLUXO-CACHE] 📋 Módulos ativos:",
                    this.modulosAtivos,
                );
            }
        } catch (error) {
            // Fallback: tentar buscar do cards-condicionais se disponível
            try {
                const cardsConfig =
                    window.CardsCondicionais?.getConfig?.() ||
                    window.cardsCondicionaisConfig;
                if (cardsConfig?.modulosDesativados) {
                    cardsConfig.modulosDesativados.forEach((modulo) => {
                        this.modulosAtivos[modulo] = false;
                    });
                    console.log(
                        "[FLUXO-CACHE] 📋 Módulos (via cards-condicionais):",
                        this.modulosAtivos,
                    );
                }
            } catch (e) {
                // Usar padrão - todos ativos
                console.log(
                    "[FLUXO-CACHE] ℹ️ Usando módulos padrão (todos ativos)",
                );
            }
        }
    }

    // ✅ NOVO v4.1: Verificar se módulo está ativo
    isModuloAtivo(modulo) {
        return this.modulosAtivos[modulo] !== false;
    }

    // ===================================================================
    // ✅ NOVO: BUSCAR EXTRATO DO CACHE MONGODB (PRIORIDADE MÁXIMA)
    // ===================================================================
    async buscarExtratoCacheado(timeId, rodadaAtual, mercadoAberto = false) {
        try {
            console.log(
                `[FLUXO-CACHE] 🔍 Verificando cache MongoDB para time ${timeId}...`,
            );

            const url = `${API_BASE_URL}/api/extrato-cache/${this.ligaId}/times/${timeId}/cache/valido?rodadaAtual=${rodadaAtual}&mercadoAberto=${mercadoAberto}`;

            const response = await fetch(url);

            if (!response.ok) {
                console.log(
                    `[FLUXO-CACHE] ⚠️ Cache não encontrado (${response.status})`,
                );
                return null;
            }

            const cacheData = await response.json();

            if (cacheData.valido && cacheData.cached) {
                console.log(`[FLUXO-CACHE] ⚡ CACHE MONGODB VÁLIDO!`, {
                    motivo: cacheData.motivo,
                    permanente: cacheData.permanente,
                    rodadas: cacheData.rodadas?.length || 0,
                    saldo: cacheData.resumo?.saldo,
                });

                // Armazenar em memória para acesso rápido
                this.extratosCacheados.set(String(timeId), cacheData);

                return cacheData;
            }

            // Cache existe mas não é válido - retornar info para cálculo parcial
            if (!cacheData.valido) {
                console.log(
                    `[FLUXO-CACHE] ⚠️ Cache inválido: ${cacheData.motivo}`,
                    {
                        cacheRodada: cacheData.cacheRodada,
                        rodadaAtual: cacheData.rodadaAtual,
                        rodadasPendentes: cacheData.rodadasPendentes,
                    },
                );

                return {
                    valido: false,
                    parcial: true,
                    cacheRodada: cacheData.cacheRodada || 0,
                    rodadasPendentes: cacheData.rodadasPendentes || rodadaAtual,
                };
            }

            return null;
        } catch (error) {
            console.warn(
                `[FLUXO-CACHE] ❌ Erro ao verificar cache MongoDB:`,
                error.message,
            );
            return null;
        }
    }

    // ===================================================================
    // ✅ NOVO: SALVAR EXTRATO NO CACHE MONGODB
    // ===================================================================
    async salvarExtratoCacheado(
        timeId,
        extrato,
        rodadaCalculada,
        motivo = "calculo_frontend",
    ) {
        try {
            console.log(
                `[FLUXO-CACHE] 💾 Salvando cache MongoDB para time ${timeId}...`,
            );

            const payload = {
                historico_transacoes: extrato.rodadas || [],
                ultimaRodadaCalculada: rodadaCalculada,
                motivoRecalculo: motivo,
                resumo: extrato.resumo || {},
                saldo: extrato.resumo?.saldo || 0,
            };

            const response = await fetch(
                `${API_BASE_URL}/api/extrato-cache/${this.ligaId}/times/${timeId}/cache`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                console.log(`[FLUXO-CACHE] ✅ Cache MongoDB salvo com sucesso`);

                // Atualizar cache em memória
                this.extratosCacheados.set(String(timeId), {
                    valido: true,
                    cached: true,
                    rodadas: extrato.rodadas,
                    resumo: extrato.resumo,
                    ultimaRodadaCalculada: rodadaCalculada,
                });

                return true;
            }

            console.warn(
                `[FLUXO-CACHE] ⚠️ Erro ao salvar cache: ${response.status}`,
            );
            return false;
        } catch (error) {
            console.error(
                `[FLUXO-CACHE] ❌ Erro ao salvar cache MongoDB:`,
                error,
            );
            return false;
        }
    }

    // ===================================================================
    // ✅ NOVO: INVALIDAR CACHE DE UM TIME
    // ===================================================================
    async invalidarCacheTime(timeId) {
        try {
            console.log(
                `[FLUXO-CACHE] 🗑️ Invalidando cache do time ${timeId}...`,
            );

            const response = await fetch(
                `${API_BASE_URL}/api/extrato-cache/${this.ligaId}/times/${timeId}/cache`,
                { method: "DELETE" },
            );

            // Limpar cache em memória
            this.extratosCacheados.delete(String(timeId));

            if (response.ok) {
                console.log(`[FLUXO-CACHE] ✅ Cache invalidado com sucesso`);
                return true;
            }

            return false;
        } catch (error) {
            console.error(`[FLUXO-CACHE] ❌ Erro ao invalidar cache:`, error);
            return false;
        }
    }

    // ===================================================================
    // INICIALIZAÇÃO (OTIMIZADA COM PRÉ-CARREGAMENTO)
    // ===================================================================
    async inicializar(ligaId) {
        console.log("[FLUXO-CACHE] 🚀 Inicializando cache para liga:", ligaId);

        this.ligaId = ligaId || obterLigaId();

        if (!this.ligaId) {
            console.error("[FLUXO-CACHE] ❌ ligaId não disponível");
            return;
        }

        window.ligaId = this.ligaId;

        // ✅ Buscar status do mercado uma vez
        await this._buscarStatusMercado();

        // ✅ NOVO v4.1: Buscar módulos ativos da liga
        await this._buscarModulosAtivos();

        console.log("[FLUXO-CACHE] ✅ ligaId confirmado:", this.ligaId);

        // Determinar última rodada completa
        const rodadaAtual = this.statusMercado?.rodada_atual || 38;
        const mercadoAberto = this.statusMercado?.status_mercado === 1;
        this.ultimaRodadaCompleta = mercadoAberto
            ? Math.max(1, rodadaAtual - 1)
            : rodadaAtual;

        console.log(
            `[FLUXO-CACHE] 📊 Rodada atual: ${rodadaAtual}, Mercado: ${mercadoAberto ? "aberto" : "fechado"}, Última completa: ${this.ultimaRodadaCompleta}`,
        );

        // Carregar participantes primeiro
        await this.carregarParticipantes();

        // ✅ CRÍTICO: PRÉ-CARREGAR TODAS AS RODADAS EM BATCH (1 requisição!)
        // Isso popula o cache em memória ANTES dos módulos externos usarem
        await this.carregarCacheRankingsEmLotes(
            this.ultimaRodadaCompleta,
            null,
        );

        // Agora sim carregar dados que dependem dos rankings
        await this.carregarDadosPontosCorridos();
        await this.carregarDadosExternos();

        console.log("[FLUXO-CACHE] ✅ Cache inicializado com sucesso");
    }

    // ===================================================================
    // ✅ NOVO: Buscar status do mercado (usado para validação de cache)
    // ===================================================================
    async _buscarStatusMercado() {
        try {
            const response = await fetch("/api/cartola/mercado/status");
            if (response.ok) {
                this.statusMercado = await response.json();
                console.log("[FLUXO-CACHE] 📡 Status mercado:", {
                    rodada: this.statusMercado.rodada_atual,
                    aberto: this.statusMercado.status_mercado === 1,
                });
            }
        } catch (error) {
            console.warn(
                "[FLUXO-CACHE] ⚠️ Erro ao buscar status mercado:",
                error,
            );
            this.statusMercado = { rodada_atual: 38, status_mercado: 2 };
        }
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

    // ===================================================================
    // CARREGAR PARTICIPANTES (mantido)
    // ===================================================================
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
                },
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

    // ===================================================================
    // ✅ OTIMIZADO: Carregamento de Rankings com BATCH LOADING
    // ===================================================================
    async carregarCacheRankingsEmLotes(ultimaRodadaCompleta, container) {
        console.log(
            `[FLUXO-CACHE] 🚀 Carregando rodadas 1-${ultimaRodadaCompleta} em LOTE...`,
        );

        try {
            // ✅ USAR BATCH LOADING - UMA ÚNICA REQUISIÇÃO!
            const rodadasAgrupadas = await getRankingsEmLote(
                this.ligaId,
                1,
                ultimaRodadaCompleta,
                false,
            );

            // Transferir para cache local
            Object.keys(rodadasAgrupadas).forEach((rodada) => {
                this.cacheRankings[parseInt(rodada)] = rodadasAgrupadas[rodada];
            });

            const totalRodadas = Object.keys(rodadasAgrupadas).length;
            console.log(
                `[FLUXO-CACHE] ✅ ${totalRodadas} rodadas carregadas em 1 requisição!`,
            );

            this._atualizarProgresso(
                container,
                100,
                1,
                ultimaRodadaCompleta,
                ultimaRodadaCompleta,
            );
        } catch (error) {
            console.error(`[FLUXO-CACHE] ❌ Erro no batch loading:`, error);

            // ✅ FALLBACK: Carregar individualmente se batch falhar
            console.log(`[FLUXO-CACHE] 🔄 Tentando fallback individual...`);
            await this._carregarRodadasIndividualmente(
                ultimaRodadaCompleta,
                container,
            );
        }
    }

    // ✅ FALLBACK: Carregamento individual (só se batch falhar)
    async _carregarRodadasIndividualmente(ultimaRodadaCompleta, container) {
        const rodadasFaltantes = [];

        for (let rodada = 1; rodada <= ultimaRodadaCompleta; rodada++) {
            const cacheKey = `ranking_${this.ligaId}_${rodada}`;
            const cached = await this.cacheManager.get(
                "rankings",
                cacheKey,
                null,
                { force: false },
            );

            if (!cached || !Array.isArray(cached) || cached.length === 0) {
                rodadasFaltantes.push(rodada);
            } else {
                this.cacheRankings[rodada] = cached;
            }
        }

        if (rodadasFaltantes.length === 0) {
            console.log(
                `[FLUXO-CACHE] ✅ Todas as ${ultimaRodadaCompleta} rodadas já estão em cache`,
            );
            this._atualizarProgresso(
                container,
                100,
                1,
                ultimaRodadaCompleta,
                ultimaRodadaCompleta,
            );
            return;
        }

        console.log(
            `[FLUXO-CACHE] 📥 Buscando ${rodadasFaltantes.length} rodadas faltantes individualmente`,
        );

        const rodadasPorLote = 5;
        const totalLotes = Math.ceil(rodadasFaltantes.length / rodadasPorLote);

        for (let loteIdx = 0; loteIdx < totalLotes; loteIdx++) {
            const inicio = loteIdx * rodadasPorLote;
            const fim = Math.min(
                inicio + rodadasPorLote,
                rodadasFaltantes.length,
            );
            const rodadasDoLote = rodadasFaltantes.slice(inicio, fim);

            await Promise.all(
                rodadasDoLote.map((rodada) => this._carregarRodada(rodada)),
            );

            const progresso = Math.round((fim / rodadasFaltantes.length) * 100);
            this._atualizarProgresso(
                container,
                progresso,
                rodadasDoLote[0],
                rodadasDoLote[rodadasDoLote.length - 1],
                ultimaRodadaCompleta,
            );
        }

        console.log(
            `[FLUXO-CACHE] ✅ Cache completo com ${ultimaRodadaCompleta} rodadas (fallback)`,
        );
    }

    async _carregarRodada(rodada) {
        const cacheKey = `ranking_${this.ligaId}_${rodada}`;

        try {
            const ranking = await this.cacheManager.get(
                "rankings",
                cacheKey,
                async () => {
                    console.log(
                        `[FLUXO-CACHE] 🌐 Buscando rodada ${rodada} da API...`,
                    );
                    const data = await getRankingRodadaEspecifica(
                        this.ligaId,
                        rodada,
                    );

                    if (!data || !Array.isArray(data) || data.length === 0) {
                        console.warn(
                            `[FLUXO-CACHE] ⚠️ Rodada ${rodada} sem dados - usando simulação`,
                        );
                        return gerarRankingSimulado(rodada, this.participantes);
                    }

                    return data.map((item) => {
                        const timeId = String(
                            item.timeId || item.time_id || item.id,
                        );
                        return {
                            ...item,
                            time_id: timeId,
                            timeId: timeId,
                            id: timeId,
                        };
                    });
                },
                { ttl: TTL_CACHE_MEMORIA },
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

    // ===================================================================
    // CARREGAR DADOS PONTOS CORRIDOS (mantido)
    // ===================================================================
    async carregarDadosPontosCorridos() {
        if (!this.ligaId) {
            console.warn(
                "[FLUXO-CACHE] ⚠️ ligaId não disponível, pulando Pontos Corridos",
            );
            this.timesLiga = [];
            this.cacheFrontosPontosCorridos = [];
            return;
        }

        try {
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
                console.warn(
                    "[FLUXO-CACHE] ⚠️ Nenhum time encontrado para gerar confrontos",
                );
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

    // ===================================================================
    // ✅ CORRIGIDO v4.1: CARREGAR DADOS EXTERNOS (Mata-Mata, Melhor Mês)
    // Agora verifica se módulos estão ativos antes de carregar
    // ===================================================================
    async carregarDadosExternos() {
        console.log("[FLUXO-CACHE] Carregando dados externos...");

        // Carregar confrontos de Pontos Corridos
        if (!this.cacheConfrontosLPC || this.cacheConfrontosLPC.length === 0) {
            await this.carregarConfrontosLPC();
        }

        // ✅ CORREÇÃO v4.1: Só carregar Mata-Mata se módulo estiver ATIVO
        if (this.isModuloAtivo("mata-mata")) {
            // Invalidar cache do Mata-Mata se versão antiga
            const cacheKey = "mataMataFluxo_v2_invalidated";
            const cacheInvalidado = localStorage.getItem(cacheKey);
            if (!cacheInvalidado) {
                console.warn(
                    "[FLUXO-CACHE] 🔄 Invalidando cache de Mata-Mata (correção 5ª edição)",
                );
                localStorage.removeItem("mataMataFluxo");
                localStorage.setItem(cacheKey, "true");
            }

            // Carregar Mata-Mata
            try {
                const { getResultadosMataMataFluxo, setRankingFunction } =
                    await import("../mata-mata/mata-mata-financeiro.js");
                setRankingFunction(getRankingRodadaEspecifica);
                console.log(
                    "[FLUXO-CACHE] ✅ Dependência do Mata-Mata injetada",
                );

                const resultadosMataMataFluxo =
                    await getResultadosMataMataFluxo(this.ligaId);
                this.cacheResultadosMM =
                    this._processarResultadosMataMataCorrigido(
                        resultadosMataMataFluxo,
                    );
            } catch (error) {
                console.warn(
                    "[FLUXO-CACHE] Erro ao carregar Mata-Mata:",
                    error,
                );
                this.cacheResultadosMM = [];
            }
        } else {
            // ✅ Módulo desativado - não carregar e não logar erro
            console.log(
                "[FLUXO-CACHE] ℹ️ Mata-Mata desativado para esta liga - pulando",
            );
            this.cacheResultadosMM = [];
        }

        // ✅ CORREÇÃO v4.1: Só carregar Melhor Mês se módulo estiver ATIVO
        let resultadosMelhorMes = [];
        if (this.isModuloAtivo("melhor-mes")) {
            resultadosMelhorMes = this.ligaId
                ? await getResultadosMelhorMes(this.ligaId).catch(() => [])
                : [];
        } else {
            console.log(
                "[FLUXO-CACHE] ℹ️ Melhor Mês desativado para esta liga - pulando",
            );
        }

        this.cacheConfrontosLPC = this.cacheConfrontosLPC || [];
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
        console.log(
            `- Mata-Mata: ${this.cacheResultadosMM.length}${!this.isModuloAtivo("mata-mata") ? " (desativado)" : ""}`,
        );
        console.log(
            `- Melhor Mês: ${this.cacheResultadosMelhorMes.length}${!this.isModuloAtivo("melhor-mes") ? " (desativado)" : ""}`,
        );
    }

    async carregarConfrontosLPC() {
        try {
            this.cacheConfrontosLPC = await getConfrontosLigaPontosCorridos(
                this.ligaId,
            );
        } catch (error) {
            console.error(
                "[FLUXO-CACHE] Erro ao carregar confrontos LPC:",
                error,
            );
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
        const edicaoConfig = {
            1: { rodadaBase: 2 },
            2: { rodadaBase: 9 },
            3: { rodadaBase: 15 },
            4: { rodadaBase: 22 },
            5: { rodadaBase: 31 },
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

        if (edicao === 5 && fase === "final") return config.rodadaBase + 4;

        return config.rodadaBase + offset;
    }

    // ===================================================================
    // GETTERS (mantidos)
    // ===================================================================
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

    // ✅ NOVO: Getter para extrato cacheado
    getExtratoCacheado(timeId) {
        return this.extratosCacheados.get(String(timeId)) || null;
    }

    // ✅ NOVO: Getter para status do mercado
    getStatusMercado() {
        return this.statusMercado;
    }

    // ✅ NOVO v4.1: Getter para módulos ativos
    getModulosAtivos() {
        return { ...this.modulosAtivos };
    }

    debugCache() {
        const stats = {
            participantes: this.participantes?.length || 0,
            rankingsCarregados: Object.keys(this.cacheRankings).length,
            confrontosPontosCorridos:
                this.cacheFrontosPontosCorridos?.length || 0,
            resultadosMataMata: this.cacheResultadosMM?.length || 0,
            ultimaRodadaCompleta: this.ultimaRodadaCompleta,
            extratosCacheados: this.extratosCacheados.size,
            statusMercado: this.statusMercado,
            modulosAtivos: this.modulosAtivos,
        };

        console.log("[FLUXO-CACHE] Estado do cache:", stats);
        return stats;
    }
}

// ===================================================================
// FUNÇÕES AUXILIARES EXPORTADAS (compatibilidade)
// ===================================================================

function generateCacheKey(ligaId, participante = null) {
    if (participante) {
        return `${ligaId}-${participante.timeId}`;
    }
    return `${ligaId}-geral`;
}

export async function getCachedFluxoFinanceiro(ligaId, participante = null) {
    const key = generateCacheKey(ligaId, participante);
    const cached = cache.get(key);

    if (cached) {
        console.log("[FLUXO-CACHE] ⚡ Cache memória encontrado");
        return cached.data;
    }

    console.log("[FLUXO-CACHE] ⏱️ Nenhum cache em memória");
    return null;
}

export function setCachedFluxoFinanceiro(ligaId, data, participante = null) {
    const key = generateCacheKey(ligaId, participante);
    cache.set(key, {
        data: data,
        timestamp: ultimaAtualizacaoManual || Date.now(),
    });
    console.log("[FLUXO-CACHE] 💾 Dados armazenados em cache memória:", key);
}

export function invalidateCache(ligaId = null, participante = null) {
    if (!ligaId) {
        cache.clear();
        ultimaAtualizacaoManual = null;
        console.log("[FLUXO-CACHE] 🗑️ Todo cache limpo");
        return;
    }

    const key = generateCacheKey(ligaId, participante);
    cache.delete(key);
    console.log("[FLUXO-CACHE] 🗑️ Cache invalidado para:", key);
}

export function forceRefresh(ligaId, participante = null) {
    invalidateCache(ligaId, participante);
    ultimaAtualizacaoManual = Date.now();
    console.log("[FLUXO-CACHE] 🔄 Refresh manual acionado pelo usuário");
    return true;
}

// ✅ NOVO: Expor função para invalidar cache de time (chamada global)
window.invalidarCacheTime = async (ligaId, timeId) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
            { method: "DELETE" },
        );
        console.log(
            `[FLUXO-CACHE] 🗑️ Cache MongoDB invalidado para time ${timeId}`,
        );
        return response.ok;
    } catch (error) {
        console.error("[FLUXO-CACHE] Erro ao invalidar cache:", error);
        return false;
    }
};
