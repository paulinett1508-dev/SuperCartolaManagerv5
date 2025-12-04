// =====================================================================
// PARTICIPANTE MATA-MATA v6.1
// Integrado com HTML template - Layout Cards + Correção "não está nesta fase"
// =====================================================================

const EDICOES_MATA_MATA = [
  { id: 1, nome: "1ª Edição", rodadaInicial: 2, rodadaFinal: 7 },
  { id: 2, nome: "2ª Edição", rodadaInicial: 9, rodadaFinal: 14 },
  { id: 3, nome: "3ª Edição", rodadaInicial: 15, rodadaFinal: 21 },
  { id: 4, nome: "4ª Edição", rodadaInicial: 22, rodadaFinal: 26 },
  { id: 5, nome: "5ª Edição", rodadaInicial: 31, rodadaFinal: 35 },
];

const FASES = ["primeira", "oitavas", "quartas", "semis", "final"];

let estado = {
  ligaId: null,
  timeId: null,
  rodadaAtual: 1,
  edicaoSelecionada: null,
  faseSelecionada: "primeira",
  edicoesDisponiveis: [],
  cacheConfrontos: {},
  historicoParticipacao: {}, // ✅ NOVO: Armazena em qual fase o usuário foi eliminado
};

// =====================================================================
// INICIALIZAÇÃO
// =====================================================================
export async function inicializarMataMata(params) {
  console.log("[MATA-MATA] 🚀 Inicializando v6.1...", params);

  estado.ligaId = params?.ligaId || localStorage.getItem("ligaId");
  estado.timeId = params?.timeId || localStorage.getItem("timeId");

  if (!estado.ligaId) {
    console.error("[MATA-MATA] ❌ Liga ID não encontrado");
    renderErro("Sessão inválida. Faça login novamente.");
    return;
  }

  try {
    await carregarStatusMercado();
    await carregarEdicoesDisponiveis();
    setupEventListeners();
  } catch (error) {
    console.error("[MATA-MATA] Erro:", error);
    renderErro("Erro ao carregar mata-mata");
  }
}

// Alias para compatibilidade
export const inicializarMataMataParticipante = inicializarMataMata;

// =====================================================================
// CARREGAR STATUS DO MERCADO
// =====================================================================
async function carregarStatusMercado() {
  try {
    const res = await fetch("/api/cartola/mercado/status");
    if (res.ok) {
      const data = await res.json();
      estado.rodadaAtual = data.rodada_atual || 37;
    }
  } catch (e) {
    estado.rodadaAtual = 37;
  }
}

// =====================================================================
// CARREGAR EDIÇÕES DISPONÍVEIS DO MONGODB
// =====================================================================
async function carregarEdicoesDisponiveis() {
  try {
    const res = await fetch(`/api/mata-mata/cache/${estado.ligaId}/edicoes`);
    if (!res.ok) throw new Error("Erro ao buscar edições");

    const data = await res.json();
    estado.edicoesDisponiveis = data.edicoes || [];

    console.log(
      `[MATA-MATA] ✅ ${estado.edicoesDisponiveis.length} edições encontradas`,
    );

    // Popular select de edições
    popularSelectEdicoes();

    // Atualizar contador de participantes
    atualizarContador();

    // Selecionar última edição automaticamente
    if (estado.edicoesDisponiveis.length > 0) {
      const ultimaEdicao =
        estado.edicoesDisponiveis[estado.edicoesDisponiveis.length - 1];
      estado.edicaoSelecionada = ultimaEdicao.edicao;

      // Atualizar select
      const select = document.getElementById("mmEditionSelect");
      if (select) select.value = ultimaEdicao.edicao;

      // ✅ CARREGAR TODAS AS FASES PARA MAPEAR PARTICIPAÇÃO
      await carregarTodasFases(estado.edicaoSelecionada);

      await carregarFase(estado.edicaoSelecionada, "primeira");
    }
  } catch (error) {
    console.error("[MATA-MATA] Erro ao carregar edições:", error);
    renderErro("Nenhuma edição disponível");
  }
}

