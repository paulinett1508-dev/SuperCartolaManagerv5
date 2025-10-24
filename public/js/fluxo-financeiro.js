import { buscarStatusMercado as getMercadoStatus } from "./pontos-corridos-utils.js";
import { FluxoFinanceiroCampos } from "./fluxo-financeiro/fluxo-financeiro-campos.js";

// VARIÁVEIS GLOBAIS
let rodadaAtual = 0;
let ultimaRodadaCompleta = 0;
let isDataLoading = false;
let isDataLoaded = false;
let isCalculating = false;

// IMPORTAR SISTEMA DE EXPORTAÇÃO
import "./exports/export-extrato-financeiro.js";

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

let exportsCarregados = false;

async function carregarExports() {
    if (exportsCarregados) return;

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
        fluxoFinanceiroUI.renderizarLoading("Calculando extrato...");

        const participante =
            await fluxoFinanceiroCore.buscarParticipante(timeId);
        if (!participante) {
            renderizarErroParticipante();
            return;
        }

        // Armazenar participante atual para refresh
        participanteAtualCache = participante;

        // ✅ AGUARDAR CÁLCULO DO EXTRATO (AGORA É ASYNC)
        const extrato = await fluxoFinanceiroCore.calcularExtratoFinanceiro(
            timeId,
            ultimaRodadaCompleta,
        );

        await fluxoFinanceiroUI.renderizarExtratoFinanceiro(
            extrato,
            participante,
            async () => {
                await exportarExtrato(extrato, participante, timeId);
            },
        );
    } catch (error) {
        console.error("[FLUXO-FINANCEIRO] Erro ao calcular extrato:", error);
        renderizarErroCalculo(error);
    } finally {
        isCalculating = false;
    }
}

async function gerarRelatorioFinanceiro() {
    try {
        fluxoFinanceiroUI.renderizarLoading("Gerando relatório consolidado...");

        const participantes =
            await fluxoFinanceiroCache.carregarParticipantes();
        const relatorio = [];

        for (const participante of participantes) {
            const timeId = participante.time_id || participante.id;

            try {
                // ✅ AGUARDAR CÁLCULO DO EXTRATO
                const extrato = await fluxoFinanceiroCore.calcularExtratoFinanceiro(
                    timeId,
                    ultimaRodadaCompleta,
                );

                const camposAtualizados =
                    await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(
                        timeId,
                    );

                const saldoFinal =
                    extrato.resumo.bonus +
                    extrato.resumo.onus +
                    extrato.resumo.pontosCorridos +
                    extrato.resumo.mataMata +
                    extrato.resumo.melhorMes +
                    (camposAtualizados.campo1?.valor || 0) +
                    (camposAtualizados.campo2?.valor || 0) +
                    (camposAtualizados.campo3?.valor || 0) +
                    (camposAtualizados.campo4?.valor || 0);

                relatorio.push({
                    nome: participante.nome_cartola,
                    time: participante.nome_time,
                    escudo: participante.url_escudo_png,
                    clube_id: participante.clube_id,
                    timeId: timeId,
                    bonus: extrato.resumo.bonus,
                    onus: extrato.resumo.onus,
                    pontosCorridos: extrato.resumo.pontosCorridos,
                    mataMata: extrato.resumo.mataMata,
                    melhorMes: extrato.resumo.melhorMes,
                    ajustes:
                        (camposAtualizados.campo1?.valor || 0) +
                        (camposAtualizados.campo2?.valor || 0) +
                        (camposAtualizados.campo3?.valor || 0) +
                        (camposAtualizados.campo4?.valor || 0),
                    vezesMito: extrato.resumo.vezesMito,
                    vezesMico: extrato.resumo.vezesMico,
                    saldoFinal: saldoFinal,
                });
            } catch (error) {
                console.error(
                    `[RELATÓRIO] Erro ao calcular ${participante.nome_cartola}:`,
                    error,
                );
            }
        }

        relatorio.sort((a, b) => b.saldoFinal - a.saldoFinal);

        window.dadosRelatorio = relatorio;
        fluxoFinanceiroUI.renderizarRelatorioConsolidado(
            relatorio,
            ultimaRodadaCompleta,
        );
    } catch (error) {
        console.error("[RELATÓRIO] Erro ao gerar relatório:", error);
        mostrarErro(`Erro ao gerar relatório: ${error.message}`);
    }
}

