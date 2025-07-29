// ✅ SISTEMA DE EXPORTAÇÃO - CENTRO COORDENADOR
// 🔧 VERSÃO CORRIGIDA v2.4.2 - FIX CRÍTICO: Detecção inteligente de módulos

console.log("[EXPORT-EXPORTS] 🎯 Centro coordenador de exportações carregado");

// 🔧 FIX: Mapeamento correto de módulos
const moduleMap = {
  "mata-mata": "./export-mata-mata.js",
  "extrato-financeiro": "./export-extrato-financeiro.js",
  "ranking-geral": "./export-ranking-geral.js",
  top10: "./export-top10.js",
  "melhor-mes": "./export-melhor-mes.js",
  "liga-pontos-corridos": "./export-liga-pontos-corridos.js",
  "pontos-corridos": "./export-pontos-corridos.js", // ✅ Módulo correto para funções de pontos corridos
};

// Cache de módulos carregados
const moduleCache = new Map();

// ✅ Carregar módulo com cache
async function loadModule(moduleName) {
  if (moduleCache.has(moduleName)) {
    return moduleCache.get(moduleName);
  }

  try {
    console.log(`[EXPORT-EXPORTS] 📦 Carregando módulo: ${moduleName}`);

    // 🔧 FIX: Verificar se o módulo existe no mapeamento
    if (!moduleMap[moduleName]) {
      throw new Error(`Módulo ${moduleName} não encontrado no mapeamento`);
    }

    const modulePath = moduleMap[moduleName];
    const module = await import(modulePath);

    moduleCache.set(moduleName, module);
    console.log(
      `[EXPORT-EXPORTS] ✅ Módulo ${moduleName} carregado com sucesso`,
    );

    return module;
  } catch (error) {
    console.error(`[EXPORT-EXPORTS] ❌ Erro ao carregar ${moduleName}:`, error);
    throw error;
  }
}

// 🔧 FIX: Executar função de exportação com validações robustas
async function executeExportFunction(moduleName, functionName, ...args) {
  try {
    console.log(
      `[EXPORT-EXPORTS] 🎯 Executando ${functionName} do módulo ${moduleName}`,
    );

    const module = await loadModule(moduleName);

    // 🔧 FIX: Verificar se a função existe no módulo
    if (!module[functionName] || typeof module[functionName] !== "function") {
      // Tentar função alternativa ou padrão
      const alternativeFunctions = [
        `criarBotaoExportacao${moduleName
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join("")}`,
        functionName.replace("ComoImagem", ""),
        `exportar${functionName.replace("exportar", "").replace("ComoImagem", "")}`,
      ];

      let foundFunction = null;
      for (const altFunc of alternativeFunctions) {
        if (module[altFunc] && typeof module[altFunc] === "function") {
          foundFunction = altFunc;
          break;
        }
      }

      if (!foundFunction) {
        console.error(
          `[EXPORT-EXPORTS] 📋 Funções disponíveis no módulo ${moduleName}:`,
          Object.keys(module),
        );
        throw new Error(
          `Função ${functionName} não encontrada no módulo ${moduleName}`,
        );
      }

      console.log(
        `[EXPORT-EXPORTS] 🔄 Usando função alternativa: ${foundFunction}`,
      );
      return await module[foundFunction](...args);
    }

    console.log(`[EXPORT-EXPORTS] ✅ Executando função ${functionName}`);
    return await module[functionName](...args);
  } catch (error) {
    console.error(`[EXPORT-EXPORTS] ❌ Erro em ${functionName}:`, error);
    throw error;
  }
}

// 🔧 NOVO: Função para detectar módulo e função corretos baseado no tipo
function detectarModuloEFuncao(config) {
  const { tipo, customExport } = config || {};

  console.log(`[EXPORT-EXPORTS] 🔍 Detectando módulo para tipo: ${tipo}`);

  // Detecção inteligente baseada no tipo
  if (tipo && tipo.includes("pontos-corridos")) {
    if (tipo === "pontos-corridos-rodada") {
      return {
        moduleName: "pontos-corridos",
        functionName: "criarBotaoExportacaoPontosCorridosRodada",
      };
    } else if (tipo === "pontos-corridos-classificacao") {
      return {
        moduleName: "pontos-corridos",
        functionName: "criarBotaoExportacaoPontosCorridosClassificacao",
      };
    } else {
      return {
        moduleName: "pontos-corridos",
        functionName: "criarBotaoExportacaoPontosCorridos",
      };
    }
  }

  // Detecção para Liga Pontos Corridos
  if (tipo === "liga-pontos-corridos") {
    return {
      moduleName: "liga-pontos-corridos",
      functionName: "criarBotaoExportacaoLigaPontosCorridos",
    };
  }

  // Detecção para outros tipos específicos
  if (tipo === "mata-mata") {
    return {
      moduleName: "mata-mata",
      functionName: "criarBotaoExportacaoMataMata",
    };
  }

  if (tipo === "top10") {
    return {
      moduleName: "top10",
      functionName: "criarBotaoExportacaoTop10",
    };
  }

  if (tipo === "melhor-mes") {
    return {
      moduleName: "melhor-mes",
      functionName: "criarBotaoExportacaoMelhorMes",
    };
  }

  // Padrão: ranking-geral
  return {
    moduleName: "ranking-geral",
    functionName: "criarBotaoExportacaoRankingGeral",
  };
}

