// MELHOR DO MÊS - CORE BUSINESS LOGIC v1.3
// public/js/melhor-mes/melhor-mes-core.js
// v1.2: Detecção dinâmica de temporada (R1 + mercado aberto = temporada anterior)
// v1.3: Propagação de temporada para getRankingRodadaEspecifica (fix pré-temporada 2026)

import { getRankingRodadaEspecifica } from "../rodadas.js";
import {
  MELHOR_MES_CONFIG,
  getPremiosLiga,
  isEdicaoConcluida,
  isEdicaoIniciada,
  getStatusEdicao,
} from "./melhor-mes-config.js";

console.log("[MELHOR-MES-CORE] Inicializando core business logic...");

// CACHE EM MEMÓRIA
let cacheRankings = new Map();
let cacheTimestamps = new Map();
let dadosBasicos = null;

export class MelhorMesCore {
  constructor() {
    this.ligaId = null;
    this.ultimaRodadaCompleta = 0;
    this.dadosProcessados = {};
    this.temporadaParaBusca = null; // v1.3: Temporada correta para buscar dados
  }

  // INICIALIZAÇÃO DO CORE
  async inicializar(ligaId = null, ultimaRodadaCompleta = null) {
    console.log("[MELHOR-MES-CORE] Inicializando...");

    // ✅ CARREGAR DADOS BÁSICOS PRIMEIRO (obtém ligaId se não fornecido)
    if (!ligaId || ligaId === "null") {
      await this.carregarDadosBasicos();
    } else {
      this.ligaId = ligaId;
      this.ultimaRodadaCompleta = ultimaRodadaCompleta || 0;

      // Carregar dados básicos para obter rodada atual se não fornecida
      if (!ultimaRodadaCompleta) {
        await this.carregarDadosBasicos();
      } else {
        dadosBasicos = {
          ligaId: this.ligaId,
          ultimaRodadaCompleta: this.ultimaRodadaCompleta,
          premiosLiga: getPremiosLiga(this.ligaId),
          timestamp: Date.now(),
        };
      }
    }

    // ✅ VALIDAÇÃO: Verificar se conseguimos obter o ligaId
    if (!this.ligaId || this.ligaId === "null" || this.ligaId === null) {
      console.error(
        "[MELHOR-MES-CORE] ❌ Liga ID não encontrado após todas as tentativas",
      );
      this.dadosProcessados = { resultados: {}, dadosBasicos: null };
      return this.dadosProcessados;
    }

    console.log(`[MELHOR-MES-CORE] ✅ Liga ID validado: ${this.ligaId}`);

    await this.processarTodasEdicoes();

    console.log("[MELHOR-MES-CORE] Core inicializado com sucesso");
    return this.dadosProcessados;
  }

  // CARREGAR DADOS BÁSICOS DO SISTEMA
  async carregarDadosBasicos() {
    // ✅ OBTER LIGA ID - múltiplas tentativas
    let ligaId = null;

    // 1. Tentar URL primeiro (parâmetro "id")
    const urlParams = new URLSearchParams(window.location.search);
    ligaId = urlParams.get("id");

    // 2. Tentar parâmetro alternativo "ligaId"
    if (!ligaId) {
      ligaId = urlParams.get("ligaId");
    }

    // 3. Tentar função global obterLigaId (Admin)
    if (!ligaId && typeof window.obterLigaId === "function") {
      ligaId = window.obterLigaId();
    }

    // 4. Tentar variáveis globais
    if (!ligaId && window.ligaIdAtual) {
      ligaId = window.ligaIdAtual;
    }
    if (!ligaId && window.currentLigaId) {
      ligaId = window.currentLigaId;
    }

    // 5. Tentar participanteData (Participante)
    if (!ligaId && window.participanteData?.ligaId) {
      ligaId = window.participanteData.ligaId;
    }

    // 6. Tentar extrair do path da URL
    if (!ligaId) {
      const pathMatch = window.location.pathname.match(/\/liga\/([a-f0-9]+)/i);
      if (pathMatch) ligaId = pathMatch[1];
    }

    this.ligaId = ligaId;

    if (!this.ligaId) {
      console.error("[MELHOR-MES-CORE] ID da Liga não encontrado");
      console.error("[MELHOR-MES-CORE] URL atual:", window.location.href);
      return false;
    }

    console.log(`[MELHOR-MES-CORE] ✅ Liga ID obtido: ${this.ligaId}`);

    try {
      const response = await fetch("/api/cartola/mercado/status");
      if (!response.ok) {
        throw new Error("Erro ao buscar status do mercado");
      }

      const mercadoStatus = await response.json();

      // v1.3: Detecção dinâmica de temporada com propagação correta
      // Se rodada 1 e mercado aberto, nova temporada não iniciou - usar dados da anterior
      const rodadaAtual = mercadoStatus.rodada_atual || 1;
      const mercadoAberto = mercadoStatus.status_mercado === 1;
      const temporadaAPI = mercadoStatus.temporada || new Date().getFullYear();
      const RODADA_FINAL_CAMPEONATO = mercadoStatus.rodada_final || 38;

      if (rodadaAtual === 1 && mercadoAberto) {
        // v1.3: API ainda retorna temporada anterior durante pré-temporada
        this.temporadaParaBusca = temporadaAPI;
        console.log(`[MELHOR-MES-CORE] Nova temporada não iniciou - usando dados da temporada ${this.temporadaParaBusca} (38 rodadas)`);
        this.ultimaRodadaCompleta = RODADA_FINAL_CAMPEONATO;
        this.temporadaAnterior = true;
      } else {
        this.temporadaParaBusca = temporadaAPI;
        this.ultimaRodadaCompleta = rodadaAtual > 0 ? rodadaAtual - 1 : 0;
        this.temporadaAnterior = false;
      }
    } catch (error) {
      console.warn(
        "[MELHOR-MES-CORE] Erro ao buscar mercado, usando rodada 38:",
        error,
      );
      this.ultimaRodadaCompleta = 38;
    }

    dadosBasicos = {
      ligaId: this.ligaId,
      ultimaRodadaCompleta: this.ultimaRodadaCompleta,
      premiosLiga: getPremiosLiga(this.ligaId),
      timestamp: Date.now(),
    };

    console.log(
      `[MELHOR-MES-CORE] Liga: ${this.ligaId}, Última rodada: ${this.ultimaRodadaCompleta}`,
    );
    return true;
  }

