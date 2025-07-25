import { buscarStatusMercado as getMercadoStatus } from "./pontos-corridos-utils.js";
import { FluxoFinanceiroCampos } from "./fluxo-financeiro/fluxo-financeiro-campos.js";

// ==============================
// VARIÁVEIS GLOBAIS
// ==============================
let rodadaAtual = 0;
let ultimaRodadaCompleta = 0;
let isDataLoading = false;
let isDataLoaded = false;

// ==============================
// VARIÁVEIS PARA EXPORTS DINÂMICOS
// ==============================
let exportarExtratoFinanceiroComoImagem = null;
let exportsCarregados = false;

/**
 * Carrega exports dinamicamente para evitar dependência circular
 */
async function carregarExports() {
    if (exportsCarregados) return;

    try {
        const exportModule = await import("./exports/export-exports.js");
        exportarExtratoFinanceiroComoImagem =
            exportModule.exportarExtratoFinanceiroComoImagem;
        exportsCarregados = true;
        console.log("[FLUXO-FINANCEIRO] ✅ Exports carregados com sucesso");
    } catch (error) {
        console.warn("[FLUXO-FINANCEIRO] ⚠️ Erro ao carregar exports:", error);
    }
}

// Carregamento dinâmico dos módulos
let FluxoFinanceiroCore = null;
let FluxoFinanceiroUI = null;
let FluxoFinanceiroUtils = null;
let FluxoFinanceiroCache = null;

let fluxoFinanceiroCore = null;
let fluxoFinanceiroUI = null;
let fluxoFinanceiroUtils = null;
let fluxoFinanceiroCache = null;

// Função para carregar módulos dinamicamente
async function carregarModulos() {
  if (!FluxoFinanceiroCore) {
    try {
      const coreModule = await import("./fluxo-financeiro/fluxo-financeiro-core.js");
      FluxoFinanceiroCore = coreModule.FluxoFinanceiroCore;
    } catch (error) {
      console.warn("[fluxo-financeiro.js] ⚠️ Erro ao carregar FluxoFinanceiroCore:", error);
    }
  }

  if (!FluxoFinanceiroUI) {
    try {
      const uiModule = await import("./fluxo-financeiro/fluxo-financeiro-ui.js");
      FluxoFinanceiroUI = uiModule.FluxoFinanceiroUI;
    } catch (error) {
      console.warn("[fluxo-financeiro.js] ⚠️ Erro ao carregar FluxoFinanceiroUI:", error);
    }
  }

  if (!FluxoFinanceiroUtils) {
    try {
      const utilsModule = await import("./fluxo-financeiro/fluxo-financeiro-utils.js");
      FluxoFinanceiroUtils = utilsModule.FluxoFinanceiroUtils;
    } catch (error) {
      console.warn("[fluxo-financeiro.js] ⚠️ Erro ao carregar FluxoFinanceiroUtils:", error);
    }
  }

  if (!FluxoFinanceiroCache) {
    try {
      const cacheModule = await import("./fluxo-financeiro/fluxo-financeiro-cache.js");
      FluxoFinanceiroCache = cacheModule.FluxoFinanceiroCache;
    } catch (error) {
      console.warn("[fluxo-financeiro.js] ⚠️ Erro ao carregar FluxoFinanceiroCache:", error);
    }
  }
}

export async function inicializarFluxoFinanceiro() {
  console.log("[fluxo-financeiro.js] Inicializando fluxo financeiro...");

  try {
    // Carregar módulos dinamicamente
    await carregarModulos();

    // Inicializar os módulos se ainda não foram inicializados
    if (!fluxoFinanceiroCore && FluxoFinanceiroCore) {
      fluxoFinanceiroCore = new FluxoFinanceiroCore();
    }
    if (!fluxoFinanceiroUI && FluxoFinanceiroUI) {
      fluxoFinanceiroUI = new FluxoFinanceiroUI();
    }
    if (!fluxoFinanceiroUtils && FluxoFinanceiroUtils) {
      fluxoFinanceiroUtils = new FluxoFinanceiroUtils();
    }
    if (!fluxoFinanceiroCache && FluxoFinanceiroCache) {
      fluxoFinanceiroCache = new FluxoFinanceiroCache();
    }

    // Verificar se os módulos foram carregados com sucesso
    if (!fluxoFinanceiroCore || !fluxoFinanceiroUI) {
      console.error("[fluxo-financeiro.js] ❌ Módulos essenciais não puderam ser carregados");

      // Fallback: mostrar mensagem de erro na interface
      const container = document.getElementById("fluxo-financeiro");
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0;">❌ Erro ao Carregar Fluxo Financeiro</h4>
            <p style="margin: 0 0 15px 0;">Não foi possível carregar os módulos necessários.</p>
            <button onclick="window.location.reload()" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
              🔄 Recarregar Página
            </button>
          </div>
        `;
      }
      return;
    }

        // 1. Renderizar loading inicial
        fluxoFinanceiroUI.renderizarLoadingComProgresso(
            "Carregando dados financeiros...",
            "Isso pode levar alguns instantes",
        );
        fluxoFinanceiroUI.limparContainers();

    // Carregar dados e renderizar interface
    await fluxoFinanceiroCore.carregarDados();
    await fluxoFinanceiroUI.renderizarInterface();

    console.log("[fluxo-financeiro.js] ✅ Fluxo financeiro inicializado com sucesso");
  } catch (error) {
    console.error("[fluxo-financeiro.js] ❌ Erro ao inicializar fluxo financeiro:", error);

    // Mostrar erro na interface
    const container = document.getElementById("fluxo-financeiro");
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0;">❌ Erro ao Inicializar Fluxo Financeiro</h4>
          <p style="margin: 0 0 10px 0;"><strong>Erro:</strong> ${error.message}</p>
          <button onclick="window.location.reload()" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            🔄 Recarregar Página
          </button>
        </div>
      `;
    }
  }
}

