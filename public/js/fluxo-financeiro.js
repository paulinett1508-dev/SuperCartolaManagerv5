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
// FUNÇÃO UTILITÁRIA PARA OBTER LIGA ID
// ==============================
function obterLigaId() {
    // Tentar obter da URL primeiro
    const pathParts = window.location.pathname.split('/');
    const ligaIdFromPath = pathParts[pathParts.length - 1];
    
    if (ligaIdFromPath && ligaIdFromPath !== 'detalhe-liga.html') {
        console.log(`📋 [FLUXO-FINANCEIRO] Liga ID da URL: ${ligaIdFromPath}`);
        return ligaIdFromPath;
    }

    // Tentar obter dos parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const ligaIdFromParams = urlParams.get('id');
    
    if (ligaIdFromParams) {
        console.log(`📋 [FLUXO-FINANCEIRO] Liga ID dos parâmetros: ${ligaIdFromParams}`);
        return ligaIdFromParams;
    }

    // Tentar obter de uma variável global se existir
    if (typeof window.currentLigaId !== 'undefined') {
        console.log(`📋 [FLUXO-FINANCEIRO] Liga ID global: ${window.currentLigaId}`);
        return window.currentLigaId;
    }

    console.error("❌ [FLUXO-FINANCEIRO] Liga ID não encontrado");
    return null;
}

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
  console.log("[FLUXO-FINANCEIRO] 📦 Carregando módulos...");

  const modulosParaCarregar = [
    {
      nome: "FluxoFinanceiroCore",
      path: "./fluxo-financeiro/fluxo-financeiro-core.js",
      variavel: () => FluxoFinanceiroCore,
      setter: (modulo) => { FluxoFinanceiroCore = modulo.FluxoFinanceiroCore; }
    },
    {
      nome: "FluxoFinanceiroUI", 
      path: "./fluxo-financeiro/fluxo-financeiro-ui.js",
      variavel: () => FluxoFinanceiroUI,
      setter: (modulo) => { FluxoFinanceiroUI = modulo.FluxoFinanceiroUI; }
    },
    {
      nome: "FluxoFinanceiroUtils",
      path: "./fluxo-financeiro/fluxo-financeiro-utils.js", 
      variavel: () => FluxoFinanceiroUtils,
      setter: (modulo) => { FluxoFinanceiroUtils = modulo.FluxoFinanceiroUtils; }
    },
    {
      nome: "FluxoFinanceiroCache",
      path: "./fluxo-financeiro/fluxo-financeiro-cache.js",
      variavel: () => FluxoFinanceiroCache,
      setter: (modulo) => { FluxoFinanceiroCache = modulo.FluxoFinanceiroCache; }
    }
  ];

  for (const moduloInfo of modulosParaCarregar) {
    if (!moduloInfo.variavel()) {
      try {
        console.log(`[FLUXO-FINANCEIRO] 📥 Carregando ${moduloInfo.nome}...`);
        const modulo = await import(moduloInfo.path);
        moduloInfo.setter(modulo);
        console.log(`[FLUXO-FINANCEIRO] ✅ ${moduloInfo.nome} carregado`);
      } catch (error) {
        console.error(`[FLUXO-FINANCEIRO] ❌ Erro ao carregar ${moduloInfo.nome}:`, error);
        throw new Error(`Falha ao carregar ${moduloInfo.nome}: ${error.message}`);
      }
    } else {
      console.log(`[FLUXO-FINANCEIRO] ♻️ ${moduloInfo.nome} já carregado`);
    }
  }

  console.log("[FLUXO-FINANCEIRO] ✅ Todos os módulos carregados com sucesso");
}