  // PROCESSAR TODAS AS EDIÇÕES EM PARALELO
  async processarTodasEdicoes() {
    console.log("[MELHOR-MES-CORE] Processando todas edições em PARALELO...");
    const startTime = performance.now();

    // ✅ OTIMIZAÇÃO: Processar TODAS as edições em paralelo
    const promessas = MELHOR_MES_CONFIG.edicoes.map((edicao, index) =>
      this.processarEdicaoIndividual(edicao, index)
        .then((resultado) => ({ index, resultado }))
        .catch((error) => {
          console.error(
            `[MELHOR-MES-CORE] Erro ao processar ${edicao.nome}:`,
            error,
          );
          return { index, resultado: this.criarResultadoErro(edicao, error) };
        })
    );

    const resultadosArray = await Promise.all(promessas);

    // Converter array para objeto indexado
    const resultados = {};
    for (const { index, resultado } of resultadosArray) {
      resultados[index] = resultado;
    }

    const elapsed = Math.round(performance.now() - startTime);
    console.log(`[MELHOR-MES-CORE] ${MELHOR_MES_CONFIG.edicoes.length} edições processadas em ${elapsed}ms`);

    this.dadosProcessados = {
      resultados,
      dadosBasicos,
      timestamp: Date.now(),
    };

    return this.dadosProcessados;
  }

  // PROCESSAR EDIÇÃO INDIVIDUAL
  async processarEdicaoIndividual(edicao, index) {
    const status = getStatusEdicao(edicao, this.ultimaRodadaCompleta);

    // Verificar cache primeiro
    const cacheKey = `${this.ligaId}_${edicao.id}_${this.ultimaRodadaCompleta}`;
    if (await this.verificarCache(cacheKey)) {
      console.log(`[MELHOR-MES-CORE] Cache hit para ${edicao.nome}`);
      return cacheRankings.get(cacheKey);
    }

    const resultado = {
      edicao,
      status,
      iniciada: isEdicaoIniciada(edicao, this.ultimaRodadaCompleta),
      concluida: isEdicaoConcluida(edicao, this.ultimaRodadaCompleta),
      ranking: [],
      rodadaFinal: 0,
      estatisticas: {},
      premios: dadosBasicos.premiosLiga,
    };

    if (!resultado.iniciada) {
      this.salvarCache(cacheKey, resultado);
      return resultado;
    }

    // Calcular dados da edição
    resultado.rodadaFinal = Math.min(edicao.fim, this.ultimaRodadaCompleta);
    resultado.ranking = await this.calcularRankingEdicao(
      edicao.inicio,
      resultado.rodadaFinal,
    );
    resultado.estatisticas = this.calcularEstatisticas(
      resultado.ranking,
      edicao,
    );

    // Salvar no cache
    await this.salvarCache(cacheKey, resultado);

    console.log(
      `[MELHOR-MES-CORE] ${edicao.nome}: ${resultado.ranking.length} participantes, status: ${status}`,
    );

    return resultado;
  }