// ✅ FUNÇÕES DE EXPORTAÇÃO PRINCIPAIS

// Mata-Mata
export async function exportarMataMataComoImagem(...args) {
  return executeExportFunction(
    "mata-mata",
    "exportarMataMataComoImagem",
    ...args,
  );
}

// Extrato Financeiro
export async function exportarExtratoFinanceiroComoImagem(...args) {
  return executeExportFunction(
    "extrato-financeiro",
    "exportarExtratoFinanceiroComoImagem",
    ...args,
  );
}

// Rankings
export async function exportarRankingGeralComoImagem(...args) {
  return executeExportFunction(
    "ranking-geral",
    "exportarRankingGeralComoImagem",
    ...args,
  );
}

// ✅ FUNÇÃO ESPECÍFICA PARA RODADAS COM ALTA QUALIDADE
export async function exportarRodadaComoImagem(rankings, rodada, tipo = "rodada") {
  // ✅ NOVO: Usar função de alta qualidade para rodadas
  await exportarRodadaAltaQualidade(rankings, rodada, tipo);
}

// 🔧 FIX CRÍTICO: Função inteligente que detecta o módulo correto baseado no tipo
export async function criarBotaoExportacaoRodada(config, ...restArgs) {
  try {
    const { moduleName, functionName } = detectarModuloEFuncao(config);

    console.log(
      `[EXPORT-EXPORTS] 🎯 Direcionando para ${moduleName}.${functionName}`,
    );

    return executeExportFunction(moduleName, functionName, config, ...restArgs);
  } catch (error) {
    console.error("[EXPORT-EXPORTS] ❌ Erro na detecção/execução:", error);

    // Fallback para ranking-geral em caso de erro
    console.log("[EXPORT-EXPORTS] 🔄 Usando fallback para ranking-geral");
    return executeExportFunction(
      "ranking-geral",
      "criarBotaoExportacaoRankingGeral",
      config,
      ...restArgs,
    );
  }
}

// Top 10
export async function exportarTop10ComoImagem(...args) {
  return executeExportFunction("top10", "exportarTop10ComoImagem", ...args);
}

// Melhor do Mês
export async function exportarMelhorMesComoImagem(...args) {
  return executeExportFunction(
    "melhor-mes",
    "exportarMelhorMesComoImagem",
    ...args,
  );
}

// Liga Pontos Corridos
export async function exportarLigaPontosCorridos(...args) {
  return executeExportFunction(
    "liga-pontos-corridos",
    "exportarLigaPontosCorridos",
    ...args,
  );
}

// 🔧 FIX: Pontos Corridos - usar módulo correto 'pontos-corridos'
export async function exportarPontosCorridosRodadaComoImagem(...args) {
  return executeExportFunction(
    "pontos-corridos",
    "exportarPontosCorridosRodadaComoImagem",
    ...args,
  );
}

export async function exportarPontosCorridosClassificacaoComoImagem(...args) {
  return executeExportFunction(
    "pontos-corridos",
    "exportarPontosCorridosClassificacaoComoImagem",
    ...args,
  );
}

export async function exportarPontosCorridosHistoricoComoImagem(...args) {
  return executeExportFunction(
    "pontos-corridos",
    "exportarPontosCorridosHistoricoComoImagem",
    ...args,
  );
}

// 🔧 FIX: Funções adicionais que podem estar sendo importadas por outros módulos
export async function criarBotaoExportacaoMataMata(...args) {
  return executeExportFunction(
    "mata-mata",
    "criarBotaoExportacaoMataMata",
    ...args,
  );
}

