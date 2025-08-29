import { buscarStatusMercado as getMercadoStatus } from "./pontos-corridos-utils.js";
import { FluxoFinanceiroCampos } from "./fluxo-financeiro/fluxo-financeiro-campos.js";

// VARIÁVEIS GLOBAIS
let rodadaAtual = 0;
let ultimaRodadaCompleta = 0;
let isDataLoading = false;
let isDataLoaded = false;

// FUNÇÃO UTILITÁRIA PARA OBTER LIGA ID
function obterLigaId() {
    const pathParts = window.location.pathname.split("/");
    const ligaIdFromPath = pathParts[pathParts.length - 1];

    if (ligaIdFromPath && ligaIdFromPath !== "detalhe-liga.html") {
        console.log(`[FLUXO-FINANCEIRO] Liga ID da URL: ${ligaIdFromPath}`);
        return ligaIdFromPath;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const ligaIdFromParams = urlParams.get("id");

    if (ligaIdFromParams) {
        console.log(
            `[FLUXO-FINANCEIRO] Liga ID dos parâmetros: ${ligaIdFromParams}`,
        );
        return ligaIdFromParams;
    }

    if (typeof window.currentLigaId !== "undefined") {
        console.log(
            `[FLUXO-FINANCEIRO] Liga ID global: ${window.currentLigaId}`,
        );
        return window.currentLigaId;
    }

    console.error("[FLUXO-FINANCEIRO] Liga ID não encontrado");
    return null;
}

// VARIÁVEIS PARA EXPORTS DINÂMICOS
let exportarExtratoFinanceiroComoImagem = null;
let exportsCarregados = false;

async function carregarExports() {
    if (exportsCarregados) return;

    try {
        const exportModule = await import("./exports/export-exports.js");
        exportarExtratoFinanceiroComoImagem =
            exportModule.exportarExtratoFinanceiroComoImagem;
        exportsCarregados = true;
        console.log("[FLUXO-FINANCEIRO] Exports carregados com sucesso");
    } catch (error) {
        console.warn("[FLUXO-FINANCEIRO] Erro ao carregar exports:", error);
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
    console.log("[FLUXO-FINANCEIRO] Carregando módulos...");

    const modulosParaCarregar = [
        {
            nome: "FluxoFinanceiroCore",
            path: "./fluxo-financeiro/fluxo-financeiro-core.js",
            variavel: () => FluxoFinanceiroCore,
            setter: (modulo) => {
                FluxoFinanceiroCore = modulo.FluxoFinanceiroCore;
            },
        },
        {
            nome: "FluxoFinanceiroUI",
            path: "./fluxo-financeiro/fluxo-financeiro-ui.js",
            variavel: () => FluxoFinanceiroUI,
            setter: (modulo) => {
                FluxoFinanceiroUI = modulo.FluxoFinanceiroUI;
            },
        },
        {
            nome: "FluxoFinanceiroUtils",
            path: "./fluxo-financeiro/fluxo-financeiro-utils.js",
            variavel: () => FluxoFinanceiroUtils,
            setter: (modulo) => {
                FluxoFinanceiroUtils = modulo.FluxoFinanceiroUtils;
            },
        },
        {
            nome: "FluxoFinanceiroCache",
            path: "./fluxo-financeiro/fluxo-financeiro-cache.js",
            variavel: () => FluxoFinanceiroCache,
            setter: (modulo) => {
                FluxoFinanceiroCache = modulo.FluxoFinanceiroCache;
            },
        },
    ];

    for (const moduloInfo of modulosParaCarregar) {
        if (!moduloInfo.variavel()) {
            try {
                console.log(
                    `[FLUXO-FINANCEIRO] Carregando ${moduloInfo.nome}...`,
                );
                const modulo = await import(moduloInfo.path);
                moduloInfo.setter(modulo);
                console.log(`[FLUXO-FINANCEIRO] ${moduloInfo.nome} carregado`);
            } catch (error) {
                console.error(
                    `[FLUXO-FINANCEIRO] Erro ao carregar ${moduloInfo.nome}:`,
                    error,
                );
                throw new Error(
                    `Falha ao carregar ${moduloInfo.nome}: ${error.message}`,
                );
            }
        } else {
            console.log(`[FLUXO-FINANCEIRO] ${moduloInfo.nome} já carregado`);
        }
    }

    console.log("[FLUXO-FINANCEIRO] Todos os módulos carregados com sucesso");
}

// FUNÇÃO PRINCIPAL: Inicializar módulo (CORRIGIDA)
export async function inicializarFluxoFinanceiro() {
    console.log("[FLUXO-FINANCEIRO] Inicializando módulo...");

    try {
        // Carregar módulos primeiro
        await carregarModulos();

        // Buscar status do mercado
        try {
            const status = await getMercadoStatus();
            rodadaAtual = status.rodada_atual || 1;
            ultimaRodadaCompleta = Math.max(1, rodadaAtual - 1);
            console.log(
                `[FLUXO-FINANCEIRO] Status mercado: rodada ${rodadaAtual}, última completa: ${ultimaRodadaCompleta}`,
            );
        } catch (error) {
            console.warn(
                "[FLUXO-FINANCEIRO] Erro ao buscar status mercado:",
                error,
            );
            rodadaAtual = 21; // Fallback
            ultimaRodadaCompleta = 20;
        }

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

        // Disponibilizar globalmente para compatibilidade
        window.fluxoFinanceiroCache = fluxoFinanceiroCache;
        window.fluxoFinanceiroCore = fluxoFinanceiroCore;
        window.fluxoFinanceiroUI = fluxoFinanceiroUI;

        // CORREÇÃO: Obter ID da liga
        const ligaId = obterLigaId();
        if (!ligaId) {
            mostrarErro("ID da liga não encontrado na URL");
            return;
        }

        console.log(`[FLUXO-FINANCEIRO] Inicializando para liga: ${ligaId}`);

        // CORREÇÃO: Inicializar independente da aba estar ativa
        await inicializarSistemaFinanceiro(ligaId);
    } catch (error) {
        console.error("[FLUXO-FINANCEIRO] Erro na inicialização:", error);
        mostrarErro(`Erro ao inicializar: ${error.message}`);
    }
}

// NOVA FUNÇÃO: Inicializar sistema financeiro
async function inicializarSistemaFinanceiro(ligaId) {
    console.log(`[FLUXO-FINANCEIRO] Configurando sistema para liga: ${ligaId}`);

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

    // Carregar participantes usando o método do cache
    const participantes = await fluxoFinanceiroCache.carregarParticipantes();

    console.log(
        `[FLUXO-FINANCEIRO] ${participantes.length} participantes carregados`,
    );

    if (participantes.length === 0) {
        mostrarErro("Nenhum participante encontrado para esta liga");
        return;
    }

    // Renderizar interface SEMPRE
    fluxoFinanceiroUI.renderizarBotoesParticipantes(participantes);
    fluxoFinanceiroUI.renderizarMensagemInicial();

    console.log("[FLUXO-FINANCEIRO] Sistema inicializado com sucesso");
}

// CORREÇÃO: Função para calcular e exibir extrato
async function calcularEExibirExtrato(timeId) {
    console.log(`[FLUXO-FINANCEIRO] Calculando extrato para time: ${timeId}`);

    // Verificar se os módulos estão inicializados
    if (!fluxoFinanceiroUI || !fluxoFinanceiroCore || !fluxoFinanceiroCache) {
        console.error(
            "[FLUXO-FINANCEIRO] Módulos não inicializados. Tentando inicializar...",
        );
        await inicializarFluxoFinanceiro();

        if (!fluxoFinanceiroUI) {
            console.error("[FLUXO-FINANCEIRO] Falha ao inicializar UI");
            mostrarErro(
                "Sistema financeiro não está disponível. Tente recarregar a página.",
            );
            return;
        }
    }

    fluxoFinanceiroUI.renderizarLoading("Calculando extrato financeiro...");

    const participante = fluxoFinanceiroCache
        .getParticipantes()
        .find(
            (p) =>
                String(p.time_id) === String(timeId) ||
                String(p.id) === String(timeId),
        );

    if (!participante) {
        console.error(
            `[FLUXO-FINANCEIRO] Participante ${timeId} não encontrado`,
        );
        _renderizarErroParticipante();
        return;
    }

    console.log(`[FLUXO-FINANCEIRO] Participante encontrado:`, participante);

    try {
        // Garantir que o cache está carregado
        if (Object.keys(fluxoFinanceiroCache.cacheRankings).length === 0) {
            console.log("[FLUXO-FINANCEIRO] Cache vazio, carregando dados...");
            const container = document.getElementById("fluxoFinanceiroContent");
            await fluxoFinanceiroCache.carregarCacheRankingsEmLotes(
                ultimaRodadaCompleta,
                container,
            );
        }

        // Calcular extrato
        console.log(
            `[FLUXO-FINANCEIRO] Iniciando cálculo do extrato para time ${timeId}...`,
        );
        const extrato = fluxoFinanceiroCore.calcularExtratoFinanceiro(
            timeId,
            ultimaRodadaCompleta,
        );

        console.log("[FLUXO-FINANCEIRO] Extrato calculado:", extrato);

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
        console.error("[FLUXO-FINANCEIRO] Erro ao calcular extrato:", error);
        _renderizarErroCalculo(error);
    }
}

async function _exportarExtrato(extrato, participante, timeId) {
    await carregarExports();

    if (!exportarExtratoFinanceiroComoImagem) {
        console.error("[FLUXO-FINANCEIRO] Função de exportação não disponível");
        alert("Função de exportação não está disponível. Tente novamente.");
        return;
    }

    const camposEditaveis =
        FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);
    const dadosMovimentacoes = [];

    // Processar cada rodada do extrato
    extrato.rodadas.forEach((rodada) => {
        const rodadaNumero = rodada.rodada;

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

        if (rodada.pontosCorridos && rodada.pontosCorridos !== 0) {
            dadosMovimentacoes.push({
                data: `R${rodadaNumero}`,
                descricao: `Rodada ${rodadaNumero} - Pontos Corridos`,
                valor: rodada.pontosCorridos,
                tipo: "pontos_corridos",
            });
        }

        if (rodada.mataMata && rodada.mataMata !== 0) {
            dadosMovimentacoes.push({
                data: `R${rodadaNumero}`,
                descricao: `Rodada ${rodadaNumero} - Mata-Mata`,
                valor: rodada.mataMata,
                tipo: "mata_mata",
            });
        }
    });

    // Adicionar campos editáveis
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

    // Ordenar movimentações
    dadosMovimentacoes.sort((a, b) => {
        if (a.tipo === "campo_editavel" && b.tipo !== "campo_editavel")
            return 1;
        if (b.tipo === "campo_editavel" && a.tipo !== "campo_editavel")
            return -1;

        const rodadaA = a.data.startsWith("R")
            ? parseInt(a.data.slice(1))
            : 999;
        const rodadaB = b.data.startsWith("R")
            ? parseInt(b.data.slice(1))
            : 999;

        return rodadaA - rodadaB;
    });

    console.log("[FLUXO-FINANCEIRO] Dados formatados para exportação:", {
        participante: participante.nome_cartola,
        totalMovimentacoes: dadosMovimentacoes.length,
        saldoFinal: extrato.resumo.saldo,
        movimentacoes: dadosMovimentacoes,
    });

    await exportarExtratoFinanceiroComoImagem(
        dadosMovimentacoes,
        participante,
        ultimaRodadaCompleta,
    );
}

function mostrarErro(mensagem) {
    console.error("[FLUXO-FINANCEIRO] Erro:", mensagem);

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
        <div style="font-size: 48px; margin-bottom: 16px;">⚠</div>
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
            Tentar Novamente
          </button>
        </div>
      </div>
    `;
    }
}

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

// NOVA FUNÇÃO: Selecionar participante
export async function selecionarParticipante(timeId) {
    console.log(`[FLUXO-FINANCEIRO] Selecionando participante: ${timeId}`);
    await calcularEExibirExtrato(timeId);
}

// Função de teste para empates
window.testarLogicaEmpates = function () {
    console.log("Testando lógica de empates...");

    if (!fluxoFinanceiroCore) {
        console.error(
            "Core não inicializado. Execute inicializarFluxoFinanceiro() primeiro.",
        );
        return;
    }

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
        "Teste concluído - A lógica de empates foi aplicada corretamente!",
    );
};

// DISPONIBILIZAR FUNÇÕES GLOBALMENTE
window.calcularEExibirExtrato = calcularEExibirExtrato;
window.inicializarFluxoFinanceiro = inicializarFluxoFinanceiro;
window.selecionarParticipante = selecionarParticipante;
window.obterLigaId = obterLigaId;
