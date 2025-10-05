// public/js/luva-de-ouro/luva-de-ouro-ui.js
console.log("🎨 [LUVA-UI] Módulo UI carregando...");

/**
 * Módulo UI - Interface e renderização
 */
const LuvaDeOuroUI = {
  /**
   * Cria controles principais do módulo
   */
  criarControles() {
    const config = window.LuvaDeOuroConfig;
    return `
      <div class="luva-ouro-controles" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #2c3e50;">🥅 Luva de Ouro - Ranking de Goleiros</h3>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Rodada Início:</label>
            <input type="number" id="luvaRodadaInicio" min="${config.RODADAS.MIN}" max="${config.RODADAS.MAX}" value="${config.RODADAS.DEFAULT_INICIO}" 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Rodada Fim:</label>
            <input type="number" id="luvaRodadaFim" min="${config.RODADAS.MIN}" max="${config.RODADAS.MAX}" value="" placeholder="Automático"
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
          <button id="luvaRankingBtn" class="btn-primary" style="flex: 1; min-width: 150px;">
            🏆 Gerar Ranking
          </button>
          <button id="luvaUltimaRodadaBtn" class="btn-secondary" style="flex: 1; min-width: 150px;">
            📅 Até Última Rodada
          </button>
          <button id="luvaForcarColetaBtn" class="btn-warning" style="flex: 1; min-width: 150px;">
            🔄 Forçar Coleta
          </button>
        </div>

        <div id="luvaInfoRodada" style="padding: 10px; background: #e8f4f8; border-radius: 4px; font-size: 14px;">
          <span id="luvaInfoTexto">${config.MESSAGES.INFO_INICIAL}</span>
        </div>
      </div>
    `;
  },

  /**
   * Renderiza tabela de ranking
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

  /**
   * Renderiza erro genérico
   */
  renderizarErroSemDados() {
    return `
      <div style="text-align: center; padding: 40px; color: #666;">
        <h4>📊 Erro ao carregar dados</h4>
        <p>Tente novamente mais tarde.</p>
      </div>
    `;
  },

  /**
   * Renderiza estado de ranking vazio
   */
  renderizarRankingVazio() {
    return `
      <div style="text-align: center; padding: 40px 20px; color: #888;">
        <h3>📊 Nenhum dado encontrado</h3>
        <p>Não há dados de goleiros para o período selecionado.</p>
        <p style="font-size: 0.9em; color: #666; margin: 15px 0;">
          Isso pode acontecer se:<br>
          • As rodadas ainda não foram coletadas<br>
          • Houve erro na API do Cartola FC<br>
          • Os dados ainda estão sendo processados
        </p>
        <div style="margin-top: 20px;">
          <button onclick="window.LuvaDeOuroOrquestrador.carregarRanking(true)" style="margin: 5px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            🔄 Forçar Coleta
          </button>
          <button onclick="window.LuvaDeOuroOrquestrador.carregarRanking(false)" style="margin: 5px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
            📊 Recarregar
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Renderiza aviso de dados incompletos
   */
  renderizarDadosIncompletos(totalParticipantes) {
    return `
      <div style="text-align: center; padding: 40px 20px; color: #f39c12;">
        <h3>⚠️ Dados Incompletos</h3>
        <p>Os participantes foram encontrados, mas não há pontuações de goleiros registradas.</p>
        <p style="font-size: 0.9em; color: #666; margin: 15px 0;">
          Total de participantes: ${totalParticipantes}<br>
          Participantes com dados: 0
        </p>
        <button onclick="window.LuvaDeOuroOrquestrador.carregarRanking(true)" style="margin-top: 15px; padding: 8px 16px; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer;">
          🚀 Forçar Coleta Completa
        </button>
      </div>
    `;
  },

  /**
   * Renderiza tabela completa de ranking
   */
  renderizarTabelaCompleta(dados) {
    const { ranking, rodadaInicio, rodadaFim, totalParticipantes } = dados;
    const config = window.LuvaDeOuroConfig;

    let html = this.criarCabecalhoRanking(
      rodadaInicio,
      rodadaFim,
      totalParticipantes,
    );
    html += this.criarTabelaRanking(
      ranking,
      rodadaFim,
      config.ESCUDOS_PARTICIPANTES,
    );
    html += this.criarEstatisticas(ranking, totalParticipantes);

    return html;
  },

  /**
   * Cria cabeçalho do ranking
   */
  criarCabecalhoRanking(rodadaInicio, rodadaFim, totalParticipantes) {
    return `
      <div class="luva-ranking-header" style="margin: 15px 0; text-align: center;">
        <h3 style="color: #2c3e50; margin-bottom: 8px; font-size: 20px;">
          🥅 Ranking Luva de Ouro - Rodadas ${rodadaInicio} a ${rodadaFim}
        </h3>
        <p style="color: #7f8c8d; margin: 0; font-size: 14px;">
          ${totalParticipantes} participantes • Ordenado por pontos totais
        </p>
      </div>
    `;
  },

  /**
   * Cria tabela de ranking
   */
  criarTabelaRanking(ranking, rodadaFim, escudos) {
    let html = `
      <div style="overflow-x: auto; margin: 0 -10px;">
        <table class="luva-ranking-table" style="width: 100%; min-width: 700px; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
          <thead>
            <tr style="background: linear-gradient(135deg, #2E8B57, #228B22); color: white; height: 40px;">
              <th style="padding: 8px 6px; text-align: center; width: 50px; font-size: 11px; font-weight: 600;">Pos</th>
              <th style="padding: 8px 6px; text-align: center; width: 40px; font-size: 11px; font-weight: 600;">❤️</th>
              <th style="padding: 8px 8px; text-align: left; min-width: 120px; font-size: 11px; font-weight: 600;">Cartoleiro</th>
              <th style="padding: 8px 6px; text-align: center; width: 70px; font-size: 11px; font-weight: 600;">Total</th>
              <th style="padding: 8px 8px; text-align: left; min-width: 130px; font-size: 11px; font-weight: 600;">Goleiro da última rodada</th>
              <th style="padding: 8px 6px; text-align: center; width: 90px; font-size: 11px; font-weight: 600;">Pontos R${rodadaFim}</th>
              <th style="padding: 8px 6px; text-align: center; width: 70px; font-size: 11px; font-weight: 600;">Ações</th>
            </tr>
          </thead>
          <tbody>
    `;

    ranking.forEach((item, index) => {
      html += this.criarLinhaRanking(item, index, escudos);
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    return html;
  },

  /**
   * Cria linha individual do ranking
   */
  criarLinhaRanking(item, index, escudos) {
    const posicao = index + 1;
    const posicaoTexto = `${posicao}º`;
    const posicaoIcon =
      posicao === 1 ? "🏆" : posicao === 2 ? "🥈" : posicao === 3 ? "🥉" : "";

    const rowBg =
      posicao === 1
        ? "background: linear-gradient(135deg, #e8f5e9, #f1f8e9);"
        : posicao % 2 === 0
          ? "background: #fafbfc;"
          : "background: white;";

    const escudoId = escudos[item.participanteId] || "default";

    return `
      <tr class="ranking-row" style="border-bottom: 1px solid #e9ecef; transition: all 0.2s ease; ${rowBg} height: 48px;" 
          onmouseover="this.style.background='#f8f9fa'; this.style.transform='scale(1.005)'" 
          onmouseout="this.style.background='${rowBg.split(":")[1].split(";")[0]}'; this.style.transform='scale(1)'">
        <td style="padding: 8px 6px; text-align: center; font-weight: 600; vertical-align: middle; font-size: 12px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 3px;">
            <span>${posicaoTexto}</span>
            ${posicaoIcon ? `<span style="font-size: 14px;">${posicaoIcon}</span>` : ""}
          </div>
        </td>
        <td style="padding: 8px 6px; text-align: center; vertical-align: middle;">
          <img src="/escudos/${escudoId}.png" alt="Escudo" 
               style="width: 22px; height: 22px; border-radius: 50%; border: 1px solid #ddd; box-shadow: 0 1px 3px rgba(0,0,0,0.1); background: #fff;"
               onerror="this.src='/escudos/default.png';">
        </td>
        <td style="padding: 8px 8px; vertical-align: middle;">
          <div style="font-weight: 600; color: #2c3e50; font-size: 12px; line-height: 1.3; margin-bottom: 1px;">${item.participanteNome}</div>
          <div style="font-size: 10px; color: #6c757d; line-height: 1.2;">ID: ${item.participanteId}</div>
        </td>
        <td style="padding: 8px 6px; text-align: center; vertical-align: middle;">
          <span style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; box-shadow: 0 1px 3px rgba(39, 174, 96, 0.3);">
            ${Math.floor(item.pontosTotais * 100) / 100}
          </span>
        </td>
        <td style="padding: 8px 8px; vertical-align: middle;">
          <div style="font-weight: 600; color: #2c3e50; font-size: 11px; line-height: 1.3; margin-bottom: 1px;">${item.ultimaRodada?.goleiroNome || "Sem goleiro"}</div>
          ${item.ultimaRodada?.goleiroClube ? `<div style="font-size: 9px; color: #6c757d; line-height: 1.2;">${item.ultimaRodada.goleiroClube}</div>` : ""}
        </td>
        <td style="padding: 8px 6px; text-align: center; vertical-align: middle;">
          <div style="font-weight: 600; color: ${(item.ultimaRodada?.pontos || 0) >= 0 ? "#27ae60" : "#e74c3c"}; font-size: 11px; line-height: 1.3;">${Math.floor((item.ultimaRodada?.pontos || 0) * 100) / 100}</div>
          <div style="font-size: 9px; color: #6c757d; line-height: 1.2;">R${item.ultimaRodada?.rodada || "-"}</div>
        </td>
        <td style="padding: 8px 6px; text-align: center; vertical-align: middle;">
          <button class="btn-detalhes" 
                  data-participante-id="${item.participanteId}" 
                  data-participante-nome="${item.participanteNome}"
                  style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 500; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(52, 152, 219, 0.3);"
                  onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 6px rgba(52, 152, 219, 0.4)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(52, 152, 219, 0.3)'">
            Detalhes
          </button>
        </td>
      </tr>
    `;
  },

  /**
   * Cria cards de estatísticas
   */
  criarEstatisticas(ranking, totalParticipantes) {
    return `
      <div class="luva-estatisticas" style="margin-top: 25px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        <div style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);">
          <div style="font-size: 28px; font-weight: 700; margin-bottom: 5px;">${Math.floor((ranking[0]?.pontosTotais || 0) * 100) / 100}</div>
          <div style="opacity: 0.95; font-size: 14px; font-weight: 600;">🏆 Melhor Pontuação</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">${ranking[0]?.participanteNome || "-"}</div>
        </div>
        <div style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);">
          <div style="font-size: 28px; font-weight: 700; margin-bottom: 5px;">${totalParticipantes}</div>
          <div style="opacity: 0.95; font-size: 14px; font-weight: 600;">👥 Participantes</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">Liga ativa</div>
        </div>
        <div style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);">
          <div style="font-size: 28px; font-weight: 700; margin-bottom: 5px;">${Math.floor(Math.max(...ranking.map((r) => r.ultimaRodada?.pontos || 0)) * 100) / 100}</div>
          <div style="opacity: 0.95; font-size: 14px; font-weight: 600;">🎯 Melhor Rodada</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">Individual</div>
        </div>
      </div>
    `;
  },

  /**
   * Cria botão de exportação
   */
  criarBotaoExport() {
    return `
      <button id="exportLuvaImagem" class="btn-export" 
              style="background: linear-gradient(135deg, #2E8B57 0%, #32CD32 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font: 500 14px Inter, sans-serif; display: inline-flex; align-items: center; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(46, 139, 87, 0.3);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
        </svg>
        📊 Exportar Ranking
      </button>
    `;
  },

  /**
   * Estados de loading e erro
   */
  mostrarLoading(mensagem) {
    return `
      <div style="text-align: center; padding: 40px 20px; color: #666;">
        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px;"></div>
        <p style="margin: 0; font-size: 16px;">${mensagem}</p>
      </div>
    `;
  },

  mostrarErro(erro, detalhes = null) {
    return `
      <div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0;">❌ Erro ao carregar Luva de Ouro</h4>
        <p style="margin: 0 0 10px 0;"><strong>Erro:</strong> ${erro}</p>
        ${detalhes ? `<p style="margin: 0; font-size: 14px; opacity: 0.8;">${detalhes}</p>` : ""}
        <button onclick="window.location.reload()" style="margin-top: 15px; background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
          🔄 Recarregar Página
        </button>
      </div>
    `;
  },

  /**
   * Adiciona estilos CSS ao documento
   */
  adicionarEstilos() {
    if (document.getElementById("luva-ouro-styles")) return;

    const styleElement = document.createElement("style");
    styleElement.id = "luva-ouro-styles";
    styleElement.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .luva-ranking-table {
        font-size: 11px !important;
      }

      .luva-ranking-table th {
        white-space: nowrap;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .luva-ranking-table td {
        white-space: nowrap;
      }

      .luva-ranking-table td:nth-child(3),
      .luva-ranking-table td:nth-child(5) {
        white-space: normal;
        word-wrap: break-word;
      }

      @media (max-width: 768px) {
        .luva-ranking-table {
          font-size: 10px !important;
        }

        .luva-ranking-table th,
        .luva-ranking-table td {
          padding: 6px 3px !important;
        }

        .luva-ranking-table th {
          font-size: 9px !important;
        }
      }

      @media (max-width: 600px) {
        .luva-ranking-table th:nth-child(6),
        .luva-ranking-table td:nth-child(6) {
          display: none;
        }
      }

      @media (max-width: 480px) {
        .luva-ranking-table th:nth-child(5),
        .luva-ranking-table td:nth-child(5) {
          display: none;
        }

        .luva-ranking-table th,
        .luva-ranking-table td {
          padding: 4px 2px !important;
        }
      }
    `;
    document.head.appendChild(styleElement);
  },
};

// Exportar módulo
window.LuvaDeOuroUI = LuvaDeOuroUI;

console.log("✅ [LUVA-UI] Módulo UI carregado com layout completo");
