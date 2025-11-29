// RODADAS ORQUESTRADOR - Coordenação entre Módulos
// Responsável por: coordenação, fluxo principal, integração de módulos

import {
  atualizarStatusMercado,
  getStatusMercado,
  fetchAndProcessRankingRodada,
  buscarLiga,
  calcularPontosParciais,
  buscarRodadas,
  agruparRodadasPorNumero,
  getBancoPorLiga,
} from "./rodadas-core.js";

import {
  renderizarMiniCardsRodadas,
  selecionarRodada,
  exibirRanking,
  exibirRankingParciais,
  mostrarLoading,
  mostrarMensagemRodada,
  limparExportContainer,
  getRodadaAtualSelecionada,
  exibirRodadas,
  limparCacheUI,
} from "./rodadas-ui.js";

import {
  cacheRankingRodada,
  getCachedRankingRodada,
  cacheParciais,
  getCachedParciais,
  getStatusMercadoCache,
  cacheLiga,
  getCachedLiga,
  preloadEscudos,
  debounce,
  getElementCached,
  clearDOMCache,
} from "./rodadas-cache.js";

// ESTADO DO ORQUESTRADOR
let modulosCarregados = false;
let ligaIdAtual = null;
let exportModules = null;
let carregamentoEmAndamento = false;

// ==============================
// CARREGAMENTO DE MÓDULOS EXTERNOS
// ==============================

async function carregarModulosExternos() {
  if (modulosCarregados) return exportModules;

  try {
    console.log("[RODADAS-ORQUESTRADOR] Carregando módulos essenciais...");

    const pontosCorridosModule = await import(
      "../pontos-corridos-utils.js"
    ).catch(() => null);

    exportModules = {
      getMercadoStatus: pontosCorridosModule?.buscarStatusMercado,
      getLigaId: pontosCorridosModule?.getLigaId,
    };

    modulosCarregados = true;
    console.log("[RODADAS-ORQUESTRADOR] Módulos essenciais carregados");
    return exportModules;
  } catch (error) {
    console.warn("[RODADAS-ORQUESTRADOR] Erro ao carregar módulos:", error);
    exportModules = {};
    return exportModules;
  }
}

// ==============================
// FUNÇÃO PRINCIPAL DO ORQUESTRADOR
// ==============================

export async function carregarRodadas(forceRefresh = false) {
  console.log(
    `[RODADAS-ORQUESTRADOR] carregarRodadas iniciada com forceRefresh: ${forceRefresh}`,
  );

  if (typeof window === "undefined") {
    console.log("[RODADAS-ORQUESTRADOR] Executando no backend - ignorando");
    return;
  }

  // ✅ CORREÇÃO: Debounce para evitar chamadas simultâneas
  if (carregamentoEmAndamento) {
    console.log(
      "[RODADAS-ORQUESTRADOR] Carregamento já em andamento, aguardando...",
    );
    return;
  }

  // ✅ CORREÇÃO: Limpar cache de DOM para garantir elementos frescos
  clearDOMCache();
  limparCacheUI();

  // ✅ CORREÇÃO: Verificar container de forma mais flexível
  const rodadasContainer = document.getElementById("rodadas");

  // Se não existe o container, não é a página de rodadas
  if (!rodadasContainer) {
    console.log(
      "[RODADAS-ORQUESTRADOR] Container #rodadas não existe na página",
    );
    return;
  }

  // ✅ CORREÇÃO: Não verificar classe active - deixar o orquestrador principal controlar
  // O módulo deve carregar sempre que for chamado explicitamente

  carregamentoEmAndamento = true;

  try {
    await carregarModulosExternos();

    const urlParams = new URLSearchParams(window.location.search);
    ligaIdAtual = urlParams.get("id");

    if (!ligaIdAtual) {
      mostrarMensagemRodada("ID da liga não encontrado na URL", "erro");
      return;
    }

    await atualizarStatusMercadoComCache(forceRefresh);
    await renderizarMiniCardsRodadas();

    console.log("[RODADAS-ORQUESTRADOR] Carregamento concluído com sucesso");
  } catch (error) {
    console.error("[RODADAS-ORQUESTRADOR] Erro no carregamento:", error);
    mostrarMensagemRodada(`Erro ao carregar rodadas: ${error.message}`, "erro");
  } finally {
    carregamentoEmAndamento = false;
  }
}

// ==============================
// GESTÃO DE STATUS DO MERCADO COM CACHE
// ==============================

