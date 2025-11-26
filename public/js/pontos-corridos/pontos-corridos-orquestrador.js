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

// Variáveis dinâmicas para rodadas
let getRankingRodadaEspecifica = null;
let rodadasCarregados = false;
let rodadasCarregando = false;

// Cache de módulos
const moduleCache = new Map();

// Estado do orquestrador
let estadoOrquestrador = {
  ligaId: null,
  times: [],
  confrontos: [],
  rodadaAtualBrasileirao: 1,
  classificacaoAtual: null,
  ultimaRodadaComDados: 0,
  houveErro: false,
  carregando: false,
  visualizacaoAtual: 'rodadas', // 'rodadas' ou 'classificacao'
  rodadaSelecionada: 1,
};

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
    estadoOrquestrador.ligaId = config.ligaId;

    // Pré-carregar dependências
    console.log(
      "[PONTOS-CORRIDOS-ORQUESTRADOR] Pré-carregando dependências...",
    );
    const rodadasOk = await carregarRodadas();

    if (!rodadasOk) {
      console.warn(
        "[PONTOS-CORRIDOS-ORQUESTRADOR] Módulo rodadas não carregou",
      );
    }

    // Buscar dados iniciais
    const [status, timesData] = await Promise.all([
      getStatusMercadoCache(),
      getTimesLigaCache(estadoOrquestrador.ligaId),
    ]);

    estadoOrquestrador.rodadaAtualBrasileirao = status.rodada_atual || 1;

    // ✅ VALIDAR APENAS TIMES PRIMEIRO (sem confrontos)
    if (!Array.isArray(timesData) || timesData.length === 0) {
      throw new Error("Lista de times inválida ou vazia");
    }

    const timesValidos = timesData.filter((t) => t && typeof t.id === "number");
    if (timesValidos.length === 0) {
      throw new Error("Nenhum time com ID numérico válido encontrado");
    }

    estadoOrquestrador.times = timesValidos;

    // ✅ GERAR CONFRONTOS APÓS VALIDAR TIMES
    estadoOrquestrador.confrontos = gerarConfrontos(estadoOrquestrador.times);

    // ✅ AGORA VALIDAR COM CONFRONTOS GERADOS
    try {
      validarDadosEntrada(estadoOrquestrador.times, estadoOrquestrador.confrontos);
      console.log("[PONTOS-CORRIDOS-ORQUESTRADOR] Dados validados com sucesso");
    } catch (validationError) {
      console.warn(
        "[PONTOS-CORRIDOS-ORQUESTRADOR] Aviso de validação:",
        validationError.message,
      );
      // Continuar execução mesmo com warning de validação
    }

    // Verificar se há confrontos suficientes
    if (estadoOrquestrador.confrontos.length === 0) {
      throw new Error("Não foi possível gerar confrontos para esta liga");
    }

    console.log(
      `[PONTOS-CORRIDOS-ORQUESTRADOR] ${estadoOrquestrador.times.length} times, ${estadoOrquestrador.confrontos.length} rodadas de confrontos`,
    );

    // ✅ RENDERIZAR INTERFACE REDESENHADA
    renderizarInterface(
      container,
      estadoOrquestrador.ligaId,
      handleRodadaChange,
      handleClassificacaoClick,
    );

    // ✅ USAR NOVA FUNÇÃO DE MINI-CARDS
    renderizarSeletorRodadasModerno(
      estadoOrquestrador.confrontos,
      estadoOrquestrador.rodadaAtualBrasileirao,
      handleRodadaChange,
      handleClassificacaoClick,
    );

    // Carregar primeira rodada
    await renderRodada(estadoOrquestrador.rodadaSelecionada);

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
async function renderRodada(rodadaNum) {
  const containerId = "pontosCorridosRodada";

  // CORREÇÃO: Validar rodadaNum
  if (!rodadaNum || rodadaNum < 1 || rodadaNum > estadoOrquestrador.confrontos.length) {
    console.error(`[PONTOS-CORRIDOS-ORQUESTRADOR] Rodada inválida: ${rodadaNum}`);
    renderErrorState(containerId, new Error(`Rodada ${rodadaNum} inválida`));
    return;
  }

  const rodadaCartola = PONTOS_CORRIDOS_CONFIG.rodadaInicial + rodadaNum - 1; // Ajuste para índice 0

  renderLoadingState(
    containerId,
    `Carregando dados da rodada ${rodadaNum}`,
  );

  // Limpar container de exportação do topo (usado pela classificação)
  const containerTopoExportacao = document.getElementById(
    "exportPontosCorridosContainer",
  );
  if (containerTopoExportacao) {
    containerTopoExportacao.innerHTML = "";
  }

  try {
    // Verificar dependências
    if (!getRankingRodadaEspecifica) {
      throw new Error("Módulo rodadas não disponível");
    }

    const jogos = estadoOrquestrador.confrontos[rodadaNum - 1]; // Ajuste para índice 0

    // CORREÇÃO: Validar se jogos existe
    if (!jogos || jogos.length === 0) {
      throw new Error(`Confrontos não encontrados para rodada ${rodadaNum}`);
    }

    const isRodadaPassada = rodadaCartola < estadoOrquestrador.rodadaAtualBrasileirao;

    let pontuacoesMap = {};
    if (isRodadaPassada) {
      const resultado = await processarDadosRodada(
        estadoOrquestrador.ligaId,
        rodadaCartola,
        jogos,
      );
      pontuacoesMap = resultado.pontuacoesMap;
    }

    // Renderizar tabela (CORREÇÃO: passar rodadaNum diretamente, não -1)
    const tabelaHtml = renderTabelaRodada(
      jogos,
      rodadaNum, // CORREÇÃO: passar o número da rodada da liga (1-31)
      pontuacoesMap,
      estadoOrquestrador.rodadaAtualBrasileirao,
    );
    atualizarContainer(containerId, tabelaHtml);

    console.log(
      `[PONTOS-CORRIDOS-ORQUESTRADOR] Rodada ${rodadaNum} carregada`,
    );
  } catch (error) {
    console.error(
      `[PONTOS-CORRIDOS-ORQUESTRADOR] Erro ao carregar rodada ${rodadaNum}:`,
      error,
    );
    renderErrorState(containerId, error);
  }
}

