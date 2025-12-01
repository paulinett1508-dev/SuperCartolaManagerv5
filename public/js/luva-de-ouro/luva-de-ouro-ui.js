// LUVA DE OURO UI - Tabela com Rodadas em Colunas Navegáveis v4.0.0
// 8 rodadas visíveis por vez com navegação horizontal

console.log("🎨 [LUVA-UI] Módulo UI carregando...");

// Cache de elementos DOM
const elementsCache = new Map();

// Estado da navegação de rodadas
let estadoNavegacao = {
  rodadaInicio: 1,
  rodadasVisiveis: 12, // ✅ Aumentado para 12
  rodadaAtual: 35,
  mercadoAberto: false,
};

function getElement(id) {
  // ✅ SEMPRE buscar elemento fresco do DOM (evita cache de elementos destruídos)
  const element = document.getElementById(id);
  if (element) {
    elementsCache.set(id, element);
  } else {
    elementsCache.delete(id); // Limpar referência inválida
  }
  return element;
}

// ✅ Guardar última renderização para navegação
let ultimaRenderizacao = null;

export function limparCacheUI() {
  elementsCache.clear();
  ultimaRenderizacao = null;
  estadoNavegacao = {
    rodadaInicio: 1,
    rodadasVisiveis: 12,
    rodadaAtual: 35,
    mercadoAberto: false,
  };
  console.log("[LUVA-UI] Cache de elementos limpo");
}

// ==============================
// NAVEGAÇÃO DE RODADAS
// ==============================

export function configurarNavegacao(rodadaAtual, mercadoAberto) {
  estadoNavegacao.rodadaAtual = rodadaAtual;
  estadoNavegacao.mercadoAberto = mercadoAberto;

  // Posicionar para mostrar as últimas rodadas com a atual visível (incluindo parcial)
  estadoNavegacao.rodadaInicio = Math.max(
    1,
    rodadaAtual - estadoNavegacao.rodadasVisiveis + 1,
  );

  console.log("[LUVA-UI] Navegação configurada:", estadoNavegacao);
}

export function navegarRodadas(direcao) {
  const { rodadaInicio, rodadasVisiveis, rodadaAtual } = estadoNavegacao;

  if (direcao === "esquerda") {
    estadoNavegacao.rodadaInicio = Math.max(1, rodadaInicio - rodadasVisiveis);
  } else {
    estadoNavegacao.rodadaInicio = Math.min(
      rodadaAtual - rodadasVisiveis + 1,
      rodadaInicio + rodadasVisiveis,
    );
    estadoNavegacao.rodadaInicio = Math.max(1, estadoNavegacao.rodadaInicio);
  }

  console.log(`[LUVA-UI] Navegando ${direcao}:`, estadoNavegacao.rodadaInicio);

  // ✅ Re-renderizar com dados salvos na última renderização
  if (ultimaRenderizacao) {
    renderizarRanking(ultimaRenderizacao);
  }
}

// ==============================
// LAYOUT PRINCIPAL
// ==============================

export function criarLayoutPrincipal() {
  return `
    <div class="luva-container">
      <!-- Header -->
      <div class="luva-header">
        <div class="luva-title">
          <span class="luva-icon">🧤</span>
          <h3>Luva de Ouro</h3>
        </div>
        <div class="luva-info-rodada">
          <span id="luvaInfoStatus">Carregando...</span>
        </div>
      </div>

      <!-- Seção de conteúdo -->
      <div id="luvaContentSection" class="luva-content-section">
        <!-- Navegação de rodadas -->
        <div class="luva-nav-container">
          <button class="luva-nav-btn nav-esq" onclick="window.LuvaDeOuroUI.navegarRodadas('esquerda')" title="Rodadas anteriores">
            ◀
          </button>
          <span id="luvaNavInfo" class="luva-nav-info">Rodadas 1 - 8</span>
          <button class="luva-nav-btn nav-dir" onclick="window.LuvaDeOuroUI.navegarRodadas('direita')" title="Próximas rodadas">
            ▶
          </button>
        </div>

        <!-- Tabela com rodadas em colunas -->
        <div class="luva-table-container">
          <table class="luva-ranking-table">
            <thead id="luvaTableHead">
              <tr>
                <th class="col-pos">#</th>
                <th class="col-escudo"></th>
                <th class="col-nome">CARTOLEIRO</th>
                <th class="col-total">TOTAL</th>
              </tr>
            </thead>
            <tbody id="luvaRankingBody">
              <tr><td colspan="12" class="loading-cell">Carregando...</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Stats e Inativos serão inseridos aqui dinamicamente -->
      </div>
    </div>
  `;
}

