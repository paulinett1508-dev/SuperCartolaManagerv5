// RODADAS UI - Interface e Renderização
// Responsável por: renderização de componentes, manipulação DOM, eventos

import {
  POSICAO_CONFIG,
  LIGAS_CONFIG,
  getBancoPorLiga,
} from "./rodadas-config.js";

import { getStatusMercado } from "./rodadas-core.js";

// Cache de elementos DOM para performance
const elementsCache = new Map();

// Estado da interface
let rodadaAtualSelecionada = null;

// Função para cache de elementos DOM
function getElement(id) {
  if (!elementsCache.has(id)) {
    elementsCache.set(id, document.getElementById(id));
  }
  return elementsCache.get(id);
}

// ==============================
// RENDERIZAÇÃO DE MINI CARDS
// ==============================

// RENDERIZAR MINI CARDS DAS RODADAS (linhas 173-207 do original)
export async function renderizarMiniCardsRodadas() {
  console.log("[RODADAS-UI] renderizarMiniCardsRodadas iniciada");

  const cardsContainer = getElement("rodadasCards");
  console.log(
    "[RODADAS-UI] Container rodadasCards encontrado:",
    !!cardsContainer,
  );

  if (!cardsContainer) {
    console.error("[RODADAS-UI] Container rodadasCards não encontrado!");
    return;
  }

  const { rodada_atual, status_mercado } = getStatusMercado();
  console.log("[RODADAS-UI] Status do mercado:", {
    rodada_atual,
    status_mercado,
  });

  const mercadoAberto = status_mercado === 1;

  let cardsHTML = "";

  for (let i = 1; i <= 38; i++) {
    let statusClass = "";
    let statusText = "";
    let isDisabled = false;

    if (i < rodada_atual) {
      statusClass = "encerrada";
      statusText = "Encerrada";
      isDisabled = false; // Permitir clicar em rodadas encerradas
    } else if (i === rodada_atual) {
      if (mercadoAberto) {
        statusClass = "vigente";
        statusText = "Aberta";
        isDisabled = true; // Mercado aberto = sem dados ainda
      } else {
        statusClass = "parcial";
        statusText = "Parciais";
        isDisabled = false; // Mercado fechado = tem parciais
      }
    } else {
      statusClass = "futura";
      statusText = "Futura";
      isDisabled = true; // Apenas rodadas futuras ficam desabilitadas
    }

    cardsHTML += `
      <div class="rodada-mini-card ${isDisabled ? "disabled" : ""}"
           data-rodada="${i}"
           onclick="${isDisabled ? "" : `selecionarRodada(${i})`}">
        <div class="rodada-numero">${i}</div>
        <div class="rodada-status ${statusClass}">${statusText}</div>
      </div>
    `;
  }

  cardsContainer.innerHTML = cardsHTML;
}

// ==============================
// SELEÇÃO DE RODADA
// ==============================

// SELECIONAR RODADA (linhas 212-237 do original)
export async function selecionarRodada(rodada, carregarDadosCallback) {
  if (rodadaAtualSelecionada === rodada) return;

  // Atualizar seleção visual
  document.querySelectorAll(".rodada-mini-card").forEach((card) => {
    card.classList.remove("selected");
  });

  const cardSelecionado = document.querySelector(`[data-rodada="${rodada}"]`);
  if (cardSelecionado) {
    cardSelecionado.classList.add("selected");
  }

  rodadaAtualSelecionada = rodada;

  // Mostrar seção de conteúdo
  const contentSection = getElement("rodadaContentSection");
  if (contentSection) {
    contentSection.style.display = "block";
  }

  // Atualizar título
  const titulo = getElement("rodadaTituloAtual");
  if (titulo) {
    titulo.textContent = `Rodada ${rodada}`;
  }

  // Carregar dados da rodada via callback
  if (carregarDadosCallback) {
    await carregarDadosCallback(rodada);
  }
}

// ==============================
// EXIBIÇÃO DE RANKINGS
// ==============================