// Função para renderizar classificação
async function renderClassificacao() {
  const containerId = "pontosCorridosRodada"; // O container principal será reutilizado

  renderLoadingState(containerId, "Calculando classificação");

  try {
    // Verificar cache primeiro
    let resultado = getClassificacaoCache(estadoOrquestrador.ligaId, estadoOrquestrador.rodadaAtualBrasileirao);

    if (!resultado) {
      // Calcular classificação
      resultado = await calcularClassificacao(
        estadoOrquestrador.ligaId,
        estadoOrquestrador.times,
        estadoOrquestrador.confrontos,
        estadoOrquestrador.rodadaAtualBrasileirao,
      );

      // Armazenar no cache
      setClassificacaoCache(resultado, estadoOrquestrador.ligaId, estadoOrquestrador.rodadaAtualBrasileirao);
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
      // Voltar para a rodada selecionada
      renderRodada(estadoOrquestrador.rodadaSelecionada);
    });

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

// --- Funções de UI e Navegação ---

// Função para renderizar a interface completa do módulo
async function renderizarInterfaceCompleta(container) {
  console.log("[ORQUESTRADOR] Renderizando interface completa");

  const html = `
    <div class="content-card">
      <div class="card-header">
        <h2>Liga Pontos Corridos</h2>
        <div class="card-subtitle">Sistema de confrontos todos contra todos</div>
      </div>
      <div class="pontos-corridos-nav">
        <button class="nav-btn ${estadoOrquestrador.visualizacaoAtual === 'rodadas' ? 'active' : ''}" data-view="rodadas">Rodadas</button>
        <button class="nav-btn ${estadoOrquestrador.visualizacaoAtual === 'classificacao' ? 'active' : ''}" data-view="classificacao">Classificação</button>
      </div>
      <div id="pontos-corridos-content"></div>
      ${configurarBotaoVoltar()}
    </div>
  `;

  container.innerHTML = html;

  // Configurar navegação
  setupNavegacao();

  // Renderizar visualização atual
  if (estadoOrquestrador.visualizacaoAtual === 'classificacao') {
    renderizarClassificacao();
  } else {
    await renderizarRodada(estadoOrquestrador.rodadaSelecionada);
  }
}

// Configuração da navegação entre as abas (Rodadas/Classificação)
function setupNavegacao() {
  const navBtns = document.querySelectorAll(".pontos-corridos-nav .nav-btn");

  navBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const view = btn.dataset.view;

      // Atualizar estado
      estadoOrquestrador.visualizacaoAtual = view;

      // Atualizar botões ativos
      navBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Renderizar view
      if (view === "classificacao") {
        renderizarClassificacao();
      } else {
        // Voltar para a rodada previamente selecionada
        await renderizarRodada(estadoOrquestrador.rodadaSelecionada);
      }
    });
  });
}

