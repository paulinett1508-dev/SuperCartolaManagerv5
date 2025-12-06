// PONTOS CORRIDOS UI - v2.7 Interface Otimizada
// ✅ v2.1: Celebração do campeão quando liga encerra
// ✅ v2.2: Banner compacto e elegante com nome do cartoleiro
// ✅ v2.3: CORREÇÃO - Suporta time1/time2 (cache) e timeA/timeB (gerador)
// ✅ v2.4: Alinhamento do nome do cartoleiro na classificação
// ✅ v2.5: Renomear coluna GP → PG (Pontos Goleada)
// ✅ v2.6: PG no banner do campeão
// ✅ v2.7: Correção busca container (suporta ambos IDs) + fix null check
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

  // ✅ v2.1: Verificar se a liga encerrou
  const ligaEncerrou = rodadasPassadas >= totalRodadas;

  // CORREÇÃO: Encontrar a rodada anterior à vigente para destacar em verde
  let rodadaParaSelecionar = 0;
  for (let i = confrontos.length - 1; i >= 0; i--) {
    const rodadaBrasileirao = calcularRodadaBrasileirao(i);
    if (rodadaBrasileirao === rodadaAtual - 1) {
      rodadaParaSelecionar = i;
      break;
    } else if (rodadaBrasileirao < rodadaAtual - 1) {
      rodadaParaSelecionar = i;
      break;
    }
  }

  // ✅ v2.1: Se a liga encerrou, selecionar última rodada
  if (ligaEncerrou) {
    rodadaParaSelecionar = totalRodadas - 1;
  }

  // Renderizar informações de progresso
  if (progresso) {
    // ✅ v2.1: Mensagem diferente se encerrou
    if (ligaEncerrou) {
      progresso.innerHTML = `
        <div class="progresso-info liga-encerrada">
          <span class="progresso-texto">🏆 Liga Encerrada! ${totalRodadas} rodadas disputadas</span>
          <div class="progresso-bar">
            <div class="progresso-fill completo" style="width: 100%"></div>
          </div>
        </div>
      `;
    } else {
      progresso.innerHTML = `
        <div class="progresso-info">
          <span class="progresso-texto">${rodadasPassadas} de ${totalRodadas} rodadas disputadas</span>
          <div class="progresso-bar">
            <div class="progresso-fill" style="width: ${(rodadasPassadas / totalRodadas) * 100}%"></div>
          </div>
        </div>
      `;
    }
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
      estadoClasse = "atual";
    } else {
      estadoClasse = "futura";
    }

    // ✅ v2.1: Se encerrou, última rodada é especial
    if (ligaEncerrou && index === totalRodadas - 1) {
      estadoClasse = "passada campeao";
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
      ${ligaEncerrou && index === totalRodadas - 1 ? '<div class="badge-final">🏆</div>' : ""}
    `;

    // CORREÇÃO: Todas as rodadas acessíveis, incluindo futuras
    card.addEventListener("click", function () {
      document.querySelectorAll(".rodada-card").forEach((c) => {
        c.classList.remove("selecionada");
      });

      card.classList.add("selecionada");
      rodadaSelecionadaInterface = index;

      handleRodadaChange(numeroRodada);
    });

    // Tooltip informativo
    if (ligaEncerrou && index === totalRodadas - 1) {
      card.title = `Rodada ${numeroRodada} - RODADA FINAL 🏆`;
    } else if (estadoClasse === "futura") {
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
  const numeroRodada = idxRodada;
  const rodadaBrasileirao = calcularRodadaBrasileirao(idxRodada - 1);
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
    // ✅ v2.3: Suporta ambos formatos (time1/time2 do cache OU timeA/timeB do gerador)
    const timeA = jogo.time1 || jogo.timeA;
    const timeB = jogo.time2 || jogo.timeB;

    if (!timeA || !timeB) {
      console.warn(`[UI] Confronto ${index} com dados incompletos:`, jogo);
      return;
    }

    const pontosA = timeA.pontos ?? pontuacoesMap[timeA.id] ?? null;
    const pontosB = timeB.pontos ?? pontuacoesMap[timeB.id] ?? null;

    const brasaoA = timeA.escudo || obterBrasaoTime(timeA);
    const brasaoB = timeB.escudo || obterBrasaoTime(timeB);

    // ✅ v2.3: Nome do time (principal) + nome do cartoleiro (secundário)
    const nomeTimeA = timeA.nome || timeA.nome_time || "Time";
    const cartolaA = timeA.nome_cartola || "";
    const nomeTimeB = timeB.nome || timeB.nome_time || "Time";
    const cartolaB = timeB.nome_cartola || "";

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
        corPlacarA = "color: #3b82f6;";
        corPlacarB = "color: #3b82f6;";
        corFinanceiroA = "color: #22c55e;";
        corFinanceiroB = "color: #22c55e;";
      } else if (diferenca >= goleadaMinima) {
        if (pontosA > pontosB) {
          financeiroA = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          financeiroB = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          resultadoTexto = "Goleada A";
          classeConfronto = "goleada";
          corPlacarA = "color: #ffd700; font-weight: 700;";
          corPlacarB = "color: #ef4444;";
          corFinanceiroA = "color: #22c55e;";
          corFinanceiroB = "color: #ef4444;";
        } else {
          financeiroA = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          financeiroB = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          resultadoTexto = "Goleada B";
          classeConfronto = "goleada";
          corPlacarA = "color: #ef4444;";
          corPlacarB = "color: #ffd700; font-weight: 700;";
          corFinanceiroA = "color: #ef4444;";
          corFinanceiroB = "color: #22c55e;";
        }
      } else {
        if (pontosA > pontosB) {
          financeiroA = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          financeiroB = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          resultadoTexto = "Vitória A";
          classeConfronto = "vitoria";
          corPlacarA = "color: #22c55e;";
          corPlacarB = "color: #ef4444;";
          corFinanceiroA = "color: #22c55e;";
          corFinanceiroB = "color: #ef4444;";
        } else {
          financeiroA = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          financeiroB = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          resultadoTexto = "Vitória B";
          classeConfronto = "vitoria";
          corPlacarA = "color: #ef4444;";
          corPlacarB = "color: #22c55e;";
          corFinanceiroA = "color: #ef4444;";
          corFinanceiroB = "color: #22c55e;";
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
                <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${nomeTimeA}</div>
                ${cartolaA ? `<div style="font-size: 11px; color: var(--text-muted);">${cartolaA}</div>` : ""}
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
                <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${nomeTimeB}</div>
                ${cartolaB ? `<div style="font-size: 11px; color: var(--text-muted);">${cartolaB}</div>` : ""}
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

// ============================================================================
// ✅ v2.2: CELEBRAÇÃO DO CAMPEÃO - Compacto e Elegante
// ============================================================================

function renderizarCelebracaoCampeao(campeao) {
  const nomeTime = campeao.nome || campeao.nome_time || "Campeão";
  const nomeCartoleiro = campeao.nome_cartola || campeao.cartoleiro || "";
  const escudoUrl =
    campeao.escudo || campeao.url_escudo_png || campeao.foto_time || "";
  const pontos = campeao.pontos || 0;
  const vitorias = campeao.vitorias || 0;
  const empates = campeao.empates || 0;
  const derrotas = campeao.derrotas || 0;
  const pontosGoleada = campeao.pontosGoleada || 0; // ✅ v2.6

  return `
    <div class="campeao-banner">
      <div class="campeao-content">
        <div class="campeao-trofeu">🏆</div>
        <img src="${escudoUrl}" alt="${nomeTime}" class="campeao-escudo" onerror="this.style.display='none'">
        <div class="campeao-info">
          <span class="campeao-label">CAMPEÃO 2025</span>
          <h3 class="campeao-nome">${nomeTime}</h3>
          ${nomeCartoleiro ? `<span class="campeao-cartoleiro">${nomeCartoleiro}</span>` : ""}
        </div>
        <div class="campeao-stats">
          <div class="stat"><span class="valor">${pontos}</span><span class="label">PTS</span></div>
          <div class="stat"><span class="valor">${vitorias}</span><span class="label">V</span></div>
          <div class="stat"><span class="valor">${empates}</span><span class="label">E</span></div>
          <div class="stat"><span class="valor">${derrotas}</span><span class="label">D</span></div>
          <div class="stat"><span class="valor" style="color: #ff8c00;">${pontosGoleada}</span><span class="label">PG</span></div>
        </div>
      </div>
    </div>

    <style>
      .campeao-banner {
        background: linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%);
        border: 1px solid rgba(255,215,0,0.4);
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 20px;
      }
      .campeao-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .campeao-trofeu {
        font-size: 32px;
        flex-shrink: 0;
      }
      .campeao-escudo {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 2px solid #ffd700;
        object-fit: cover;
        flex-shrink: 0;
      }
      .campeao-info {
        flex: 1;
        min-width: 0;
      }
      .campeao-label {
        font-size: 10px;
        font-weight: 700;
        color: #ffd700;
        letter-spacing: 1px;
      }
      .campeao-nome {
        font-size: 18px;
        font-weight: 700;
        color: #fff;
        margin: 2px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .campeao-cartoleiro {
        font-size: 12px;
        color: #a0aec0;
      }
      .campeao-stats {
        display: flex;
        gap: 12px;
        flex-shrink: 0;
      }
      .campeao-stats .stat {
        text-align: center;
        background: rgba(255,215,0,0.1);
        border-radius: 8px;
        padding: 8px 12px;
        min-width: 44px;
      }
      .campeao-stats .valor {
        display: block;
        font-size: 16px;
        font-weight: 700;
        color: #ffd700;
      }
      .campeao-stats .label {
        display: block;
        font-size: 9px;
        color: #a0aec0;
        margin-top: 2px;
      }
    </style>
  `;
}

// ============================================================================
// RENDERIZAR TABELA DE CLASSIFICAÇÃO (ATUALIZADO v2.1)
// ============================================================================

export function renderTabelaClassificacao(
  classificacao,
  ultimaRodadaComDados,
  houveErro,
  totalRodadasLiga = 31,
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

  // ✅ v2.1: Detectar se a liga encerrou
  // Última rodada do BR = rodadaInicial + totalRodadasLiga - 1
  // Ex: 7 + 31 - 1 = 37
  const rodadaFinalBr =
    PONTOS_CORRIDOS_CONFIG.rodadaInicial + totalRodadasLiga - 1;
  const ligaEncerrou = ultimaRodadaComDados >= rodadaFinalBr;

  // Campeão é o 1º da classificação
  const campeao = classificacao[0];

  let linhas = "";

  classificacao.forEach((time, index) => {
    if (!time || typeof time !== "object") {
      console.warn("[PONTOS-CORRIDOS-UI] Time inválido na posição", index);
      return;
    }

    const posicao = index + 1;
    const isEmpate =
      index > 0 && classificacao[index - 1].pontos === time.pontos;

    let classePosicao = "classificacao-linha";
    if (posicao === 1) {
      classePosicao += " primeiro-lugar";
      if (ligaEncerrou) classePosicao += " campeao-final";
    } else if (posicao === 2) {
      classePosicao += " segundo-lugar";
    } else if (posicao === 3) {
      classePosicao += " terceiro-lugar";
    }

    // ✅ v2.2: Nome do time (principal) + nome do cartoleiro (secundário)
    // Dados vêm do core com: nome (time), nome_cartola (cartoleiro)
    const nomeTime = time.nome || time.nome_time || "Time Desconhecido";
    const nomeCartoleiro = time.nome_cartola || time.cartoleiro || "";
    const escudoUrl =
      time.escudo ||
      time.url_escudo_png ||
      time.foto_time ||
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23ddd' width='40' height='40'/%3E%3C/svg%3E";

    // ✅ v2.1: Badge de campeão se encerrou
    const badgeCampeao =
      ligaEncerrou && posicao === 1
        ? '<span style="margin-left: 8px; font-size: 16px;">🏆</span>'
        : "";

    linhas += `
      <tr class="${classePosicao}">
        <td style="text-align: center; padding: 12px; font-weight: bold;">
          ${posicao}º
        </td>
        <td style="padding: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img 
              src="${escudoUrl}" 
              alt="${nomeTime}" 
              style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover;${ligaEncerrou && posicao === 1 ? " border: 2px solid #ffd700;" : ""}"
              onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'40\\' height=\\'40\\'%3E%3Crect fill=\\'%23ddd\\' width=\\'40\\' height=\\'40\\'/%3E%3C/svg%3E'"
            >
            <div style="display: flex; flex-direction: column; align-items: flex-start; text-align: left;">
              <span style="font-weight: 500;${ligaEncerrou && posicao === 1 ? " color: #ffd700;" : ""}">${nomeTime}${badgeCampeao}</span>
              ${nomeCartoleiro ? `<span style="font-size: 11px; color: var(--text-muted, #888); margin-top: 2px;">${nomeCartoleiro}</span>` : ""}
            </div>
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
        <td class="aproveitamento">${
          time.vitorias + time.empates + time.derrotas > 0
            ? (
                (time.pontos /
                  ((time.vitorias + time.empates + time.derrotas) * 3)) *
                100
              ).toFixed(1)
            : 0
        }%</td>
      </tr>
    `;
  });

  // ✅ v2.1: Renderizar celebração se encerrou
  const celebracaoHTML = ligaEncerrou
    ? renderizarCelebracaoCampeao(campeao)
    : "";

  // ✅ v2.1: Header diferente se encerrou
  const headerHTML = ligaEncerrou
    ? `
      <div class="classificacao-header liga-encerrada">
        <div class="classificacao-info-principal">
          <h3 class="classificacao-titulo">🏆 Classificação Final</h3>
          <p class="classificacao-subtitulo">
            Liga Pontos Corridos 2025 - Encerrada!
          </p>
        </div>
        <div class="classificacao-legenda">
          <span class="legenda-item primeiro campeao">🥇</span>
          <span class="legenda-item segundo">🥈</span>
          <span class="legenda-item terceiro">🥉</span>
          <span class="legenda-texto">Pódio Final</span>
        </div>
      </div>
    `
    : `
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
    `;

  return `
    ${celebracaoHTML}

    ${headerHTML}

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
            <th class="col-goleadas">PG</th>
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

    <style>
      .classificacao-linha.campeao-final td:first-child {
        background: linear-gradient(90deg, rgba(255, 215, 0, 0.2), transparent);
      }
      .classificacao-header.liga-encerrada {
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05));
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .classificacao-header.liga-encerrada .classificacao-titulo {
        color: #ffd700;
      }
      .legenda-item.campeao {
        background: linear-gradient(135deg, #ffd700, #ffed4a);
        animation: campeaoGlow 2s ease-in-out infinite;
      }
      @keyframes campeaoGlow {
        0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
        50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
      }
      .badge-final {
        position: absolute;
        top: -5px;
        right: -5px;
        font-size: 12px;
        background: #ffd700;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .rodada-card.campeao {
        border-color: #ffd700 !important;
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
      }
      .progresso-info.liga-encerrada .progresso-texto {
        color: #ffd700;
        font-weight: 600;
      }
      .progresso-fill.completo {
        background: linear-gradient(90deg, #ffd700, #ffed4a);
      }
    </style>
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
  "[PONTOS-CORRIDOS-UI] Módulo v2.7 carregado (fix container + null check)",
);

// ========================================
// PATCH: ADICIONAR AO FINAL DE pontos-corridos-ui.js
// ========================================

window.inicializarPontosCorridos = async function (ligaId) {
  console.log("[PONTOS-CORRIDOS] Inicializando módulo via orquestrador...", {
    ligaId,
  });

  try {
    const container =
      document.getElementById("pontos-corridos-container") ||
      document.getElementById("pontos-corridos") ||
      document.getElementById("modulo-container") ||
      document.getElementById("secondary-content");

    if (!container) {
      console.error("[PONTOS-CORRIDOS] ❌ Container não encontrado");
      return;
    }

    console.log("[PONTOS-CORRIDOS] ✅ Container encontrado:", container.id);

    renderizarInterface(
      container,
      ligaId,
      (rodada) => {
        console.log("[PONTOS-CORRIDOS] Rodada selecionada:", rodada);
      },
      () => {
        console.log("[PONTOS-CORRIDOS] Visualizar classificação");
      },
    );

    console.log("[PONTOS-CORRIDOS] ✅ Módulo inicializado com sucesso");
  } catch (error) {
    console.error("[PONTOS-CORRIDOS] ❌ Erro ao inicializar:", error);

    const container =
      document.getElementById("pontos-corridos-container") ||
      document.getElementById("pontos-corridos") ||
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
