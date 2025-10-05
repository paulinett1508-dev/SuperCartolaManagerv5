// public/js/luva-de-ouro/luva-de-ouro-utils.js
console.log("🔧 [LUVA-UTILS] Módulo de utilitários carregando...");

/**
 * Módulo Utils - Utilitários e funções auxiliares
 */
const LuvaDeOuroUtils = {
  /**
   * Mostra notificação temporária
   */
  mostrarNotificacao(mensagem, tipo = "info") {
    const config = window.LuvaDeOuroConfig;
    const cor =
      config.NOTIFICATION.COLORS[tipo] || config.NOTIFICATION.COLORS.info;

    const notificacao = document.createElement("div");
    notificacao.style.cssText = `
      position: fixed;
      top: ${config.NOTIFICATION.POSITION.top};
      right: ${config.NOTIFICATION.POSITION.right};
      background: ${cor.bg};
      border: 1px solid ${cor.border};
      color: ${cor.text};
      padding: 16px 24px;
      border-radius: 8px;
      font: 500 14px Inter, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    notificacao.textContent = mensagem;
    document.body.appendChild(notificacao);

    requestAnimationFrame(() => {
      notificacao.style.transform = "translateX(0)";
    });

    setTimeout(() => {
      notificacao.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notificacao.parentNode) {
          document.body.removeChild(notificacao);
        }
      }, 300);
    }, config.NOTIFICATION.DURATION);
  },

  /**
   * Cria modal de detalhes do participante
   */
  criarModalDetalhes(dados) {
    const modalExistente = document.getElementById("modalDetalhesParticipante");
    if (modalExistente) {
      modalExistente.remove();
    }

    const modal = document.createElement("div");
    modal.id = "modalDetalhesParticipante";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    modal.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 700px; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
          <div>
            <h3 style="margin: 0; color: #2c3e50;">${dados.participanteNome}</h3>
            <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 14px;">Rodadas ${dados.rodadaInicio} a ${dados.rodadaFim}</p>
          </div>
          <button onclick="window.LuvaDeOuroUtils.fecharModalDetalhes()" style="background: #e74c3c; color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 16px;">×</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <div style="background: #27ae60; color: white; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold;">${Math.floor(dados.totalPontos * 100) / 100}</div>
            <div style="font-size: 12px; opacity: 0.9;">Total de Pontos</div>
          </div>
          <div style="background: #3498db; color: white; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold;">${dados.totalRodadas}</div>
            <div style="font-size: 12px; opacity: 0.9;">Rodadas Jogadas</div>
          </div>
          <div style="background: #f39c12; color: white; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold;">${Math.floor(dados.estatisticas.melhorRodada * 100) / 100}</div>
            <div style="font-size: 12px; opacity: 0.9;">Melhor Rodada</div>
          </div>
          <div style="background: #e74c3c; color: white; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold;">${Math.floor(dados.estatisticas.mediaPontos * 100) / 100}</div>
            <div style="font-size: 12px; opacity: 0.9;">Média por Rodada</div>
          </div>
        </div>

        <h4 style="margin: 0 0 15px 0; color: #2c3e50;">📊 Histórico por Rodada</h4>
        <div style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead style="background: #f8f9fa; position: sticky; top: 0;">
              <tr>
                <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">R</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Goleiro</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Clube</th>
                <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">Pontos</th>
              </tr>
            </thead>
            <tbody>
              ${dados.rodadas
                .map(
                  (rodada) => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 8px; text-align: center; font-weight: bold;">${rodada.rodada}</td>
                  <td style="padding: 8px; text-align: left;">${rodada.goleiroNome || "Sem goleiro"}</td>
                  <td style="padding: 8px; text-align: left; font-size: 12px; color: #666;">${rodada.goleiroClube || "-"}</td>
                  <td style="padding: 8px; text-align: center; font-weight: bold; color: ${rodada.pontos >= 0 ? "#27ae60" : "#e74c3c"};">
                    ${Math.floor(rodada.pontos * 100) / 100}
                  </td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.onclick = (e) => {
      if (e.target === modal) {
        this.fecharModalDetalhes();
      }
    };
  },

  /**
   * Fecha modal de detalhes
   */
  fecharModalDetalhes() {
    const modal = document.getElementById("modalDetalhesParticipante");
    if (modal) {
      modal.remove();
    }
  },

  /**
   * Exporta dados como CSV
   */
  exportarCSV(dados) {
    if (!dados || !dados.ranking) {
      alert("Nenhum dado para exportar");
      return;
    }

    const { ranking, rodadaInicio, rodadaFim } = dados;

    let csv =
      "Posicao,Cartoleiro,ID_Participante,Pontos_Totais,Rodadas_Jogadas,Melhor_Rodada,Pior_Rodada,Ultimo_Goleiro,Ultimo_Clube,Ultimo_Pontos,Ultima_Rodada\n";

    ranking.forEach((item) => {
      csv +=
        [
          item.posicao,
          `"${item.participanteNome}"`,
          item.participanteId,
          item.pontosTotais,
          item.rodadasJogadas || item.totalJogos || 0,
          item.melhorRodada || 0,
          item.piorRodada || 0,
          `"${item.ultimaRodada?.goleiroNome || "Sem goleiro"}"`,
          `"${item.ultimaRodada?.goleiroClube || "N/A"}"`,
          item.ultimaRodada?.pontos || 0,
          item.ultimaRodada?.rodada || 0,
        ].join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `luva_de_ouro_r${rodadaInicio}_a_r${rodadaFim}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("📊 CSV exportado com sucesso");
  },

  /**
   * Cria layout para exportação de imagem
   */
  criarLayoutExportacao(dados) {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `
      <div style="background: linear-gradient(135deg, #2E8B57 0%, #228B22 100%); color: white; padding: 24px; text-align: center; position: relative;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
          <img src="/img/logo-cartoleirossobral.png" style="height: 42px; width: auto; filter: brightness(1.1);" alt="Cartoleiros Sobral" onerror="this.outerHTML='<div style=\\'width:42px;height:42px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font:bold 14px Inter;\\'>CS</div>'">
          <div>
            <h1 style="font: 700 28px Inter, sans-serif; margin: 0 0 3px 0;">Cartoleiros Sobral 2025</h1>
            <h2 style="font: 600 18px Inter, sans-serif; margin: 0 0 6px 0;">🥅 Ranking Luva de Ouro</h2>
            <div style="background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 16px; display: inline-block;">
              <span style="font: 600 13px Inter, sans-serif;">RODADAS ${dados.rodadaInicio} A ${dados.rodadaFim}</span>
            </div>
          </div>
        </div>
      </div>

      <div style="padding: 24px;">
        <div style="background: white; border-radius: 10px; padding: 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e0e0e0;">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background: #2E8B57; color: white;">
                <th style="width: 50px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif;">POS</th>
                <th style="width: 50px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif;">❤️</th>
                <th style="text-align: left; padding: 10px 6px; font: 600 11px Inter, sans-serif;">CARTOLEIRO</th>
                <th style="width: 80px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif;">TOTAL</th>
                <th style="width: 70px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif;">JOGOS</th>
                <th style="text-align: left; padding: 10px 6px; font: 600 11px Inter, sans-serif;">ÚLTIMO GOLEIRO</th>
              </tr>
            </thead>
            <tbody>
              ${dados.ranking
                .map((item, index) => {
                  const posContent =
                    index === 0
                      ? "🏆"
                      : index === 1
                        ? "🥈"
                        : index === 2
                          ? "🥉"
                          : `${item.posicao}º`;
                  const rowBg =
                    index === 0
                      ? "background: #e7f3ff;"
                      : index % 2 === 0
                        ? "background: #f8f9fa;"
                        : "";
                  return `
                  <tr style="border-bottom: 1px solid #e0e0e0; ${rowBg}">
                    <td style="text-align:center; padding: 8px 6px; font-weight: bold;">${posContent}</td>
                    <td style="text-align:center; padding: 8px 6px;">
                      <img src="/escudos/${item.clubeId || "default"}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>
                    </td>
                    <td style="text-align:left; padding: 8px 6px;">
                      <div style="font-weight:600; font-size: 12px;">${item.participanteNome}</div>
                      <div style="color:#666; font-size:10px;">ID: ${item.participanteId}</div>
                    </td>
                    <td style="text-align:center; padding: 8px 6px; font: 600 14px Inter, sans-serif; color: #2E8B57;">
                      ${item.pontosTotais}
                    </td>
                    <td style="text-align:center; padding: 8px 6px; color: #666; font-size: 11px;">
                      ${item.rodadasJogadas || item.totalJogos || 0}
                    </td>
                    <td style="text-align:left; padding: 8px 6px;">
                      <div style="font-size: 11px;">
                        <span style="font-weight: 500;">${item.ultimaRodada?.goleiroNome || "Sem goleiro"}</span>
                        ${item.ultimaRodada?.pontos ? `<span style="color: #27ae60; margin-left: 8px;">${item.ultimaRodada.pontos}pts</span>` : ""}
                      </div>
                    </td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 14px; border-radius: 8px; text-align: center;">
            <h4 style="font: 600 10px Inter, sans-serif; margin: 0 0 4px 0;">🏆 LÍDER</h4>
            <p style="font: 700 16px Inter, sans-serif; margin: 0;">${dados.ranking[0]?.pontosTotais || 0} pts</p>
            <p style="font: 400 9px Inter, sans-serif; margin: 2px 0 0 0;">${dados.ranking[0]?.participanteNome || "N/D"}</p>
          </div>
          <div style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 14px; border-radius: 8px; text-align: center;">
            <h4 style="font: 600 10px Inter, sans-serif; margin: 0 0 4px 0;">🎯 PARTICIPANTES</h4>
            <p style="font: 700 16px Inter, sans-serif; margin: 0;">${dados.ranking.length}</p>
            <p style="font: 400 9px Inter, sans-serif; margin: 2px 0 0 0;">Cartoleiros ativos</p>
          </div>
          <div style="background: linear-gradient(135deg, #e67e22, #d35400); color: white; padding: 14px; border-radius: 8px; text-align: center;">
            <h4 style="font: 600 10px Inter, sans-serif; margin: 0 0 4px 0;">🥅 MELHOR RODADA</h4>
            <p style="font: 700 16px Inter, sans-serif; margin: 0;">${Math.max(...dados.ranking.map((r) => r.ultimaRodada?.pontos || 0))} pts</p>
            <p style="font: 400 9px Inter, sans-serif; margin: 2px 0 0 0;">Individual</p>
          </div>
        </div>
      </div>

      <div style="background: white; border-top: 1px solid #e0e0e0; padding: 12px 24px; text-align: center;">
        <p style="font: 11px Inter, sans-serif; margin: 0; color: #666;">
          Gerado em ${dataFormatada} • SuperCartola Manager v2.3.0<br>
          Sistema de Gerenciamento de Ligas do Cartola FC
        </p>
      </div>
    `;
  },
};

window.LuvaDeOuroUtils = LuvaDeOuroUtils;

console.log("✅ [LUVA-UTILS] Módulo de utilitários carregado");
