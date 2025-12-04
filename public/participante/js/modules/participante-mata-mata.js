// PARTICIPANTE MATA-MATA - Módulo de visualização do torneio eliminatório
// Responsável por: renderizar confrontos do mata-mata para o participante

// =====================================================================
// CONFIGURAÇÃO DAS EDIÇÕES
// =====================================================================
const EDICOES_MATA_MATA = [
  {
    id: 1,
    nome: "1ª Edição",
    rodadaInicial: 2,
    rodadaFinal: 7,
    rodadaDefinicao: 2,
  },
  {
    id: 2,
    nome: "2ª Edição",
    rodadaInicial: 9,
    rodadaFinal: 14,
    rodadaDefinicao: 9,
  },
  {
    id: 3,
    nome: "3ª Edição",
    rodadaInicial: 15,
    rodadaFinal: 21,
    rodadaDefinicao: 15,
  },
  {
    id: 4,
    nome: "4ª Edição",
    rodadaInicial: 22,
    rodadaFinal: 26,
    rodadaDefinicao: 21,
  },
  {
    id: 5,
    nome: "5ª Edição",
    rodadaInicial: 31,
    rodadaFinal: 35,
    rodadaDefinicao: 30,
  },
];

let rodadaAtualGlobal = 1;
let edicaoSelecionada = null;
let faseSelecionada = "primeira";

// =====================================================================
// INICIALIZAÇÃO
// =====================================================================
export async function inicializarMataMata() {
  console.log("[PARTICIPANTE-MATA-MATA] Inicializando módulo...");

  // Obter sessão do localStorage ou elementos DOM
  const ligaId = localStorage.getItem("ligaId") || 
                 document.querySelector("[data-liga-id]")?.dataset.ligaId;
  
  if (!ligaId) {
    renderError("Sessão inválida. Faça login novamente.");
    return;
  }

  const session = { ligaId };

  try {
    // Buscar rodada atual
    const resStatus = await fetch("/api/cartola/mercado/status");
    if (resStatus.ok) {
      const data = await resStatus.json();
      rodadaAtualGlobal = data.rodada_atual || 1;
    }

    // Renderizar interface
    renderInterface(session.ligaId);

    // Buscar edições disponíveis no MongoDB
    await carregarEdicoesDisponiveis(session.ligaId);
  } catch (error) {
    console.error("[PARTICIPANTE-MATA-MATA] Erro ao inicializar:", error);
    renderError("Erro ao carregar mata-mata: " + error.message);
  }
}

// =====================================================================
// BUSCAR EDIÇÕES DISPONÍVEIS NO MONGODB
// =====================================================================
async function carregarEdicoesDisponiveis(ligaId) {
  try {
    console.log(
      "[PARTICIPANTE-MATA-MATA] Buscando edições disponíveis no MongoDB...",
    );

    const res = await fetch(`/api/mata-mata/cache/${ligaId}/edicoes`);
    if (!res.ok) {
      throw new Error("Erro ao buscar edições");
    }

    const data = await res.json();
    console.log(
      `[PARTICIPANTE-MATA-MATA] Encontradas ${data.total} edições salvas`,
    );

    // Renderizar cards das edições disponíveis
    renderCardsEdicoes(data.edicoes, ligaId);

    // Selecionar primeira edição automaticamente
    if (data.edicoes.length > 0) {
      selecionarEdicao(data.edicoes[0].edicao, ligaId);
    }
  } catch (error) {
    console.error("[PARTICIPANTE-MATA-MATA] Erro ao buscar edições:", error);
    renderCardsEdicoes([], null); // Renderizar vazio
  }
}

// =====================================================================
// RENDERIZAR INTERFACE PRINCIPAL
// =====================================================================
function renderInterface(ligaId) {
  const container = document.getElementById("mata-mata-container");
  if (!container) return;

  container.innerHTML = `
    <div class="participante-section">
      <div class="section-header">
        <h2>⚔️ Mata-Mata</h2>
        <p class="section-subtitle">Torneio eliminatório da liga</p>
      </div>

      <div id="edicoes-cards-container" class="edicoes-grid">
        <div class="loading">Carregando edições...</div>
      </div>

      <div id="fases-nav-container" style="display:none;">
        <div class="fases-nav">
          <button class="fase-btn active" data-fase="primeira">1ª FASE</button>
          <button class="fase-btn" data-fase="oitavas">OITAVAS</button>
          <button class="fase-btn" data-fase="quartas">QUARTAS</button>
          <button class="fase-btn" data-fase="semis">SEMIS</button>
          <button class="fase-btn" data-fase="final">FINAL</button>
        </div>
      </div>

      <div id="mata-mata-content">
        <div class="info-box">
          <p>Selecione uma edição para ver os confrontos</p>
        </div>
      </div>
    </div>
  `;
}

