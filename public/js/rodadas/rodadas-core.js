// RODADAS CORE - Lógica de Negócio e API Calls
// ✅ VERSÃO 4.3 - CORREÇÃO SINTAXE + TABELAS CONTEXTUAIS
// Responsável por: processamento de dados, chamadas de API, cálculos

import {
  RODADAS_ENDPOINTS,
  STATUS_MERCADO_DEFAULT,
  LIGAS_CONFIG,
  valoresBancoPadrao,
  valoresBancoCartoleirosSobral,
  TIMEOUTS_CONFIG,
  // ✅ v4.3: Imports contextuais para Cartoleiros Sobral
  RODADA_TRANSICAO_SOBRAL,
  valoresFase1_6times,
  valoresFase2_4times,
  getBancoPorRodada,
  getFaixasPorRodada,
  getTotalTimesPorRodada,
} from "./rodadas-config.js";

// VERIFICAÇÃO DE AMBIENTE
const isBackend = typeof window === "undefined";
const isFrontend = typeof window !== "undefined";

// ESTADO GLOBAL DO MÓDULO
let statusMercadoGlobal = STATUS_MERCADO_DEFAULT;

// ✅ CACHE DE STATUS DOS TIMES (ativo/inativo)
let timesStatusCache = new Map();
const TIMES_STATUS_CACHE_TTL = 5 * 60 * 1000;
let timesStatusCacheTimestamp = new Map();

// ✅ CACHE DE RANKINGS EM MEMÓRIA
const cacheRankingsLote = new Map();
const CACHE_TTL = 10 * 60 * 1000;

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
        temporada: mercadoData.temporada || new Date().getFullYear(),
      };
      console.log(`[RODADAS-CORE] Status mercado: R${mercadoData.rodada_atual} T${statusMercadoGlobal.temporada}`);
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
// BUSCAR STATUS DE ATIVO/INATIVO DOS TIMES
// ==============================

export async function buscarTimesStatus(ligaId, forcarRecarga = false) {
  const ligaIdNormalizado = String(ligaId);

  if (!forcarRecarga && timesStatusCache.has(ligaIdNormalizado)) {
    const timestamp = timesStatusCacheTimestamp.get(ligaIdNormalizado);
    if (Date.now() - timestamp < TIMES_STATUS_CACHE_TTL) {
      console.log(
        `[RODADAS-CORE] ⚡ Cache hit para status dos times (liga: ${ligaIdNormalizado})`,
      );
      return timesStatusCache.get(ligaIdNormalizado);
    }
  }

  console.log(
    `[RODADAS-CORE] 🔄 Buscando status dos times para liga ${ligaIdNormalizado}...`,
  );

  try {
    let fetchFunc = isBackend ? (await import("node-fetch")).default : fetch;
    const baseUrl = isBackend ? "http://localhost:3000" : "";

    const response = await fetchFunc(
      `${baseUrl}/api/ligas/${ligaIdNormalizado}/times`,
    );

    if (!response.ok) {
      console.warn(`[RODADAS-CORE] ⚠️ Erro ${response.status} ao buscar times`);
      return {};
    }

    const times = await response.json();
    const statusMap = {};

    (Array.isArray(times) ? times : []).forEach((time) => {
      const id = String(time.id || time.time_id || time.timeId);
      if (id) {
        statusMap[id] = {
          ativo: time.ativo !== false,
          rodada_desistencia: time.rodada_desistencia || null,
          nome_time: time.nome_time || time.nome,
          nome_cartola: time.nome_cartola,
        };
      }
    });

    timesStatusCache.set(ligaIdNormalizado, statusMap);
    timesStatusCacheTimestamp.set(ligaIdNormalizado, Date.now());

    console.log(
      `[RODADAS-CORE] ✅ ${Object.keys(statusMap).length} times com status carregados`,
    );
    return statusMap;
  } catch (error) {
    console.error("[RODADAS-CORE] ❌ Erro ao buscar status dos times:", error);
    return {};
  }
}

export function enriquecerRankingsComStatus(rankings, timesStatus) {
  if (!rankings || !Array.isArray(rankings)) return rankings;
  if (!timesStatus || Object.keys(timesStatus).length === 0) return rankings;

  return rankings.map((rank) => {
    const timeId = String(rank.time_id || rank.timeId || rank.id);
    const status = timesStatus[timeId];

    return {
      ...rank,
      ativo: status ? status.ativo : true,
      rodada_desistencia: status ? status.rodada_desistencia : null,
    };
  });
}