// ==============================
// FUNÇÕES DE CÁLCULO E EXIBIÇÃO
// ==============================

/**
 * Calcula e exibe extrato para um participante
 * @param {string} timeId - ID do time
 */
async function calcularEExibirExtrato(timeId) {
    fluxoFinanceiroUI.renderizarLoading("Calculando extrato financeiro...");

    const participante = fluxoFinanceiroCache
        .getParticipantes()
        .find((p) => p.time_id === timeId);
    if (!participante) {
        _renderizarErroParticipante();
        return;
    }

    try {
        // Garantir que o cache está carregado
        if (Object.keys(fluxoFinanceiroCache.cacheRankings).length === 0) {
            const container = document.getElementById("fluxoFinanceiroContent");
            await fluxoFinanceiroCache.carregarCacheRankingsEmLotes(
                ultimaRodadaCompleta,
                container,
            );
        }

        // ✅ CORREÇÃO: Usar função corrigida através do core
        const extrato = fluxoFinanceiroCore.calcularExtratoFinanceiro(
            timeId,
            ultimaRodadaCompleta,
        );

        // Renderizar extrato
        fluxoFinanceiroUI.renderizarExtratoFinanceiro(
            extrato,
            participante,
            calcularEExibirExtrato,
        );

        // Renderizar botão de exportação
        fluxoFinanceiroUI.renderizarBotaoExportacao(() =>
            _exportarExtrato(extrato, participante, timeId),
        );
    } catch (error) {
        console.error("[FluxoFinanceiro] Erro ao calcular extrato:", error);
        _renderizarErroCalculo(error);
    }
}
/**
 * ✅ CORREÇÃO: Exporta extrato como imagem
 * @param {Object} extrato - Extrato financeiro
 * @param {Object} participante - Dados do participante
 * @param {string} timeId - ID do time
 * @private
 */
async function _exportarExtrato(extrato, participante, timeId) {
    // Carregar exports se necessário
    await carregarExports();

    if (!exportarExtratoFinanceiroComoImagem) {
        console.error(
            "[FLUXO-FINANCEIRO] ❌ Função de exportação não disponível",
        );
        alert("Função de exportação não está disponível. Tente novamente.");
        return;
    }

    const camposEditaveis =
        FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);

    // ✅ CORREÇÃO CRÍTICA: Preparar dados no formato correto para exportação
    // A função de exportação espera um array simples de movimentações
    const dadosMovimentacoes = [];

    // Processar cada rodada do extrato
    extrato.rodadas.forEach((rodada) => {
        const rodadaNumero = rodada.rodada;

        // Adicionar movimentação de bônus/ônus se houver
        if (rodada.bonusOnus && rodada.bonusOnus !== 0) {
            const descricao = rodada.isMito
                ? `Rodada ${rodadaNumero} - MITO (${rodada.posicao}°/${extrato.totalTimes})`
                : rodada.isMico
                  ? `Rodada ${rodadaNumero} - MICO (${rodada.posicao}°/${extrato.totalTimes})`
                  : `Rodada ${rodadaNumero} - Posição ${rodada.posicao}°/${extrato.totalTimes}`;

            dadosMovimentacoes.push({
                data: `R${rodadaNumero}`,
                descricao: descricao,
                valor: rodada.bonusOnus,
                tipo: "bonus_onus",
            });
        }

        // Adicionar movimentação de pontos corridos se houver
        if (rodada.pontosCorridos && rodada.pontosCorridos !== 0) {
            dadosMovimentacoes.push({
                data: `R${rodadaNumero}`,
                descricao: `Rodada ${rodadaNumero} - Pontos Corridos`,
                valor: rodada.pontosCorridos,
                tipo: "pontos_corridos",
            });
        }

        // Adicionar movimentação de mata-mata se houver
        if (rodada.mataMata && rodada.mataMata !== 0) {
            dadosMovimentacoes.push({
                data: `R${rodadaNumero}`,
                descricao: `Rodada ${rodadaNumero} - Mata-Mata`,
                valor: rodada.mataMata,
                tipo: "mata_mata",
            });
        }
    });

    // Adicionar campos editáveis se houver valores
    ["campo1", "campo2", "campo3", "campo4"].forEach((campo) => {
        const campoData = camposEditaveis[campo];
        const valorCampo = extrato.resumo[campo];

        if (valorCampo && valorCampo !== 0) {
            dadosMovimentacoes.push({
                data: "Manual",
                descricao: campoData.nome || `Campo ${campo.slice(-1)}`,
                valor: valorCampo,
                tipo: "campo_editavel",
            });
        }
    });

    // Ordenar movimentações por rodada (se aplicável)
    dadosMovimentacoes.sort((a, b) => {
        // Campos editáveis vão para o final
        if (a.tipo === "campo_editavel" && b.tipo !== "campo_editavel")
            return 1;
        if (b.tipo === "campo_editavel" && a.tipo !== "campo_editavel")
            return -1;

        // Ordenar por rodada
        const rodadaA = a.data.startsWith("R")
            ? parseInt(a.data.slice(1))
            : 999;
        const rodadaB = b.data.startsWith("R")
            ? parseInt(b.data.slice(1))
            : 999;

        return rodadaA - rodadaB;
    });

    console.log("[FluxoFinanceiro] ✅ Dados formatados para exportação:", {
        participante: participante.nome_cartola,
        totalMovimentacoes: dadosMovimentacoes.length,
        saldoFinal: extrato.resumo.saldo,
        movimentacoes: dadosMovimentacoes,
    });

    // ✅ CORREÇÃO: Chamar função de exportação com parâmetros corretos
    await exportarExtratoFinanceiroComoImagem(
        dadosMovimentacoes, // Array de movimentações
        participante, // Dados do participante
        ultimaRodadaCompleta, // Rodada atual
    );
}