// =====================================================================
// ✅ NOVO: CARREGAR TODAS AS FASES PARA MAPEAR PARTICIPAÇÃO
// =====================================================================
async function carregarTodasFases(edicao) {
  try {
    const res = await fetch(
      `/api/mata-mata/cache/${estado.ligaId}?edicao=${edicao}`,
    );
    if (!res.ok) return;

    const data = await res.json();
    if (!data.cached || !data.dados) return;

    const meuTimeId = estado.timeId ? parseInt(estado.timeId) : null;
    let ultimaFaseParticipada = null;
    let foiEliminado = false;

    // Cachear todas as fases
    FASES.forEach((f) => {
      if (data.dados[f]) {
        estado.cacheConfrontos[`${edicao}-${f}`] = data.dados[f];

        // ✅ Verificar se o usuário participou desta fase
        const confrontos = data.dados[f];
        const participou = confrontos.some(
          (c) =>
            c.timeA?.time_id === meuTimeId || c.timeB?.time_id === meuTimeId,
        );

        if (participou) {
          ultimaFaseParticipada = f;

          // Verificar se foi eliminado (perdeu)
          const meuConfronto = confrontos.find(
            (c) =>
              c.timeA?.time_id === meuTimeId || c.timeB?.time_id === meuTimeId,
          );

          if (meuConfronto) {
            const souTimeA = meuConfronto.timeA?.time_id === meuTimeId;
            const meusPts =
              parseFloat(
                souTimeA
                  ? meuConfronto.timeA?.pontos
                  : meuConfronto.timeB?.pontos,
              ) || 0;
            const advPts =
              parseFloat(
                souTimeA
                  ? meuConfronto.timeB?.pontos
                  : meuConfronto.timeA?.pontos,
              ) || 0;

            if (meusPts < advPts) {
              foiEliminado = true;
            }
          }
        }
      }
    });

    // Armazenar histórico
    estado.historicoParticipacao[edicao] = {
      ultimaFase: ultimaFaseParticipada,
      eliminado: foiEliminado,
    };

    console.log(
      `[MATA-MATA] 📊 Histórico edição ${edicao}:`,
      estado.historicoParticipacao[edicao],
    );
  } catch (error) {
    console.error("[MATA-MATA] Erro ao carregar histórico:", error);
  }
}

// =====================================================================
// POPULAR SELECT DE EDIÇÕES
// =====================================================================
function popularSelectEdicoes() {
  const select = document.getElementById("mmEditionSelect");
  if (!select) return;

  select.innerHTML = estado.edicoesDisponiveis
    .map((ed) => {
      const config = EDICOES_MATA_MATA.find((e) => e.id === ed.edicao);
      const nome = config ? config.nome : `${ed.edicao}ª Edição`;
      return `<option value="${ed.edicao}">${nome}</option>`;
    })
    .join("");
}

// =====================================================================
// ATUALIZAR CONTADOR DE PARTICIPANTES
// =====================================================================
function atualizarContador() {
  const el = document.getElementById("mmTimesCount");
  if (el) el.textContent = "32 participante(s)"; // Valor padrão
}

// =====================================================================
// SETUP EVENT LISTENERS
// =====================================================================
function setupEventListeners() {
  // Select de edições
  const select = document.getElementById("mmEditionSelect");
  if (select) {
    select.addEventListener("change", async (e) => {
      estado.edicaoSelecionada = parseInt(e.target.value);
      estado.faseSelecionada = "primeira";
      atualizarBotoesFases();

      // ✅ Carregar histórico da nova edição
      await carregarTodasFases(estado.edicaoSelecionada);

      await carregarFase(estado.edicaoSelecionada, "primeira");
    });
  }

  // Botões de fases
  const phasesNav = document.getElementById("mmPhasesNav");
  if (phasesNav) {
    phasesNav.addEventListener("click", async (e) => {
      const btn = e.target.closest(".mm-phase-btn");
      if (!btn || btn.classList.contains("disabled")) return;

      const fase = btn.dataset.fase;
      if (!fase) return;

      estado.faseSelecionada = fase;
      atualizarBotoesFases();
      await carregarFase(estado.edicaoSelecionada, fase);
    });
  }

  // Configurar data-fase nos botões
  const buttons = document.querySelectorAll(".mm-phase-btn");
  FASES.forEach((fase, i) => {
    if (buttons[i]) buttons[i].dataset.fase = fase;
  });
}