// ==============================
// BATCH LOADING DE RANKINGS
// ==============================

export async function getRankingsEmLote(
  ligaId,
  rodadaInicio = 1,
  rodadaFim = 38,
  forcarRecarga = false,
) {
  const ligaIdNormalizado = String(ligaId);
  // Multi-Temporada: usar contexto global
  const temporada = (typeof window !== 'undefined' && window.temporadaAtual) || new Date().getFullYear();

  // Cache key inclui temporada para evitar conflitos
  const cacheKey = `${ligaIdNormalizado}_${temporada}`;

  if (!forcarRecarga && cacheRankingsLote.has(cacheKey)) {
    const cached = cacheRankingsLote.get(cacheKey);
    const idade = Date.now() - cached.timestamp;

    if (idade < CACHE_TTL) {
      console.log(
        `[RODADAS-CORE] ⚡ Cache hit! ${Object.keys(cached.rodadas).length} rodadas em memória (${temporada})`,
      );
      return cached.rodadas;
    }
  }

  console.log(
    `[RODADAS-CORE] 🚀 Buscando rodadas ${rodadaInicio}-${rodadaFim} em LOTE - Temporada ${temporada}...`,
  );

  try {
    let fetchFunc = isBackend ? (await import("node-fetch")).default : fetch;
    const baseUrl = isBackend ? "http://localhost:3000" : "";

    const [rankingsResponse, timesStatus] = await Promise.all([
      fetchFunc(
        `${baseUrl}/api/rodadas/${ligaIdNormalizado}/rodadas?inicio=${rodadaInicio}&fim=${rodadaFim}&temporada=${temporada}`,
      ),
      buscarTimesStatus(ligaIdNormalizado),
    ]);

    if (!rankingsResponse.ok) {
      throw new Error(
        `Erro HTTP ${rankingsResponse.status} ao buscar rodadas em lote`,
      );
    }

    const todosRankings = await rankingsResponse.json();

    console.log(
      `[RODADAS-CORE] ✅ ${todosRankings.length} registros carregados em 1 requisição`,
    );

    const rodadasAgrupadas = {};

    todosRankings.forEach((ranking) => {
      const rodadaNum = parseInt(ranking.rodada);
      if (!rodadasAgrupadas[rodadaNum]) {
        rodadasAgrupadas[rodadaNum] = [];
      }

      const timeId = String(ranking.time_id || ranking.timeId || ranking.id);
      const status = timesStatus[timeId];

      rodadasAgrupadas[rodadaNum].push({
        ...ranking,
        time_id: timeId,
        timeId: timeId,
        id: timeId,
        ativo: status ? status.ativo : true,
        rodada_desistencia: status ? status.rodada_desistencia : null,
      });
    });

    Object.keys(rodadasAgrupadas).forEach((rodada) => {
      rodadasAgrupadas[rodada].sort(
        (a, b) => parseFloat(b.pontos || 0) - parseFloat(a.pontos || 0),
      );
    });

    cacheRankingsLote.set(cacheKey, {
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

export async function getRankingRodadaEspecifica(ligaId, rodadaNum) {
  const ligaIdNormalizado = String(ligaId);

  if (cacheRankingsLote.has(ligaIdNormalizado)) {
    const cached = cacheRankingsLote.get(ligaIdNormalizado);
    const idade = Date.now() - cached.timestamp;

    if (idade < CACHE_TTL && cached.rodadas[rodadaNum]) {
      return cached.rodadas[rodadaNum];
    }
  }

  console.log(
    `[RODADAS-CORE] ⚠️ Cache miss para rodada ${rodadaNum} (liga: ${ligaIdNormalizado}) - buscando individual`,
  );
  return await fetchAndProcessRankingRodada(ligaId, rodadaNum);
}

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

export function limparCacheRankings(ligaId = null) {
  if (ligaId) {
    cacheRankingsLote.delete(ligaId);
    timesStatusCache.delete(ligaId);
    timesStatusCacheTimestamp.delete(ligaId);
    console.log(`[RODADAS-CORE] 🗑️ Cache limpo para liga ${ligaId}`);
  } else {
    cacheRankingsLote.clear();
    timesStatusCache.clear();
    timesStatusCacheTimestamp.clear();
    console.log(`[RODADAS-CORE] 🗑️ Todo cache de rankings limpo`);
  }
}

// ==============================
// FUNÇÕES DE API E PROCESSAMENTO
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

        // Array vazio é válido (rodada sem dados ainda)
        if (data && Array.isArray(data)) {
          rankingsDataFromApi = data;
          console.log(
            `[RODADAS-CORE] Dados encontrados no endpoint: ${endpoint} (${data.length} registros)`,
          );
          break;
        }

        // Objeto com propriedade data
        if (data && typeof data === "object" && data.data) {
          rankingsDataFromApi = data.data;
          console.log(
            `[RODADAS-CORE] Dados encontrados no endpoint: ${endpoint} (${data.data.length} registros)`,
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
        const mercadoRes = await fetchFunc(
          `${baseUrl}${RODADAS_ENDPOINTS.mercadoStatus}`,
        );
        if (mercadoRes.ok) {
          const mercadoData = await mercadoRes.json();
          rodadaAtualReal = mercadoData.rodada_atual || 1;
        }
      } catch (e) {
        console.warn("[RODADAS-CORE] Não foi possível obter rodada atual");
      }

      if (
        rodadaNum >= rodadaAtualReal &&
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

    // DEBUG: Ver estrutura dos dados
    console.log(`[RODADAS-CORE] 🔍 DEBUG Rodada ${rodadaNum}:`, {
      totalRecebidos: dataArray.length,
      primeiroItem: dataArray[0],
      temRodada: dataArray[0]?.hasOwnProperty("rodada"),
      valorRodada: dataArray[0]?.rodada,
      tipoRodada: typeof dataArray[0]?.rodada,
    });
    console.log(
      `[RODADAS-CORE] 🔍 ESTRUTURA COMPLETA:`,
      JSON.stringify(dataArray[0], null, 2),
    );

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

    const timesStatus = await buscarTimesStatus(ligaId);
    const rankingsEnriquecidos = enriquecerRankingsComStatus(
      rankingsDaRodada,
      timesStatus,
    );

    rankingsEnriquecidos.sort(
      (a, b) => parseFloat(b.pontos || 0) - parseFloat(a.pontos || 0),
    );

    return rankingsEnriquecidos;
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

  const ligaId = liga._id || liga.id;
  const timesStatus = await buscarTimesStatus(ligaId);

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

      const status = timesStatus[String(timeId)];

      rankingsParciais.push({
        time_id: timeId,
        nome_cartola: nomeCartola,
        nome_time: nomeTime,
        clube_id: clubeId,
        escudo_url:
          escalacaoData.url_escudo_png || escalacaoData.url_escudo_svg || "",
        totalPontos: totalPontos,
        ativo: status ? status.ativo : true,
        rodada_desistencia: status ? status.rodada_desistencia : null,
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

// Função legada - usa tabela atual (fase2 para Cartoleiros Sobral)
export function getBancoPorLiga(ligaId) {
  const isLigaCartoleirosSobral = ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL;
  return isLigaCartoleirosSobral
    ? valoresBancoCartoleirosSobral
    : valoresBancoPadrao;
}

// ✅ v4.3: getBancoPorRodada já importado do rodadas-config.js
// Re-exportar para compatibilidade com outros módulos
export { getBancoPorRodada, getFaixasPorRodada, getTotalTimesPorRodada };

export async function buscarRodadas() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const ligaId = urlParams.get("id");
    // Multi-Temporada: usar contexto global ou parâmetro da URL
    const temporada = window.temporadaAtual || urlParams.get("temporada") || new Date().getFullYear();

    if (!ligaId) {
      console.error("[RODADAS-CORE] ID da liga não encontrado na URL");
      return [];
    }

    console.log(`[RODADAS-CORE] Buscando rodadas para liga: ${ligaId} - Temporada: ${temporada}`);
    const response = await fetch(
      `/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38&temporada=${temporada}`,
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

    const timesStatus = await buscarTimesStatus(ligaId);
    const rodadasEnriquecidas = enriquecerRankingsComStatus(
      rodadas,
      timesStatus,
    );

    if (rodadasEnriquecidas.length > 0) {
      console.log("[RODADAS-CORE] Primeira rodada:", rodadasEnriquecidas[0]);
      console.log(
        "[RODADAS-CORE] Última rodada:",
        rodadasEnriquecidas[rodadasEnriquecidas.length - 1],
      );

      const rodadasAgrupadas = {};
      rodadasEnriquecidas.forEach((r) => {
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

    return rodadasEnriquecidas;
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

console.log("[RODADAS-CORE] ✅ Módulo v4.3 carregado (tabelas contextuais)");