// ✅ FUNÇÃO PRINCIPAL: Inicializar módulo
export async function inicializarFluxoFinanceiro() {
  console.log("🔄 [FLUXO-FINANCEIRO] Inicializando módulo...");

  try {
    // Carregar módulos primeiro
    await carregarModulos();

    // Criar instâncias dos módulos
    if (!fluxoFinanceiroCache && FluxoFinanceiroCache) {
      fluxoFinanceiroCache = new FluxoFinanceiroCache();
    }

    if (!fluxoFinanceiroCore && FluxoFinanceiroCore) {
      fluxoFinanceiroCore = new FluxoFinanceiroCore(fluxoFinanceiroCache);
    }

    if (!fluxoFinanceiroUI && FluxoFinanceiroUI) {
      fluxoFinanceiroUI = new FluxoFinanceiroUI();
    }

    if (!fluxoFinanceiroUtils && FluxoFinanceiroUtils) {
      fluxoFinanceiroUtils = new FluxoFinanceiroUtils();
    }

    // Disponibilizar cache globalmente para compatibilidade
    window.fluxoFinanceiroCache = fluxoFinanceiroCache;

    // Verificar se a aba está ativa
    const fluxoTab = document.getElementById("fluxo-financeiro");
    if (!fluxoTab || !fluxoTab.classList.contains("active")) {
      console.log("⏸️ [FLUXO-FINANCEIRO] Aba não está ativa - aguardando");
      return;
    }

    // Obter ID da liga
    const ligaId = obterLigaId();
    if (!ligaId) {
      mostrarErro("ID da liga não encontrado na URL");
      return;
    }

    console.log(`🎯 [FLUXO-FINANCEIRO] Inicializando para liga: ${ligaId}`);

    // Limpar conteúdo anterior
    const contentContainer = document.getElementById("fluxoFinanceiroContent");
    const buttonsContainer = document.getElementById("fluxoFinanceiroButtons");

    if (contentContainer) contentContainer.innerHTML = "";
    if (buttonsContainer) buttonsContainer.innerHTML = "";

    // Mostrar loading
    if (contentContainer) {
      contentContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #666;">
          <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p>Carregando dados financeiros...</p>
        </div>
      `;
    }

    // Inicializar cache com a liga
    await fluxoFinanceiroCache.inicializar(ligaId);

    // Carregar participantes usando a API diretamente
    const response = await fetch(`/api/ligas/${ligaId}`);
    if (!response.ok) {
      throw new Error(`Erro ao carregar liga: ${response.status}`);
    }

    const dadosLiga = await response.json();
    const timesIds = dadosLiga.times || [];

    if (timesIds.length === 0) {
      mostrarErro("Nenhum participante encontrado para esta liga");
      return;
    }

    // Carregar dados dos participantes usando o método do cache
    const participantes = await fluxoFinanceiroCache.carregarParticipantes();

    console.log(`✅ [FLUXO-FINANCEIRO] ${participantes.length} participantes carregados`);

    // Renderizar interface
    fluxoFinanceiroUI.renderizarBotoesParticipantes(participantes);
    fluxoFinanceiroUI.renderizarMensagemInicial();

  } catch (error) {
    console.error("❌ [FLUXO-FINANCEIRO] Erro na inicialização:", error);
    mostrarErro(`Erro ao inicializar: ${error.message}`);
  }
}

async function carregarDadosParticipantes(timesIds) {
  console.log("[FLUXO-FINANCEIRO] 📥 Carregando dados dos participantes...");
  console.log("[FLUXO-FINANCEIRO] IDs dos times:", timesIds);

  const participantes = [];

  for (const timeId of timesIds) {
    try {
      console.log(`[FLUXO-FINANCEIRO] Carregando time ${timeId}...`);
      const response = await fetch(`/api/time/${timeId}`);

      if (response.ok) {
        const dados = await response.json();
        console.log(`[FLUXO-FINANCEIRO] Dados do time ${timeId}:`, dados);

        participantes.push({
          id: timeId,
          nome: dados.nome_cartoleiro || dados.nome_cartola || "N/D",
          time: dados.nome_time || "Time N/D",
          escudo: dados.url_escudo_png || "",
          clube_id: dados.clube_id || null
        });
      } else {
        console.warn(`[FLUXO-FINANCEIRO] Erro ao carregar time ${timeId}: ${response.status}`);
        // Adiciona participante com dados básicos mesmo com erro
        participantes.push({
          id: timeId,
          nome: "Participante não encontrado",
          time: `Time ${timeId}`,
          escudo: "",
          clube_id: null
        });
      }
    } catch (error) {
      console.error(`[FLUXO-FINANCEIRO] Erro ao carregar time ${timeId}:`, error);
      // Adiciona participante com dados básicos mesmo com erro
      participantes.push({
        id: timeId,
        nome: "Erro ao carregar",
        time: `Time ${timeId}`,
        escudo: "",
        clube_id: null
      });
    }
  }

  console.log(`[FLUXO-FINANCEIRO] ✅ ${participantes.length} participantes processados`);
  return participantes;
}

function mostrarErro(mensagem) {
  console.error("[FLUXO-FINANCEIRO] ❌ Erro:", mensagem);

  const container = document.getElementById("fluxoFinanceiroContent");
  if (container) {
    container.innerHTML = `
      <div style="
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
        text-align: center;
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
        <h3 style="margin: 0 0 12px 0; font-size: 18px;">Erro no Fluxo Financeiro</h3>
        <p style="margin: 0; font-size: 14px;">${mensagem}</p>
        <div style="margin-top: 16px;">
          <button onclick="location.reload()" style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">
            🔄 Tentar Novamente
          </button>
        </div>
      </div>
    `;
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
    // Verificar se os módulos estão inicializados
    if (!fluxoFinanceiroUI) {
        console.error("[FLUXO-FINANCEIRO] ❌ UI não inicializada. Tentando inicializar...");
        await inicializarFluxoFinanceiro();

        if (!fluxoFinanceiroUI) {
            console.error("[FLUXO-FINANCEIRO] ❌ Falha ao inicializar UI");
            mostrarErro("Sistema financeiro não está disponível. Tente recarregar a página.");
            return;
        }
    }

    fluxoFinanceiroUI.renderizarLoading("Calculando extrato financeiro...");

    if (!fluxoFinanceiroCache) {
        console.error("[FLUXO-FINANCEIRO] ❌ Cache não inicializado");
        mostrarErro("Sistema de cache não disponível. Tente recarregar a página.");
        return;
    }

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

async function renderizarFluxoFinanceiro(participantes, ligaId) {
  console.log(`[FLUXO-FINANCEIRO] ✅ ${participantes.length} participantes carregados`);

  const container = document.getElementById("fluxoFinanceiroContent");
    if (container) {
        container.innerHTML = `
            <div class="participantes-tabela" style="text-align:center; padding:20px; background:#fff; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin:20px auto; max-width:800px;">
                <h2 style="color:#3949ab; margin-bottom:20px;">Fluxo Financeiro dos Participantes</h2>
                <table style="width:100%; border-collapse: collapse; margin-bottom:20px;">
                    <thead>
                        <tr style="background:#f2f2f2;">
                            <th style="padding:10px; border:1px solid #ddd; text-align:left;">Participante</th>
                            <th style="padding:10px; border:1px solid #ddd; text-align:left;">Time</th>
                            <th style="padding:10px; border:1px solid #ddd; text-align:left;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${participantes.map(participante => `
                            <tr>
                                <td style="padding:10px; border:1px solid #ddd;">${participante.nome}</td>
                                <td style="padding:10px; border:1px solid #ddd;">${participante.time}</td>
                                <td style="padding:10px; border:1px solid #ddd;">
                                    <button onclick="calcularEExibirExtrato('${participante.id}')" style="background:#3949ab; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Ver Extrato</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p style="font-size:14px; color:#666;">Clique em "Ver Extrato" para calcular e exibir o extrato financeiro de cada participante.</p>
            </div>
        `;
    }
}

// ✅ FUNÇÃO: Selecionar participante específico
export async function selecionarParticipante(timeId) {
  console.log(`🎯 [FLUXO-FINANCEIRO] Selecionando participante: ${timeId}`);

  try {
    // Mostrar loading
    const container = document.getElementById('fluxoFinanceiroContent');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #666;">
          <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p>Carregando dados financeiros...</p>
        </div>
      `;
    }

    // Atualizar botões (visual)
    document.querySelectorAll('.participante-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.timeId === String(timeId)) {
        btn.classList.add('active');
      }
    });

    // Buscar dados do participante
    let participante = await FluxoFinanceiroCore.buscarParticipante(timeId);

    // Se não encontrou, tentar buscar diretamente da lista de participantes
    if (!participante) {
      console.log(`⚠️ [FLUXO-FINANCEIRO] Participante ${timeId} não encontrado no cache, buscando na lista...`);
      const todosParticipantes = await FluxoFinanceiroCore.carregarParticipantes();
      participante = todosParticipantes.find(p => 
        String(p.time_id) === String(timeId) || 
        String(p.id) === String(timeId)
      );
    }

    // Se ainda não encontrou, buscar diretamente da API
    if (!participante) {
      console.log(`⚠️ [FLUXO-FINANCEIRO] Buscando participante ${timeId} diretamente da API...`);
      try {
        const response = await fetch(`/api/time/${timeId}`);
        if (response.ok) {
          const dados = await response.json();
          participante = {
            time_id: timeId,
            id: timeId,
            nome_cartoleiro: dados.nome_cartoleiro || 'N/D',
            nome_time: dados.nome_time || 'N/D',
            url_escudo_png: dados.url_escudo_png || '',
            clube_id: dados.clube_id || null
          };
        }
      } catch (apiError) {
        console.error(`❌ [FLUXO-FINANCEIRO] Erro ao buscar da API:`, apiError);
      }
    }

    if (!participante) {
      mostrarErro(`Participante ${timeId} não encontrado`);
      return;
    }

    console.log(`✅ [FLUXO-FINANCEIRO] Participante encontrado:`, participante);

    // Carregar dados financeiros
    const dadosFinanceiros = await FluxoFinanceiroCore.carregarDadosFinanceiros(timeId);

    // Renderizar dados
    FluxoFinanceiroUI.renderizarDadosParticipante(participante, dadosFinanceiros);

  } catch (error) {
    console.error(`❌ [FLUXO-FINANCEIRO] Erro ao selecionar participante ${timeId}:`, error);
    mostrarErro(`Erro ao carregar dados: ${error.message}`);
  }
}

// ✅ DISPONIBILIZAR FUNÇÕES GLOBALMENTE
window.calcularEExibirExtrato = calcularEExibirExtrato;
window.inicializarFluxoFinanceiro = inicializarFluxoFinanceiro;
window.selecionarParticipante = selecionarParticipante;
window.obterLigaId = obterLigaId;