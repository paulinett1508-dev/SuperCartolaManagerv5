import { buscarStatusMercado as getMercadoStatus } from "./pontos-corridos-utils.js";
import { FluxoFinanceiroCampos } from "./fluxo-financeiro/fluxo-financeiro-campos.js";
import {
    FluxoFinanceiroAuditoria,
    injetarEstilosAuditoria,
} from "./fluxo-financeiro/fluxo-financeiro-auditoria.js";
// v8.0: Módulo de Quitação de Temporada
import "./fluxo-financeiro/fluxo-financeiro-quitacao.js";
// v8.0: Módulo de Ajustes Financeiros Dinâmicos (2026+)
import "./fluxo-financeiro/fluxo-financeiro-ajustes-api.js";

// Cache-buster para forçar reload de módulos (incrementar a cada mudança)
const CACHE_BUSTER = "v8.4"; // v8.4: Proteção cache temporadas históricas (imutáveis)

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
    console.log("[FLUXO-ADMIN] Inicializando modulo ADMIN");

    // ✅ v9.0: PRIORIDADE CORRIGIDA: URL > Orquestrador > localStorage > default
    // Isso garante que temporadas historicas (ex: ?temporada=2025) sejam respeitadas
    const urlParams = new URLSearchParams(window.location.search);
    const temporadaUrl = urlParams.get('temporada');
    const temporadaSalva = localStorage.getItem('temporadaSelecionada');

    if (temporadaUrl) {
        // 1. URL tem prioridade maxima (admin navegando para temporada especifica)
        window.temporadaAtual = parseInt(temporadaUrl, 10);
        console.log("[FLUXO-ADMIN] Temporada da URL:", window.temporadaAtual);
    } else if (window.temporadaAtual && window.isTemporadaHistorica !== undefined) {
        // 2. Orquestrador ja definiu (manter contexto do detalhe-liga)
        console.log("[FLUXO-ADMIN] Temporada do orquestrador:", window.temporadaAtual);
    } else if (temporadaSalva) {
        // 3. localStorage (preferencia do usuario para navegacao normal)
        window.temporadaAtual = parseInt(temporadaSalva, 10);
        console.log("[FLUXO-ADMIN] Temporada do localStorage:", window.temporadaAtual);
    } else {
        // 4. Default para 2026 (temporada atual)
        window.temporadaAtual = 2026;
        console.log("[FLUXO-ADMIN] Temporada padrao: 2026");
    }

    try {
        await carregarModulos();

        try {
            const status = await getMercadoStatus();
            rodadaAtual = status.rodada_atual || 1;

            // ✅ v7.9: NÃO sobrescrever temporada com valor da API Cartola
            // A API retorna 2025 mas queremos usar 2026 como default
            console.log("[FLUXO-ADMIN] Temporada selecionada:", window.temporadaAtual, "(API Cartola:", status.temporada, ")");

            // ✅ FIX: Verificar se temporada encerrou (game_over) ou mercado fechado
            // Se encerrou, usar rodada atual (38). Se não, usar rodada anterior.
            const temporadaEncerrada = status.game_over === true;
            const mercadoFechado = status.status_mercado !== 1 && !status.mercado_aberto;
            const rodadaFinal = status.rodada_final || 38;

            if (temporadaEncerrada || (mercadoFechado && rodadaAtual >= rodadaFinal)) {
                // Temporada encerrada ou última rodada com mercado fechado: usar rodada atual
                ultimaRodadaCompleta = rodadaAtual;
                console.log("[FLUXO-ADMIN] 🏁 Temporada encerrada - usando R" + rodadaAtual);
            } else if (mercadoFechado) {
                // Mercado fechado durante temporada: rodada atual já consolidada
                ultimaRodadaCompleta = rodadaAtual;
            } else {
                // Mercado aberto: rodada atual ainda em andamento
                ultimaRodadaCompleta = Math.max(1, rodadaAtual - 1);
            }

            console.log("[FLUXO-ADMIN] Rodada atual:", rodadaAtual, "| Última completa:", ultimaRodadaCompleta);
        } catch (error) {
            rodadaAtual = 38;
            ultimaRodadaCompleta = 38; // ✅ FIX: Padrão para 38 (temporada 2025 encerrada)
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
        console.log("[FLUXO-ADMIN] 📍 Liga ID:", ligaId);

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

    // ✅ OTIMIZAÇÃO: inicializar() já carrega rankings e participantes em paralelo
    await fluxoFinanceiroCache.inicializar(ligaId);

    // Obter participantes do cache (já carregados)
    const participantes = fluxoFinanceiroCache.getParticipantes();

    if (participantes.length === 0) {
        mostrarErro("Nenhum participante encontrado");
        return;
    }

    await fluxoFinanceiroUI.renderizarBotoesParticipantes(participantes);
    fluxoFinanceiroUI.renderizarMensagemInicial();
    isDataLoaded = true;

    // Expor função de recarregar para uso após acertos
    window.fluxoFinanceiroOrquestrador = {
        recarregar: () => inicializarSistemaFinanceiro(obterLigaId()),
    };

    // ✅ v7.3: Auto-selecionar participante se timeId vier na URL
    const urlParams = new URLSearchParams(window.location.search);
    const timeIdFromUrl = urlParams.get("timeId");
    if (timeIdFromUrl) {
        console.log("[FLUXO-ADMIN] Auto-selecionando participante da URL:", timeIdFromUrl);
        // Pequeno delay para garantir que a UI renderizou
        setTimeout(() => {
            calcularEExibirExtrato(timeIdFromUrl);
            // Marcar botão como ativo
            const botao = document.querySelector(`[data-time-id="${timeIdFromUrl}"]`);
            if (botao) {
                document.querySelectorAll('.participante-btn').forEach(b => b.classList.remove('active'));
                botao.classList.add('active');
            }
        }, 100);
    }
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

        // ✅ v6.10 FIX: Passar temporada correta para buscar campos da temporada selecionada
        const temporadaSelecionada = window.temporadaAtual || 2025;
        const camposAtualizados =
            await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId, temporadaSelecionada);
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

    // ✅ v5.5: Modal com Abas (Novo Acerto + Histórico) + Máscara Monetária
    const modalHTML = `
        <div id="modalAcertoFinanceiro"
             style="position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);"
             onclick="if(event.target === this) this.remove()">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; width: 100%; max-width: 480px; margin: 16px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); max-height: 90vh; display: flex; flex-direction: column;"
                 onclick="event.stopPropagation()">

                <!-- Header -->
                <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
                            <span class="material-icons" style="color: #fbbf24; font-size: 22px;">payments</span>
                            Acertos Financeiros
                        </h3>
                        <button onclick="document.getElementById('modalAcertoFinanceiro').remove()"
                                style="background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 4px;">
                            <span class="material-icons" style="font-size: 20px;">close</span>
                        </button>
                    </div>
                    <p style="margin: 6px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.6);">${nomeTime}</p>
                </div>

                <!-- Abas -->
                <div style="display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;">
                    <button id="tabNovoAcerto" onclick="trocarAbaAcerto('novo')"
                            style="flex: 1; padding: 12px 16px; background: rgba(245,158,11,0.1); border: none; border-bottom: 2px solid #f59e0b; color: #fbbf24; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span class="material-icons" style="font-size: 18px;">add_circle</span>
                        Novo Acerto
                    </button>
                    <button id="tabHistorico" onclick="trocarAbaAcerto('historico')"
                            style="flex: 1; padding: 12px 16px; background: transparent; border: none; border-bottom: 2px solid transparent; color: rgba(255,255,255,0.5); font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span class="material-icons" style="font-size: 18px;">history</span>
                        Histórico
                    </button>
                </div>

                <!-- Conteúdo das Abas -->
                <div style="flex: 1; overflow-y: auto;">

                    <!-- Aba: Novo Acerto -->
                    <div id="conteudoNovoAcerto" style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
                        <!-- Tipo -->
                        <div>
                            <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Tipo de Acerto</label>
                            <div style="display: flex; gap: 10px;">
                                <button type="button" id="btnTipoPagamento" onclick="selecionarTipoAcerto('pagamento')"
                                        style="flex: 1; padding: 10px 16px; border-radius: 10px; border: 2px solid #f43f5e; background: rgba(244,63,94,0.15); color: #fb7185; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
                                    <span class="material-icons" style="font-size: 16px;">arrow_downward</span>
                                    Pagamento
                                </button>
                                <button type="button" id="btnTipoRecebimento" onclick="selecionarTipoAcerto('recebimento')"
                                        style="flex: 1; padding: 10px 16px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.2); background: transparent; color: rgba(255,255,255,0.6); font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
                                    <span class="material-icons" style="font-size: 16px;">arrow_upward</span>
                                    Recebimento
                                </button>
                            </div>
                            <input type="hidden" id="tipoAcerto" value="pagamento">
                        </div>

                        <!-- Valor com Máscara Monetária -->
                        <div>
                            <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Valor (R$)</label>
                            <div style="position: relative;">
                                <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.4); font-size: 18px; font-weight: 700;">R$</span>
                                <input type="text" id="valorAcertoDisplay" placeholder="0,00"
                                       oninput="formatarCampoMonetario(this)"
                                       style="width: 100%; padding: 14px 16px 14px 50px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #fff; font-size: 24px; font-weight: 700; box-sizing: border-box; text-align: right;"
                                       onfocus="this.style.borderColor='#fbbf24'; this.style.boxShadow='0 0 0 3px rgba(251,191,36,0.2)';"
                                       onblur="this.style.borderColor='rgba(255,255,255,0.2)'; this.style.boxShadow='none';">
                                <input type="hidden" id="valorAcerto" value="0">
                            </div>
                        </div>

                        <!-- Descrição -->
                        <div>
                            <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Descrição</label>
                            <input type="text" id="descricaoAcerto" placeholder="Ex: PIX recebido, Transferência..."
                                   style="width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #fff; font-size: 14px; box-sizing: border-box;"
                                   onfocus="this.style.borderColor='#fbbf24';"
                                   onblur="this.style.borderColor='rgba(255,255,255,0.2)';">
                        </div>

                        <!-- Método + Data (lado a lado) -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Método</label>
                                <select id="metodoAcerto"
                                        style="width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #fff; font-size: 14px; box-sizing: border-box; cursor: pointer;">
                                    <option value="pix" style="background: #1e293b;">PIX</option>
                                    <option value="transferencia" style="background: #1e293b;">Transferência</option>
                                    <option value="dinheiro" style="background: #1e293b;">Dinheiro</option>
                                    <option value="outro" style="background: #1e293b;">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Data</label>
                                <input type="date" id="dataAcerto"
                                       style="width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #fff; font-size: 14px; box-sizing: border-box;"
                                       value="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>

                        <!-- Observações -->
                        <div>
                            <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Observações (opcional)</label>
                            <textarea id="observacoesAcerto" rows="2" placeholder="Observações adicionais..."
                                      style="width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #fff; font-size: 14px; box-sizing: border-box; resize: none;"></textarea>
                        </div>

                        <!-- Botões -->
                        <div style="display: flex; gap: 12px; margin-top: 8px;">
                            <button onclick="document.getElementById('modalAcertoFinanceiro').remove()"
                                    style="flex: 1; padding: 14px 16px; border-radius: 10px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); font-weight: 600; font-size: 14px; border: none; cursor: pointer; transition: all 0.2s;"
                                    onmouseover="this.style.background='rgba(255,255,255,0.15)';"
                                    onmouseout="this.style.background='rgba(255,255,255,0.1)';">
                                Cancelar
                            </button>
                            <button onclick="confirmarAcertoFinanceiro('${ligaId}', '${timeId}', '${nomeTime}')"
                                    style="flex: 1; padding: 14px 16px; border-radius: 10px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-weight: 700; font-size: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(245,158,11,0.3);"
                                    onmouseover="this.style.background='linear-gradient(135deg, #fbbf24, #f59e0b)';"
                                    onmouseout="this.style.background='linear-gradient(135deg, #f59e0b, #d97706)';">
                                <span class="material-icons" style="font-size: 16px;">check</span>
                                Confirmar
                            </button>
                        </div>
                    </div>

                    <!-- Aba: Histórico -->
                    <div id="conteudoHistorico" style="display: none; padding: 20px;">
                        <div id="historicoAcertosLista" style="display: flex; flex-direction: column; gap: 12px;">
                            <div style="text-align: center; padding: 40px 20px; color: rgba(255,255,255,0.4);">
                                <span class="material-icons" style="font-size: 48px; margin-bottom: 12px;">hourglass_empty</span>
                                <p style="margin: 0;">Carregando histórico...</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Armazenar dados no modal para uso nas funções
    window._acertoModalData = { ligaId, timeId, nomeTime };

    // Focus no campo de valor
    setTimeout(() => {
        document.getElementById("valorAcertoDisplay")?.focus();
    }, 100);

    // Pré-carregar histórico em background
    carregarHistoricoAcertos(ligaId, timeId);
};

// =============================================================================
// ✅ v5.5: FUNÇÕES AUXILIARES DO MODAL DE ACERTOS
// =============================================================================

/**
 * Formata campo monetário com máscara brasileira (1.234,56)
 */
window.formatarCampoMonetario = function (input) {
    // Remover tudo que não é dígito
    let valor = input.value.replace(/\D/g, "");

    // Se vazio, limpar
    if (!valor) {
        input.value = "";
        document.getElementById("valorAcerto").value = "0";
        return;
    }

    // Converter para centavos e depois para reais
    let valorNumerico = parseInt(valor, 10) / 100;

    // Limitar a 999.999,99
    if (valorNumerico > 999999.99) {
        valorNumerico = 999999.99;
    }

    // Formatar para exibição (1.234,56)
    const formatado = valorNumerico.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    input.value = formatado;

    // Atualizar campo hidden com valor numérico
    document.getElementById("valorAcerto").value = valorNumerico.toFixed(2);
};

/**
 * Troca entre abas do modal de acertos
 */
window.trocarAbaAcerto = function (aba) {
    const tabNovo = document.getElementById("tabNovoAcerto");
    const tabHistorico = document.getElementById("tabHistorico");
    const conteudoNovo = document.getElementById("conteudoNovoAcerto");
    const conteudoHistorico = document.getElementById("conteudoHistorico");

    if (aba === "novo") {
        // Ativar aba Novo Acerto
        tabNovo.style.cssText = "flex: 1; padding: 12px 16px; background: rgba(245,158,11,0.1); border: none; border-bottom: 2px solid #f59e0b; color: #fbbf24; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;";
        tabHistorico.style.cssText = "flex: 1; padding: 12px 16px; background: transparent; border: none; border-bottom: 2px solid transparent; color: rgba(255,255,255,0.5); font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;";
        conteudoNovo.style.display = "flex";
        conteudoHistorico.style.display = "none";
    } else {
        // Ativar aba Histórico
        tabHistorico.style.cssText = "flex: 1; padding: 12px 16px; background: rgba(245,158,11,0.1); border: none; border-bottom: 2px solid #f59e0b; color: #fbbf24; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;";
        tabNovo.style.cssText = "flex: 1; padding: 12px 16px; background: transparent; border: none; border-bottom: 2px solid transparent; color: rgba(255,255,255,0.5); font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;";
        conteudoNovo.style.display = "none";
        conteudoHistorico.style.display = "block";
    }
};

/**
 * ✅ v7.0: Histórico COMPLETO igual extrato individual
 * - Card resumo com saldo
 * - Seção "Movimentação por Rodada" (accordion) com banco/PC/MM/Top10
 * - Seção "Acertos Financeiros" com lista de pagamentos/recebimentos
 */
async function carregarHistoricoAcertos(ligaId, timeId) {
    const container = document.getElementById("historicoAcertosLista");
    if (!container) return;

    // Armazenar IDs para uso nas funções de delete
    window._acertoModalData = { ...window._acertoModalData, ligaId, timeId };

    try {
        // ✅ v6.4: Buscar acertos E extrato em paralelo para mostrar saldo FINAL
        // ✅ v7.1 FIX: Passar temporada nas requisições
        const temporada = window.temporadaAtual || 2025;
        const [acertosResponse, extratoResponse] = await Promise.all([
            fetch(`/api/acertos/${ligaId}/${timeId}?temporada=${temporada}`),
            fetch(`/api/extrato-cache/${ligaId}/times/${timeId}?temporada=${temporada}`)
        ]);

        const result = await acertosResponse.json();
        const extratoResult = await extratoResponse.json();

        // Resumo dos acertos
        const resumoAcertos = result.success ? (result.resumo || {}) : {};
        const totalPago = resumoAcertos.totalPago || 0;
        const totalRecebido = resumoAcertos.totalRecebido || 0;
        const acertosList = result.success ? (result.acertos || []) : [];

        // ✅ v7.0: Extrair dados do extrato (rodadas)
        const rodadas = extratoResult.rodadas || extratoResult.extrato?.rodadas || [];
        const resumoExtrato = extratoResult.resumo || extratoResult.extrato?.resumo || {};

        // ✅ v6.5: Saldo FINAL vem do extrato (inclui temporada + acertos)
        const saldoFinal = parseFloat(resumoExtrato.saldo) || parseFloat(resumoExtrato.saldo_final) || 0;
        const saldoTemporada = parseFloat(resumoExtrato.saldo_temporada) || parseFloat(resumoExtrato.saldo_final) || saldoFinal;

        // Terminologia baseada no saldo FINAL
        let txtSaldo, corSaldo;
        const isZero = Math.abs(saldoFinal) < 0.005;

        if (isZero) {
            txtSaldo = "QUITADO";
            corSaldo = "#a3a3a3";
        } else if (saldoFinal > 0) {
            txtSaldo = "A RECEBER";
            corSaldo = "#34d399";
        } else {
            txtSaldo = "DEVE";
            corSaldo = "#f87171";
        }

        const corTemporada = saldoTemporada >= 0 ? "#34d399" : "#f87171";
        const corAcertos = (totalPago - totalRecebido) >= 0 ? "#34d399" : "#f87171";

        // ===== CARD RESUMO =====
        let html = `
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 16px; text-align: center;">
                <div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${txtSaldo}</div>
                <div style="font-size: 28px; font-weight: 700; color: ${corSaldo};">${saldoFinal !== 0 ? 'R$ ' + Math.abs(saldoFinal).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : '✓'}</div>
                <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); text-align: left; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span style="color: rgba(255,255,255,0.6);">Saldo Jogo:</span>
                        <span style="color: ${corTemporada}; font-weight: 600;">${saldoTemporada >= 0 ? '+' : '-'}R$ ${Math.abs(saldoTemporada).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span style="color: rgba(255,255,255,0.6);">Acertos (${acertosList.length}):</span>
                        <span style="color: ${corAcertos}; font-weight: 600;">${(totalPago - totalRecebido) >= 0 ? '+' : '-'}R$ ${Math.abs(totalPago - totalRecebido).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>
        `;

        // ===== SEÇÃO: MOVIMENTAÇÃO POR RODADA (ACCORDION) =====
        const rodadasComMovimento = rodadas.filter(r => {
            const saldo = (r.bonusOnus || 0) + (r.pontosCorridos || 0) + (r.mataMata || 0) + (r.top10 || 0) + (r.banco || 0);
            return saldo !== 0 || r.posicao;
        }).sort((a, b) => b.rodada - a.rodada);

        if (rodadasComMovimento.length > 0) {
            html += `
                <div style="margin-bottom: 16px;">
                    <button onclick="toggleAccordionHistorico('rodadas')"
                            style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 10px; cursor: pointer; transition: all 0.2s;"
                            onmouseover="this.style.background='rgba(245,158,11,0.15)';"
                            onmouseout="this.style.background='rgba(245,158,11,0.1)';">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="material-icons" style="font-size: 18px; color: #fbbf24;">sports_soccer</span>
                            <span style="font-size: 13px; font-weight: 600; color: #fff;">Movimentação por Rodada</span>
                            <span style="font-size: 11px; color: rgba(255,255,255,0.5);">(${rodadasComMovimento.length})</span>
                        </div>
                        <span class="material-icons" id="iconAccordionRodadas" style="font-size: 18px; color: rgba(255,255,255,0.5); transition: transform 0.2s;">expand_more</span>
                    </button>
                    <div id="conteudoAccordionRodadas" style="display: none; margin-top: 8px; max-height: 300px; overflow-y: auto;">
                        ${renderizarRodadasHistorico(rodadasComMovimento)}
                    </div>
                </div>
            `;
        }

        // ===== SEÇÃO: ACERTOS FINANCEIROS =====
        html += `
            <div style="margin-bottom: 8px;">
                <button onclick="toggleAccordionHistorico('acertos')"
                        style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); border-radius: 10px; cursor: pointer; transition: all 0.2s;"
                        onmouseover="this.style.background='rgba(52,211,153,0.15)';"
                        onmouseout="this.style.background='rgba(52,211,153,0.1)';">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons" style="font-size: 18px; color: #34d399;">payments</span>
                        <span style="font-size: 13px; font-weight: 600; color: #fff;">Acertos Financeiros</span>
                        <span style="font-size: 11px; color: rgba(255,255,255,0.5);">(${acertosList.length})</span>
                    </div>
                    <span class="material-icons" id="iconAccordionAcertos" style="font-size: 18px; color: rgba(255,255,255,0.5); transition: transform 0.2s; transform: rotate(180deg);">expand_more</span>
                </button>
                <div id="conteudoAccordionAcertos" style="display: block; margin-top: 8px; max-height: 300px; overflow-y: auto;">
        `;

        if (acertosList.length === 0) {
            html += `
                <div style="text-align: center; padding: 24px 16px; color: rgba(255,255,255,0.4);">
                    <span class="material-icons" style="font-size: 32px; margin-bottom: 8px;">receipt_long</span>
                    <p style="margin: 0; font-size: 13px;">Nenhum acerto registrado</p>
                </div>
            `;
        } else {
            // Lista de acertos
            acertosList.forEach((acerto) => {
                const isPagamento = acerto.tipo === "pagamento";
                const cor = isPagamento ? "#34d399" : "#f87171";
                const icone = isPagamento ? "arrow_upward" : "arrow_downward";
                const sinal = isPagamento ? "+" : "-";
                const data = acerto.dataAcerto ? new Date(acerto.dataAcerto).toLocaleDateString("pt-BR") : "--";
                const metodo = acerto.metodoPagamento ? acerto.metodoPagamento.toUpperCase() : "";
                const descricaoEscapada = (acerto.descricao || "Acerto").replace(/'/g, "\\'");

                html += `
                    <div id="acerto-item-${acerto._id}" style="background: rgba(255,255,255,0.03); border-radius: 10px; padding: 12px; border-left: 3px solid ${cor}; display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isPagamento ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span class="material-icons" style="font-size: 16px; color: ${cor};">${icone}</span>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 13px; color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${acerto.descricao || "Acerto"}</div>
                            <div style="font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 2px;">${data} ${metodo ? "• " + metodo : ""}</div>
                        </div>
                        <div style="text-align: right; flex-shrink: 0; display: flex; align-items: center; gap: 8px;">
                            <div style="font-size: 14px; font-weight: 700; color: ${cor};">${sinal}R$ ${acerto.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                            <button onclick="confirmarDeletarAcerto('${acerto._id}', '${descricaoEscapada}', ${acerto.valor}, '${acerto.tipo}')"
                                    style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; padding: 5px 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
                                    onmouseover="this.style.background='rgba(239,68,68,0.2)';"
                                    onmouseout="this.style.background='rgba(239,68,68,0.1)';"
                                    title="Excluir acerto">
                                <span class="material-icons" style="font-size: 14px; color: #f87171;">delete</span>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error("[ACERTOS] Erro ao carregar histórico:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: rgba(255,255,255,0.4);">
                <span class="material-icons" style="font-size: 48px; margin-bottom: 12px; color: #f87171;">error</span>
                <p style="margin: 0; font-size: 14px;">Erro ao carregar histórico</p>
            </div>
        `;
    }
}

/**
 * ✅ v7.0: Renderiza cards de rodadas no histórico (estilo compacto)
 */
function renderizarRodadasHistorico(rodadas) {
    if (!rodadas || rodadas.length === 0) {
        return `
            <div style="text-align: center; padding: 24px 16px; color: rgba(255,255,255,0.4);">
                <span class="material-icons" style="font-size: 32px; margin-bottom: 8px;">sports_soccer</span>
                <p style="margin: 0; font-size: 13px;">Nenhuma movimentação</p>
            </div>
        `;
    }

    return rodadas.map(r => {
        const banco = r.bonusOnus || r.banco || 0;
        const pc = r.pontosCorridos || 0;
        const mm = r.mataMata || 0;
        const top10 = r.top10 || 0;
        const saldo = banco + pc + mm + top10;
        const positivo = saldo >= 0;
        const cor = positivo ? "#34d399" : "#f87171";
        const bgCor = positivo ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)";
        const borderCor = positivo ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)";

        // Badges para cada componente
        let badges = [];
        if (banco !== 0) {
            const corBanco = banco >= 0 ? "#fbbf24" : "#f87171";
            badges.push(`<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(251,191,36,0.15); color: ${corBanco}; font-weight: 600;">BANCO ${banco >= 0 ? '+' : ''}${banco}</span>`);
        }
        if (pc !== 0) {
            const corPC = pc >= 0 ? "#34d399" : "#f87171";
            badges.push(`<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(52,211,153,0.15); color: ${corPC}; font-weight: 600;">PC ${pc >= 0 ? '+' : ''}${pc}</span>`);
        }
        if (mm !== 0) {
            const corMM = mm >= 0 ? "#a78bfa" : "#f87171";
            badges.push(`<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(167,139,250,0.15); color: ${corMM}; font-weight: 600;">MM ${mm >= 0 ? '+' : ''}${mm}</span>`);
        }
        if (top10 !== 0) {
            const isMito = r.isMito || top10 > 0;
            const corTop = isMito ? "#fbbf24" : "#f87171";
            const label = isMito ? "MITO" : "MICO";
            badges.push(`<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${isMito ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)'}; color: ${corTop}; font-weight: 600;">${label} ${top10 >= 0 ? '+' : ''}${top10}</span>`);
        }

        // Posição
        const posLabel = r.posicao ? `${r.posicao}º` : "-";

        return `
            <div style="background: ${bgCor}; border-radius: 8px; padding: 10px 12px; border-left: 3px solid ${borderCor}; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 12px; font-weight: 700; color: #fff;">R${r.rodada}</span>
                        <span style="font-size: 10px; color: rgba(255,255,255,0.5);">${posLabel} lugar</span>
                    </div>
                    <span style="font-size: 14px; font-weight: 700; color: ${cor};">${positivo ? '+' : ''}R$ ${Math.abs(saldo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${badges.join('')}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * ✅ v7.0: Toggle accordion no histórico
 */
window.toggleAccordionHistorico = function(tipo) {
    const conteudo = document.getElementById(`conteudoAccordion${tipo === 'rodadas' ? 'Rodadas' : 'Acertos'}`);
    const icone = document.getElementById(`iconAccordion${tipo === 'rodadas' ? 'Rodadas' : 'Acertos'}`);

    if (!conteudo || !icone) return;

    const isVisible = conteudo.style.display !== 'none';
    conteudo.style.display = isVisible ? 'none' : 'block';
    icone.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
}

/**
 * Mostra confirmação antes de deletar acerto
 */
window.confirmarDeletarAcerto = function(acertoId, descricao, valor, tipo) {
    const tipoTexto = tipo === "pagamento" ? "PAGAMENTO" : "RECEBIMENTO";
    const valorFormatado = valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

    // Criar modal de confirmação
    const modalConfirm = document.createElement("div");
    modalConfirm.id = "modalConfirmarDelete";
    modalConfirm.style.cssText = "position: fixed; inset: 0; z-index: 10001; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.85);";
    modalConfirm.innerHTML = `
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 16px; width: 90%; max-width: 380px; padding: 24px; border: 1px solid rgba(239,68,68,0.3); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(239,68,68,0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <span class="material-icons" style="font-size: 28px; color: #f87171;">warning</span>
                </div>
                <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #fff;">Excluir Acerto?</h3>
                <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.5;">
                    Esta ação irá reverter o ${tipoTexto} de<br>
                    <strong style="color: #fff;">R$ ${valorFormatado}</strong> - ${descricao}
                </p>
            </div>
            <div style="background: rgba(239,68,68,0.1); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12px; color: #f87171; display: flex; align-items: center; gap: 8px;">
                    <span class="material-icons" style="font-size: 16px;">info</span>
                    O saldo do participante será ${tipo === "pagamento" ? "REDUZIDO (volta a dívida)" : "AUMENTADO (volta o crédito)"}.
                </p>
            </div>
            <div style="display: flex; gap: 12px;">
                <button onclick="document.getElementById('modalConfirmarDelete').remove()"
                        style="flex: 1; padding: 12px 16px; border-radius: 10px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); font-weight: 600; font-size: 14px; border: none; cursor: pointer;">
                    Cancelar
                </button>
                <button onclick="executarDeletarAcerto('${acertoId}')"
                        style="flex: 1; padding: 12px 16px; border-radius: 10px; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; font-weight: 700; font-size: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <span class="material-icons" style="font-size: 16px;">delete</span>
                    Excluir
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modalConfirm);
};

/**
 * Executa a deleção do acerto
 */
window.executarDeletarAcerto = async function(acertoId) {
    const btnExcluir = document.querySelector("#modalConfirmarDelete button:last-child");
    if (btnExcluir) {
        btnExcluir.disabled = true;
        btnExcluir.innerHTML = '<span class="material-icons" style="font-size: 16px; animation: spin 1s linear infinite;">sync</span> Excluindo...';
    }

    try {
        const response = await fetch(`/api/acertos/${acertoId}?hardDelete=true`, {
            method: "DELETE",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Erro ao excluir acerto");
        }

        // Fechar modal de confirmação
        document.getElementById("modalConfirmarDelete")?.remove();

        // Mostrar toast de sucesso
        mostrarToastAcerto("Acerto excluído com sucesso!", true);

        // Recarregar histórico
        const data = window._acertoModalData;
        if (data?.ligaId && data?.timeId) {
            await carregarHistoricoAcertos(data.ligaId, data.timeId);
        }

        // Recarregar extrato se estiver visualizando
        if (window.recarregarExtratoAtual) {
            await window.recarregarExtratoAtual();
        }

        console.log("[ACERTOS] ✅ Acerto excluído:", result);

    } catch (error) {
        console.error("[ACERTOS] ❌ Erro ao excluir:", error);
        mostrarToastAcerto(`Erro: ${error.message}`, false);
        document.getElementById("modalConfirmarDelete")?.remove();
    }
};

/**
 * Seleciona o tipo de acerto (pagamento ou recebimento)
 * ✅ v5.4: CSS inline ao invés de Tailwind
 */
window.selecionarTipoAcerto = function (tipo) {
    const btnPagamento = document.getElementById("btnTipoPagamento");
    const btnRecebimento = document.getElementById("btnTipoRecebimento");
    const inputTipo = document.getElementById("tipoAcerto");

    // Estilos base compartilhados
    const baseStyle = "flex: 1; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;";

    if (tipo === "pagamento") {
        btnPagamento.style.cssText = baseStyle + "border: 2px solid #f43f5e; background: rgba(244,63,94,0.15); color: #fb7185;";
        btnRecebimento.style.cssText = baseStyle + "border: 2px solid rgba(255,255,255,0.2); background: transparent; color: rgba(255,255,255,0.6);";
    } else {
        btnRecebimento.style.cssText = baseStyle + "border: 2px solid #10b981; background: rgba(16,185,129,0.15); color: #34d399;";
        btnPagamento.style.cssText = baseStyle + "border: 2px solid rgba(255,255,255,0.2); background: transparent; color: rgba(255,255,255,0.6);";
    }

    inputTipo.value = tipo;
};

/**
 * Confirma e envia o acerto financeiro para a API
 * ✅ v5.6: Troco automático - Mostra mensagem quando pagamento > dívida
 * ✅ v5.5: Atualizado para usar campo hidden de valor
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
        mostrarToastAcerto("Informe um valor válido", false);
        document.getElementById("valorAcertoDisplay")?.focus();
        return;
    }

    if (!descricao) {
        mostrarToastAcerto("Informe uma descrição", false);
        document.getElementById("descricaoAcerto")?.focus();
        return;
    }

    // Feedback visual no botão
    const btnConfirmar = document.querySelector("#conteudoNovoAcerto button:last-child");
    const textoOriginal = btnConfirmar?.innerHTML;
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<span class="material-icons" style="font-size: 16px; animation: spin 1s linear infinite;">sync</span> Salvando...';
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
                temporada: window.temporadaAtual || 2025,
                registradoPor: "admin",
            }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Erro ao registrar acerto");
        }

        // Fechar modal
        document.getElementById("modalAcertoFinanceiro")?.remove();

        // ✅ v5.6: Verificar se houve troco e mostrar modal especial
        if (result.troco && result.troco.valor > 0) {
            mostrarModalTroco(result.troco.valor, valor, nomeTime);
        } else {
            // Mostrar toast de sucesso normal
            mostrarToastAcerto(`Acerto de R$ ${valor.toFixed(2).replace(".", ",")} registrado!`, true);
        }

        // ✅ v6.1 FIX: INVALIDAR CACHE DO EXTRATO APÓS O ACERTO
        // Sem isso, o cache antigo (sem o acerto) continuaria sendo retornado
        console.log(`[ACERTOS] 🔄 Invalidando cache de extrato para time ${timeId} após acerto.`);
        if (window.invalidarCacheTime) {
            await window.invalidarCacheTime(ligaId, timeId);
        }

        // Recarregar extrato se estiver visualizando
        if (window.recarregarExtratoAtual) {
            await window.recarregarExtratoAtual();
        }

        // ✅ v6.2 FIX: RECARREGAR TABELA GERAL para atualizar saldo na lista de participantes
        if (window.recarregarFluxoFinanceiro) {
            console.log("[ACERTOS] 🔄 Recarregando tabela de participantes...");
            window.recarregarFluxoFinanceiro();
        }

        console.log("[ACERTOS] ✅ Acerto registrado:", result);
    } catch (error) {
        console.error("[ACERTOS] ❌ Erro:", error);
        mostrarToastAcerto(`Erro: ${error.message}`, false);

        // Restaurar botão
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = textoOriginal;
        }
    }
};

/**
 * ✅ v5.6: Modal especial para mostrar troco gerado
 * Exibido quando um pagamento excede a dívida do participante
 */
function mostrarModalTroco(valorTroco, valorPagamento, nomeParticipante) {
    // Remover modal anterior se existir
    document.getElementById("modalTrocoGerado")?.remove();

    const modal = document.createElement("div");
    modal.id = "modalTrocoGerado";
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 10002;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.85);
        animation: fadeIn 0.3s ease;
    `;
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 20px; width: 90%; max-width: 400px; padding: 32px; border: 2px solid rgba(52,211,153,0.3); box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(52,211,153,0.2); text-align: center;">
            <!-- Ícone animado -->
            <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1)); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; animation: pulse 2s infinite;">
                <span class="material-icons" style="font-size: 40px; color: #34d399;">savings</span>
            </div>

            <!-- Título -->
            <h3 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #fff;">Troco Gerado!</h3>
            <p style="margin: 0 0 24px 0; font-size: 14px; color: rgba(255,255,255,0.6);">
                ${nomeParticipante}
            </p>

            <!-- Valor do troco -->
            <div style="background: rgba(52,211,153,0.1); border-radius: 16px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(52,211,153,0.2);">
                <div style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Saldo Positivo Creditado</div>
                <div style="font-size: 36px; font-weight: 800; color: #34d399;">
                    R$ ${valorTroco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
            </div>

            <!-- Explicação -->
            <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <span class="material-icons" style="font-size: 18px; color: #fbbf24;">info</span>
                    <span style="font-size: 13px; color: rgba(255,255,255,0.7); font-weight: 600;">O que aconteceu?</span>
                </div>
                <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.6;">
                    O pagamento de <strong style="color: #f87171;">R$ ${valorPagamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                    excedeu o valor da dívida. O troco de <strong style="color: #34d399;">R$ ${valorTroco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                    foi automaticamente creditado como saldo positivo.
                </p>
            </div>

            <!-- Botão -->
            <button onclick="document.getElementById('modalTrocoGerado').remove()"
                    style="width: 100%; padding: 14px 24px; border-radius: 12px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-weight: 700; font-size: 15px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(16,185,129,0.3);"
                    onmouseover="this.style.transform='scale(1.02)';"
                    onmouseout="this.style.transform='scale(1)';">
                <span class="material-icons" style="font-size: 18px;">check_circle</span>
                Entendi
            </button>
        </div>

        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        </style>
    `;

    document.body.appendChild(modal);

    // Fechar com ESC ou clique fora
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
    });
    document.addEventListener("keydown", function escHandler(e) {
        if (e.key === "Escape") {
            modal.remove();
            document.removeEventListener("keydown", escHandler);
        }
    });
}