// FUNÇÃO PARA OBTER LABEL DE POSIÇÃO (linhas 243-259 do original - refatorada)
export function getPosLabel(index, total, ligaId) {
  const pos = index + 1;
  const isLigaCartoleirosSobral = ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL;

  if (isLigaCartoleirosSobral) {
    const config = POSICAO_CONFIG.CARTOLEIROS_SOBRAL;

    if (pos === config.mito.pos) {
      return `<span style="${config.mito.style}">${config.mito.label}</span>`;
    }
    if (pos === config.mico.pos) {
      return `<span style="${config.mico.style}">${config.mico.label}</span>`;
    }
    if (pos === config.g2.pos) {
      return `<span class="${config.g2.className}">${config.g2.label}</span>`;
    }
    return `${pos}°`;
  } else {
    const config = POSICAO_CONFIG.SUPERCARTOLA;

    if (pos === config.mito.pos) {
      return `<span style="${config.mito.style}">${config.mito.label}</span>`;
    }
    if (config.g2_g11.range[0] <= pos && pos <= config.g2_g11.range[1]) {
      return `<span class="${config.g2_g11.className}">${config.g2_g11.getLabel(pos)}</span>`;
    }
    if (config.zona.condition(pos, total)) {
      return `<span class="${config.zona.className}">${config.zona.getLabel(pos, total)}</span>`;
    }
    if (config.mico.condition(pos, total)) {
      return `<span class="${config.mico.className}">${config.mico.label}</span>`;
    }
    return `${pos}°`;
  }
}