async function atualizarStatusMercadoComCache(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await getStatusMercadoCache();
    if (cached) {
      console.log("[RODADAS-ORQUESTRADOR] Usando status do mercado em cache");
      return;
    }
  }

  await atualizarStatusMercado();
  console.log("[RODADAS-ORQUESTRADOR] Status do mercado atualizado");
}

// ==============================
// CARREGAMENTO DE DADOS DA RODADA
// ==============================

export async function carregarDadosRodada(rodadaSelecionada) {
  const rankingBody = document.getElementById("rankingBody");
  if (!rankingBody) {
    console.warn("[RODADAS-ORQUESTRADOR] rankingBody não encontrado");
    return;
  }

  const { rodada_atual, status_mercado } = getStatusMercado();
  const mercadoAberto = status_mercado === 1;

  try {
    mostrarLoading(true);
    limparExportContainer();

    if (rodadaSelecionada < rodada_atual) {
      await carregarRodadaFinalizada(rodadaSelecionada);
    } else if (rodadaSelecionada === rodada_atual) {
      if (mercadoAberto) {
        mostrarMensagemRodada(
          "O mercado está aberto. A rodada ainda não começou!",
          "info",
        );
      } else {
        await carregarRodadaParciais(rodadaSelecionada);
      }
    } else {
      mostrarMensagemRodada("Esta rodada ainda não aconteceu.", "aviso");
    }
  } catch (err) {
    console.error("[RODADAS-ORQUESTRADOR] Erro em carregarDadosRodada:", err);
    mostrarMensagemRodada(`Erro: ${err.message}`, "erro");
  } finally {
    mostrarLoading(false);
  }
}

// CARREGAR RODADA FINALIZADA COM CACHE
async function carregarRodadaFinalizada(rodada) {
  let rankingsData = await getCachedRankingRodada(ligaIdAtual, rodada);

  if (
    !rankingsData ||
    !Array.isArray(rankingsData) ||
    rankingsData.length === 0
  ) {
    console.log(
      `[RODADAS-ORQUESTRADOR] Buscando dados da rodada ${rodada} na API...`,
    );
    rankingsData = await fetchAndProcessRankingRodada(ligaIdAtual, rodada);

    if (
      rankingsData &&
      Array.isArray(rankingsData) &&
      rankingsData.length > 0
    ) {
      await cacheRankingRodada(ligaIdAtual, rodada, rankingsData);
      preloadEscudos(rankingsData);
    }
  } else {
    console.log(
      `[RODADAS-ORQUESTRADOR] Usando dados da rodada ${rodada} do cache`,
    );
  }

  if (!Array.isArray(rankingsData)) {
    rankingsData = [];
  }

  exibirRanking(rankingsData, rodada, ligaIdAtual);

  const btnRefresh = document.getElementById("btnRefreshParciais");
  if (btnRefresh) {
    btnRefresh.style.display = "none";
  }
}

// CARREGAR RODADA COM PARCIAIS
async function carregarRodadaParciais(rodada, forcarRecalculo = false) {
  let rankingsParciais = null;

  if (!forcarRecalculo) {
    rankingsParciais = getCachedParciais(ligaIdAtual, rodada);
  }

  if (
    forcarRecalculo ||
    !rankingsParciais ||
    !Array.isArray(rankingsParciais) ||
    rankingsParciais.length === 0
  ) {
    console.log(
      `[RODADAS-ORQUESTRADOR] ${forcarRecalculo ? "Forçando recalculo de" : "Calculando"} parciais da rodada ${rodada}...`,
    );

    let liga = getCachedLiga(ligaIdAtual);
    if (!liga) {
      liga = await buscarLiga(ligaIdAtual);
      if (liga) {
        cacheLiga(ligaIdAtual, liga);
      }
    }

    if (!liga) {
      throw new Error("Erro ao buscar dados da liga para calcular parciais");
    }

    rankingsParciais = await calcularPontosParciais(liga, rodada);

    if (
      rankingsParciais &&
      Array.isArray(rankingsParciais) &&
      rankingsParciais.length > 0
    ) {
      cacheParciais(ligaIdAtual, rodada, rankingsParciais);
      preloadEscudos(rankingsParciais);
    }
  } else {
    console.log(
      `[RODADAS-ORQUESTRADOR] Usando parciais da rodada ${rodada} do cache`,
    );
  }

  if (!Array.isArray(rankingsParciais)) {
    rankingsParciais = [];
  }

  await exibirRankingParciais(rankingsParciais, rodada, ligaIdAtual);
  configurarBotaoRefresh(rodada);
}

