// PONTOS CORRIDOS ORQUESTRADOR - Coordenador Principal
// Responsável por: coordenação de módulos, carregamento dinâmico, inicialização

import {
  PONTOS_CORRIDOS_CONFIG,
  getLigaId,
  validarConfiguracao,
} from "./pontos-corridos-config.js";

import {
  setRankingFunction,
  gerarConfrontos,
  buscarTimesLiga,
  calcularClassificacao,
  processarDadosRodada,
  normalizarDadosParaExportacao,
  normalizarClassificacaoParaExportacao,
  validarDadosEntrada,
  buscarStatusMercado,
} from "./pontos-corridos-core.js";

import {
  renderizarInterface,
  renderizarSeletorRodadasModerno,
  renderLoadingState,
  renderErrorState,
  renderTabelaRodada,
  renderTabelaClassificacao,
  atualizarContainer,
  configurarBotaoVoltar,
} from "./pontos-corridos-ui.js";

import {
  getStatusMercadoCache,
  getTimesLigaCache,
  getRankingRodadaCache,
  getClassificacaoCache,
  setClassificacaoCache,
  clearCache,
} from "./pontos-corridos-cache.js";

// Variáveis dinâmicas para exports
let criarBotaoExportacaoRodada = null;
let exportarPontosCorridosRodadaComoImagem = null;
let exportarPontosCorridosClassificacaoComoImagem = null;
let exportsCarregados = false;
let exportsCarregando = false;

// Variáveis dinâmicas para rodadas
let getRankingRodadaEspecifica = null;
let rodadasCarregados = false;
let rodadasCarregando = false;

// Cache de módulos
const moduleCache = new Map();

// Estado atual
let times = [];
let confrontos = [];
let rodadaAtualBrasileirao = 1;
let ligaId = null;

// Função de carregamento dinâmico dos exports
async function carregarExports() {
  if (exportsCarregados) return true;
  if (exportsCarregando) {
    return aguardarCarregamento(() => exportsCarregados);
  }

  exportsCarregando = true;

  try {
    if (moduleCache.has("exports")) {
      const cached = moduleCache.get("exports");
      Object.assign(window, cached);
      exportsCarregados = true;
      console.log("[PONTOS-CORRIDOS-ORQUESTRADOR] Exports carregados do cache");
      return true;
    }

    console.log(
      "[PONTOS-CORRIDOS-ORQUESTRADOR] Carregando módulo de exports...",
    );

    // Tenta carregar módulo centralizado primeiro
    try {
      const exportModule = await import("../exports/export-exports.js");
      if (exportModule?.exportarPontosCorridos) {
        criarBotaoExportacaoRodada = exportModule.exportarPontosCorridos;
        moduleCache.set("exports", { criarBotaoExportacaoRodada });
        exportsCarregados = true;
        console.log(
          "[PONTOS-CORRIDOS-ORQUESTRADOR] Exports carregados via função centralizada",
        );
        return true;
      }
    } catch (error) {
      console.warn(
        "[PONTOS-CORRIDOS-ORQUESTRADOR] Função centralizada não disponível",
      );
    }

    // Carrega módulo específico
    const exportPontosCorridosModule = await import(
      "../exports/export-pontos-corridos.js"
    );
    if (exportPontosCorridosModule) {
      criarBotaoExportacaoRodada =
        exportPontosCorridosModule.criarBotaoExportacaoPontosCorridosRodada;
      exportarPontosCorridosRodadaComoImagem =
        exportPontosCorridosModule.exportarPontosCorridosRodadaComoImagem;
      exportarPontosCorridosClassificacaoComoImagem =
        exportPontosCorridosModule.criarBotaoExportacaoPontosCorridosClassificacao;

      moduleCache.set("exports", {
        criarBotaoExportacaoRodada,
        exportarPontosCorridosRodadaComoImagem,
        exportarPontosCorridosClassificacaoComoImagem,
      });
      exportsCarregados = true;
      console.log(
        "[PONTOS-CORRIDOS-ORQUESTRADOR] Exports carregados via módulo específico",
      );
      return true;
    }

    throw new Error("Nenhuma função de exportação encontrada");
  } catch (error) {
    console.warn(
      "[PONTOS-CORRIDOS-ORQUESTRADOR] Erro ao carregar exports:",
      error,
    );
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
    return aguardarCarregamento(() => rodadasCarregados);
  }

  rodadasCarregando = true;

  try {
    if (moduleCache.has("rodadas")) {
      const cached = moduleCache.get("rodadas");
      getRankingRodadaEspecifica = cached.getRankingRodadaEspecifica;
      setRankingFunction(getRankingRodadaEspecifica);
      rodadasCarregados = true;
      console.log(
        "[PONTOS-CORRIDOS-ORQUESTRADOR] Módulo rodadas carregado do cache",
      );
      return true;
    }

    console.log("[PONTOS-CORRIDOS-ORQUESTRADOR] Carregando módulo rodadas...");
    const rodadasModule = await import("../rodadas.js");

    if (rodadasModule?.getRankingRodadaEspecifica) {
      getRankingRodadaEspecifica = rodadasModule.getRankingRodadaEspecifica;
      setRankingFunction(getRankingRodadaEspecifica);

      moduleCache.set("rodadas", { getRankingRodadaEspecifica });
      rodadasCarregados = true;
      console.log(
        "[PONTOS-CORRIDOS-ORQUESTRADOR] Módulo rodadas carregado com sucesso",
      );
      return true;
    } else {
      throw new Error("Função getRankingRodadaEspecifica não encontrada");
    }
  } catch (error) {
    console.error(
      "[PONTOS-CORRIDOS-ORQUESTRADOR] Erro ao carregar módulo rodadas:",
      error,
    );
    rodadasCarregados = false;
    return false;
  } finally {
    rodadasCarregando = false;
  }
}