// EXIBIR RANKING FINALIZADO (linhas 442-515 do original)
export function exibirRanking(
  rankingsDaRodada,
  rodadaSelecionada,
  ligaId,
  criarBotaoCallback,
) {
  const rankingBody = getElement("rankingBody");

  // Validar se é array
  if (!rankingsDaRodada || !Array.isArray(rankingsDaRodada) || rankingsDaRodada.length === 0) {
    console.warn('[RODADAS-UI] Dados inválidos recebidos:', typeof rankingsDaRodada);
    rankingBody.innerHTML = `<tr><td colspan="6">Nenhum dado encontrado para a rodada ${rodadaSelecionada}.</td></tr>`;
    limparExportContainer();
    return;
  }

  const bancoValores = getBancoPorLiga(ligaId);

  const tableHTML = rankingsDaRodada
    .map((rank, index) => {
      const banco =
        bancoValores[index + 1] !== undefined ? bancoValores[index + 1] : 0.0;
      const posLabel = getPosLabel(index, rankingsDaRodada.length, ligaId);
      const nomeCartoleiro = rank.nome_cartola || rank.nome_cartoleiro || "N/D";
      const nomeTime = rank.nome_time || "N/D";
      const pontos =
        rank.pontos != null ? parseFloat(rank.pontos).toFixed(2) : "-";

      return `
      <tr>
        <td style="text-align:center; padding:2px; font-size:11px; width:45px;">${posLabel}</td>
        <td style="text-align:center; padding:2px; width:35px;">
          ${rank.clube_id ? `<img src="/escudos/${rank.clube_id}.png" alt="" title="${rank.clube_id}" style="width:16px; height:16px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>` : "—"}
        </td>
        <td style="text-align:left; padding:2px 4px; font-size:11px; max-width:150px; overflow:hidden; text-overflow:ellipsis;" title="${nomeCartoleiro}">${nomeCartoleiro}</td>
        <td style="text-align:left; padding:2px 4px; font-size:11px; max-width:150px; overflow:hidden; text-overflow:ellipsis;" title="${nomeTime}">${nomeTime}</td>
        <td style="text-align:center; padding:2px; font-size:11px;">
          <span style="font-weight:600; color:${pontos > 0 ? "#198754" : pontos < 0 ? "#dc3545" : "#333"};">${pontos}</span>
        </td>
        <td style="text-align:center; padding:2px; font-size:10px;">
          <span style="font-weight:600; color:${banco > 0 ? "#198754" : banco < 0 ? "#dc3545" : "#333"};">
            ${banco >= 0 ? `R$ ${banco.toFixed(2)}` : `-R$ ${Math.abs(banco).toFixed(2)}`}
          </span>
        </td>
      </tr>`;
    })
    .join("");

  rankingBody.innerHTML = tableHTML;

  // Criar botão de exportação
  if (criarBotaoCallback) {
    criarBotaoCallback(rankingsDaRodada, rodadaSelecionada, false);
  }
}

// EXIBIR RANKING PARCIAIS (linhas 516-567 do original)
export async function exibirRankingParciais(rankings, rodada, ligaId, callbackBotaoExportacao) {
  const rankingBody = getElement("rankingBody");

  // Validar se é array
  if (
    !rankings ||
    !Array.isArray(rankings) ||
    rankings.length === 0
  ) {
    console.warn('[RODADAS-UI] Dados parciais inválidos recebidos:', typeof rankings);
    rankingBody.innerHTML = `<tr><td colspan="6">Nenhum dado parcial encontrado para a rodada ${rodada}.</td></tr>`;
    limparExportContainer();
    return;
  }

  // Ordenar por pontos (maior primeiro)
  rankings.sort(
    (a, b) => parseFloat(b.totalPontos) - parseFloat(a.totalPontos),
  );

  // Não precisa buscar dados novamente - já vieram do calcularPontosParciais
  const bancoValores = getBancoPorLiga(ligaId);

  const tableHTML = rankings
    .map((rank, index) => {
      const banco = bancoValores[index + 1] !== undefined ? bancoValores[index + 1] : 0.0;
      const posLabel = getPosLabel(index, rankings.length, ligaId);
      const nomeCartoleiro = rank.nome_cartola || "N/D";
      const nomeTime = rank.nome_time || "N/D";
      const pontos =
        rank.totalPontos != null
          ? parseFloat(rank.totalPontos).toFixed(2)
          : "-";

      return `
      <tr>
        <td style="text-align:center; padding:2px; font-size:11px; width:45px;">${posLabel}</td>
        <td style="text-align:center; padding:2px; width:35px;">
          ${rank.clube_id ? `<img src="/escudos/${rank.clube_id}.png" alt="" title="${rank.clube_id}" style="width:16px; height:16px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>` : "—"}
        </td>
        <td style="text-align:left; padding:2px 4px; font-size:11px; max-width:150px; overflow:hidden; text-overflow:ellipsis;" title="${nomeCartoleiro}">${nomeCartoleiro}</td>
        <td style="text-align:left; padding:2px 4px; font-size:11px; max-width:150px; overflow:hidden; text-overflow:ellipsis;" title="${nomeTime}">${nomeTime}</td>
        <td style="text-align:center; padding:2px; font-size:11px;">
          <span style="font-weight:600; color:${pontos > 0 ? "#198754" : pontos < 0 ? "#dc3545" : "#333"};">${pontos}</span>
        </td>
        <td style="text-align:center; padding:2px; font-size:10px;">
          <span style="font-weight:600; color:${banco > 0 ? "#198754" : banco < 0 ? "#dc3545" : "#333"};">
            ${banco >= 0 ? `R$ ${banco.toFixed(2)}` : `-R$ ${Math.abs(banco).toFixed(2)}`}
          </span>
        </td>
      </tr>`;
    })
    .join("");

  rankingBody.innerHTML = tableHTML;

  // Criar botão de exportação para parciais
  if (callbackBotaoExportacao) {
    callbackBotaoExportacao(rankings, rodada, true);
  }
}

// ==============================
// FUNÇÕES DE ESTADO E LIMPEZA
// ==============================

// LIMPAR CONTAINER DE EXPORTAÇÃO (linha 600 do original)
export function limparExportContainer() {
  const exportContainer = getElement("rodadasExportBtnContainer");
  if (exportContainer) exportContainer.innerHTML = "";
}

// MOSTRAR ESTADOS DE LOADING E ERRO
export function mostrarLoading(show = true) {
  const loading = getElement("loading");
  if (loading) {
    loading.style.display = show ? "block" : "none";
  }
}

export function mostrarMensagemRodada(mensagem, tipo = "info") {
  const rankingBody = getElement("rankingBody");
  if (!rankingBody) return;

  const cores = {
    info: "#e67e22",
    erro: "red",
    aviso: "#bbb",
  };

  rankingBody.innerHTML = `<tr><td colspan="6" style="color: ${cores[tipo] || cores.info}; text-align: center; padding: 20px;">${mensagem}</td></tr>`;
  limparExportContainer();
}

// ==============================
// FUNÇÕES PARA DEBUG (linhas 816-845 do original)
// ==============================

export function exibirRodadas(rodadas) {
  console.log("[RODADAS-UI] Iniciando exibição de rodadas...");
  console.log("[RODADAS-UI] Dados recebidos:", rodadas);

  const container = getElement("rodadas-lista");
  if (!container) {
    console.error(
      "[RODADAS-UI] Container 'rodadas-lista' não encontrado no DOM",
    );
    return;
  }

  console.log("[RODADAS-UI] Container encontrado:", container);

  if (!rodadas || rodadas.length === 0) {
    console.warn("[RODADAS-UI] Nenhuma rodada para exibir");
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        Nenhuma rodada encontrada. Use o botão "Popular Rodadas" para carregar os dados.
      </div>
    `;
    return;
  }

  console.log(`[RODADAS-UI] Exibindo ${rodadas.length} registros de rodadas`);
}

// ==============================
// GETTERS E UTILITÁRIOS
// ==============================

export function getRodadaAtualSelecionada() {
  return rodadaAtualSelecionada;
}

export function limparCacheUI() {
  elementsCache.clear();
  console.log("[RODADAS-UI] Cache de elementos limpo");
}

console.log(
  "[RODADAS-UI] Módulo carregado com layout compacto e seleção inteligente",
);