export async function criarBotaoExportacaoExtratoFinanceiro(...args) {
  return executeExportFunction(
    "extrato-financeiro",
    "criarBotaoExportacaoExtratoFinanceiro",
    ...args,
  );
}

export async function criarBotaoExportacaoRankingGeral(...args) {
  return executeExportFunction(
    "ranking-geral",
    "criarBotaoExportacaoRankingGeral",
    ...args,
  );
}

export async function criarBotaoExportacaoTop10(...args) {
  return executeExportFunction("top10", "criarBotaoExportacaoTop10", ...args);
}

export async function criarBotaoExportacaoMelhorMes(...args) {
  return executeExportFunction(
    "melhor-mes",
    "criarBotaoExportacaoMelhorMes",
    ...args,
  );
}

export async function criarBotaoExportacaoLigaPontosCorridos(...args) {
  return executeExportFunction(
    "liga-pontos-corridos",
    "criarBotaoExportacaoLigaPontosCorridos",
    ...args,
  );
}

export async function criarBotaoExportacaoPontosCorridosRodada(...args) {
  return executeExportFunction(
    "pontos-corridos",
    "criarBotaoExportacaoPontosCorridosRodada",
    ...args,
  );
}

export async function criarBotaoExportacaoPontosCorridosClassificacao(...args) {
  return executeExportFunction(
    "pontos-corridos",
    "criarBotaoExportacaoPontosCorridosClassificacao",
    ...args,
  );
}

// 🔧 FIX: Funções específicas para artilheiro-campeao.js
export async function exportarResumoArtilheiroCampeao(...args) {
  return executeExportFunction(
    "ranking-geral",
    "exportarRankingGeralComoImagem",
    ...args,
  );
}

export async function criarBotaoExportacaoArtilheiroCampeao(...args) {
  return executeExportFunction(
    "ranking-geral",
    "criarBotaoExportacaoRankingGeral",
    ...args,
  );
}

// Funções adicionais que podem estar sendo importadas
export async function exportarArtilheiro(...args) {
  return executeExportFunction(
    "ranking-geral",
    "exportarRankingGeralComoImagem",
    ...args,
  );
}

export async function exportarCampeao(...args) {
  return executeExportFunction(
    "ranking-geral",
    "exportarRankingGeralComoImagem",
    ...args,
  );
}

export async function exportarResumo(...args) {
  return executeExportFunction(
    "ranking-geral",
    "exportarRankingGeralComoImagem",
    ...args,
  );
}

// ✅ FUNÇÃO GENÉRICA DE EXPORTAÇÃO
export async function exportarGenerico(moduleName, functionName, ...args) {
  return executeExportFunction(moduleName, functionName, ...args);
}

// ✅ FUNÇÃO PARA VERIFICAR MÓDULOS DISPONÍVEIS
export function listarModulosDisponiveis() {
  console.log(
    "[EXPORT-EXPORTS] 📋 Módulos disponíveis:",
    Object.keys(moduleMap),
  );
  return Object.keys(moduleMap);
}

// ✅ FUNÇÃO PARA VERIFICAR FUNÇÕES DE UM MÓDULO
export async function listarFuncoesModulo(moduleName) {
  try {
    const module = await loadModule(moduleName);
    const funcoes = Object.keys(module).filter(
      (key) => typeof module[key] === "function",
    );
    console.log(
      `[EXPORT-EXPORTS] 📋 Funções do módulo ${moduleName}:`,
      funcoes,
    );
    return funcoes;
  } catch (error) {
    console.error(
      `[EXPORT-EXPORTS] ❌ Erro ao listar funções do módulo ${moduleName}:`,
      error,
    );
    return [];
  }
}

// ✅ FUNÇÃO PARA LIMPAR CACHE
export function limparCacheModulos() {
  moduleCache.clear();
  console.log("[EXPORT-EXPORTS] 🧹 Cache de módulos limpo");
}

// ✅ FUNÇÃO DE DIAGNÓSTICO
export async function diagnosticarSistema() {
  console.log("[EXPORT-EXPORTS] 🔍 Iniciando diagnóstico do sistema...");

  const diagnostico = {
    modulosDisponiveis: Object.keys(moduleMap),
    modulosCarregados: Array.from(moduleCache.keys()),
    erros: [],
  };

  // Testar carregamento de cada módulo
  for (const [nome, caminho] of Object.entries(moduleMap)) {
    try {
      const module = await loadModule(nome);
      const funcoes = Object.keys(module).filter(
        (key) => typeof module[key] === "function",
      );
      diagnostico[nome] = {
        carregado: true,
        funcoes: funcoes,
        caminho: caminho,
      };
    } catch (error) {
      diagnostico.erros.push({
        modulo: nome,
        erro: error.message,
      });
      diagnostico[nome] = {
        carregado: false,
        erro: error.message,
        caminho: caminho,
      };
    }
  }

  console.log("[EXPORT-EXPORTS] 📊 Diagnóstico completo:", diagnostico);
  return diagnostico;
}