// =====================================================================
// RENDERIZAR CARDS DAS EDIÇÕES
// =====================================================================
function renderCardsEdicoes(edicoes, ligaId) {
  const container = document.getElementById("edicoes-cards-container");
  if (!container) return;

  if (edicoes.length === 0) {
    container.innerHTML = `
      <div class="info-box">
        <p>Nenhuma edição do Mata-Mata disponível ainda.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = edicoes
    .map((edicao) => {
      const config = EDICOES_MATA_MATA.find((e) => e.id === edicao.edicao);
      const nome = config ? config.nome : `Edição ${edicao.edicao}`;
      const rodadas = config
        ? `R${config.rodadaInicial}-R${config.rodadaFinal}`
        : "";

      return `
      <div class="edicao-card" data-edicao="${edicao.edicao}">
        <div class="edicao-nome">${nome}</div>
        <div class="edicao-rodadas">${rodadas}</div>
        <div class="edicao-status">
          <span class="status-badge">Disponível</span>
        </div>
      </div>
    `;
    })
    .join("");

  // Adicionar event listeners
  container.querySelectorAll(".edicao-card").forEach((card) => {
    card.addEventListener("click", () => {
      const edicao = parseInt(card.dataset.edicao);
      selecionarEdicao(edicao, ligaId);
    });
  });
}

// =====================================================================
// SELECIONAR EDIÇÃO
// =====================================================================
function selecionarEdicao(edicao, ligaId) {
  console.log(`[PARTICIPANTE-MATA-MATA] Selecionando edição ${edicao}`);

  edicaoSelecionada = edicao;
  faseSelecionada = "primeira";

  // Atualizar visual dos cards
  document.querySelectorAll(".edicao-card").forEach((card) => {
    card.classList.toggle(
      "selected",
      parseInt(card.dataset.edicao) === edicao,
    );
  });

  // Mostrar navegação de fases
  const fasesNav = document.getElementById("fases-nav-container");
  if (fasesNav) fasesNav.style.display = "block";

  // Resetar seleção de fase
  document.querySelectorAll(".fase-btn").forEach((btn) => {
    btn.classList.remove("active");
    btn.addEventListener("click", () => {
      document.querySelectorAll(".fase-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      faseSelecionada = btn.dataset.fase;
      carregarFase(edicao, btn.dataset.fase, ligaId);
    });
  });
  document.querySelector('.fase-btn[data-fase="primeira"]').classList.add("active");

  // Carregar primeira fase
  carregarFase(edicao, "primeira", ligaId);
}

// =====================================================================
// CARREGAR FASE ESPECÍFICA
// =====================================================================
async function carregarFase(edicao, fase, ligaId) {
  const contentContainer = document.getElementById("mata-mata-content");
  if (!contentContainer) return;

  contentContainer.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Carregando ${fase.toUpperCase()}...</p>
    </div>
  `;

  try {
    console.log(
      `[PARTICIPANTE-MATA-MATA] Carregando edição ${edicao}, fase ${fase}`,
    );

    const res = await fetch(`/api/mata-mata/cache/${ligaId}/${edicao}`);
    if (!res.ok) {
      throw new Error("Erro ao buscar dados do mata-mata");
    }

    const data = await res.json();
    if (!data.cached || !data.dados) {
      throw new Error("Dados não encontrados no cache");
    }

    const dadosFase = data.dados[fase];
    if (!dadosFase || dadosFase.length === 0) {
      contentContainer.innerHTML = `
        <div class="info-box">
          <p>Confrontos da ${fase.toUpperCase()} ainda não disponíveis.</p>
        </div>
      `;
      return;
    }

    renderTabelaConfrontos(dadosFase, fase, edicao);
  } catch (error) {
    console.error("[PARTICIPANTE-MATA-MATA] Erro ao carregar fase:", error);
    contentContainer.innerHTML = `
      <div class="error-box">
        <p>❌ Erro ao carregar ${fase.toUpperCase()}</p>
        <p class="error-detail">${error.message}</p>
      </div>
    `;
  }
}

// =====================================================================
// RENDERIZAR TABELA DE CONFRONTOS
// =====================================================================
function renderTabelaConfrontos(confrontos, fase, edicao) {
  const container = document.getElementById("mata-mata-content");
  if (!container) return;

  const config = EDICOES_MATA_MATA.find((e) => e.id === edicao);
  const edicaoNome = config ? config.nome : `Edição ${edicao}`;

  // Obter timeId do localStorage ou DOM
  const timeId = localStorage.getItem("timeId") || 
                 document.querySelector("[data-time-id]")?.dataset.timeId;
  const meuTimeId = timeId ? parseInt(timeId) : null;

  container.innerHTML = `
    <div class="mata-mata-header">
      <div class="fase-titulo">${fase.toUpperCase()}</div>
      <div class="edicao-nome">${edicaoNome}</div>
    </div>

    <div class="confrontos-lista">
      ${confrontos
        .map((confronto) => {
          const timeA = confronto.timeA || {};
          const timeB = confronto.timeB || {};

          const pontosA = parseFloat(timeA.pontos) || 0;
          const pontosB = parseFloat(timeB.pontos) || 0;

          const vencedorA = pontosA > pontosB;
          const vencedorB = pontosB > pontosA;

          const ehMeuTimeA = meuTimeId && timeA.timeId === meuTimeId;
          const ehMeuTimeB = meuTimeId && timeB.timeId === meuTimeId;

          return `
          <div class="confronto-card ${ehMeuTimeA || ehMeuTimeB ? "meu-confronto" : ""}">
            <div class="confronto-header">
              <span class="jogo-numero">Jogo ${confronto.jogo || "?"}</span>
            </div>

            <div class="confronto-times">
              <div class="time ${vencedorA ? "vencedor" : ""} ${ehMeuTimeA ? "meu-time" : ""}">
                <img src="/escudos/${timeA.clube_id || "default"}.png" 
                     class="escudo" 
                     onerror="this.src='/escudos/default.png'">
                <div class="time-info">
                  <div class="time-nome">${timeA.nome_time || "—"}</div>
                  <div class="cartoleiro-nome">${timeA.nome_cartoleiro || timeA.nome_cartola || "—"}</div>
                </div>
                <div class="pontos ${vencedorA ? "destaque" : ""}">${pontosA.toFixed(2)}</div>
              </div>

              <div class="vs">X</div>

              <div class="time ${vencedorB ? "vencedor" : ""} ${ehMeuTimeB ? "meu-time" : ""}">
                <div class="pontos ${vencedorB ? "destaque" : ""}">${pontosB.toFixed(2)}</div>
                <div class="time-info">
                  <div class="time-nome">${timeB.nome_time || "—"}</div>
                  <div class="cartoleiro-nome">${timeB.nome_cartoleiro || timeB.nome_cartola || "—"}</div>
                </div>
                <img src="/escudos/${timeB.clube_id || "default"}.png" 
                     class="escudo" 
                     onerror="this.src='/escudos/default.png'">
              </div>
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;

  // Renderizar banner do campeão se for a final
  if (fase === "final" && confrontos.length > 0) {
    renderBannerCampeao(confrontos[0], edicaoNome);
  }
}

// =====================================================================
// RENDERIZAR BANNER DO CAMPEÃO
// =====================================================================
function renderBannerCampeao(confronto, edicaoNome) {
  const container = document.getElementById("mata-mata-content");
  if (!container) return;

  const timeA = confronto.timeA || {};
  const timeB = confronto.timeB || {};

  const pontosA = parseFloat(timeA.pontos) || 0;
  const pontosB = parseFloat(timeB.pontos) || 0;

  if (pontosA === 0 && pontosB === 0) return; // Rodada não concluída

  const campeao = pontosA > pontosB ? timeA : timeB;
  const vice = pontosA > pontosB ? timeB : timeA;

  const bannerHTML = `
    <div class="campeao-banner">
      <div class="campeao-header">
        <div class="trophy">🏆</div>
        <div class="titulo">CAMPEÃO</div>
        <div class="edicao">${edicaoNome}</div>
      </div>

      <div class="campeao-info">
        <img src="/escudos/${campeao.clube_id || "default"}.png" 
             class="campeao-escudo" 
             onerror="this.src='/escudos/default.png'">
        <div class="campeao-detalhes">
          <div class="campeao-nome">${campeao.nome_time || "—"}</div>
          <div class="campeao-cartoleiro">${campeao.nome_cartoleiro || campeao.nome_cartola || "—"}</div>
          <div class="campeao-pontos">${campeao.pontos.toFixed(2)} pts</div>
        </div>
      </div>

      <div class="vice-info">
        <div class="vice-label">Vice-Campeão</div>
        <div class="vice-nome">${vice.nome_time || "—"} - ${vice.pontos.toFixed(2)} pts</div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", bannerHTML);
}

// =====================================================================
// RENDERIZAR ERRO
// =====================================================================
function renderError(message) {
  const container = document.getElementById("mata-mata-container");
  if (!container) return;

  container.innerHTML = `
    <div class="error-box">
      <p>❌ ${message}</p>
    </div>
  `;
}