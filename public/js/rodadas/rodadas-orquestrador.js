// RODADAS ORQUESTRADOR - Coordenação entre Módulos
// ✅ v3.0: DADOS HISTÓRICOS IMUTÁVEIS - Sempre buscar primeiro, exibir se existir
// ✅ v2.1: FIX - Rodada 38 carrega como finalizada quando temporada encerrou
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
  exibirRelatorioMitosMicos,
  fecharRelatorioMitosMicos,
  aplicarFiltroRelatorio,
  isRodadaConsolidada, // ✅ v2.1: Importar função de verificação
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
  limparCache,
} from "./rodadas-cache.js";

// Renomeado para evitar conflito com função importada de rodadas-ui.js
import * as RodadasUI from "./rodadas-ui.js";
import * as RodadasCore from "./rodadas-core.js";

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

  const { rodada_atual, status_mercado, temporada: temporadaMercado } = getStatusMercado();
  const mercadoAberto = status_mercado === 1;

  // ✅ v3.0: DADOS HISTÓRICOS SÃO IMUTÁVEIS
  // Se existem dados no banco (temporada anterior), SEMPRE carregar
  // A lógica de "rodada ainda não aconteceu" só vale para temporada ATUAL
  const rodadaConsolidada = isRodadaConsolidada(
    rodadaSelecionada,
    rodada_atual,
    status_mercado,
    temporadaMercado,
  );

  console.log(
    `[RODADAS-ORQUESTRADOR] Rodada ${rodadaSelecionada}: consolidada=${rodadaConsolidada}, rodada_atual=${rodada_atual}, status=${status_mercado}, temporada=${temporadaMercado}`,
  );

  try {
    mostrarLoading(true);
    limparExportContainer();

    // ✅ v3.0 FIX: SEMPRE tentar carregar dados históricos primeiro
    // Dados de temporadas passadas são IMUTÁVEIS e devem sempre ser exibidos
    // Só mostrar "rodada não aconteceu" se realmente não houver dados
    const dadosHistoricos = await fetchAndProcessRankingRodada(ligaIdAtual, rodadaSelecionada);

    if (dadosHistoricos && Array.isArray(dadosHistoricos) && dadosHistoricos.length > 0) {
      // ✅ Dados encontrados - exibir independente do status do mercado
      console.log(`[RODADAS-ORQUESTRADOR] ✅ Dados históricos encontrados: ${dadosHistoricos.length} participantes`);
      exibirRanking(dadosHistoricos, rodadaSelecionada, ligaIdAtual);
      const btnRefresh = document.getElementById("btnRefreshParciais");
      if (btnRefresh) btnRefresh.style.display = "none";
    } else if (rodadaConsolidada) {
      // Rodada marcada como consolidada mas sem dados - exibir mensagem
      mostrarMensagemRodada("Nenhum dado encontrado para esta rodada.", "info");
    } else if (rodadaSelecionada === rodada_atual) {
      if (mercadoAberto) {
        mostrarMensagemRodada(
          "O mercado está aberto. A rodada ainda não começou!",
          "info",
        );
      } else {
        // Rodada em andamento (jogos acontecendo)
        await carregarRodadaParciais(rodadaSelecionada);
      }
    } else if (rodadaSelecionada > rodada_atual) {
      mostrarMensagemRodada("Esta rodada ainda não aconteceu.", "aviso");
    } else {
      // Fallback: sem dados
      mostrarMensagemRodada("Nenhum dado disponível.", "aviso");
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

  // ✅ v2.1: Só mostrar botão se rodada está realmente em andamento (jogos acontecendo)
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

  // Adiciona event listeners para os botões do relatório Mitos/Micos após a inicialização
  adicionarEventListenersRelatorio();
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
// RELATÓRIO MITOS/MICOS
// ==============================

export async function gerarRelatorioMitosMicos() {
  console.log("[RODADAS-ORQUESTRADOR] Gerando relatório MITOS/MICOS...");

  RodadasUI.mostrarLoading(true);

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const ligaId = urlParams.get("id");

    if (!ligaId) {
      throw new Error("ID da liga não encontrado");
    }

    // Buscar todas as rodadas (assumindo 38 rodadas como padrão)
    const todasRodadas = await RodadasCore.getRankingsEmLote(
      ligaId,
      1,
      38,
      false,
    );

    const mitos = [];
    const micos = [];
    let somaPontosMito = 0;
    let somaPontosMico = 0;

    // Processar cada rodada
    Object.keys(todasRodadas).forEach((numRodada) => {
      const rankings = todasRodadas[numRodada];

      if (!rankings || rankings.length === 0) return;

      // Filtrar apenas participantes ativos (considerando que 'ativo: false' desativa)
      const ativos = rankings.filter((r) => r.ativo !== false);

      if (ativos.length === 0) return;

      // Ordenar por pontos para identificar Mitos e Micos
      const ordenados = [...ativos].sort(
        (a, b) => parseFloat(b.pontos || 0) - parseFloat(a.pontos || 0),
      );

      // MITO (primeiro colocado na rodada)
      const mito = { ...ordenados[0], rodada: parseInt(numRodada) };
      mitos.push(mito);
      somaPontosMito += parseFloat(mito.pontos || 0);

      // MICO (último colocado na rodada)
      const mico = {
        ...ordenados[ordenados.length - 1],
        rodada: parseInt(numRodada),
      };
      micos.push(mico);
      somaPontosMico += parseFloat(mico.pontos || 0);
    });

    const dadosRelatorio = {
      mitos,
      micos,
      estatisticas: {
        totalRodadas: mitos.length,
        mediaMito: mitos.length > 0 ? somaPontosMito / mitos.length : 0,
        mediaMico: micos.length > 0 ? somaPontosMico / micos.length : 0,
      },
    };

    // Salvar dados no escopo global para uso posterior pelos filtros da UI
    window._relatorioMitosMicosData = dadosRelatorio;

    RodadasUI.exibirRelatorioMitosMicos(dadosRelatorio);

    console.log(
      `[RODADAS-ORQUESTRADOR] ✅ Relatório gerado: ${mitos.length} MITOS, ${micos.length} MICOS`,
    );
  } catch (error) {
    console.error("[RODADAS-ORQUESTRADOR] Erro ao gerar relatório:", error);
    SuperModal.toast.error(`Erro ao gerar relatório: ${error.message}`);
  } finally {
    RodadasUI.mostrarLoading(false);
  }
}

// ==============================
// GESTÃO DE NAVEGAÇÃO E UI
// ==============================

/**
 * Limpa a visualização específica do módulo Rodadas
 * NÃO sobrescreve window.voltarParaCards - usa a função global do orquestrador
 */
export function limparVisaoRodadas() {
  const contentSection = document.getElementById("rodadaContentSection");
  const cardsContainer = document.getElementById("rodadasCards");
  const relatorioSection = document.getElementById("relatorioMitosMicos");

  if (contentSection) contentSection.style.display = "none";
  if (relatorioSection) relatorioSection.style.display = "none";
  if (cardsContainer) {
    cardsContainer.parentElement.style.display = "block";
  }

  console.log("[RODADAS-ORQUESTRADOR] Limpou visualização do módulo Rodadas");
}

// Alias para compatibilidade (uso interno do módulo apenas)
export const voltarParaCardsRodadas = limparVisaoRodadas;

// Wrapper para a função de seleção de rodada, garantindo que o orquestrador a utilize
async function selecionarRodadaWrapper(rodada) {
  console.log(`[RODADAS-ORQUESTRADOR] Selecionando rodada: ${rodada}`);
  await selecionarRodada(rodada, carregarDadosRodada);
}

// Adiciona os event listeners necessários para os botões do relatório
function adicionarEventListenersRelatorio() {
  // Os filtros agora usam onclick direto no HTML (renderizados em rodadas-ui.js)
  // Mantido apenas para compatibilidade
  console.log(
    "[RODADAS-ORQUESTRADOR] Event listeners do relatório configurados via onclick",
  );
}

// ==============================
// FUNÇÕES PARA DEBUG E EXPOSIÇÃO GLOBAL
// ==============================

// Expor funções globais para acesso externo (debug, etc.)
if (typeof window !== "undefined") {
  // Wrapper para selecionarRodada
  window.selecionarRodada = async function (rodada) {
    await selecionarRodadaWrapper(rodada);
  };

  // Exposição da função de gerar relatório
  window.gerarRelatorioMitosMicos = gerarRelatorioMitosMicos;

  // ✅ NÃO sobrescreve window.voltarParaCards - usa a função global do orquestrador
  // Expõe apenas a função específica do módulo
  window.limparVisaoRodadas = limparVisaoRodadas;

  // Objeto para debug
  window.rodadasOrquestradorDebug = {
    carregarRodadas,
    carregarDadosRodada,
    forcarRecarregamento,
    getLigaAtual,
    getExportModules,
    isModulosCarregados,
    limparVisaoRodadas,
    selecionarRodadaDebounced: debounce(async (rodada) => {
      // Expondo o debounced também
      await selecionarRodadaWrapper(rodada);
    }, 300),
    resetEstado,
    adicionarEventListenersRelatorio, // Expondo para testes
  };

  console.log(
    "[RODADAS-ORQUESTRADOR] ✅ Orquestrador v2.1 inicializado (fix rodada 38)",
  );
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

  // Importar dinamicamente para evitar dependência circular se rodadas-cache.js importar algo daqui
  const { limparCache } = await import("./rodadas-cache.js");
  limparCache(); // Limpa o cache específico do rodadas-cache
  clearDOMCache(); // Limpa o cache de elementos DOM
  limparCacheUI(); // Limpa caches específicos da UI

  // Resetar estado do orquestrador
  modulosCarregados = false;
  exportModules = null;
  carregamentoEmAndamento = false;
  ligaIdAtual = null; // Resetar ligaIdAtual também

  await carregarRodadas(true); // Carrega com forceRefresh = true
  console.log("[RODADAS-ORQUESTRADOR] Recarregamento completo concluído.");
}

// ✅ NOVA FUNÇÃO: Reset de estado para re-entrada no módulo
export function resetEstado() {
  carregamentoEmAndamento = false;
  clearDOMCache();
  limparCacheUI();
  // Não resetar modulosCarregados, ligaIdAtual ou exportModules aqui, pois podem ser necessários
  // para outras partes do app que podem chamar resetEstado e depois querer continuar.
  // Se for necessário um reset completo, forcarRecarregamento é a função apropriada.
  console.log(
    "[RODADAS-ORQUESTRADOR] Estado de carregamento e UI resetado para re-entrada",
  );
}

// Exportação do wrapper com alias
export { selecionarRodadaWrapper as selecionarRodada };