// CONFIGURAR BOTÃO DE REFRESH
function configurarBotaoRefresh(rodada) {
  const btnRefresh = document.getElementById("btnRefreshParciais");
  if (!btnRefresh) return;

  const { rodada_atual, status_mercado } = getStatusMercado();
  const isParciais = rodada === rodada_atual && status_mercado === 2;

  if (isParciais) {
    btnRefresh.style.display = "flex";
    btnRefresh.onclick = async () => {
      btnRefresh.disabled = true;
      const icon = btnRefresh.querySelector(".refresh-icon");
      if (icon) {
        icon.style.animation = "spin 0.6s ease-in-out";
      }

      try {
        await carregarRodadaParciais(rodada, true);

        const textSpan = btnRefresh.querySelector("span:last-child");
        if (textSpan) {
          const originalText = textSpan.textContent;
          textSpan.textContent = "Atualizado!";
          setTimeout(() => {
            if (textSpan) textSpan.textContent = originalText || "Atualizar";
          }, 2000);
        }
      } catch (error) {
        console.error(
          "[RODADAS-ORQUESTRADOR] Erro ao atualizar parciais:",
          error,
        );
      } finally {
        btnRefresh.disabled = false;
        if (icon) {
          setTimeout(() => {
            icon.style.animation = "";
          }, 600);
        }
      }
    };
  } else {
    btnRefresh.style.display = "none";
  }
}

// ==============================
// FUNÇÕES PARA DEBUG E DESENVOLVIMENTO
// ==============================

export async function inicializarRodadas() {
  console.log("[RODADAS-ORQUESTRADOR] Inicializando módulo de rodadas...");
  console.log("[RODADAS-ORQUESTRADOR] URL atual:", window.location.href);

  const naRodadas =
    window.location.pathname.includes("rodadas") ||
    window.location.search.includes("secao=rodadas");

  if (!naRodadas) {
    console.log(
      "[RODADAS-ORQUESTRADOR] Não está na seção de rodadas, pulando inicialização",
    );
    return;
  }

  await carregarRodadas(false);
  await carregarRodadasDebug();
}

async function carregarRodadasDebug() {
  console.log(
    "[RODADAS-ORQUESTRADOR] Iniciando carregamento de rodadas para debug...",
  );

  try {
    const rodadas = await buscarRodadas();
    const rodadasAgrupadas = agruparRodadasPorNumero(rodadas);
    exibirRodadas(rodadasAgrupadas);

    console.log("[RODADAS-ORQUESTRADOR] Debug concluído com sucesso");
  } catch (error) {
    console.error("[RODADAS-ORQUESTRADOR] Erro no debug:", error);
  }
}

// ==============================
// GESTÃO DE EVENTOS E SELEÇÃO
// ==============================

export const selecionarRodadaDebounced = debounce(async (rodada) => {
  await selecionarRodada(rodada, carregarDadosRodada);
}, 300);

if (typeof window !== "undefined") {
  window.selecionarRodada = async function (rodada) {
    await selecionarRodadaDebounced(rodada);
  };
}

// ==============================
// UTILITÁRIOS E ESTADO
// ==============================

export function getLigaAtual() {
  return ligaIdAtual;
}

export function getExportModules() {
  return exportModules;
}

export function isModulosCarregados() {
  return modulosCarregados;
}

export async function forcarRecarregamento() {
  console.log("[RODADAS-ORQUESTRADOR] Forçando recarregamento completo...");

  const { limparCache } = await import("./rodadas-cache.js");
  limparCache();
  clearDOMCache();
  limparCacheUI();

  modulosCarregados = false;
  exportModules = null;
  carregamentoEmAndamento = false;

  await carregarRodadas(true);
}

// ✅ NOVA FUNÇÃO: Reset de estado para re-entrada no módulo
export function resetEstado() {
  carregamentoEmAndamento = false;
  clearDOMCache();
  limparCacheUI();
  console.log("[RODADAS-ORQUESTRADOR] Estado resetado para re-entrada");
}

// ==============================
// EXPOSIÇÃO PARA DEBUG
// ==============================

if (typeof window !== "undefined") {
  window.rodadasOrquestradorDebug = {
    carregarRodadas,
    carregarDadosRodada,
    forcarRecarregamento,
    getLigaAtual,
    getExportModules,
    isModulosCarregados,
    selecionarRodadaDebounced,
    resetEstado,
  };
}

console.log("[RODADAS-ORQUESTRADOR] Módulo carregado com UX redesenhado");
