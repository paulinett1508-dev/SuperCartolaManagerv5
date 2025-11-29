// MELHOR DO MÊS - ORQUESTRADOR v1.3 - CORRIGIDO
// public/js/melhor-mes/melhor-mes-orquestrador.js

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
