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
} from "./rodadas-ui.js";

import {
  cacheRankingRodada,
  getCachedRankingRodada,
  cacheParciais,
  getCachedParciais,
  cacheStatusMercado,
  getCachedStatusMercado,
  cacheLiga,
  getCachedLiga,
  preloadEscudos,
  debounce,
  getElementCached,
} from "./rodadas-cache.js";

// ESTADO DO ORQUESTRADOR
let modulosCarregados = false;
let ligaIdAtual = null;
let exportModules = null;

// ==============================
// CARREGAMENTO DE MÓDULOS EXTERNOS
// ==============================

async function carregarModulosExternos() {
  if (modulosCarregados) return exportModules;

  try {
    console.log("[RODADAS-ORQUESTRADOR] Carregando módulos de exportação...");

    const [pontosCorridosModule, exportModule] = await Promise.all([
      import("../pontos-corridos-utils.js").catch(() => null),
      import("../exports/export-exports.js").catch(() => null),
    ]);

    exportModules = {
      getMercadoStatus: pontosCorridosModule?.buscarStatusMercado,
      getLigaId: pontosCorridosModule?.getLigaId,
      criarBotaoExportacaoRodada: exportModule?.criarBotaoExportacaoRodada,
      exportarRodadaComoImagem: exportModule?.exportarRodadaComoImagem,
    };

    modulosCarregados = true;
    console.log(
      "[RODADAS-ORQUESTRADOR] Módulos externos carregados com sucesso",
    );
    return exportModules;
  } catch (error) {
    console.warn(
      "[RODADAS-ORQUESTRADOR] Erro ao carregar módulos externos:",
      error,
    );
    exportModules = {};
    return exportModules;
  }
}

// ==============================
// FUNÇÃO PRINCIPAL DO ORQUESTRADOR
// ==============================

export async function carregarRodadas(forceRefresh = false) {
  console.log(
    "[RODADAS-ORQUESTRADOR] carregarRodadas iniciada com forceRefresh:",
    forceRefresh,
  );

  if (typeof window === "undefined") {
    console.log("[RODADAS-ORQUESTRADOR] Executando no backend - ignorando");
    return;
  }

  const rodadasContainer = getElementCached("rodadas");
  if (!rodadasContainer || !rodadasContainer.classList.contains("active")) {
    console.log("[RODADAS-ORQUESTRADOR] Container não ativo, saindo da função");
    return;
  }

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
  }
}

// ==============================
// GESTÃO DE STATUS DO MERCADO COM CACHE
// ==============================

async function atualizarStatusMercadoComCache(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCachedStatusMercado();
    if (cached) {
      console.log("[RODADAS-ORQUESTRADOR] Usando status do mercado em cache");
      return;
    }
  }

  await atualizarStatusMercado();
  const status = getStatusMercado();
  cacheStatusMercado(status);
}

// ==============================
// CARREGAMENTO DE DADOS DA RODADA
// ==============================

export async function carregarDadosRodada(rodadaSelecionada) {
  const rankingBody = getElementCached("rankingBody");
  if (!rankingBody) return;

  const { rodada_atual, status_mercado } = getStatusMercado();
  const mercadoAberto = status_mercado === 1;
  const mercadoFechadoBolaRolando = status_mercado === 2; // Mercado fechado mas rodada em andamento

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
        // Mercado fechado (status_mercado: 2) - permitir parciais
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

  // Validar se é array válido
  if (!rankingsData || !Array.isArray(rankingsData) || rankingsData.length === 0) {
    console.log(
      `[RODADAS-ORQUESTRADOR] Buscando dados da rodada ${rodada} na API...`,
    );
    rankingsData = await fetchAndProcessRankingRodada(ligaIdAtual, rodada);

    if (rankingsData && Array.isArray(rankingsData) && rankingsData.length > 0) {
      await cacheRankingRodada(ligaIdAtual, rodada, rankingsData);
      preloadEscudos(rankingsData);
    }
  } else {
    console.log(
      `[RODADAS-ORQUESTRADOR] Usando dados da rodada ${rodada} do cache`,
    );
  }

  // Garantir que sempre seja array antes de exibir
  if (!Array.isArray(rankingsData)) {
    rankingsData = [];
  }

  exibirRanking(rankingsData, rodada, ligaIdAtual, criarBotaoExportacao);

  // Ocultar botão de refresh para rodadas finalizadas
  const btnRefresh = getElementCached('btnRefreshParciais');
  if (btnRefresh) {
    btnRefresh.style.display = 'none';
  }
}

