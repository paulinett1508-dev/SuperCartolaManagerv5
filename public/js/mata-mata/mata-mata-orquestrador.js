// MATA-MATA ORQUESTRADOR - Coordenador Principal
// Responsável por: coordenação de módulos, carregamento dinâmico, cache

import { edicoes, getFaseInfo, getLigaId, getRodadaPontosText, getEdicaoMataMata } from "./mata-mata-config.js";
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
  renderBannerCampeao,
} from "./mata-mata-ui.js";
import { cacheManager } from "../core/cache-manager.js";

// Variáveis dinâmicas para exports
let criarBotaoExportacaoMataMata = null;
let exportsCarregados = false;
let exportsCarregando = false;

// Variáveis dinâmicas para rodadas
let getRankingRodadaEspecifica = null;
let rodadasCarregados = false;
let rodadasCarregando = false;

// Cache de módulos (mantido para compatibilidade)
const moduleCache = new Map();

// Configuração de cache persistente
const CACHE_CONFIG = {
  ttl: {
    confrontos: 30 * 60 * 1000, // 30 minutos
    edicao: 60 * 60 * 1000, // 1 hora
    rodadaConsolidada: Infinity, // Cache permanente para rodadas fechadas
  }
};

// Estado atual
let edicaoAtual = null;

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

    console.log("[MATA-ORQUESTRADOR] Sistema de exports não implementado (opcional)");
    // Função de export pode ser implementada futuramente se necessário
    exportsCarregados = true; // Retorna sucesso para não bloquear o carregamento
    return true;

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