// ==============================
// RENDERIZAÇÃO DO RANKING
// ==============================

export function renderizarRanking(dados) {
  const tbody = getElement("luvaRankingBody");
  const thead = getElement("luvaTableHead");
  if (!tbody || !thead) return;

  if (!dados || !dados.ranking || dados.ranking.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="loading-cell" style="color:#e67e22;">Nenhum dado encontrado</td></tr>`;
    return;
  }

  // ✅ Salvar dados para navegação futura
  ultimaRenderizacao = dados;

  const { ranking, rodadaFim } = dados;
  const { rodadaInicio, rodadasVisiveis, rodadaAtual, mercadoAberto } =
    estadoNavegacao;

  // ✅ Rodada parcial = rodada atual se mercado fechado E rodadaAtual > rodadaFim
  const rodadaParcial = dados.rodadaParcial || rodadaAtual || null;

  // ✅ Se temos rodada atual maior que rodadaFim, incluir na exibição
  const rodadaFimReal = Math.max(rodadaFim || 0, rodadaParcial || 0);

  const rodadaFimVisivel = Math.min(
    rodadaInicio + rodadasVisiveis - 1,
    rodadaFimReal,
  );
  const rodadasExibir = [];
  for (let r = rodadaInicio; r <= rodadaFimVisivel; r++) {
    rodadasExibir.push(r);
  }

  // ✅ Verificar se rodada atual está em andamento (mercado fechado)
  const rodadaEmAndamento = mercadoAberto === false ? rodadaAtual : null;
  // Rodada parcial pode vir dos dados ou ser a rodada em andamento
  const rodadaParcialFlag = dados.rodadaParcial || rodadaEmAndamento;

  // Atualizar header com colunas de rodadas
  const headersRodadas = rodadasExibir
    .map((r) => {
      const isParcial = r === rodadaParcialFlag;
      const classe = isParcial ? "col-rodada parcial" : "col-rodada";
      return `<th class="${classe}">R${r}${isParcial ? "*" : ""}</th>`;
    })
    .join("");

  thead.innerHTML = `
    <tr>
      <th class="col-pos">#</th>
      <th class="col-escudo"></th>
      <th class="col-nome">CARTOLEIRO</th>
      <th class="col-total">TOTAL</th>
      ${headersRodadas}
    </tr>
  `;

  // Atualizar info de navegação
  const navInfo = getElement("luvaNavInfo");
  if (navInfo) {
    navInfo.textContent = `Rodadas ${rodadaInicio} - ${rodadaFimVisivel}`;
  }

  // Mapeamento de escudos
  const ESCUDOS = {
    1926323: 262,
    13935277: 262,
    14747183: 276,
    49149009: 262,
    49149388: 262,
    50180257: 267,
  };

  // Renderizar linhas
  const tableHTML = ranking
    .map((item, index) => {
      const posicao = index + 1;
      const posIcon =
        posicao === 1
          ? "🏆"
          : posicao === 2
            ? "🥈"
            : posicao === 3
              ? "🥉"
              : `${posicao}º`;
      const posClass = posicao <= 3 ? `pos-${posicao}` : "";

      const escudoId =
        ESCUDOS[item.participanteId] || item.clubeId || "default";
      const pontosTotais = parseFloat(item.pontosTotais || 0).toFixed(2);

      // Criar mapa de pontos por rodada para acesso rápido (com dados do goleiro)
      const pontosPorRodada = {};
      if (item.rodadas && Array.isArray(item.rodadas)) {
        item.rodadas.forEach((r) => {
          pontosPorRodada[r.rodada] = {
            pontos: r.pontos,
            goleiroNome: r.goleiroNome,
            goleiroClube: r.goleiroClube,
            parcial: r.parcial || false,
          };
        });
      }

      // Gerar células de pontos para cada rodada visível (com goleiro)
      const celulasRodadas = rodadasExibir
        .map((r) => {
          const rodadaData = pontosPorRodada[r];
          // Detectar parcial: flag nos dados OU rodada marcada como parcial
          const isParcial =
            rodadaData?.parcial === true || r === rodadaParcialFlag;

          if (rodadaData !== undefined) {
            const pontosNum = parseFloat(rodadaData.pontos || 0);
            const goleiroNome = rodadaData.goleiroNome || "";
            const semGoleiro =
              !goleiroNome ||
              goleiroNome === "Sem goleiro" ||
              goleiroNome === "N/A";
            const goleiroAbrev = semGoleiro
              ? "N/Esc"
              : goleiroNome.split(" ")[0].substring(0, 7);

            // Tratar NaN
            const pontosValidos = isNaN(pontosNum) ? 0 : pontosNum;
            const pontosClass = semGoleiro
              ? "sem-goleiro"
              : pontosValidos > 0
                ? "positivo"
                : pontosValidos < 0
                  ? "negativo"
                  : "zero";
            const pontosTexto = semGoleiro ? "—" : pontosValidos.toFixed(2);
            const parcialClass = isParcial ? " parcial" : "";

            return `<td class="col-rodada-pts ${pontosClass}${parcialClass}">
          <span class="pts-valor">${pontosTexto}</span>
          <span class="pts-goleiro">${goleiroAbrev}</span>
        </td>`;
          }
          const parcialClass = isParcial ? " parcial" : "";
          return `<td class="col-rodada-pts vazio${parcialClass}"><span class="pts-valor">—</span><span class="pts-goleiro">—</span></td>`;
        })
        .join("");

      return `
      <tr class="luva-ranking-row ${posClass}">
        <td class="col-pos"><span class="pos-badge">${posIcon}</span></td>
        <td class="col-escudo"><img src="/escudos/${escudoId}.png" alt="" class="escudo-img" onerror="this.src='/escudos/default.png'"></td>
        <td class="col-nome"><span class="participante-nome">${item.participanteNome}</span></td>
        <td class="col-total"><span class="pontos-total">${pontosTotais}</span></td>
        ${celulasRodadas}
      </tr>
    `;
    })
    .join("");

  tbody.innerHTML = tableHTML;

  // ✅ Renderizar seção de inativos (se houver)
  renderizarSecaoInativos(dados, rodadasExibir, rodadaParcialFlag);

  // Renderizar estatísticas
  renderizarEstatisticas(ranking, rodadasExibir, dados);
}

// ==============================
// ESTATÍSTICAS
// ==============================

function renderizarEstatisticas(ranking, rodadasExibir, dados) {
  // ✅ Remover container existente
  const containerExistente = document.getElementById("luvaStatsContainer");
  if (containerExistente) containerExistente.remove();

  if (!ranking || ranking.length === 0) return;

  const lider = ranking[0];
  const totalParticipantes = ranking.length;
  const totalInativos = dados.inativos?.length || 0;

  // Calcular melhor pontuação individual
  let melhorPontuacao = 0;
  let melhorCartoleiro = "";
  let melhorRodada = 0;

  ranking.forEach((p) => {
    if (p.rodadas) {
      p.rodadas.forEach((r) => {
        if (r.pontos > melhorPontuacao) {
          melhorPontuacao = r.pontos;
          melhorCartoleiro = p.participanteNome;
          melhorRodada = r.rodada;
        }
      });
    }
  });

  // ✅ Criar container dinamicamente
  const container = document.createElement("div");
  container.id = "luvaStatsContainer";
  container.className = "luva-stats-container";
  container.innerHTML = `
    <div class="luva-stats-grid">
      <div class="luva-stat-card gold">
        <div class="stat-icon">🏆</div>
        <div class="stat-value">${parseFloat(lider.pontosTotais || 0).toFixed(1)}</div>
        <div class="stat-label">Líder</div>
        <div class="stat-detail">${lider.participanteNome}</div>
      </div>
      <div class="luva-stat-card blue">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${totalParticipantes}</div>
        <div class="stat-label">Ativos</div>
        ${totalInativos > 0 ? `<div class="stat-detail">${totalInativos} inativo(s)</div>` : ""}
      </div>
      <div class="luva-stat-card green">
        <div class="stat-icon">⭐</div>
        <div class="stat-value">${melhorPontuacao.toFixed(1)}</div>
        <div class="stat-label">Melhor Rodada</div>
        <div class="stat-detail">${melhorCartoleiro} (R${melhorRodada})</div>
      </div>
    </div>
  `;

  // ✅ Inserir DEPOIS da seção de inativos (ou depois da tabela se não houver inativos)
  const secaoInativos = document.getElementById("luva-inativos-section");
  const contentSection = document.getElementById("luvaContentSection");

  if (secaoInativos) {
    secaoInativos.after(container);
  } else if (contentSection) {
    contentSection.appendChild(container);
  }
}

// ==============================
// ESTADOS DE LOADING E ERRO
// ==============================

export function mostrarLoading(mensagem = "Carregando...") {
  const tbody = getElement("luvaRankingBody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" class="loading-cell">
          <div class="luva-loading">
            <div class="spinner"></div>
            <p>${mensagem}</p>
          </div>
        </td>
      </tr>
    `;
  }
}

