// ✅ DETALHE-LIGA.JS - ARQUIVO PRINCIPAL DO SISTEMA
console.log("🚀 [DETALHE-LIGA] Iniciando sistema...");

// ✅ Aguardar DOM carregar
document.addEventListener("DOMContentLoaded", async function () {
    console.log("🔧 [DETALHE-LIGA] DOM carregado, inicializando...");

    // Aguardar módulos carregarem
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
        // Inicializar sistema de tabs
        initializeTabs();

        // Carregar dados da liga
        await loadLigaDetails();

        // Carregar dados inicial (ranking geral)
        await loadInitialData();

        console.log("✅ [DETALHE-LIGA] Sistema inicializado com sucesso");
    } catch (error) {
        console.error("❌ [DETALHE-LIGA] Erro na inicialização:", error);
    }
});

// ✅ Sistema de tabs
function initializeTabs() {
    console.log("📑 [DETALHE-LIGA] Inicializando sistema de tabs...");

    const tabButtons = document.querySelectorAll(".tab-button");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabButtons.forEach((button) => {
        button.addEventListener("click", async function () {
            const tabId = this.getAttribute("data-tab");
            console.log(`🔧 [DETALHE-LIGA] Mudando para tab: ${tabId}`);

            // Atualizar UI das tabs
            tabButtons.forEach((btn) => btn.classList.remove("active"));
            tabPanes.forEach((pane) => pane.classList.remove("active"));

            this.classList.add("active");
            const targetPane = document.getElementById(tabId);
            if (targetPane) {
                targetPane.classList.add("active");
                await loadTabModule(tabId);
            }
        });
    });
}

// ✅ Carregamento modular por tab
async function loadTabModule(tabId) {
    try {
        console.log(`🔧 [DETALHE-LIGA] Carregando módulo: ${tabId}`);

        switch (tabId) {
            case "ranking-geral":
                if (window.modulosCarregados?.ranking?.carregarRankingGeral) {
                    await window.modulosCarregados.ranking.carregarRankingGeral();
                } else {
                    console.warn(
                        "⚠️ [DETALHE-LIGA] Módulo ranking não encontrado",
                    );
                }
                break;

            case "rodadas":
                if (window.modulosCarregados?.rodadas?.carregarRodadas) {
                    await window.modulosCarregados.rodadas.carregarRodadas();
                } else {
                    console.warn(
                        "⚠️ [DETALHE-LIGA] Módulo rodadas não encontrado",
                    );
                }
                break;

            case "mata-mata":
                if (window.modulosCarregados?.mataMata?.carregarMataMata) {
                    await window.modulosCarregados.mataMata.carregarMataMata();
                } else {
                    console.warn(
                        "⚠️ [DETALHE-LIGA] Módulo mata-mata não encontrado",
                    );
                }
                break;

            case "pontos-corridos":
                if (
                    window.modulosCarregados?.pontosCorreidos
                        ?.inicializarPontosCorreidos
                ) {
                    await window.modulosCarregados.pontosCorreidos.inicializarPontosCorreidos();
                } else {
                    console.warn(
                        "⚠️ [DETALHE-LIGA] Módulo pontos-corridos não encontrado",
                    );
                }
                break;

            case "luva-de-ouro":
                if (
                    window.modulosCarregados?.luvaDeOuro?.inicializarLuvaDeOuro
                ) {
                    await window.modulosCarregados.luvaDeOuro.inicializarLuvaDeOuro();
                } else {
                    console.warn(
                        "⚠️ [DETALHE-LIGA] Módulo luva-de-ouro não encontrado",
                    );
                }
                break;

            case "artilheiro-campeao":
                if (
                    window.modulosCarregados?.artilheiroCampeao
                        ?.inicializarArtilheiroCampeao
                ) {
                    await window.modulosCarregados.artilheiroCampeao.inicializarArtilheiroCampeao();
                } else {
                    console.warn(
                        "⚠️ [DETALHE-LIGA] Módulo artilheiro-campeao não encontrado",
                    );
                }
                break;

            case "melhor-mes":
                if (window.modulosCarregados?.melhorMes?.inicializarMelhorMes) {
                    await window.modulosCarregados.melhorMes.inicializarMelhorMes();
                } else {
                    console.warn(
                        "⚠️ [DETALHE-LIGA] Módulo melhor-mes não encontrado",
                    );
                }
                break;

            case "top10":
                if (window.modulosCarregados?.top10?.inicializarTop10) {
                    await window.modulosCarregados.top10.inicializarTop10();
                } else {
                    console.warn(
                        "⚠️ [DETALHE-LIGA] Módulo top10 não encontrado",
                    );
                }
                break;

            case "fluxo-financeiro":
                if (
                    window.modulosCarregados?.fluxoFinanceiro
                        ?.inicializarFluxoFinanceiro
                ) {
                    await window.modulosCarregados.fluxoFinanceiro.inicializarFluxoFinanceiro();
                } else {
                    console.warn(
                        "⚠️ [DETALHE-LIGA] Módulo fluxo-financeiro não encontrado",
                    );
                }
                break;

            default:
                console.log(
                    `ℹ️ [DETALHE-LIGA] Tab ${tabId} não tem módulo específico`,
                );
        }
    } catch (error) {
        console.error(
            `❌ [DETALHE-LIGA] Erro ao carregar módulo ${tabId}:`,
            error,
        );
    }
}