// =====================================================================
// ATUALIZAR BOTÕES DE FASES
// =====================================================================
function atualizarBotoesFases() {
  const buttons = document.querySelectorAll(".mm-phase-btn");
  buttons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.fase === estado.faseSelecionada) {
      btn.classList.add("active");
    }
  });
}

// =====================================================================
// ATUALIZAR INFO DA FASE
// =====================================================================
function atualizarInfoFase(fase) {
  const infoEl = document.getElementById("mmPhaseInfo");
  if (!infoEl) return;

  const config = EDICOES_MATA_MATA.find(
    (e) => e.id === estado.edicaoSelecionada,
  );
  const nomeEdicao = config
    ? config.nome
    : `${estado.edicaoSelecionada}ª Edição`;

  const nomeFase =
    {
      primeira: "1ª FASE",
      oitavas: "OITAVAS",
      quartas: "QUARTAS",
      semis: "SEMIFINAL",
      final: "FINAL",
    }[fase] || fase.toUpperCase();

  // Calcular rodada da fase baseado na configuração
  let rodadaFase = estado.rodadaAtual;
  if (config) {
    const faseIndex = FASES.indexOf(fase);
    rodadaFase = config.rodadaInicial + faseIndex;
  }

  infoEl.innerHTML = `
    <p class="mm-edition-name">${nomeEdicao}</p>
    <p class="mm-phase-name">${nomeFase}</p>
    <p class="mm-round-info">Rodada ${rodadaFase}</p>
  `;
}

