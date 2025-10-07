// public/js/luva-de-ouro/luva-de-ouro-utils.js - CORRIGIDO COMPLETO
console.log("🔧 [LUVA-UTILS] Módulo de utilitários carregando...");

/**
 * Módulo Utils - Utilitários e funções auxiliares
 */
const LuvaDeOuroUtils = {
  /**
   * Mostra notificação temporária
   */
  mostrarNotificacao: function (mensagem, tipo) {
    tipo = tipo || "info";
    const config = window.LuvaDeOuroConfig;
    const cor =
      config.NOTIFICATION.COLORS[tipo] || config.NOTIFICATION.COLORS.info;

    const notificacao = document.createElement("div");
    notificacao.style.cssText =
      "position: fixed;" +
      "top: " +
      config.NOTIFICATION.POSITION.top +
      ";" +
      "right: " +
      config.NOTIFICATION.POSITION.right +
      ";" +
      "background: " +
      cor.bg +
      ";" +
      "border: 1px solid " +
      cor.border +
      ";" +
      "color: " +
      cor.text +
      ";" +
      "padding: 16px 24px;" +
      "border-radius: 8px;" +
      "font: 500 14px Inter, sans-serif;" +
      "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);" +
      "z-index: 10000;" +
      "transform: translateX(100%);" +
      "transition: transform 0.3s ease;";

    notificacao.textContent = mensagem;
    document.body.appendChild(notificacao);

    requestAnimationFrame(function () {
      notificacao.style.transform = "translateX(0)";
    });

    setTimeout(function () {
      notificacao.style.transform = "translateX(100%)";
      setTimeout(function () {
        if (notificacao.parentNode) {
          document.body.removeChild(notificacao);
        }
      }, 300);
    }, config.NOTIFICATION.DURATION);
  },

  /**
   * Cria modal de detalhes do participante
   */
  criarModalDetalhes: function (dados) {
    const modalExistente = document.getElementById("modalDetalhesParticipante");
    if (modalExistente) {
      modalExistente.remove();
    }

    const modal = document.createElement("div");
    modal.id = "modalDetalhesParticipante";
    modal.style.cssText =
      "position: fixed;" +
      "top: 0;" +
      "left: 0;" +
      "width: 100%;" +
      "height: 100%;" +
      "background: rgba(0, 0, 0, 0.5);" +
      "z-index: 1000;" +
      "display: flex;" +
      "align-items: center;" +
      "justify-content: center;";

    const rodadasHTML = dados.rodadas
      .map(function (rodada) {
        const corPontos = rodada.pontos >= 0 ? "#27ae60" : "#e74c3c";
        return (
          '<tr style="border-bottom: 1px solid #f0f0f0;">' +
          '<td style="padding: 8px; text-align: center; font-weight: bold;">' +
          rodada.rodada +
          "</td>" +
          '<td style="padding: 8px; text-align: left;">' +
          (rodada.goleiroNome || "Sem goleiro") +
          "</td>" +
          '<td style="padding: 8px; text-align: left; font-size: 12px; color: #666;">' +
          (rodada.goleiroClube || "-") +
          "</td>" +
          '<td style="padding: 8px; text-align: center; font-weight: bold; color: ' +
          corPontos +
          ';">' +
          Math.floor(rodada.pontos * 100) / 100 +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    modal.innerHTML =
      '<div style="background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 700px; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">' +
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">' +
      "<div>" +
      '<h3 style="margin: 0; color: #2c3e50;">' +
      dados.participanteNome +
      "</h3>" +
      '<p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 14px;">Rodadas ' +
      dados.rodadaInicio +
      " a " +
      dados.rodadaFim +
      "</p>" +
      "</div>" +
      '<button onclick="window.LuvaDeOuroUtils.fecharModalDetalhes()" style="background: #e74c3c; color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 16px;">×</button>' +
      "</div>" +
      '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">' +
      '<div style="background: #27ae60; color: white; padding: 12px; border-radius: 8px; text-align: center;">' +
      '<div style="font-size: 20px; font-weight: bold;">' +
      Math.floor(dados.totalPontos * 100) / 100 +
      "</div>" +
      '<div style="font-size: 12px; opacity: 0.9;">Total de Pontos</div>' +
      "</div>" +
      '<div style="background: #3498db; color: white; padding: 12px; border-radius: 8px; text-align: center;">' +
      '<div style="font-size: 20px; font-weight: bold;">' +
      dados.totalRodadas +
      "</div>" +
      '<div style="font-size: 12px; opacity: 0.9;">Rodadas Jogadas</div>' +
      "</div>" +
      '<div style="background: #f39c12; color: white; padding: 12px; border-radius: 8px; text-align: center;">' +
      '<div style="font-size: 20px; font-weight: bold;">' +
      Math.floor(dados.estatisticas.melhorRodada * 100) / 100 +
      "</div>" +
      '<div style="font-size: 12px; opacity: 0.9;">Melhor Rodada</div>' +
      "</div>" +
      '<div style="background: #e74c3c; color: white; padding: 12px; border-radius: 8px; text-align: center;">' +
      '<div style="font-size: 20px; font-weight: bold;">' +
      Math.floor(dados.estatisticas.mediaPontos * 100) / 100 +
      "</div>" +
      '<div style="font-size: 12px; opacity: 0.9;">Média por Rodada</div>' +
      "</div>" +
      "</div>" +
      '<div style="text-align: center; margin-bottom: 15px;">' +
      '<button onclick="window.LuvaDeOuroUtils.exportarHistoricoIndividual(' +
      JSON.stringify(dados).replace(/"/g, "&quot;") +
      ')" ' +
      'style="background: linear-gradient(135deg, #2E8B57 0%, #228B22 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font: 600 13px Inter, sans-serif; display: inline-flex; align-items: center; gap: 8px; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(46, 139, 87, 0.3);" ' +
      "onmouseover=\"this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(46, 139, 87, 0.4)'\" " +
      "onmouseout=\"this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(46, 139, 87, 0.3)'\">" +
      '<span style="font-size: 16px;">📱</span> Exportar Histórico Mobile HD' +
      "</button>" +
      "</div>" +
      '<h4 style="margin: 0 0 15px 0; color: #2c3e50;">📊 Histórico por Rodada</h4>' +
      '<div style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px;">' +
      '<table style="width: 100%; border-collapse: collapse; font-size: 13px;">' +
      '<thead style="background: #f8f9fa; position: sticky; top: 0;">' +
      "<tr>" +
      '<th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">R</th>' +
      '<th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Goleiro</th>' +
      '<th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Clube</th>' +
      '<th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">Pontos</th>' +
      "</tr>" +
      "</thead>" +
      "<tbody>" +
      rodadasHTML +
      "</tbody>" +
      "</table>" +
      "</div>" +
      "</div>";

    document.body.appendChild(modal);

    modal.onclick = function (e) {
      if (e.target === modal) {
        window.LuvaDeOuroUtils.fecharModalDetalhes();
      }
    };
  },

  /**
   * Fecha modal de detalhes
   */
  fecharModalDetalhes: function () {
    const modal = document.getElementById("modalDetalhesParticipante");
    if (modal) {
      modal.remove();
    }
  },

  /**
   * EXPORTAÇÃO 1: RANKING GERAL (Mobile Dark HD)
   */
  exportarRankingGeral: function (dados) {
    const self = this;

    if (!dados || !dados.ranking || dados.ranking.length === 0) {
      self.mostrarNotificacao("Nenhum dado para exportar", "error");
      return;
    }

    console.log("[LUVA-UTILS] 📱 Iniciando exportação geral Mobile Dark HD...");
    console.log(
      "[LUVA-UTILS] 🔍 Buscando escudos corretos dos participantes...",
    );

    // ✅ PRIMEIRO buscar escudos, DEPOIS exportar
    self
      .buscarEscudosParticipantes()
      .then(function (escudosParticipantes) {
        console.log("[LUVA-UTILS] 📦 Escudos recebidos:", escudosParticipantes);

        if (escudosParticipantes) {
          dados.ranking = dados.ranking.map(function (item) {
            const escudoCorreto = escudosParticipantes[item.participanteId];
            console.log(
              "[LUVA-UTILS] 🎨 Participante",
              item.participanteNome,
              "- ID:",
              item.participanteId,
              "- Escudo:",
              escudoCorreto,
            );
            return Object.assign({}, item, {
              clubeId: escudoCorreto || item.clubeId || "default",
            });
          });
        }

        return import("/js/exports/export-base.js");
      })
      .then(function (module) {
        const MobileDarkUtils = module.MobileDarkUtils;

        const container = MobileDarkUtils.criarContainer(
          "Luva de Ouro",
          "Rodadas " + dados.rodadaInicio + "-" + dados.rodadaFim,
        );

        const contentDiv = container.querySelector("#mobile-export-content");
        contentDiv.innerHTML = self.criarLayoutRankingGeral(dados);

        document.body.appendChild(container);

        return new Promise(function (resolve) {
          requestAnimationFrame(function () {
            requestAnimationFrame(resolve);
          });
        }).then(function () {
          const filename = MobileDarkUtils.gerarNomeArquivoMobile(
            "luva-ouro-ranking",
            {
              rodada: dados.rodadaFim,
              extra: "r" + dados.rodadaInicio + "-" + dados.rodadaFim,
            },
          );

          return MobileDarkUtils.gerarCanvas(container, filename);
        });
      })
      .then(function () {
        self.mostrarNotificacao("Imagem exportada com sucesso!", "success");
        console.log("[LUVA-UTILS] ✅ Exportação geral concluída");
      })
      .catch(function (error) {
        console.error("[LUVA-UTILS] ❌ Erro na exportação geral:", error);
        self.mostrarNotificacao(
          "Erro ao exportar. Gerando CSV alternativo...",
          "warning",
        );
        self.exportarCSV(dados);
      });
  },

  /**
   * EXPORTAÇÃO 2: HISTÓRICO INDIVIDUAL (Mobile Dark HD)
   */
  exportarHistoricoIndividual: function (dados) {
    const self = this;

    if (!dados || !dados.rodadas || dados.rodadas.length === 0) {
      self.mostrarNotificacao("Nenhum histórico para exportar", "error");
      return;
    }

    console.log(
      "[LUVA-UTILS] 📱 Iniciando exportação individual Mobile Dark HD...",
    );

    const container = document.createElement("div");
    container.id = "mobile-export-container";
    container.style.cssText =
      "position: absolute;" +
      "top: -99999px;" +
      "left: -99999px;" +
      "width: 400px;" +
      "background: #1a1a1a;" +
      "font-family: Inter, -apple-system, sans-serif;" +
      "padding: 16px;" +
      "box-sizing: border-box;";

    container.innerHTML = self.criarLayoutHistoricoIndividualVertical(dados);
    document.body.appendChild(container);

    new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(resolve);
      });
    })
      .then(function () {
        if (!window.html2canvas) {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          return new Promise(function (resolve, reject) {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
      })
      .then(function () {
        return window.html2canvas(container, {
          scale: 3,
          backgroundColor: "#1a1a1a",
          logging: false,
          width: 400,
          height: container.scrollHeight,
        });
      })
      .then(function (canvas) {
        const nomeArquivo =
          dados.participanteNome.toLowerCase().replace(/\s+/g, "-") +
          "-historico-r" +
          dados.rodadaInicio +
          "-" +
          dados.rodadaFim +
          ".png";
        const link = document.createElement("a");
        link.download = nomeArquivo;
        link.href = canvas.toDataURL("image/png", 1.0);
        link.click();

        document.body.removeChild(container);

        console.log("[LUVA-UTILS] ✅ Exportação individual concluída");
        self.mostrarNotificacao("Histórico exportado com sucesso!", "success");
      })
      .catch(function (error) {
        console.error("[LUVA-UTILS] ❌ Erro na exportação individual:", error);
        self.mostrarNotificacao("Erro ao exportar histórico", "error");
      });
  },

  /**
   * Busca escudos corretos dos participantes (time do coração)
   * ✅ Mesma lógica do módulo de Participantes
   */
  buscarEscudosParticipantes: function () {
    console.log("[LUVA-UTILS] 🔍 Iniciando busca de escudos...");

    const urlParams = new URLSearchParams(window.location.search);
    const ligaId = urlParams.get("id");

    if (!ligaId) {
      console.warn("[LUVA-UTILS] ⚠️ Liga ID não encontrado na URL");
      return Promise.resolve(null);
    }

    return fetch("/api/ligas/" + ligaId)
      .then(function (resp) {
        if (!resp.ok) return null;
        return resp.json();
      })
      .then(function (liga) {
        if (!liga || !liga.times || liga.times.length === 0) return null;

        console.log("[LUVA-UTILS] 📋 Times na liga:", liga.times.length);

        return Promise.all(
          liga.times.map(function (timeId) {
            return fetch("/api/time/" + timeId)
              .then(function (r) {
                if (!r.ok) return null;
                return r.json();
              })
              .then(function (timeData) {
                if (!timeData || !timeData.id) return null;

                // ✅ Busca clube_id em múltiplos formatos possíveis
                const clubeId = timeData.clube_id || timeData.clubeId || timeData.time_coracao_id;

                console.log("[LUVA-UTILS] ✅ Time:", timeData.id, "→ Escudo:", clubeId);

                return { id: timeData.id, clube_id: clubeId };
              })
              .catch(function () {
                return null;
              });
          }),
        );
      })
      .then(function (timesData) {
        if (!timesData) return null;

        const mapa = {};
        timesData.forEach(function (timeData) {
          if (timeData && timeData.id && timeData.clube_id) {
            mapa[timeData.id] = timeData.clube_id;
          }
        });

        console.log("[LUVA-UTILS] ✅ Mapa de escudos:", mapa);
        console.log("[LUVA-UTILS] 📊 Total:", Object.keys(mapa).length);

        return mapa;
      })
      .catch(function (error) {
        console.error("[LUVA-UTILS] ❌ Erro:", error);
        return null;
      });
  },

  /**
   * Layout para Ranking Geral (Mobile Dark HD)
   */
  criarLayoutRankingGeral: function (dados) {
    const topN = dados.ranking.slice(0, 15);
    const lider = topN[0] || {};
    const pontosLider = lider.pontosTotais
      ? Math.floor(lider.pontosTotais * 100) / 100
      : 0;
    const nomeLider = lider.participanteNome || "-";

    const pontosMelhorRodada = Math.max.apply(
      Math,
      topN.map(function (r) {
        return r.ultimaRodada && r.ultimaRodada.pontos
          ? r.ultimaRodada.pontos
          : 0;
      }),
    );

    const linhasTabela = topN
      .map(function (item, index) {
        const posMap = { 0: "🏆", 1: "🥈", 2: "🥉" };
        const posIcon = posMap[index] || index + 1 + "º";
        const bgColor = index % 2 === 0 ? "#1e1e1e" : "#252525";
        const borderColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
        const borderLeft =
          index < 3
            ? "border-left: 3px solid " + borderColors[index] + ";"
            : "";

        const goleiroNome =
          item.ultimaRodada && item.ultimaRodada.goleiroNome
            ? item.ultimaRodada.goleiroNome
            : "Sem goleiro";
        const goleiroPontos =
          item.ultimaRodada && item.ultimaRodada.pontos
            ? Math.floor(item.ultimaRodada.pontos * 100) / 100 + "pts"
            : "";

        return (
          '<tr style="background: ' +
          bgColor +
          "; " +
          borderLeft +
          '">' +
          '<td style="padding: 8px 4px; text-align: center; font: 700 11px Inter; color: #E0E0E0;">' +
          posIcon +
          "</td>" +
          '<td style="padding: 6px; text-align: center;">' +
          '<img src="/escudos/' +
          item.clubeId +
          '.png" ' +
          'style="width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 1px solid #444;" ' +
          "onerror=\"this.src='/escudos/default.png'\">" +
          "</td>" +
          '<td style="padding: 8px 4px;">' +
          '<div style="font: 600 10px Inter; color: #FFFFFF;">' +
          item.participanteNome +
          "</div>" +
          '<div style="font: 400 8px Inter; color: #B0B0B0; margin-top: 2px;">' +
          goleiroNome +
          (goleiroPontos ? " • " + goleiroPontos : "") +
          "</div>" +
          "</td>" +
          '<td style="padding: 8px 4px; text-align: center; font: 700 12px Inter; color: #4CAF50;">' +
          Math.floor(item.pontosTotais * 100) / 100 +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    return (
      '<div style="padding: 8px;">' +
      '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px;">' +
      '<div style="background: linear-gradient(135deg, #FFD700, #FFA500); padding: 12px; border-radius: 8px; text-align: center;">' +
      '<div style="font: 700 20px Inter; color: #1a1a1a;">' +
      pontosLider +
      "</div>" +
      '<div style="font: 500 9px Inter; color: #1a1a1a; margin-top: 2px;">🏆 LÍDER</div>' +
      '<div style="font: 400 8px Inter; color: #1a1a1a; margin-top: 2px; opacity: 0.8;">' +
      nomeLider +
      "</div>" +
      "</div>" +
      '<div style="background: linear-gradient(135deg, #3498db, #2980b9); padding: 12px; border-radius: 8px; text-align: center; color: white;">' +
      '<div style="font: 700 20px Inter;">' +
      dados.totalParticipantes +
      "</div>" +
      '<div style="font: 500 9px Inter; margin-top: 2px;">👥 PARTICIPANTES</div>' +
      '<div style="font: 400 8px Inter; margin-top: 2px; opacity: 0.8;">Liga ativa</div>' +
      "</div>" +
      '<div style="background: linear-gradient(135deg, #27ae60, #2ecc71); padding: 12px; border-radius: 8px; text-align: center; color: white;">' +
      '<div style="font: 700 20px Inter;">' +
      pontosMelhorRodada +
      "</div>" +
      '<div style="font: 500 9px Inter; margin-top: 2px;">🎯 MELHOR RODADA</div>' +
      '<div style="font: 400 8px Inter; margin-top: 2px; opacity: 0.8;">Individual</div>' +
      "</div>" +
      "</div>" +
      '<div style="background: #2d2d2d; border-radius: 8px; overflow: hidden; border: 1px solid #404040;">' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<thead style="background: linear-gradient(135deg, #FF6B35, #E55A2B);">' +
      "<tr>" +
      '<th style="padding: 8px 4px; font: 600 9px Inter; color: white; text-align: center;">POS</th>' +
      '<th style="padding: 8px 4px; font: 600 9px Inter; color: white; text-align: center;">❤️</th>' +
      '<th style="padding: 8px 4px; font: 600 9px Inter; color: white; text-align: left;">CARTOLEIRO</th>' +
      '<th style="padding: 8px 4px; font: 600 9px Inter; color: white; text-align: center;">TOTAL</th>' +
      "</tr>" +
      "</thead>" +
      "<tbody>" +
      linhasTabela +
      "</tbody>" +
      "</table>" +
      "</div>" +
      "</div>"
    );
  },

  /**
   * Layout VERTICAL para Mobile (fonte maior)
   */
  criarLayoutHistoricoIndividualVertical: function (dados) {
    const rodadaMelhor = dados.rodadas.find(function (r) {
      return r.pontos === dados.estatisticas.melhorRodada;
    });
    const numeroRodadaMelhor = rodadaMelhor ? rodadaMelhor.rodada : "-";

    const linhasTabela = dados.rodadas
      .map(function (rodada, index) {
        const bgColor = index % 2 === 0 ? "#1e1e1e" : "#252525";
        const pontosCor = rodada.pontos >= 0 ? "#4CAF50" : "#F44336";
        const isMelhor = rodada.pontos === dados.estatisticas.melhorRodada;

        return (
          '<tr style="background: ' +
          bgColor +
          "; " +
          (isMelhor ? "border-left: 4px solid #FFD700;" : "") +
          '">' +
          '<td style="padding: 10px 6px; text-align: center; font: 700 13px Inter; color: #E0E0E0;">' +
          (isMelhor ? "⭐ " : "") +
          "R" +
          rodada.rodada +
          "</td>" +
          '<td style="padding: 10px 6px;">' +
          '<div style="font: 600 11px Inter; color: #FFFFFF;">' +
          (rodada.goleiroNome || "Sem goleiro") +
          "</div>" +
          '<div style="font: 500 9px Inter; color: #B0B0B0; margin-top: 2px;">' +
          (rodada.goleiroClube || "-") +
          "</div>" +
          "</td>" +
          '<td style="padding: 10px 6px; text-align: center; font: 700 14px Inter; color: ' +
          pontosCor +
          ';">' +
          Math.floor(rodada.pontos * 100) / 100 +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    return (
      '<div style="background: linear-gradient(135deg, #FF6B35, #E55A2B); padding: 16px; border-radius: 8px; margin-bottom: 12px; text-align: center;">' +
      '<div style="font: 700 18px Inter; color: white; margin-bottom: 4px;">' +
      dados.participanteNome +
      "</div>" +
      '<div style="font: 500 11px Inter; color: rgba(255,255,255,0.9);">📊 Histórico Completo • R' +
      dados.rodadaInicio +
      "-" +
      dados.rodadaFim +
      "</div>" +
      "</div>" +
      '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;">' +
      '<div style="background: linear-gradient(135deg, #27ae60, #2ecc71); padding: 12px; border-radius: 6px; text-align: center; color: white;">' +
      '<div style="font: 700 18px Inter;">' +
      Math.floor(dados.totalPontos * 100) / 100 +
      "</div>" +
      '<div style="font: 600 9px Inter; margin-top: 2px; opacity: 0.9;">TOTAL</div>' +
      "</div>" +
      '<div style="background: linear-gradient(135deg, #3498db, #2980b9); padding: 12px; border-radius: 6px; text-align: center; color: white;">' +
      '<div style="font: 700 18px Inter;">' +
      dados.totalRodadas +
      "</div>" +
      '<div style="font: 600 9px Inter; margin-top: 2px; opacity: 0.9;">JOGOS</div>' +
      "</div>" +
      '<div style="background: linear-gradient(135deg, #f39c12, #e67e22); padding: 12px; border-radius: 6px; text-align: center; color: white;">' +
      '<div style="font: 700 18px Inter;">' +
      Math.floor(dados.estatisticas.melhorRodada * 100) / 100 +
      "</div>" +
      '<div style="font: 600 9px Inter; margin-top: 2px; opacity: 0.9;">MELHOR</div>' +
      "</div>" +
      '<div style="background: linear-gradient(135deg, #e74c3c, #c0392b); padding: 12px; border-radius: 6px; text-align: center; color: white;">' +
      '<div style="font: 700 18px Inter;">' +
      Math.floor(dados.estatisticas.mediaPontos * 100) / 100 +
      "</div>" +
      '<div style="font: 600 9px Inter; margin-top: 2px; opacity: 0.9;">MÉDIA</div>' +
      "</div>" +
      "</div>" +
      '<div style="background: #2d2d2d; border-radius: 8px; overflow: hidden; border: 1px solid #404040;">' +
      '<div style="background: linear-gradient(135deg, #FF6B35, #E55A2B); padding: 10px; text-align: center;">' +
      '<div style="font: 700 12px Inter; color: white;">HISTÓRICO POR RODADA</div>' +
      "</div>" +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<thead style="background: #252525;">' +
      "<tr>" +
      '<th style="padding: 8px 6px; font: 700 10px Inter; color: #B0B0B0; text-align: center;">RODADA</th>' +
      '<th style="padding: 8px 6px; font: 700 10px Inter; color: #B0B0B0; text-align: left;">GOLEIRO / CLUBE</th>' +
      '<th style="padding: 8px 6px; font: 700 10px Inter; color: #B0B0B0; text-align: center;">PONTOS</th>' +
      "</tr>" +
      "</thead>" +
      "<tbody>" +
      linhasTabela +
      "</tbody>" +
      "</table>" +
      "</div>" +
      '<div style="margin-top: 12px; padding: 10px; background: rgba(255, 215, 0, 0.15); border-radius: 6px; border: 1px solid rgba(255, 215, 0, 0.4); text-align: center;">' +
      '<div style="font: 700 11px Inter; color: #FFD700;">⭐ MELHOR RODADA: R' +
      numeroRodadaMelhor +
      " com " +
      Math.floor(dados.estatisticas.melhorRodada * 100) / 100 +
      " pontos</div>" +
      "</div>"
    );
  },

  /**
   * Exporta dados como CSV (fallback)
   */
  exportarCSV: function (dados) {
    if (!dados || !dados.ranking) {
      alert("Nenhum dado para exportar");
      return;
    }

    const ranking = dados.ranking;
    const rodadaInicio = dados.rodadaInicio;
    const rodadaFim = dados.rodadaFim;

    let csv =
      "Posicao,Cartoleiro,ID_Participante,Pontos_Totais,Rodadas_Jogadas,Melhor_Rodada,Pior_Rodada,Ultimo_Goleiro,Ultimo_Clube,Ultimo_Pontos,Ultima_Rodada\n";

    ranking.forEach(function (item) {
      const ultimaRodada = item.ultimaRodada || {};
      const goleiroNome = ultimaRodada.goleiroNome || "Sem goleiro";
      const goleiroClube = ultimaRodada.goleiroClube || "N/A";
      const pontos = ultimaRodada.pontos || 0;
      const rodada = ultimaRodada.rodada || 0;

      csv +=
        [
          item.posicao,
          '"' + item.participanteNome + '"',
          item.participanteId,
          item.pontosTotais,
          item.rodadasJogadas || item.totalJogos || 0,
          item.melhorRodada || 0,
          item.piorRodada || 0,
          '"' + goleiroNome + '"',
          '"' + goleiroClube + '"',
          pontos,
          rodada,
        ].join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      "luva_de_ouro_r" +
        rodadaInicio +
        "_a_r" +
        rodadaFim +
        "_" +
        new Date().toISOString().split("T")[0] +
        ".csv",
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("📊 CSV exportado com sucesso");
  },

  /**
   * Layout para exportação de imagem LEGADO (mantido para compatibilidade)
   */
  criarLayoutExportacao: function (dados) {
    const self = this;

    return self
      .buscarEscudosParticipantes()
      .then(function (escudosParticipantes) {
        if (escudosParticipantes) {
          dados.ranking = dados.ranking.map(function (item) {
            return Object.assign({}, item, {
              clubeId:
                escudosParticipantes[item.participanteId] ||
                item.clubeId ||
                "default",
            });
          });
        }

        const agora = new Date();
        const dataFormatada = agora.toLocaleDateString("pt-BR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const linhasTabela = dados.ranking
          .map(function (item, index) {
            const posContent =
              index === 0
                ? "🏆"
                : index === 1
                  ? "🥈"
                  : index === 2
                    ? "🥉"
                    : item.posicao + "º";
            const rowBg =
              index === 0
                ? "background: #e7f3ff;"
                : index % 2 === 0
                  ? "background: #f8f9fa;"
                  : "";

            const goleiroNome =
              item.ultimaRodada && item.ultimaRodada.goleiroNome
                ? item.ultimaRodada.goleiroNome
                : "Sem goleiro";
            const goleiroPontos =
              item.ultimaRodada && item.ultimaRodada.pontos
                ? item.ultimaRodada.pontos + "pts"
                : "";

            return (
              '<tr style="border-bottom: 1px solid #e0e0e0; ' +
              rowBg +
              '">' +
              '<td style="text-align:center; padding: 8px 6px; font-weight: bold;">' +
              posContent +
              "</td>" +
              '<td style="text-align:center; padding: 8px 6px;">' +
              '<img src="/escudos/' +
              item.clubeId +
              '.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.src=\'/escudos/default.png\'"/>' +
              "</td>" +
              '<td style="text-align:left; padding: 8px 6px;">' +
              '<div style="font-weight:600; font-size: 12px;">' +
              item.participanteNome +
              "</div>" +
              '<div style="color:#666; font-size:10px;">ID: ' +
              item.participanteId +
              "</div>" +
              "</td>" +
              '<td style="text-align:center; padding: 8px 6px; font: 600 14px Inter, sans-serif; color: #2E8B57;">' +
              item.pontosTotais +
              "</td>" +
              '<td style="text-align:center; padding: 8px 6px; color: #666; font-size: 11px;">' +
              (item.rodadasJogadas || item.totalJogos || 0) +
              "</td>" +
              '<td style="text-align:left; padding: 8px 6px;">' +
              '<div style="font-size: 11px;">' +
              '<span style="font-weight: 500;">' +
              goleiroNome +
              "</span>" +
              (goleiroPontos
                ? '<span style="color: #27ae60; margin-left: 8px;">' +
                  goleiroPontos +
                  "</span>"
                : "") +
              "</div>" +
              "</td>" +
              "</tr>"
            );
          })
          .join("");

        const melhorRodadaPontos = Math.max.apply(
          Math,
          dados.ranking.map(function (r) {
            return r.ultimaRodada && r.ultimaRodada.pontos
              ? r.ultimaRodada.pontos
              : 0;
          }),
        );

        return (
          '<div style="background: linear-gradient(135deg, #2E8B57 0%, #228B22 100%); color: white; padding: 24px; text-align: center; position: relative;">' +
          '<div style="display: flex; align-items: center; justify-content: center; gap: 16px;">' +
          '<img src="/img/logo-cartoleirossobral.png" style="height: 42px; width: auto; filter: brightness(1.1);" alt="Cartoleiros Sobral" onerror="this.outerHTML=\'<div style=&quot;width:42px;height:42px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font:bold 14px Inter;&quot;>CS</div>\'">' +
          "<div>" +
          '<h1 style="font: 700 28px Inter, sans-serif; margin: 0 0 3px 0;">Cartoleiros Sobral 2025</h1>' +
          '<h2 style="font: 600 18px Inter, sans-serif; margin: 0 0 6px 0;">🥅 Ranking Luva de Ouro</h2>' +
          '<div style="background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 16px; display: inline-block;">' +
          '<span style="font: 600 13px Inter, sans-serif;">RODADAS ' +
          dados.rodadaInicio +
          " A " +
          dados.rodadaFim +
          "</span>" +
          "</div>" +
          "</div>" +
          "</div>" +
          "</div>" +
          '<div style="padding: 24px;">' +
          '<div style="background: white; border-radius: 10px; padding: 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e0e0e0;">' +
          '<table style="width:100%; border-collapse:collapse; font-size:13px;">' +
          "<thead>" +
          '<tr style="background: #2E8B57; color: white;">' +
          '<th style="width: 50px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif;">POS</th>' +
          '<th style="width: 50px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif;">❤️</th>' +
          '<th style="text-align: left; padding: 10px 6px; font: 600 11px Inter, sans-serif;">CARTOLEIRO</th>' +
          '<th style="width: 80px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif;">TOTAL</th>' +
          '<th style="width: 70px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif;">JOGOS</th>' +
          '<th style="text-align: left; padding: 10px 6px; font: 600 11px Inter, sans-serif;">ÚLTIMO GOLEIRO</th>' +
          "</tr>" +
          "</thead>" +
          "<tbody>" +
          linhasTabela +
          "</tbody>" +
          "</table>" +
          "</div>" +
          '<div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">' +
          '<div style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 14px; border-radius: 8px; text-align: center;">' +
          '<h4 style="font: 600 10px Inter, sans-serif; margin: 0 0 4px 0;">🏆 LÍDER</h4>' +
          '<p style="font: 700 16px Inter, sans-serif; margin: 0;">' +
          (dados.ranking[0] && dados.ranking[0].pontosTotais
            ? dados.ranking[0].pontosTotais
            : 0) +
          " pts</p>" +
          '<p style="font: 400 9px Inter, sans-serif; margin: 2px 0 0 0;">' +
          (dados.ranking[0] && dados.ranking[0].participanteNome
            ? dados.ranking[0].participanteNome
            : "N/D") +
          "</p>" +
          "</div>" +
          '<div style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 14px; border-radius: 8px; text-align: center;">' +
          '<h4 style="font: 600 10px Inter, sans-serif; margin: 0 0 4px 0;">🎯 PARTICIPANTES</h4>' +
          '<p style="font: 700 16px Inter, sans-serif; margin: 0;">' +
          dados.ranking.length +
          "</p>" +
          '<p style="font: 400 9px Inter, sans-serif; margin: 2px 0 0 0;">Cartoleiros ativos</p>' +
          "</div>" +
          '<div style="background: linear-gradient(135deg, #e67e22, #d35400); color: white; padding: 14px; border-radius: 8px; text-align: center;">' +
          '<h4 style="font: 600 10px Inter, sans-serif; margin: 0 0 4px 0;">🥅 MELHOR RODADA</h4>' +
          '<p style="font: 700 16px Inter, sans-serif; margin: 0;">' +
          melhorRodadaPontos +
          " pts</p>" +
          '<p style="font: 400 9px Inter, sans-serif; margin: 2px 0 0 0;">Individual</p>' +
          "</div>" +
          "</div>" +
          "</div>" +
          '<div style="background: white; border-top: 1px solid #e0e0e0; padding: 12px 24px; text-align: center;">' +
          '<p style="font: 11px Inter, sans-serif; margin: 0; color: #666;">Gerado em ' +
          dataFormatada +
          " • SuperCartola Manager v2.3.0<br>Sistema de Gerenciamento de Ligas do Cartola FC</p>" +
          "</div>"
        );
      });
  },
};

window.LuvaDeOuroUtils = LuvaDeOuroUtils;

console.log("✅ [LUVA-UTILS] Módulo de utilitários carregado");
