// MÓDULO RODADAS REFATORADO - Ponto de Entrada Principal
// ✅ VERSÃO 4.0 - COM BATCH LOADING
// Responsável por: interface pública, compatibilidade, coordenação geral

// VERIFICAÇÃO DE AMBIENTE
const isBackend = typeof window === "undefined";
const isFrontend = typeof window !== "undefined";

// IMPORTAÇÕES CONDICIONAIS PARA FRONTEND
let carregarRodadasOrquestrador = null;
let carregarDadosRodadaOrquestrador = null;
let inicializarRodadasOrquestrador = null;
let getRankingRodadaEspecificaCore = null;

// ✅ NOVO: Referências para batch loading
let getRankingsEmLoteCore = null;
let preCarregarRodadasCore = null;
let limparCacheRankingsCore = null;

// ==============================
// CARREGAMENTO DINÂMICO DE MÓDULOS
// ==============================
async function carregarModulosRodadas() {
  if (isBackend) {
    console.log("[RODADAS] Executando no backend - modo limitado");
    return;
  }

  try {
    // Importar módulos da pasta rodadas
    const orquestradorModule = await import(
      "./rodadas/rodadas-orquestrador.js"
    );
    const coreModule = await import("./rodadas/rodadas-core.js");

    // Configurar funções principais
    carregarRodadasOrquestrador = orquestradorModule.carregarRodadas;
    carregarDadosRodadaOrquestrador = orquestradorModule.carregarDadosRodada;
    inicializarRodadasOrquestrador = orquestradorModule.inicializarRodadas;
    getRankingRodadaEspecificaCore = coreModule.getRankingRodadaEspecifica;

    // ✅ NOVO: Funções de batch loading
    getRankingsEmLoteCore = coreModule.getRankingsEmLote;
    preCarregarRodadasCore = coreModule.preCarregarRodadas;
    limparCacheRankingsCore = coreModule.limparCacheRankings;

    console.log("[RODADAS] ✅ Módulos refatorados carregados com sucesso");
    console.log("[RODADAS] ⚡ Batch loading disponível");
    return true;
  } catch (error) {
    console.error("[RODADAS] ❌ Erro ao carregar módulos refatorados:", error);

    // Fallback para o sistema legado se necessário
    console.warn("[RODADAS] Usando funcionalidades limitadas");
    return false;
  }
}

// ==============================
// FUNÇÕES PÚBLICAS PRINCIPAIS
// ==============================

// FUNÇÃO PRINCIPAL - CARREGAR RODADAS
export async function carregarRodadas(forceRefresh = false) {
  console.log("[RODADAS] 🎯 carregarRodadas chamada (refatorada)");

  if (isBackend) {
    console.log("[RODADAS] Backend detectado - ignorando carregamento");
    return;
  }

  // Aguardar carregamento dos módulos
  const modulosCarregados = await carregarModulosRodadas();

  if (!modulosCarregados || !carregarRodadasOrquestrador) {
    console.error("[RODADAS] Não foi possível carregar o orquestrador");
    return;
  }

  // Verificar se o container está ativo
  const rodadasContainer = document.getElementById("rodadas");
  if (!rodadasContainer || !rodadasContainer.classList.contains("active")) {
    console.log("[RODADAS] Container não está ativo");
    return;
  }

  // Executar carregamento via orquestrador
  try {
    await carregarRodadasOrquestrador(forceRefresh);
    console.log("[RODADAS] ✅ Carregamento concluído via orquestrador");
  } catch (error) {
    console.error("[RODADAS] ❌ Erro no carregamento:", error);
  }
}

// FUNÇÃO PARA OBTER RANKING ESPECÍFICO (Compatibilidade)
// v3.2: Adicionado parâmetro temporadaOverride para pré-temporada
export async function getRankingRodadaEspecifica(ligaId, rodadaNum, temporadaOverride = null) {
  const ligaIdNormalizado = String(ligaId);

  if (isBackend) {
    // No backend, usar implementação simplificada
    try {
      const fetch = (await import("node-fetch")).default;
      const baseUrl = "http://localhost:3000";
      const temporadaParam = temporadaOverride ? `&temporada=${temporadaOverride}` : '';
      const response = await fetch(
        `${baseUrl}/api/rodadas/${ligaIdNormalizado}/rodadas?inicio=${rodadaNum}&fim=${rodadaNum}${temporadaParam}`,
      );

      if (!response.ok) {
        throw new Error(
          `Erro ${response.status} ao buscar rodada ${rodadaNum}`,
        );
      }

      const data = await response.json();
      return Array.isArray(data)
        ? data.filter((r) => parseInt(r.rodada) === parseInt(rodadaNum))
        : [];
    } catch (error) {
      console.error(
        `[RODADAS] Erro no backend para rodada ${rodadaNum}:`,
        error,
      );
      return [];
    }
  }

  // No frontend, usar o core module
  if (!getRankingRodadaEspecificaCore) {
    await carregarModulosRodadas();
  }

  if (getRankingRodadaEspecificaCore) {
    return await getRankingRodadaEspecificaCore(ligaIdNormalizado, rodadaNum, temporadaOverride);
  }

  console.warn("[RODADAS] Core module não disponível");
  return [];
}