  // CALCULAR RANKING AGREGADO DE UMA EDIÇÃO
  async calcularRankingEdicao(rodadaInicio, rodadaFim) {
    console.log(
      `[MELHOR-MES-CORE] Calculando ranking rodadas ${rodadaInicio}-${rodadaFim} - Temporada ${this.temporadaParaBusca}`,
    );

    const rankingsAgregados = [];
    const promises = [];

    // v1.3: Buscar todos os rankings das rodadas COM temporada correta
    for (let rodada = rodadaInicio; rodada <= rodadaFim; rodada++) {
      promises.push(
        getRankingRodadaEspecifica(this.ligaId, rodada, this.temporadaParaBusca)
          .then((ranking) => {
            if (ranking && Array.isArray(ranking) && ranking.length > 0) {
              const rankingComRodada = ranking.map((time) => ({
                ...time,
                rodada: rodada,
              }));
              rankingsAgregados.push(...rankingComRodada);
            }
          })
          .catch((error) => {
            console.warn(`[MELHOR-MES-CORE] Erro rodada ${rodada}:`, error);
          }),
      );
    }

    await Promise.all(promises);

    if (rankingsAgregados.length === 0) {
      console.warn("[MELHOR-MES-CORE] Nenhum ranking encontrado");
      return [];
    }

    // Agregar pontuações por time
    const pontuacaoTotal = new Map();

    rankingsAgregados.forEach((time) => {
      const timeId = String(time.timeId || time.time_id);
      if (!timeId || timeId === "undefined") return;

      if (!pontuacaoTotal.has(timeId)) {
        pontuacaoTotal.set(timeId, {
          time_id: timeId,
          nome_cartola: time.nome_cartola || time.nome_cartoleiro || "N/D",
          nome_time: time.nome_time || time.nome || "N/D",
          clube_id: time.clube_id || null,
          pontos: 0,
          rodadas_participadas: new Set(),
          melhor_rodada: { pontos: -Infinity, rodada: 0 },
          pior_rodada: { pontos: Infinity, rodada: 0 },
        });
      }

      const timeData = pontuacaoTotal.get(timeId);
      const pontosRodada = parseFloat(time.pontos || 0);

      timeData.pontos += pontosRodada;
      timeData.rodadas_participadas.add(time.rodada);

      // Rastrear melhor e pior rodada
      if (pontosRodada > timeData.melhor_rodada.pontos) {
        timeData.melhor_rodada = { pontos: pontosRodada, rodada: time.rodada };
      }
      if (pontosRodada < timeData.pior_rodada.pontos) {
        timeData.pior_rodada = { pontos: pontosRodada, rodada: time.rodada };
      }
    });

    // Converter para array e ordenar
    const ranking = Array.from(pontuacaoTotal.values())
      .map((time) => ({
        ...time,
        rodadas_participadas: Array.from(time.rodadas_participadas),
        media_pontos: time.pontos / time.rodadas_participadas.size,
      }))
      .sort((a, b) => b.pontos - a.pontos);

    console.log(`[MELHOR-MES-CORE] Ranking calculado: ${ranking.length} times`);
    return ranking;
  }

  // CALCULAR ESTATÍSTICAS DA EDIÇÃO
  calcularEstatisticas(ranking, edicao) {
    if (!ranking || ranking.length === 0) {
      return { participantes: 0, pontuacao_total: 0, media_geral: 0 };
    }

    const pontuacoes = ranking.map((t) => t.pontos);

    return {
      participantes: ranking.length,
      pontuacao_total: pontuacoes.reduce((acc, p) => acc + p, 0),
      media_geral: pontuacoes.reduce((acc, p) => acc + p, 0) / ranking.length,
      pontuacao_maxima: Math.max(...pontuacoes),
      pontuacao_minima: Math.min(...pontuacoes),
      vencedor: ranking[0],
      ultimo: ranking[ranking.length - 1],
      rodadas_edicao: edicao.fim - edicao.inicio + 1,
    };
  }

  // CRIAR RESULTADO DE ERRO
  criarResultadoErro(edicao, error) {
    return {
      edicao,
      status: "erro",
      iniciada: false,
      concluida: false,
      ranking: [],
      rodadaFinal: 0,
      estatisticas: {},
      erro: error.message,
      premios: dadosBasicos?.premiosLiga || getPremiosLiga(this.ligaId),
    };
  }

