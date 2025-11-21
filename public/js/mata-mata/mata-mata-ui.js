// MATA-MATA UI - Interface e Renderização
// Responsável por: renderização de componentes, templates HTML, formatação

import {
  edicoes,
  getRodadaPontosText,
  getEdicaoMataMata,
  gerarTextoConfronto,
} from "./mata-mata-config.js";

// Função para renderizar a interface principal
export function renderizarInterface(
  container,
  ligaId,
  onEdicaoChange,
  onFaseClick,
) {
  console.log("[MATA-UI] Renderizando interface...");

  const edicoesHtml = `
    <div class="edicao-selector">
      <label for="edicao-select">Edição:</label>
      <select id="edicao-select">
        <option value="" selected disabled>Selecione uma edição</option>
        ${edicoes
          .map(
            (edicao) => `
          <option value="${edicao.id}" ${!edicao.ativo ? "disabled" : ""}>
            ${edicao.nome} (Rodadas ${edicao.rodadaInicial}-${edicao.rodadaFinal})
          </option>
        `,
          )
          .join("")}
      </select>
    </div>
  `;

  const fasesHtml = `
    <div id="fase-nav-container" style="display:none;">
      <div class="fase-nav">
        <button class="fase-btn active" data-fase="primeira">1ª FASE</button>
        <button class="fase-btn" data-fase="oitavas">OITAVAS</button>
        <button class="fase-btn" data-fase="quartas">QUARTAS</button>
        <button class="fase-btn" data-fase="semis" id="semis-btn">SEMIS</button>
        <button class="fase-btn" data-fase="final">FINAL</button>
      </div>
    </div>
    <div id="mataMataContent">
      <div class="instrucao-inicial">
        <p>Por favor, selecione uma edição do Mata-Mata para visualizar os confrontos.</p>
      </div>
    </div>
  `;

  container.innerHTML = edicoesHtml + fasesHtml;

  // Setup event listeners
  setupEdicaoSelector(container, ligaId, onEdicaoChange);
  setupFaseButtons(container, onFaseClick);
}

// Função para configurar seletor de edição
function setupEdicaoSelector(container, ligaId, onEdicaoChange) {
  const edicaoSelect = document.getElementById("edicao-select");
  if (!edicaoSelect) return;

  let debounceTimer;
  edicaoSelect.addEventListener("change", function (event) {
    clearTimeout(debounceTimer);
    const controller = new AbortController();

    debounceTimer = setTimeout(() => {
      if (controller.signal.aborted) return;

      const edicaoAtual = parseInt(this.value);
      console.log(`[MATA-UI] Edição selecionada: ${edicaoAtual}`);

      const faseNavContainer = document.getElementById("fase-nav-container");
      if (faseNavContainer) faseNavContainer.style.display = "block";

      // Todas as edições têm SEMIS agora

      container
        .querySelectorAll(".fase-btn")
        .forEach((btn) => btn.classList.remove("active"));
      const primeiraFaseBtn = container.querySelector(
        '.fase-btn[data-fase="primeira"]',
      );
      if (primeiraFaseBtn) primeiraFaseBtn.classList.add("active");

      onEdicaoChange(edicaoAtual, "primeira", ligaId);
    }, 300);

    window.addEventListener(
      "beforeunload",
      () => {
        controller.abort();
        clearTimeout(debounceTimer);
      },
      { once: true },
    );
  });
}

// Função para configurar botões de fase
function setupFaseButtons(container, onFaseClick) {
  container.querySelectorAll(".fase-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const edicaoSelect = document.getElementById("edicao-select");
      const edicaoAtual = edicaoSelect ? parseInt(edicaoSelect.value) : null;

      if (!edicaoAtual) {
        const message =
          "Por favor, selecione uma edição do Mata-Mata primeiro.";
        console.warn(`[MATA-UI] ${message}`);

        const alertDiv = document.createElement("div");
        alertDiv.className = "alert alert-warning";
        alertDiv.textContent = message;

        const contentDiv = document.getElementById("mataMataContent");
        if (contentDiv) {
          contentDiv.innerHTML = "";
          contentDiv.appendChild(alertDiv);
        }
        return;
      }

      container
        .querySelectorAll(".fase-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");

      const fase = this.getAttribute("data-fase");
      console.log(`[MATA-UI] Fase selecionada: ${fase}`);
      onFaseClick(fase, edicaoAtual);
    });
  });
}

