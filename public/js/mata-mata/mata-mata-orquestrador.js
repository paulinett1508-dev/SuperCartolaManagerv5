// MATA-MATA ORQUESTRADOR - Coordenador Principal
// Responsável por: coordenação de módulos, carregamento dinâmico, cache

import { edicoes, getFaseInfo, getLigaId } from "./mata-mata-config.js";

// Funções auxiliares para exportação
function getEdicaoMataMata(edicaoAtual) {
  if (!edicaoAtual) return "SuperCartola 2025";
  
  const edicoes = {
    1: "SuperCartola 2025 - 1ª Edição",
    2: "SuperCartola 2025 - 2ª Edição", 
    3: "SuperCartola 2025 - 3ª Edição",
    4: "SuperCartola 2025 - 4ª Edição",
  };
  
  return edicoes[edicaoAtual] || `SuperCartola 2025 - ${edicaoAtual}ª Edição`;
}

function getRodadaPontosText(faseLabel, edicaoAtual) {
  const fasesRodadas = {
    "Primeira Fase": "Rodada 22 do Brasileirão",
    "Oitavas de Final": "Rodada 23 do Brasileirão", 
    "Quartas de Final": "Rodada 24 do Brasileirão",
    "Semifinal": "Rodada 25 do Brasileirão",
    "Final": "Rodada 26 do Brasileirão",
  };
  
  return fasesRodadas[faseLabel] || `Rodada do ${faseLabel}`;
}
import {
  setRankingFunction as setRankingConfronto,
  getPontosDaRodada,
  montarConfrontosPrimeiraFase,
  montarConfrontosFase,
  calcularValoresConfronto,
} from "./mata-mata-confrontos.js";
import { setRankingFunction as setRankingFinanceiro } from "./mata-mata-financeiro.js";
import {
  renderizarInterface,
  renderLoadingState,
  renderInstrucaoInicial,
  renderErrorState,
  renderTabelaMataMata,
  renderRodadaPendente,
} from "./mata-mata-ui.js";

// Variáveis dinâmicas para exports
let criarBotaoExportacaoMataMata = null;
let exportsCarregados = false;
let exportsCarregando = false;

// Variáveis dinâmicas para rodadas
let getRankingRodadaEspecifica = null;
let rodadasCarregados = false;
let rodadasCarregando = false;

// Cache de módulos
const moduleCache = new Map();

// Estado atual
let edicaoAtual = null;

// Cache de rankings por rodada
const rankingCache = new Map();
const RANKING_CACHE_DURATION = 300000; // 5 minutos

// Função para obter ranking com cache
async function getRankingComCache(ligaId, rodada) {
  const cacheKey = `${ligaId}-${rodada}`;
  const cached = rankingCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < RANKING_CACHE_DURATION) {
    console.log(`[MATA-ORQUESTRADOR] ⚡ Cache hit para rodada ${rodada}`);
    return cached.data;
  }

  console.log(`[MATA-ORQUESTRADOR] 🌐 Buscando ranking da rodada ${rodada}...`);
  const ranking = await getRankingRodadaEspecifica(ligaId, rodada);
  
  rankingCache.set(cacheKey, {
    data: ranking,
    timestamp: Date.now()
  });

  return ranking;
}