// Função principal para carregar mata-mata
export async function carregarMataMata() {
  const container = document.getElementById("mata-mata");
  if (!container) return;

  console.log("[MATA-ORQUESTRADOR] Iniciando carregamento do mata-mata...");

  try {
    console.log("[MATA-ORQUESTRADOR] Pré-carregando dependências...");
    const [rodadasOk, exportsOk] = await Promise.all([
      carregarRodadas(),
      carregarExports(),
    ]);
    if (!rodadasOk)
      console.warn("[MATA-ORQUESTRADOR] Módulo rodadas não carregou");
    if (!exportsOk)
      console.warn("[MATA-ORQUESTRADOR] Módulo exports não carregou");
  } catch (error) {
    console.warn("[MATA-ORQUESTRADOR] Erro no pré-carregamento:", error);
  }

  const ligaId = getLigaId();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch("/api/cartola/mercado/status", {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const rodadaAtual = data.rodada_atual || 1;
      edicoes.forEach((edicao) => {
        edicao.ativo = rodadaAtual >= edicao.rodadaDefinicao;
      });
    }
  } catch (error) {
    console.warn(
      "[MATA-ORQUESTRADOR] Erro ao verificar status do mercado:",
      error,
    );
  }

  renderizarInterface(container, ligaId, handleEdicaoChange, handleFaseClick);
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

// Função auxiliar para cache de confrontos
async function getCachedConfrontos(ligaId, edicao, fase, rodadaPontos) {
  const cacheKey = `matamata_confrontos_${ligaId}_${edicao}_${fase}_${rodadaPontos}`;

  return await cacheManager.get(
    "rodadas",
    cacheKey,
    null,
    { ttl: CACHE_CONFIG.ttl.confrontos }
  );
}

async function setCachedConfrontos(ligaId, edicao, fase, rodadaPontos, confrontos) {
  const cacheKey = `matamata_confrontos_${ligaId}_${edicao}_${fase}_${rodadaPontos}`;

  await cacheManager.set("rodadas", cacheKey, confrontos);
  console.log(`[MATA-ORQUESTRADOR] Confrontos salvos em cache: ${cacheKey}`);
}

// Função para carregar uma fase específica
async function carregarFase(fase, ligaId) {
  const contentId = "mataMataContent";
  const contentElement = document.getElementById(contentId);

  if (!contentElement) {
    console.error("[MATA-ORQUESTRADOR] Elemento de conteúdo não encontrado");
    return;
  }

  console.log(`[MATA-ORQUESTRADOR] Carregando fase: ${fase}`);

  renderLoadingState(contentId, fase, edicaoAtual);

  try {
    const dependenciasOk = await Promise.all([
      carregarRodadas(),
      carregarExports(),
    ]);

    if (!dependenciasOk[0]) {
      throw new Error(
        "Módulo rodadas não disponível - não é possível calcular confrontos",
      );
    }

    if (!edicaoAtual) {
      renderInstrucaoInicial(contentId);
      return;
    }

    let rodada_atual = 1;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const resMercado = await fetch("/api/cartola/mercado/status", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resMercado.ok) {
        const data = await resMercado.json();
        rodada_atual = data.rodada_atual || 1;
      }
    } catch (err) {
      console.warn("[MATA-ORQUESTRADOR] Usando rodada padrão:", err.message);
    }

    const edicaoSelecionada = edicoes.find((e) => e.id === edicaoAtual);
    if (!edicaoSelecionada) {
      throw new Error(`Edição ${edicaoAtual} não encontrada.`);
    }

    const rodadaDefinicao = edicaoSelecionada.rodadaDefinicao;
    console.log(
      `[MATA-ORQUESTRADOR] Buscando ranking base da Rodada ${rodadaDefinicao}...`,
    );

    const rankingBase = await Promise.race([
      getRankingRodadaEspecifica(ligaId, rodadaDefinicao),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout ao buscar ranking")), 10000),
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

    let isPending = rodada_atual < rodadaPontosNum;
    console.log(
      `[MATA-ORQUESTRADOR] Rodada ${rodadaPontosNum} - Status: ${isPending ? "Pendente" : "Concluída"}`,
    );

    // ✅ TENTAR CACHE PRIMEIRO (apenas para rodadas consolidadas)
    if (!isPending) {
      const cachedConfrontos = await getCachedConfrontos(ligaId, edicaoAtual, fase, rodadaPontosNum);

      if (cachedConfrontos) {
        console.log(`[MATA-ORQUESTRADOR] 💾 Confrontos recuperados do cache`);
        renderTabelaMataMata(cachedConfrontos, contentId, faseLabel, edicaoAtual, isPending);

        if (dependenciasOk[1] && criarBotaoExportacaoMataMata) {
          try {
            await criarBotaoExportacaoMataMata({
              containerId: contentId,
              fase: faseLabel,
              confrontos: cachedConfrontos,
              isPending: isPending,
              rodadaPontos: getRodadaPontosText(faseLabel, edicaoAtual),
              edicao: getEdicaoMataMata(edicaoAtual),
            });
          } catch (exportError) {
            console.warn("[MATA-ORQUESTRADOR] Erro ao adicionar botão de exportação:", exportError);
          }
        }

        if (fase === "final" && cachedConfrontos.length > 0) {
          const edicaoNome = edicaoSelecionada.nome;
          renderBannerCampeao(contentId, cachedConfrontos[0], edicaoNome, isPending);
        }

        return; // ✅ RETORNA CEDO COM CACHE
      }
    }

    // ❌ CACHE MISS - CALCULAR
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

    const pontosRodadaAtual = isPending
      ? {}
      : await getPontosDaRodada(ligaId, rodadaPontosNum);

    const confrontos =
      fase === "primeira"
        ? montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual)
        : montarConfrontosFase(timesParaConfronto, pontosRodadaAtual, numJogos);

    // ✅ SALVAR NO CACHE (apenas se rodada consolidada)
    if (!isPending) {
      await setCachedConfrontos(ligaId, edicaoAtual, fase, rodadaPontosNum, confrontos);
    }

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
    if (dependenciasOk[1] && criarBotaoExportacaoMataMata) {
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

    // Renderizar banner do campeão na FINAL (apenas se não estiver pendente)
    if (fase === "final" && !isPending && confrontos.length > 0) {
      const edicaoNome = edicaoSelecionada.nome;
      renderBannerCampeao(contentId, confrontos[0], edicaoNome, isPending);
      console.log(`[MATA-ORQUESTRADOR] Banner do campeão renderizado para ${edicaoNome}`);
    }

    console.log(`[MATA-ORQUESTRADOR] Fase ${fase} carregada com sucesso`);
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