// ==============================
// ✅ NOVO: FUNÇÕES DE BATCH LOADING
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
  console.log(
    `[RODADAS] 🚀 getRankingsEmLote(${ligaIdNormalizado}, ${rodadaInicio}-${rodadaFim})`,
  );

  if (isBackend) {
    // Backend: buscar diretamente
    try {
      const fetch = (await import("node-fetch")).default;
      const baseUrl = "http://localhost:3000";
      const response = await fetch(
        `${baseUrl}/api/rodadas/${ligaIdNormalizado}/rodadas?inicio=${rodadaInicio}&fim=${rodadaFim}`,
      );

      if (!response.ok) {
        throw new Error(`Erro ${response.status} ao buscar rodadas em lote`);
      }

      const data = await response.json();

      // Agrupar por rodada
      const agrupado = {};
      data.forEach((r) => {
        const num = parseInt(r.rodada);
        if (!agrupado[num]) agrupado[num] = [];
        agrupado[num].push(r);
      });

      // Ordenar cada rodada por pontos
      Object.keys(agrupado).forEach((rodada) => {
        agrupado[rodada].sort(
          (a, b) => parseFloat(b.pontos || 0) - parseFloat(a.pontos || 0),
        );
      });

      return agrupado;
    } catch (error) {
      console.error("[RODADAS] Erro no backend getRankingsEmLote:", error);
      return {};
    }
  }

  // Frontend: usar core module
  if (!getRankingsEmLoteCore) {
    await carregarModulosRodadas();
  }

  if (getRankingsEmLoteCore) {
    return await getRankingsEmLoteCore(
      ligaIdNormalizado,
      rodadaInicio,
      rodadaFim,
      forcarRecarga,
    );
  }

  console.warn("[RODADAS] getRankingsEmLote não disponível");
  return {};
}

/**
 * ✅ PRÉ-CARREGAR TODAS AS RODADAS (chamado uma vez na inicialização)
 * @param {string} ligaId - ID da liga
 * @param {number} ultimaRodada - Última rodada a carregar
 */
export async function preCarregarRodadas(ligaId, ultimaRodada = 38) {
  console.log(`[RODADAS] 📦 preCarregarRodadas(${ligaId}, ${ultimaRodada})`);

  if (isBackend) {
    // No backend, apenas buscar em lote
    await getRankingsEmLote(ligaId, 1, ultimaRodada, false);
    return true;
  }

  // Frontend: usar core module
  if (!preCarregarRodadasCore) {
    await carregarModulosRodadas();
  }

  if (preCarregarRodadasCore) {
    return await preCarregarRodadasCore(ligaId, ultimaRodada);
  }

  // Fallback: usar getRankingsEmLote
  await getRankingsEmLote(ligaId, 1, ultimaRodada, false);
  return true;
}

/**
 * ✅ LIMPAR CACHE DE RANKINGS
 * @param {string} ligaId - ID da liga (opcional, se não passar limpa tudo)
 */
export function limparCacheRankings(ligaId = null) {
  console.log(`[RODADAS] 🗑️ limparCacheRankings(${ligaId || "todos"})`);

  if (isBackend) {
    console.log("[RODADAS] Limpeza de cache não disponível no backend");
    return;
  }

  if (limparCacheRankingsCore) {
    limparCacheRankingsCore(ligaId);
  } else {
    console.warn("[RODADAS] limparCacheRankings não disponível");
  }
}

// ==============================
// FUNÇÕES DE INICIALIZAÇÃO
// ==============================

// INICIALIZAÇÃO AUTOMÁTICA PARA FRONTEND
if (isFrontend) {
  // Aguardar carregamento do DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarModuloRodadas);
  } else {
    inicializarModuloRodadas();
  }
}

async function inicializarModuloRodadas() {
  console.log("[RODADAS] 🚀 Inicializando módulo refatorado...");

  try {
    const modulosCarregados = await carregarModulosRodadas();

    if (modulosCarregados && inicializarRodadasOrquestrador) {
      // Usar inicializador do orquestrador se disponível
      await inicializarRodadasOrquestrador();
    } else {
      // Inicialização básica se módulos não carregaram
      console.warn("[RODADAS] Inicialização básica ativada");
      await carregarRodadas(false);
    }
  } catch (error) {
    console.error("[RODADAS] Erro na inicialização:", error);
  }
}

// ==============================
// COMPATIBILIDADE COM SISTEMA LEGADO
// ==============================

