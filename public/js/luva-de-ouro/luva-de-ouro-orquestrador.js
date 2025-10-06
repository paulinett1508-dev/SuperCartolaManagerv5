// public/js/luva-de-ouro/luva-de-ouro-orquestrador.js - COM EXPORTAÇÕES INTEGRADAS
console.log("🎯 [LUVA-ORQUESTRADOR] Módulo orquestrador carregando...");

/**
 * Módulo Orquestrador - Coordena todas as operações do sistema
 */
const LuvaDeOuroOrquestrador = {
  // Estado global
  estado: {
    ranking: [],
    estatisticas: {},
    ultimaRodada: 0,
    rodadaDetectada: null,
    carregando: false,
  },

  /**
   * Inicializa o módulo completo
   */
  async inicializar() {
    console.log("🥅 [LUVA-ORQUESTRADOR] Inicializando módulo...");

    try {
      const config = window.LuvaDeOuroConfig;
      const container = document.getElementById(
        config.SELECTORS.CONTENT.substring(1),
      );
      const exportContainer = document.getElementById(
        config.SELECTORS.EXPORT_BTN_CONTAINER.substring(1),
      );

      if (!container) {
        console.error(
          `❌ Container ${config.SELECTORS.CONTENT} não encontrado`,
        );
        return;
      }

      // ✅ CSS EXTERNO - Removido adicionarEstilos()
      // O CSS agora está em public/css/modules/luva-de-ouro.css

      // Criar interface inicial
      container.innerHTML = window.LuvaDeOuroUI.criarControles();
      if (exportContainer) {
        exportContainer.innerHTML = "";
      }

      // Configurar event listeners
      this.configurarEventos();

      console.log("✅ Luva de Ouro inicializado com sucesso");
    } catch (error) {
      console.error("❌ Erro ao inicializar Luva de Ouro:", error);
      this.mostrarErro("Erro na inicialização", error.message);
    }
  },

  /**
   * Configura todos os event listeners
   */
  configurarEventos() {
    const config = window.LuvaDeOuroConfig;

    // Botão de gerar ranking
    const btnRanking = document.getElementById("luvaRankingBtn");
    if (btnRanking) {
      btnRanking.addEventListener("click", () => this.carregarRanking(false));
    }

    // Botão de última rodada
    const btnUltimaRodada = document.getElementById("luvaUltimaRodadaBtn");
    if (btnUltimaRodada) {
      btnUltimaRodada.addEventListener("click", () =>
        this.detectarECarregarRodada(),
      );
    }

    // Botão de forçar coleta
    const btnForcarColeta = document.getElementById("luvaForcarColetaBtn");
    if (btnForcarColeta) {
      btnForcarColeta.addEventListener("click", () =>
        this.carregarRanking(true),
      );
    }

    // Delegação de eventos para botões de detalhes (data-attributes)
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-detalhes")) {
        const id = e.target.dataset.participanteId;
        const nome = e.target.dataset.participanteNome;
        if (id && nome) {
          this.mostrarDetalhes(parseInt(id), nome);
        }
      }
    });

    console.log("📋 Eventos configurados");
  },

  /**
   * Carrega ranking de goleiros
   */
  async carregarRanking(forcarColeta = false) {
    const config = window.LuvaDeOuroConfig;
    const container = document.getElementById(
      config.SELECTORS.CONTENT.substring(1),
    );
    const exportContainer = document.getElementById(
      config.SELECTORS.EXPORT_BTN_CONTAINER.substring(1),
    );

    if (!container) return;

    try {
      this.estado.carregando = true;

      // Obter parâmetros
      const inicio =
        parseInt(
          document.getElementById(config.SELECTORS.RODADA_INICIO.substring(1))
            ?.value,
        ) || config.RODADAS.DEFAULT_INICIO;
      const fim =
        parseInt(
          document.getElementById(config.SELECTORS.RODADA_FIM.substring(1))
            ?.value,
        ) || null;

      console.log(
        `🎯 Carregando ranking: ${inicio} a ${fim || "atual"} (forçar: ${forcarColeta})`,
      );

      // Mostrar loading
      const mensagem = forcarColeta
        ? config.MESSAGES.LOADING_COLETA
        : config.MESSAGES.LOADING_RANKING;
      container.innerHTML = window.LuvaDeOuroUI.mostrarLoading(mensagem);

      // Tentar cache primeiro (se não forçar coleta)
      let dados = null;
      if (!forcarColeta) {
        dados = window.LuvaDeOuroCache.get("ranking", { inicio, fim });
      }

      // Se não tem cache, buscar da API
      if (!dados) {
        dados = await window.LuvaDeOuroCore.buscarRankingGoleiros(
          inicio,
          fim,
          forcarColeta,
        );
        window.LuvaDeOuroCache.set("ranking", { inicio, fim }, dados);
      }

      // Atualizar estado
      this.estado.ranking = dados;

      // Renderizar ranking
      container.innerHTML = window.LuvaDeOuroUI.renderizarRanking(dados);

      // ✅ CRIAR BOTÃO DE EXPORTAÇÃO GERAL
      if (exportContainer && dados.ranking && dados.ranking.length > 0) {
        exportContainer.innerHTML = this.criarBotaoExportacaoGeral(dados);
      }

      console.log("✅ Ranking carregado com sucesso");
    } catch (error) {
      console.error("❌ Erro ao carregar ranking:", error);
      this.mostrarErro(error.message, "Verifique a conexão ou tente novamente");
    } finally {
      this.estado.carregando = false;
    }
  },

  /**
   * ✅ NOVO: Cria botão de exportação geral com Mobile Dark HD
   */
  criarBotaoExportacaoGeral(dados) {
    return `
      <button 
        id="exportLuvaImagemGeral" 
        class="btn btn-export"
        onclick="window.LuvaDeOuroOrquestrador.exportarRankingGeral()"
      >
        <i data-lucide="download"></i>
        Exportar Ranking Mobile HD
      </button>
    `;
  },

  /**
   * ✅ NOVO: Exporta ranking geral
   */
  async exportarRankingGeral() {
    if (!this.estado.ranking || !this.estado.ranking.ranking) {
      window.LuvaDeOuroUtils.mostrarNotificacao(
        "Nenhum ranking para exportar",
        "error",
      );
      return;
    }

    const btnExport = document.getElementById("exportLuvaImagemGeral");
    const textoOriginal = btnExport ? btnExport.innerHTML : "";

    try {
      if (btnExport) {
        btnExport.innerHTML = `
          <div style="width: 16px; height: 16px; display: inline-block; margin-right: 8px;">
            <div style="width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          </div>
          Gerando Mobile HD...
        `;
        btnExport.disabled = true;
      }

      await window.LuvaDeOuroUtils.exportarRankingGeral(this.estado.ranking);
    } catch (error) {
      console.error("[LUVA-ORQUESTRADOR] ❌ Erro na exportação:", error);
      window.LuvaDeOuroUtils.mostrarNotificacao(
        "Erro ao exportar. Tente novamente.",
        "error",
      );
    } finally {
      if (btnExport) {
        btnExport.innerHTML = textoOriginal;
        btnExport.disabled = false;
      }
    }
  },

  /**
   * Detecta última rodada e carrega ranking
   */
  async detectarECarregarRodada() {
    try {
      const config = window.LuvaDeOuroConfig;
      const infoContainer = document.getElementById(
        config.SELECTORS.INFO_TEXTO.substring(1),
      );
      const fimInput = document.getElementById(
        config.SELECTORS.RODADA_FIM.substring(1),
      );

      if (infoContainer) {
        infoContainer.textContent = config.MESSAGES.DETECTANDO_RODADA;
      }

      // Detectar rodada
      const deteccao = await window.LuvaDeOuroCore.detectarUltimaRodada();
      this.estado.rodadaDetectada = deteccao;

      // Atualizar interface
      if (fimInput) {
        fimInput.value = deteccao.recomendacao;
      }

      if (infoContainer) {
        infoContainer.innerHTML = `
          <strong>Rodada atual:</strong> ${deteccao.rodadaAtualCartola} |
          <strong>Mercado:</strong> ${deteccao.mercadoFechado ? "Fechado" : "Aberto"} |
          <strong>Recomendado:</strong> até rodada ${deteccao.recomendacao}
        `;
      }

      // Carregar ranking automaticamente
      setTimeout(() => this.carregarRanking(false), 500);

      console.log("✅ Rodada detectada e ranking carregado");
    } catch (error) {
      console.error("❌ Erro ao detectar rodada:", error);
      const config = window.LuvaDeOuroConfig;
      const infoContainer = document.getElementById(
        config.SELECTORS.INFO_TEXTO.substring(1),
      );
      if (infoContainer) {
        infoContainer.textContent = `Erro: ${error.message}`;
      }
    }
  },

  /**
   * Mostra detalhes de um participante
   */
  async mostrarDetalhes(participanteId, participanteNome) {
    console.log(
      `Carregando detalhes de ${participanteNome} (${participanteId})`,
    );

    try {
      const config = window.LuvaDeOuroConfig;
      const inicio =
        parseInt(
          document.getElementById(config.SELECTORS.RODADA_INICIO.substring(1))
            ?.value,
        ) || config.RODADAS.DEFAULT_INICIO;
      const fim =
        parseInt(
          document.getElementById(config.SELECTORS.RODADA_FIM.substring(1))
            ?.value,
        ) || null;

      // Tentar cache
      let dados = window.LuvaDeOuroCache.get("detalhes", {
        participanteId,
        inicio,
        fim,
      });

      // Se não tem cache, buscar da API
      if (!dados) {
        dados = await window.LuvaDeOuroCore.buscarDetalhesParticipante(
          participanteId,
          inicio,
          fim,
        );
        window.LuvaDeOuroCache.set(
          "detalhes",
          { participanteId, inicio, fim },
          dados,
        );
      }

      // ✅ Criar modal com botão de exportação individual
      window.LuvaDeOuroUtils.criarModalDetalhes(dados);
    } catch (error) {
      console.error("❌ Erro ao buscar detalhes:", error);
      alert(
        `Erro ao carregar detalhes de ${participanteNome}: ${error.message}`,
      );
    }
  },

  /**
   * Mostra erro na interface
   */
  mostrarErro(erro, detalhes = null) {
    const config = window.LuvaDeOuroConfig;
    const container = document.getElementById(
      config.SELECTORS.CONTENT.substring(1),
    );
    if (container) {
      container.innerHTML = window.LuvaDeOuroUI.mostrarErro(erro, detalhes);
    }
  },
};

// Exportar para uso global
window.LuvaDeOuroOrquestrador = LuvaDeOuroOrquestrador;

console.log("✅ [LUVA-ORQUESTRADOR] Módulo orquestrador carregado");
