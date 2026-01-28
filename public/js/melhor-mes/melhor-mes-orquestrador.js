// MELHOR DO MÊS - ORQUESTRADOR v1.4
// public/js/melhor-mes/melhor-mes-orquestrador.js
// v1.4: FIX CRÍTICO - Verifica aguardandoDados e mostra UI apropriada

// ✅ IMPORTS DOS MÓDULOS
let MelhorMesConfig, MelhorMesCore, MelhorMesUI;

try {
  if (!window.__melhorMesModulosCarregados) {
    console.log("[MELHOR-MES-ORQUESTRADOR] Carregando módulos...");
  }
} catch (e) {
  console.warn("[MELHOR-MES-ORQUESTRADOR] Erro inicial:", e);
}

console.log("[MELHOR-MES-ORQUESTRADOR] Inicializando orquestrador...");

// Classe orquestradora
export class MelhorMesOrquestrador {
  constructor() {
    this.core = null;
    this.ui = null;
    this.inicializado = false;
    this.ligaId = null;
    this.dadosProcessados = null;
  }

  // CARREGAR MÓDULOS
  async carregarModulos() {
    if (window.__melhorMesModulosCarregados) {
      MelhorMesConfig = window.MelhorMesConfig;
      MelhorMesCore = window.MelhorMesCore;
      MelhorMesUI = window.MelhorMesUI;
    } else {
      try {
        const configModule = await import("./melhor-mes-config.js");
        const coreModule = await import("./melhor-mes-core.js");
        const uiModule = await import("./melhor-mes-ui.js");

        MelhorMesConfig = configModule.MelhorMesConfig;
        MelhorMesCore = coreModule.MelhorMesCore;
        MelhorMesUI = uiModule.MelhorMesUI;

        // Expor globalmente
        window.MelhorMesConfig = MelhorMesConfig;
        window.MelhorMesCore = MelhorMesCore;
        window.MelhorMesUI = MelhorMesUI;
        window.__melhorMesModulosCarregados = true;
      } catch (error) {
        console.error(
          "[MELHOR-MES-ORQUESTRADOR] Erro ao carregar módulos:",
          error,
        );
        throw error;
      }
    }

    // Instanciar após carregar
    if (MelhorMesCore && !this.core) {
      this.core = new MelhorMesCore();
    }
    // ✅ SEMPRE criar nova instância de UI para garantir estado limpo
    if (MelhorMesUI) {
      this.ui = new MelhorMesUI();
    }
  }

  // INICIALIZAÇÃO PRINCIPAL
  async inicializar() {
    try {
      console.log(
        "[MELHOR-MES-ORQUESTRADOR] Inicializando sistema completo...",
      );

      // Carregar módulos primeiro
      await this.carregarModulos();

      // Obter ligaId
      const urlParams = new URLSearchParams(window.location.search);
      this.ligaId = urlParams.get("id");

      if (!this.ligaId) {
        throw new Error("ID da liga não encontrado na URL");
      }

      // Mostrar loading
      if (this.ui?.mostrarLoading) {
        this.ui.mostrarLoading();
      }

      // ✅ SE JÁ INICIALIZADO, APENAS RE-RENDERIZAR UI
      if (this.inicializado && this.dadosProcessados) {
        console.log(
          "[MELHOR-MES-ORQUESTRADOR] Re-renderizando UI com dados em cache...",
        );
        if (this.ui?.renderizar) {
          this.ui.renderizar(this.dadosProcessados);
        }
        console.log("[MELHOR-MES-ORQUESTRADOR] ✅ UI re-renderizada");
        return this.dadosProcessados;
      }

      // Carregar dados do core (primeira vez)
      let dadosProcessados = null;
      if (this.core?.inicializar) {
        dadosProcessados = await this.core.inicializar(this.ligaId);
      } else if (this.core?.calcularMelhorMes) {
        dadosProcessados = await this.core.calcularMelhorMes(this.ligaId);
      }

      // Guardar dados para re-uso
      this.dadosProcessados = dadosProcessados;

      // v1.4: Se aguardando dados, mostrar UI especial
      if (dadosProcessados?.aguardandoDados) {
        console.log("[MELHOR-MES-ORQUESTRADOR] 🕐 Aguardando início do campeonato");
        this.renderizarAguardandoDados();
        this.inicializado = true;
        return dadosProcessados;
      }

      // Renderizar interface
      if (this.ui?.renderizar && dadosProcessados) {
        this.ui.renderizar(dadosProcessados);
      }

      this.inicializado = true;

      console.log(
        "[MELHOR-MES-ORQUESTRADOR] ✅ Sistema inicializado com sucesso",
      );
      return dadosProcessados;
    } catch (error) {
      console.error(
        "[MELHOR-MES-ORQUESTRADOR] ❌ Erro na inicialização:",
        error,
      );
      if (this.ui?.mostrarErro) {
        this.ui.mostrarErro(`Erro ao carregar sistema: ${error.message}`);
      }
      throw error;
    }
  }

  // SELECIONAR EDIÇÃO
  async selecionarEdicao(index) {
    try {
      if (!this.inicializado) {
        await this.inicializar();
      }

      if (this.ui?.selecionarEdicao) {
        this.ui.selecionarEdicao(index, false);
      }
    } catch (error) {
      console.error(
        "[MELHOR-MES-ORQUESTRADOR] Erro ao selecionar edição:",
        error,
      );
    }
  }