// Função de carregamento dinâmico dos exports
async function carregarExports() {
  if (exportsCarregados) return true;
  if (exportsCarregando) {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const checkInterval = setInterval(() => {
        if (exportsCarregados || !exportsCarregando) {
          clearInterval(checkInterval);
          controller.abort();
          resolve(exportsCarregados);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        controller.abort();
        resolve(false);
      }, 5000);
    });
  }

  exportsCarregando = true;

  try {
    if (moduleCache.has("exports")) {
      const cached = moduleCache.get("exports");
      criarBotaoExportacaoMataMata = cached.criarBotaoExportacaoMataMata;
      exportsCarregados = true;
      console.log("[MATA-ORQUESTRADOR] Exports carregados do cache");
      return true;
    }

    console.log("[MATA-ORQUESTRADOR] Carregando módulo de exports...");

    try {
      const exportModule = await import("../exports/export-exports.js");
      if (exportModule && exportModule.exportarMataMata) {
        criarBotaoExportacaoMataMata = exportModule.exportarMataMata;
        moduleCache.set("exports", { criarBotaoExportacaoMataMata });
        exportsCarregados = true;
        console.log(
          "[MATA-ORQUESTRADOR] Exports carregados via função centralizada",
        );
        return true;
      }
    } catch (error) {
      console.warn(
        "[MATA-ORQUESTRADOR] Função centralizada não disponível, tentando módulo específico",
      );
    }

    const exportMataMataModule = await import("../exports/export-mata-mata.js");
    if (
      exportMataMataModule &&
      exportMataMataModule.criarBotaoExportacaoMataMata
    ) {
      criarBotaoExportacaoMataMata =
        exportMataMataModule.criarBotaoExportacaoMataMata;
      moduleCache.set("exports", { criarBotaoExportacaoMataMata });
      exportsCarregados = true;
      console.log(
        "[MATA-ORQUESTRADOR] Exports carregados via módulo específico",
      );
      return true;
    }

    throw new Error("Nenhuma função de exportação encontrada");
  } catch (error) {
    console.warn("[MATA-ORQUESTRADOR] Erro ao carregar exports:", error);
    exportsCarregados = false;
    return false;
  } finally {
    exportsCarregando = false;
  }
}

// Função de carregamento dinâmico das rodadas
async function carregarRodadas() {
  if (rodadasCarregados) return true;
  if (rodadasCarregando) {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const checkInterval = setInterval(() => {
        if (rodadasCarregados || !rodadasCarregando) {
          clearInterval(checkInterval);
          controller.abort();
          resolve(rodadasCarregados);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        controller.abort();
        resolve(false);
      }, 5000);
    });
  }

  rodadasCarregando = true;

  try {
    if (moduleCache.has("rodadas")) {
      const cached = moduleCache.get("rodadas");
      getRankingRodadaEspecifica = cached.getRankingRodadaEspecifica;
      rodadasCarregados = true;
      console.log("[MATA-ORQUESTRADOR] Módulo rodadas carregado do cache");
      return true;
    }

    console.log("[MATA-ORQUESTRADOR] Carregando módulo rodadas...");
    const rodadasModule = await import("../rodadas.js");

    if (rodadasModule && rodadasModule.getRankingRodadaEspecifica) {
      getRankingRodadaEspecifica = rodadasModule.getRankingRodadaEspecifica;

      // Injetar dependência nos módulos
      setRankingConfronto(getRankingRodadaEspecifica);
      setRankingFinanceiro(getRankingRodadaEspecifica);

      moduleCache.set("rodadas", { getRankingRodadaEspecifica });
      rodadasCarregados = true;
      console.log("[MATA-ORQUESTRADOR] Módulo rodadas carregado com sucesso");
      return true;
    } else {
      throw new Error("Função getRankingRodadaEspecifica não encontrada");
    }
  } catch (error) {
    console.error(
      "[MATA-ORQUESTRADOR] Erro ao carregar módulo rodadas:",
      error,
    );
    rodadasCarregados = false;
    return false;
  } finally {
    rodadasCarregando = false;
  }
}

// Cache do status do mercado
let mercadoStatusCache = null;
let mercadoStatusTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minuto

