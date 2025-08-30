// PONTOS CORRIDOS UI - Interface Otimizada (Preservando Funcionalidades Imersivas)
// Responsável por: renderização, manipulação DOM, estados visuais

import {
  PONTOS_CORRIDOS_CONFIG,
  calcularRodadaBrasileirao,
} from "./pontos-corridos-config.js";

// Cache de elementos DOM
const elementsCache = new Map();

// Estado atual da interface
let rodadaAtualInterface = 1;
let rodadaSelecionadaInterface = 0;

// Função simplificada para brasões (CORREÇÃO APLICADA)
function obterBrasaoTime(time) {
  const clubeId = time.clube_id || "default";
  return `/escudos/${clubeId}.png`;
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

// CORREÇÃO: Layout compacto otimizado (CSS movido para arquivo separado)
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

    // CORREÇÃO: Usar função simplificada para brasões
    const brasaoA = obterBrasaoTime(timeA);
    const brasaoB = obterBrasaoTime(timeB);

    // Nomes completos: Cartoleiro (Time)
    const nomeCompletoA = `${timeA.nome_cartoleiro || timeA.nome || "N/D"} (${timeA.nome_time || "Time"})`;
    const nomeCompletoB = `${timeB.nome_cartoleiro || timeB.nome || "N/D"} (${timeB.nome_time || "Time"})`;

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

    // Layout compacto preservando todas as funcionalidades imersivas
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
