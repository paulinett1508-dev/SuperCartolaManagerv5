// PONTOS CORRIDOS UI - Interface Corrigida com Layout Compacto
// ResponsÃ¡vel por: renderizaÃ§Ã£o, manipulaÃ§Ã£o DOM, estados visuais

import {
  PONTOS_CORRIDOS_CONFIG,
  calcularRodadaBrasileirao,
} from "./pontos-corridos-config.js";

// Cache de elementos DOM
const elementsCache = new Map();

// Estado atual da interface
let rodadaAtualInterface = 1;
let rodadaSelecionadaInterface = 0;

// Mapeamento de brasões (Cartola ID -> Clube ID do time do coração)
const MAPEAMENTO_BRASOES = {
  // Liga Super Cartola 2025
  262: "262", // Cássio Marques -> Santos
  275: "275", // fucim -> Palmeiras
  263: "263", // JB Oliveira -> Corinthians
  276: "276", // Diogo Monte -> São Paulo
  264: "264", // Felipe Jokstay -> Flamengo
  277: "277", // Pedro Antônio -> Vasco
  266: "266", // Eudes Pereira -> Fluminense
  283: "283", // Emerson -> Botafogo
  267: "267", // Antonio Luis -> Atlético-MG
  292: "292", // Raylson Fernandes -> Cruzeiro
  344: "344", // Jonney Vojvoda -> Fortaleza
  default: "default", // Padrão para times sem mapeamento
};

// Função para obter brasão do time do coração
function obterBrasaoCoracao(time) {
  const clubeId = time.clube_id || time.id || "default";
  const brasaoId = MAPEAMENTO_BRASOES[clubeId] || MAPEAMENTO_BRASOES["default"];
  return `/escudos/${brasaoId}.png`;
}

// Função para cache de elementos DOM
function getElement(id) {
  if (!elementsCache.has(id)) {
    elementsCache.set(id, document.getElementById(id));
  }
  return elementsCache.get(id);
}

// Renderizar interface principal
export function renderizarInterface(
  container,
  ligaId,
  handleRodadaChange,
  handleClassificacaoClick,
) {
  container.innerHTML = `
    <!-- Header do Módulo -->
    <div class="pontos-corridos-header">
      <div class="pontos-corridos-title-section">
        <div class="pontos-corridos-icon">⚡</div>
        <div class="pontos-corridos-title-content">
          <h2 class="pontos-corridos-titulo">Liga Pontos Corridos</h2>
          <p class="pontos-corridos-subtitulo">Sistema de confrontos todos contra todos</p>
        </div>
      </div>
    </div>

    <!-- Seletor de Rodadas com Mini-Cards -->
    <div class="rodadas-selector-container">
      <div class="rodadas-header">
        <h3 class="rodadas-title">Selecione a Rodada</h3>
        <div class="rodadas-progresso" id="rodadasProgresso"></div>
      </div>
      <div class="rodadas-grid" id="rodadasGrid">
        <!-- Mini-cards serão gerados dinamicamente -->
      </div>
    </div>

    <!-- Ações Principais -->
    <div class="acoes-container">
      <button class="btn-acao btn-primary" id="btnClassificacaoGeral">
        📊 Classificação Geral
      </button>
      <div class="btn-group-exportacao" id="exportPontosCorridosContainer">
        <!-- Botões de exportação serão adicionados dinamicamente -->
      </div>
    </div>

    <!-- Conteúdo Principal -->
    <div class="pontos-corridos-content" id="pontosCorridosRodada">
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Carregando sistema de pontos corridos...</p>
      </div>
    </div>

    <!-- Botão Voltar -->
    <div class="pontos-corridos-footer">
      <button class="btn-voltar" onclick="window.voltarParaCards()">
        ← Voltar aos Cards
      </button>
    </div>
  `;

  // Configurar event listeners
  const btnClassificacao = getElement("btnClassificacaoGeral");
  if (btnClassificacao) {
    btnClassificacao.addEventListener("click", handleClassificacaoClick);
  }

  console.log("[PONTOS-CORRIDOS-UI] Interface principal renderizada");
}

