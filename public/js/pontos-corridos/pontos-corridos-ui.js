// PONTOS CORRIDOS UI - Interface Otimizada (Preservando Funcionalidades Imersivas)
// Responsável por: renderização, manipulação DOM, estados visuais

import {
  PONTOS_CORRIDOS_CONFIG,
  calcularRodadaBrasileirao,
} from "./pontos-corridos-config.js";

import {
  criarBotaoExportacaoPontosCorridosRodada,
  criarBotaoExportacaoPontosCorridosClassificacao,
} from "../exports/export-pontos-corridos.js";

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

      // Executar callback com número da rodada (index + 1)
      handleRodadaChange(numeroRodada);
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

// Layout simples usando classes CSS existentes
export function renderTabelaRodada(
  jogos,
  idxRodada,
  pontuacoesMap,
  rodadaAtualBrasileirao,
) {
  // CORREÇÃO: idxRodada agora é o número da rodada da liga (1-31), não índice
  const numeroRodada = idxRodada;
  const rodadaBrasileirao = calcularRodadaBrasileirao(idxRodada - 1); // Subtrair 1 para índice
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

  // Usar tabela tradicional com classes existentes
  let confrontosHTML = "";

  jogos.forEach((jogo, index) => {
    const timeA = jogo.timeA;
    const timeB = jogo.timeB;
    const pontosA = pontuacoesMap[timeA.id] ?? null;
    const pontosB = pontuacoesMap[timeB.id] ?? null;

    const brasaoA = obterBrasaoTime(timeA);
    const brasaoB = obterBrasaoTime(timeB);

    const nomeA = timeA.nome_cartoleiro || timeA.nome || "N/D";
    const timeNomeA = timeA.nome_time || "Time";
    const nomeB = timeB.nome_cartoleiro || timeB.nome || "N/D";
    const timeNomeB = timeB.nome_time || "Time";

    let financeiroA = "R$ 0,00";
    let financeiroB = "R$ 0,00";
    let resultadoTexto = "Aguardando";
    let classeConfronto = "";
    let corPlacarA = "";
    let corPlacarB = "";
    let corFinanceiroA = "";
    let corFinanceiroB = "";

    if (pontosA !== null && pontosB !== null) {
      const diferenca = Math.abs(pontosA - pontosB);
      const { empateTolerancia, goleadaMinima } =
        PONTOS_CORRIDOS_CONFIG.criterios;

      if (diferenca <= empateTolerancia) {
        financeiroA = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.empate.toFixed(2)}`;
        financeiroB = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.empate.toFixed(2)}`;
        resultadoTexto = "Empate";
        classeConfronto = "empate";
        corPlacarA = "color: #3b82f6;"; // Azul para empate
        corPlacarB = "color: #3b82f6;";
        corFinanceiroA = "color: #22c55e;"; // Verde para positivo
        corFinanceiroB = "color: #22c55e;";
      } else if (diferenca >= goleadaMinima) {
        if (pontosA > pontosB) {
          financeiroA = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          financeiroB = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          resultadoTexto = "Goleada A";
          classeConfronto = "goleada";
          corPlacarA = "color: #ffd700; font-weight: 700;"; // Dourado para goleada
          corPlacarB = "color: #ef4444;"; // Vermelho para perdedor
          corFinanceiroA = "color: #22c55e;"; // Verde para positivo
          corFinanceiroB = "color: #ef4444;"; // Vermelho para negativo
        } else {
          financeiroA = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          financeiroB = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          resultadoTexto = "Goleada B";
          classeConfronto = "goleada";
          corPlacarA = "color: #ef4444;"; // Vermelho para perdedor
          corPlacarB = "color: #ffd700; font-weight: 700;"; // Dourado para goleada
          corFinanceiroA = "color: #ef4444;"; // Vermelho para negativo
          corFinanceiroB = "color: #22c55e;"; // Verde para positivo
        }
      } else {
        if (pontosA > pontosB) {
          financeiroA = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          financeiroB = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          resultadoTexto = "Vitória A";
          classeConfronto = "vitoria";
          corPlacarA = "color: #22c55e;"; // Verde para vencedor
          corPlacarB = "color: #ef4444;"; // Vermelho para perdedor
          corFinanceiroA = "color: #22c55e;"; // Verde para positivo
          corFinanceiroB = "color: #ef4444;"; // Vermelho para negativo
        } else {
          financeiroA = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          financeiroB = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          resultadoTexto = "Vitória B";
          classeConfronto = "vitoria";
          corPlacarA = "color: #ef4444;"; // Vermelho para perdedor
          corPlacarB = "color: #22c55e;"; // Verde para vencedor
          corFinanceiroA = "color: #ef4444;"; // Vermelho para negativo
          corFinanceiroB = "color: #22c55e;"; // Verde para positivo
        }
      }
    }

    confrontosHTML += `
      <tr class="confronto-linha ${classeConfronto}">
        <td style="padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <!-- Time A - Alinhado à esquerda -->
            <div style="display: flex; align-items: center; gap: 12px; flex: 1; justify-content: flex-start;">
              <img src="${brasaoA}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: contain;" alt="Time A" onerror="this.src='/escudos/default.png'">
              <div style="text-align: left;">
                <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${nomeA}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${timeNomeA}</div>
              </div>
            </div>

            <!-- Placar e Financeiro - Centro -->
            <div style="text-align: center; margin: 0 20px; flex-shrink: 0;">
              <div style="font-size: 18px; font-weight: 700; font-family: 'JetBrains Mono', monospace; margin-bottom: 4px;">
                <span style="${corPlacarA}">${pontosA !== null ? pontosA.toFixed(1) : "-"}</span>
                <span style="color: var(--text-muted); margin: 0 8px;">x</span>
                <span style="${corPlacarB}">${pontosB !== null ? pontosB.toFixed(1) : "-"}</span>
              </div>
              <div style="font-size: 10px; font-family: 'JetBrains Mono', monospace;">
                <span style="${corFinanceiroA}">${financeiroA}</span>
                <span style="color: var(--text-muted); margin: 0 4px;">|</span>
                <span style="${corFinanceiroB}">${financeiroB}</span>
              </div>
            </div>

            <!-- Time B - Alinhado à direita -->
            <div style="display: flex; align-items: center; gap: 12px; flex: 1; justify-content: flex-end;">
              <div style="text-align: right;">
                <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${nomeB}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${timeNomeB}</div>
              </div>
              <img src="${brasaoB}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: contain;" alt="Time B" onerror="this.src='/escudos/default.png'">
            </div>
          </div>
        </td>
        <td style="text-align: center; padding: 16px; font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 16px;">
          ${pontosA !== null && pontosB !== null ? Math.abs(pontosA - pontosB).toFixed(1) : "-"}
        </td>
      </tr>
    `;
  });

  return `
    <div class="rodada-info-header">
      <div class="rodada-info-principal">
        <h3>${numeroRodada}ª Rodada da Liga</h3>
        <p>Rodada ${rodadaBrasileirao}ª do Campeonato Brasileiro</p>
      </div>
      <div class="rodada-status ${isRodadaPassada ? "finalizada" : isRodadaAtual ? "andamento" : "aguardando"}">
        <span class="status-indicador"></span>
        ${isRodadaPassada ? statusTexto : !isRodadaPassada && !isRodadaAtual ? "RODADA AINDA NÃO ACONTECEU" : statusTexto}
      </div>
    </div>

    <div class="confrontos-container">
      <table class="confrontos-table">
        <thead>
          <tr>
            <th>Confronto</th>
            <th>Diferença</th>
          </tr>
        </thead>
        <tbody>
          ${confrontosHTML}
        </tbody>
      </table>
    </div>

    <div class="exportacao-container">
      <div id="exportPontosCorridosRodadaBtnContainer"></div>
    </div>

  `;
}