// =====================================================================
// CARREGAR FASE
// =====================================================================
async function carregarFase(edicao, fase) {
  const container = document.getElementById("mata-mata-container");
  if (!container) return;

  // Atualizar info
  atualizarInfoFase(fase);

  // Loading
  container.innerHTML = `
    <div class="mm-loading">
      <div class="mm-spinner"></div>
      <p>Carregando confrontos...</p>
    </div>
  `;

  try {
    // Verificar cache local
    const cacheKey = `${edicao}-${fase}`;
    let confrontos = estado.cacheConfrontos[cacheKey];

    if (!confrontos) {
      const res = await fetch(
        `/api/mata-mata/cache/${estado.ligaId}?edicao=${edicao}`,
      );
      if (!res.ok) throw new Error("Erro ao buscar dados");

      const data = await res.json();
      if (!data.cached || !data.dados) throw new Error("Dados não encontrados");

      // Cachear todas as fases
      FASES.forEach((f) => {
        if (data.dados[f]) {
          estado.cacheConfrontos[`${edicao}-${f}`] = data.dados[f];
        }
      });

      confrontos = data.dados[fase];
    }

    if (!confrontos || confrontos.length === 0) {
      container.innerHTML = `
        <div class="mm-vazio">
          <span class="material-symbols-outlined">sports_mma</span>
          <h3>Aguardando</h3>
          <p>Confrontos desta fase ainda não disponíveis</p>
        </div>
      `;
      return;
    }

    renderConfrontosCards(confrontos, fase);
  } catch (error) {
    console.error("[MATA-MATA] Erro:", error);
    container.innerHTML = `
      <div class="mm-vazio">
        <span class="material-symbols-outlined">error_outline</span>
        <h3>Erro</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// =====================================================================
// ✅ RENDERIZAR CONFRONTOS EM CARDS (NOVO LAYOUT)
// =====================================================================
function renderConfrontosCards(confrontos, fase) {
  const container = document.getElementById("mata-mata-container");
  if (!container) return;

  const meuTimeId = estado.timeId ? parseInt(estado.timeId) : null;

  // Encontrar meu confronto
  const meuConfronto = confrontos.find(
    (c) => c.timeA?.time_id === meuTimeId || c.timeB?.time_id === meuTimeId,
  );

  let html = "";

  // Card "Seu Confronto" ou status de eliminação
  if (meuConfronto) {
    html += renderMeuConfrontoCard(meuConfronto, meuTimeId);
  } else {
    // ✅ AJUSTE: Verificar se foi eliminado em fase anterior
    const historico = estado.historicoParticipacao[estado.edicaoSelecionada];

    if (historico && historico.ultimaFase && historico.eliminado) {
      const nomeFaseEliminacao =
        {
          primeira: "1ª Fase",
          oitavas: "Oitavas",
          quartas: "Quartas",
          semis: "Semifinal",
          final: "Final",
        }[historico.ultimaFase] || historico.ultimaFase;

      html += `
        <div class="mm-eliminado-card">
          <span class="material-symbols-outlined mm-eliminado-icon">sentiment_dissatisfied</span>
          <div class="mm-eliminado-info">
            <p class="mm-eliminado-titulo">Você foi eliminado</p>
            <p class="mm-eliminado-fase">Eliminação: ${nomeFaseEliminacao}</p>
          </div>
        </div>
      `;
    } else if (historico && historico.ultimaFase) {
      // Participou mas não sabemos se perdeu (pode estar em andamento)
      html += `
        <div class="mm-nao-classificado">
          <span class="material-symbols-outlined">sports_soccer</span>
          <p>Você não está nesta fase</p>
        </div>
      `;
    } else {
      // Nunca participou desta edição
      html += `
        <div class="mm-nao-classificado">
          <span class="material-symbols-outlined">person_off</span>
          <p>Você não participou desta edição</p>
        </div>
      `;
    }
  }

  // Lista de confrontos em cards
  html += renderConfrontosListaCards(confrontos, meuTimeId);

  container.innerHTML = html;
}

// =====================================================================
// ✅ RENDER MEU CONFRONTO EM CARD
// =====================================================================
function renderMeuConfrontoCard(confronto, meuTimeId) {
  const souTimeA = confronto.timeA?.time_id === meuTimeId;
  const eu = souTimeA ? confronto.timeA : confronto.timeB;
  const adv = souTimeA ? confronto.timeB : confronto.timeA;

  const meusPts = parseFloat(eu?.pontos) || 0;
  const advPts = parseFloat(adv?.pontos) || 0;

  const ganhando = meusPts > advPts;
  const perdendo = meusPts < advPts;

  const statusClass = ganhando
    ? "passando"
    : perdendo
      ? "sendo-eliminado"
      : "empatando";
  const statusText = ganhando
    ? "Você está passando!"
    : perdendo
      ? "Você está sendo eliminado"
      : "Empate técnico";
  const statusIcon = ganhando
    ? "check_circle"
    : perdendo
      ? "warning"
      : "drag_handle";

  return `
    <div class="mm-meu-confronto-card">
      <div class="mm-mc-header-card">
        <span class="material-symbols-outlined mm-mc-icon ${statusClass}">${ganhando ? "trending_up" : perdendo ? "trending_down" : "remove"}</span>
        <span class="mm-mc-titulo">Seu Confronto</span>
      </div>

      <div class="mm-mc-versus">
        <!-- Meu Time -->
        <div class="mm-mc-time-card eu">
          <img class="mm-mc-escudo-card" src="${eu?.url_escudo_png || eu?.escudo || "/escudos/default.png"}" alt="" onerror="this.src='/escudos/default.png'">
          <div class="mm-mc-time-info">
            <span class="mm-mc-label">Você</span>
            <span class="mm-mc-nome">${truncate(eu?.nome_time || "Meu Time", 16)}</span>
          </div>
          <span class="mm-mc-pts ${ganhando ? "vencedor" : perdendo ? "perdedor" : "empate"}">${meusPts.toFixed(2)}</span>
        </div>

        <div class="mm-mc-x">VS</div>

        <!-- Adversário -->
        <div class="mm-mc-time-card adv">
          <img class="mm-mc-escudo-card" src="${adv?.url_escudo_png || adv?.escudo || "/escudos/default.png"}" alt="" onerror="this.src='/escudos/default.png'">
          <div class="mm-mc-time-info">
            <span class="mm-mc-label">Adversário</span>
            <span class="mm-mc-nome">${truncate(adv?.nome_time || "Adversário", 16)}</span>
          </div>
          <span class="mm-mc-pts ${perdendo ? "vencedor" : ganhando ? "perdedor" : "empate"}">${advPts.toFixed(2)}</span>
        </div>
      </div>

      <div class="mm-mc-status-card ${statusClass}">
        <span class="material-symbols-outlined">${statusIcon}</span>
        <span>${statusText}</span>
      </div>
    </div>
  `;
}

// =====================================================================
// ✅ RENDER LISTA DE CONFRONTOS EM CARDS
// =====================================================================
function renderConfrontosListaCards(confrontos, meuTimeId) {
  let html = `<div class="mm-confrontos-lista">`;

  confrontos.forEach((c, idx) => {
    const timeA = c.timeA || {};
    const timeB = c.timeB || {};
    const ptsA = parseFloat(timeA.pontos) || 0;
    const ptsB = parseFloat(timeB.pontos) || 0;
    const diff = Math.abs(ptsA - ptsB).toFixed(2);

    const vencedorA = ptsA > ptsB;
    const vencedorB = ptsB > ptsA;
    const isMinha = timeA.time_id === meuTimeId || timeB.time_id === meuTimeId;

    html += `
      <div class="mm-confronto-card ${isMinha ? "minha" : ""}">
        <div class="mm-conf-numero">${idx + 1}</div>

        <div class="mm-conf-times">
          <!-- Time A -->
          <div class="mm-conf-time ${vencedorA ? "vencedor" : vencedorB ? "perdedor" : ""}">
            <img class="mm-conf-escudo" src="${timeA.url_escudo_png || timeA.escudo || "/escudos/default.png"}" alt="" onerror="this.src='/escudos/default.png'">
            <div class="mm-conf-info">
              <span class="mm-conf-nome">${truncate(timeA.nome_time || "A definir", 14)}</span>
              <span class="mm-conf-cartola">${truncate(timeA.nome_cartola || timeA.nome_cartoleiro || "", 16)}</span>
            </div>
            <span class="mm-conf-pts ${vencedorA ? "vencedor" : vencedorB ? "perdedor" : "empate"}">${ptsA.toFixed(2)}</span>
          </div>

          <div class="mm-conf-vs">×</div>

          <!-- Time B -->
          <div class="mm-conf-time ${vencedorB ? "vencedor" : vencedorA ? "perdedor" : ""}">
            <span class="mm-conf-pts ${vencedorB ? "vencedor" : vencedorA ? "perdedor" : "empate"}">${ptsB.toFixed(2)}</span>
            <div class="mm-conf-info right">
              <span class="mm-conf-nome">${truncate(timeB.nome_time || "A definir", 14)}</span>
              <span class="mm-conf-cartola">${truncate(timeB.nome_cartola || timeB.nome_cartoleiro || "", 16)}</span>
            </div>
            <img class="mm-conf-escudo" src="${timeB.url_escudo_png || timeB.escudo || "/escudos/default.png"}" alt="" onerror="this.src='/escudos/default.png'">
          </div>
        </div>

        <div class="mm-conf-diff">
          <span class="mm-diff-label">DIF</span>
          <span class="mm-diff-valor">${diff}</span>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

// =====================================================================
// RENDER ERRO
// =====================================================================
function renderErro(msg) {
  const container = document.getElementById("mata-mata-container");
  if (!container) return;

  container.innerHTML = `
    <div class="mm-vazio">
      <span class="material-symbols-outlined">error_outline</span>
      <h3>Erro</h3>
      <p>${msg}</p>
    </div>
  `;
}

// =====================================================================
// UTILS
// =====================================================================
function truncate(str, len) {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "..." : str;
}

console.log("[MATA-MATA] ✅ Módulo v6.1 carregado");
