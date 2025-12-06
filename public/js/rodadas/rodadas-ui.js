// RODADAS UI - Interface e Renderização
// ✅ v2.3: Tabelas contextuais por rodada (valores de banco e labels de posição)
//         Rodadas 1-29: 6 times | Rodadas 30+: 4 times
// Responsável por: renderização de componentes, manipulação DOM, eventos

import {
  POSICAO_CONFIG,
  LIGAS_CONFIG,
  getBancoPorRodada,
  RODADA_TRANSICAO_SOBRAL,
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

// RENDERIZAR MINI CARDS DAS RODADAS
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
      isDisabled = false;
    } else if (i === rodada_atual) {
      if (mercadoAberto) {
        statusClass = "vigente";
        statusText = "Aberta";
        isDisabled = true;
      } else {
        statusClass = "parcial";
        statusText = "Parciais";
        isDisabled = false;
      }
    } else {
      statusClass = "futura";
      statusText = "Futura";
      isDisabled = true;
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

// ✅ v2.3: FUNÇÃO PARA OBTER LABEL DE POSIÇÃO (contextual por rodada)
export function getPosLabel(index, total, ligaId, rodada) {
  const pos = index + 1;
  const isLigaCartoleirosSobral = ligaId === LIGAS_CONFIG.CARTOLEIROS_SOBRAL;

  if (isLigaCartoleirosSobral) {
    // ✅ v2.3: Determinar fase baseada na rodada
    const isFase1 = rodada < RODADA_TRANSICAO_SOBRAL; // Rodadas 1-29: 6 times

    if (isFase1) {
      // FASE 1: 6 times (rodadas 1-29)
      if (pos === 1) {
        return `<span style="color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;">MITO</span>`;
      }
      if (pos === 2) {
        return `<span class="pos-g">G2</span>`;
      }
      if (pos === 3) {
        return `<span class="pos-neutro">3º</span>`;
      }
      if (pos === 4) {
        return `<span class="pos-z">Z3</span>`;
      }
      if (pos === 5) {
        return `<span class="pos-z">Z2</span>`;
      }
      if (pos === 6) {
        return `<span style="color:#fff; font-weight:bold; background:#dc3545; border-radius:4px; padding:1px 8px; font-size:12px;">MICO</span>`;
      }
    } else {
      // FASE 2: 4 times (rodadas 30+)
      if (pos === 1) {
        return `<span style="color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;">MITO</span>`;
      }
      if (pos === 2 || pos === 3) {
        return `<span class="pos-neutro">${pos}º</span>`;
      }
      if (pos === 4) {
        return `<span style="color:#fff; font-weight:bold; background:#dc3545; border-radius:4px; padding:1px 8px; font-size:12px;">MICO</span>`;
      }
    }
    return `${pos}°`;
  } else {
    // SUPERCARTOLA - Lógica original
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

// ✅ v2.3: EXIBIR RANKING - TABELAS CONTEXTUAIS POR RODADA
export function exibirRanking(rankingsDaRodada, rodadaSelecionada, ligaId) {
  const rankingBody = getElement("rankingBody");

  // Validar se é array
  if (
    !rankingsDaRodada ||
    !Array.isArray(rankingsDaRodada) ||
    rankingsDaRodada.length === 0
  ) {
    console.warn(
      "[RODADAS-UI] Dados inválidos recebidos:",
      typeof rankingsDaRodada,
    );
    rankingBody.innerHTML = `<tr><td colspan="6">Nenhum dado encontrado para a rodada ${rodadaSelecionada}.</td></tr>`;
    limparExportContainer();
    return;
  }

  // ✅ v2.2: Separar ativos e inativos CONSIDERANDO A RODADA SELECIONADA
  // Regra: Se rodada < rodada_desistencia, participante era ATIVO nessa rodada
  const ativos = rankingsDaRodada.filter((r) => {
    if (r.ativo === false && r.rodada_desistencia) {
      // Inativo atualmente, mas era ativo ANTES da rodada de desistência
      return rodadaSelecionada < r.rodada_desistencia;
    }
    return r.ativo !== false;
  });

  const inativos = rankingsDaRodada.filter((r) => {
    if (r.ativo === false && r.rodada_desistencia) {
      // Só mostra como inativo se rodada >= rodada_desistencia
      return rodadaSelecionada >= r.rodada_desistencia;
    }
    // Inativo sem rodada_desistencia definida (fallback)
    return r.ativo === false && !r.rodada_desistencia;
  });

  // Ordenar ativos por pontos
  ativos.sort((a, b) => parseFloat(b.pontos || 0) - parseFloat(a.pontos || 0));

  // ✅ v2.3: Usar valores de banco contextuais por rodada
  const bancoValores = getBancoPorRodada(ligaId, rodadaSelecionada);
  const totalAtivos = ativos.length;

  console.log(
    `[RODADAS-UI] Rodada ${rodadaSelecionada}: usando tabela de ${Object.keys(bancoValores).length} posições`,
  );

  // Renderizar ativos
  let tableHTML = ativos
    .map((rank, index) => {
      const banco =
        bancoValores[index + 1] !== undefined ? bancoValores[index + 1] : 0.0;
      // ✅ v2.3: Passar rodada para getPosLabel
      const posLabel = getPosLabel(
        index,
        totalAtivos,
        ligaId,
        rodadaSelecionada,
      );
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

  // ✅ v2.2: Adicionar seção de inativos (só para rodadas >= rodada_desistencia)
  if (inativos.length > 0) {
    tableHTML += `
      <tr class="secao-inativos-header">
        <td colspan="6" style="background: rgba(107,114,128,0.1); padding: 8px; text-align: center; font-weight: 600; color: #6b7280; border-top: 2px solid #3f3f46;">
          <span style="display: inline-flex; align-items: center; gap: 6px;">
            👤 Participantes Inativos (${inativos.length})
          </span>
        </td>
      </tr>
    `;

    // Ordenar inativos por pontos
    inativos.sort(
      (a, b) => parseFloat(b.pontos || 0) - parseFloat(a.pontos || 0),
    );

    tableHTML += inativos
      .map((rank) => {
        const nomeCartoleiro =
          rank.nome_cartola || rank.nome_cartoleiro || "N/D";
        const nomeTime = rank.nome_time || "N/D";
        const pontos =
          rank.pontos != null ? parseFloat(rank.pontos).toFixed(2) : "-";
        const rodadaDesist = rank.rodada_desistencia;
        const infoSaida = rodadaDesist ? `Saiu R${rodadaDesist}` : "Inativo";

        return `
        <tr style="opacity: 0.5; filter: grayscale(60%);">
          <td style="text-align:center; padding:2px; font-size:11px; width:45px; color: #6b7280;">—</td>
          <td style="text-align:center; padding:2px; width:35px;">
            ${rank.clube_id ? `<img src="/escudos/${rank.clube_id}.png" alt="" style="width:16px; height:16px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>` : "—"}
          </td>
          <td style="text-align:left; padding:2px 4px; font-size:11px; color: #6b7280;" title="${nomeCartoleiro}">${nomeCartoleiro}</td>
          <td style="text-align:left; padding:2px 4px; font-size:11px; color: #6b7280;" title="${nomeTime}">${nomeTime}</td>
          <td style="text-align:center; padding:2px; font-size:11px; color: #6b7280;">${pontos}</td>
          <td style="text-align:center; padding:2px; font-size:10px; color: #9ca3af;">${infoSaida}</td>
        </tr>`;
      })
      .join("");
  }

  rankingBody.innerHTML = tableHTML;
  limparExportContainer();

  console.log(
    `[RODADAS-UI] ✅ Rodada ${rodadaSelecionada}: ${ativos.length} ativos, ${inativos.length} inativos (contextuais)`,
  );
}

// ✅ v2.3: EXIBIR RANKING PARCIAIS - TABELAS CONTEXTUAIS POR RODADA
export async function exibirRankingParciais(
  rankings,
  rodada,
  ligaId,
  callbackBotaoExportacao,
) {
  const rankingBody = getElement("rankingBody");

  // Validar se é array
  if (!rankings || !Array.isArray(rankings) || rankings.length === 0) {
    console.warn(
      "[RODADAS-UI] Dados parciais inválidos recebidos:",
      typeof rankings,
    );
    rankingBody.innerHTML = `<tr><td colspan="6">Nenhum dado parcial encontrado para a rodada ${rodada}.</td></tr>`;
    limparExportContainer();
    return;
  }

  // ✅ v2.2: Separar ativos e inativos CONSIDERANDO A RODADA SELECIONADA
  // Regra: Se rodada < rodada_desistencia, participante era ATIVO nessa rodada
  const ativos = rankings.filter((r) => {
    if (r.ativo === false && r.rodada_desistencia) {
      // Inativo atualmente, mas era ativo ANTES da rodada de desistência
      return rodada < r.rodada_desistencia;
    }
    return r.ativo !== false;
  });

  const inativos = rankings.filter((r) => {
    if (r.ativo === false && r.rodada_desistencia) {
      // Só mostra como inativo se rodada >= rodada_desistencia
      return rodada >= r.rodada_desistencia;
    }
    // Inativo sem rodada_desistencia definida (fallback)
    return r.ativo === false && !r.rodada_desistencia;
  });

  // Ordenar ativos por pontos (maior primeiro)
  ativos.sort(
    (a, b) =>
      parseFloat(b.totalPontos || b.pontos || 0) -
      parseFloat(a.totalPontos || a.pontos || 0),
  );

  // ✅ v2.3: Usar valores de banco contextuais por rodada
  const bancoValores = getBancoPorRodada(ligaId, rodada);
  const totalAtivos = ativos.length;

  console.log(
    `[RODADAS-UI] Parciais rodada ${rodada}: usando tabela de ${Object.keys(bancoValores).length} posições`,
  );

  let tableHTML = ativos
    .map((rank, index) => {
      const banco =
        bancoValores[index + 1] !== undefined ? bancoValores[index + 1] : 0.0;
      // ✅ v2.3: Passar rodada para getPosLabel
      const posLabel = getPosLabel(index, totalAtivos, ligaId, rodada);
      const nomeCartoleiro = rank.nome_cartola || "N/D";
      const nomeTime = rank.nome_time || "N/D";
      const pontos =
        rank.totalPontos != null
          ? parseFloat(rank.totalPontos).toFixed(2)
          : rank.pontos != null
            ? parseFloat(rank.pontos).toFixed(2)
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

  // ✅ v2.2: Adicionar seção de inativos (só para rodadas >= rodada_desistencia)
  if (inativos.length > 0) {
    tableHTML += `
      <tr class="secao-inativos-header">
        <td colspan="6" style="background: rgba(107,114,128,0.1); padding: 8px; text-align: center; font-weight: 600; color: #6b7280; border-top: 2px solid #3f3f46;">
          <span style="display: inline-flex; align-items: center; gap: 6px;">
            👤 Participantes Inativos (${inativos.length})
          </span>
        </td>
      </tr>
    `;

    // Ordenar inativos por pontos
    inativos.sort(
      (a, b) =>
        parseFloat(b.totalPontos || b.pontos || 0) -
        parseFloat(a.totalPontos || a.pontos || 0),
    );

    tableHTML += inativos
      .map((rank) => {
        const nomeCartoleiro = rank.nome_cartola || "N/D";
        const nomeTime = rank.nome_time || "N/D";
        const pontos =
          rank.totalPontos != null
            ? parseFloat(rank.totalPontos).toFixed(2)
            : rank.pontos != null
              ? parseFloat(rank.pontos).toFixed(2)
              : "-";
        const rodadaDesist = rank.rodada_desistencia;
        const infoSaida = rodadaDesist ? `Saiu R${rodadaDesist}` : "Inativo";

        return `
        <tr style="opacity: 0.5; filter: grayscale(60%);">
          <td style="text-align:center; padding:2px; font-size:11px; width:45px; color: #6b7280;">—</td>
          <td style="text-align:center; padding:2px; width:35px;">
            ${rank.clube_id ? `<img src="/escudos/${rank.clube_id}.png" alt="" style="width:16px; height:16px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>` : "—"}
          </td>
          <td style="text-align:left; padding:2px 4px; font-size:11px; color: #6b7280;" title="${nomeCartoleiro}">${nomeCartoleiro}</td>
          <td style="text-align:left; padding:2px 4px; font-size:11px; color: #6b7280;" title="${nomeTime}">${nomeTime}</td>
          <td style="text-align:center; padding:2px; font-size:11px; color: #6b7280;">${pontos}</td>
          <td style="text-align:center; padding:2px; font-size:10px; color: #9ca3af;">${infoSaida}</td>
        </tr>`;
      })
      .join("");
  }

  rankingBody.innerHTML = tableHTML;

  // Criar botão de exportação para parciais
  if (callbackBotaoExportacao) {
    callbackBotaoExportacao(ativos, rodada, true);
  }

  console.log(
    `[RODADAS-UI] ✅ Parciais rodada ${rodada}: ${ativos.length} ativos, ${inativos.length} inativos (contextuais)`,
  );
}

// ==============================
// FUNÇÕES DE ESTADO E LIMPEZA
// ==============================

// LIMPAR CONTAINER DE EXPORTAÇÃO
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
// FUNÇÕES PARA DEBUG
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
  "[RODADAS-UI] ✅ Módulo v2.3 carregado (tabelas contextuais por rodada)",
);