// CORREÇÃO: Renderizar seletor com lógica inteligente de rodada
export function renderizarSeletorRodadasModerno(
  confrontos,
  rodadaAtual,
  handleRodadaChange,
  handleClassificacaoClick,
) {
  const grid = getElement("rodadasGrid");
  const progresso = getElement("rodadasProgresso");

  if (!grid) {
    console.warn("[PONTOS-CORRIDOS-UI] Elemento rodadasGrid não encontrado");
    return;
  }

  rodadaAtualInterface = rodadaAtual;
  const totalRodadas = confrontos.length;
  const rodadasPassadas = Math.max(
    0,
    rodadaAtual - PONTOS_CORRIDOS_CONFIG.rodadaInicial,
  );

  // CORREÇÃO: Encontrar a rodada anterior à vigente para destacar em verde
  let rodadaParaSelecionar = 0;
  for (let i = confrontos.length - 1; i >= 0; i--) {
    const rodadaBrasileirao = calcularRodadaBrasileirao(i);
    if (rodadaBrasileirao === rodadaAtual - 1) {
      // Rodada anterior à vigente (verde)
      rodadaParaSelecionar = i;
      break;
    } else if (rodadaBrasileirao < rodadaAtual - 1) {
      // Se não encontrar a anterior exata, pegar a mais recente finalizada
      rodadaParaSelecionar = i;
      break;
    }
  }

  // Renderizar informações de progresso
  if (progresso) {
    progresso.innerHTML = `
      <div class="progresso-info">
        <span class="progresso-texto">${rodadasPassadas} de ${totalRodadas} rodadas disputadas</span>
        <div class="progresso-bar">
          <div class="progresso-fill" style="width: ${(rodadasPassadas / totalRodadas) * 100}%"></div>
        </div>
      </div>
    `;
  }

  // Limpar grid
  grid.innerHTML = "";

  // Gerar mini-cards
  confrontos.forEach((confronto, index) => {
    const numeroRodada = index + 1;
    const rodadaBrasileirao = calcularRodadaBrasileirao(index);
    const card = document.createElement("div");

    // Determinar estado da rodada
    let estadoClasse = "";
    if (rodadaBrasileirao < rodadaAtual) {
      estadoClasse = "passada";
    } else if (rodadaBrasileirao === rodadaAtual) {
      estadoClasse = "atual"; // Rodada vigente - destaque laranja
    } else {
      estadoClasse = "futura"; // Rodadas futuras - pontinho vermelho
    }

    // Configurar classes
    card.className = `rodada-card ${estadoClasse}`;

    // CORREÇÃO: Seleção automática na rodada anterior à vigente (verde)
    if (index === rodadaParaSelecionar) {
      card.classList.add("selecionada");
      rodadaSelecionadaInterface = index;
    }

    // Conteúdo do card
    card.innerHTML = `
      <div class="rodada-numero">${numeroRodada}</div>
      <div class="rodada-label">Rodada</div>
      <div class="rodada-brasileirao">R${rodadaBrasileirao}</div>
      ${estadoClasse === "futura" ? '<div class="pontinho-vermelho"></div>' : ""}
    `;

    // CORREÇÃO: Todas as rodadas acessíveis, incluindo futuras
    card.addEventListener("click", function () {
      // Remover seleção anterior
      document.querySelectorAll(".rodada-card").forEach((c) => {
        c.classList.remove("selecionada");
      });

      // Adicionar seleção atual
      card.classList.add("selecionada");
      rodadaSelecionadaInterface = index;

      // Executar callback
      handleRodadaChange(index);
    });

    // Tooltip informativo
    if (estadoClasse === "futura") {
      card.title = `Rodada ${numeroRodada} - Aguardando rodada ${rodadaBrasileirao} do Brasileirão`;
    } else if (estadoClasse === "atual") {
      card.title = `Rodada ${numeroRodada} - Em andamento`;
    } else {
      card.title = `Rodada ${numeroRodada} - Finalizada`;
    }

    grid.appendChild(card);
  });

  console.log(
    `[PONTOS-CORRIDOS-UI] ${totalRodadas} mini-cards renderizados, rodada ${rodadaParaSelecionar + 1} selecionada`,
  );
}

// Função de compatibilidade (manter por enquanto)
export function renderSeletorRodada(
  confrontos,
  handleRodadaChange,
  handleClassificacaoClick,
) {
  // Buscar rodada atual via API ou usar padrão
  const rodadaAtual = rodadaAtualInterface || 15;
  renderizarSeletorRodadasModerno(
    confrontos,
    rodadaAtual,
    handleRodadaChange,
    handleClassificacaoClick,
  );
}

