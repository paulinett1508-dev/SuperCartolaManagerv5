// RODADAS CORE - Lógica de Negócio e API Calls
// ✅ VERSÃO 4.0 - OTIMIZADO COM BATCH LOADING
// Responsável por: processamento de dados, chamadas de API, cálculos

import {
  RODADAS_ENDPOINTS,
  STATUS_MERCADO_DEFAULT,
  LIGAS_CONFIG,
  valoresBancoPadrao,
  valoresBancoCartoleirosSobral,
  TIMEOUTS_CONFIG,
} from "./rodadas-config.js";

// VERIFICAÇÃO DE AMBIENTE
const isBackend = typeof window === "undefined";
const isFrontend = typeof window !== "undefined";

// ESTADO GLOBAL DO MÓDULO
let statusMercadoGlobal = STATUS_MERCADO_DEFAULT;

// ✅ NOVO: CACHE DE RANKINGS EM MEMÓRIA (evita rebusca)
const cacheRankingsLote = new Map(); // ligaId -> { rodadas: {1: [...], 2: [...], ...}, timestamp }
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

// ==============================
// FUNÇÕES DE STATUS DO MERCADO
// ==============================

export async function atualizarStatusMercado() {
  try {
    const resMercado = await fetch(RODADAS_ENDPOINTS.mercadoStatus);
    if (resMercado.ok) {
      const mercadoData = await resMercado.json();
      statusMercadoGlobal = {
        rodada_atual: mercadoData.rodada_atual,
        status_mercado: mercadoData.status_mercado,
      };
    } else {
      console.warn("[RODADAS-CORE] Não foi possível buscar status do mercado.");
    }
  } catch (err) {
    console.error("[RODADAS-CORE] Erro ao buscar status do mercado:", err);
  }
}

export function getStatusMercado() {
  return statusMercadoGlobal;
}

// ==============================
// ✅ NOVO: BATCH LOADING DE RANKINGS
// ==============================

/**
 * ✅ BUSCA TODAS AS RODADAS EM UMA ÚNICA REQUISIÇÃO
 * @param {string} ligaId - ID da liga
 * @param {number} rodadaInicio - Rodada inicial (default: 1)
 * @param {number} rodadaFim - Rodada final (default: 38)
 * @param {boolean} forcarRecarga - Ignorar cache e buscar novamente
 * @returns {Object} - { 1: [...rankings], 2: [...rankings], ... }
 */
