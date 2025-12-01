// =============================================
// PARCIAIS - SCHEDULER DE ATUALIZAÇÃO AUTOMÁTICA
// =============================================
// Atualiza parciais automaticamente:
// - Mercado fechado: atualiza a cada 5 minutos
// - Mercado aberto: aguarda início da rodada
// =============================================

console.log("⏰ [PARCIAIS-SCHEDULER] Módulo de agendamento carregando...");

const ParciaisScheduler = {
  // Configurações
  config: {
    intervaloVerificacao: 5 * 60 * 1000, // 5 minutos
  },

  // Estado
  estado: {
    ativo: false,
    ultimaAtualizacao: null,
    rodadaAtual: null,
    mercadoAberto: null,
    intervalId: null,
  },

  // ==============================
  // INICIALIZAÇÃO
  // ==============================

  iniciar() {
    if (this.estado.ativo) {
      console.log("[PARCIAIS-SCHEDULER] Já está ativo");
      return;
    }

    console.log("⏰ [PARCIAIS-SCHEDULER] Iniciando scheduler...");
    this.estado.ativo = true;

    // Verificar imediatamente
    this.verificarEAtualizar();

    // Agendar verificações periódicas
    this.estado.intervalId = setInterval(() => {
      this.verificarEAtualizar();
    }, this.config.intervaloVerificacao);

    // Renderizar indicador de status
    this.renderizarIndicador();

    console.log(
      `✅ [PARCIAIS-SCHEDULER] Ativo - atualizando a cada ${this.config.intervaloVerificacao / 60000} minutos`,
    );
  },

  parar() {
    if (this.estado.intervalId) {
      clearInterval(this.estado.intervalId);
      this.estado.intervalId = null;
    }
    this.estado.ativo = false;
    this.removerIndicador();
    console.log("⏹️ [PARCIAIS-SCHEDULER] Parado");
  },

  // ==============================
  // VERIFICAÇÃO E ATUALIZAÇÃO
  // ==============================

  async verificarEAtualizar() {
    console.log("🔍 [PARCIAIS-SCHEDULER] Verificando status do mercado...");

    try {
      // Buscar status do mercado
      const response = await fetch("/api/cartola/mercado/status");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const status = await response.json();
      const rodadaAtual = status.rodada_atual;
      const mercadoAberto = status.mercado_aberto;

      console.log(
        `📊 [PARCIAIS-SCHEDULER] Rodada: ${rodadaAtual}, Mercado: ${mercadoAberto ? "ABERTO" : "FECHADO"}`,
      );

      // Atualizar estado
      this.estado.rodadaAtual = rodadaAtual;
      this.estado.mercadoAberto = mercadoAberto;

      // Se mercado fechado (rodada em andamento), atualizar parciais
      if (!mercadoAberto) {
        await this.atualizarParciais();
      } else {
        console.log(
          "⏸️ [PARCIAIS-SCHEDULER] Mercado aberto - aguardando início da rodada",
        );
      }

      // Atualizar indicador visual
      this.atualizarIndicador();
    } catch (error) {
      console.error(
        "❌ [PARCIAIS-SCHEDULER] Erro na verificação:",
        error.message,
      );
    }
  },

  // ==============================
  // ATUALIZAÇÃO DE PARCIAIS
  // ==============================

  async atualizarParciais() {
    console.log(`🔄 [PARCIAIS-SCHEDULER] Atualizando parciais...`);

    try {
      // Limpar cache para forçar busca fresca
      const urlParams = new URLSearchParams(window.location.search);
      const ligaId = urlParams.get("id");
      const cacheKey = `parciais_${ligaId}`;
      localStorage.removeItem(cacheKey);

      // Chamar função de carregamento do módulo PARCIAIS SEM CACHE
      if (window.carregarParciais) {
        await window.carregarParciais(false); // ✅ false = não usar cache
        this.estado.ultimaAtualizacao = new Date();
        console.log(`✅ [PARCIAIS-SCHEDULER] Parciais atualizadas`);
      } else {
        console.warn(
          "⚠️ [PARCIAIS-SCHEDULER] Função carregarParciais não disponível",
        );
      }
    } catch (error) {
      console.error(
        "❌ [PARCIAIS-SCHEDULER] Erro ao atualizar parciais:",
        error.message,
      );
    }
  },

  // ==============================
  // INDICADOR VISUAL
  // ==============================

  renderizarIndicador() {
    // Remover indicador existente
    this.removerIndicador();

    // Criar indicador
    const indicador = document.createElement("div");
    indicador.id = "parciais-scheduler-indicador";
    indicador.style.cssText = `
      position: fixed;
      bottom: 70px;
      right: 20px;
      background: rgba(30, 58, 95, 0.95);
      color: #fff;
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 9999;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 180px;
    `;

    indicador.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span id="scheduler-status-icon">🔄</span>
        <span id="scheduler-status-text">Inicializando...</span>
      </div>
      <div style="font-size: 10px; color: #87ceeb;">
        <span id="scheduler-ultima">—</span>
      </div>
      <div style="font-size: 10px; color: #aaa;">
        <span id="scheduler-proxima">—</span>
      </div>
    `;

    document.body.appendChild(indicador);
  },

  atualizarIndicador() {
    const statusIcon = document.getElementById("scheduler-status-icon");
    const statusText = document.getElementById("scheduler-status-text");
    const ultimaEl = document.getElementById("scheduler-ultima");
    const proximaEl = document.getElementById("scheduler-proxima");

    if (!statusIcon) return;

    if (this.estado.mercadoAberto) {
      statusIcon.textContent = "⏸️";
      statusText.textContent = "Mercado aberto";
      statusText.style.color = "#ffd700";
    } else {
      statusIcon.textContent = "🔴";
      statusText.textContent = "AO VIVO";
      statusText.style.color = "#4ade80";
    }

    if (this.estado.ultimaAtualizacao) {
      const agora = Date.now();
      const diff = Math.round(
        (agora - this.estado.ultimaAtualizacao.getTime()) / 1000,
      );

      if (diff < 60) {
        ultimaEl.textContent = `Atualizado há ${diff}s`;
      } else {
        ultimaEl.textContent = `Atualizado há ${Math.round(diff / 60)}min`;
      }
    } else {
      ultimaEl.textContent = "Aguardando primeira atualização...";
    }

    // Calcular próxima atualização
    if (this.estado.ativo && !this.estado.mercadoAberto) {
      const proximaEm = Math.round(this.config.intervaloVerificacao / 60000);
      proximaEl.textContent = `Próxima em ~${proximaEm}min`;
    } else if (this.estado.mercadoAberto) {
      proximaEl.textContent = "Aguardando mercado fechar";
    } else {
      proximaEl.textContent = "";
    }

    // Atualizar contador a cada segundo
    this.iniciarContador();
  },

  iniciarContador() {
    // Limpar contador anterior
    if (this._contadorInterval) {
      clearInterval(this._contadorInterval);
    }

    // Atualizar "há X segundos" a cada segundo
    this._contadorInterval = setInterval(() => {
      const ultimaEl = document.getElementById("scheduler-ultima");
      if (!ultimaEl || !this.estado.ultimaAtualizacao) return;

      const agora = Date.now();
      const diff = Math.round(
        (agora - this.estado.ultimaAtualizacao.getTime()) / 1000,
      );

      if (diff < 60) {
        ultimaEl.textContent = `Atualizado há ${diff}s`;
      } else {
        ultimaEl.textContent = `Atualizado há ${Math.round(diff / 60)}min`;
      }
    }, 1000);
  },

  removerIndicador() {
    const indicador = document.getElementById("parciais-scheduler-indicador");
    if (indicador) {
      indicador.remove();
    }
    if (this._contadorInterval) {
      clearInterval(this._contadorInterval);
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
      ultimaAtualizacao: this.estado.ultimaAtualizacao,
      proximaAtualizacao: this.estado.ativo
        ? new Date(Date.now() + this.config.intervaloVerificacao)
        : null,
    };
  },

  // Forçar atualização manual
  async forcarAtualizacao() {
    console.log("🔄 [PARCIAIS-SCHEDULER] Forçando atualização manual...");
    await this.verificarEAtualizar();
  },
};

// Exportar para window
window.ParciaisScheduler = ParciaisScheduler;

// Auto-iniciar quando módulo PARCIAIS estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  // Verificar se estamos na página de parciais
  const isParciais =
    document.getElementById("rankingBody") !== null &&
    window.location.href.includes("parciais");

  if (isParciais) {
    // Aguardar módulo PARCIAIS carregar
    setTimeout(() => {
      ParciaisScheduler.iniciar();
    }, 2000);
  }
});

console.log("✅ [PARCIAIS-SCHEDULER] Módulo carregado");
console.log(
  "💡 Comandos: ParciaisScheduler.iniciar(), .parar(), .forcarAtualizacao(), .getStatus()",
);