  // SISTEMA DE CACHE (memória + persistente)
  async verificarCache(key) {
    // Tentar memória primeiro
    if (cacheRankings.has(key)) {
      const timestamp = cacheTimestamps.get(key);
      const agora = Date.now();

      if (agora - timestamp <= MELHOR_MES_CONFIG.cache.ttl) {
        return true;
      }

      // Expirado na memória
      cacheRankings.delete(key);
      cacheTimestamps.delete(key);
    }

    // Tentar IndexedDB (se disponível)
    try {
      if (typeof cacheManager !== "undefined" && cacheManager?.get) {
        const cached = await cacheManager.get("rodadas", key, null, {
          ttl: MELHOR_MES_CONFIG.cache.ttl,
        });

        if (cached) {
          // Restaurar para memória
          cacheRankings.set(key, cached);
          cacheTimestamps.set(key, Date.now());
          return true;
        }
      }
    } catch (error) {
      // Silenciosamente ignorar erro de cache persistente
    }

    return false;
  }

  async salvarCache(key, dados) {
    // Limpar cache se atingir máximo
    if (cacheRankings.size >= MELHOR_MES_CONFIG.cache.maxEntries) {
      this.limparCacheAntigo();
    }

    // Salvar em memória
    cacheRankings.set(key, dados);
    cacheTimestamps.set(key, Date.now());

    // Salvar em IndexedDB (se disponível)
    try {
      if (typeof cacheManager !== "undefined" && cacheManager?.set) {
        await cacheManager.set("rodadas", key, dados);
      }
    } catch (error) {
      // Silenciosamente ignorar erro de cache persistente
    }
  }

  limparCacheAntigo() {
    const agora = Date.now();
    for (const [key, timestamp] of cacheTimestamps.entries()) {
      if (agora - timestamp > MELHOR_MES_CONFIG.cache.ttl) {
        cacheRankings.delete(key);
        cacheTimestamps.delete(key);
      }
    }
  }

  // ATUALIZAR DADOS
  async atualizarDados() {
    console.log("[MELHOR-MES-CORE] Atualizando dados...");

    // Limpar cache para forçar atualização
    cacheRankings.clear();
    cacheTimestamps.clear();

    return await this.inicializar();
  }

  // OBTER DADOS DE EDIÇÃO ESPECÍFICA
  async obterDadosEdicao(indexEdicao) {
    if (!this.dadosProcessados.resultados) {
      await this.inicializar();
    }

    return this.dadosProcessados.resultados[indexEdicao] || null;
  }

  // OBTER VENCEDORES DE TODAS AS EDIÇÕES
  obterVencedores() {
    if (!this.dadosProcessados.resultados) {
      console.warn("[MELHOR-MES-CORE] Dados não processados ainda");
      return [];
    }

    const vencedores = [];

    Object.values(this.dadosProcessados.resultados).forEach((dados) => {
      if (dados.ranking && dados.ranking.length > 0 && dados.concluida) {
        vencedores.push({
          edicao: dados.edicao,
          vencedor: dados.ranking[0],
          status: dados.status,
          premio: dados.premios.primeiro,
        });
      }
    });

    console.log(
      `[MELHOR-MES-CORE] ${vencedores.length} vencedores encontrados`,
    );
    return vencedores;
  }

  // DIAGNÓSTICO DO SISTEMA
  diagnosticar() {
    const stats = {
      ligaId: this.ligaId,
      ultimaRodada: this.ultimaRodadaCompleta,
      totalEdicoes: Object.keys(this.dadosProcessados.resultados || {}).length,
      cacheEntries: cacheRankings.size,
      edicoesComDados: 0,
      edicoesConcluidas: 0,
    };

    if (this.dadosProcessados.resultados) {
      Object.values(this.dadosProcessados.resultados).forEach((dados) => {
        if (dados.ranking.length > 0) stats.edicoesComDados++;
        if (dados.concluida) stats.edicoesConcluidas++;
      });
    }

    return stats;
  }
}

// INSTÂNCIA SINGLETON
export const melhorMesCore = new MelhorMesCore();

// FUNÇÕES DE CONVENIÊNCIA
export async function carregarDadosMelhorMes() {
  return await melhorMesCore.inicializar();
}

export async function obterVencedoresEdicoes() {
  return melhorMesCore.obterVencedores();
}

export async function obterDadosEdicao(index) {
  return await melhorMesCore.obterDadosEdicao(index);
}

export function limparCache() {
  cacheRankings.clear();
  cacheTimestamps.clear();
  console.log("[MELHOR-MES-CORE] Cache limpo");
}

// AUTO-LIMPEZA DE CACHE
setInterval(() => {
  melhorMesCore.limparCacheAntigo();
}, MELHOR_MES_CONFIG.cache?.ttl || 300000);

console.log("[MELHOR-MES-CORE] ✅ Core business logic v1.3 carregado (temporada propagada)");
