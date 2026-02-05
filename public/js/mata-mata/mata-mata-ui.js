// MATA-MATA UI - Interface e Renderização
// Responsável por: renderização de componentes, templates HTML, formatação

import {
  edicoes,
  getRodadaPontosText,
  getEdicaoMataMata,
  gerarTextoConfronto,
  FASE_LABELS,
} from "./mata-mata-config.js";
import { getClubesNomeMap } from "/js/shared/clubes-data.js";

// Escape HTML para prevenir XSS em dados de usuario
function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Função para renderizar a interface principal
// fases: array de fases ativas (ex: ["quartas", "semis", "final"] para 8 times)
export function renderizarInterface(
  container,
  ligaId,
  onEdicaoChange,
  onFaseClick,
  fases = ["primeira", "oitavas", "quartas", "semis", "final"],
) {
  console.log(`[MATA-UI] Renderizando interface com fases: ${fases.join(", ")}`);

  const edicoesHtml = `
    <div class="edicao-selector">
      <label for="edicao-select">Edição:</label>
      <select id="edicao-select">
        <option value="" selected disabled>Selecione uma edição</option>
        ${edicoes
          .map(
            (edicao) => `
          <option value="${edicao.id}" ${!edicao.ativo ? "disabled" : ""}>
            ${edicao.nome} (Rodadas ${edicao.rodadaInicial}-${edicao.rodadaInicial + fases.length - 1})
          </option>
        `,
          )
          .join("")}
      </select>
    </div>
  `;

  const botoesHtml = fases
    .map((fase, idx) => `<button class="fase-btn${idx === 0 ? " active" : ""}" data-fase="${fase}">${FASE_LABELS[fase] || fase.toUpperCase()}</button>`)
    .join("\n        ");

  const fasesHtml = `
    <div id="fase-nav-container" style="display:none;">
      <div class="fase-nav">
        ${botoesHtml}
      </div>
    </div>
    <div id="mataMataContent">
      <div class="instrucao-inicial">
        <p>Por favor, selecione uma edição do Mata-Mata para visualizar os confrontos.</p>
      </div>
    </div>
  `;

  container.innerHTML = edicoesHtml + fasesHtml;

  // Guardar primeira fase para uso no selector
  container.dataset.primeiraFase = fases[0];

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

      // Ativar primeira fase disponível
      const primeiraFase = container.dataset.primeiraFase || "primeira";
      container
        .querySelectorAll(".fase-btn")
        .forEach((btn) => btn.classList.remove("active"));
      const primeiraFaseBtn = container.querySelector(
        `.fase-btn[data-fase="${primeiraFase}"]`,
      );
      if (primeiraFaseBtn) primeiraFaseBtn.classList.add("active");

      onEdicaoChange(edicaoAtual, primeiraFase, ligaId);
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
      <p><strong>Erro:</strong> ${esc(error.message)}</p>
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

              // ✅ Determinar vencedor/perdedor baseado nos pontos
              const pontosA = c.timeA.pontos || 0;
              const pontosB = c.timeB.pontos || 0;
              const resultadoA =
                !isPending && pontosA > pontosB
                  ? "resultado-vitoria"
                  : !isPending && pontosA < pontosB
                    ? "resultado-derrota"
                    : "";
              const resultadoB =
                !isPending && pontosB > pontosA
                  ? "resultado-vitoria"
                  : !isPending && pontosB < pontosA
                    ? "resultado-derrota"
                    : "";

              return `
              <tr>
                <td class="jogo-cell">${c.jogo}</td>
                <td class="time-cell">
                  <div class="time-info">
                    <img src="/escudos/${c.timeA.clube_id}.png" class="escudo-img" onerror="this.src='/escudos/default.png'">
                    <div class="time-details">
                      <span class="time-nome">${esc(c.timeA.nome_time)}</span>
                      <span class="time-cartoleiro">${esc(c.timeA.nome_cartoleiro || c.timeA.nome_cartola) || "—"}</span>
                    </div>
                  </div>
                </td>
                <td class="pontos-cell ${resultadoA} ${valorA > 0 ? "valor-positivo" : valorA < 0 ? "valor-negativo" : "valor-neutro"}">
                  <div class="pontos-valor">${formatPoints(c.timeA.pontos)}</div>
                  <div class="premio-valor">
                    ${valorA > 0 ? `R$ ${valorA.toFixed(2).replace(".", ",")}` : valorA < 0 ? `-R$ ${Math.abs(valorA).toFixed(2).replace(".", ",")}` : ""}
                  </div>
                </td>
                <td class="vs-cell">X</td>
                <td class="pontos-cell ${resultadoB} ${valorB > 0 ? "valor-positivo" : valorB < 0 ? "valor-negativo" : "valor-neutro"}">
                  <div class="pontos-valor">${formatPoints(c.timeB.pontos)}</div>
                  <div class="premio-valor">
                    ${valorB > 0 ? `R$ ${valorB.toFixed(2).replace(".", ",")}` : valorB < 0 ? `-R$ ${Math.abs(valorB).toFixed(2).replace(".", ",")}` : ""}
                  </div>
                </td>
                <td class="time-cell">
                  <div class="time-info">
                    <img src="/escudos/${c.timeB.clube_id}.png" class="escudo-img" onerror="this.src='/escudos/default.png'">
                    <div class="time-details">
                      <span class="time-nome">${esc(c.timeB.nome_time)}</span>
                      <span class="time-cartoleiro">${esc(c.timeB.nome_cartoleiro || c.timeB.nome_cartola) || "—"}</span>
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
export function renderRodadaPendente(containerId, rodadaPontosNum) {
  const contentElement = document.getElementById(containerId);
  if (!contentElement) return;

  const msgContainer = document.createElement("div");
  msgContainer.className = "rodada-pendente";
  msgContainer.innerHTML = `
    <strong>Rodada Pendente</strong><br>
    A Rodada ${rodadaPontosNum} ainda não ocorreu.
  `;
  contentElement.appendChild(msgContainer);
}

// Mapa de times brasileiros para exibição
const TIMES_BRASILEIROS = getClubesNomeMap();

// Função para renderizar banner do campeão
export function renderBannerCampeao(
  containerId,
  confronto,
  edicaoNome,
  isPending = false,
) {
  const contentElement = document.getElementById(containerId);
  if (!contentElement || isPending) return;

  // Determinar o campeão
  const timeA = confronto.timeA;
  const timeB = confronto.timeB;
  const campeao = timeA.pontos > timeB.pontos ? timeA : timeB;
  const viceCampeao = timeA.pontos > timeB.pontos ? timeB : timeA;

  // Verificar se tem time do coração
  const timeCoracaoNome = TIMES_BRASILEIROS[campeao.clube_id];
  const timeCoracaoHTML = timeCoracaoNome
    ? `
    <div class="campeao-time-coracao">
      <img src="/escudos/${campeao.clube_id}.png" onerror="this.src='/escudos/default.png'">
      <span>Torcedor ${esc(timeCoracaoNome)}</span>
    </div>
  `
    : "";

  const bannerHTML = `
    <div class="campeao-banner-container" id="campeao-banner">
      <div class="campeao-banner-bg"></div>
      <div class="campeao-banner-content">
        <div class="campeao-trophy"><span class="material-symbols-outlined" style="font-size: 64px; color: #ffd700;">emoji_events</span></div>
        <div class="campeao-title">CAMPEÃO</div>
        <div class="campeao-edicao">${edicaoNome}</div>

        <div class="campeao-info-principal">
          <img src="/escudos/${campeao.clube_id}.png" 
               class="campeao-escudo" 
               onerror="this.src='/escudos/default.png'">
          <div class="campeao-detalhes">
            <div class="campeao-time-nome">${esc(campeao.nome_time)}</div>
            <div class="campeao-cartoleiro">${esc(campeao.nome_cartoleiro || campeao.nome_cartola) || "—"}</div>
            <div class="campeao-pontos">${campeao.pontos.toFixed(2).replace(".", ",")} pts</div>
            ${timeCoracaoHTML}
          </div>
        </div>

        <div class="vice-campeao-info">
          <div class="vice-label">Vice-Campeão</div>
          <div class="vice-detalhes">
            <img src="/escudos/${viceCampeao.clube_id}.png" 
                 class="vice-escudo" 
                 onerror="this.src='/escudos/default.png'">
            <span class="vice-nome">${esc(viceCampeao.nome_time)}</span>
            <span class="vice-pontos">${viceCampeao.pontos.toFixed(2).replace(".", ",")} pts</span>
          </div>
        </div>
      </div>
    </div>
  `;

  contentElement.insertAdjacentHTML("beforeend", bannerHTML);

  // Adicionar animação de entrada
  setTimeout(() => {
    const banner = document.getElementById("campeao-banner");
    if (banner) banner.classList.add("show");
  }, 100);
}
