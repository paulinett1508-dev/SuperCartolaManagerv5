// public/js/luva-de-ouro/luva-de-ouro-orquestrador.js - CORRIGIDO
console.log("🎯 [LUVA-ORQUESTRADOR] Módulo orquestrador carregando...");

const LuvaDeOuroOrquestrador = {
  estado: {
    ranking: [],
    estatisticas: {},
    ultimaRodada: 0,
    rodadaDetectada: null,
    carregando: false,
  },

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
        console.error("❌ Container não encontrado");
        return;
      }

      container.innerHTML = window.LuvaDeOuroUI.criarControles();
      if (exportContainer) {
        exportContainer.innerHTML = "";
      }

      this.configurarEventos();
      console.log("✅ Luva de Ouro inicializado com sucesso");
    } catch (error) {
      console.error("❌ Erro ao inicializar:", error);
      this.mostrarErro("Erro na inicialização", error.message);
    }
  },

  configurarEventos() {
    const config = window.LuvaDeOuroConfig;

    const btnRanking = document.getElementById("luvaRankingBtn");
    if (btnRanking) {
      btnRanking.addEventListener("click", () => this.carregarRanking(false));
    }

    const btnUltimaRodada = document.getElementById("luvaUltimaRodadaBtn");
    if (btnUltimaRodada) {
      btnUltimaRodada.addEventListener("click", () =>
        this.detectarUltimaRodada(),
      );
    }

    const btnForcarColeta = document.getElementById("luvaForcarColetaBtn");
    if (btnForcarColeta) {
      btnForcarColeta.addEventListener("click", () =>
        this.carregarRanking(true),
      );
    }

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

      console.log(`🎯 Carregando ranking: ${inicio} a ${fim || "atual"}`);

      const mensagem = forcarColeta
        ? config.MESSAGES.LOADING_COLETA
        : config.MESSAGES.LOADING_RANKING;
      container.innerHTML = window.LuvaDeOuroUI.mostrarLoading(mensagem);

      let dados = null;
      if (!forcarColeta) {
        dados = window.LuvaDeOuroCache.get("ranking", { inicio, fim });
      }

      if (!dados) {
        dados = await window.LuvaDeOuroCore.buscarRankingGoleiros(
          inicio,
          fim,
          forcarColeta,
        );
        window.LuvaDeOuroCache.set("ranking", { inicio, fim }, dados);
      }

      // ✅ BUSCAR ESCUDOS CORRETOS ANTES DE RENDERIZAR
      console.log("[LUVA-ORQ] 🎨 Buscando escudos corretos...");
      const escudosParticipantes =
        await window.LuvaDeOuroUtils.buscarEscudosParticipantes();

      if (escudosParticipantes) {
        console.log("[LUVA-ORQ] ✅ Aplicando escudos ao ranking...");
        dados.ranking = dados.ranking.map((item) => ({
          ...item,
          clubeId:
            escudosParticipantes[item.participanteId] ||
            item.clubeId ||
            "default",
        }));
      }

      this.estado.ranking = dados;
      container.innerHTML = window.LuvaDeOuroUI.renderizarRanking(dados);

      if (exportContainer && dados.ranking && dados.ranking.length > 0) {
        exportContainer.innerHTML = window.LuvaDeOuroUI.criarBotaoExport();
        this.configurarExportacao(dados);
      }

      console.log("✅ Ranking carregado com escudos corretos");
    } catch (error) {
      console.error("❌ Erro ao carregar ranking:", error);
      this.mostrarErro(error.message);
    } finally {
      this.estado.carregando = false;
    }
  },

  async detectarUltimaRodada() {
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

      const deteccao = await window.LuvaDeOuroCore.detectarUltimaRodada();
      this.estado.rodadaDetectada = deteccao;

      if (fimInput) {
        fimInput.value = deteccao.recomendacao;
      }

      if (infoContainer) {
        infoContainer.innerHTML = `<strong>Rodada atual:</strong> ${deteccao.rodadaAtualCartola} | <strong>Mercado:</strong> ${deteccao.mercadoFechado ? "Fechado" : "Aberto"} | <strong>Recomendado:</strong> até rodada ${deteccao.recomendacao}`;
      }

      setTimeout(() => this.carregarRanking(false), 500);
      console.log("✅ Rodada detectada");
    } catch (error) {
      console.error("❌ Erro ao detectar rodada:", error);
    }
  },

  configurarExportacao(dados) {
    const config = window.LuvaDeOuroConfig;
    const btnExport = document.getElementById(
      config.SELECTORS.BTN_EXPORT.substring(1),
    );

    if (!btnExport) return;

    // ✅ CORRIGIDO: Chamar exportarRankingGeral do Utils
    btnExport.onclick = () => {
      console.log("[LUVA-ORQ] 🖼️ Exportando ranking geral...");
      window.LuvaDeOuroUtils.exportarRankingGeral(dados);
    };
  },

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

      let dados = window.LuvaDeOuroCache.get("detalhes", {
        participanteId,
        inicio,
        fim,
      });

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

      window.LuvaDeOuroUtils.criarModalDetalhes(dados);
    } catch (error) {
      console.error("❌ Erro ao buscar detalhes:", error);
      alert(
        `Erro ao carregar detalhes de ${participanteNome}: ${error.message}`,
      );
    }
  },

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

window.LuvaDeOuroOrquestrador = LuvaDeOuroOrquestrador;

console.log("✅ [LUVA-ORQUESTRADOR] Módulo carregado");
