import { buscarStatusMercado as getMercadoStatus } from "./pontos-corridos-utils.js";
import { FluxoFinanceiroCampos } from "./fluxo-financeiro/fluxo-financeiro-campos.js";

// VARIÁVEIS GLOBAIS
let rodadaAtual = 0;
let ultimaRodadaCompleta = 0;
let isDataLoading = false;
let isDataLoaded = false;
let isCalculating = false;

function obterLigaId() {
    const pathParts = window.location.pathname.split("/");
    const ligaIdFromPath = pathParts[pathParts.length - 1];

    if (ligaIdFromPath && ligaIdFromPath !== "detalhe-liga.html") {
        return ligaIdFromPath;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const ligaIdFromParams = urlParams.get("id");

    if (ligaIdFromParams) return ligaIdFromParams;
    if (typeof window.currentLigaId !== "undefined")
        return window.currentLigaId;

    console.error("[FLUXO-FINANCEIRO] Liga ID não encontrado");
    return null;
}

let exportarExtratoFinanceiroComoImagem = null;
let exportsCarregados = false;

async function carregarExports() {
    if (exportsCarregados) return;

    // Garantir que html2canvas está carregado ANTES de importar módulos
    if (!window.html2canvas) {
        console.log("[FLUXO-FINANCEIRO] Carregando html2canvas...");
        await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src =
                "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
            script.onload = () => {
                console.log(
                    "[FLUXO-FINANCEIRO] html2canvas carregado com sucesso",
                );
                resolve();
            };
            script.onerror = () =>
                reject(new Error("Falha ao carregar html2canvas"));
            document.head.appendChild(script);
        });
    }

    try {
        const exportModule = await import("./exports/export-exports.js");
        exportarExtratoFinanceiroComoImagem =
            exportModule.exportarExtratoFinanceiroComoImagem;
        exportsCarregados = true;
        console.log("[FLUXO-FINANCEIRO] Sistema de exportação carregado");
    } catch (error) {
        console.error("[FLUXO-FINANCEIRO] Erro ao carregar exports:", error);
        throw error;
    }
}

let FluxoFinanceiroCore = null;
let FluxoFinanceiroUI = null;
let FluxoFinanceiroUtils = null;
let FluxoFinanceiroCache = null;

let fluxoFinanceiroCore = null;
let fluxoFinanceiroUI = null;
let fluxoFinanceiroUtils = null;
let fluxoFinanceiroCache = null;

async function carregarModulos() {
    const modulosParaCarregar = [
        {
            nome: "FluxoFinanceiroCore",
            path: "./fluxo-financeiro/fluxo-financeiro-core.js",
            variavel: () => FluxoFinanceiroCore,
            setter: (m) => {
                FluxoFinanceiroCore = m.FluxoFinanceiroCore;
            },
        },
        {
            nome: "FluxoFinanceiroUI",
            path: "./fluxo-financeiro/fluxo-financeiro-ui.js",
            variavel: () => FluxoFinanceiroUI,
            setter: (m) => {
                FluxoFinanceiroUI = m.FluxoFinanceiroUI;
            },
        },
        {
            nome: "FluxoFinanceiroUtils",
            path: "./fluxo-financeiro/fluxo-financeiro-utils.js",
            variavel: () => FluxoFinanceiroUtils,
            setter: (m) => {
                FluxoFinanceiroUtils = m.FluxoFinanceiroUtils;
            },
        },
        {
            nome: "FluxoFinanceiroCache",
            path: "./fluxo-financeiro/fluxo-financeiro-cache.js",
            variavel: () => FluxoFinanceiroCache,
            setter: (m) => {
                FluxoFinanceiroCache = m.FluxoFinanceiroCache;
            },
        },
    ];

    for (const moduloInfo of modulosParaCarregar) {
        if (!moduloInfo.variavel()) {
            const modulo = await import(moduloInfo.path);
            moduloInfo.setter(modulo);
        }
    }
}

export async function inicializarFluxoFinanceiro() {
    try {
        await carregarModulos();

        try {
            const status = await getMercadoStatus();
            rodadaAtual = status.rodada_atual || 1;
            ultimaRodadaCompleta = Math.max(1, rodadaAtual - 1);
        } catch (error) {
            rodadaAtual = 21;
            ultimaRodadaCompleta = 20;
        }

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

        window.fluxoFinanceiroCache = fluxoFinanceiroCache;
        window.fluxoFinanceiroCore = fluxoFinanceiroCore;
        window.fluxoFinanceiroUI = fluxoFinanceiroUI;

        const ligaId = obterLigaId();
        if (!ligaId) {
            mostrarErro("ID da liga não encontrado na URL");
            return;
        }

        await inicializarSistemaFinanceiro(ligaId);
    } catch (error) {
        console.error("[FLUXO-FINANCEIRO] Erro na inicialização:", error);
        mostrarErro(`Erro ao inicializar: ${error.message}`);
    }
}