  // ATUALIZAR SISTEMA
  async atualizarSistema() {
    try {
      console.log("[MELHOR-MES-ORQUESTRADOR] Atualizando sistema...");

      if (this.ui?.mostrarLoading) {
        this.ui.mostrarLoading();
      }

      let novosDados = null;
      if (this.core?.atualizarDados) {
        novosDados = await this.core.atualizarDados();
      } else if (this.core?.calcularMelhorMes) {
        novosDados = await this.core.calcularMelhorMes(this.ligaId);
      }

      // Atualizar cache local
      this.dadosProcessados = novosDados;

      if (this.ui?.atualizar && novosDados) {
        this.ui.atualizar(novosDados);
      } else if (this.ui?.renderizar && novosDados) {
        this.ui.renderizar(novosDados);
      }

      console.log("[MELHOR-MES-ORQUESTRADOR] Sistema atualizado com sucesso");
    } catch (error) {
      console.error("[MELHOR-MES-ORQUESTRADOR] Erro ao atualizar:", error);
      if (this.ui?.mostrarErro) {
        this.ui.mostrarErro("Erro ao atualizar dados");
      }
    }
  }

  // OBTER VENCEDORES PARA OUTROS MÓDULOS
  async obterVencedores() {
    try {
      if (!this.inicializado) {
        await this.inicializar();
      }

      if (this.core?.obterVencedores) {
        return this.core.obterVencedores();
      }
      return [];
    } catch (error) {
      console.error(
        "[MELHOR-MES-ORQUESTRADOR] Erro ao obter vencedores:",
        error,
      );
      return [];
    }
  }

  // v1.4: Renderizar UI de aguardando dados
  renderizarAguardandoDados() {
    const container = document.getElementById("melhorMesContent") ||
                       document.getElementById("modulo-content") ||
                       document.getElementById("dynamic-content-area");

    if (!container) {
      console.warn("[MELHOR-MES-ORQUESTRADOR] Container não encontrado para UI de aguardando");
      return;
    }

    container.innerHTML = `
      <div class="melhor-mes-aguardando" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
        border-radius: 16px;
        border: 1px solid rgba(255, 136, 0, 0.2);
        min-height: 300px;
        margin: 20px;
      ">
        <span class="material-icons" style="
          font-size: 64px;
          color: var(--laranja, #ff8800);
          margin-bottom: 20px;
        ">emoji_events</span>
        <h2 style="
          font-family: 'Russo One', sans-serif;
          color: white;
          font-size: 24px;
          margin-bottom: 12px;
        ">Aguardando Início do Campeonato</h2>
        <p style="
          color: rgba(255, 255, 255, 0.7);
          font-size: 16px;
          max-width: 400px;
          line-height: 1.5;
        ">
          O ranking de Melhor do Mês será atualizado assim que as primeiras rodadas forem concluídas.
        </p>
      </div>
    `;
  }

  // DIAGNÓSTICO COMPLETO
  diagnosticar() {
    const diagnostico = {
      orquestrador: {
        inicializado: this.inicializado,
        ligaId: this.ligaId,
        coreCarregado: !!this.core,
        uiCarregado: !!this.ui,
        temDadosProcessados: !!this.dadosProcessados,
      },
      modulos: {
        MelhorMesConfig: !!MelhorMesConfig,
        MelhorMesCore: !!MelhorMesCore,
        MelhorMesUI: !!MelhorMesUI,
        globais: !!window.__melhorMesModulosCarregados,
      },
    };

    console.log("[MELHOR-MES-ORQUESTRADOR] Diagnóstico:", diagnostico);
    return diagnostico;
  }

  // FORÇAR REINICIALIZAÇÃO
  async forcarReinicializacao() {
    console.log("[MELHOR-MES-ORQUESTRADOR] Forçando reinicialização...");
    this.inicializado = false;
    this.dadosProcessados = null;
    return await this.inicializar();
  }
}

// INSTÂNCIA SINGLETON DO ORQUESTRADOR
export const melhorMesOrquestrador = new MelhorMesOrquestrador();

// FUNÇÕES DE CONVENIÊNCIA
export async function inicializarMelhorMes() {
  return await melhorMesOrquestrador.inicializar();
}

export async function getResultadosMelhorMes() {
  return await melhorMesOrquestrador.obterVencedores();
}

export async function selecionarEdicao(index) {
  return await melhorMesOrquestrador.selecionarEdicao(index);
}

export async function atualizarMelhorMes() {
  return await melhorMesOrquestrador.atualizarSistema();
}

// EXPOR GLOBALMENTE
if (typeof window !== "undefined") {
  window.melhorMesOrquestrador = melhorMesOrquestrador;
  window.inicializarMelhorMes = inicializarMelhorMes;

  window.melhorMesOrquestradorDebug = {
    orquestrador: melhorMesOrquestrador,
    diagnosticar: () => melhorMesOrquestrador.diagnosticar(),
    forcarReinicio: () => melhorMesOrquestrador.forcarReinicializacao(),
    selecionarEdicao: (index) => melhorMesOrquestrador.selecionarEdicao(index),
    atualizarSistema: () => melhorMesOrquestrador.atualizarSistema(),
  };
}

console.log("[MELHOR-MES-ORQUESTRADOR] ✅ Orquestrador carregado");