// Função para criar botão de exportação de rodada
export function criarBotaoExportacaoRodada(
  jogos,
  rodadaLiga,
  rodadaCartola,
  times,
) {
  // Aguardar que o DOM seja renderizado
  setTimeout(() => {
    criarBotaoExportacaoPontosCorridosRodada({
      containerId: "exportPontosCorridosRodadaBtnContainer",
      jogos,
      rodadaLiga,
      rodadaCartola,
      times,
    });
  }, 100);
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

  let linhas = ""; // Variável para acumular as linhas da tabela

  classificacao.forEach((time, index) => {
    // Validar se o objeto time existe e tem as propriedades mínimas
    if (!time || typeof time !== 'object') {
      console.warn('[PONTOS-CORRIDOS-UI] Time inválido na posição', index);
      return;
    }

    const posicao = index + 1;
    const isEmpate = index > 0 && classificacao[index - 1].pontos === time.pontos;

    // Determinar cor baseada na posição
    let corPosicao = "";
    if (!houveErro) {
      if (posicao <= 4) {
        corPosicao = "var(--status-success)"; // Top 4
      } else if (posicao >= classificacao.length - 3) {
        corPosicao = "var(--status-warning)"; // Bottom 4
      }
    }

    // Extrair dados com fallbacks seguros
    const nomeTime = time.nome || time.nome_time || 'Time Desconhecido';
    const escudoUrl = time.escudo || time.url_escudo_png || time.foto_time || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect fill=\'%23ddd\' width=\'40\' height=\'40\'/%3E%3C/svg%3E';

    linhas += `
      <tr style="border-bottom: 1px solid var(--card-border);">
        <td style="text-align: center; padding: 12px; font-weight: bold; color: ${corPosicao}">
          ${posicao}º
        </td>
        <td style="padding: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img 
              src="${escudoUrl}" 
              alt="${nomeTime}" 
              style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover;"
              onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect fill=\'%23ddd\' width=\'40\' height=\'40\'/%3E%3C/svg%3E'"
            >
            <span style="font-weight: 500;">${nomeTime}</span>
          </div>
        </td>
        <td class="pts-destaque">${time.pontos}</td>
        <td>${time.jogos}</td>
        <td class="vitorias">${time.vitorias}</td>
        <td class="empates">${time.empates}</td>
        <td class="derrotas">${time.derrotas}</td>
        <td class="goleadas">${time.pontosGoleada || 0}</td>
        <td class="saldo ${(time.saldo_gols || 0) >= 0 ? "positivo" : "negativo"}">${(time.saldo_gols || 0) >= 0 ? "+" : ""}${(time.saldo_gols || 0).toFixed(1)}</td>
        <td class="financeiro ${(time.financeiro || 0) >= 0 ? "positivo" : "negativo"}">R$ ${(time.financeiro || 0).toFixed(2)}</td>
        <td class="aproveitamento">${((time.vitorias + time.empates + time.derrotas) > 0
        ? ((time.pontos / ((time.vitorias + time.empates + time.derrotas) * 3)) * 100).toFixed(1)
        : 0)}%</td>
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
          ${linhas}
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

// Função para criar botão de exportação de classificação
export function criarBotaoExportacaoClassificacao(
  times,
  rodadaLiga,
  rodadaCartola,
) {
  // Aguardar que o DOM seja renderizado
  setTimeout(() => {
    criarBotaoExportacaoPontosCorridosClassificacao({
      containerId: "exportClassificacaoPontosCorridosBtnContainer",
      times,
      rodadaLiga,
      rodadaCartola,
    });
  }, 100);
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

// ========================================
// PATCH: ADICIONAR AO FINAL DE pontos-corridos-ui.js
// ========================================

// ✅ EXPOR FUNÇÃO GLOBAL DE INICIALIZAÇÃO PARA O ORQUESTRADOR
window.inicializarPontosCorridos = async function (ligaId) {
  console.log("[PONTOS-CORRIDOS] Inicializando módulo via orquestrador...", {
    ligaId,
  });

  try {
    // Buscar container principal
    const container =
      document.getElementById("pontos-corridos-container") ||
      document.getElementById("modulo-container") ||
      document.getElementById("secondary-content");

    if (!container) {
      console.error("[PONTOS-CORRIDOS] ❌ Container não encontrado");
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #ef4444;">
          <h3>❌ Erro de Inicialização</h3>
          <p>Container do módulo não encontrado</p>
        </div>
      `;
      return;
    }

    console.log("[PONTOS-CORRIDOS] ✅ Container encontrado:", container.id);

    // Renderizar interface do módulo
    renderizarInterface(
      container,
      ligaId,
      (rodada) => {
        console.log("[PONTOS-CORRIDOS] Rodada selecionada:", rodada);
        // Handler será conectado ao orquestrador
      },
      () => {
        console.log("[PONTOS-CORRIDOS] Visualizar classificação");
        // Handler será conectado ao orquestrador
      },
    );

    console.log("[PONTOS-CORRIDOS] ✅ Módulo inicializado com sucesso");
  } catch (error) {
    console.error("[PONTOS-CORRIDOS] ❌ Erro ao inicializar:", error);

    // Mostrar erro na tela
    const container =
      document.getElementById("pontos-corridos-container") ||
      document.getElementById("modulo-container") ||
      document.getElementById("secondary-content");

    if (container) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #ef4444;">
          <h3>❌ Erro ao Carregar Módulo</h3>
          <p>${error.message}</p>
          <button onclick="window.location.reload()" style="
            margin-top: 20px;
            padding: 12px 24px;
            background: #ff4500;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          ">Recarregar Página</button>
        </div>
      `;
    }
  }
};

console.log(
  "[PONTOS-CORRIDOS] ✅ Função global window.inicializarPontosCorridos exposta",
);