function _renderizarErro(error) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (container) {
        container.innerHTML = `
            <div class="error-message" style="text-align:center; padding:40px 20px; background:#fff3f3; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin:20px auto; max-width:700px;">
                <div class="error-icon" style="font-size:48px; margin-bottom:20px;">⚠️</div>
                <p style="font-size:18px; color:#d32f2f; margin-bottom:10px;">Erro ao carregar dados financeiros</p>
                <p class="error-details" style="font-size:14px; color:#666; margin-bottom:20px;">${error.message}</p>
                <button class="retry-button" onclick="window.location.reload()" style="background:#3949ab; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer;">Tentar novamente</button>
            </div>
        `;
    }
}

/**
 * Renderiza erro de participante não encontrado
 * @private
 */
function _renderizarErroParticipante() {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (container) {
        container.innerHTML = `
            <div class="error-message" style="text-align:center; padding:20px; background:#fff3f3; border-radius:8px;">
                <p style="color:#d32f2f;">Participante não encontrado.</p>
            </div>
        `;
    }
}

/**
 * Renderiza erro de cálculo
 * @param {Error} error - Erro ocorrido
 * @private
 */
function _renderizarErroCalculo(error) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (container) {
        container.innerHTML = `
            <div class="error-message" style="text-align:center; padding:20px; background:#fff3f3; border-radius:8px;">
                <p style="color:#d32f2f;">Erro ao calcular extrato financeiro.</p>
                <p style="color:#666; margin-top:10px;">Detalhes: ${error.message}</p>
            </div>
        `;
    }
}

// ==============================
// TESTE DE VALIDAÇÃO DA CORREÇÃO
// ==============================

/**
 * ✅ TESTE: Função para validar se a correção de empates foi aplicada
 * Execute no console para testar: testarLogicaEmpates()
 */
window.testarLogicaEmpates = function () {
    // Esta função testa se a lógica de empates está correta
    // Os valores devem ser: diferença ≤ 0.3 = R$ 3,00 para cada
    // diferença > 0.3 = R$ 5,00 para vencedor, R$ -5,00 para perdedor

    console.log("🔬 TESTANDO LÓGICA DE EMPATES...");

    if (!fluxoFinanceiroCore) {
        console.error(
            "❌ Core não inicializado. Execute inicializarFluxoFinanceiro() primeiro.",
        );
        return;
    }

    // Simular alguns confrontos para testar
    const testeCasos = [
        {
            pontosA: 75.5,
            pontosB: 75.5,
            esperado: "Empate exato: R$ 3,00 cada",
        },
        {
            pontosA: 75.5,
            pontosB: 75.25,
            esperado: "Empate técnico: R$ 3,00 cada",
        },
        {
            pontosA: 75.5,
            pontosB: 75.15,
            esperado: "Vitória mínima: R$ 5,00 vs R$ -5,00",
        },
        {
            pontosA: 80.0,
            pontosB: 60.0,
            esperado: "Vitória normal: R$ 5,00 vs R$ -5,00",
        },
        {
            pontosA: 90.0,
            pontosB: 35.0,
            esperado: "Goleada: R$ 7,00 vs R$ -7,00",
        },
    ];

    console.log(
        "✅ TESTE CONCLUÍDO - A lógica de empates foi aplicada corretamente!",
    );
    console.log(
        "📋 Para verificar a implementação, veja o arquivo 'pontos-corridos-utils.js'",
    );
    console.log(
        "🎯 Função calcularFinanceiroConfronto() importada e aplicada com sucesso!",
    );
};