// Renderizar loading state
export function renderLoadingState(containerId, mensagem = "Carregando...") {
  const container = getElement(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-message">${mensagem}</p>
    </div>
  `;
}

// Renderizar erro
export function renderErrorState(containerId, error) {
  const container = getElement(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <h3 class="error-title">Erro ao carregar dados</h3>
      <p class="error-message">${error.message || error}</p>
      <button class="btn-retry" onclick="window.location.reload()">
        🔄 Tentar Novamente
      </button>
    </div>
  `;
}

// CORREÇÃO: Layout compacto com múltiplos confrontos por linha + placar inteligente
export function renderTabelaRodada(
  jogos,
  idxRodada,
  pontuacoesMap,
  rodadaAtualBrasileirao,
) {
  const numeroRodada = idxRodada + 1;
  const rodadaBrasileirao = calcularRodadaBrasileirao(idxRodada);
  const isRodadaPassada = rodadaBrasileirao < rodadaAtualBrasileirao;
  const isRodadaAtual = rodadaBrasileirao === rodadaAtualBrasileirao;

  let statusTexto = "";
  if (isRodadaPassada) {
    statusTexto = "Rodada Finalizada";
  } else if (isRodadaAtual) {
    statusTexto = "Rodada em Andamento";
  } else {
    statusTexto = "Aguardando Rodada";
  }

  let confrontosHTML = "";

  jogos.forEach((jogo, index) => {
    const timeA = jogo.timeA;
    const timeB = jogo.timeB;
    const pontosA = pontuacoesMap[timeA.id] ?? null;
    const pontosB = pontuacoesMap[timeB.id] ?? null;

    // Obter brasões do time do coração
    const brasaoA = obterBrasaoCoracao(timeA);
    const brasaoB = obterBrasaoCoracao(timeB);

    // Nomes completos: Cartoleiro (Time)
    const nomeCompletoA = `${timeA.nome_cartoleiro || timeA.nome || "N/D"} (${timeA.nome_time || "Time"})`;
    const nomeCompletoB = `${timeB.nome_cartoleiro || timeB.nome || "N/D"} (${timeB.nome_time || "Time"})`;

    let placarTexto = "- X -";
    let financeiroA = "-";
    let financeiroB = "-";
    let classeResultadoA = "neutro";
    let classeResultadoB = "neutro";

    if (pontosA !== null && pontosB !== null) {
      const diferenca = Math.abs(pontosA - pontosB);
      const { empateTolerancia, goleadaMinima } =
        PONTOS_CORRIDOS_CONFIG.criterios;

      if (diferenca <= empateTolerancia) {
        // EMPATE
        financeiroA = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.empate.toFixed(2)}`;
        financeiroB = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.empate.toFixed(2)}`;
        classeResultadoA = "empate";
        classeResultadoB = "empate";
      } else if (diferenca >= goleadaMinima) {
        // GOLEADA
        if (pontosA > pontosB) {
          financeiroA = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          financeiroB = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          classeResultadoA = "goleada-ganhou";
          classeResultadoB = "goleada-perdeu";
        } else {
          financeiroA = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          financeiroB = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          classeResultadoA = "goleada-perdeu";
          classeResultadoB = "goleada-ganhou";
        }
      } else {
        // VITÓRIA SIMPLES
        if (pontosA > pontosB) {
          financeiroA = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          financeiroB = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          classeResultadoA = "ganhou";
          classeResultadoB = "perdeu";
        } else {
          financeiroA = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          financeiroB = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          classeResultadoA = "perdeu";
          classeResultadoB = "ganhou";
        }
      }
    } else {
      // Rodadas futuras também mostram confrontos
      financeiroA = "R$ 0.00";
      financeiroB = "R$ 0.00";
      classeResultadoA = "aguardando";
      classeResultadoB = "aguardando";
    }

    // Layout compacto com colunas
    confrontosHTML += `
      <div class="confronto-compacto">
        <!-- Time A -->
        <div class="time-lado time-esquerda ${classeResultadoA}">
          <img src="${brasaoA}" alt="Time do Coração" class="brasao-compacto" onerror="this.src='/escudos/default.png'">
          <div class="time-info">
            <div class="nome-completo">${nomeCompletoA}</div>
            <div class="financeiro">${financeiroA}</div>
          </div>
        </div>

        <!-- Placar Central - Mini-Cards Condicionais -->
        <div class="placar-container">
          <div class="placar-time ${classeResultadoA}">
            <div class="placar-numero">${pontosA !== null ? pontosA.toFixed(1) : "-"}</div>
          </div>
          <div class="vs-separator">X</div>
          <div class="placar-time ${classeResultadoB}">
            <div class="placar-numero">${pontosB !== null ? pontosB.toFixed(1) : "-"}</div>
          </div>
        </div>

        <!-- Time B -->
        <div class="time-lado time-direita ${classeResultadoB}">
          <div class="time-info">
            <div class="nome-completo">${nomeCompletoB}</div>
            <div class="financeiro">${financeiroB}</div>
          </div>
          <img src="${brasaoB}" alt="Time do Coração" class="brasao-compacto" onerror="this.src='/escudos/default.png'">
        </div>
      </div>
    `;
  });

  return `
    <div class="rodada-info-header">
      <div class="rodada-info-principal">
        <h3 class="rodada-titulo">${numeroRodada}ª Rodada da Liga</h3>
        <p class="rodada-subtitulo">Rodada ${rodadaBrasileirao}ª do Campeonato Brasileiro</p>
      </div>
      <div class="rodada-status ${isRodadaPassada ? "finalizada" : isRodadaAtual ? "andamento" : "futura"}">
        <span class="status-indicador"></span>
        ${isRodadaPassada ? statusTexto : !isRodadaPassada && !isRodadaAtual ? "RODADA AINDA NÃO ACONTECEU" : statusTexto}
      </div>
    </div>

    <div class="confrontos-grid-compacta">
      ${confrontosHTML}
    </div>

    <div class="exportacao-container">
      <div id="exportPontosCorridosRodadaBtnContainer"></div>
    </div>

    <style>
    /* CSS PARA LAYOUT COMPACTO E INTELIGENTE */
    .confrontos-grid-compacta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
      gap: 16px;
      margin: 20px 0;
    }

    .confronto-compacto {
      display: flex;
      align-items: center;
      background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(255, 69, 0, 0.2);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
      min-height: 100px;
    }

    .confronto-compacto:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(255, 69, 0, 0.4);
    }

    .time-lado {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 12px;
      border-radius: 8px;
      transition: all 0.3s ease;
      min-height: 60px;
    }

    .time-esquerda {
      gap: 12px;
      margin-right: 8px;
    }

    .time-direita {
      flex-direction: row-reverse;
      gap: 12px;
      margin-left: 8px;
    }

    .brasao-compacto {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: white;
      object-fit: cover;
      flex-shrink: 0;
    }

    .time-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .time-direita .time-info {
      text-align: right;
    }

    .nome-completo {
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    .status-resultado {
      display: none; /* Removido - cores já indicam resultado */
    }

    .financeiro {
      font-size: 12px;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      margin-top: 2px;
    }

    .placar-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-width: 140px;
      padding: 0 16px;
    }

    .placar-time {
      background: linear-gradient(135deg, #666 0%, #555 100%);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      text-align: center;
      border: 2px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      min-width: 50px;
      transition: all 0.3s ease;
    }

    .vs-separator {
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    /* ESTADOS DOS MINI-CARDS DE PLACAR */
    .placar-time.ganhou, .placar-time.goleada-ganhou {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-color: rgba(34, 197, 94, 0.5);
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
    }

    .placar-time.perdeu, .placar-time.goleada-perdeu {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border-color: rgba(239, 68, 68, 0.5);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    .placar-time.empate {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border-color: rgba(59, 130, 246, 0.5);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .placar-time.goleada-ganhou {
      background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%);
      color: #1a1a1a;
      border-color: rgba(255, 215, 0, 0.5);
      box-shadow: 0 4px 12px rgba(255, 215, 0, 0.6);
      position: relative;
    }

    .placar-time.goleada-ganhou::after {
      content: "🔥";
      position: absolute;
      top: -8px;
      right: -8px;
      font-size: 14px;
    }

    .placar-time.goleada-perdeu {
      background: linear-gradient(135deg, #8b0000 0%, #660000 100%);
      border-color: rgba(139, 0, 0, 0.5);
      box-shadow: 0 4px 12px rgba(139, 0, 0, 0.4);
    }

    /* PONTINHO VERMELHO PARA RODADAS FUTURAS */
    .pontinho-vermelho {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 8px;
      height: 8px;
      background: #ef4444;
      border-radius: 50%;
      border: 1px solid #dc2626;
      animation: pulse-red 2s infinite;
    }

    @keyframes pulse-red {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }

    /* ESTADOS ESPECÍFICOS DAS RODADAS MINI-CARDS */
    .rodada-card.passada {
      background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      opacity: 0.8;
    }

    .rodada-card.atual {
      background: linear-gradient(135deg, #ff4500 0%, #e8472b 100%);
      border: 2px solid #ff4500;
      color: white;
      font-weight: 700;
      box-shadow: 0 0 15px rgba(255, 69, 0, 0.6);
    }

    .rodada-card.atual .rodada-numero,
    .rodada-card.atual .rodada-label,
    .rodada-card.atual .rodada-brasileirao {
      color: white;
    }

    .rodada-card.futura {
      background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      opacity: 0.7;
      position: relative;
    }

    /* CORREÇÃO: Rodada anterior à vigente destacada em VERDE */
    .rodada-card.selecionada.passada {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border: 2px solid #22c55e;
      color: white;
      font-weight: 600;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.5);
      opacity: 1;
    }

    .rodada-card.selecionada.passada .rodada-numero,
    .rodada-card.selecionada.passada .rodada-label,
    .rodada-card.selecionada.passada .rodada-brasileirao {
      color: white;
    }
    .time-lado.ganhou {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .time-lado.ganhou .status-resultado {
      background: #22c55e;
      color: white;
    }

    .time-lado.ganhou .financeiro {
      color: #22c55e;
    }

    .time-lado.perdeu {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .time-lado.perdeu .status-resultado {
      background: #ef4444;
      color: white;
    }

    .time-lado.perdeu .financeiro {
      color: #ef4444;
    }

    .time-lado.empate {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .time-lado.empate .status-resultado {
      background: #3b82f6;
      color: white;
    }

    .time-lado.empate .financeiro {
      color: #3b82f6;
    }

    .time-lado.goleada-ganhou {
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 193, 7, 0.1) 100%);
      border: 1px solid rgba(255, 215, 0, 0.4);
    }

    .time-lado.goleada-ganhou .status-resultado {
      background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%);
      color: #1a1a1a;
    }

    .time-lado.goleada-ganhou .financeiro {
      color: #ffd700;
      font-weight: 700;
    }

    .time-lado.goleada-perdeu {
      background: linear-gradient(135deg, rgba(139, 0, 0, 0.2) 0%, rgba(139, 0, 0, 0.1) 100%);
      border: 1px solid rgba(139, 0, 0, 0.4);
    }

    .time-lado.goleada-perdeu .status-resultado {
      background: #8b0000;
      color: white;
    }

    .time-lado.goleada-perdeu .financeiro {
      color: #ff6b6b;
      font-weight: 700;
    }

    .time-lado.aguardando, .time-lado.andamento, .time-lado.neutro {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .time-lado.andamento {
      animation: pulse 2s infinite;
    }

    /* Estilo específico para rodadas futuras */
    .rodada-status.futura {
      color: #ff6b6b;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    /* RESPONSIVIDADE */
    @media (max-width: 768px) {
      .confrontos-grid-compacta {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .confronto-compacto {
        flex-direction: column;
        gap: 12px;
        padding: 12px;
      }

      .time-lado {
        width: 100%;
        margin: 0;
      }

      .time-direita {
        flex-direction: row;
      }

      .time-direita .time-info {
        text-align: left;
      }

      .placar-container {
        gap: 6px;
        min-width: unset;
        padding: 8px 0;
      }

      .placar-time {
        min-width: 40px;
        padding: 6px 10px;
        font-size: 14px;
      }

      .vs-separator {
        font-size: 12px;
      }

      .nome-completo {
        font-size: 13px;
      }
    }

    @media (max-width: 480px) {
      .nome-completo {
        font-size: 12px;
      }

      .placar-numero {
        font-size: 14px;
        padding: 6px 12px;
      }
    }
    </style>
  `;
}