// Função auxiliar para aguardar carregamento
function aguardarCarregamento(checkFunction) {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const checkInterval = setInterval(() => {
      if (checkFunction()) {
        clearInterval(checkInterval);
        controller.abort();
        resolve(true);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      controller.abort();
      resolve(false);
    }, 5000);
  });
}

// ✅ FUNÇÃO PRINCIPAL CORRIGIDA - Usando nova interface
export async function carregarPontosCorridos() {
  const container = document.getElementById("pontos-corridos");
  if (!container) return;

  console.log("[PONTOS-CORRIDOS-ORQUESTRADOR] Iniciando carregamento...");

  try {
    // Validar configuração
    const config = validarConfiguracao();
    ligaId = config.ligaId;

    // Pré-carregar dependências
    console.log(
      "[PONTOS-CORRIDOS-ORQUESTRADOR] Pré-carregando dependências...",
    );
    const [rodadasOk, exportsOk] = await Promise.all([
      carregarRodadas(),
      carregarExports(),
    ]);

    if (!rodadasOk) {
      console.warn(
        "[PONTOS-CORRIDOS-ORQUESTRADOR] Módulo rodadas não carregou",
      );
    }
    if (!exportsOk) {
      console.warn(
        "[PONTOS-CORRIDOS-ORQUESTRADOR] Módulo exports não carregou",
      );
    }

    // Buscar dados iniciais
    const [status, timesData] = await Promise.all([
      getStatusMercadoCache(),
      getTimesLigaCache(ligaId),
    ]);

    rodadaAtualBrasileirao = status.rodada_atual || 1;

    // ✅ VALIDAR APENAS TIMES PRIMEIRO (sem confrontos)
    if (!Array.isArray(timesData) || timesData.length === 0) {
      throw new Error("Lista de times inválida ou vazia");
    }

    const timesValidos = timesData.filter((t) => t && typeof t.id === "number");
    if (timesValidos.length === 0) {
      throw new Error("Nenhum time com ID numérico válido encontrado");
    }

    times = timesValidos;

    // ✅ GERAR CONFRONTOS APÓS VALIDAR TIMES
    confrontos = gerarConfrontos(times);

    // ✅ AGORA VALIDAR COM CONFRONTOS GERADOS
    try {
      validarDadosEntrada(times, confrontos);
      console.log("[PONTOS-CORRIDOS-ORQUESTRADOR] Dados validados com sucesso");
    } catch (validationError) {
      console.warn(
        "[PONTOS-CORRIDOS-ORQUESTRADOR] Aviso de validação:",
        validationError.message,
      );
      // Continuar execução mesmo com warning de validação
    }

    // Verificar se há confrontos suficientes
    if (confrontos.length === 0) {
      throw new Error("Não foi possível gerar confrontos para esta liga");
    }

    console.log(
      `[PONTOS-CORRIDOS-ORQUESTRADOR] ${times.length} times, ${confrontos.length} rodadas de confrontos`,
    );

    // ✅ RENDERIZAR INTERFACE REDESENHADA
    renderizarInterface(
      container,
      ligaId,
      handleRodadaChange,
      handleClassificacaoClick,
    );

    // ✅ USAR NOVA FUNÇÃO DE MINI-CARDS
    renderizarSeletorRodadasModerno(
      confrontos,
      rodadaAtualBrasileirao,
      handleRodadaChange,
      handleClassificacaoClick,
    );

    // Carregar primeira rodada
    await renderRodada(0);

    console.log(
      "[PONTOS-CORRIDOS-ORQUESTRADOR] Sistema inicializado com UX redesenhado",
    );
  } catch (error) {
    console.error(
      "[PONTOS-CORRIDOS-ORQUESTRADOR] Erro na inicialização:",
      error,
    );
    renderErrorState("pontos-corridos", error);
  }
}

// Handler para mudança de rodada
async function handleRodadaChange(idxRodada) {
  await renderRodada(idxRodada);
}

// Handler para classificação
async function handleClassificacaoClick() {
  await renderClassificacao();
}