// FUNÇÃO GLOBAL PARA SELEÇÃO DE RODADA (Compatibilidade)
if (isFrontend) {
  window.selecionarRodada = async function (rodada) {
    console.log(`[RODADAS] selecionarRodada(${rodada}) - interface legada`);

    if (!carregarDadosRodadaOrquestrador) {
      await carregarModulosRodadas();
    }

    if (carregarDadosRodadaOrquestrador) {
      // Usar nova implementação
      const { selecionarRodadaDebounced } = await import(
        "./rodadas/rodadas-orquestrador.js"
      );
      if (selecionarRodadaDebounced) {
        await selecionarRodadaDebounced(rodada);
        return;
      }
    }

    // Fallback básico
    console.warn("[RODADAS] Usando seleção básica de rodada");
    const cards = document.querySelectorAll(".rodada-mini-card");
    cards.forEach((card) => card.classList.remove("selected"));

    const cardSelecionado = document.querySelector(`[data-rodada="${rodada}"]`);
    if (cardSelecionado) {
      cardSelecionado.classList.add("selected");
    }
  };
}

// ==============================
// FUNÇÕES DE DEBUG E UTILIDADES
// ==============================

// FUNÇÃO DE DEBUG PARA DESENVOLVIMENTO
export async function debugRodadas() {
  console.log("[RODADAS] 🛠 Iniciando debug...");

  if (isBackend) {
    console.log("[RODADAS] Debug não disponível no backend");
    return;
  }

  try {
    await carregarModulosRodadas();

    // Importar utilitários de debug
    const { buscarRodadas, agruparRodadasPorNumero } = await import(
      "./rodadas/rodadas-core.js"
    );
    const { exibirRodadas } = await import("./rodadas/rodadas-ui.js");
    const { getEstatatisticasCache } = await import(
      "./rodadas/rodadas-cache.js"
    );

    console.log(
      "[RODADAS] 📊 Estatísticas do cache:",
      getEstatatisticasCache(),
    );

    const rodadas = await buscarRodadas();
    const rodadasAgrupadas = agruparRodadasPorNumero(rodadas);

    console.log("[RODADAS] 📈 Dados carregados:", {
      totalRodadas: Object.keys(rodadasAgrupadas).length,
      registrosTotais: rodadas.length,
    });

    exibirRodadas(rodadasAgrupadas);
  } catch (error) {
    console.error("[RODADAS] Erro no debug:", error);
  }
}

// FUNÇÃO PARA FORÇAR RECARREGAMENTO
export async function forcarRecarregamento() {
  console.log("[RODADAS] 🔄 Forçando recarregamento...");

  if (isBackend) return;

  try {
    await carregarModulosRodadas();
    const { forcarRecarregamento: forcarRecarregamentoOrquestrador } =
      await import("./rodadas/rodadas-orquestrador.js");

    if (forcarRecarregamentoOrquestrador) {
      await forcarRecarregamentoOrquestrador();
    } else {
      await carregarRodadas(true);
    }
  } catch (error) {
    console.error("[RODADAS] Erro ao forçar recarregamento:", error);
    // Fallback: recarregar página
    window.location.reload();
  }
}

// ==============================
// EXPOSIÇÃO PARA DEBUG GLOBAL
// ==============================

if (isFrontend) {
  window.rodadasDebug = {
    carregarRodadas,
    debugRodadas,
    forcarRecarregamento,
    getRankingRodadaEspecifica,

    // ✅ NOVO: Batch loading
    getRankingsEmLote,
    preCarregarRodadas,
    limparCacheRankings,

    // Acesso aos módulos internos
    async getModulos() {
      await carregarModulosRodadas();
      return {
        orquestrador: await import("./rodadas/rodadas-orquestrador.js"),
        core: await import("./rodadas/rodadas-core.js"),
        ui: await import("./rodadas/rodadas-ui.js"),
        cache: await import("./rodadas/rodadas-cache.js"),
        config: await import("./rodadas/rodadas-config.js"),
      };
    },

    // Informações de estado
    getEstado() {
      return {
        isBackend,
        isFrontend,
        modulosCarregados: !!carregarRodadasOrquestrador,
        batchLoadingDisponivel: !!getRankingsEmLoteCore,
        url: window.location.href,
        containerAtivo: document
          .getElementById("rodadas")
          ?.classList.contains("active"),
      };
    },
  };
}

// ==============================
// LOGS DE INICIALIZAÇÃO
// ==============================

console.log(
  "[RODADAS] ✅ Módulo refatorado carregado - Arquitetura modular implementada",
);
console.log("[RODADAS] 🔧 Funções de debug disponíveis em window.rodadasDebug");

// INFORMAÇÕES DA REFATORAÇÃO
if (isFrontend) {
  console.log("[RODADAS] 📦 Estrutura modular:");
  console.log("  - rodadas-config.js: Configurações e constantes");
  console.log("  - rodadas-core.js: Lógica de negócio e API calls");
  console.log("  - rodadas-ui.js: Interface e renderização");
  console.log("  - rodadas-cache.js: Sistema de cache e performance");
  console.log("  - rodadas-orquestrador.js: Coordenação entre módulos");
  console.log("  - rodadas.js: Ponto de entrada refatorado (este arquivo)");
  console.log(
    "[RODADAS] ⚡ NOVO: Batch loading disponível via getRankingsEmLote()",
  );
}
