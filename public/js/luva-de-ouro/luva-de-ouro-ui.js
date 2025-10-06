// public/js/luva-de-ouro/luva-de-ouro-ui.js - VERSÃO PADRONIZADA (SEM ESTILOS INLINE)
console.log("🎨 [LUVA-UI] Módulo UI carregando...");

const LuvaDeOuroUI = {
  /**
   * Cria controles principais (seguindo padrão do sistema)
   */
  criarControles() {
    const config = window.LuvaDeOuroConfig;
    return `
      <div class="controls-section">
        <div class="controls-header">
          <h3>Filtros de Rodadas</h3>
        </div>

        <div class="controls-grid">
          <div class="control-group">
            <label for="luvaRodadaInicio">Rodada Início</label>
            <input type="number" 
                   id="luvaRodadaInicio" 
                   min="${config.RODADAS.MIN}" 
                   max="${config.RODADAS.MAX}" 
                   value="${config.RODADAS.DEFAULT_INICIO}"
                   class="form-control">
          </div>

          <div class="control-group">
            <label for="luvaRodadaFim">Rodada Fim</label>
            <input type="number" 
                   id="luvaRodadaFim" 
                   min="${config.RODADAS.MIN}" 
                   max="${config.RODADAS.MAX}" 
                   placeholder="Automático"
                   class="form-control">
          </div>
        </div>

        <div class="controls-actions">
          <button id="luvaRankingBtn" class="btn btn-primary">
            <i data-lucide="trophy"></i>
            Gerar Ranking
          </button>
          <button id="luvaUltimaRodadaBtn" class="btn btn-secondary">
            <i data-lucide="calendar"></i>
            Até Última Rodada
          </button>
          <button id="luvaForcarColetaBtn" class="btn btn-warning">
            <i data-lucide="refresh-cw"></i>
            Forçar Coleta
          </button>
        </div>

        <div id="luvaInfoRodada" class="info-box">
          <span id="luvaInfoTexto">${config.MESSAGES.INFO_INICIAL}</span>
        </div>
      </div>
    `;
  },

  /**
   * Renderiza tabela de ranking (padrão clean)
   */
  renderizarRanking(dados) {
    if (!dados || !dados.ranking || !Array.isArray(dados.ranking)) {
      return this.renderizarErroSemDados();
    }

    if (dados.ranking.length === 0) {
      return this.renderizarRankingVazio();
    }

    const participantesComDados = dados.ranking.filter(
      (p) => p.pontosTotais > 0 || p.totalJogos > 0,
    );
    if (participantesComDados.length === 0) {
      return this.renderizarDadosIncompletos(dados.ranking.length);
    }

    return this.renderizarTabelaCompleta(dados);
  },

  renderizarErroSemDados() {
    return `
      <div class="empty-state">
        <i data-lucide="alert-circle" class="empty-icon"></i>
        <h4>Erro ao carregar dados</h4>
        <p>Tente novamente mais tarde.</p>
      </div>
    `;
  },

  renderizarRankingVazio() {
    return `
      <div class="empty-state">
        <i data-lucide="inbox" class="empty-icon"></i>
        <h3>Nenhum dado encontrado</h3>
        <p>Não há dados de goleiros para o período selecionado.</p>
        <div class="empty-details">
          <p>Isso pode acontecer se:</p>
          <ul>
            <li>As rodadas ainda não foram coletadas</li>
            <li>Houve erro na API do Cartola FC</li>
            <li>Os dados ainda estão sendo processados</li>
          </ul>
        </div>
        <div class="empty-actions">
          <button onclick="window.LuvaDeOuroOrquestrador.carregarRanking(true)" class="btn btn-primary">
            <i data-lucide="refresh-cw"></i>
            Forçar Coleta
          </button>
          <button onclick="window.LuvaDeOuroOrquestrador.carregarRanking(false)" class="btn btn-secondary">
            <i data-lucide="rotate-ccw"></i>
            Recarregar
          </button>
        </div>
      </div>
    `;
  },

  renderizarDadosIncompletos(totalParticipantes) {
    return `
      <div class="empty-state warning">
        <i data-lucide="alert-triangle" class="empty-icon"></i>
        <h3>Dados Incompletos</h3>
        <p>Os participantes foram encontrados, mas não há pontuações de goleiros registradas.</p>
        <div class="empty-stats">
          <span>Total de participantes: <strong>${totalParticipantes}</strong></span>
          <span>Participantes com dados: <strong>0</strong></span>
        </div>
        <button onclick="window.LuvaDeOuroOrquestrador.carregarRanking(true)" class="btn btn-warning">
          <i data-lucide="zap"></i>
          Forçar Coleta Completa
        </button>
      </div>
    `;
  },

  renderizarTabelaCompleta(dados) {
    const { ranking, rodadaInicio, rodadaFim, totalParticipantes } = dados;
    const config = window.LuvaDeOuroConfig;

    let html = `
      <div class="ranking-header">
        <h3>Ranking Luva de Ouro</h3>
        <div class="ranking-meta">
          <span class="badge">Rodadas ${rodadaInicio} a ${rodadaFim}</span>
          <span class="badge">${totalParticipantes} participantes</span>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table ranking-table">
          <thead>
            <tr>
              <th class="col-pos">Pos</th>
              <th class="col-escudo"></th>
              <th class="col-nome">Cartoleiro</th>
              <th class="col-pontos">Total</th>
              <th class="col-goleiro">Goleiro (R${rodadaFim})</th>
              <th class="col-pontos-rodada">Pontos</th>
              <th class="col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
    `;

    ranking.forEach((item, index) => {
      html += this.criarLinhaRanking(
        item,
        index,
        config.ESCUDOS_PARTICIPANTES,
        rodadaFim,
      );
    });

    html += `
          </tbody>
        </table>
      </div>

      ${this.criarEstatisticas(ranking, totalParticipantes)}
    `;

    return html;
  },

  criarLinhaRanking(item, index, escudos, rodadaFim) {
    const posicao = index + 1;
    const posicaoClass = posicao <= 3 ? `pos-${posicao}` : "";
    const posicaoIcon =
      {
        1: "🏆",
        2: "🥈",
        3: "🥉",
      }[posicao] || "";

    const escudoId = escudos[item.participanteId] || "default";

    return `
      <tr class="ranking-row ${posicaoClass}">
        <td class="col-pos">
          <div class="pos-content">
            <span class="pos-numero">${posicao}º</span>
            ${posicaoIcon ? `<span class="pos-icon">${posicaoIcon}</span>` : ""}
          </div>
        </td>
        <td class="col-escudo">
          <img src="/escudos/${escudoId}.png" 
               alt="Escudo" 
               class="escudo-img"
               onerror="this.src='/escudos/default.png';">
        </td>
        <td class="col-nome">
          <div class="participante-info">
            <div class="participante-nome">${item.participanteNome}</div>
            <div class="participante-id">ID: ${item.participanteId}</div>
          </div>
        </td>
        <td class="col-pontos">
          <span class="pontos-badge">${Math.floor(item.pontosTotais * 100) / 100}</span>
        </td>
        <td class="col-goleiro">
          <div class="goleiro-info">
            <div class="goleiro-nome">${item.ultimaRodada?.goleiroNome || "Sem goleiro"}</div>
            ${item.ultimaRodada?.goleiroClube ? `<div class="goleiro-clube">${item.ultimaRodada.goleiroClube}</div>` : ""}
          </div>
        </td>
        <td class="col-pontos-rodada">
          <div class="pontos-rodada ${(item.ultimaRodada?.pontos || 0) >= 0 ? "positivo" : "negativo"}">
            <div class="pontos-valor">${Math.floor((item.ultimaRodada?.pontos || 0) * 100) / 100}</div>
            <div class="pontos-rodada-num">R${item.ultimaRodada?.rodada || "-"}</div>
          </div>
        </td>
        <td class="col-acoes">
          <button class="btn btn-sm btn-detalhes" 
                  data-participante-id="${item.participanteId}" 
                  data-participante-nome="${item.participanteNome}">
            <i data-lucide="eye"></i>
            Detalhes
          </button>
        </td>
      </tr>
    `;
  },

  criarEstatisticas(ranking, totalParticipantes) {
    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">${Math.floor((ranking[0]?.pontosTotais || 0) * 100) / 100}</div>
          <div class="stat-label">Melhor Pontuação</div>
          <div class="stat-detail">${ranking[0]?.participanteNome || "-"}</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-value">${totalParticipantes}</div>
          <div class="stat-label">Participantes</div>
          <div class="stat-detail">Liga ativa</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-value">${Math.floor(Math.max(...ranking.map((r) => r.ultimaRodada?.pontos || 0)) * 100) / 100}</div>
          <div class="stat-label">Melhor Rodada</div>
          <div class="stat-detail">Individual</div>
        </div>
      </div>
    `;
  },

  criarBotaoExport() {
    return `
      <button id="exportLuvaImagem" class="btn btn-export">
        <i data-lucide="download"></i>
        Exportar Ranking
      </button>
    `;
  },

  mostrarLoading(mensagem) {
    return `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>${mensagem}</p>
      </div>
    `;
  },

  mostrarErro(erro, detalhes = null) {
    return `
      <div class="error-state">
        <i data-lucide="alert-circle" class="error-icon"></i>
        <h4>Erro ao carregar Luva de Ouro</h4>
        <p class="error-message"><strong>Erro:</strong> ${erro}</p>
        ${detalhes ? `<p class="error-details">${detalhes}</p>` : ""}
        <button onclick="window.location.reload()" class="btn btn-primary">
          <i data-lucide="refresh-cw"></i>
          Recarregar Página
        </button>
      </div>
    `;
  },
};

window.LuvaDeOuroUI = LuvaDeOuroUI;

console.log("✅ [LUVA-UI] Módulo UI carregado (CSS externo)");