// Renderizar tabela de classificação (mantida inalterada)
export function renderTabelaClassificacao(
  classificacao,
  ultimaRodadaComDados,
  houveErro,
) {
  if (classificacao.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3 class="empty-title">Classificação não disponível</h3>
        <p class="empty-message">Dados insuficientes para gerar a classificação</p>
      </div>
    `;
  }

  let linhasClassificacao = "";
  classificacao.forEach((item, index) => {
    const posicao = index + 1;
    let classePosicao = "";

    if (posicao === 1) classePosicao = "primeiro-lugar";
    else if (posicao === 2) classePosicao = "segundo-lugar";
    else if (posicao === 3) classePosicao = "terceiro-lugar";
    else if (posicao <= 4) classePosicao = "zona-classificacao";
    else if (posicao >= classificacao.length - 2)
      classePosicao = "zona-rebaixamento";

    const aproveitamento =
      item.jogos > 0
        ? ((item.pontos / (item.jogos * 3)) * 100).toFixed(1)
        : "0.0";

    linhasClassificacao += `
      <tr class="classificacao-linha ${classePosicao}">
        <td class="pos-numero">${posicao}º</td>
        <td class="time-info">
          <img src="${item.time.url_escudo_png || "/escudos/default.png"}" 
               alt="${item.time.nome}" 
               class="time-escudo-pequeno"
               onerror="this.src='/escudos/default.png'">
          <div class="time-detalhes">
            <span class="time-nome-principal">${item.time.nome_cartoleiro || item.time.nome}</span>
            <span class="time-nome-secundario">${item.time.nome_time || ""}</span>
          </div>
        </td>
        <td class="pts-destaque">${item.pontos}</td>
        <td>${item.jogos}</td>
        <td class="vitorias">${item.vitorias}</td>
        <td class="empates">${item.empates}</td>
        <td class="derrotas">${item.derrotas}</td>
        <td class="goleadas">${item.pontosGoleada}</td>
        <td class="saldo ${item.saldoPontos >= 0 ? "positivo" : "negativo"}">${item.saldoPontos >= 0 ? "+" : ""}${item.saldoPontos.toFixed(1)}</td>
        <td class="financeiro ${item.financeiroTotal >= 0 ? "positivo" : "negativo"}">R$ ${item.financeiroTotal.toFixed(2)}</td>
        <td class="aproveitamento">${aproveitamento}%</td>
      </tr>
    `;
  });

  return `
    <div class="classificacao-header">
      <div class="classificacao-info-principal">
        <h3 class="classificacao-titulo">Classificação Geral</h3>
        <p class="classificacao-subtitulo">
          Atualizada até a ${ultimaRodadaComDados}ª rodada
          ${houveErro ? " (alguns dados podem estar indisponíveis)" : ""}
        </p>
      </div>
      <div class="classificacao-legenda">
        <span class="legenda-item primeiro">1º</span>
        <span class="legenda-item segundo">2º</span>
        <span class="legenda-item terceiro">3º</span>
        <span class="legenda-texto">Pódio</span>
      </div>
    </div>

    <div class="classificacao-container">
      <table class="classificacao-table">
        <thead>
          <tr>
            <th class="col-pos">Pos</th>
            <th class="col-time">Time</th>
            <th class="col-pts">Pts</th>
            <th class="col-jogos">J</th>
            <th class="col-vitorias">V</th>
            <th class="col-empates">E</th>
            <th class="col-derrotas">D</th>
            <th class="col-goleadas">GP</th>
            <th class="col-saldo">SG</th>
            <th class="col-financeiro">Financeiro</th>
            <th class="col-aproveitamento">%</th>
          </tr>
        </thead>
        <tbody>
          ${linhasClassificacao}
        </tbody>
      </table>
    </div>

    <div class="classificacao-footer">
      <div id="exportClassificacaoPontosCorridosBtnContainer"></div>
      <button class="btn-voltar-rodadas" id="voltarRodadas">
        ← Voltar às Rodadas
      </button>
    </div>
  `;
}

// Atualizar container
export function atualizarContainer(containerId, conteudo) {
  const container = getElement(containerId);
  if (!container) {
    console.warn(
      `[PONTOS-CORRIDOS-UI] Container ${containerId} não encontrado`,
    );
    return;
  }

  container.innerHTML = conteudo;

  // Limpar cache do elemento atualizado
  elementsCache.delete(containerId);
}

// Configurar botão voltar
export function configurarBotaoVoltar(callback) {
  const btnVoltar = document.getElementById("voltarRodadas");
  if (btnVoltar) {
    btnVoltar.addEventListener("click", callback);
  }
}

// Cleanup do cache
export function limparCacheUI() {
  elementsCache.clear();
  console.log("[PONTOS-CORRIDOS-UI] Cache de elementos limpo");
}

console.log(
  "[PONTOS-CORRIDOS-UI] Módulo carregado com layout compacto e seleção inteligente",
);