async function inicializarSistemaFinanceiro(ligaId) {
    const contentContainer = document.getElementById("fluxoFinanceiroContent");
    const buttonsContainer = document.getElementById("fluxoFinanceiroButtons");

    if (contentContainer) contentContainer.innerHTML = "";
    if (buttonsContainer) buttonsContainer.innerHTML = "";

    if (contentContainer) {
        contentContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #666;">
          <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; 
                      border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 20px;">Carregando dados financeiros...</p>
          <p style="margin-top: 10px; font-size: 14px; color: #999;">Preparando cache...</p>
          <div style="width: 80%; max-width: 400px; height: 6px; background: #e0e0e0; 
                      border-radius: 3px; margin: 20px auto; overflow: hidden;">
            <div id="loading-progress-bar" style="width: 0%; height: 100%; 
                                                   background: linear-gradient(90deg, #3498db, #2ecc71); 
                                                   transition: width 0.3s ease;"></div>
          </div>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>`;
    }

    await fluxoFinanceiroCache.inicializar(ligaId);
    await fluxoFinanceiroCache.carregarCacheRankingsEmLotes(
        ultimaRodadaCompleta,
        contentContainer,
    );

    const participantes = await fluxoFinanceiroCache.carregarParticipantes();

    if (participantes.length === 0) {
        mostrarErro("Nenhum participante encontrado");
        return;
    }

    fluxoFinanceiroUI.renderizarBotoesParticipantes(participantes);
    fluxoFinanceiroUI.renderizarMensagemInicial();
    isDataLoaded = true;
}

async function calcularEExibirExtrato(timeId) {
    if (isCalculating) return;
    isCalculating = true;

    try {
        if (
            !fluxoFinanceiroUI ||
            !fluxoFinanceiroCore ||
            !fluxoFinanceiroCache
        ) {
            await inicializarFluxoFinanceiro();
            if (!fluxoFinanceiroUI) {
                mostrarErro("Sistema não disponível");
                return;
            }
        }

        fluxoFinanceiroUI.renderizarLoading("Calculando extrato...");

        const participante = fluxoFinanceiroCache
            .getParticipantes()
            .find(
                (p) =>
                    String(p.time_id) === String(timeId) ||
                    String(p.id) === String(timeId),
            );

        if (!participante) {
            renderizarErroParticipante();
            return;
        }

        const extrato = fluxoFinanceiroCore.calcularExtratoFinanceiro(
            timeId,
            ultimaRodadaCompleta,
        );

        fluxoFinanceiroUI.renderizarExtratoFinanceiro(
            extrato,
            participante,
            calcularEExibirExtrato,
        );
        fluxoFinanceiroUI.renderizarBotaoExportacao(() =>
            exportarExtrato(extrato, participante, timeId),
        );
    } catch (error) {
        console.error("[FLUXO-FINANCEIRO] Erro:", error);
        renderizarErroCalculo(error);
    } finally {
        isCalculating = false;
    }
}

async function exportarExtrato(extrato, participante, timeId) {
    try {
        await carregarExports();

        if (!exportarExtratoFinanceiroComoImagem) {
            alert("Exportação não disponível");
            return;
        }

        const camposEditaveis =
            FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);
        const dadosMovimentacoes = [];

        extrato.rodadas.forEach((rodada) => {
            const rodadaNumero = rodada.rodada;
            if (rodada.bonusOnus && rodada.bonusOnus !== 0) {
                const descricao = rodada.isMito
                    ? `Rodada ${rodadaNumero} - MITO`
                    : rodada.isMico
                      ? `Rodada ${rodadaNumero} - MICO`
                      : `Rodada ${rodadaNumero} - Posição ${rodada.posicao}°`;
                dadosMovimentacoes.push({
                    data: `R${rodadaNumero}`,
                    descricao,
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

        ["campo1", "campo2", "campo3", "campo4"].forEach((campo) => {
            const valorCampo = extrato.resumo[campo];
            if (valorCampo && valorCampo !== 0) {
                dadosMovimentacoes.push({
                    data: "Manual",
                    descricao:
                        camposEditaveis[campo].nome ||
                        `Campo ${campo.slice(-1)}`,
                    valor: valorCampo,
                    tipo: "campo_editavel",
                });
            }
        });

        await exportarExtratoFinanceiroComoImagem(
            dadosMovimentacoes,
            participante,
            ultimaRodadaCompleta,
        );
    } catch (error) {
        console.error("[FLUXO-FINANCEIRO] Erro na exportação:", error);
        alert(`Erro ao exportar: ${error.message}`);
    }
}

function mostrarErro(mensagem) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (container) {
        container.innerHTML = `<div style="background:#f8d7da; border:1px solid #f5c6cb; color:#721c24; padding:20px; 
            border-radius:8px; text-align:center;"><div style="font-size:48px;">⚠</div><h3>Erro</h3><p>${mensagem}</p>
            <button onclick="location.reload()" style="background:#dc3545; color:white; border:none; padding:8px 16px; 
            border-radius:4px; cursor:pointer;">Tentar Novamente</button></div>`;
    }
}

function renderizarErroParticipante() {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (container)
        container.innerHTML = `<div style="text-align:center; padding:20px; background:#fff3f3; 
        border-radius:8px;"><p style="color:#d32f2f;">Participante não encontrado.</p></div>`;
}

function renderizarErroCalculo(error) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (container)
        container.innerHTML = `<div style="text-align:center; padding:20px; background:#fff3f3; 
        border-radius:8px;"><p style="color:#d32f2f;">Erro ao calcular extrato.</p>
        <p style="color:#666; margin-top:10px;">${error.message}</p></div>`;
}

export async function selecionarParticipante(timeId) {
    await calcularEExibirExtrato(timeId);
}

window.calcularEExibirExtrato = calcularEExibirExtrato;
window.inicializarFluxoFinanceiro = inicializarFluxoFinanceiro;
window.selecionarParticipante = selecionarParticipante;
window.obterLigaId = obterLigaId;
window.exportarExtrato = exportarExtrato;