// Função para obter status do mercado com cache
async function getMercadoStatus() {
  const now = Date.now();
  if (mercadoStatusCache && (now - mercadoStatusTimestamp) < CACHE_DURATION) {
    return mercadoStatusCache;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch("/api/cartola/mercado/status", {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      mercadoStatusCache = await response.json();
      mercadoStatusTimestamp = now;
      return mercadoStatusCache;
    }
  } catch (error) {
    console.warn("[MATA-ORQUESTRADOR] Erro ao buscar status:", error);
  }
  
  return mercadoStatusCache || { rodada_atual: 1 };
}

// Função principal para carregar mata-mata (OTIMIZADA)
export async function carregarMataMata() {
  const container = document.getElementById("mata-mata");
  if (!container) return;

  const startTime = performance.now();
  console.log("[MATA-ORQUESTRADOR] Iniciando carregamento OTIMIZADO...");

  const ligaId = getLigaId();

  // Carregar tudo em paralelo
  const [rodadasOk, exportsOk, mercadoData] = await Promise.allSettled([
    carregarRodadas(),
    carregarExports(),
    getMercadoStatus(),
  ]);

  // Processar resultados
  if (rodadasOk.status !== 'fulfilled') {
    console.warn("[MATA-ORQUESTRADOR] Módulo rodadas não carregou");
  }
  if (exportsOk.status !== 'fulfilled') {
    console.warn("[MATA-ORQUESTRADOR] Módulo exports não carregou");
  }

  // Atualizar edições ativas
  if (mercadoData.status === 'fulfilled' && mercadoData.value) {
    const rodadaAtual = mercadoData.value.rodada_atual || 1;
    edicoes.forEach((edicao) => {
      edicao.ativo = rodadaAtual >= edicao.rodadaDefinicao;
    });
  }

  renderizarInterface(container, ligaId, handleEdicaoChange, handleFaseClick);

  const endTime = performance.now();
  console.log(`[MATA-ORQUESTRADOR] ✅ Carregado em ${(endTime - startTime).toFixed(0)}ms`);
}

// Handler para mudança de edição
function handleEdicaoChange(novaEdicao, fase, ligaId) {
  edicaoAtual = novaEdicao;
  carregarFase(fase, ligaId);
}

// Handler para clique em fase
function handleFaseClick(fase, edicao) {
  edicaoAtual = edicao;
  const ligaId = getLigaId();
  carregarFase(fase, ligaId);
}

// Função para carregar uma fase específica
async function carregarFase(fase, ligaId) {
  const perfStart = performance.now();
  const contentId = "mataMataContent";
  const contentElement = document.getElementById(contentId);

  if (!contentElement) {
    console.error("[MATA-ORQUESTRADOR] Elemento de conteúdo não encontrado");
    return;
  }

  console.log(`[MATA-ORQUESTRADOR] ⚡ Carregando fase: ${fase}`);

  renderLoadingState(contentId, fase, edicaoAtual);

  try {
    // Verificar dependências (já devem estar carregadas)
    if (!getRankingRodadaEspecifica) {
      throw new Error(
        "Módulo rodadas não disponível - não é possível calcular confrontos",
      );
    }

    if (!edicaoAtual) {
      renderInstrucaoInicial(contentId);
      return;
    }

    // Usar cache do mercado ao invés de fazer nova requisição
    const mercadoData = await getMercadoStatus();
    const rodada_atual = mercadoData.rodada_atual || 1;

    const edicaoSelecionada = edicoes.find((e) => e.id === edicaoAtual);
    if (!edicaoSelecionada) {
      throw new Error(`Edição ${edicaoAtual} não encontrada.`);
    }

    const rodadaDefinicao = edicaoSelecionada.rodadaDefinicao;
    console.log(
      `[MATA-ORQUESTRADOR] Buscando ranking base da Rodada ${rodadaDefinicao}...`,
    );

    // Usar cache de ranking
    const rankingBase = await Promise.race([
      getRankingComCache(ligaId, rodadaDefinicao),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout ao buscar ranking")), 8000),
      ),
    ]);

    console.log(
      `[MATA-ORQUESTRADOR] Ranking base recebido: ${rankingBase?.length || 0} times`,
    );

    if (!Array.isArray(rankingBase) || rankingBase.length < 32) {
      throw new Error(
        `Ranking base inválido: ${rankingBase?.length || 0}/32 times encontrados`,
      );
    }

    const faseInfo = getFaseInfo(edicaoAtual, edicaoSelecionada);
    const currentFaseInfo = faseInfo[fase.toLowerCase()];
    if (!currentFaseInfo) throw new Error(`Fase desconhecida: ${fase}`);

    const {
      label: faseLabel,
      pontosRodada: rodadaPontosNum,
      numJogos,
      prevFaseRodada,
    } = currentFaseInfo;

    let timesParaConfronto = rankingBase;
    if (prevFaseRodada) {
      let vencedoresAnteriores = rankingBase;
      const rodadaInicial = edicaoSelecionada.rodadaInicial;

      for (let r = edicaoSelecionada.rodadaInicial; r <= prevFaseRodada; r++) {
        const pontosDaRodadaAnterior = await getPontosDaRodada(ligaId, r);
        const jogosFaseAnterior =
          r === edicaoSelecionada.rodadaInicial
            ? 16
            : 32 / Math.pow(2, r - edicaoSelecionada.rodadaInicial + 1);
        const confrontosAnteriores =
          r === edicaoSelecionada.rodadaInicial
            ? montarConfrontosPrimeiraFase(rankingBase, pontosDaRodadaAnterior)
            : montarConfrontosFase(
                vencedoresAnteriores,
                pontosDaRodadaAnterior,
                jogosFaseAnterior,
              );
        vencedoresAnteriores = await extrairVencedores(confrontosAnteriores);
      }
      timesParaConfronto = vencedoresAnteriores;
    }

    let isPending = rodada_atual < rodadaPontosNum;
    console.log(
      `[MATA-ORQUESTRADOR] Rodada ${rodadaPontosNum} - Status: ${isPending ? "Pendente" : "Concluída"}`,
    );

    const pontosRodadaAtual = isPending
      ? {}
      : await getPontosDaRodada(ligaId, rodadaPontosNum);

    const confrontos =
      fase === "primeira"
        ? montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual)
        : montarConfrontosFase(timesParaConfronto, pontosRodadaAtual, numJogos);

    // Calcular valores dos confrontos
    calcularValoresConfronto(confrontos, isPending);

    // Renderizar tabela
    renderTabelaMataMata(
      confrontos,
      contentId,
      faseLabel,
      edicaoAtual,
      isPending,
    );

    // Adicionar botão de exportação
    if (exportsCarregados && criarBotaoExportacaoMataMata) {
      try {
        await criarBotaoExportacaoMataMata({
          containerId: contentId,
          fase: faseLabel,
          confrontos: confrontos,
          isPending: isPending,
          rodadaPontos: getRodadaPontosText(faseLabel, edicaoAtual),
          edicao: getEdicaoMataMata(edicaoAtual),
        });
        console.log("[MATA-ORQUESTRADOR] Botão de exportação adicionado");
      } catch (exportError) {
        console.warn(
          "[MATA-ORQUESTRADOR] Erro ao adicionar botão de exportação:",
          exportError,
        );
      }
    } else {
      console.warn("[MATA-ORQUESTRADOR] Função de exportação não disponível");
    }

    // Renderizar mensagem de rodada pendente se necessário
    if (isPending) {
      renderRodadaPendente(contentId, rodadaPontosNum);
    }

    const perfEnd = performance.now();
    console.log(`[MATA-ORQUESTRADOR] ✅ Fase ${fase} carregada em ${(perfEnd - perfStart).toFixed(0)}ms`);
  } catch (err) {
    console.error(`[MATA-ORQUESTRADOR] Erro ao carregar fase ${fase}:`, err);
    renderErrorState(contentId, fase, err);
  }
}

// Função para extrair vencedores (importada de confrontos)
async function extrairVencedores(confrontos) {
  const { extrairVencedores: extrairVencedoresFunc } = await import(
    "./mata-mata-confrontos.js"
  );
  return extrairVencedoresFunc(confrontos);
}

// Cleanup global para evitar memory leaks
function setupCleanup() {
  window.addEventListener("beforeunload", () => {
    moduleCache.clear();
    exportsCarregados = false;
    rodadasCarregados = false;
    console.log("[MATA-ORQUESTRADOR] Cleanup executado");
  });

  // Interceptar erros de Promise não tratadas
  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason &&
      event.reason.message &&
      event.reason.message.includes("message channel closed")
    ) {
      event.preventDefault();
      console.log(
        "[MATA-ORQUESTRADOR] Promise rejection interceptada e ignorada",
      );
    }
  });
}

// Inicialização do módulo
setupCleanup();

console.log("[MATA-ORQUESTRADOR] Módulo carregado com arquitetura refatorada");
