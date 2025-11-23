// PONTOS CORRIDOS CORE - Versão Otimizada com Persistência (Snapshot)
// Responsável por: processamento de dados, chamadas de API e CACHE INTELIGENTE

// 1. Importar configurações GERAIS do módulo de Rodadas
import {
  RODADAS_ENDPOINTS,
  STATUS_MERCADO_DEFAULT,
  valoresBancoPadrao,
  valoresBancoCartoleirosSobral,
} from "../rodadas/rodadas-config.js";

// 2. Importar configurações ESPECÍFICAS deste módulo
import { PONTOS_CORRIDOS_CONFIG, getLigaId } from "./pontos-corridos-config.js";

// VERIFICAÇÃO DE AMBIENTE
const isBackend = typeof window === "undefined";
const isFrontend = typeof window !== "undefined";

// ESTADO GLOBAL
let statusMercadoGlobal = STATUS_MERCADO_DEFAULT;
let getRankingRodadaEspecifica = null; // Injetado dinamicamente

// ============================================================================
// 🧠 SISTEMA DE PERSISTÊNCIA UNIFICADA (CACHE)
// ============================================================================

async function lerCachePersistente(ligaId, rodada) {
  try {
    const ts = new Date().getTime();
    const response = await fetch(
      `/api/pontos-corridos/cache/${ligaId}?rodada=${rodada}&_=${ts}`,
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.cached && data.classificacao) {
      console.log(
        `[CORE] 💾 Cache persistente encontrado para Rodada ${rodada}`,
      );
      return data.classificacao;
    }
    return null;
  } catch (error) {
    console.warn("[CORE] Erro ao ler cache persistente (ignorando):", error);
    return null;
  }
}