// Atualiza a função renderizarRodada para salvar o estado da rodada selecionada
async function renderizarRodada(rodadaNum) {
  const contentDiv = document.getElementById("pontos-corridos-content");
  if (!contentDiv) return;

  try {
    console.log(`[ORQUESTRADOR] Renderizando rodada ${rodadaNum}`);

    // Salvar rodada selecionada no estado
    estadoOrquestrador.rodadaSelecionada = rodadaNum;

    // Renderizar seletor
    renderSeletorRodada(
      contentDiv,
      estadoOrquestrador.confrontos.length,
      rodadaNum,
      estadoOrquestrador.ultimaRodadaComDados,
    );

    // Buscar dados da rodada
    const rodadaCartola = calcularRodadaBrasileirao(rodadaNum - 1);
    const jogos = estadoOrquestrador.confrontos[rodadaNum - 1];

    const { pontuacoesMap } = await processarDadosRodada(
      estadoOrquestrador.ligaId,
      rodadaCartola,
      jogos,
    );

    // Renderizar tabela
    renderTabelaRodada(contentDiv, jogos, pontuacoesMap, rodadaNum);

    // Configurar listeners do seletor
    setupSeletorRodada();
  } catch (error) {
    console.error(`[ORQUESTRADOR] Erro ao renderizar rodada ${rodadaNum}:`, error);
  }
}

// Função auxiliar para calcular a rodada do Brasileirão (baseada na configuração)
function calcularRodadaBrasileirao(indiceRodada) {
    return PONTOS_CORRIDOS_CONFIG.rodadaInicial + indiceRodada;
}

// Funções auxiliares de UI e Navegação que precisam ser definidas ou importadas
// Exemplo: renderSeletorRodada, setupSeletorRodada, etc.
// Estas funções devem estar presentes em 'pontos-corridos-ui.js' ou importadas de outro lugar.

// Placeholder para renderSeletorRodada se não estiver importado/definido
if (typeof renderSeletorRodada === 'undefined') {
    globalThis.renderSeletorRodada = function(container, totalRodadas, rodadaAtual, ultimaRodadaComDados) {
        console.warn('[PONTOS-CORRIDOS-ORQUESTRADOR] renderSeletorRodada não definida. Renderizando placeholder.');
        container.innerHTML += '<div class="placeholder-seletor-rodada">Seletor de Rodadas (Placeholder)</div>';
    };
}

// Placeholder para setupSeletorRodada se não estiver importado/definido
if (typeof setupSeletorRodada === 'undefined') {
    globalThis.setupSeletorRodada = function() {
        console.warn('[PONTOS-CORRIDOS-ORQUESTRADOR] setupSeletorRodada não definida. Adicionando placeholder listener.');
        // Adiciona um listener genérico para simular funcionalidade
        const selectorContainer = document.querySelector('#pontos-corridos-content'); // Assumindo que o seletor está dentro do content
        if (selectorContainer) {
            selectorContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('nav-btn') && e.target.dataset.view === 'rodadas') {
                    console.log('[PONTOS-CORRIDOS-ORQUESTRADOR] Placeholder: Rodada clicada');
                    // Aqui você simularia a troca de rodada se necessário
                }
            });
        }
    };
}