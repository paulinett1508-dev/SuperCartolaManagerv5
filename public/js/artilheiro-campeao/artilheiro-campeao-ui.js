// ✅ ARTILHEIRO-CAMPEAO-UI.JS v1.0
// Interface de usuário do sistema de artilheiros

console.log("🎨 [ARTILHEIRO-UI] Módulo v1.0 carregando...");

// ✅ IMPORTAÇÕES
import { ArtilheiroUtils } from "./artilheiro-campeao-utils.js";

// ✅ INTERFACE DE USUÁRIO
export const ArtilheiroUI = {
  version: "1.0.0",

  // Mostrar loading com progresso
  mostrarLoading(mensagem = "Carregando artilheiros...", progresso = null) {
    const loadingContainer = document.getElementById("artilheiro-loading");
    const artilheiroContainer = document.getElementById("artilheiro-container");

    if (loadingContainer) {
      loadingContainer.style.display = "block";

      let progressoHtml = "";
      if (progresso) {
        progressoHtml = `
          <div style="margin-top: 15px; max-width: 300px; margin-left: auto; margin-right: auto;">
            <div style="background: #f0f0f0; border-radius: 10px; overflow: hidden; height: 20px;">
              <div style="background: linear-gradient(90deg, #007bff, #0056b3); height: 100%; width: ${progresso.porcentagem}%; transition: width 0.3s ease;"></div>
            </div>
            <p style="margin: 8px 0 0 0; font-size: 0.9rem; color: #666; text-align: center;">
              ${progresso.atual} de ${progresso.total} participantes (${progresso.porcentagem}%)
            </p>
          </div>
        `;
      }

      loadingContainer.innerHTML = `
        <div class="loading-spinner"></div>
        <p style="margin-top: 15px; color: #666;">${mensagem}</p>
        ${progressoHtml}
        <small style="display: block; margin-top: 10px; color: #999;">
          ⏳ Primeira vez pode demorar alguns minutos
        </small>
      `;
    }

    if (artilheiroContainer) {
      artilheiroContainer.style.display = "none";
    }
  },

  // Esconder loading
  esconderLoading() {
    const loadingContainer = document.getElementById("artilheiro-loading");
    const artilheiroContainer = document.getElementById("artilheiro-container");

    if (loadingContainer) {
      loadingContainer.style.display = "none";
    }

    if (artilheiroContainer) {
      artilheiroContainer.style.display = "block";
    }
  },

  // Mostrar erro
  mostrarErro(mensagem, detalhes = null) {
    const artilheiroContainer = document.getElementById("artilheiro-container");
    const loadingContainer = document.getElementById("artilheiro-loading");

    if (artilheiroContainer) {
      artilheiroContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; color: #721c24; max-width: 600px; margin: 0 auto;">
          <div style="font-size: 3rem; margin-bottom: 15px;">❌</div>
          <h3 style="margin: 0 0 10px 0;">Erro ao carregar dados</h3>
          <p style="margin: 0 0 15px 0;">${mensagem}</p>

          ${
            detalhes
              ? `
            <details style="margin: 15px 0; text-align: left;">
              <summary style="cursor: pointer; padding: 5px; background: #f5c6cb; border-radius: 4px; margin-bottom: 10px;">
                🔍 Ver detalhes técnicos
              </summary>
              <pre style="background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 10px; font-size: 0.8rem; overflow-x: auto;">${ArtilheiroUtils.sanitizarHTML(detalhes)}</pre>
            </details>
          `
              : ""
          }

          <div style="margin-top: 20px;">
            <button onclick="window.location.reload()" 
                    style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
              🔄 Tentar Novamente
            </button>
            <button onclick="ArtilheiroCoordinator?.atualizarDados()" 
                    style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
              ♻️ Limpar Cache
            </button>
          </div>
        </div>
      `;
      artilheiroContainer.style.display = "block";
    }

    if (loadingContainer) {
      loadingContainer.style.display = "none";
    }
  },

  // Renderizar interface completa
  renderizarInterface(dados, estatisticas, configuracoes = {}) {
    const artilheiroContainer = document.getElementById("artilheiro-container");

    if (!artilheiroContainer) {
      ArtilheiroUtils.logger.error(
        "Container #artilheiro-container não encontrado",
      );
      return;
    }

    const { rodadaAtual = 15, totalRodadas = 38 } = configuracoes;

    const html = `
      <!-- HEADER COM ESTATÍSTICAS -->
      ${this._renderizarHeader(rodadaAtual, totalRodadas)}

      <!-- CARDS DE ESTATÍSTICAS -->
      ${this._renderizarCardsEstatisticas(estatisticas)}

      <!-- TABELA PRINCIPAL -->
      ${this._renderizarTabela(dados)}

      <!-- INFORMAÇÕES ADICIONAIS -->
      ${this._renderizarInfoAdicional(estatisticas, rodadaAtual, totalRodadas)}
    `;

    artilheiroContainer.innerHTML = html;
    this.esconderLoading();

    // Salvar dados para uso em outras funções
    window._dadosArtilheiros = dados;

    ArtilheiroUtils.logger.success("✅ Interface renderizada com sucesso");
  },

  // Renderizar header
  _renderizarHeader(rodadaAtual, totalRodadas) {
    return `
      <div class="artilheiro-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
        <div>
          <h2 style="margin: 0; color: #2c3e50; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">🏆</span>
            Artilheiro Campeão
          </h2>
          <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 0.9rem;">
            📊 Classificação geral até a Rodada ${rodadaAtual} de ${totalRodadas}
          </p>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button onclick="ArtilheiroCoordinator?.exportarDados()" 
                  class="btn-exportar" 
                  style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 5px;">
            <span>📤</span> Exportar
          </button>
          <button onclick="ArtilheiroCoordinator?.atualizarDados()" 
                  class="btn-atualizar" 
                  style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 5px;">
            <span>🔄</span> Atualizar
          </button>
        </div>
      </div>
    `;
  },

  // Renderizar cards de estatísticas
  _renderizarCardsEstatisticas(estatisticas) {
    return `
      <div class="estatisticas-container" style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">

        <!-- Card Gols Pró -->
        <div class="stat-card" style="background: linear-gradient(135deg, #e3f2fd, #bbdefb); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #90caf9; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="font-size: 1.5rem; font-weight: bold; color: #1976d2; margin-bottom: 5px;">
            ${ArtilheiroUtils.formatarNumero(estatisticas.totalGolsPro)}
          </div>
          <div style="font-size: 0.85rem; color: #424242; display: flex; align-items: center; justify-content: center; gap: 5px;">
            <span>⚽</span> Total Gols Pró
          </div>
        </div>

        <!-- Card Gols Contra -->
        <div class="stat-card" style="background: linear-gradient(135deg, #ffebee, #ffcdd2); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #f48fb1; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="font-size: 1.5rem; font-weight: bold; color: #d32f2f; margin-bottom: 5px;">
            ${ArtilheiroUtils.formatarNumero(estatisticas.totalGolsContra)}
          </div>
          <div style="font-size: 0.85rem; color: #424242; display: flex; align-items: center; justify-content: center; gap: 5px;">
            <span>🔴</span> Total Gols Contra
          </div>
        </div>

        <!-- Card Saldo Geral -->
        <div class="stat-card" style="background: linear-gradient(135deg, #e8f5e8, #c8e6c9); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #81c784; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="font-size: 1.5rem; font-weight: bold; color: ${estatisticas.totalSaldo >= 0 ? "#2e7d32" : "#d32f2f"}; margin-bottom: 5px;">
            ${ArtilheiroUtils.formatarSaldo(estatisticas.totalSaldo)}
          </div>
          <div style="font-size: 0.85rem; color: #424242; display: flex; align-items: center; justify-content: center; gap: 5px;">
            <span>📊</span> Saldo Geral
          </div>
        </div>

        <!-- Card Média -->
        <div class="stat-card" style="background: linear-gradient(135deg, #fff3e0, #ffcc80); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #ffb74d; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="font-size: 1.5rem; font-weight: bold; color: #f57c00; margin-bottom: 5px;">
            ${estatisticas.mediaGolsPorParticipante}
          </div>
          <div style="font-size: 0.85rem; color: #424242; display: flex; align-items: center; justify-content: center; gap: 5px;">
            <span>📈</span> Média/Participante
          </div>
        </div>

      </div>
    `;
  },

  // Renderizar tabela principal
  _renderizarTabela(dados) {
    return `
      <div class="tabela-container" style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
        <table class="ranking-table" style="width: 100%; border-collapse: collapse;">
          <thead style="background: #343a40; color: white;">
            <tr>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600; width: 60px;">Pos</th>
              <th style="padding: 12px 8px; text-align: left; font-weight: 600; min-width: 200px;">Participante</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600; width: 80px;">⚽ Pró</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600; width: 80px;">🔴 Contra</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600; width: 80px;">📊 Saldo</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600; width: 80px;">📈 Média</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600; width: 100px;">🎯 Ações</th>
            </tr>
          </thead>
          <tbody>
            ${this._renderizarLinhasTabela(dados)}
          </tbody>
        </table>
      </div>
    `;
  },

  // Renderizar linhas da tabela
  _renderizarLinhasTabela(dados) {
    return dados
      .map((participante, index) => {
        // Determinar classe CSS baseada na posição
        let classeLinhaExtra = "";
        if (index === 0) {
          classeLinhaExtra =
            "background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); font-weight: 600;";
        } else if (index === dados.length - 1 && dados.length > 1) {
          classeLinhaExtra =
            "background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);";
        }

        // Escudo do time (clube do coração)
        const escudoClube = participante.clube_id
          ? `<img src="/escudos/${participante.clube_id}.png" alt="❤️" style="width: 18px; height: 18px; border-radius: 50%; border: 1px solid #ddd; margin-right: 5px;" onerror="this.style.display='none'" title="Clube do coração">`
          : "";

        // Escudo do time cartola
        const escudoTime = participante.escudo
          ? `<img src="${participante.escudo}" alt="Escudo" style="width: 24px; height: 24px; border-radius: 50%; border: 1px solid #ddd;" onerror="this.style.display='none'" title="Escudo do time">`
          : `<div style="width: 24px; height: 24px; border-radius: 50%; background: #e9ecef; display: flex; align-items: center; justify-content: center; font-size: 12px;">👤</div>`;

        return `
        <tr style="border-bottom: 1px solid #eee; ${classeLinhaExtra} transition: background-color 0.2s;" 
            onmouseover="this.style.backgroundColor='#f5f5f5'" 
            onmouseout="this.style.backgroundColor='${index === 0 ? "#fff3e0" : index === dados.length - 1 && dados.length > 1 ? "#ffebee" : "white"}'">

          <!-- Posição -->
          <td style="padding: 12px 8px; text-align: center;">
            ${this._renderizarPosicao(index, dados.length)}
          </td>

          <!-- Participante -->
          <td style="padding: 12px 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${escudoTime}
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 500; color: #2c3e50; display: flex; align-items: center; gap: 5px;">
                  ${escudoClube}
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${ArtilheiroUtils.formatarNome(participante.nomeCartoleiro, 18)}
                  </span>
                </div>
                <div style="font-size: 0.8rem; color: #6c757d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${ArtilheiroUtils.formatarNome(participante.nomeTime, 20)}
                </div>
              </div>
            </div>
          </td>

          <!-- Gols Pró -->
          <td style="padding: 12px 8px; text-align: center;">
            <span style="font-weight: 600; color: #28a745; background: #e8f5e8; padding: 4px 8px; border-radius: 12px; font-size: 0.9rem;">
              ${participante.golsPro}
            </span>
          </td>

          <!-- Gols Contra -->
          <td style="padding: 12px 8px; text-align: center;">
            <span style="font-weight: 600; color: #dc3545; background: #ffebee; padding: 4px 8px; border-radius: 12px; font-size: 0.9rem;">
              ${participante.golsContra}
            </span>
          </td>

          <!-- Saldo -->
          <td style="padding: 12px 8px; text-align: center;">
            <span style="font-weight: 600; color: ${participante.saldoGols >= 0 ? "#28a745" : "#dc3545"}; background: ${participante.saldoGols >= 0 ? "#e8f5e8" : "#ffebee"}; padding: 4px 8px; border-radius: 12px; font-size: 0.9rem;">
              ${ArtilheiroUtils.formatarSaldo(participante.saldoGols)}
            </span>
          </td>

          <!-- Média -->
          <td style="padding: 12px 8px; text-align: center; font-weight: 500; color: #6c757d;">
            ${participante.mediaGols}
          </td>

          <!-- Ações -->
          <td style="padding: 12px 8px; text-align: center;">
            <button onclick="ArtilheiroUI.mostrarDetalhesParticipante(${index})" 
                    style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 5px; margin: 0 auto;">
              <span>👁️</span> Detalhes
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
  },

  // Renderizar posição com badges especiais
  _renderizarPosicao(index, totalParticipantes) {
    if (index === 0) {
      return `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
          <span style="background: #ffd700; color: #333; padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 0.7rem;">🏆 ARTILHEIRO</span>
        </div>
      `;
    } else if (index === totalParticipantes - 1 && totalParticipantes > 1) {
      return `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
          <span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 0.7rem;">📉 ÚLTIMO</span>
        </div>
      `;
    } else {
      return `<span style="font-weight: 600; color: #495057;">${index + 1}º</span>`;
    }
  },

  // Renderizar informações adicionais
  _renderizarInfoAdicional(estatisticas, rodadaAtual, totalRodadas) {
    return `
      <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 0.9rem; color: #6c757d;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">

          <!-- Estatísticas Detalhadas -->
          <div>
            <h4 style="margin: 0 0 10px 0; color: #495057; font-size: 1rem;">📊 Estatísticas Detalhadas</h4>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
              <li><strong>Participantes ativos:</strong> ${estatisticas.participantesAtivos}</li>
              <li><strong>Sem gols:</strong> ${estatisticas.participantesSemGols || 0}</li>
              <li><strong>Maior saldo positivo:</strong> +${estatisticas.maiorSaldoPositivo || 0}</li>
              <li><strong>Maior saldo negativo:</strong> ${estatisticas.maiorSaldoNegativo || 0}</li>
            </ul>
          </div>

          <!-- Distribuição de Gols -->
          ${
            estatisticas.distribuicaoGols
              ? `
          <div>
            <h4 style="margin: 0 0 10px 0; color: #495057; font-size: 1rem;">📈 Distribuição de Gols</h4>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
              <li><strong>0 gols:</strong> ${estatisticas.distribuicaoGols["0"]} participantes</li>
              <li><strong>1-3 gols:</strong> ${estatisticas.distribuicaoGols["1-3"]} participantes</li>
              <li><strong>4-6 gols:</strong> ${estatisticas.distribuicaoGols["4-6"]} participantes</li>
              <li><strong>7-10 gols:</strong> ${estatisticas.distribuicaoGols["7-10"]} participantes</li>
              <li><strong>11+ gols:</strong> ${estatisticas.distribuicaoGols["11+"]} participantes</li>
            </ul>
          </div>
          `
              : ""
          }

        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px;">
          <p style="margin: 0; display: flex; justify-content: center; align-items: center; gap: 15px; flex-wrap: wrap;">
            <span>📊 Dados extraídos da API oficial do Cartola FC</span>
            <span>•</span>
            <span>🔄 Última atualização: ${ArtilheiroUtils.formatarData(new Date(), "completo")}</span>
            <span>•</span>
            <span>👥 ${estatisticas.participantesAtivos} participantes ativos</span>
          </p>
        </div>
      </div>
    `;
  },

  // Mostrar detalhes de um participante em modal
  mostrarDetalhesParticipante(index) {
    const participante = window._dadosArtilheiros?.[index];
    if (!participante) {
      ArtilheiroUtils.logger.warn("Participante não encontrado:", index);
      return;
    }

    const modal = this._criarModal();
    const conteudo = this._gerarConteudoModal(participante);

    modal.querySelector(".modal-content").innerHTML = conteudo;
    document.body.appendChild(modal);

    // Event listeners
    this._configurarEventListenersModal(modal);

    ArtilheiroUtils.logger.debug(
      `Modal aberto para: ${participante.nomeCartoleiro}`,
    );
  },

  // Criar estrutura do modal
  _criarModal() {
    return ArtilheiroUtils.criarElemento(
      "div",
      {
        class: "artilheiro-modal",
        style: {
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.5)",
          zIndex: "1000",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflowY: "auto",
          padding: "20px",
        },
      },
      `
      <div class="modal-content" style="
        background: white; 
        border-radius: 8px; 
        max-width: 700px; 
        width: 100%; 
        max-height: 90vh; 
        overflow-y: auto; 
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      "></div>
    `,
    );
  },

  // Gerar conteúdo do modal
  _gerarConteudoModal(participante) {
    // Preparar dados das rodadas
    const rodadasHtml = this._gerarRodadasHtml(participante);
    const jogadoresHtml = this._gerarJogadoresHtml(participante);

    return `
      <!-- Header do Modal -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 2px solid #f8f9fa;">
        <h3 style="margin: 0; color: #2c3e50; display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.5rem;">🏆</span>
          Detalhes do Participante
        </h3>
        <button class="btn-fechar" style="background: #dc3545; color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center;">
          ×
        </button>
      </div>

      <!-- Dados do Participante -->
      <div style="padding: 20px;">
        ${this._gerarInfoParticipante(participante)}
        ${this._gerarEstatisticasParticipante(participante)}
        ${rodadasHtml}
        ${jogadoresHtml}
      </div>

      <!-- Footer do Modal -->
      <div style="padding: 15px 20px; background: #f8f9fa; border-top: 1px solid #dee2e6; text-align: center;">
        <button class="btn-fechar" style="padding: 10px 30px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Fechar
        </button>
      </div>
    `;
  },

  // Gerar informações básicas do participante
  _gerarInfoParticipante(participante) {
    return `
      <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        ${
          participante.escudo
            ? `<img src="${participante.escudo}" alt="Escudo" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`
            : `<div style="width: 60px; height: 60px; border-radius: 50%; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 2rem;">👤</div>`
        }
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 1.3rem; color: #2c3e50; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
            ${
              participante.clube_id
                ? `<img src="/escudos/${participante.clube_id}.png" alt="❤️" style="width: 22px; height: 22px; border-radius: 50%;" onerror="this.style.display='none'" title="Clube do coração">`
                : ""
            }
            ${participante.nomeCartoleiro}
          </div>
          <div style="color: #6c757d; font-size: 1.1rem; margin-bottom: 5px;">${participante.nomeTime}</div>
          <div style="display: flex; align-items: center; gap: 15px; font-size: 0.9rem;">
            <span style="background: #007bff; color: white; padding: 2px 8px; border-radius: 12px;">
              <strong>Posição:</strong> ${participante.posicao}º lugar
            </span>
            <span style="color: #28a745;">
              <strong>Rodadas jogadas:</strong> ${participante.rodadasJogadas || 0}
            </span>
          </div>
        </div>
      </div>
    `;
  },

  // Gerar estatísticas do participante
  _gerarEstatisticasParticipante(participante) {
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 25px;">
        <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #e8f5e8, #c8e6c9); border-radius: 8px; border: 1px solid #81c784;">
          <div style="font-size: 1.6rem; font-weight: bold; color: #2e7d32; margin-bottom: 5px;">${participante.golsPro}</div>
          <div style="font-size: 0.85rem; color: #424242;">⚽ Gols Pró</div>
        </div>
        <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #ffebee, #ffcdd2); border-radius: 8px; border: 1px solid #f48fb1;">
          <div style="font-size: 1.6rem; font-weight: bold; color: #d32f2f; margin-bottom: 5px;">${participante.golsContra}</div>
          <div style="font-size: 0.85rem; color: #424242;">🔴 Gols Contra</div>
        </div>
        <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #e3f2fd, #bbdefb); border-radius: 8px; border: 1px solid #90caf9;">
          <div style="font-size: 1.6rem; font-weight: bold; color: ${participante.saldoGols >= 0 ? "#1976d2" : "#d32f2f"}; margin-bottom: 5px;">
            ${ArtilheiroUtils.formatarSaldo(participante.saldoGols)}
          </div>
          <div style="font-size: 0.85rem; color: #424242;">📊 Saldo</div>
        </div>
        <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #fff3e0, #ffcc80); border-radius: 8px; border: 1px solid #ffb74d;">
          <div style="font-size: 1.6rem; font-weight: bold; color: #f57c00; margin-bottom: 5px;">${participante.mediaGols}</div>
          <div style="font-size: 0.85rem; color: #424242;">📈 Média</div>
        </div>
      </div>
    `;
  },

  // Gerar HTML das rodadas
  _gerarRodadasHtml(participante) {
    if (
      !participante.golsPorRodada ||
      participante.golsPorRodada.length === 0
    ) {
      return `
        <div style="margin-bottom: 20px;">
          <h4 style="margin-bottom: 10px; color: #2c3e50;">📅 Gols por Rodada:</h4>
          <p style="color: #6c757d; text-align: center; padding: 20px;">Nenhum dado de rodada disponível</p>
        </div>
      `;
    }

    let rodadasHtml = "";
    participante.golsPorRodada.forEach((rodada, i) => {
      if (rodada && rodada.ocorreu) {
        const golsPro = rodada.golsPro || 0;
        const golsContra = rodada.golsContra || 0;
        const saldo = rodada.saldo || 0;

        let conteudo = golsPro.toString();
        if (golsContra > 0) {
          conteudo += ` (-${golsContra})`;
        }

        const corFundo =
          saldo > 0 ? "#d4edda" : saldo < 0 ? "#f8d7da" : "#e2e3e5";

        rodadasHtml += `
          <div style="display: inline-block; margin: 3px; padding: 6px 10px; background: ${corFundo}; border-radius: 6px; font-size: 0.85rem; border: 1px solid ${saldo > 0 ? "#c3e6cb" : saldo < 0 ? "#f5c6cb" : "#d1ecf1"};">
            <strong>R${i + 1}:</strong> ${conteudo}
          </div>
        `;
      }
    });

    return `
      <div style="margin-bottom: 20px;">
        <h4 style="margin-bottom: 15px; color: #2c3e50; display: flex; align-items: center; gap: 8px;">
          <span>📅</span> Gols por Rodada:
        </h4>
        <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #fafafa;">
          ${rodadasHtml || '<p style="color: #6c757d; margin: 0; text-align: center;">Nenhum gol registrado</p>'}
        </div>
      </div>
    `;
  },

  // Gerar HTML dos jogadores
  _gerarJogadoresHtml(participante) {
    if (!participante.jogadores || participante.jogadores.length === 0) {
      return "";
    }

    const jogadoresHtml = participante.jogadores
      .map(
        (jogador) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
        <div>
          <span style="font-weight: 500; color: #2c3e50;">${jogador.nome}</span>
          ${jogador.clube ? `<small style="color: #6c757d; margin-left: 8px;">(${jogador.clube})</small>` : ""}
          ${jogador.posicao ? `<small style="color: #007bff; margin-left: 5px;">[${jogador.posicao}]</small>` : ""}
        </div>
        <span style="font-weight: bold; color: #28a745; background: #e8f5e8; padding: 4px 8px; border-radius: 12px; font-size: 0.85rem;">
          ${jogador.gols} gol${jogador.gols !== 1 ? "s" : ""}
        </span>
      </div>
    `,
      )
      .join("");

    return `
      <div style="margin-top: 20px;">
        <h4 style="margin-bottom: 15px; color: #2c3e50; display: flex; align-items: center; gap: 8px;">
          <span>⚽</span> Artilheiros do Time:
        </h4>
        <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; background: white;">
          <div style="padding: 15px;">
            ${jogadoresHtml}
          </div>
        </div>
      </div>
    `;
  },

  // Configurar event listeners do modal
  _configurarEventListenersModal(modal) {
    // Fechar modal clicando no X ou botão Fechar
    modal.querySelectorAll(".btn-fechar").forEach((btn) => {
      btn.addEventListener("click", () => {
        modal.remove();
      });
    });

    // Fechar modal clicando fora
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Fechar modal com ESC
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        modal.remove();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);
  },
};

console.log("✅ [ARTILHEIRO-UI] Módulo carregado com sucesso!");