function exportarRelatorioCSV() {
    if (!window.dadosRelatorio) return;

    const csv = [
        [
            "Posição",
            "Nome",
            "Time",
            "Bônus",
            "Ônus",
            "Pontos Corridos",
            "Mata-Mata",
            "Melhor Mês",
            "Ajustes",
            "Saldo Final",
        ],
        ...window.dadosRelatorio.map((p, index) => [
            `${index + 1}º`,
            p.nome,
            p.time,
            p.bonus.toFixed(2),
            p.onus.toFixed(2),
            p.pontosCorridos.toFixed(2),
            p.mataMata.toFixed(2),
            p.melhorMes.toFixed(2),
            p.ajustes.toFixed(2),
            p.saldoFinal.toFixed(2),
        ]),
    ]
        .map((row) => row.join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-financeiro-rodada-${ultimaRodadaCompleta}.csv`;
    link.click();
}

async function exportarExtrato(extrato, participante, timeId) {
    try {
        await carregarExports();

        if (!exportarExtratoFinanceiroComoImagem) {
            alert("Exportação não disponível");
            return;
        }

        const camposEditaveis =
            await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);
        const dadosMovimentacoes = [];

        extrato.rodadas.forEach((rodada) => {
            const rodadaNumero = rodada.rodada;
            const descricao = rodada.isMito
                ? `Rodada ${rodadaNumero} - MITO`
                : rodada.isMico
                  ? `Rodada ${rodadaNumero} - MICO`
                  : `Rodada ${rodadaNumero} - Posição ${rodada.posicao}°`;

            dadosMovimentacoes.push({
                data: `R${rodadaNumero}`,
                descricao,
                valor: rodada.bonusOnus || 0,
                tipo: "bonus_onus",
            });

            if (
                rodada.pontosCorridos !== null &&
                rodada.pontosCorridos !== undefined
            ) {
                dadosMovimentacoes.push({
                    data: `R${rodadaNumero}`,
                    descricao: `Rodada ${rodadaNumero} - Pontos Corridos`,
                    valor: rodada.pontosCorridos,
                    tipo: "pontos_corridos",
                });
            }

            if (rodada.mataMata !== null && rodada.mataMata !== undefined) {
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
        container.innerHTML = `<div style="background:#f8d7da; border:1px solid #f5c6cb; color:#721c24; padding:20px; border-radius:8px; text-align:center;"><div style="font-size:48px;">⚠</div><h3>Erro</h3><p>${mensagem}</p><button onclick="location.reload()" style="background:#dc3545; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">Tentar Novamente</button></div>`;
    }
}

function renderizarErroParticipante() {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (container)
        container.innerHTML = `<div style="text-align:center; padding:20px; background:#fff3f3; border-radius:8px;"><p style="color:#d32f2f;">Participante não encontrado.</p></div>`;
}

function renderizarErroCalculo(error) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (container)
        container.innerHTML = `<div style="text-align:center; padding:20px; background:#fff3f3; border-radius:8px;"><p style="color:#d32f2f;">Erro ao calcular extrato.</p><p style="color:#666; margin-top:10px;">${error.message}</p></div>`;
}

async function selecionarParticipante(timeId) {
    await calcularEExibirExtrato(timeId);
}

window.calcularEExibirExtrato = calcularEExibirExtrato;
window.inicializarFluxoFinanceiro = inicializarFluxoFinanceiro;
window.selecionarParticipante = selecionarParticipante;
window.obterLigaId = obterLigaId;
window.exportarExtrato = exportarExtrato;
window.gerarRelatorioFinanceiro = gerarRelatorioFinanceiro;
window.exportarRelatorioCSV = exportarRelatorioCSV;

// ===== VARIÁVEL GLOBAL PARA ARMAZENAR PARTICIPANTE ATUAL =====
let participanteAtualCache = null;

// ===== FUNÇÃO PARA RECARREGAR EXTRATO ATUAL =====
window.recarregarExtratoAtual = async () => {
    if (!participanteAtualCache) {
        console.warn('[FLUXO] Nenhum participante selecionado para recarregar');
        return;
    }

    console.log('[FLUXO] Recarregando extrato do participante:', participanteAtualCache.time_id || participanteAtualCache.id);
    await selecionarParticipante(participanteAtualCache.time_id || participanteAtualCache.id);
};

// ===== FUNÇÃO PARA RECALCULAR E ATUALIZAR SALDO NA TELA =====
async function recalcularSaldoNaTela(timeId) {
    try {
        console.log('[FLUXO] Iniciando recálculo de saldo para time:', timeId);

        // ✅ RECARREGAR CAMPOS EDITÁVEIS DO MONGODB ANTES DE CALCULAR
        const camposAtualizados = await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);
        console.log('[FLUXO] Campos atualizados do MongoDB:', camposAtualizados);

        // ✅ RECALCULAR EXTRATO COM DADOS ATUALIZADOS
        const extrato = fluxoFinanceiroCore.calcularExtratoFinanceiro(timeId, ultimaRodadaCompleta);

        // Atualizar saldo na tela
        const saldoDisplay = document.getElementById('saldoTotalDisplay');
        if (saldoDisplay) {
            const saldoFinal = extrato.resumo.saldo;
            const cor = saldoFinal >= 0 ? '#2ecc71' : '#e74c3c';

            saldoDisplay.style.color = cor;
            saldoDisplay.textContent = `R$ ${parseFloat(saldoFinal).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;

            // Animação de destaque
            saldoDisplay.style.transform = 'scale(1.1)';
            setTimeout(() => {
                saldoDisplay.style.transform = 'scale(1)';
            }, 200);
        }

        console.log('[FLUXO] Saldo recalculado:', extrato.resumo.saldo);
    } catch (error) {
        console.error('[FLUXO] Erro ao recalcular saldo:', error);
    }
}

