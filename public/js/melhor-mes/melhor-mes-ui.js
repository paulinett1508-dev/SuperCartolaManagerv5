// MELHOR DO MÊS - INTERFACE DE USUÁRIO v1.1 - BOTÃO EXPORT MOBILE HD RESTAURADO
// public/js/melhor-mes/melhor-mes-ui.js

import { MELHOR_MES_CONFIG, getPremiosLiga } from "./melhor-mes-config.js";
import { criarBotaoExportacaoMelhorMes } from "../exports/export-melhor-mes.js";

console.log("[MELHOR-MES-UI] Carregando interface...");

export class MelhorMesUI {
  constructor() {
    this.edicaoAtiva = null;
    this.dadosCarregados = null;
    this.containers = {
      select: "edicoesContainer",
      tabela: "melhorMesTabela",
      loading: "loadingMelhorMes",
      exportBtn: "melhorMesExportBtnContainer",
    };
  }

  // RENDERIZAR INTERFACE COMPLETA
  renderizar(dados) {
    console.log("[MELHOR-MES-UI] Renderizando interface...");

    this.dadosCarregados = dados;
    this.renderizarMiniCards();

    // Selecionar edição atual automaticamente
    const edicaoAtual = this.determinarEdicaoAtual();
    if (edicaoAtual !== null) {
      this.selecionarEdicao(edicaoAtual);
    }
  }

  // DETERMINAR EDIÇÃO ATUAL
  determinarEdicaoAtual() {
    if (!this.dadosCarregados?.resultados) return 0;

    // Procurar última edição com dados
    for (let i = MELHOR_MES_CONFIG.edicoes.length - 1; i >= 0; i--) {
      const dados = this.dadosCarregados.resultados[i];
      if (dados && dados.ranking.length > 0) {
        return i;
      }
    }

    return 0;
  }

  // RENDERIZAR MINI-CARDS PADRONIZADO
  renderizarMiniCards() {
    const container = document.getElementById(this.containers.select);
    if (!container) {
      console.error("[MELHOR-MES-UI] Container de mini-cards não encontrado");
      return;
    }

    // GERAR MINI-CARDS SEGUINDO PADRÃO PONTOS-CORRIDOS
    const miniCardsHTML = MELHOR_MES_CONFIG.edicoes
      .map((edicao, index) => this.criarMiniCardPadrao(edicao, index))
      .join("");

    container.innerHTML = miniCardsHTML;
    this.adicionarEventListeners();
  }

  // CRIAR MINI-CARD PADRÃO (IGUAL PONTOS-CORRIDOS)
  criarMiniCardPadrao(edicao, index) {
    const dados = this.dadosCarregados?.resultados[index];
    const isAtiva = index === this.edicaoAtiva;
    const temDados = dados && dados.ranking.length > 0;

    // Determinar status
    let statusClass = "aguardando";
    if (temDados && dados.concluida) {
      statusClass = "concluida";
    } else if (temDados && !dados.concluida) {
      statusClass = "andamento";
    }

    return `
      <div id="edicao-card-${index}" 
           data-edicao="${index}"
           class="edicao-card ${statusClass} ${isAtiva ? "selecionada" : ""}">

        <div class="edicao-numero">${String(index + 1).padStart(2, "0")}</div>
        <div class="edicao-label">EDIÇÃO</div>
        <div class="edicao-rodadas">Rod. ${edicao.inicio}-${edicao.fim}</div>

      </div>
    `;
  }

  // ADICIONAR EVENT LISTENERS
  adicionarEventListeners() {
    MELHOR_MES_CONFIG.edicoes.forEach((_, index) => {
      const card = document.getElementById(`edicao-card-${index}`);
      const dados = this.dadosCarregados?.resultados[index];

      if (card && dados && dados.ranking.length > 0) {
        card.addEventListener("click", () => this.selecionarEdicao(index));
      }
    });
  }

  // SELECIONAR EDIÇÃO
  selecionarEdicao(index) {
    if (this.edicaoAtiva === index) return;

    console.log(`[MELHOR-MES-UI] Selecionando edição ${index}`);

    // Remover seleção anterior
    if (this.edicaoAtiva !== null) {
      const cardAnterior = document.getElementById(
        `edicao-card-${this.edicaoAtiva}`,
      );
      if (cardAnterior) {
        cardAnterior.classList.remove("selecionada");
      }
    }

    // Aplicar nova seleção
    this.edicaoAtiva = index;
    const novoCard = document.getElementById(`edicao-card-${index}`);
    if (novoCard) {
      novoCard.classList.add("selecionada");
    }

    this.renderizarTabelaRanking();
  }

