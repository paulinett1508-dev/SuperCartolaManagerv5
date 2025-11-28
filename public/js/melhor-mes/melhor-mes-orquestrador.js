// MELHOR DO MÊS - ORQUESTRADOR v1.1 - EXPORTAÇÃO CORRIGIDA
// public/js/melhor-mes/melhor-mes-orquestrador.js

// ✅ EVITAR REIMPORTAÇÃO SE JÁ FOI CARREGADO
let MelhorMesConfig, MelhorMesCore, MelhorMesUI;

if (!window.__melhorMesModulosCarregados) {
  const configModule = await import("./melhor-mes-config.js");
  const coreModule = await import("./melhor-mes-core.js");
  const uiModule = await import("./melhor-mes-ui.js");

  MelhorMesConfig = configModule.MelhorMesConfig;
  MelhorMesCore = coreModule.MelhorMesCore;
  MelhorMesUI = uiModule.MelhorMesUI;

  window.__melhorMesModulosCarregados = true;
} else {
  // Reusar os módulos já carregados
  MelhorMesConfig = window.MelhorMesConfig;
  MelhorMesCore = window.MelhorMesCore;
  MelhorMesUI = window.MelhorMesUI;
}

console.log("[MELHOR-MES-ORQUESTRADOR] Inicializando orquestrador...");

// ✅ EXPOR CLASSES GLOBALMENTE PARA EVITAR REDECLARAÇÃO
window.MelhorMesConfig = MelhorMesConfig;
window.MelhorMesCore = MelhorMesCore;
window.MelhorMesUI = MelhorMesUI;

// Classe orquestradora
export class MelhorMesOrquestrador {
  constructor() {
    this.core = melhorMesCore;
    this.ui = new MelhorMesUI();
    this.inicializado = false;
    this.exportsCarregados = false;
    this.exportFunctions = {};
  }

  // INICIALIZAÇÃO PRINCIPAL
  async inicializar() {
    if (this.inicializado) {
      console.log("[MELHOR-MES-ORQUESTRADOR] Sistema já inicializado");
      return this.core.dadosProcessados;
    }

    try {
      console.log(
        "[MELHOR-MES-ORQUESTRADOR] Inicializando sistema completo...",
      );

      // Mostrar loading
      this.ui.mostrarLoading();

      // Carregar dados do core
      const dadosProcessados = await this.core.inicializar();

      // Renderizar interface
      this.ui.renderizar(dadosProcessados);

      // Carregar sistema de exports E EXPOR GLOBALMENTE
      await this.carregarExports();

      this.inicializado = true;

      console.log("[MELHOR-MES-ORQUESTRADOR] Sistema inicializado com sucesso");
      return dadosProcessados;
    } catch (error) {
      console.error("[MELHOR-MES-ORQUESTRADOR] Erro na inicialização:", error);
      this.ui.mostrarErro(`Erro ao carregar sistema: ${error.message}`);
      throw error;
    }
  }

  // CARREGAR SISTEMA DE EXPORTS - DESABILITADO (usar módulo Relatórios)
  async carregarExports() {
    console.log("[MELHOR-MES-ORQUESTRADOR] Sistema de exports desabilitado (usar Relatórios)");
    this.exportsCarregados = true; // Retorna sucesso para não bloquear
    return;
  }

  // SELECIONAR EDIÇÃO
  async selecionarEdicao(index) {
    try {
      if (!this.inicializado) {
        await this.inicializar();
      }

      this.ui.selecionarEdicao(index);
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

      this.ui.mostrarLoading();

      const novosDados = await this.core.atualizarDados();
      this.ui.atualizar(novosDados);

      // Manter edição ativa se ainda válida
      if (this.ui.edicaoAtiva !== null) {
        const dados = novosDados.resultados[this.ui.edicaoAtiva];
        if (dados && dados.ranking.length > 0) {
          this.ui.renderizarTabelaRanking();
        }
      }

      console.log("[MELHOR-MES-ORQUESTRADOR] Sistema atualizado com sucesso");
    } catch (error) {
      console.error("[MELHOR-MES-ORQUESTRADOR] Erro ao atualizar:", error);
      this.ui.mostrarErro("Erro ao atualizar dados");
    }
  }

  // OBTER VENCEDORES PARA OUTROS MÓDULOS
  async obterVencedores() {
    try {
      if (!this.inicializado) {
        await this.inicializar();
      }

      return this.core.obterVencedores();
    } catch (error) {
      console.error(
        "[MELHOR-MES-ORQUESTRADOR] Erro ao obter vencedores:",
        error,
      );
      return [];
    }
  }

  // OBTER DADOS DE EDIÇÃO ESPECÍFICA
  async obterDadosEdicao(index) {
    try {
      if (!this.inicializado) {
        await this.inicializar();
      }

      return await this.core.obterDadosEdicao(index);
    } catch (error) {
      console.error(
        "[MELHOR-MES-ORQUESTRADOR] Erro ao obter dados da edição:",
        error,
      );
      return null;
    }
  }

