// =============================================
// LUVA DE OURO - SCHEDULER DE COLETA AUTOMÁTICA (v2.0 SaaS)
// =============================================
// ✅ v2.0: Removido liga ID hardcoded - obtém da URL dinamicamente
// Coleta dados de goleiros automaticamente:
// - Mercado fechado: coleta parciais a cada 5 minutos
// - Mercado abre: consolida rodada anterior
// =============================================

console.log("⏰ [LUVA-SCHEDULER] Módulo de agendamento v2.0 SaaS carregando...");

const LuvaDeOuroScheduler = {
  // Configurações
  config: {
    intervaloVerificacao: 5 * 60 * 1000, // 5 minutos
    intervaloColeta: 5 * 60 * 1000, // 5 minutos durante rodada
    // v2.0: ligaId obtido dinamicamente
    getLigaId: function() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("id");
    },
  },

  // Estado
  estado: {
    ativo: false,
    ultimaVerificacao: null,
    ultimaColeta: null,
    rodadaAtual: null,
    mercadoAberto: null,
    intervalId: null,
  },

  // ==============================
  // INICIALIZAÇÃO
  // ==============================

  iniciar() {
    if (this.estado.ativo) {
      console.log("[LUVA-SCHEDULER] Já está ativo");
      return;
    }

    console.log("⏰ [LUVA-SCHEDULER] Iniciando scheduler...");
    this.estado.ativo = true;

    // Verificar imediatamente
    this.verificarEColetar();

    // Agendar verificações periódicas
    this.estado.intervalId = setInterval(() => {
      this.verificarEColetar();
    }, this.config.intervaloVerificacao);

    console.log(
      `✅ [LUVA-SCHEDULER] Ativo - verificando a cada ${this.config.intervaloVerificacao / 60000} minutos`,
    );
  },

  parar() {
    if (this.estado.intervalId) {
      clearInterval(this.estado.intervalId);
      this.estado.intervalId = null;
    }
    this.estado.ativo = false;
    console.log("⏹️ [LUVA-SCHEDULER] Parado");
  },

  // ==============================
  // VERIFICAÇÃO E COLETA
  // ==============================

  async verificarEColetar() {
    console.log("🔍 [LUVA-SCHEDULER] Verificando status do mercado...");
    this.estado.ultimaVerificacao = new Date();

    try {
      // Buscar status do mercado
      const response = await fetch("/api/cartola/mercado/status");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const status = await response.json();
      const rodadaAtual = status.rodada_atual;
      const mercadoAberto = status.mercado_aberto;

      console.log(
        `📊 [LUVA-SCHEDULER] Rodada: ${rodadaAtual}, Mercado: ${mercadoAberto ? "ABERTO" : "FECHADO"}`,
      );

      // Detectar mudança de estado (mercado fechou → abriu)
      const mercadoAcabouDeAbrir =
        this.estado.mercadoAberto === false && mercadoAberto === true;

      // Atualizar estado
      const rodadaAnterior = this.estado.rodadaAtual;
      this.estado.rodadaAtual = rodadaAtual;
      this.estado.mercadoAberto = mercadoAberto;

      // Se mercado acabou de abrir, consolidar rodada anterior
      if (mercadoAcabouDeAbrir && rodadaAnterior) {
        console.log(
          `🏁 [LUVA-SCHEDULER] Mercado abriu! Consolidando rodada ${rodadaAnterior}...`,
        );
        await this.consolidarRodada(rodadaAnterior);
      }

      // Se mercado fechado (rodada em andamento), coletar parciais
      if (!mercadoAberto) {
        await this.coletarParciais(rodadaAtual);
      } else {
        console.log(
          "⏸️ [LUVA-SCHEDULER] Mercado aberto - aguardando início da rodada",
        );
      }
    } catch (error) {
      console.error("❌ [LUVA-SCHEDULER] Erro na verificação:", error.message);
    }
  },

  // ==============================
  // COLETA DE PARCIAIS
  // ==============================

  async coletarParciais(rodada) {
    console.log(
      `📥 [LUVA-SCHEDULER] Coletando parciais da rodada ${rodada}...`,
    );

    try {
      const ligaId = this.config.getLigaId();
      if (!ligaId) {
        console.warn("[LUVA-SCHEDULER] ⚠️ Liga ID não encontrado na URL");
        return;
      }
      const url = `/api/luva-de-ouro/${ligaId}/coletar?inicio=${rodada}&fim=${rodada}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      this.estado.ultimaColeta = new Date();

      if (result.success) {
        console.log(
          `✅ [LUVA-SCHEDULER] Parciais coletadas: ${result.data?.totalColetados || 0} registros`,
        );

        // Limpar cache para forçar atualização na UI
        this.limparCache();

        // Notificar UI se disponível
        this.notificarAtualizacao(rodada, "parcial");
      } else {
        console.warn("⚠️ [LUVA-SCHEDULER] Coleta retornou erro:", result.error);
      }
    } catch (error) {
      console.error(
        "❌ [LUVA-SCHEDULER] Erro ao coletar parciais:",
        error.message,
      );
    }
  },

  // ==============================
  // CONSOLIDAÇÃO DE RODADA
  // ==============================

  async consolidarRodada(rodada) {
    console.log(
      `🏆 [LUVA-SCHEDULER] Consolidando rodada ${rodada} como definitiva...`,
    );

    try {
      const ligaId = this.config.getLigaId();
      if (!ligaId) {
        console.warn("[LUVA-SCHEDULER] ⚠️ Liga ID não encontrado na URL");
        return;
      }
      // Fazer uma última coleta para garantir dados finais
      const url = `/api/luva-de-ouro/${ligaId}/coletar?inicio=${rodada}&fim=${rodada}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();

      if (result.success) {
        console.log(
          `✅ [LUVA-SCHEDULER] Rodada ${rodada} consolidada com sucesso`,
        );

        // Limpar cache para forçar busca de dados atualizados
        this.limparCache();

        // Notificar UI
        this.notificarAtualizacao(rodada, "consolidada");
      }
    } catch (error) {
      console.error(
        "❌ [LUVA-SCHEDULER] Erro ao consolidar rodada:",
        error.message,
      );
    }
  },

  // ==============================
  // UTILITÁRIOS
  // ==============================

  limparCache() {
    try {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith("luva_cache_"),
      );
      keys.forEach((key) => localStorage.removeItem(key));
      console.log(`🧹 [LUVA-SCHEDULER] Cache limpo: ${keys.length} itens`);
    } catch (e) {
      // Silencioso
    }
  },

  notificarAtualizacao(rodada, tipo) {
    // Disparar evento customizado para UI reagir
    const evento = new CustomEvent("luva-de-ouro-atualizado", {
      detail: { rodada, tipo, timestamp: new Date() },
    });
    window.dispatchEvent(evento);

    // Se orquestrador disponível, recarregar ranking
    if (window.LuvaDeOuroOrquestrador?.carregarRanking) {
      console.log(
        "🔄 [LUVA-SCHEDULER] Notificando orquestrador para atualizar...",
      );
      window.LuvaDeOuroOrquestrador.carregarRanking(false);
    }
  },

  // ==============================
  // STATUS
  // ==============================

  getStatus() {
    return {
      ativo: this.estado.ativo,
      rodadaAtual: this.estado.rodadaAtual,
      mercadoAberto: this.estado.mercadoAberto,
      ultimaVerificacao: this.estado.ultimaVerificacao,
      ultimaColeta: this.estado.ultimaColeta,
      proximaVerificacao: this.estado.ativo
        ? new Date(Date.now() + this.config.intervaloVerificacao)
        : null,
    };
  },

  // Forçar coleta manual
  async forcarColeta() {
    console.log("🔄 [LUVA-SCHEDULER] Forçando coleta manual...");
    await this.verificarEColetar();
  },
};

// Exportar para window
window.LuvaDeOuroScheduler = LuvaDeOuroScheduler;

// Auto-iniciar quando módulo carrega (se estiver na página do Luva de Ouro)
document.addEventListener("DOMContentLoaded", () => {
  // Verificar se estamos na página correta
  const isLuvaPage = document.getElementById("luvaDeOuroContent") !== null;

  if (isLuvaPage) {
    // Aguardar um pouco para outros módulos carregarem
    setTimeout(() => {
      LuvaDeOuroScheduler.iniciar();
    }, 2000);
  }
});

console.log("✅ [LUVA-SCHEDULER] Módulo carregado");
console.log(
  "💡 Comandos: LuvaDeOuroScheduler.iniciar(), .parar(), .forcarColeta(), .getStatus()",
);