// CARREGAR RODADA COM PARCIAIS
async function carregarRodadaParciais(rodada, forcarRecalculo = false) {
  let rankingsParciais = null;

  if (!forcarRecalculo) {
    rankingsParciais = getCachedParciais(ligaIdAtual, rodada);
  }

  // Validar se é array válido
  if (forcarRecalculo || !rankingsParciais || !Array.isArray(rankingsParciais) || rankingsParciais.length === 0) {
    console.log(
      `[RODADAS-ORQUESTRADOR] ${forcarRecalculo ? 'Forçando recalculo de' : 'Calculando'} parciais da rodada ${rodada}...`,
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

    if (rankingsParciais && Array.isArray(rankingsParciais) && rankingsParciais.length > 0) {
      cacheParciais(ligaIdAtual, rodada, rankingsParciais);
      preloadEscudos(rankingsParciais);
    }
  } else {
    console.log(
      `[RODADAS-ORQUESTRADOR] Usando parciais da rodada ${rodada} do cache`,
    );
  }

  // Garantir que sempre seja array antes de exibir
  if (!Array.isArray(rankingsParciais)) {
    rankingsParciais = [];
  }

  await exibirRankingParciais(
    rankingsParciais,
    rodada,
    ligaIdAtual,
    criarBotaoExportacao,
  );

  // Configurar botão de refresh
  configurarBotaoRefresh(rodada);
}

// CONFIGURAR BOTÃO DE REFRESH
function configurarBotaoRefresh(rodada) {
  const btnRefresh = getElementCached('btnRefreshParciais');
  if (!btnRefresh) return;

  const { rodada_atual, status_mercado } = getStatusMercado();
  const isParciais = rodada === rodada_atual && status_mercado === 2;

  if (isParciais) {
    btnRefresh.style.display = 'flex';
    btnRefresh.onclick = async () => {
      btnRefresh.disabled = true;
      const icon = btnRefresh.querySelector('.refresh-icon');
      if (icon) {
        icon.style.animation = 'spin 0.6s ease-in-out';
      }

      try {
        await carregarRodadaParciais(rodada, true);

        // Mostrar feedback visual
        const originalText = btnRefresh.querySelector('span:last-child')?.textContent;
        const textSpan = btnRefresh.querySelector('span:last-child');
        if (textSpan) {
          textSpan.textContent = 'Atualizado!';
          setTimeout(() => {
            if (textSpan) textSpan.textContent = originalText || 'Atualizar';
          }, 2000);
        }
      } catch (error) {
        console.error('[RODADAS-ORQUESTRADOR] Erro ao atualizar parciais:', error);
        alert('Erro ao atualizar parciais. Tente novamente.');
      } finally {
        btnRefresh.disabled = false;
        if (icon) {
          setTimeout(() => {
            icon.style.animation = '';
          }, 600);
        }
      }
    };
  } else {
    btnRefresh.style.display = 'none';
  }
}

// ==============================
// CRIAÇÃO DE BOTÃO DE EXPORTAÇÃO
// ==============================

function criarBotaoExportacao(rankings, rodada, isParciais) {
  if (
    !exportModules?.criarBotaoExportacaoRodada ||
    !exportModules?.exportarRodadaComoImagem
  ) {
    setTimeout(() => criarBotaoExportacao(rankings, rodada, isParciais), 1000);
    return;
  }

  const rankingsParaExportar = rankings.map((rank, index) => ({
    ...rank,
    nome_cartola: rank.nome_cartola || rank.nome_cartoleiro || "N/D",
    nome_time: rank.nome_time || "N/D",
    pontos: isParciais
      ? rank.totalPontos != null
        ? parseFloat(rank.totalPontos)
        : 0
      : rank.pontos != null
        ? parseFloat(rank.pontos)
        : 0,
    banco: isParciais ? null : getBancoParaIndex(index, ligaIdAtual),
  }));

  // Exportação removida - usar módulo Relatórios
}

// HELPER PARA VALORES DE BANCO
function getBancoParaIndex(index, ligaId) {
  const bancoPorLiga = getBancoPorLiga(ligaId);
  return bancoPorLiga[index + 1] || 0.0;
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

  const { limparCache, clearDOMCache } = await import("./rodadas-cache.js");
  limparCache();
  clearDOMCache();

  modulosCarregados = false;
  exportModules = null;

  await carregarRodadas(true);
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
  };
}

console.log("[RODADAS-ORQUESTRADOR] Módulo carregado com UX redesenhado");