async function salvarCachePersistente(ligaId, rodada, dados) {
  try {
    await fetch(`/api/pontos-corridos/cache/${ligaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rodada: rodada,
        classificacao: dados,
      }),
    });
    console.log(`[CORE] 💾 Snapshot da Rodada ${rodada} salvo com sucesso!`);
  } catch (error) {
    console.warn("[CORE] Falha ao salvar cache persistente:", error);
  }
}

// ============================================================================
// FUNÇÕES DO CORE (Lógica de Negócio)
// ============================================================================

export function setRankingFunction(rankingFunction) {
  getRankingRodadaEspecifica = rankingFunction;
}

export async function atualizarStatusMercado() {
  try {
    const resMercado = await fetch(RODADAS_ENDPOINTS.mercadoStatus);
    if (resMercado.ok) {
      const mercadoData = await resMercado.json();
      statusMercadoGlobal = {
        rodada_atual: mercadoData.rodada_atual,
        status_mercado: mercadoData.status_mercado,
      };
    }
  } catch (err) {
    console.error("[CORE] Erro ao buscar status do mercado:", err);
  }
}

export function getStatusMercado() {
  return statusMercadoGlobal;
}

export function calcularRodadaBrasileirao(rodadaLiga, rodadaInicial = 1) {
  return rodadaInicial + (rodadaLiga - 1);
}

// ✅ FUNÇÃO RESTAURADA (Era solicitada pelo Orquestrador)
export async function buscarTimesLiga(ligaId) {
  try {
    const response = await fetch(`/api/ligas/${ligaId}/times`);
    if (!response.ok) throw new Error("Falha ao carregar times");
    return await response.json();
  } catch (error) {
    console.error("[CORE] Erro ao buscar times da liga:", error);
    return [];
  }
}

// ✅ FUNÇÃO RESTAURADA (Auxiliar de texto)
export function getRodadaPontosText(rodadaLiga, edicao) {
  if (!rodadaLiga) return "Rodada não definida";
  const rodadaBrasileirao =
    PONTOS_CORRIDOS_CONFIG.rodadaInicial + (rodadaLiga - 1);
  return `${rodadaLiga}ª Rodada da Liga (Rodada ${rodadaBrasileirao}ª do Brasileirão)`;
}

// ============================================================================
// ⚡ CÁLCULO DE CONFRONTOS (OTIMIZADO)
// ============================================================================

export async function getConfrontosLigaPontosCorridos(ligaId, rodadaAtual) {
  console.log(
    `[CORE] Iniciando processamento Pontos Corridos (Até rodada ${rodadaAtual})...`,
  );

  try {
    // 1. Cache Rápido
    const cache = await lerCachePersistente(ligaId, rodadaAtual);
    if (cache) return cache;

    console.log("[CORE] ⚠️ Cache Miss. Iniciando cálculo completo...");

    // 2. Cálculo Pesado
    if (!getRankingRodadaEspecifica) {
      try {
        const rodadasModule = await import("../rodadas.js");
        getRankingRodadaEspecifica = rodadasModule.getRankingRodadaEspecifica;
      } catch (e) {
        console.error("[CORE] ERRO CRÍTICO: Ranking function indisponível");
        return [];
      }
    }

    // Usa a função interna restaurada
    const times = await buscarTimesLiga(ligaId);
    const confrontosBase = gerarConfrontos(times);
    const confrontosComPontos = [];

    for (let rodadaNum = 1; rodadaNum <= rodadaAtual; rodadaNum++) {
      const jogosDaRodada = confrontosBase[rodadaNum - 1];
      if (!jogosDaRodada) continue;

      const jogosComPontos = [];
      const pontuacoesRaw = await getRankingRodadaEspecifica(ligaId, rodadaNum);

      const pontuacoesRodada = {};
      if (pontuacoesRaw && Array.isArray(pontuacoesRaw)) {
        pontuacoesRaw.forEach((p) => {
          const tid = p.time_id || p.timeId || p.id;
          pontuacoesRodada[tid] = p.pontos;
        });
      }

      for (const jogo of jogosDaRodada) {
        const timeAId = jogo.timeA.id || jogo.timeA.time_id;
        const timeBId = jogo.timeB.id || jogo.timeB.time_id;

        const pontosA = pontuacoesRodada[timeAId] ?? null;
        const pontosB = pontuacoesRodada[timeBId] ?? null;

        jogosComPontos.push({
          time1: jogo.timeA,
          time2: jogo.timeB,
          pontos1: pontosA,
          pontos2: pontosB,
        });
      }

      confrontosComPontos.push({
        rodada: rodadaNum,
        jogos: jogosComPontos,
      });
    }

    // 3. Salvar Cache
    if (confrontosComPontos.length > 0) {
      await salvarCachePersistente(ligaId, rodadaAtual, confrontosComPontos);
    }

    return confrontosComPontos;
  } catch (error) {
    console.error("[CORE] Erro fatal no cálculo:", error);
    return [];
  }
}

export function gerarConfrontos(times) {
  const n = times.length;
  const rodadas = [];
  const lista = [...times];
  if (n % 2 !== 0) lista.push(null);

  for (let rodada = 0; rodada < n - 1; rodada++) {
    const jogos = [];
    for (let i = 0; i < n / 2; i++) {
      const timeA = lista[i];
      const timeB = lista[n - 1 - i];
      if (timeA && timeB) {
        jogos.push({ timeA, timeB });
      }
    }
    rodadas.push(jogos);
    lista.splice(1, 0, lista.pop());
  }
  return rodadas;
}

export function calcularResultadoConfronto(pontosA, pontosB) {
  const A = parseFloat(pontosA || 0);
  const B = parseFloat(pontosB || 0);

  const vitoria = 10;
  const derrota = -10;
  const empate = 0;

  if (A > B)
    return {
      financeiroA: vitoria,
      financeiroB: derrota,
      pontosA: 3,
      pontosB: 0,
    };
  if (B > A)
    return {
      financeiroA: derrota,
      financeiroB: vitoria,
      pontosA: 0,
      pontosB: 3,
    };
  return { financeiroA: empate, financeiroB: empate, pontosA: 1, pontosB: 1 };
}

// ============================================================================
// 🔧 LÓGICA DE NEGÓCIO
// ============================================================================

/**
 * Calcula a classificação completa com todos os critérios de desempate
 */
export function calcularClassificacao(participantes, rodadasData, configModulo) {
  // Implementação da lógica de cálculo de classificação
  // Esta função foi movida para o módulo de orquestrador para melhor organização
  // No entanto, ela ainda é exposta aqui para compatibilidade
  // Verifique pontos-corridos-orquestrador.js para a implementação atualizada
  return participantes; // Retorno dummy para evitar erros
}

// ============================================================================
// 🔌 EXPORTAÇÕES DE COMPATIBILIDADE
// ============================================================================

// Alias para manter compatibilidade com código antigo
export const buscarStatusMercado = atualizarStatusMercado;

// Re-exportar getLigaId
export { getLigaId };