/**
 * Mostra toast de feedback
 * ✅ v5.5: CSS inline ao invés de Tailwind
 */
function mostrarToastAcerto(mensagem, sucesso) {
    // Remover toast anterior se existir
    document.getElementById("toastAcerto")?.remove();

    const toast = document.createElement("div");
    toast.id = "toastAcerto";
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        padding: 14px 24px;
        border-radius: 50px;
        font-size: 14px;
        font-weight: 600;
        z-index: 10001;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideUp 0.3s ease;
        ${sucesso
            ? "background: linear-gradient(135deg, #10b981, #059669); color: white;"
            : "background: linear-gradient(135deg, #ef4444, #dc2626); color: white;"
        }
    `;
    toast.innerHTML = `
        <span class="material-icons" style="font-size: 20px;">${sucesso ? "check_circle" : "error"}</span>
        ${mensagem}
    `;

    // Injetar animação se não existir
    if (!document.getElementById("toastAnimationStyle")) {
        const style = document.createElement("style");
        style.id = "toastAnimationStyle";
        style.textContent = `
            @keyframes slideUp {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

/**
 * Lista acertos de um participante (para exibição no admin)
 * ✅ v7.1 FIX: Passar temporada
 */
window.listarAcertosParticipante = async function (ligaId, timeId) {
    try {
        const temporada = window.temporadaAtual || 2025;
        const response = await fetch(`/api/acertos/${ligaId}/${timeId}?temporada=${temporada}`);
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

// =============================================================================
// ===== RENOVAÇÃO DE TEMPORADA 2026 (v7.7) =====
// =============================================================================

/**
 * Inicializa módulo de renovação quando disponível
 */
async function inicializarModuloRenovacao() {
    const ligaId = obterLigaId();
    if (!ligaId) return;

    // Verificar se módulos de renovação estão disponíveis
    if (typeof RenovacaoCore !== 'undefined' && typeof RenovacaoAPI !== 'undefined') {
        try {
            await RenovacaoCore.init(ligaId);
            RenovacaoCore.setupEventListeners();
            console.log("[FLUXO-ADMIN] ✅ Módulo de Renovação 2026 inicializado");
        } catch (error) {
            console.warn("[FLUXO-ADMIN] Renovação não inicializado:", error.message);
        }
    }
}

/**
 * Abre modal de configuração de renovação da liga
 */
window.abrirConfigRenovacao = function() {
    const ligaId = obterLigaId();
    if (!ligaId) {
        alert("Liga não identificada");
        return;
    }

    if (typeof RenovacaoUI !== 'undefined') {
        RenovacaoUI.abrirModalConfig(ligaId);
    } else {
        console.warn("[RENOVACAO] Módulos não carregados - carregando dinamicamente...");
        carregarModulosRenovacao().then(() => {
            RenovacaoUI.abrirModalConfig(ligaId);
        });
    }
};

/**
 * Abre modal para adicionar novo participante
 */
window.abrirNovoParticipante = function() {
    const ligaId = obterLigaId();
    if (!ligaId) {
        alert("Liga não identificada");
        return;
    }

    if (typeof RenovacaoUI !== 'undefined') {
        RenovacaoUI.abrirModalNovoParticipante(ligaId);
    } else {
        carregarModulosRenovacao().then(() => {
            RenovacaoUI.abrirModalNovoParticipante(ligaId);
        });
    }
};

/**
 * Abre modal de ação (renovar/não participar) para um participante
 */
window.abrirAcaoRenovacao = function(timeId, nomeTime, nomeCartoleiro, escudo) {
    const ligaId = obterLigaId();
    if (!ligaId) {
        alert("Liga não identificada");
        return;
    }

    const participante = {
        time_id: timeId,
        nome_time: nomeTime || '',
        nome_cartoleiro: nomeCartoleiro || '',
        escudo: escudo || ''
    };

    if (typeof RenovacaoCore !== 'undefined') {
        RenovacaoCore.abrirAcao(participante);
    } else {
        carregarModulosRenovacao().then(() => {
            RenovacaoCore.init(ligaId).then(() => {
                RenovacaoCore.abrirAcao(participante);
            });
        });
    }
};

/**
 * Carrega módulos de renovação dinamicamente
 */
async function carregarModulosRenovacao() {
    const CACHE_BUSTER_RENOV = "v1.0";

    const scripts = [
        '/js/renovacao/renovacao-api.js',
        '/js/renovacao/renovacao-modals.js',
        '/js/renovacao/renovacao-ui.js',
        '/js/renovacao/renovacao-core.js'
    ];

    for (const src of scripts) {
        if (!document.querySelector(`script[src*="${src}"]`)) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = `${src}?${CACHE_BUSTER_RENOV}`;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
    }

    console.log("[FLUXO-ADMIN] Módulos de Renovação carregados dinamicamente");
}

// Tentar inicializar renovação após carregamento do fluxo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(inicializarModuloRenovacao, 1000);
});

// =============================================================================
// ===== WHATSAPP DIRETO (v7.8) =====
// =============================================================================

/**
 * Formata número de telefone para link do WhatsApp
 * Aceita formatos: (11) 99999-9999, 11999999999, +55 11 99999-9999
 * @param {string} telefone - Número do telefone
 * @returns {string} Número formatado para wa.me (ex: 5511999999999)
 */
function formatarTelefoneWhatsApp(telefone) {
    if (!telefone) return null;

    // Remove tudo que não é número
    let numeros = telefone.replace(/\D/g, '');

    // Se começar com 0, remove
    if (numeros.startsWith('0')) {
        numeros = numeros.substring(1);
    }

    // Se não tiver código do país (55), adiciona
    if (!numeros.startsWith('55')) {
        numeros = '55' + numeros;
    }

    // Valida tamanho mínimo (55 + DDD + número = 12-13 dígitos)
    if (numeros.length < 12) {
        console.warn('[WHATSAPP] Número muito curto:', telefone, '->', numeros);
        return null;
    }

    return numeros;
}

/**
 * Abre WhatsApp Web/App com mensagem pré-definida
 * @param {string} contato - Número do telefone
 * @param {string} nome - Nome do participante
 */
window.abrirWhatsApp = function(contato, nome) {
    const numero = formatarTelefoneWhatsApp(contato);

    if (!numero) {
        alert('Número de WhatsApp inválido: ' + contato);
        return;
    }

    // Mensagem padrão (pode ser customizada)
    const mensagem = encodeURIComponent(
        `Olá ${nome}! 👋\n\n` +
        `Sou da *Super Cartola* e gostaria de falar sobre sua participação na liga.\n\n` +
        `Posso te ajudar?`
    );

    // Abrir WhatsApp (funciona em mobile e desktop)
    const url = `https://wa.me/${numero}?text=${mensagem}`;

    console.log('[WHATSAPP] Abrindo:', url);
    window.open(url, '_blank');
};

console.log("[FLUXO-ADMIN] ✅ v7.9 carregado (Seletor de Temporada 2025/2026)");