// ✅ INICIALIZAÇÃO AUTOMÁTICA
(async function inicializar() {
  try {
    console.log("[EXPORT-EXPORTS] 🚀 Inicializando sistema de exportação...");

    // Validar estrutura de mapeamento
    for (const [nome, caminho] of Object.entries(moduleMap)) {
      if (!caminho || typeof caminho !== "string") {
        console.warn(
          `[EXPORT-EXPORTS] ⚠️ Caminho inválido para módulo ${nome}: ${caminho}`,
        );
      }
    }

    console.log("[EXPORT-EXPORTS] ✅ Sistema inicializado com sucesso");
    console.log(
      `[EXPORT-EXPORTS] 📦 ${Object.keys(moduleMap).length} módulos mapeados`,
    );
  } catch (error) {
    console.error("[EXPORT-EXPORTS] ❌ Erro na inicialização:", error);
  }
})();

// ✅ PADRÃO SEGURO PARA EVENT HANDLERS
export function criarHandlerSeguro(exportFunction, ...args) {
  return async (event) => {
    // Prevenir comportamento padrão e propagação
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    try {
      // Quebrar call stack para evitar channel issues
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Executar com timeout
      const resultado = await Promise.race([
        exportFunction(...args),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout na exportação (30s)")),
            30000,
          ),
        ),
      ]);

      console.log("[EXPORT-EXPORTS] ✅ Exportação concluída com sucesso");
      return resultado;
    } catch (error) {
      console.error("[EXPORT-EXPORTS] ❌ Erro na exportação:", error);

      // Mostrar notificação se disponível
      if (typeof mostrarNotificacao === "function") {
        mostrarNotificacao(
          "Erro ao gerar exportação. Tente novamente.",
          "error",
        );
      } else {
        alert("Erro ao gerar exportação. Tente novamente.");
      }

      throw error;
    }
  };
}

// ✅ FUNÇÃO PARA MOSTRAR NOTIFICAÇÕES (caso não esteja disponível globalmente)
function mostrarNotificacao(mensagem, tipo = "info") {
  const cores = {
    success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724" },
    error: { bg: "#f8d7da", border: "#f5c6cb", text: "#721c24" },
    info: { bg: "#d1ecf1", border: "#bee5eb", text: "#0c5460" },
  };

  const cor = cores[tipo] || cores.info;

  const notificacao = document.createElement("div");
  notificacao.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${cor.bg};
    border: 1px solid ${cor.border};
    color: ${cor.text};
    padding: 16px 24px;
    border-radius: 8px;
    font: 500 14px Inter, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;

  notificacao.textContent = mensagem;
  document.body.appendChild(notificacao);

  // Animação de entrada
  requestAnimationFrame(() => {
    notificacao.style.transform = "translateX(0)";
  });

  // Remover após 3 segundos
  setTimeout(() => {
    notificacao.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (notificacao.parentNode) {
        document.body.removeChild(notificacao);
      }
    }, 300);
  }, 3000);
}

console.log(
  "[EXPORT-EXPORTS] ✅ Centro coordenador CORRIGIDO v2.4.2 - Detecção inteligente implementada",
);
// ✅ IMPORTS DE MÓDULOS DE EXPORTAÇÃO
import { criarBotaoExportacaoRankingGeral } from "./export-ranking-geral.js";
import { criarBotaoExportacaoTop10 } from "./export-top10.js";
import { criarBotaoExportacaoMataMata } from "./export-mata-mata.js";
import { criarBotaoExportacaoFluxoFinanceiro } from "./export-extrato-financeiro.js";
import { criarBotaoExportacaoArtilheiro } from "./export-artilheiro-campeao.js";
import { criarBotaoExportacaoMelhorMes } from "./export-melhor-mes.js";
import { criarBotaoExportacaoPontosCorridos } from "./export-pontos-corridos.js";
import { exportarRodadaAltaQualidade } from "./export-rodadas-hq.js"; // ✅ NOVO: Alta qualidade para rodadas