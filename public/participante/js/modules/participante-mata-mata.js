/**
 * PARTICIPANTE MATA-MATA v5.4
 * Design Moderno + Tempos Verbais Dinâmicos + Coluna DIF
 * CORREÇÃO: Usa mmPhaseInfo existente no HTML (sem duplicação)
 */

const ParticipanteMataMata = (function () {
  "use strict";

  // ====== ESTADO ======
  const estado = {
    ligaId: null,
    meuTimeId: null,
    edicaoAtual: null,
    faseAtual: "primeira",
    rodadaAtual: 0,
    rodadaEmAndamento: false,
    edicoes: [],
    dadosCache: {},
  };

  // ====== PLACEHOLDERS SVG ======
  const PLACEHOLDER_32 =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect fill='%233a3a3c' width='32' height='32' rx='16'/%3E%3Ctext x='16' y='20' text-anchor='middle' fill='%236b7280' font-size='12' font-family='sans-serif'%3E?%3C/text%3E%3C/svg%3E";
  const PLACEHOLDER_24 =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect fill='%233a3a3c' width='24' height='24' rx='12'/%3E%3Ctext x='12' y='16' text-anchor='middle' fill='%236b7280' font-size='10' font-family='sans-serif'%3E?%3C/text%3E%3C/svg%3E";

  // ====== FASES ======
  const FASES_CONFIG = [
    { id: "primeira", label: "1ª FASE", rodada: 32 },
    { id: "oitavas", label: "OITAVAS", rodada: 33 },
    { id: "quartas", label: "QUARTAS", rodada: 34 },
    { id: "semis", label: "SEMIFINAL", rodada: 35 },
    { id: "final", label: "FINAL", rodada: 36 },
  ];

  // ====== INICIALIZAÇÃO ======
  async function init(dados) {
    console.log("[MATA-MATA] Inicializando v5.4...", dados);

    // Recebe via parâmetro OU fallback para window (compatibilidade)
    estado.ligaId = dados?.ligaId || window.LIGA_ID;
    estado.meuTimeId = dados?.timeId || window.TIME_ID;

    if (!estado.ligaId || !estado.meuTimeId) {
      renderErro("Dados da liga não encontrados");
      return;
    }

    await carregarStatusMercado();
    await carregarEdicoes();
    setupEventos();
  }

  // ====== CARREGAR STATUS DO MERCADO ======
  async function carregarStatusMercado() {
    try {
      // Tentar múltiplas rotas possíveis
      const rotas = [
        "/api/cartola/mercado/status",
        "/api/mercado/status",
        "/api/status/mercado",
      ];

      for (const rota of rotas) {
        try {
          const res = await fetch(rota);
          if (res.ok) {
            const data = await res.json();
            estado.rodadaAtual = data.rodada_atual || 0;
            estado.rodadaEmAndamento = data.status_mercado === 2;
            console.log("[MATA-MATA] Status mercado carregado:", {
              rodada: estado.rodadaAtual,
              emAndamento: estado.rodadaEmAndamento,
            });
            return;
          }
        } catch (e) {
          // Tenta próxima rota
        }
      }

      // Se nenhuma rota funcionar, usa valores padrão
      console.warn(
        "[MATA-MATA] API de status não disponível, usando valores padrão",
      );
      estado.rodadaAtual = 37;
      estado.rodadaEmAndamento = false;
    } catch (err) {
      console.warn("[MATA-MATA] Erro ao carregar status:", err);
    }
  }

  // ====== CARREGAR EDIÇÕES ======
  async function carregarEdicoes() {
    try {
      const res = await fetch(`/api/ligas/${estado.ligaId}`);
      if (!res.ok) throw new Error("Erro ao buscar liga");

      const liga = await res.json();
      estado.edicoes = [];

      for (let i = 1; i <= (liga.edicao_atual || 1); i++) {
        estado.edicoes.push({ numero: i, nome: `${i}ª Edição` });
      }

      estado.edicaoAtual = liga.edicao_atual || 1;
      console.log(
        "[MATA-MATA] Edições carregadas:",
        estado.edicoes.length,
        "| Atual:",
        estado.edicaoAtual,
      );

      renderSelectEdicoes();
      await carregarDadosEdicao(estado.edicaoAtual);
    } catch (err) {
      console.error("[MATA-MATA] Erro:", err);
      renderErro("Erro ao carregar edições");
    }
  }

  // ====== CARREGAR DADOS DA EDIÇÃO ======
  async function carregarDadosEdicao(edicao) {
    try {
      const res = await fetch(
        `/api/mata-mata/cache/${estado.ligaId}/${edicao}`,
      );
      if (!res.ok) throw new Error("Cache não encontrado");

      const data = await res.json();
      if (data.cached && data.dados) {
        estado.dadosCache[edicao] = data.dados;
        const totalParticipantes = contarParticipantes(data.dados);
        atualizarContador(totalParticipantes);
        renderFases();
        renderConteudo();
      } else {
        renderVazio("Dados não disponíveis para esta edição");
      }
    } catch (err) {
      console.error("[MATA-MATA] Erro ao carregar edição:", err);
      renderVazio("Aguardando processamento do mata-mata");
    }
  }

  // ====== CONTAR PARTICIPANTES ======
  function contarParticipantes(dados) {
    if (dados.primeira && dados.primeira.length > 0) {
      return dados.primeira.length * 2;
    }
    return 0;
  }

  // ====== ATUALIZAR CONTADOR ======
  function atualizarContador(total) {
    const el = document.getElementById("mmTimesCount");
    if (el) el.textContent = `${total} participante(s)`;
  }

  // ====== RENDER SELECT EDIÇÕES ======
  function renderSelectEdicoes() {
    const select = document.getElementById("mmEditionSelect");
    if (!select) return;

    select.innerHTML = estado.edicoes
      .map(
        (ed) =>
          `<option value="${ed.numero}" ${ed.numero === estado.edicaoAtual ? "selected" : ""}>${ed.nome}</option>`,
      )
      .join("");
  }

  // ====== RENDER FASES ======
  function renderFases() {
    const nav = document.getElementById("mmPhasesNav");
    if (!nav) return;

    const dados = estado.dadosCache[estado.edicaoAtual] || {};

    nav.innerHTML = FASES_CONFIG.map((fase) => {
      const temDados = dados[fase.id] && dados[fase.id].length > 0;
      const isAtiva = fase.id === estado.faseAtual;
      const classes = [
        "mm-phase-btn",
        isAtiva ? "active" : "",
        !temDados ? "disabled" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `<button class="${classes}" data-fase="${fase.id}" ${!temDados ? "disabled" : ""}>${fase.label}</button>`;
    }).join("");
  }

  // ====== ATUALIZAR INFO DA FASE (usa elemento existente) ======
  function atualizarInfoFase() {
    const infoEl = document.getElementById("mmPhaseInfo");
    if (!infoEl) return;

    const faseConfig = FASES_CONFIG.find((f) => f.id === estado.faseAtual);

    infoEl.innerHTML = `
      <p class="mm-edition-name">${estado.edicaoAtual}ª Edição</p>
      <p class="mm-phase-name">${faseConfig?.label || estado.faseAtual.toUpperCase()}</p>
      <p class="mm-round-info">Rodada ${faseConfig?.rodada || "?"}</p>
    `;
  }

  // ====== RENDER CONTEÚDO PRINCIPAL ======
  function renderConteudo() {
    const container = document.getElementById("mataMataContainer");
    if (!container) return;

    // Atualizar info da fase no elemento existente (não duplicar)
    atualizarInfoFase();

    const dados = estado.dadosCache[estado.edicaoAtual];
    if (!dados) {
      renderVazio("Dados não disponíveis");
      return;
    }

    const confrontos = dados[estado.faseAtual] || [];
    if (confrontos.length === 0) {
      renderVazio("Nenhum confronto nesta fase");
      return;
    }

    // Encontrar meu confronto
    const meuConfronto = encontrarMeuConfronto(confrontos);

    // Renderizar card "Seu Confronto" ou "Não classificado"
    const meuConfrontoHtml = meuConfronto
      ? renderMeuConfronto(
          meuConfronto,
          FASES_CONFIG.find((f) => f.id === estado.faseAtual),
        )
      : renderNaoClassificado();

    // Renderizar tabela de confrontos
    const tabelaHtml = renderTabela(confrontos);

    // SEM duplicar mm-phase-info (já atualizado acima)
    container.innerHTML = meuConfrontoHtml + tabelaHtml;
  }

  // ====== ENCONTRAR MEU CONFRONTO ======
  function encontrarMeuConfronto(confrontos) {
    for (const c of confrontos) {
      if (
        c.timeA?.time_id === estado.meuTimeId ||
        c.timeB?.time_id === estado.meuTimeId
      ) {
        return c;
      }
    }
    return null;
  }

  // ====== RENDER MEU CONFRONTO ======
  function renderMeuConfronto(confronto, faseConfig) {
    const souTimeA = confronto.timeA?.time_id === estado.meuTimeId;
    const eu = souTimeA ? confronto.timeA : confronto.timeB;
    const adv = souTimeA ? confronto.timeB : confronto.timeA;

    const meusPts = parseFloat(eu?.pontos) || 0;
    const advPts = parseFloat(adv?.pontos) || 0;
    const diff = Math.abs(meusPts - advPts).toFixed(2);

    // Determinar status com tempo verbal
    const statusInfo = getStatusConfronto(faseConfig, meusPts, advPts);

    // Classes de pontuação
    const minhaPtsClass =
      meusPts > advPts ? "vencedor" : meusPts < advPts ? "perdedor" : "empate";
    const advPtsClass =
      advPts > meusPts ? "vencedor" : advPts < meusPts ? "perdedor" : "empate";

    // Ícone do header
    const iconClass =
      statusInfo.class.includes("passando") ||
      statusInfo.class.includes("classificado") ||
      statusInfo.class.includes("campeao")
        ? "ganhando"
        : statusInfo.class.includes("eliminado") ||
            statusInfo.class.includes("sendo")
          ? "perdendo"
          : statusInfo.class.includes("empat")
            ? "empatando"
            : "aguardando";

    const iconName =
      iconClass === "ganhando"
        ? "trending_up"
        : iconClass === "perdendo"
          ? "trending_down"
          : "remove";

    return `
      <div class="mm-meu-confronto">
        <div class="mm-mc-header">
          <span class="material-symbols-outlined mm-mc-icon ${iconClass}">${iconName}</span>
          <span class="mm-mc-titulo">Seu Confronto</span>
        </div>

        <div class="mm-mc-grid">
          <!-- EU -->
          <div class="mm-mc-time eu">
            <div class="mm-mc-row">
              <div class="mm-mc-info-box">
                <p class="mm-mc-label">Você</p>
                <p class="mm-mc-nome">${truncate(eu?.nome_time || "Meu Time", 14)}</p>
              </div>
              <img class="mm-mc-escudo" src="${eu?.escudo || PLACEHOLDER_32}" alt="" onerror="this.src='${PLACEHOLDER_32}'">
            </div>
            <div class="mm-mc-pts-box">
              <p class="mm-mc-pts ${minhaPtsClass}">${meusPts.toFixed(2)}</p>
              ${renderFinancialIcon(meusPts > advPts, meusPts === advPts)}
            </div>
          </div>

          <!-- VS -->
          <div class="mm-mc-vs">x</div>

          <!-- ADVERSÁRIO -->
          <div class="mm-mc-time adv">
            <div class="mm-mc-row">
              <img class="mm-mc-escudo" src="${adv?.escudo || PLACEHOLDER_32}" alt="" onerror="this.src='${PLACEHOLDER_32}'">
              <div class="mm-mc-info-box">
                <p class="mm-mc-label">Adversário</p>
                <p class="mm-mc-nome">${truncate(adv?.nome_time || "Adversário", 14)}</p>
              </div>
            </div>
            <div class="mm-mc-pts-box">
              <p class="mm-mc-pts ${advPtsClass}">${advPts.toFixed(2)}</p>
              ${renderFinancialIcon(advPts > meusPts, advPts === meusPts)}
            </div>
          </div>
        </div>

        <!-- STATUS -->
        <div class="mm-mc-status ${statusInfo.class}">
          <span class="material-symbols-outlined">${statusInfo.icon}</span>
          <span>${statusInfo.text}</span>
        </div>
      </div>
    `;
  }

  // ====== GET STATUS CONFRONTO (TEMPOS VERBAIS) ======
  function getStatusConfronto(faseConfig, meusPontos, pontosAdv) {
    const rodadaFase = faseConfig?.rodada || 0;
    const rodadaConsolidada = rodadaFase < estado.rodadaAtual;
    const emAndamento =
      rodadaFase === estado.rodadaAtual && estado.rodadaEmAndamento;
    const isFinal = faseConfig?.id === "final";

    const ganhando = meusPontos > pontosAdv;
    const perdendo = meusPontos < pontosAdv;
    const empate = meusPontos === pontosAdv;

    if (rodadaConsolidada) {
      // PASSADO - rodada já fechou
      if (ganhando) {
        if (isFinal) {
          return {
            class: "campeao",
            text: "Você é o Campeão!",
            icon: "emoji_events",
          };
        }
        return {
          class: "classificado",
          text: "Você se classificou!",
          icon: "check_circle",
        };
      } else if (perdendo) {
        return {
          class: "eliminado",
          text: "Você foi eliminado",
          icon: "cancel",
        };
      } else {
        return {
          class: "empate",
          text: "Empate - critério de desempate",
          icon: "balance",
        };
      }
    } else if (emAndamento) {
      // PRESENTE - rodada em andamento
      if (ganhando) {
        return {
          class: "passando",
          text: "Você está passando de fase!",
          icon: "trending_up",
        };
      } else if (perdendo) {
        return {
          class: "sendo-eliminado",
          text: "Você está sendo eliminado",
          icon: "warning",
        };
      } else {
        return {
          class: "empatando",
          text: "Empate técnico",
          icon: "drag_handle",
        };
      }
    } else {
      // FUTURO - aguardando
      return {
        class: "aguardando",
        text: "Aguardando início da rodada",
        icon: "schedule",
      };
    }
  }

  // ====== RENDER FINANCIAL ICON ======
  function renderFinancialIcon(ganhou, empate) {
    if (empate) {
      return `
        <div class="mm-financial">
          <span class="material-symbols-outlined empate-icon">horizontal_rule</span>
          <div class="mm-mini-modal empate-bg">Empate</div>
        </div>
      `;
    }
    if (ganhou) {
      return `
        <div class="mm-financial">
          <span class="material-symbols-outlined ganho">monetization_on</span>
          <div class="mm-mini-modal ganho">Ganhos: +R$ 10,00</div>
        </div>
      `;
    }
    return `
      <div class="mm-financial">
        <span class="material-symbols-outlined perda">money_off</span>
        <div class="mm-mini-modal perda">Perdas: -R$ 10,00</div>
      </div>
    `;
  }

  // ====== RENDER NÃO CLASSIFICADO ======
  function renderNaoClassificado() {
    return `
      <div class="mm-nao-classificado">
        <span class="material-symbols-outlined">sports_soccer</span>
        <p>Você não está nesta fase</p>
      </div>
    `;
  }

  // ====== RENDER TABELA DE CONFRONTOS ======
  function renderTabela(confrontos) {
    let linhasHtml = "";

    confrontos.forEach((c, idx) => {
      const timeA = c.timeA || {};
      const timeB = c.timeB || {};
      const ptsA = parseFloat(timeA.pontos) || 0;
      const ptsB = parseFloat(timeB.pontos) || 0;
      const diff = Math.abs(ptsA - ptsB).toFixed(2);

      const vencedorA = ptsA > ptsB;
      const vencedorB = ptsB > ptsA;

      const isMinha =
        timeA.time_id === estado.meuTimeId ||
        timeB.time_id === estado.meuTimeId;

      linhasHtml += `
        <div class="mm-linha ${isMinha ? "minha" : ""}">
          <div class="mm-col-num">${idx + 1}</div>

          <!-- Time A -->
          <div class="mm-col-time">
            <img class="mm-escudo" src="${timeA.escudo || PLACEHOLDER_24}" alt="" onerror="this.src='${PLACEHOLDER_24}'">
            <div class="mm-time-dados">
              <span class="mm-time-nome">${truncate(timeA.nome_time || "A definir", 10)}</span>
              <span class="mm-cartoleiro">${truncate(timeA.nome_cartoleiro || "", 12)}</span>
            </div>
          </div>

          <!-- Pts A -->
          <div class="mm-col-pts ${vencedorA ? "vencedor" : vencedorB ? "perdedor" : ""}">
            <span class="mm-pts-valor ${vencedorA ? "vencedor" : vencedorB ? "perdedor" : "empate"}">${ptsA.toFixed(2)}</span>
            <div class="mm-pts-financial">
              <span class="material-symbols-outlined ${vencedorA ? "ganho" : "perda"}">${vencedorA ? "monetization_on" : "money_off"}</span>
              <div class="mm-mini-modal ${vencedorA ? "ganho" : "perda"}">${vencedorA ? "Ganhos: +R$ 10,00" : "Perdas: -R$ 10,00"}</div>
            </div>
          </div>

          <!-- Pts B -->
          <div class="mm-col-pts ${vencedorB ? "vencedor" : vencedorA ? "perdedor" : ""}">
            <span class="mm-pts-valor ${vencedorB ? "vencedor" : vencedorA ? "perdedor" : "empate"}">${ptsB.toFixed(2)}</span>
            <div class="mm-pts-financial">
              <span class="material-symbols-outlined ${vencedorB ? "ganho" : "perda"}">${vencedorB ? "monetization_on" : "money_off"}</span>
              <div class="mm-mini-modal ${vencedorB ? "ganho" : "perda"}">${vencedorB ? "Ganhos: +R$ 10,00" : "Perdas: -R$ 10,00"}</div>
            </div>
          </div>

          <!-- Time B -->
          <div class="mm-col-time-r">
            <div class="mm-time-dados">
              <span class="mm-time-nome">${truncate(timeB.nome_time || "A definir", 10)}</span>
              <span class="mm-cartoleiro">${truncate(timeB.nome_cartoleiro || "", 12)}</span>
            </div>
            <img class="mm-escudo" src="${timeB.escudo || PLACEHOLDER_24}" alt="" onerror="this.src='${PLACEHOLDER_24}'">
          </div>

          <!-- DIF -->
          <div class="mm-col-dif">${diff}</div>
        </div>
      `;
    });

    return `
      <div class="mm-tabela">
        <div class="mm-tabela-header">
          <div class="mm-th-num">#</div>
          <div class="mm-th-time">Time</div>
          <div class="mm-th-pts">Pts</div>
          <div class="mm-th-pts">Pts</div>
          <div class="mm-th-time-r">Time</div>
          <div class="mm-th-dif">Dif</div>
        </div>
        ${linhasHtml}
      </div>
    `;
  }

  // ====== RENDER VAZIO ======
  function renderVazio(msg) {
    const container = document.getElementById("mataMataContainer");
    if (!container) return;

    container.innerHTML = `
      <div class="mm-vazio">
        <span class="material-symbols-outlined">sports_mma</span>
        <h3>Mata-Mata</h3>
        <p>${msg}</p>
      </div>
    `;
  }

  // ====== RENDER ERRO ======
  function renderErro(msg) {
    const container = document.getElementById("mataMataContainer");
    if (!container) return;

    container.innerHTML = `
      <div class="mm-vazio">
        <span class="material-symbols-outlined">error_outline</span>
        <h3>Erro</h3>
        <p>${msg}</p>
      </div>
    `;
  }

  // ====== SETUP EVENTOS ======
  function setupEventos() {
    // Mudança de edição
    const select = document.getElementById("mmEditionSelect");
    if (select) {
      select.addEventListener("change", (e) => {
        estado.edicaoAtual = parseInt(e.target.value);
        estado.faseAtual = "primeira";
        carregarDadosEdicao(estado.edicaoAtual);
      });
    }

    // Clique nas fases
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("mm-phase-btn") && !e.target.disabled) {
        estado.faseAtual = e.target.dataset.fase;
        renderFases();
        renderConteudo();
      }

      // Clique no escudo - modal informativo
      if (
        e.target.classList.contains("mm-escudo") ||
        e.target.classList.contains("mm-mc-escudo")
      ) {
        mostrarModalEmBreve();
      }
    });
  }

  // ====== MODAL "EM BREVE" ======
  function mostrarModalEmBreve() {
    // Remove modal existente se houver
    const existente = document.querySelector(".mm-modal-overlay");
    if (existente) existente.remove();

    const modal = document.createElement("div");
    modal.className = "mm-modal-overlay";
    modal.innerHTML = `
      <div class="mm-modal-content">
        <span class="material-symbols-outlined mm-modal-icon">construction</span>
        <h3>Em breve!</h3>
        <p>Detalhes do time serão exibidos aqui na próxima edição do Cartola.</p>
        <button class="mm-modal-btn" onclick="this.closest('.mm-modal-overlay').remove()">Entendi</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // ====== UTILS ======
  function truncate(str, len) {
    if (!str) return "";
    return str.length > len ? str.substring(0, len) + "..." : str;
  }

  // ====== PUBLIC API ======
  return { init };
})();

// ====== FUNÇÃO DE INICIALIZAÇÃO ======
export async function inicializarMataMataParticipante(dados) {
  console.log(
    "[MATA-MATA] 🚀 inicializarMataMataParticipante() chamada",
    dados,
  );
  await ParticipanteMataMata.init(dados);
}

// Alias para compatibilidade
export const inicializarMataMata = inicializarMataMataParticipante;

console.log("[MATA-MATA] ✅ Módulo v5.4 carregado");