// Função para renderizar rodada específica
async function renderRodada(idxRodada) {
  const containerId = "pontosCorridosRodada";
  const rodadaCartola = PONTOS_CORRIDOS_CONFIG.rodadaInicial + idxRodada;

  renderLoadingState(
    containerId,
    `Carregando dados da rodada ${idxRodada + 1}`,
  );

  try {
    // Verificar dependências
    if (!getRankingRodadaEspecifica) {
      throw new Error("Módulo rodadas não disponível");
    }

    const jogos = confrontos[idxRodada];
    const isRodadaPassada = rodadaCartola < rodadaAtualBrasileirao;

    let pontuacoesMap = {};
    if (isRodadaPassada) {
      const resultado = await processarDadosRodada(
        ligaId,
        rodadaCartola,
        jogos,
      );
      pontuacoesMap = resultado.pontuacoesMap;
    }

    // Renderizar tabela
    const tabelaHtml = renderTabelaRodada(
      jogos,
      idxRodada,
      pontuacoesMap,
      rodadaAtualBrasileirao,
    );
    atualizarContainer(containerId, tabelaHtml);

    // Adicionar botão de exportação
    if (exportsCarregados && criarBotaoExportacaoRodada) {
      const jogosNormalizados = jogos.map((jogo) =>
        normalizarDadosParaExportacao(jogo, pontuacoesMap),
      );

      await criarBotaoExportacaoRodada({
        containerId: "exportPontosCorridosRodadaBtnContainer",
        jogos: jogosNormalizados,
        rodadaLiga: idxRodada + 1,
        rodadaCartola: rodadaCartola,
        times: times,
        tipo: "pontos-corridos-rodada",
      });
    }

    console.log(
      `[PONTOS-CORRIDOS-ORQUESTRADOR] Rodada ${idxRodada + 1} carregada`,
    );
  } catch (error) {
    console.error(
      `[PONTOS-CORRIDOS-ORQUESTRADOR] Erro ao carregar rodada ${idxRodada + 1}:`,
      error,
    );
    renderErrorState(containerId, error);
  }
}

// Função para renderizar classificação
async function renderClassificacao() {
  const containerId = "pontosCorridosRodada";

  renderLoadingState(containerId, "Calculando classificação");

  try {
    // Verificar cache primeiro
    let resultado = getClassificacaoCache(ligaId, rodadaAtualBrasileirao);

    if (!resultado) {
      // Calcular classificação
      resultado = await calcularClassificacao(
        ligaId,
        times,
        confrontos,
        rodadaAtualBrasileirao,
      );

      // Armazenar no cache
      setClassificacaoCache(resultado, ligaId, rodadaAtualBrasileirao);
    }

    const { classificacao, ultimaRodadaComDados, houveErro } = resultado;

    // Renderizar tabela
    const tabelaHtml = renderTabelaClassificacao(
      classificacao,
      ultimaRodadaComDados,
      houveErro,
    );
    atualizarContainer(containerId, tabelaHtml);

    // Configurar botão voltar
    configurarBotaoVoltar(() => {
      // Voltar para a rodada selecionada ou primeira
      const rodadaSelecionada = document.querySelector(
        ".rodada-card.selecionada",
      );
      const index = rodadaSelecionada
        ? Array.from(document.querySelectorAll(".rodada-card")).indexOf(
            rodadaSelecionada,
          )
        : 0;
      renderRodada(index);
    });

    // Adicionar botão de exportação da classificação
    if (exportsCarregados && exportarPontosCorridosClassificacaoComoImagem) {
      const classificacaoNormalizada =
        normalizarClassificacaoParaExportacao(classificacao);

      await exportarPontosCorridosClassificacaoComoImagem({
        containerId: "exportClassificacaoPontosCorridosBtnContainer",
        times: classificacaoNormalizada,
        rodadaLiga: ultimaRodadaComDados,
        rodadaCartola:
          PONTOS_CORRIDOS_CONFIG.rodadaInicial + ultimaRodadaComDados - 1,
        tipo: "pontos-corridos-classificacao",
      });
    }

    console.log(
      "[PONTOS-CORRIDOS-ORQUESTRADOR] Classificação carregada com sucesso",
    );
  } catch (error) {
    console.error(
      "[PONTOS-CORRIDOS-ORQUESTRADOR] Erro ao carregar classificação:",
      error,
    );
    renderErrorState(containerId, error);
  }
}

// Função para inicializar (compatibilidade com código atual)
export async function inicializarPontosCorridos() {
  await carregarPontosCorridos();
}

// Função para renderizar rodada com template (compatibilidade)
export async function renderRodadaComTemplate(idxRodada) {
  await renderRodada(idxRodada);
}

// Cleanup para evitar memory leaks
function setupCleanup() {
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      moduleCache.clear();
      clearCache();
      exportsCarregados = false;
      rodadasCarregados = false;
      console.log("[PONTOS-CORRIDOS-ORQUESTRADOR] Cleanup executado");
    });

    // Interceptar erros de Promise não tratadas
    window.addEventListener("unhandledrejection", (event) => {
      if (event.reason?.message?.includes("message channel closed")) {
        event.preventDefault();
        console.log(
          "[PONTOS-CORRIDOS-ORQUESTRADOR] Promise rejection interceptada e ignorada",
        );
      }
    });
  }
}

// Inicialização do módulo
setupCleanup();

console.log(
  "[PONTOS-CORRIDOS-ORQUESTRADOR] Módulo carregado com UX redesenhado",
);