  // RENDERIZAR TABELA DE RANKING PADRONIZADA
  renderizarTabelaRanking() {
    const container = document.getElementById(this.containers.tabela);
    if (!container || this.edicaoAtiva === null) return;

    const dados = this.dadosCarregados?.resultados[this.edicaoAtiva];
    if (!dados) return;

    if (dados.ranking.length === 0) {
      container.innerHTML = this.criarMensagemVazia(dados);
      return;
    }

    // Tabela compacta seguindo padrão do sistema
    const temPremios = dados.premios && dados.premios.primeiro.valor > 0;

    container.innerHTML = `
      <table class="tabela-melhor-mes">
        <thead>
          <tr>
            <th style="width: 50px;">POS</th>
            <th style="width: 35px;">🛡️</th>
            <th style="text-align: left; padding-left: 12px;">CARTOLEIRO</th>
            <th style="width: 70px;">PONTOS</th>
            ${temPremios ? '<th style="width: 70px;">PRÊMIO</th>' : ""}
          </tr>
        </thead>
        <tbody>
          ${dados.ranking.map((time, index) => this.criarLinhaRankingPadrao(time, index, dados, temPremios)).join("")}
        </tbody>
      </table>
    `;

    // ✅ RESTAURADO: Criar botão EXPORT MOBILE HD
    this.criarBotaoExportacao();
  }

  // ✅ CRIAR BOTÃO DE EXPORTAÇÃO MOBILE HD
  async criarBotaoExportacao() {
    if (this.edicaoAtiva === null) return;

    const edicao = MELHOR_MES_CONFIG.edicoes[this.edicaoAtiva];
    const dados = this.dadosCarregados?.resultados[this.edicaoAtiva];

    if (!dados || dados.ranking.length === 0) return;

    try {
      await criarBotaoExportacaoMelhorMes({
        containerId: this.containers.exportBtn,
        rankings: dados.ranking,
        edicao: edicao,
        tituloPersonalizado: `Melhor do Mês - ${edicao.nome}`,
        ligaId: window.ligaAtual?.id || "",
      });
    } catch (error) {
      console.error(
        "[MELHOR-MES-UI] Erro ao criar botão de exportação:",
        error,
      );
    }
  }

  // CRIAR LINHA RANKING COMPACTA
  criarLinhaRankingPadrao(time, index, dados, temPremios) {
    const posicao = index + 1;
    const isPrimeiro = posicao === 1;

    return `
      <tr>
        <td style="text-align: center; font-weight: 700;">
          ${isPrimeiro ? "🏆" : posicao + "º"}
        </td>
        <td style="text-align: center;">
          ${
            time.clube_id
              ? `<img src="/escudos/${time.clube_id}.png" class="time-escudo" alt="Escudo" onerror="this.style.display='none'">`
              : "⚽"
          }
        </td>
        <td style="text-align: left; padding-left: 12px;">
          <div>
            <div class="time-nome">${time.nome_cartola}</div>
            <div style="font-size: 10px; color: var(--text-muted);">${time.nome_time}</div>
          </div>
        </td>
        <td style="text-align: center;">
          <span class="pontos-destaque">${time.pontos.toFixed(2)}</span>
        </td>
        ${temPremios ? this.criarColunaPremio(isPrimeiro, dados) : ""}
      </tr>
    `;
  }

  // CRIAR COLUNA PRÊMIO
  criarColunaPremio(isPrimeiro, dados) {
    if (!dados.premios) return "<td>-</td>";

    if (isPrimeiro) {
      return `<td style="text-align: center; color: ${dados.premios.primeiro.cor}; font-weight: 600;">${dados.premios.primeiro.label}</td>`;
    }

    return "<td>-</td>";
  }

  // CRIAR MENSAGEM VAZIA
  criarMensagemVazia(dados) {
    return `
      <div class="empty-state">
        <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
        <h4>Edição ${dados.edicao.nome}</h4>
        <p>Aguardando dados das rodadas ${dados.edicao.inicio}-${dados.edicao.fim}</p>
      </div>
    `;
  }

  // MOSTRAR LOADING
  mostrarLoading() {
    const container = document.getElementById(this.containers.tabela);
    if (container) {
      container.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p class="loading-message">Carregando ranking da edição...</p>
        </div>
      `;
    }
  }

  // MOSTRAR ERRO
  mostrarErro(mensagem) {
    const container = document.getElementById(this.containers.tabela);
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <div style="font-size: 32px; margin-bottom: 16px;">⚠️</div>
          <div class="error-message">${mensagem}</div>
        </div>
      `;
    }
  }

  // OBTER INFO DE STATUS
  getStatusInfo(dados) {
    if (!dados || !dados.iniciada) {
      return {
        cor: "#999",
        icone: "⏳",
        texto: "Aguardando",
      };
    } else if (dados.concluida) {
      return {
        cor: "#22c55e",
        icone: "✅",
        texto: "Concluída",
      };
    } else {
      return {
        cor: "#ff4500",
        icone: "🔄",
        texto: "Em Andamento",
      };
    }
  }

  // ATUALIZAR INTERFACE
  atualizar(novosDados) {
    this.dadosCarregados = novosDados;
    this.renderizarMiniCards();

    if (this.edicaoAtiva !== null) {
      this.renderizarTabelaRanking();
    }
  }
}

console.log("[MELHOR-MES-UI] ✅ Interface modular carregada");