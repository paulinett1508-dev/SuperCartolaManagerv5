// PONTOS CORRIDOS UI - v2.9 Interface Otimizada
// ✅ v2.1: Celebração do campeão quando liga encerra
// ✅ v2.2: Banner compacto e elegante com nome do cartoleiro
// ✅ v2.3: CORREÇÃO - Suporta time1/time2 (cache) e timeA/timeB (gerador)
// ✅ v2.4: Alinhamento do nome do cartoleiro na classificação
// ✅ v2.5: Renomear coluna GP → PG (Pontos Goleada)
// ✅ v2.6: PG no banner do campeão
// ✅ v2.7: Correção busca container (suporta ambos IDs) + fix null check
// ✅ v2.8: Fallbacks robustos para campos undefined - fix classificação
// ✅ v2.9: Material Icons + estrutura HTML original dos confrontos restaurada
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

// ✅ v2.8: Função para garantir valor numérico seguro
function safeNumber(value, defaultValue = 0) {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

// ✅ v2.8: Função para garantir string segura
function safeString(value, defaultValue = "") {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
}

// ✅ v2.8: Função para extrair dados do time de forma segura
function extractTimeData(time, fallbackId = "0") {
  if (!time || typeof time !== "object") {
    return {
      id: fallbackId,
      nome: `Time ${fallbackId}`,
      nome_cartola: "",
      escudo: "",
      pontos: 0,
    };
  }

  return {
    id: safeString(time.id || time.timeId || time.time_id, fallbackId),
    nome: safeString(
      time.nome || time.nome_time,
      `Time ${time.id || fallbackId}`,
    ),
    nome_cartola: safeString(time.nome_cartola || time.cartoleiro, ""),
    escudo: safeString(
      time.escudo || time.url_escudo_png || time.foto_time,
      "",
    ),
    pontos: safeNumber(time.pontos, null),
  };
}

// ✅ v2.8: Função para extrair dados de classificação de forma segura
function extractClassificacaoData(item, index) {
  if (!item || typeof item !== "object") {
    return {
      timeId: `unknown_${index}`,
      nome: `Time ${index + 1}`,
      nome_cartola: "",
      escudo: "",
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      pontosGoleada: 0,
      saldo_gols: 0,
      financeiro: 0,
      ativo: true,
    };
  }

  return {
    timeId: safeString(
      item.timeId || item.time_id || item.id,
      `unknown_${index}`,
    ),
    nome: safeString(item.nome || item.nome_time, `Time ${index + 1}`),
    nome_cartola: safeString(item.nome_cartola || item.cartoleiro, ""),
    escudo: safeString(
      item.escudo || item.url_escudo_png || item.foto_time,
      "",
    ),
    pontos: safeNumber(item.pontos, 0),
    jogos: safeNumber(item.jogos, 0),
    vitorias: safeNumber(item.vitorias, 0),
    empates: safeNumber(item.empates, 0),
    derrotas: safeNumber(item.derrotas, 0),
    pontosGoleada: safeNumber(item.pontosGoleada, 0),
    gols_pro: safeNumber(item.gols_pro, 0),
    gols_contra: safeNumber(item.gols_contra, 0),
    saldo_gols: safeNumber(item.saldo_gols, 0),
    financeiro: safeNumber(item.financeiro, 0),
    ativo: item.ativo !== false,
    rodada_desistencia: item.rodada_desistencia || null,
  };
}

// Função simplificada para brasões (CORREÇÃO APLICADA)
function obterBrasaoTime(time) {
  const clubeId = time?.clube_id || "default";
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
        <div class="pontos-corridos-icon"><span class="material-icons">bolt</span></div>
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
        <span class="material-icons" style="vertical-align: middle; margin-right: 8px;">leaderboard</span> Classificação Geral
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

  if (totalRodadas === 0) {
    if (progresso) {
      progresso.innerHTML = `
        <div class="progresso-info">
          <span class="progresso-texto">Sem rodadas consolidadas</span>
          <div class="progresso-bar">
            <div class="progresso-fill" style="width: 0%"></div>
          </div>
        </div>
      `;
    }
    grid.innerHTML = `
      <div class="empty-state" style="width: 100%;">
        <span class="material-icons" style="font-size: 36px; color: var(--text-muted);">assignment</span>
        <h3 class="empty-title">Rodadas indisponíveis</h3>
        <p class="empty-message">Não há dados consolidados para exibir.</p>
      </div>
    `;
    return;
  }

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
          <span class="progresso-texto"><span class="material-icons" style="font-size: 16px; vertical-align: middle; color: #ffd700;">emoji_events</span> Liga Encerrada! ${totalRodadas} rodadas disputadas</span>
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
      ${ligaEncerrou && index === totalRodadas - 1 ? '<div class="badge-final"><span class="material-icons" style="font-size: 12px; color: #1a1a1a;">emoji_events</span></div>' : ""}
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
      card.title = `Rodada ${numeroRodada} - RODADA FINAL`;
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
      <div class="error-icon"><span class="material-icons" style="font-size: 48px; color: #facc15;">warning</span></div>
      <h3 class="error-title">Erro ao carregar dados</h3>
      <p class="error-message">${error?.message || error || "Erro desconhecido"}</p>
      <button class="btn-retry" onclick="window.location.reload()">
        <span class="material-icons" style="vertical-align: middle; font-size: 18px;">sync</span> Tentar Novamente
      </button>
    </div>
  `;
}

// ✅ v2.9: Layout usando estrutura original (table) + fallbacks robustos + Material Icons
export function renderTabelaRodada(
  jogos,
  idxRodada,
  pontuacoesMap,
  rodadaAtualBrasileirao,
) {
  // Validação de entrada
  if (!Array.isArray(jogos) || jogos.length === 0) {
    return `
      <div class="empty-state">
        <span class="material-icons" style="font-size: 48px; color: var(--text-muted);">assignment</span>
        <h3 class="empty-title">Nenhum confronto</h3>
        <p class="empty-message">Não há jogos para esta rodada</p>
      </div>
    `;
  }

  const numeroRodada = safeNumber(idxRodada, 1);
  const rodadaBrasileirao = calcularRodadaBrasileirao(numeroRodada - 1);
  const isRodadaPassada = rodadaBrasileirao < rodadaAtualBrasileirao;
  const isRodadaAtual = rodadaBrasileirao === rodadaAtualBrasileirao;

  let statusTexto = "";
  if (isRodadaPassada) {
    statusTexto = "RODADA FINALIZADA";
  } else if (isRodadaAtual) {
    statusTexto = "RODADA EM ANDAMENTO";
  } else {
    statusTexto = "RODADA AINDA NÃO ACONTECEU";
  }

  let confrontosHTML = "";

  jogos.forEach((jogo, index) => {
    // ✅ v2.8: Extrair dados de forma segura - suporta time1/time2 e timeA/timeB
    const rawTimeA = jogo.time1 || jogo.timeA || {};
    const rawTimeB = jogo.time2 || jogo.timeB || {};

    const timeA = extractTimeData(rawTimeA, `A${index}`);
    const timeB = extractTimeData(rawTimeB, `B${index}`);

    // Pontos com fallback para pontuacoesMap
    const pontosA =
      timeA.pontos !== null
        ? timeA.pontos
        : (pontuacoesMap?.[timeA.id] ?? null);
    const pontosB =
      timeB.pontos !== null
        ? timeB.pontos
        : (pontuacoesMap?.[timeB.id] ?? null);

    const brasaoA = timeA.escudo || obterBrasaoTime(rawTimeA);
    const brasaoB = timeB.escudo || obterBrasaoTime(rawTimeB);

    let financeiroA = "R$ 0,00";
    let financeiroB = "R$ 0,00";
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
        classeConfronto = "empate";
        corPlacarA = "color: #3b82f6;";
        corPlacarB = "color: #3b82f6;";
        corFinanceiroA = "color: #22c55e;";
        corFinanceiroB = "color: #22c55e;";
      } else if (diferenca >= goleadaMinima) {
        if (pontosA > pontosB) {
          financeiroA = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          financeiroB = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          classeConfronto = "goleada";
          corPlacarA = "color: #ffd700; font-weight: 700;";
          corPlacarB = "color: #ef4444;";
          corFinanceiroA = "color: #22c55e;";
          corFinanceiroB = "color: #ef4444;";
        } else {
          financeiroA = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
          financeiroB = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.goleada.toFixed(2)}`;
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
          classeConfronto = "vitoria";
          corPlacarA = "color: #22c55e;";
          corPlacarB = "color: #ef4444;";
          corFinanceiroA = "color: #22c55e;";
          corFinanceiroB = "color: #ef4444;";
        } else {
          financeiroA = `-R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          financeiroB = `+R$ ${PONTOS_CORRIDOS_CONFIG.financeiro.vitoria.toFixed(2)}`;
          classeConfronto = "vitoria";
          corPlacarA = "color: #ef4444;";
          corPlacarB = "color: #22c55e;";
          corFinanceiroA = "color: #ef4444;";
          corFinanceiroB = "color: #22c55e;";
        }
      }
    }

    // ✅ v2.8: Estrutura original com <tr> para compatibilidade CSS
    confrontosHTML += `
      <tr class="confronto-linha ${classeConfronto}">
        <td style="padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <!-- Time A - Alinhado à esquerda -->
            <div style="display: flex; align-items: center; gap: 12px; flex: 1; justify-content: flex-start;">
              <img src="${brasaoA}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: contain;" alt="${timeA.nome}" onerror="this.src='/escudos/default.png'">
              <div style="text-align: left;">
                <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${timeA.nome}</div>
                ${timeA.nome_cartola ? `<div style="font-size: 11px; color: var(--text-muted);">${timeA.nome_cartola}</div>` : ""}
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
                <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${timeB.nome}</div>
                ${timeB.nome_cartola ? `<div style="font-size: 11px; color: var(--text-muted);">${timeB.nome_cartola}</div>` : ""}
              </div>
              <img src="${brasaoB}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: contain;" alt="${timeB.nome}" onerror="this.src='/escudos/default.png'">
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
        ${statusTexto}
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
// ✅ v2.1 CELEBRAÇÃO DO CAMPEÃO
// ============================================================================

function renderizarCelebracaoCampeao(campeao) {
  if (!campeao) return "";

  // ✅ v2.8: Extrair dados do campeão de forma segura
  const dados = extractClassificacaoData(campeao, 0);

  const escudoFallback =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%23ffd700' width='80' height='80' rx='8'/%3E%3C/svg%3E";

  return `
    <div class="celebracao-campeao">
      <div class="confetti-container"></div>
      <div class="campeao-content">
        <span class="material-icons campeao-trofeu">emoji_events</span>
        <h2 class="campeao-titulo">CAMPEÃO!</h2>
        <div class="campeao-time">
          <img 
            src="${dados.escudo || escudoFallback}" 
            alt="${dados.nome}"
            class="campeao-escudo"
            onerror="this.src='${escudoFallback}'"
          >
          <div class="campeao-info">
            <span class="campeao-nome">${dados.nome}</span>
            ${dados.nome_cartola ? `<span class="campeao-cartola">${dados.nome_cartola}</span>` : ""}
          </div>
        </div>
        <div class="campeao-stats">
          <div class="stat">
            <span class="stat-valor">${dados.pontos}</span>
            <span class="stat-label">Pontos</span>
          </div>
          <div class="stat">
            <span class="stat-valor">${dados.vitorias}</span>
            <span class="stat-label">Vitórias</span>
          </div>
          <div class="stat">
            <span class="stat-valor">${dados.pontosGoleada}</span>
            <span class="stat-label">PG</span>
          </div>
          <div class="stat">
            <span class="stat-valor">R$ ${dados.financeiro.toFixed(2)}</span>
            <span class="stat-label">Financeiro</span>
          </div>
        </div>
      </div>
    </div>

    <style>
      .celebracao-campeao {
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.05));
        border: 2px solid rgba(255, 215, 0, 0.4);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 24px;
        text-align: center;
        position: relative;
        overflow: hidden;
      }
      .campeao-trofeu {
        font-size: 48px;
        color: #ffd700;
        margin-bottom: 8px;
        animation: bounce 1s ease-in-out infinite;
        display: block;
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      .campeao-titulo {
        color: #ffd700;
        font-size: 1.8rem;
        font-weight: 700;
        margin-bottom: 16px;
        text-shadow: 0 2px 10px rgba(255, 215, 0, 0.3);
      }
      .campeao-time {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin-bottom: 20px;
      }
      .campeao-escudo {
        width: 64px;
        height: 64px;
        border-radius: 8px;
        border: 3px solid #ffd700;
        box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
      }
      .campeao-info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
      }
      .campeao-nome {
        font-size: 1.4rem;
        font-weight: 600;
        color: #ffd700;
      }
      .campeao-cartola {
        font-size: 0.9rem;
        color: var(--text-muted, #888);
        margin-top: 2px;
      }
      .campeao-stats {
        display: flex;
        justify-content: center;
        gap: 24px;
        flex-wrap: wrap;
      }
      .campeao-stats .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .campeao-stats .stat-valor {
        font-size: 1.3rem;
        font-weight: 700;
        color: #ffd700;
      }
      .campeao-stats .stat-label {
        font-size: 0.75rem;
        color: var(--text-muted, #888);
        margin-top: 2px;
      }
    </style>
  `;
}

// ============================================================================
// ✅ v2.8: RENDERIZAR TABELA DE CLASSIFICAÇÃO - COM FALLBACKS ROBUSTOS
// ============================================================================

export function renderTabelaClassificacao(
  classificacao,
  ultimaRodadaComDados,
  houveErro,
  totalRodadasLiga = 31,
) {
  // ✅ v2.8: Validação de entrada
  if (!Array.isArray(classificacao) || classificacao.length === 0) {
    return `
      <div class="empty-state">
        <span class="material-icons empty-icon" style="font-size: 48px; color: var(--text-muted);">leaderboard</span>
        <h3 class="empty-title">Classificação não disponível</h3>
        <p class="empty-message">Dados insuficientes para gerar a classificação</p>
      </div>
    `;
  }

  // ✅ v2.1: Detectar se a liga encerrou
  const rodadaFinalBr =
    PONTOS_CORRIDOS_CONFIG.rodadaInicial + totalRodadasLiga - 1;
  const ligaEncerrou = safeNumber(ultimaRodadaComDados, 0) >= rodadaFinalBr;

  // ✅ v2.8: Extrair dados do campeão de forma segura
  const campeaoRaw = classificacao[0];
  const campeao = extractClassificacaoData(campeaoRaw, 0);

  let linhas = "";

  classificacao.forEach((item, index) => {
    // ✅ v2.8: Extrair dados de forma segura
    const time = extractClassificacaoData(item, index);

    const posicao = index + 1;

    let classePosicao = "classificacao-linha";
    if (posicao === 1) {
      classePosicao += " primeiro-lugar";
      if (ligaEncerrou) classePosicao += " campeao-final";
    } else if (posicao === 2) {
      classePosicao += " segundo-lugar";
    } else if (posicao === 3) {
      classePosicao += " terceiro-lugar";
    }

    // ✅ v2.8: Fallback para escudo
    const escudoFallback =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23ddd' width='40' height='40'/%3E%3C/svg%3E";
    const escudoUrl = time.escudo || escudoFallback;

    // ✅ v2.1: Badge de campeão se encerrou
    const badgeCampeao =
      ligaEncerrou && posicao === 1
        ? '<span class="material-icons" style="margin-left: 8px; font-size: 16px; color: #ffd700; vertical-align: middle;">emoji_events</span>'
        : "";

    // ✅ v2.8: Calcular aproveitamento de forma segura
    const totalJogos = time.vitorias + time.empates + time.derrotas;
    const aproveitamento =
      totalJogos > 0
        ? ((time.pontos / (totalJogos * 3)) * 100).toFixed(1)
        : "0.0";

    linhas += `
      <tr class="${classePosicao}">
        <td style="text-align: center; padding: 12px; font-weight: bold;">
          ${posicao}º
        </td>
        <td style="padding: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img 
              src="${escudoUrl}" 
              alt="${time.nome}" 
              style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover;${ligaEncerrou && posicao === 1 ? " border: 2px solid #ffd700;" : ""}"
              onerror="this.src='${escudoFallback}'"
            >
            <div style="display: flex; flex-direction: column; align-items: flex-start; text-align: left;">
              <span style="font-weight: 500;${ligaEncerrou && posicao === 1 ? " color: #ffd700;" : ""}">${time.nome}${badgeCampeao}</span>
              ${time.nome_cartola ? `<span style="font-size: 11px; color: var(--text-muted, #888); margin-top: 2px;">${time.nome_cartola}</span>` : ""}
            </div>
          </div>
        </td>
        <td class="pts-destaque">${time.pontos}</td>
        <td>${time.jogos}</td>
        <td class="vitorias">${time.vitorias}</td>
        <td class="empates">${time.empates}</td>
        <td class="derrotas">${time.derrotas}</td>
        <td class="goleadas">${time.pontosGoleada}</td>
        <td class="saldo ${time.saldo_gols >= 0 ? "positivo" : "negativo"}">${time.saldo_gols >= 0 ? "+" : ""}${time.saldo_gols.toFixed(1)}</td>
        <td class="financeiro ${time.financeiro >= 0 ? "positivo" : "negativo"}">R$ ${time.financeiro.toFixed(2)}</td>
        <td class="aproveitamento">${aproveitamento}%</td>
      </tr>
    `;
  });

  // ✅ v2.1: Renderizar celebração se encerrou
  const celebracaoHTML = ligaEncerrou
    ? renderizarCelebracaoCampeao(campeaoRaw)
    : "";

  // ✅ v2.1: Header diferente se encerrou
  const headerHTML = ligaEncerrou
    ? `
      <div class="classificacao-header liga-encerrada">
        <div class="classificacao-info-principal">
          <h3 class="classificacao-titulo"><span class="material-icons" style="vertical-align: middle; margin-right: 8px; color: #ffd700;">emoji_events</span> Classificação Final</h3>
          <p class="classificacao-subtitulo">
            Liga Pontos Corridos 2025 - Encerrada!
          </p>
        </div>
        <div class="classificacao-legenda">
          <span class="legenda-item primeiro campeao"><span class="material-icons" style="color: #ffd700; font-size: 18px;">military_tech</span></span>
          <span class="legenda-item segundo"><span class="material-icons" style="color: #c0c0c0; font-size: 18px;">military_tech</span></span>
          <span class="legenda-item terceiro"><span class="material-icons" style="color: #cd7f32; font-size: 18px;">military_tech</span></span>
          <span class="legenda-texto">Pódio Final</span>
        </div>
      </div>
    `
    : `
      <div class="classificacao-header">
        <div class="classificacao-info-principal">
          <h3 class="classificacao-titulo">Classificação Geral</h3>
          <p class="classificacao-subtitulo">
            Atualizada até a ${safeNumber(ultimaRodadaComDados, 0)}ª rodada
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
  "[PONTOS-CORRIDOS-UI] Módulo v2.8 carregado (fallbacks robustos para undefined)",
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
          <h3><span class="material-icons" style="vertical-align: middle; color: #ef4444;">error</span> Erro ao Carregar Módulo</h3>
          <p>${error?.message || error}</p>
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