// ✅ Carregar detalhes da liga
async function loadLigaDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const ligaId = urlParams.get("id");

    if (!ligaId) {
        console.warn("⚠️ [DETALHE-LIGA] ID da liga não encontrado na URL");
        return;
    }

    try {
        console.log(`📊 [DETALHE-LIGA] Carregando detalhes da liga: ${ligaId}`);

        // Tentar buscar dados da liga
        const response = await fetch(`/api/ligas/${ligaId}`);

        if (response.ok) {
            const liga = await response.json();
            updateLigaHeader(liga);
            console.log(
                "✅ [DETALHE-LIGA] Dados da liga carregados:",
                liga.nome,
            );
        } else {
            console.warn(
                "⚠️ [DETALHE-LIGA] API da liga falhou, usando fallback",
            );
            await loadFallbackData(ligaId);
        }
    } catch (error) {
        console.error("❌ [DETALHE-LIGA] Erro ao carregar liga:", error);
        await loadFallbackData(ligaId);
    }
}

// ✅ Dados de fallback
async function loadFallbackData(ligaId) {
    console.log("🔄 [DETALHE-LIGA] Carregando dados de fallback...");

    const fallbackData = {
        "684cb1c8af923da7c7df51de": {
            nome: "Super Cartola 2025",
            participantes: 32,
            status: "Ativo",
        },
        "684d821cf1a7ae16d1f89572": {
            nome: "Cartoleiros Sobral 2025",
            participantes: 6,
            status: "Ativo",
        },
    };

    const dados = fallbackData[ligaId] || {
        nome: "Liga Desconhecida",
        participantes: 0,
        status: "Carregando...",
    };

    updateLigaHeader(dados);
    console.log(`✅ [DETALHE-LIGA] Fallback carregado para: ${dados.nome}`);
}

// ✅ Atualizar header da liga
function updateLigaHeader(liga) {
    const nomeElement = document.getElementById("nomeLiga");
    const quantidadeElement = document.getElementById("quantidadeTimes");

    if (nomeElement) {
        nomeElement.textContent = liga.nome || "Nome da Liga";
    }

    if (quantidadeElement) {
        const participantes = liga.participantes || liga.times?.length || 0;
        quantidadeElement.textContent = `${participantes} participantes`;
    }

    console.log(
        `✅ [DETALHE-LIGA] Header atualizado: ${liga.nome} (${liga.participantes || 0} participantes)`,
    );
}

// ✅ Carregamento inicial
async function loadInitialData() {
    console.log("📊 [DETALHE-LIGA] Carregando dados iniciais...");

    try {
        // Aguardar módulos carregarem
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Carregar ranking geral por padrão
        await loadTabModule("ranking-geral");

        console.log("✅ [DETALHE-LIGA] Dados iniciais carregados");
    } catch (error) {
        console.error(
            "❌ [DETALHE-LIGA] Erro ao carregar dados iniciais:",
            error,
        );
    }
}

// ✅ Compatibilidade global
window.carregarDetalhesLiga = loadLigaDetails;
window.atualizarHeaderLiga = updateLigaHeader;

console.log("✅ [DETALHE-LIGA] Sistema carregado e pronto");