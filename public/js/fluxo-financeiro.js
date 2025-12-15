import { buscarStatusMercado as getMercadoStatus } from "./pontos-corridos-utils.js";
import { FluxoFinanceiroCampos } from "./fluxo-financeiro/fluxo-financeiro-campos.js";
import {
    FluxoFinanceiroAuditoria,
    injetarEstilosAuditoria,
} from "./fluxo-financeiro/fluxo-financeiro-auditoria.js";

// Cache-buster para forçar reload de módulos (incrementar a cada mudança)
const CACHE_BUSTER = "v5.2"; // v5.2: Acertos Financeiros

// VARIÁVEIS GLOBAIS
let rodadaAtual = 0;
let ultimaRodadaCompleta = 0;
let mercadoAberto = false;
let isDataLoading = false;
let isDataLoaded = false;
let isCalculating = false;

function obterLigaId() {
    // ✅ MODO ADMIN: Verificar URL (detalhe-liga.html?id=XXX)
    const urlParams = new URLSearchParams(window.location.search);
    const ligaIdFromUrl = urlParams.get("id") || urlParams.get("ligaId");
    if (ligaIdFromUrl) {
        console.log("[FLUXO-FINANCEIRO-ADMIN] Liga ID da URL:", ligaIdFromUrl);
        return ligaIdFromUrl;
    }

    // ✅ FALLBACK: localStorage
    const ligaIdSelecionada = localStorage.getItem("ligaIdSelecionada");
    if (ligaIdSelecionada) {
        console.log(
            "[FLUXO-FINANCEIRO-ADMIN] Usando ligaId do localStorage:",
            ligaIdSelecionada,
        );
        return ligaIdSelecionada;
    }

    console.error(
        "[FLUXO-FINANCEIRO-ADMIN] ❌ Liga ID não encontrado na URL ou localStorage",
    );
    return null;
}

let FluxoFinanceiroCore = null;
let FluxoFinanceiroUI = null;
let FluxoFinanceiroUtils = null;
let FluxoFinanceiroCache = null;

let fluxoFinanceiroCore = null;
let fluxoFinanceiroUI = null;
let fluxoFinanceiroUtils = null;
let fluxoFinanceiroCache = null;
let fluxoFinanceiroAuditoria = null;

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
            // Cache-buster para forçar reload
            const pathWithCache = `${moduloInfo.path}?${CACHE_BUSTER}`;
            const modulo = await import(pathWithCache);
            moduloInfo.setter(modulo);
        }
    }
}

