// PONTOS CORRIDOS ORQUESTRADOR - v3.2 Coordenador Principal
// ✅ v3.2: Configuração dinâmica via API (sem hardcodes)
// ✅ v3.1: FIX CRÍTICO - Verifica temporada da API antes de assumir dados anteriores
// ✅ v3.0: MODO SOMENTE LEITURA - Temporada encerrada, dados consolidados do cache
// ✅ v2.5: Detecção dinâmica de temporada (R1 + mercado aberto = temporada anterior)
// ✅ v2.4: FIX - Container IDs múltiplos + caminho absoluto rodadas.js
// ✅ v2.3: CORREÇÃO - Usar buscarTimesLiga (enriquecido) ao invés de cache
// Responsável por: coordenação de módulos, carregamento dinâmico, inicialização

import {
  PONTOS_CORRIDOS_CONFIG,
  getLigaId,
  validarConfiguracao,
  inicializarConfig,
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
  visualizacaoAtual: "rodadas", // 'rodadas' ou 'classificacao'
  rodadaSelecionada: 1,
  // v3.0: Modo somente leitura para temporada encerrada
  temporadaEncerrada: false,
  dadosConsolidados: null, // Dados do cache quando temporada encerrada
  semDadosConsolidados: false,
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
    // ✅ v2.4: Caminho absoluto para evitar erro de resolução
    const rodadasModule = await import("/js/rodadas.js");

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

// v3.1: Renderizar UI de aguardando dados
function renderizarAguardandoDados(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="pontos-corridos-aguardando" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
      border-radius: 16px;
      border: 1px solid rgba(255, 136, 0, 0.2);
      min-height: 300px;
      margin: 20px;
    ">
      <span class="material-icons" style="
        font-size: 64px;
        color: var(--laranja, #ff8800);
        margin-bottom: 20px;
      ">leaderboard</span>
      <h2 style="
        font-family: 'Russo One', sans-serif;
        color: white;
        font-size: 24px;
        margin-bottom: 12px;
      ">Aguardando Início do Campeonato</h2>
      <p style="
        color: rgba(255, 255, 255, 0.7);
        font-size: 16px;
        max-width: 400px;
        line-height: 1.5;
      ">
        A tabela de Pontos Corridos será atualizada assim que as primeiras rodadas forem concluídas.
      </p>
    </div>
  `;
}

// ✅ FUNÇÃO PRINCIPAL CORRIGIDA - Usando nova interface
export async function carregarPontosCorridos() {
  // ✅ v2.4: Buscar múltiplos IDs possíveis
  const container =
    document.getElementById("pontos-corridos") ||
    document.getElementById("pontos-corridos-container");

  if (!container) {
    console.error(
      "[PONTOS-CORRIDOS-ORQUESTRADOR] ❌ Container não encontrado (tentou: pontos-corridos, pontos-corridos-container)",
    );
    return;
  }

  console.log(
    "[PONTOS-CORRIDOS-ORQUESTRADOR] ✅ Container encontrado:",
    container.id,
  );

  try {
    // ✅ v3.2: Inicializar configuração dinâmica ANTES de validar
    const ligaId = getLigaId();
    if (ligaId) {
      console.log("[PONTOS-CORRIDOS-ORQUESTRADOR] 🔧 Inicializando configuração dinâmica...");
      await inicializarConfig(ligaId);
    }

    // Validar configuração
    const config = validarConfiguracao();
    estadoOrquestrador.ligaId = config.ligaId;

    // Buscar status do mercado primeiro
    const status = await getStatusMercadoCache();
    let rodadaAtual = status.rodada_atual || 1;
    const mercadoAberto = status.status_mercado === 1;
    const temporadaAPI = status.temporada || new Date().getFullYear();
    const anoAtual = new Date().getFullYear();
    const RODADA_FINAL_CAMPEONATO = status.rodada_final || 38;

    // ✅ v3.1: DETECÇÃO DE TEMPORADA COM VERIFICAÇÃO DO ANO
    // Só assumir "temporada anterior" se API retornar ano < atual
    if (rodadaAtual === 1 && mercadoAberto) {
      // v3.1: Se API já retorna ano atual, NÃO há dados anteriores para esta liga
      if (temporadaAPI >= anoAtual) {
        console.log(`[PONTOS-CORRIDOS-ORQUESTRADOR] 🕐 Temporada ${temporadaAPI} iniciando - aguardando dados`);
        estadoOrquestrador.temporadaEncerrada = false;
        estadoOrquestrador.rodadaAtualBrasileirao = 0;
        estadoOrquestrador.semDadosConsolidados = true;
        estadoOrquestrador.aguardandoDados = true;
        estadoOrquestrador.times = [];
        estadoOrquestrador.confrontos = [];
        renderizarAguardandoDados(container);
        return;
      }

      // Pré-temporada real: API retorna ano anterior, podemos carregar dados consolidados
      console.log("[PONTOS-CORRIDOS-ORQUESTRADOR] 🔒 MODO SOMENTE LEITURA - Temporada anterior encerrada");
      console.log("[PONTOS-CORRIDOS-ORQUESTRADOR] Carregando dados consolidados do cache...");

      estadoOrquestrador.temporadaEncerrada = true;
      estadoOrquestrador.rodadaAtualBrasileirao = RODADA_FINAL_CAMPEONATO;

      // ✅ CARREGAR TUDO DO CACHE - SEM RECALCULAR
      const dadosConsolidados = await carregarDadosConsolidados(estadoOrquestrador.ligaId);

      if (!dadosConsolidados || dadosConsolidados.length === 0) {
        console.warn("[PONTOS-CORRIDOS-ORQUESTRADOR] Sem dados consolidados; exibindo estado vazio.");
        estadoOrquestrador.dadosConsolidados = [];
        estadoOrquestrador.times = [];
        estadoOrquestrador.confrontos = [];
        estadoOrquestrador.ultimaRodadaComDados = 0;
        estadoOrquestrador.semDadosConsolidados = true;
      } else {
        estadoOrquestrador.dadosConsolidados = dadosConsolidados;

        // Extrair times da última rodada consolidada
        const ultimaRodada = dadosConsolidados[dadosConsolidados.length - 1];
        estadoOrquestrador.times = (ultimaRodada.classificacao || []).map(t => ({
          id: Number(t.timeId) || Number(t.time_id),
          nome: t.nome || t.nome_time,
          nome_cartola: t.nome_cartola,
          escudo: t.escudo,
        }));

        // Extrair confrontos de todas as rodadas
        estadoOrquestrador.confrontos = dadosConsolidados.map(r => r.confrontos || []);
        estadoOrquestrador.ultimaRodadaComDados = dadosConsolidados.length;
        estadoOrquestrador.semDadosConsolidados = false;

        console.log(`[PONTOS-CORRIDOS-ORQUESTRADOR] ✅ ${estadoOrquestrador.times.length} times carregados do cache`);
        console.log(`[PONTOS-CORRIDOS-ORQUESTRADOR] ✅ ${estadoOrquestrador.confrontos.length} rodadas consolidadas`);
      }

    } else {
      // ✅ MODO NORMAL - Temporada em andamento
      estadoOrquestrador.temporadaEncerrada = false;
      estadoOrquestrador.rodadaAtualBrasileirao = rodadaAtual;

      // Pré-carregar dependências
      console.log("[PONTOS-CORRIDOS-ORQUESTRADOR] Pré-carregando dependências...");
      const rodadasOk = await carregarRodadas();

      if (!rodadasOk) {
        console.warn("[PONTOS-CORRIDOS-ORQUESTRADOR] Módulo rodadas não carregou");
      }

      // Buscar times da liga
      const timesData = await buscarTimesLiga(estadoOrquestrador.ligaId);

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
        validarDadosEntrada(
          estadoOrquestrador.times,
          estadoOrquestrador.confrontos,
        );
        console.log("[PONTOS-CORRIDOS-ORQUESTRADOR] Dados validados com sucesso");
      } catch (validationError) {
        console.warn(
          "[PONTOS-CORRIDOS-ORQUESTRADOR] Aviso de validação:",
          validationError.message,
        );
      }

      // Verificar se há confrontos suficientes
      if (estadoOrquestrador.confrontos.length === 0) {
        throw new Error("Não foi possível gerar confrontos para esta liga");
      }
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

// ✅ v3.0: CARREGAR DADOS CONSOLIDADOS DO CACHE
async function carregarDadosConsolidados(ligaId) {
  try {
    console.log(`[PONTOS-CORRIDOS-ORQUESTRADOR] Buscando dados consolidados: /api/pontos-corridos/${ligaId}`);

    const response = await fetch(`/api/pontos-corridos/${ligaId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const dados = await response.json();

    if (!Array.isArray(dados) || dados.length === 0) {
      console.warn("[PONTOS-CORRIDOS-ORQUESTRADOR] Cache vazio ou inválido");
      return null;
    }

    console.log(`[PONTOS-CORRIDOS-ORQUESTRADOR] ✅ ${dados.length} rodadas carregadas do cache`);
    return dados;

  } catch (error) {
    console.error("[PONTOS-CORRIDOS-ORQUESTRADOR] ❌ Erro ao carregar cache:", error);
    return null;
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
  if (estadoOrquestrador.confrontos.length === 0) {
    atualizarContainer(
      containerId,
      `
        <div class="empty-state">
          <span class="material-icons" style="font-size: 48px; color: var(--text-muted);">assignment</span>
          <h3 class="empty-title">Rodadas indisponíveis</h3>
          <p class="empty-message">Não há dados consolidados para exibir.</p>
        </div>
      `,
    );
    return;
  }

  if (!rodadaNum || rodadaNum < 1 || rodadaNum > estadoOrquestrador.confrontos.length) {
    console.error(
      `[PONTOS-CORRIDOS-ORQUESTRADOR] Rodada inválida: ${rodadaNum}`,
    );
    renderErrorState(containerId, new Error(`Rodada ${rodadaNum} inválida`));
    return;
  }

  const rodadaCartola = PONTOS_CORRIDOS_CONFIG.rodadaInicial + rodadaNum - 1;

  renderLoadingState(containerId, `Carregando dados da rodada ${rodadaNum}`);

  // Limpar container de exportação do topo (usado pela classificação)
  const containerTopoExportacao = document.getElementById(
    "exportPontosCorridosContainer",
  );
  if (containerTopoExportacao) {
    containerTopoExportacao.innerHTML = "";
  }

  try {
    // ✅ v3.0: MODO SOMENTE LEITURA - Usar dados do cache diretamente
    if (estadoOrquestrador.temporadaEncerrada && estadoOrquestrador.dadosConsolidados) {
      console.log(`[PONTOS-CORRIDOS-ORQUESTRADOR] 🔒 Rodada ${rodadaNum} do cache consolidado`);

      const dadosRodada = estadoOrquestrador.dadosConsolidados.find(r => r.rodada === rodadaNum);

      if (!dadosRodada || !dadosRodada.confrontos) {
        throw new Error(`Rodada ${rodadaNum} não encontrada no cache consolidado`);
      }

      // Usar confrontos diretamente do cache (já tem pontuações)
      const jogos = dadosRodada.confrontos;

      // Criar pontuacoesMap a partir dos dados já consolidados
      const pontuacoesMap = {};
      jogos.forEach(jogo => {
        if (jogo.time1?.id) {
          pontuacoesMap[String(jogo.time1.id)] = {
            pontuacao: jogo.time1.pontos || 0,
            pontos: jogo.pontos1 ?? (jogo.time1.pontos > jogo.time2.pontos ? 3 : jogo.time1.pontos < jogo.time2.pontos ? 0 : 1),
          };
        }
        if (jogo.time2?.id) {
          pontuacoesMap[String(jogo.time2.id)] = {
            pontuacao: jogo.time2.pontos || 0,
            pontos: jogo.pontos2 ?? (jogo.time2.pontos > jogo.time1.pontos ? 3 : jogo.time2.pontos < jogo.time1.pontos ? 0 : 1),
          };
        }
      });

      // Renderizar tabela com dados do cache
      const tabelaHtml = renderTabelaRodada(
        jogos,
        rodadaNum,
        pontuacoesMap,
        estadoOrquestrador.rodadaAtualBrasileirao,
      );
      atualizarContainer(containerId, tabelaHtml);

      console.log(`[PONTOS-CORRIDOS-ORQUESTRADOR] ✅ Rodada ${rodadaNum} renderizada do cache`);
      return;
    }

    // ✅ MODO NORMAL - Temporada em andamento
    // Verificar dependências
    if (!getRankingRodadaEspecifica) {
      throw new Error("Módulo rodadas não disponível");
    }

    const jogos = estadoOrquestrador.confrontos[rodadaNum - 1]; // Ajuste para índice 0

    // CORREÇÃO: Validar se jogos existe
    if (!jogos || jogos.length === 0) {
      throw new Error(`Confrontos não encontrados para rodada ${rodadaNum}`);
    }

    const isRodadaPassada =
      rodadaCartola < estadoOrquestrador.rodadaAtualBrasileirao;

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

    console.log(`[PONTOS-CORRIDOS-ORQUESTRADOR] Rodada ${rodadaNum} carregada`);
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

  renderLoadingState(containerId, "Carregando classificação");

  try {
    let classificacao, ultimaRodadaComDados, houveErro;

    // ✅ v3.0: MODO SOMENTE LEITURA - Usar classificação do cache
    if (estadoOrquestrador.temporadaEncerrada && estadoOrquestrador.dadosConsolidados) {
      console.log("[PONTOS-CORRIDOS-ORQUESTRADOR] 🔒 Classificação do cache consolidado");

      // Pegar classificação da última rodada consolidada
      const ultimaRodada = estadoOrquestrador.dadosConsolidados[estadoOrquestrador.dadosConsolidados.length - 1];

      if (!ultimaRodada || !ultimaRodada.classificacao) {
        classificacao = [];
        ultimaRodadaComDados = 0;
        houveErro = false;
      } else {
        classificacao = ultimaRodada.classificacao;
        ultimaRodadaComDados = ultimaRodada.rodada;
        houveErro = false;
      }

      console.log(`[PONTOS-CORRIDOS-ORQUESTRADOR] ✅ Classificação final da Rodada ${ultimaRodadaComDados}`);

    } else {
      // ✅ MODO NORMAL - Temporada em andamento
      // Verificar cache primeiro
      let resultado = getClassificacaoCache(
        estadoOrquestrador.ligaId,
        estadoOrquestrador.rodadaAtualBrasileirao,
      );

      if (!resultado) {
        // Calcular classificação
        resultado = await calcularClassificacao(
          estadoOrquestrador.ligaId,
          estadoOrquestrador.times,
          estadoOrquestrador.confrontos,
          estadoOrquestrador.rodadaAtualBrasileirao,
        );

        // Armazenar no cache
        setClassificacaoCache(
          resultado,
          estadoOrquestrador.ligaId,
          estadoOrquestrador.rodadaAtualBrasileirao,
        );
      }

      classificacao = resultado.classificacao;
      ultimaRodadaComDados = resultado.ultimaRodadaComDados;
      houveErro = resultado.houveErro;
    }

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
  "[PONTOS-CORRIDOS-ORQUESTRADOR] ✅ Módulo v3.2 carregado (configuração dinâmica)",
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
        <button class="nav-btn ${estadoOrquestrador.visualizacaoAtual === "rodadas" ? "active" : ""}" data-view="rodadas">Rodadas</button>
        <button class="nav-btn ${estadoOrquestrador.visualizacaoAtual === "classificacao" ? "active" : ""}" data-view="classificacao">Classificação</button>
      </div>
      <div id="pontos-corridos-content"></div>
      ${configurarBotaoVoltar()}
    </div>
  `;

  container.innerHTML = html;

  // Configurar navegação
  setupNavegacao();

  // Renderizar visualização atual
  if (estadoOrquestrador.visualizacaoAtual === "classificacao") {
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
    console.error(
      `[ORQUESTRADOR] Erro ao renderizar rodada ${rodadaNum}:`,
      error,
    );
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
if (typeof renderSeletorRodada === "undefined") {
  globalThis.renderSeletorRodada = function (
    container,
    totalRodadas,
    rodadaAtual,
    ultimaRodadaComDados,
  ) {
    console.warn(
      "[PONTOS-CORRIDOS-ORQUESTRADOR] renderSeletorRodada não definida. Renderizando placeholder.",
    );
    container.innerHTML +=
      '<div class="placeholder-seletor-rodada">Seletor de Rodadas (Placeholder)</div>';
  };
}

// Placeholder para setupSeletorRodada se não estiver importado/definido
if (typeof setupSeletorRodada === "undefined") {
  globalThis.setupSeletorRodada = function () {
    console.warn(
      "[PONTOS-CORRIDOS-ORQUESTRADOR] setupSeletorRodada não definida. Adicionando placeholder listener.",
    );
    // Adiciona um listener genérico para simular funcionalidade
    const selectorContainer = document.querySelector(
      "#pontos-corridos-content",
    ); // Assumindo que o seletor está dentro do content
    if (selectorContainer) {
      selectorContainer.addEventListener("click", (e) => {
        if (
          e.target.classList.contains("nav-btn") &&
          e.target.dataset.view === "rodadas"
        ) {
          console.log(
            "[PONTOS-CORRIDOS-ORQUESTRADOR] Placeholder: Rodada clicada",
          );
          // Aqui você simularia a troca de rodada se necessário
        }
      });
    }
  };
}
