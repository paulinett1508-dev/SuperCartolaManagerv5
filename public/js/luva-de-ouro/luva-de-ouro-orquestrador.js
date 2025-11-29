// LUVA DE OURO ORQUESTRADOR - Coordenação do módulo (REFATORADO)
// Carregamento automático + integração com super cache

console.log("🎯 [LUVA-ORQ] Módulo orquestrador carregando...");

const LuvaDeOuroOrquestrador = {
  // Estado interno
  estado: {
    ranking: null,
    rodadaAtual: null,
    mercadoAberto: false,
    rodadaSelecionada: null,
    rodadasComDados: [],
    carregando: false,
    inicializado: false,
  },

  // ==============================
  // INICIALIZAÇÃO AUTOMÁTICA
  // ==============================

  async inicializar() {
    console.log("🥅 [LUVA-ORQ] Inicializando módulo...");

    // SEMPRE resetar estado ao inicializar
    this.resetEstado();

    try {
      const config = window.LuvaDeOuroConfig;
      const container = document.getElementById("luvaDeOuroContent");

      if (!container) {
        console.error("❌ [LUVA-ORQ] Container não encontrado");
        return;
      }

      // Renderizar layout principal
      container.innerHTML = window.LuvaDeOuroUI.criarLayoutPrincipal();

      // Detectar status do mercado
      await this.detectarStatusMercado();

      // Configurar navegação de rodadas
      window.LuvaDeOuroUI.configurarNavegacao(
        this.estado.rodadaAtual,
        this.estado.mercadoAberto,
      );

      // Carregar ranking automaticamente
      await this.carregarRanking(false);

      this.estado.inicializado = true;
      console.log("✅ [LUVA-ORQ] Módulo inicializado com sucesso");
    } catch (error) {
      console.error("❌ [LUVA-ORQ] Erro na inicialização:", error);
      window.LuvaDeOuroUI.mostrarErro(
        "Erro ao inicializar módulo",
        error.message,
      );
    }
  },

  // ==============================
  // DETECÇÃO DE STATUS
  // ==============================

  async detectarStatusMercado() {
    console.log("[LUVA-ORQ] Detectando status do mercado...");

    try {
      const config = window.LuvaDeOuroConfig;
      const response = await fetch(
        config.API.DETECTAR_RODADA(config.LIGA_SOBRAL_ID),
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.estado.rodadaAtual = data.data.rodadaAtualCartola || 36;
        this.estado.mercadoAberto = !data.data.mercadoFechado;

        const statusTexto = this.estado.mercadoAberto
          ? `⏳ Mercado Aberto - Rodada ${this.estado.rodadaAtual}`
          : `🔴 Rodada ${this.estado.rodadaAtual} em andamento`;

        window.LuvaDeOuroUI.atualizarInfoStatus(statusTexto);

        console.log("[LUVA-ORQ] Status detectado:", {
          rodadaAtual: this.estado.rodadaAtual,
          mercadoAberto: this.estado.mercadoAberto,
        });
      }
    } catch (error) {
      console.error("[LUVA-ORQ] Erro ao detectar status:", error);
      // Fallback
      this.estado.rodadaAtual = 36;
      this.estado.mercadoAberto = false;
      window.LuvaDeOuroUI.atualizarInfoStatus("⚠️ Status indisponível");
    }
  },

  // ==============================
  // CARREGAMENTO DE RANKING
  // ==============================

  async carregarRanking(forcarColeta = false) {
    if (this.estado.carregando) {
      console.log("[LUVA-ORQ] Carregamento já em andamento...");
      return;
    }

    this.estado.carregando = true;
    console.log(`[LUVA-ORQ] Carregando ranking... (forçar: ${forcarColeta})`);

    try {
      window.LuvaDeOuroUI.mostrarLoading(
        forcarColeta ? "Coletando dados da API..." : "Carregando ranking...",
      );

      const config = window.LuvaDeOuroConfig;
      const rodadaFim = this.estado.mercadoAberto
        ? Math.max(1, this.estado.rodadaAtual - 1)
        : this.estado.rodadaAtual;

      // Tentar cache primeiro (se não forçar coleta)
      let dados = null;
      if (!forcarColeta && window.LuvaDeOuroCache) {
        dados = await window.LuvaDeOuroCache.get("ranking", {
          inicio: 1,
          fim: rodadaFim,
        });
      }

      if (!dados) {
        // Buscar da API
        const params = new URLSearchParams({
          inicio: "1",
          fim: rodadaFim.toString(),
          ...(forcarColeta && { forcar_coleta: "true" }),
        });

        const response = await fetch(
          `${config.API.RANKING(config.LIGA_SOBRAL_ID)}?${params}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Erro ao buscar ranking");
        }

        dados = result.data;

        // Salvar no cache
        if (window.LuvaDeOuroCache) {
          await window.LuvaDeOuroCache.set(
            "ranking",
            { inicio: 1, fim: rodadaFim },
            dados,
          );
        }
      }

      // Atualizar estado
      this.estado.ranking = dados;

      // Renderizar ranking
      window.LuvaDeOuroUI.renderizarRanking(dados);

      console.log(
        "✅ [LUVA-ORQ] Ranking carregado:",
        dados.ranking?.length,
        "participantes",
      );
    } catch (error) {
      console.error("❌ [LUVA-ORQ] Erro ao carregar ranking:", error);
      window.LuvaDeOuroUI.mostrarErro(
        "Erro ao carregar ranking",
        error.message,
      );
    } finally {
      this.estado.carregando = false;
    }
  },

  identificarRodadasComDados(dados) {
    if (!dados || !dados.rodadaFim) return [];

    const rodadas = [];
    for (let i = 1; i <= dados.rodadaFim; i++) {
      rodadas.push(i);
    }
    return rodadas;
  },

  // ==============================
  // DETALHES DO PARTICIPANTE
  // ==============================

  async mostrarDetalhes(participanteId, participanteNome) {
    console.log(
      `[LUVA-ORQ] Mostrando detalhes de ${participanteNome} (${participanteId})`,
    );

    try {
      const config = window.LuvaDeOuroConfig;
      const rodadaFim = this.estado.mercadoAberto
        ? Math.max(1, this.estado.rodadaAtual - 1)
        : this.estado.rodadaAtual;

      // Verificar cache
      let dados = null;
      if (window.LuvaDeOuroCache) {
        dados = await window.LuvaDeOuroCache.get("detalhes", {
          participanteId,
          inicio: 1,
          fim: rodadaFim,
        });
      }

      if (!dados) {
        // Buscar da API
        const url = `${config.API.DETALHES_PARTICIPANTE(config.LIGA_SOBRAL_ID, participanteId)}?inicio=1&fim=${rodadaFim}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Erro ao buscar detalhes");
        }

        dados = result.data;

        // Salvar no cache
        if (window.LuvaDeOuroCache) {
          await window.LuvaDeOuroCache.set(
            "detalhes",
            {
              participanteId,
              inicio: 1,
              fim: rodadaFim,
            },
            dados,
          );
        }
      }

      // Usar o modal do Utils
      if (window.LuvaDeOuroUtils?.criarModalDetalhes) {
        window.LuvaDeOuroUtils.criarModalDetalhes(dados);
      } else {
        console.error(
          "[LUVA-ORQ] LuvaDeOuroUtils.criarModalDetalhes não disponível",
        );
        alert(
          `Detalhes de ${participanteNome}: ${dados.totalPontos} pontos em ${dados.totalRodadas} rodadas`,
        );
      }
    } catch (error) {
      console.error("[LUVA-ORQ] Erro ao carregar detalhes:", error);
      alert(
        `Erro ao carregar detalhes de ${participanteNome}: ${error.message}`,
      );
    }
  },

  // ==============================
  // RESET DE ESTADO
  // ==============================

  resetEstado() {
    console.log("[LUVA-ORQ] Resetando estado...");

    this.estado = {
      ranking: null,
      rodadaAtual: null,
      mercadoAberto: false,
      rodadaSelecionada: null,
      rodadasComDados: [],
      carregando: false,
      inicializado: false,
    };

    // Limpar cache de elementos do UI
    if (window.LuvaDeOuroUI?.limparCacheUI) {
      window.LuvaDeOuroUI.limparCacheUI();
    }

    console.log("[LUVA-ORQ] Estado resetado");
  },
};

// Exportar para window
window.LuvaDeOuroOrquestrador = LuvaDeOuroOrquestrador;

console.log("✅ [LUVA-ORQ] Módulo carregado com carregamento automático");