// ===== FUNÇÃO DE INICIALIZAÇÃO =====
async function inicializarFluxoFinanceiro() {
    console.log("[FLUXO-ADMIN] 🚀 Inicializando módulo ADMIN");

    try {
        await carregarModulos();

        try {
            const status = await getMercadoStatus();
            rodadaAtual = status.rodada_atual || 1;
            ultimaRodadaCompleta = Math.max(1, rodadaAtual - 1);
            console.log("[FLUXO-ADMIN] Rodada atual:", rodadaAtual);
        } catch (error) {
            rodadaAtual = 21;
            ultimaRodadaCompleta = 20;
            console.warn(
                "[FLUXO-ADMIN] Usando rodada padrão:",
                ultimaRodadaCompleta,
            );
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

        // ===== INTEGRAÇÃO AUDITORIA FINANCEIRA =====
        if (!fluxoFinanceiroAuditoria) {
            fluxoFinanceiroAuditoria = new FluxoFinanceiroAuditoria(
                fluxoFinanceiroCache,
                fluxoFinanceiroCore,
            );
            fluxoFinanceiroUI.setAuditoria(fluxoFinanceiroAuditoria);
            injetarEstilosAuditoria();
            console.log("[FLUXO-ADMIN] ✅ Auditoria Financeira integrada");
        }

        window.fluxoFinanceiroCache = fluxoFinanceiroCache;
        window.fluxoFinanceiroCore = fluxoFinanceiroCore;
        window.fluxoFinanceiroUI = fluxoFinanceiroUI;
        window.fluxoFinanceiroAuditoria = fluxoFinanceiroAuditoria;

        const ligaId = obterLigaId();
        if (!ligaId) {
            mostrarErro("ID da liga não encontrado");
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

        window.participanteAtualCache = participante;

        const extrato = await fluxoFinanceiroCore.calcularExtratoFinanceiro(
            timeId,
            ultimaRodadaCompleta,
        );

        await fluxoFinanceiroUI.renderizarExtratoFinanceiro(
            extrato,
            participante,
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
                const extrato =
                    await fluxoFinanceiroCore.calcularExtratoFinanceiro(
                        timeId,
                        ultimaRodadaCompleta,
                    );

                const camposAtualizados =
                    await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(
                        timeId,
                    );

                relatorio.push({
                    timeId,
                    nome: participante.nome_cartola || "Sem nome",
                    time: participante.nome_time || "Sem time",
                    escudo: participante.url_escudo_png || null,
                    bonus: extrato.resumo.bonus,
                    onus: extrato.resumo.onus,
                    pontosCorridos: extrato.resumo.pontosCorridos || 0,
                    mataMata: extrato.resumo.mataMata,
                    melhorMes: extrato.resumo.melhorMes || 0,
                    ajustes:
                        (camposAtualizados.campo1?.valor || 0) +
                        (camposAtualizados.campo2?.valor || 0) +
                        (camposAtualizados.campo3?.valor || 0) +
                        (camposAtualizados.campo4?.valor || 0),
                    saldoFinal: extrato.resumo.saldo,
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

function mostrarErro(mensagem) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (container) {
        container.innerHTML = `<div style="background:#f8d7da; border:1px solid #f5c6cb; color:#721c24; padding:20px; border-radius:8px; text-align:center;"><div style="font-size:48px;"><span class="material-symbols-outlined" style="font-size: 48px;">warning</span></div><h3>Erro</h3><p>${mensagem}</p><button onclick="location.reload()" style="background:#dc3545; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">Tentar Novamente</button></div>`;
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

// ===== FUNÇÃO GLOBAL: ABRIR AUDITORIA =====
window.abrirAuditoria = async function (timeId) {
    if (!fluxoFinanceiroAuditoria) {
        console.error("[AUDITORIA] Módulo não inicializado");
        return;
    }

    // Loading overlay
    const loadingOverlay = document.createElement("div");
    loadingOverlay.id = "auditoria-loading";
    loadingOverlay.innerHTML = `
        <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:10000;">
            <div style="background:#1e293b; padding:30px 50px; border-radius:12px; text-align:center;">
                <div style="width:40px; height:40px; border:4px solid #334155; border-top-color:#f97316; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto;"></div>
                <p style="color:#e2e8f0; margin-top:16px;">Gerando auditoria...</p>
            </div>
        </div>
    `;
    document.body.appendChild(loadingOverlay);

    try {
        const participante =
            await fluxoFinanceiroCore.buscarParticipante(timeId);
        if (!participante) {
            throw new Error("Participante não encontrado");
        }

        const extrato = await fluxoFinanceiroCore.calcularExtratoFinanceiro(
            timeId,
            ultimaRodadaCompleta,
        );

        const relatorio = fluxoFinanceiroAuditoria.gerarAuditoriaLinhaALinha(
            timeId,
            extrato,
        );

        fluxoFinanceiroAuditoria.renderizarModal(
            participante,
            relatorio,
            extrato,
        );

        console.log(
            "[AUDITORIA] ✅ Modal aberto para:",
            participante.nome_cartola,
        );
    } catch (error) {
        console.error("[AUDITORIA] Erro:", error);
        alert("Erro ao gerar auditoria: " + error.message);
    } finally {
        loadingOverlay.remove();
    }
};

// ===== EXPORTAR PARA WINDOW (COMPATIBILIDADE GLOBAL) =====
window.calcularEExibirExtrato = calcularEExibirExtrato;
window.inicializarFluxoFinanceiro = inicializarFluxoFinanceiro;
window.selecionarParticipante = selecionarParticipante;
window.obterLigaId = obterLigaId;
window.gerarRelatorioFinanceiro = gerarRelatorioFinanceiro;
window.exportarRelatorioCSV = exportarRelatorioCSV;

// ===== EXPORTAR APENAS PARA ES6 MODULES (SEM DUPLICAÇÃO) =====
export {
    calcularEExibirExtrato,
    inicializarFluxoFinanceiro,
    selecionarParticipante,
    obterLigaId,
};

// ===== VARIÁVEL GLOBAL PARA ARMAZENAR PARTICIPANTE ATUAL (ADMIN) =====
window.participanteAtualCache = null;

// ===== FUNÇÃO PARA RECARREGAR EXTRATO ATUAL (ADMIN) =====
window.recarregarExtratoAtual = async () => {
    if (!window.participanteAtualCache) {
        console.warn(
            "[FLUXO-ADMIN] Nenhum participante selecionado para recarregar",
        );
        return;
    }

    console.log(
        "[FLUXO-ADMIN] Recarregando extrato:",
        window.participanteAtualCache.time_id ||
            window.participanteAtualCache.id,
    );
    await selecionarParticipante(
        window.participanteAtualCache.time_id ||
            window.participanteAtualCache.id,
    );
};

// ===== FUNÇÃO PARA RECALCULAR E ATUALIZAR SALDO NA TELA =====
async function recalcularSaldoNaTela(timeId) {
    try {
        console.log("[FLUXO] Iniciando recálculo de saldo para time:", timeId);

        const camposAtualizados =
            await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);
        console.log(
            "[FLUXO] Campos atualizados do MongoDB:",
            camposAtualizados,
        );

        const extrato = await fluxoFinanceiroCore.calcularExtratoFinanceiro(
            timeId,
            ultimaRodadaCompleta,
        );

        const saldoDisplay = document.getElementById("saldoTotalDisplay");
        if (saldoDisplay) {
            const saldoFinal = extrato.resumo.saldo;
            const cor = saldoFinal >= 0 ? "#2ecc71" : "#e74c3c";

            saldoDisplay.style.color = cor;
            saldoDisplay.textContent = `R$ ${parseFloat(
                saldoFinal,
            ).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;

            saldoDisplay.style.transform = "scale(1.1)";
            setTimeout(() => {
                saldoDisplay.style.transform = "scale(1)";
            }, 200);
        }

        console.log("[FLUXO] Saldo recalculado:", extrato.resumo.saldo);
    } catch (error) {
        console.error("[FLUXO] Erro ao recalcular saldo:", error);
    }
}

// ===== FUNÇÃO PARA SALVAR CAMPO COM RECÁLCULO AUTOMÁTICO =====
window.salvarCampoEditavelComRecalculo = async (timeId, nomeCampo, valor) => {
    try {
        const valorNumerico = parseFloat(valor) || 0;

        const input = document.getElementById(`input_${nomeCampo}`);
        if (input) {
            input.style.borderColor = "var(--laranja)";
            input.style.boxShadow = "0 0 8px rgba(255, 69, 0, 0.3)";
            input.disabled = true;
        }

        await FluxoFinanceiroCampos.salvarValorCampo(
            timeId,
            nomeCampo,
            valorNumerico,
        );

        await recalcularSaldoNaTela(timeId);

        if (input) {
            const cor = valorNumerico >= 0 ? "#2ecc71" : "#e74c3c";
            input.style.color = cor;
            input.disabled = false;

            setTimeout(() => {
                input.style.borderColor = "var(--border-primary)";
                input.style.boxShadow = "none";
            }, 500);
        }

        console.log(
            `[FLUXO] Campo ${nomeCampo} salvo: R$ ${valorNumerico.toFixed(2)}`,
        );
    } catch (error) {
        console.error("[FLUXO] Erro ao salvar campo:", error);
        alert("Erro ao salvar campo: " + error.message);

        const input = document.getElementById(`input_${nomeCampo}`);
        if (input) {
            input.disabled = false;
            input.style.borderColor = "var(--border-primary)";
            input.style.boxShadow = "none";
        }
    }
};

// ===== FUNÇÕES GLOBAIS PARA CAMPOS EDITÁVEIS =====
window.salvarCampoEditavel = async (timeId, nomeCampo, valor) => {
    await FluxoFinanceiroCampos.salvarValorCampo(
        timeId,
        nomeCampo,
        parseFloat(valor) || 0,
    );
    await recalcularSaldoNaTela(timeId);
};

window.desfazerCampo = async (timeId, nomeCampo) => {
    try {
        await FluxoFinanceiroCampos.salvarValorCampo(timeId, nomeCampo, 0);

        await recalcularSaldoNaTela(timeId);

        const input = document.getElementById(`input_${nomeCampo}`);
        if (input) {
            input.value = "+R$ 0,00";
            input.style.color = "#2ecc71";
            input.style.borderColor = "var(--border-primary)";
            input.style.boxShadow = "none";
        }

        console.log(`[FLUXO] Campo ${nomeCampo} resetado`);
    } catch (error) {
        console.error("[FLUXO] Erro ao resetar campo:", error);
        alert("Erro ao resetar campo: " + error.message);
    }
};

// =============================================================================
// ===== ACERTOS FINANCEIROS (v5.2) =====
// =============================================================================

/**
 * Abre modal para registrar acerto financeiro
 * @param {string} timeId - ID do time
 * @param {string} nomeTime - Nome do time/participante
 */
window.abrirModalAcerto = function (timeId, nomeTime) {
    // Remover modal existente se houver
    document.getElementById("modalAcertoFinanceiro")?.remove();

    const ligaId = obterLigaId();
    if (!ligaId) {
        alert("Liga não identificada");
        return;
    }

    const modalHTML = `
        <div id="modalAcertoFinanceiro" class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
             onclick="if(event.target === this) this.remove()">
            <div class="bg-[#1e293b] rounded-xl w-full max-w-md mx-4 shadow-2xl" onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="p-4 border-b border-white/10">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span class="material-symbols-outlined text-amber-400">payments</span>
                            Registrar Acerto
                        </h3>
                        <button onclick="document.getElementById('modalAcertoFinanceiro').remove()"
                                class="text-white/50 hover:text-white">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <p class="text-sm text-white/60 mt-1">${nomeTime}</p>
                </div>

                <!-- Form -->
                <div class="p-4 space-y-4">
                    <!-- Tipo -->
                    <div>
                        <label class="block text-xs text-white/60 mb-2">Tipo de Acerto</label>
                        <div class="flex gap-2">
                            <button type="button" id="btnTipoPagamento" onclick="selecionarTipoAcerto('pagamento')"
                                    class="flex-1 py-2 px-4 rounded-lg border-2 border-rose-500 bg-rose-500/20 text-rose-400 font-medium text-sm transition-all">
                                <span class="material-symbols-outlined text-sm align-middle mr-1">arrow_downward</span>
                                Pagamento
                            </button>
                            <button type="button" id="btnTipoRecebimento" onclick="selecionarTipoAcerto('recebimento')"
                                    class="flex-1 py-2 px-4 rounded-lg border-2 border-white/20 text-white/60 font-medium text-sm transition-all">
                                <span class="material-symbols-outlined text-sm align-middle mr-1">arrow_upward</span>
                                Recebimento
                            </button>
                        </div>
                        <input type="hidden" id="tipoAcerto" value="pagamento">
                    </div>

                    <!-- Valor -->
                    <div>
                        <label class="block text-xs text-white/60 mb-2">Valor (R$)</label>
                        <input type="number" id="valorAcerto" step="0.01" min="0.01" placeholder="0,00"
                               class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white text-lg font-bold
                                      focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20">
                    </div>

                    <!-- Descrição -->
                    <div>
                        <label class="block text-xs text-white/60 mb-2">Descrição</label>
                        <input type="text" id="descricaoAcerto" placeholder="Ex: PIX recebido, Transferência..."
                               class="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white
                                      focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20">
                    </div>

                    <!-- Método -->
                    <div>
                        <label class="block text-xs text-white/60 mb-2">Método</label>
                        <select id="metodoAcerto"
                                class="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white
                                       focus:border-amber-400 focus:outline-none">
                            <option value="pix">PIX</option>
                            <option value="transferencia">Transferência</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>

                    <!-- Data -->
                    <div>
                        <label class="block text-xs text-white/60 mb-2">Data do Acerto</label>
                        <input type="date" id="dataAcerto"
                               class="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white
                                      focus:border-amber-400 focus:outline-none"
                               value="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <!-- Observações -->
                    <div>
                        <label class="block text-xs text-white/60 mb-2">Observações (opcional)</label>
                        <textarea id="observacoesAcerto" rows="2" placeholder="Observações adicionais..."
                                  class="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white
                                         focus:border-amber-400 focus:outline-none resize-none"></textarea>
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-4 border-t border-white/10 flex gap-3">
                    <button onclick="document.getElementById('modalAcertoFinanceiro').remove()"
                            class="flex-1 py-3 px-4 rounded-lg bg-white/10 text-white/70 font-medium hover:bg-white/20 transition-all">
                        Cancelar
                    </button>
                    <button onclick="confirmarAcertoFinanceiro('${ligaId}', '${timeId}', '${nomeTime}')"
                            class="flex-1 py-3 px-4 rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-400 transition-all">
                        <span class="material-symbols-outlined text-sm align-middle mr-1">check</span>
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Focus no campo de valor
    setTimeout(() => {
        document.getElementById("valorAcerto")?.focus();
    }, 100);
};

/**
 * Seleciona o tipo de acerto (pagamento ou recebimento)
 */
window.selecionarTipoAcerto = function (tipo) {
    const btnPagamento = document.getElementById("btnTipoPagamento");
    const btnRecebimento = document.getElementById("btnTipoRecebimento");
    const inputTipo = document.getElementById("tipoAcerto");

    if (tipo === "pagamento") {
        btnPagamento.className = "flex-1 py-2 px-4 rounded-lg border-2 border-rose-500 bg-rose-500/20 text-rose-400 font-medium text-sm transition-all";
        btnRecebimento.className = "flex-1 py-2 px-4 rounded-lg border-2 border-white/20 text-white/60 font-medium text-sm transition-all";
    } else {
        btnRecebimento.className = "flex-1 py-2 px-4 rounded-lg border-2 border-emerald-500 bg-emerald-500/20 text-emerald-400 font-medium text-sm transition-all";
        btnPagamento.className = "flex-1 py-2 px-4 rounded-lg border-2 border-white/20 text-white/60 font-medium text-sm transition-all";
    }

    inputTipo.value = tipo;
};

/**
 * Confirma e envia o acerto financeiro para a API
 */
window.confirmarAcertoFinanceiro = async function (ligaId, timeId, nomeTime) {
    const tipo = document.getElementById("tipoAcerto").value;
    const valor = parseFloat(document.getElementById("valorAcerto").value);
    const descricao = document.getElementById("descricaoAcerto").value.trim();
    const metodo = document.getElementById("metodoAcerto").value;
    const data = document.getElementById("dataAcerto").value;
    const observacoes = document.getElementById("observacoesAcerto").value.trim();

    // Validações
    if (!valor || valor <= 0) {
        alert("Informe um valor válido");
        document.getElementById("valorAcerto").focus();
        return;
    }

    if (!descricao) {
        alert("Informe uma descrição");
        document.getElementById("descricaoAcerto").focus();
        return;
    }

    try {
        const response = await fetch(`/api/acertos/${ligaId}/${timeId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nomeTime,
                tipo,
                valor,
                descricao,
                metodoPagamento: metodo,
                dataAcerto: data ? new Date(data).toISOString() : new Date().toISOString(),
                observacoes: observacoes || null,
                temporada: "2025",
                registradoPor: "admin",
            }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Erro ao registrar acerto");
        }

        // Fechar modal
        document.getElementById("modalAcertoFinanceiro")?.remove();

        // Mostrar toast de sucesso
        mostrarToastAcerto(`Acerto de R$ ${valor.toFixed(2).replace(".", ",")} registrado!`, true);

        // Recarregar extrato se estiver visualizando
        if (window.recarregarExtratoAtual) {
            await window.recarregarExtratoAtual();
        }

        console.log("[ACERTOS] ✅ Acerto registrado:", result);
    } catch (error) {
        console.error("[ACERTOS] ❌ Erro:", error);
        mostrarToastAcerto(`Erro: ${error.message}`, false);
    }
};

/**
 * Mostra toast de feedback
 */
function mostrarToastAcerto(mensagem, sucesso) {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-sm font-medium z-[10001] shadow-lg
                       ${sucesso ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined text-sm align-middle mr-2">${sucesso ? "check_circle" : "error"}</span>
        ${mensagem}
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

/**
 * Lista acertos de um participante (para exibição no admin)
 */
window.listarAcertosParticipante = async function (ligaId, timeId) {
    try {
        const response = await fetch(`/api/acertos/${ligaId}/${timeId}`);
        const result = await response.json();

        if (!result.success) {
            console.warn("[ACERTOS] Nenhum acerto encontrado");
            return { acertos: [], resumo: {} };
        }

        return {
            acertos: result.acertos || [],
            resumo: result.resumo || {},
        };
    } catch (error) {
        console.error("[ACERTOS] Erro ao listar:", error);
        return { acertos: [], resumo: {} };
    }
};

console.log("[FLUXO-ADMIN] ✅ v5.2 carregado (Acertos Financeiros)");