export async function getRankingsEmLote(
  ligaId,
  rodadaInicio = 1,
  rodadaFim = 38,
  forcarRecarga = false,
) {
  const ligaIdNormalizado = String(ligaId);

  // ✅ VERIFICAR CACHE EM MEMÓRIA
  if (!forcarRecarga && cacheRankingsLote.has(ligaIdNormalizado)) {
    const cached = cacheRankingsLote.get(ligaIdNormalizado);
    const idade = Date.now() - cached.timestamp;

    if (idade < CACHE_TTL) {
      console.log(
        `[RODADAS-CORE] ⚡ Cache hit! ${Object.keys(cached.rodadas).length} rodadas em memória`,
      );
      return cached.rodadas;
    }
  }

  console.log(
    `[RODADAS-CORE] 🚀 Buscando rodadas ${rodadaInicio}-${rodadaFim} em LOTE (1 requisição)...`,
  );

  try {
    let fetchFunc = isBackend ? (await import("node-fetch")).default : fetch;
    const baseUrl = isBackend ? "http://localhost:3000" : "";

    const url = `${baseUrl}/api/rodadas/${ligaIdNormalizado}/rodadas?inicio=${rodadaInicio}&fim=${rodadaFim}`;
    const response = await fetchFunc(url);

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao buscar rodadas em lote`);
    }

    const todosRankings = await response.json();

    console.log(
      `[RODADAS-CORE] ✅ ${todosRankings.length} registros carregados em 1 requisição`,
    );

    // ✅ AGRUPAR POR RODADA
    const rodadasAgrupadas = {};

    todosRankings.forEach((ranking) => {
      const rodadaNum = parseInt(ranking.rodada);
      if (!rodadasAgrupadas[rodadaNum]) {
        rodadasAgrupadas[rodadaNum] = [];
      }

      // Normalizar IDs
      const timeId = String(ranking.time_id || ranking.timeId || ranking.id);
      rodadasAgrupadas[rodadaNum].push({
        ...ranking,
        time_id: timeId,
        timeId: timeId,
        id: timeId,
      });
    });

    // ✅ ORDENAR CADA RODADA POR PONTOS
    Object.keys(rodadasAgrupadas).forEach((rodada) => {
      rodadasAgrupadas[rodada].sort(
        (a, b) => parseFloat(b.pontos || 0) - parseFloat(a.pontos || 0),
      );
    });

    // ✅ SALVAR NO CACHE COM LIGAID NORMALIZADO
    cacheRankingsLote.set(ligaIdNormalizado, {
      rodadas: rodadasAgrupadas,
      timestamp: Date.now(),
    });

    console.log(
      `[RODADAS-CORE] 💾 Cache atualizado: ${Object.keys(rodadasAgrupadas).length} rodadas para liga ${ligaIdNormalizado}`,
    );

    return rodadasAgrupadas;
  } catch (err) {
    console.error("[RODADAS-CORE] ❌ Erro ao buscar rodadas em lote:", err);
    throw err;
  }
}

/**
 * ✅ BUSCA UMA RODADA ESPECÍFICA (usa cache do lote se disponível)
 * @param {string} ligaId - ID da liga
 * @param {number} rodadaNum - Número da rodada
 * @returns {Array} - Rankings da rodada
 */
export async function getRankingRodadaEspecifica(ligaId, rodadaNum) {
  const ligaIdNormalizado = String(ligaId);

  // ✅ PRIMEIRO: Verificar se já temos no cache do lote
  if (cacheRankingsLote.has(ligaIdNormalizado)) {
    const cached = cacheRankingsLote.get(ligaIdNormalizado);
    const idade = Date.now() - cached.timestamp;

    if (idade < CACHE_TTL && cached.rodadas[rodadaNum]) {
      // Cache válido - retornar direto! (sem log para não poluir)
      return cached.rodadas[rodadaNum];
    }
  }

  // ✅ FALLBACK: Buscar individualmente se não estiver em cache
  console.log(
    `[RODADAS-CORE] ⚠️ Cache miss para rodada ${rodadaNum} (liga: ${ligaIdNormalizado}) - buscando individual`,
  );
  console.log(
    `[RODADAS-CORE] 📊 Cache status: has=${cacheRankingsLote.has(ligaIdNormalizado)}, keys=[${Array.from(cacheRankingsLote.keys()).join(", ")}]`,
  );
  return await fetchAndProcessRankingRodada(ligaId, rodadaNum);
}

/**
 * ✅ PRÉ-CARREGAR TODAS AS RODADAS (chamado uma vez na inicialização)
 * @param {string} ligaId - ID da liga
 * @param {number} ultimaRodada - Última rodada a carregar
 */
export async function preCarregarRodadas(ligaId, ultimaRodada = 38) {
  console.log(`[RODADAS-CORE] 📦 Pré-carregando rodadas 1-${ultimaRodada}...`);

  try {
    await getRankingsEmLote(ligaId, 1, ultimaRodada, false);
    console.log(`[RODADAS-CORE] ✅ Pré-carregamento concluído`);
    return true;
  } catch (err) {
    console.error(`[RODADAS-CORE] ❌ Erro no pré-carregamento:`, err);
    return false;
  }
}

/**
 * ✅ LIMPAR CACHE DE RANKINGS
 * @param {string} ligaId - ID da liga (opcional, se não passar limpa tudo)
 */
export function limparCacheRankings(ligaId = null) {
  if (ligaId) {
    cacheRankingsLote.delete(ligaId);
    console.log(`[RODADAS-CORE] 🗑️ Cache limpo para liga ${ligaId}`);
  } else {
    cacheRankingsLote.clear();
    console.log(`[RODADAS-CORE] 🗑️ Todo cache de rankings limpo`);
  }
}

// ==============================
// FUNÇÕES DE API E PROCESSAMENTO (mantidas para fallback)
// ==============================

export async function fetchAndProcessRankingRodada(ligaId, rodadaNum) {
  try {
    let fetchFunc;
    if (isBackend) {
      fetchFunc = (await import("node-fetch")).default;
    } else {
      fetchFunc = fetch;
    }

    const baseUrl = isBackend ? "http://localhost:3000" : "";
    const endpoints = RODADAS_ENDPOINTS.getEndpoints(
      ligaId,
      rodadaNum,
      baseUrl,
    );

    let rankingsDataFromApi = null;
    let lastError = null;

    // Tentar endpoints até encontrar dados
    for (const endpoint of endpoints) {
      try {
        console.log(`[RODADAS-CORE] Tentando endpoint: ${endpoint}`);
        const resRodadas = await fetchFunc(endpoint);

        if (!resRodadas.ok) {
          console.warn(
            `[RODADAS-CORE] Endpoint ${endpoint} retornou ${resRodadas.status}`,
          );
          continue;
        }

        const data = await resRodadas.json();

        if (
          data &&
          (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)
        ) {
          rankingsDataFromApi = data;
          console.log(
            `[RODADAS-CORE] Dados encontrados no endpoint: ${endpoint}`,
          );
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(
          `[RODADAS-CORE] Erro no endpoint ${endpoint}:`,
          err.message,
        );
        continue;
      }
    }

    if (!rankingsDataFromApi) {
      let rodadaAtualReal = 1;
      try {
        const mercadoStatus = await fetch("/api/cartola/mercado/status").then(
          (r) => r.json(),
        );
        rodadaAtualReal = mercadoStatus.rodada_atual || 1;
      } catch (err) {
        console.warn("[RODADAS-CORE] Erro ao buscar status do mercado:", err);
      }

      if (rodadaNum > rodadaAtualReal) {
        console.log(
          `[RODADAS-CORE] Rodada ${rodadaNum} é futura (atual: ${rodadaAtualReal})`,
        );
        return [];
      } else if (
        rodadaNum === rodadaAtualReal &&
        statusMercadoGlobal.status_mercado === 1
      ) {
        console.log(
          `[RODADAS-CORE] Rodada ${rodadaNum} está em andamento - mercado aberto`,
        );
        return [];
      } else {
        console.error(
          `[RODADAS-CORE] Nenhum endpoint retornou dados para rodada ${rodadaNum}`,
        );
        throw (
          lastError ||
          new Error(
            `Dados não encontrados para rodada ${rodadaNum} em nenhum endpoint`,
          )
        );
      }
    }

    const dataArray = Array.isArray(rankingsDataFromApi)
      ? rankingsDataFromApi
      : [rankingsDataFromApi];

    if (dataArray.length === 0) {
      console.warn(
        `[RODADAS-CORE] Dados vazios confirmados para rodada ${rodadaNum}`,
      );
      return [];
    }

    const rankingsDaRodada = dataArray.filter((rank) => {
      if (!rank || typeof rank !== "object") return false;
      if (!rank.hasOwnProperty("rodada")) return false;
      return parseInt(rank.rodada) === parseInt(rodadaNum);
    });

    if (rankingsDaRodada.length === 0) {
      console.warn(
        `[RODADAS-CORE] ⚠️ Rodada ${rodadaNum}: ${dataArray.length} dados brutos, 0 após filtro`,
      );
    }

    rankingsDaRodada.sort(
      (a, b) => parseFloat(b.pontos || 0) - parseFloat(a.pontos || 0),
    );

    return rankingsDaRodada;
  } catch (err) {
    console.error(
      `[RODADAS-CORE] Erro crítico em fetchAndProcessRankingRodada(${rodadaNum}):`,
      err,
    );

    const { rodada_atual } = statusMercadoGlobal;
    if (rodadaNum <= rodada_atual) {
      throw new Error(
        `Falha ao carregar dados da rodada ${rodadaNum}: ${err.message}`,
      );
    } else {
      return [];
    }
  }
}

// ==============================
// FUNÇÕES AUXILIARES PARA LIGAS
// ==============================

export async function buscarLiga(ligaId) {
  try {
    let fetchFunc = isBackend ? (await import("node-fetch")).default : fetch;
    const baseUrl = isBackend ? "http://localhost:3000" : "";
    const res = await fetchFunc(RODADAS_ENDPOINTS.liga(ligaId, baseUrl));
    if (!res.ok) throw new Error(`Erro ${res.status} ao buscar liga`);
    return await res.json();
  } catch (err) {
    console.error("[RODADAS-CORE] Erro em buscarLiga:", err);
    return null;
  }
}

export async function buscarPontuacoesParciais() {
  try {
    let fetchFunc = isBackend ? (await import("node-fetch")).default : fetch;
    const baseUrl = isBackend ? "http://localhost:3000" : "";
    const res = await fetchFunc(
      `${baseUrl}${RODADAS_ENDPOINTS.pontuacoesParciais}`,
    );
    if (!res.ok) throw new Error(`Erro ${res.status} ao buscar parciais`);
    const data = await res.json();
    return data.atletas || {};
  } catch (err) {
    console.error("[RODADAS-CORE] Erro em buscarPontuacoesParciais:", err);
    return {};
  }
}

// ==============================
// CÁLCULO DE PONTOS PARCIAIS
// ==============================

export async function calcularPontosParciais(liga, rodada) {
  const atletasPontuados = await buscarPontuacoesParciais();
  const times = liga.times || [];
  const rankingsParciais = [];

  console.log(`[RODADAS-CORE] Calculando parciais para ${times.length} times`);

  for (const time of times) {
    try {
      const timeId = typeof time === "number" ? time : time.time_id || time.id;

      if (!timeId) {
        console.warn("[RODADAS-CORE] Time sem ID encontrado:", time);
        continue;
      }

      let fetchFunc = isBackend ? (await import("node-fetch")).default : fetch;
      const baseUrl = isBackend ? "http://localhost:3000" : "";

      let timeCompleto = null;
      try {
        const resTimeInfo = await fetchFunc(`${baseUrl}/api/time/${timeId}`);
        if (resTimeInfo.ok) {
          timeCompleto = await resTimeInfo.json();
        }
      } catch (errInfo) {
        console.warn(
          `[RODADAS-CORE] Erro ao buscar dados do time ${timeId}:`,
          errInfo.message,
        );
      }

      const resTime = await fetchFunc(
        RODADAS_ENDPOINTS.timeEscalacao(timeId, rodada, baseUrl),
      );

      if (!resTime.ok) {
        console.warn(
          `[RODADAS-CORE] Erro ${resTime.status} ao buscar escalação do time ${timeId} para rodada ${rodada}`,
        );
        continue;
      }

      const escalacaoData = await resTime.json();
      const atletasEscalados = escalacaoData.atletas || [];
      const capitaoId = escalacaoData.capitao_id;

      let totalPontos = 0;
      atletasEscalados.forEach((atleta) => {
        const pontuacaoAtleta =
          atletasPontuados[atleta.atleta_id]?.pontuacao || 0;
        if (atleta.atleta_id === capitaoId) {
          totalPontos += pontuacaoAtleta * 1.5;
        } else {
          totalPontos += pontuacaoAtleta;
        }
      });

      const nomeCartola =
        timeCompleto?.nome_cartoleiro ||
        timeCompleto?.cartola ||
        escalacaoData.time?.nome_cartola ||
        "N/D";
      const nomeTime =
        timeCompleto?.nome_time ||
        timeCompleto?.nome ||
        escalacaoData.time?.nome ||
        "N/D";
      const clubeId =
        timeCompleto?.clube_id || escalacaoData.time?.clube_id || null;

      rankingsParciais.push({
        time_id: timeId,
        nome_cartola: nomeCartola,
        nome_time: nomeTime,
        clube_id: clubeId,
        escudo_url:
          escalacaoData.url_escudo_png || escalacaoData.url_escudo_svg || "",
        totalPontos: totalPontos,
      });
    } catch (err) {
      console.error(
        `[RODADAS-CORE] Erro ao processar parciais para o time:`,
        err,
      );
    }
  }

  console.log(
    `[RODADAS-CORE] ${rankingsParciais.length} times processados com parciais`,
  );
  return rankingsParciais;
}

// ==============================
// FUNÇÕES DE UTILIDADE
// ==============================

export function getBancoPorLiga(ligaId) {
  const isLigaCartoleirosSobral = ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL;
  return isLigaCartoleirosSobral
    ? valoresBancoCartoleirosSobral
    : valoresBancoPadrao;
}

export async function buscarRodadas() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const ligaId = urlParams.get("id");

    if (!ligaId) {
      console.error("[RODADAS-CORE] ID da liga não encontrado na URL");
      return [];
    }

    console.log(`[RODADAS-CORE] Buscando rodadas para liga: ${ligaId}`);
    const response = await fetch(
      `/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`,
    );

    if (!response.ok) {
      console.error(
        `[RODADAS-CORE] Erro HTTP: ${response.status} - ${response.statusText}`,
      );
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const rodadas = await response.json();
    console.log(
      `[RODADAS-CORE] Rodadas recebidas: ${rodadas.length} registros`,
    );

    if (rodadas.length > 0) {
      console.log("[RODADAS-CORE] Primeira rodada:", rodadas[0]);
      console.log("[RODADAS-CORE] Última rodada:", rodadas[rodadas.length - 1]);

      const rodadasAgrupadas = {};
      rodadas.forEach((r) => {
        if (!rodadasAgrupadas[r.rodada]) {
          rodadasAgrupadas[r.rodada] = 0;
        }
        rodadasAgrupadas[r.rodada]++;
      });
      console.log("[RODADAS-CORE] Rodadas por número:", rodadasAgrupadas);
    } else {
      console.warn(
        "[RODADAS-CORE] Nenhuma rodada encontrada no banco de dados",
      );
    }

    return rodadas;
  } catch (error) {
    console.error("[RODADAS-CORE] Erro ao buscar rodadas:", error);
    return [];
  }
}

export function agruparRodadasPorNumero(rodadas) {
  if (!rodadas) return {};
  const grouped = {};
  rodadas.forEach((rodada) => {
    if (!grouped[rodada.rodada]) {
      grouped[rodada.rodada] = [];
    }
    grouped[rodada.rodada].push(rodada);
  });
  return grouped;
}

console.log("[RODADAS-CORE] ✅ Módulo carregado com batch loading otimizado");
