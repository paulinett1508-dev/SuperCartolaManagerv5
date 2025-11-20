// RODADAS CORE - Lógica de Negócio e API Calls
// Responsável por: processamento de dados, chamadas de API, cálculos

import {
  RODADAS_ENDPOINTS,
  STATUS_MERCADO_DEFAULT,
  LIGAS_CONFIG,
  valoresBancoPadrao,
  valoresBancoCartoleirosSobral,
  TIMEOUTS_CONFIG,
} from "./rodadas-config.js";

// VERIFICAÇÃO DE AMBIENTE (linhas 3-4 do original)
const isBackend = typeof window === "undefined";
const isFrontend = typeof window !== "undefined";

// ESTADO GLOBAL DO MÓDULO (linhas 28-31 do original)
let statusMercadoGlobal = STATUS_MERCADO_DEFAULT;

// ==============================
// FUNÇÕES DE STATUS DO MERCADO
// ==============================

// ATUALIZAR STATUS DO MERCADO (linhas 154-171 do original)
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

// GETTER PARA STATUS DO MERCADO
export function getStatusMercado() {
  return statusMercadoGlobal;
}

// ==============================
// FUNÇÕES DE API E PROCESSAMENTO
// ==============================

// FETCH E PROCESSAMENTO DE RANKING DA RODADA (linhas 260-441 do original - refatorada)
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
      // Verificar se rodada ainda não tem dados ou se houve erro real
      const { rodada_atual, status_mercado } = statusMercadoGlobal;

      if (rodadaNum > rodada_atual) {
        console.log(
          `[RODADAS-CORE] Rodada ${rodadaNum} é futura (atual: ${rodada_atual})`,
        );
        return [];
      } else if (rodadaNum === rodada_atual && status_mercado === 1) {
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

    // Normalizar estrutura de dados
    const dataArray = Array.isArray(rankingsDataFromApi)
      ? rankingsDataFromApi
      : [rankingsDataFromApi];

    if (dataArray.length === 0) {
      console.warn(
        `[RODADAS-CORE] Dados vazios confirmados para rodada ${rodadaNum}`,
      );
      return [];
    }

    // Filtro mais robusto
    const rankingsDaRodada = dataArray.filter((rank) => {
      if (!rank || typeof rank !== "object") {
        console.warn(`[RODADAS-CORE] Item inválido encontrado:`, rank);
        return false;
      }

      if (!rank.hasOwnProperty("rodada")) {
        console.warn(`[RODADAS-CORE] Item sem propriedade 'rodada':`, rank);
        return false;
      }

      const rodadaItem = parseInt(rank.rodada);
      const rodadaTarget = parseInt(rodadaNum);

      return rodadaItem === rodadaTarget;
    });

    // Log detalhado para debug
    console.log(`[RODADAS-CORE] Processamento rodada ${rodadaNum}:`);
    console.log(`   - Dados brutos: ${dataArray.length} items`);
    console.log(`   - Após filtro: ${rankingsDaRodada.length} items`);
    console.log(`   - Rodadas únicas nos dados:`, [
      ...new Set(dataArray.map((r) => r.rodada)),
    ]);

    // Ordenar por pontos
    rankingsDaRodada.sort(
      (a, b) => parseFloat(b.pontos || 0) - parseFloat(a.pontos || 0),
    );

    return rankingsDaRodada;
  } catch (err) {
    console.error(
      `[RODADAS-CORE] Erro crítico em fetchAndProcessRankingRodada(${rodadaNum}):`,
      err,
    );

    // Retorno gracioso em caso de erro
    const { rodada_atual } = statusMercadoGlobal;
    if (rodadaNum <= rodada_atual) {
      // Para rodadas que deveriam ter dados, re-throw do erro
      throw new Error(
        `Falha ao carregar dados da rodada ${rodadaNum}: ${err.message}`,
      );
    } else {
      // Para rodadas futuras, retornar array vazio
      return [];
    }
  }
}

// ==============================
// FUNÇÕES AUXILIARES PARA LIGAS
// ==============================

// BUSCAR LIGA (linhas 700-715 do original)
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

// BUSCAR PONTUAÇÕES PARCIAIS (linhas 717-729 do original)
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

// CALCULAR PONTOS PARCIAIS (linhas 731-771 do original)
export async function calcularPontosParciais(liga, rodada) {
  const atletasPontuados = await buscarPontuacoesParciais();
  const times = liga.times || [];
  const rankingsParciais = [];

  console.log(`[RODADAS-CORE] Calculando parciais para ${times.length} times`);

  for (const time of times) {
    try {
      // Verificar se 'time' é um número (ID) ou objeto
      const timeId = typeof time === 'number' ? time : (time.time_id || time.id);
      
      if (!timeId) {
        console.warn('[RODADAS-CORE] Time sem ID encontrado:', time);
        continue;
      }

      let fetchFunc = isBackend ? (await import("node-fetch")).default : fetch;
      const baseUrl = isBackend ? "http://localhost:3000" : "";
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

      rankingsParciais.push({
        time_id: timeId,
        nome_cartola: escalacaoData.nome_cartoleiro || escalacaoData.nome || 'N/D',
        nome_time: escalacaoData.nome || 'N/D',
        escudo_url: escalacaoData.url_escudo_png || escalacaoData.url_escudo_svg || '',
        totalPontos: totalPontos,
      });
    } catch (err) {
      console.error(
        `[RODADAS-CORE] Erro ao processar parciais para o time:`,
        err,
      );
    }
  }

  console.log(`[RODADAS-CORE] ${rankingsParciais.length} times processados com parciais`);
  return rankingsParciais;
}

// ==============================
// FUNÇÕES DE UTILIDADE
// ==============================

// OBTER VALORES DE BANCO PARA LIGA (baseado nas linhas 456-459 do original)
export function getBancoPorLiga(ligaId) {
  const isLigaCartoleirosSobral = ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL;
  return isLigaCartoleirosSobral
    ? valoresBancoCartoleirosSobral
    : valoresBancoPadrao;
}

// FUNÇÃO PARA BUSCAR RODADAS (linhas 788-815 do original)
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

      // Agrupar por rodada para verificar estrutura
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

// AGRUPAR RODADAS POR NÚMERO (linha 847 do original)
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

// FUNÇÃO COMPATÍVEL COM O SISTEMA EXISTENTE (linhas 689-693 do original)
export async function getRankingRodadaEspecifica(ligaId, rodadaNum) {
  console.log(`[RODADAS-CORE] Solicitado ranking para rodada ${rodadaNum}`);
  return await fetchAndProcessRankingRodada(ligaId, rodadaNum);
}

console.log("[RODADAS-CORE] Módulo carregado com sucesso");