  // DIAGNÓSTICO COMPLETO
  diagnosticar() {
    const coreStats = this.core.diagnosticar();

    const diagnostico = {
      orquestrador: {
        inicializado: this.inicializado,
        exportsCarregados: this.exportsCarregados,
        edicaoAtiva: this.ui.edicaoAtiva,
        funcoesGlobaisExpostas: {
          criarBotao:
            typeof window.criarBotaoExportacaoMelhorMes === "function",
          exportarImagem:
            typeof window.exportarMelhorMesComoImagem === "function",
        },
      },
      core: coreStats,
      ui: {
        containersEncontrados: Object.keys(this.ui.containers).map((key) => ({
          nome: key,
          id: this.ui.containers[key],
          existe: !!document.getElementById(this.ui.containers[key]),
        })),
      },
      exports: {
        carregados: this.exportsCarregados,
        funcoes: Object.keys(this.exportFunctions),
      },
      configuracao: {
        versao: MELHOR_MES_CONFIG.version,
        totalEdicoes: MELHOR_MES_CONFIG.edicoes.length,
        debug: MELHOR_MES_CONFIG.debug,
      },
    };

    console.group("[MELHOR-MES-ORQUESTRADOR] Diagnóstico Completo");
    console.log("Estado do sistema:", diagnostico);
    console.groupEnd();

    return diagnostico;
  }

  // FORÇAR REINICIALIZAÇÃO
  async forcarReinicializacao() {
    console.log("[MELHOR-MES-ORQUESTRADOR] Forçando reinicialização...");

    this.inicializado = false;
    this.exportsCarregados = false;
    this.exportFunctions = {};

    // Limpar funções globais
    delete window.criarBotaoExportacaoMelhorMes;
    delete window.exportarMelhorMesComoImagem;

    return await this.inicializar();
  }

  // VERIFICAR ESTADO DO SISTEMA
  verificarEstado() {
    const estado = {
      status: this.inicializado ? "ativo" : "inativo",
      dadosCarregados: !!this.core.dadosProcessados,
      interfaceRenderizada: !!document.getElementById(
        this.ui.containers.select,
      ),
      exportsDisponiveis: this.exportsCarregados,
      funcoesGlobais: {
        criarBotao: typeof window.criarBotaoExportacaoMelhorMes === "function",
        exportarImagem:
          typeof window.exportarMelhorMesComoImagem === "function",
      },
      edicaoAtiva: this.ui.edicaoAtiva,
      timestamp: new Date().toISOString(),
    };

    return estado;
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

// DEBUG FUNCTIONS
if (MELHOR_MES_CONFIG.debug) {
  window.melhorMesOrquestradorDebug = {
    orquestrador: melhorMesOrquestrador,
    diagnosticar: () => melhorMesOrquestrador.diagnosticar(),
    verificarEstado: () => melhorMesOrquestrador.verificarEstado(),
    forcarReinicio: () => melhorMesOrquestrador.forcarReinicializacao(),
    selecionarEdicao: (index) => melhorMesOrquestrador.selecionarEdicao(index),
    atualizarSistema: () => melhorMesOrquestrador.atualizarSistema(),
  };
}

console.log("[MELHOR-MES-ORQUESTRADOR] ✅ Orquestrador carregado");
console.log("[MELHOR-MES-ORQUESTRADOR] 🏗️ Arquitetura modular implementada");
console.log(
  "[MELHOR-MES-ORQUESTRADOR] 🔧 Debug functions disponíveis em window.melhorMesOrquestradorDebug",
);
// MELHOR MÊS ORQUESTRADOR
// Coordena cache, core e UI

// Classe orquestradora
class MelhorMesOrquestradorV2 {
    constructor() {
        // Use as classes globais que já foram importadas
        this.config = new window.MelhorMesConfig();
        this.core = new window.MelhorMesCore();
        this.ui = new window.MelhorMesUI();
    }

    async inicializar(ligaId) {
        console.log('[MELHOR-MÊS-ORQUESTRADOR-V2] 🚀 Inicializando para liga:', ligaId);
        this.ligaId = ligaId;
    }

    async carregarMelhorMes() {
        try {
            console.log('[MELHOR-MÊS-ORQUESTRADOR-V2] 📊 Carregando dados...');

            const dados = await this.core.calcularMelhorMes(this.ligaId);
            await this.ui.renderizar(dados);

            console.log('[MELHOR-MÊS-ORQUESTRADOR-V2] ✅ Dados carregados');
        } catch (error) {
            console.error('[MELHOR-MÊS-ORQUESTRADOR-V2] ❌ Erro:', error);
            throw error;
        }
    }
}

// Apenas exporta a nova instância se os módulos já foram carregados globalmente
if (window.__melhorMesModulosCarregados) {
  window.melhorMesOrquestradorV2 = new MelhorMesOrquestradorV2();
  console.log('[MELHOR-MÊS-ORQUESTRADOR-V2] ✅ Carregado e exportado globalmente');
}