export function mostrarErro(mensagem, detalhes = null) {
  const tbody = getElement("luvaRankingBody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" class="loading-cell">
          <div class="luva-erro">
            <span class="erro-icon">❌</span>
            <p class="erro-msg">${mensagem}</p>
            ${detalhes ? `<p class="erro-detalhe">${detalhes}</p>` : ""}
            <button class="btn btn-primary" onclick="window.LuvaDeOuroOrquestrador.carregarRanking(true)">
              🔄 Tentar Novamente
            </button>
          </div>
        </td>
      </tr>
    `;
  }
}

export function atualizarInfoStatus(texto) {
  const info = getElement("luvaInfoStatus");
  if (info) {
    info.innerHTML = texto;
  }
}

export function atualizarTitulo(texto) {
  // Compatibilidade - não usado mais
}

// Funções de compatibilidade (mantidas para não quebrar o orquestrador)
export function renderizarMiniCardsRodadas(
  rodadaAtual,
  mercadoAberto,
  rodadasComDados = [],
) {
  configurarNavegacao(rodadaAtual, mercadoAberto);
  console.log("[LUVA-UI] Navegação configurada (mini-cards substituídos)");
}

export function marcarRodadaSelecionada(rodada) {
  // Não usado mais - navegação é por faixa
}

// ==============================
// MODAL DE DETALHES (COM SUPORTE A INATIVOS)
// ==============================

export function mostrarModalDetalhes(dados) {
  const { participante, rodadaInicio, rodadaFim, historico } = dados;

  // Remover modal existente
  const modalExistente = document.getElementById("luva-modal-detalhes");
  if (modalExistente) modalExistente.remove();

  const isInativo = participante.ativo === false;
  const badgeInativo = isInativo
    ? `<span class="badge-inativo-modal">INATIVO desde R${participante.rodada_desistencia || "?"}</span>`
    : "";

  const modal = document.createElement("div");
  modal.id = "luva-modal-detalhes";
  modal.className = "luva-modal-overlay";
  modal.innerHTML = `
    <div class="luva-modal-content ${isInativo ? "modal-inativo" : ""}">
      <div class="luva-modal-header">
        <h3>📊 ${participante.nome} ${badgeInativo}</h3>
        <button class="modal-fechar" onclick="document.getElementById('luva-modal-detalhes').remove()">×</button>
      </div>
      <div class="luva-modal-body">
        <div class="detalhes-resumo">
          <div class="resumo-item">
            <span class="resumo-label">Pontos Totais</span>
            <span class="resumo-valor ${isInativo ? "valor-inativo" : ""}">${(participante.pontosTotais || 0).toFixed(2)}</span>
          </div>
          <div class="resumo-item">
            <span class="resumo-label">Rodadas Jogadas</span>
            <span class="resumo-valor">${participante.totalJogos || 0}</span>
          </div>
          <div class="resumo-item">
            <span class="resumo-label">Período</span>
            <span class="resumo-valor">R${rodadaInicio} - R${rodadaFim}</span>
          </div>
        </div>
        ${
          isInativo
            ? `
          <div class="aviso-inativo">
            ⚠️ Este participante está inativo. Pontuação congelada na rodada ${participante.rodada_desistencia || "?"}.
          </div>
        `
            : ""
        }
        <div class="historico-titulo">Histórico de Goleiros</div>
        <div class="historico-lista">
          ${
            historico && historico.length > 0
              ? historico
                  .map(
                    (h) => `
                <div class="historico-item">
                  <span class="hist-rodada">R${h.rodada}</span>
                  <span class="hist-goleiro">${h.goleiroNome || "Sem goleiro"}</span>
                  <span class="hist-pontos ${(h.pontos || 0) >= 0 ? "positivo" : "negativo"}">${(h.pontos || 0).toFixed(2)}</span>
                </div>
              `,
                  )
                  .join("")
              : "<p class='sem-historico'>Histórico não disponível</p>"
          }
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Fechar ao clicar fora
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  // Fechar com ESC
  const handleEsc = (e) => {
    if (e.key === "Escape") {
      modal.remove();
      document.removeEventListener("keydown", handleEsc);
    }
  };
  document.addEventListener("keydown", handleEsc);
}

// ==============================
// SEÇÃO DE INATIVOS
// ==============================

export function renderizarSecaoInativos(dados, rodadasExibir, rodadaParcial) {
  const { inativos } = dados;

  // Remover seção existente (se houver)
  const secaoExistente = document.getElementById("luva-inativos-section");
  if (secaoExistente) secaoExistente.remove();

  // Se não houver inativos, não renderizar
  if (!inativos || inativos.length === 0) return;

  // Criar container para a seção de inativos
  const tableContainer = document.querySelector(".luva-table-container");
  if (!tableContainer) return;

  const ESCUDOS = {
    1926323: 262,
    13935277: 262,
    14747183: 276,
    49149009: 262,
    49149388: 262,
    50180257: 267,
  };

  const inativosHTML = inativos
    .map((item) => {
      const escudoId =
        ESCUDOS[item.participanteId] || item.clubeId || "default";
      const pontosTotais = parseFloat(item.pontosTotais || 0).toFixed(2);

      // Criar mapa de pontos por rodada
      const pontosPorRodada = {};
      if (item.rodadas && Array.isArray(item.rodadas)) {
        item.rodadas.forEach((r) => {
          pontosPorRodada[r.rodada] = {
            pontos: r.pontos,
            goleiroNome: r.goleiroNome,
          };
        });
      }

      // Células de rodadas
      const celulasRodadas = rodadasExibir
        .map((r) => {
          const rodadaData = pontosPorRodada[r];
          const isParcial = r === rodadaParcial;

          if (rodadaData !== undefined) {
            const pontosNum = parseFloat(rodadaData.pontos || 0);
            const goleiroNome = rodadaData.goleiroNome || "";
            const semGoleiro = !goleiroNome || goleiroNome === "Sem goleiro";
            const goleiroAbrev = semGoleiro
              ? "N/Esc"
              : goleiroNome.split(" ")[0].substring(0, 7);
            const pontosValidos = isNaN(pontosNum) ? 0 : pontosNum;
            const pontosClass = semGoleiro
              ? "sem-goleiro"
              : pontosValidos > 0
                ? "positivo"
                : pontosValidos < 0
                  ? "negativo"
                  : "zero";
            const pontosTexto = semGoleiro ? "—" : pontosValidos.toFixed(2);
            const parcialClass = isParcial ? " parcial" : "";

            return `<td class="col-rodada-pts ${pontosClass}${parcialClass}">
          <span class="pts-valor">${pontosTexto}</span>
          <span class="pts-goleiro">${goleiroAbrev}</span>
        </td>`;
          }
          const parcialClass = isParcial ? " parcial" : "";
          return `<td class="col-rodada-pts vazio${parcialClass}"><span class="pts-valor">—</span><span class="pts-goleiro">—</span></td>`;
        })
        .join("");

      return `
      <tr class="luva-ranking-row inativo">
        <td class="col-pos"><span class="pos-badge pos-inativo">—</span></td>
        <td class="col-escudo"><img src="/escudos/${escudoId}.png" alt="" class="escudo-img" onerror="this.src='/escudos/default.png'" style="opacity:0.5;filter:grayscale(80%);"></td>
        <td class="col-nome">
          <span class="participante-nome" style="color:#888;">${item.participanteNome}</span>
          <span class="desistencia-badge">SAIU R${item.rodada_desistencia || "?"}</span>
        </td>
        <td class="col-total"><span class="pontos-total" style="opacity:0.5;text-decoration:line-through;">${pontosTotais}</span></td>
        ${celulasRodadas}
      </tr>
    `;
    })
    .join("");

  const secaoInativos = document.createElement("div");
  secaoInativos.id = "luva-inativos-section";
  secaoInativos.className = "luva-inativos-section";
  secaoInativos.innerHTML = `
    <div class="inativos-header">
      <span class="inativos-icon">🚫</span>
      <h4>Participantes Inativos</h4>
      <span class="inativos-badge">${inativos.length}</span>
      <span class="inativos-info">Fora da disputa do ranking</span>
    </div>
    <div class="luva-table-container" style="opacity:0.6;">
      <table class="luva-ranking-table inativos-table">
        <thead>
          <tr>
            <th class="col-pos">#</th>
            <th class="col-escudo"></th>
            <th class="col-nome">CARTOLEIRO</th>
            <th class="col-total">TOTAL</th>
            ${rodadasExibir.map((r) => `<th class="col-rodada">R${r}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${inativosHTML}
        </tbody>
      </table>
    </div>
  `;

  tableContainer.parentNode.appendChild(secaoInativos);
}

// Exportar para window
window.LuvaDeOuroUI = {
  criarLayoutPrincipal,
  renderizarMiniCardsRodadas,
  marcarRodadaSelecionada,
  renderizarRanking,
  mostrarLoading,
  mostrarErro,
  atualizarInfoStatus,
  atualizarTitulo,
  limparCacheUI,
  navegarRodadas,
  configurarNavegacao,
  mostrarModalDetalhes,
  renderizarSecaoInativos,
};

console.log(
  "✅ [LUVA-UI] Módulo carregado com colunas navegáveis v4.0.0 + suporte a inativos",
);