// Função para renderizar loading state
export function renderLoadingState(containerId, fase, edicaoAtual) {
  const contentElement = document.getElementById(containerId);
  if (!contentElement) return;

  contentElement.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Carregando confrontos da fase ${fase.toUpperCase()}...</p>
      <p style="font-size: 14px; margin-top: 8px;">Aguarde, processando dados da edição ${edicaoAtual}</p>
    </div>
  `;
}

// Função para renderizar mensagem de instrução inicial
export function renderInstrucaoInicial(containerId) {
  const contentElement = document.getElementById(containerId);
  if (!contentElement) return;

  contentElement.innerHTML = `
    <div class="instrucao-inicial">
      <p>Por favor, selecione uma edição do Mata-Mata para visualizar os confrontos.</p>
    </div>
  `;
}

// Função para renderizar estado de erro
export function renderErrorState(containerId, fase, error) {
  const contentElement = document.getElementById(containerId);
  if (!contentElement) return;

  contentElement.innerHTML = `
    <div class="error-state">
      <h4>Erro ao Carregar Confrontos</h4>
      <p><strong>Fase:</strong> ${fase.toUpperCase()}</p>
      <p><strong>Erro:</strong> ${error.message}</p>
      <button onclick="window.location.reload()" class="reload-btn">
        Recarregar Página
      </button>
    </div>
  `;
}

// Função para renderizar a tabela do mata-mata
export function renderTabelaMataMata(
  confrontos,
  containerId,
  faseLabel,
  edicaoAtual,
  isPending = false,
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const formatPoints = (points) => {
    if (isPending) return "?";
    return typeof points === "number"
      ? points.toFixed(2).replace(".", ",")
      : "-";
  };

  container.innerHTML = `
    <div class="mata-mata-header">
      <div class="mata-mata-subtitulo">${getEdicaoMataMata(edicaoAtual)}</div>
      <div class="mata-mata-confronto">
        ${gerarTextoConfronto(faseLabel)}
      </div>
      <div class="mata-mata-rodada">
        ${getRodadaPontosText(faseLabel, edicaoAtual)}
      </div>
    </div>
    <div class="mata-mata-table-container">
      <table class="mata-mata-table">
        <thead>
          <tr>
            <th>Jogo</th>
            <th>Time 1</th>
            <th class="pontos-cell">Pts</th>
            <th>X</th>
            <th class="pontos-cell">Pts</th>
            <th>Time 2</th>
          </tr>
        </thead>
        <tbody>
          ${confrontos
            .map((c) => {
              const valorA = c.timeA.valor || 0;
              const valorB = c.timeB.valor || 0;
              return `
              <tr>
                <td class="jogo-cell">${c.jogo}</td>
                <td class="time-cell">
                  <div class="time-info">
                    <img src="/escudos/${c.timeA.clube_id}.png" class="escudo-img" onerror="this.style.display='none'">
                    <div class="time-details">
                      <span class="time-nome">${c.timeA.nome_time}</span>
                      <span class="time-cartoleiro">${c.timeA.nome_cartoleiro || c.timeA.nome_cartola || "—"}</span>
                    </div>
                  </div>
                </td>
                <td class="pontos-cell ${valorA > 0 ? "valor-positivo" : valorA < 0 ? "valor-negativo" : "valor-neutro"}">
                  <div class="pontos-valor">${formatPoints(c.timeA.pontos)}</div>
                  <div class="premio-valor">
                    ${valorA === 10 ? "R$ 10,00" : valorA === -10 ? "-R$ 10,00" : ""}
                  </div>
                </td>
                <td class="vs-cell">X</td>
                <td class="pontos-cell ${valorB > 0 ? "valor-positivo" : valorB < 0 ? "valor-negativo" : "valor-neutro"}">
                  <div class="pontos-valor">${formatPoints(c.timeB.pontos)}</div>
                  <div class="premio-valor">
                    ${valorB === 10 ? "R$ 10,00" : valorB === -10 ? "-R$ 10,00" : ""}
                  </div>
                </td>
                <td class="time-cell">
                  <div class="time-info">
                    <img src="/escudos/${c.timeB.clube_id}.png" class="escudo-img" onerror="this.style.display='none'">
                    <div class="time-details">
                      <span class="time-nome">${c.timeB.nome_time}</span>
                      <span class="time-cartoleiro">${c.timeB.nome_cartoleiro || c.timeB.nome_cartola || "—"}</span>
                    </div>
                  </div>
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

// Função para renderizar mensagem de rodada pendente
export function renderRodadaPendente(contentId, rodadaPontosNum) {
  const contentElement = document.getElementById(contentId);
  if (!contentElement) return;

  const pendenteDiv = document.createElement("div");
  pendenteDiv.className = "rodada-pendente-fase";
  pendenteDiv.innerHTML = `
    <span class="pendente-icon">⚠️</span>
    <h3>Rodada Pendente</h3>
    <p class="pendente-message">A Rodada ${rodadaPontosNum} ainda não aconteceu.</p>
    <p class="pendente-submessage">Os pontos e vencedores serão atualizados automaticamente após o término.</p>
  `;
  contentElement.appendChild(pendenteDiv);
}