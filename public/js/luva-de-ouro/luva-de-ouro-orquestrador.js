// public/js/luva-de-ouro/luva-de-ouro-orquestrador.js - VERSÃO CORRIGIDA
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
        this.detectarUltimaRodada(),
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

      // Criar botão de exportação
      if (exportContainer && dados.ranking && dados.ranking.length > 0) {
        exportContainer.innerHTML = window.LuvaDeOuroUI.criarBotaoExport();
        this.configurarExportacao(dados);
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
   * Configura exportação de imagem
   */
  configurarExportacao(dados) {
    const config = window.LuvaDeOuroConfig;
    const btnExport = document.getElementById(
      config.SELECTORS.BTN_EXPORT.substring(1),
    );

    if (!btnExport) return;

    btnExport.onclick = () => this.exportarImagem(dados);

    // Efeitos hover já estão no CSS
  },

  /**
   * Exporta ranking como imagem
   */
  async exportarImagem(dados) {
    if (!dados || !dados.ranking) {
      alert("Nenhum dado para exportar");
      return;
    }

    const config = window.LuvaDeOuroConfig;
    const btnExport = document.getElementById(
      config.SELECTORS.BTN_EXPORT.substring(1),
    );
    const textoOriginal = btnExport ? btnExport.innerHTML : "";

    try {
      if (btnExport) {
        btnExport.innerHTML = `
          <div style="width: 16px; height: 16px; margin-right: 8px;">
            <div style="width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          </div>
          Gerando Imagem...
        `;
        btnExport.disabled = true;
      }

      console.log("[LUVA-ORQUESTRADOR] Criando exportação de imagem...");

      // Verificar/carregar html2canvas
      if (!window.html2canvas) {
        const script = document.createElement("script");
        script.src = config.EXPORT.HTML2CANVAS_URL;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => {
            console.log(
              "[LUVA-ORQUESTRADOR] Falha ao carregar html2canvas, usando CSV",
            );
            window.LuvaDeOuroUtils.exportarCSV(dados);
            reject(new Error("html2canvas não carregou"));
          };
          document.head.appendChild(script);
        });
      }

      // Criar container temporário
      const exportDiv = document.createElement("div");
      exportDiv.id = "luva-ouro-export-temp";
      exportDiv.style.cssText = `
        position: absolute;
        top: -99999px;
        left: -99999px;
        width: ${config.EXPORT.WIDTH}px;
        background: white;
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
        color: #2c2c2c;
      `;

      exportDiv.innerHTML = window.LuvaDeOuroUtils.criarLayoutExportacao(dados);
      document.body.appendChild(exportDiv);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Gerar canvas
      const canvas = await window.html2canvas(exportDiv, {
        allowTaint: true,
        useCORS: true,
        scale: config.EXPORT.SCALE,
        logging: false,
        width: config.EXPORT.WIDTH,
        height: exportDiv.scrollHeight,
        backgroundColor: "#ffffff",
        imageTimeout: 15000,
        removeContainer: true,
        letterRendering: true,
        foreignObjectRendering: true,
      });

      // Download
      const timestamp = new Date()
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-");
      const filename = `luva-de-ouro-rodadas-${dados.rodadaInicio}-${dados.rodadaFim}-${timestamp}.png`;

      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL(config.EXPORT.FORMAT, config.EXPORT.QUALITY);
      link.click();

      console.log("[LUVA-ORQUESTRADOR] ✅ Imagem exportada com sucesso");
      window.LuvaDeOuroUtils.mostrarNotificacao(
        config.MESSAGES.SUCESSO_EXPORT,
        "success",
      );
    } catch (error) {
      console.error("[LUVA-ORQUESTRADOR] ❌ Erro na exportação:", error);
      window.LuvaDeOuroUtils.mostrarNotificacao(
        config.MESSAGES.ERRO_EXPORT,
        "warning",
      );
      window.LuvaDeOuroUtils.exportarCSV(dados);
    } finally {
      const tempDiv = document.getElementById("luva-ouro-export-temp");
      if (tempDiv) {
        document.body.removeChild(tempDiv);
      }

      if (btnExport) {
        btnExport.innerHTML = textoOriginal;
        btnExport.disabled = false;
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

      // Criar modal
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