// ===== FUNÇÃO PARA SALVAR CAMPO COM RECÁLCULO AUTOMÁTICO =====
window.salvarCampoEditavelComRecalculo = async (timeId, nomeCampo, valor) => {
    try {
        const valorNumerico = parseFloat(valor) || 0;

        // Feedback visual no input
        const input = document.getElementById(`input_${nomeCampo}`);
        if (input) {
            input.style.borderColor = 'var(--laranja)';
            input.style.boxShadow = '0 0 8px rgba(255, 69, 0, 0.3)';
            input.disabled = true;
        }

        // Salvar no banco
        await FluxoFinanceiroCampos.salvarValorCampo(timeId, nomeCampo, valorNumerico);

        // Recalcular saldo na tela COM DADOS ATUALIZADOS
        await recalcularSaldoNaTela(timeId);

        // Atualizar cor do input baseado no valor
        if (input) {
            const cor = valorNumerico >= 0 ? '#2ecc71' : '#e74c3c';
            input.style.color = cor;
            input.disabled = false;
            
            setTimeout(() => {
                input.style.borderColor = 'var(--border-primary)';
                input.style.boxShadow = 'none';
            }, 500);
        }

        console.log(`[FLUXO] Campo ${nomeCampo} salvo: R$ ${valorNumerico.toFixed(2)}`);
    } catch (error) {
        console.error('[FLUXO] Erro ao salvar campo:', error);
        alert('Erro ao salvar campo: ' + error.message);
        
        // Re-habilitar input em caso de erro
        const input = document.getElementById(`input_${nomeCampo}`);
        if (input) {
            input.disabled = false;
            input.style.borderColor = 'var(--border-primary)';
            input.style.boxShadow = 'none';
        }
    }
};

// ===== FUNÇÕES GLOBAIS PARA CAMPOS EDITÁVEIS =====
window.salvarCampoEditavel = async (timeId, nomeCampo, valor) => {
    await FluxoFinanceiroCampos.salvarValorCampo(timeId, nomeCampo, parseFloat(valor) || 0);
    await recalcularSaldoNaTela(timeId);
};

window.desfazerCampo = async (timeId, nomeCampo) => {
    try {
        // Resetar para zero
        await FluxoFinanceiroCampos.salvarValorCampo(timeId, nomeCampo, 0);

        // Recalcular saldo
        await recalcularSaldoNaTela(timeId);

        // Atualizar input
        const input = document.getElementById(`input_${nomeCampo}`);
        if (input) {
            input.value = '+R$ 0,00';
            input.style.color = '#2ecc71';
            input.style.borderColor = 'var(--border-primary)';
            input.style.boxShadow = 'none';
        }

        console.log(`[FLUXO] Campo ${nomeCampo} resetado`);
    } catch (error) {
        console.error('[FLUXO] Erro ao resetar campo:', error);
        alert('Erro ao resetar campo: ' + error.message);
    }
};

window.exportarRelatorioComoImagem = async function () {
    try {
        if (!window.dadosRelatorio || !Array.isArray(window.dadosRelatorio)) {
            alert("Nenhum relatório disponível para exportar");
            return;
        }

        const { exportarRelatorioConsolidadoMobileDarkHD } = await import(
            "./exports/export-relatorio-consolidado.js"
        );

        await exportarRelatorioConsolidadoMobileDarkHD({
            relatorio: window.dadosRelatorio,
            ultimaRodada: ultimaRodadaCompleta,
        });
    } catch (error) {
        console.error("Erro ao exportar relatório como imagem:", error);
        alert("Erro ao exportar relatório. Tente novamente.");
    }
};