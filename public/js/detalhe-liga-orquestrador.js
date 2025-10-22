// DETALHE-LIGA ORQUESTRADOR - COORDENADOR ENXUTO
// Responsável APENAS por coordenar navegação e carregar módulos

class DetalheLigaOrquestrador {
    constructor() {
        this.processingModule = false;
        this.modules = {};
        this.loadedCSS = new Set();
        this.init();
    }

    async init() {
        try {
            console.log("Iniciando orquestrador...");
            await this.loadLayout();
            console.log("Layout carregado");

            await this.loadModules();
            console.log("Módulos carregados");

            await this.updateParticipantesCount();
            console.log("Participantes atualizados");

            this.initializeNavigation();
            console.log("Navegação inicializada");

            this.setupGlobalFunctions();
            console.log("Funções globais configuradas");

            setTimeout(() => {
                this.limparLinhaDoMeio();
            }, 1500);

            if (typeof lucide !== "undefined") {
                lucide.createIcons();
                console.log("Ícones Lucide inicializados");
            }

            console.log("Orquestrador inicializado com sucesso");
        } catch (error) {
            console.error("Erro na inicialização:", error);
        }
    }

    async loadModuleHTML(moduleName) {
        try {
            const response = await fetch(`/fronts/${moduleName}.html`);
            if (!response.ok) {
                throw new Error(`Módulo ${moduleName} não encontrado`);
            }
            return await response.text();
        } catch (error) {
            console.warn(`HTML do módulo ${moduleName} não encontrado`);
            return this.getFallbackHTML(moduleName);
        }
    }

    async loadModuleCSS(moduleName) {
        if (this.loadedCSS.has(moduleName)) return;

        try {
            const possiblePaths = [
                `/css/modules/${moduleName}.css`,
                `/${moduleName}.css`,
                `/css/${moduleName}.css`,
            ];

            for (const path of possiblePaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const cssContent = await response.text();
                        const styleElement = document.createElement("style");
                        styleElement.id = `module-css-${moduleName}`;
                        styleElement.textContent = cssContent;
                        document.head.appendChild(styleElement);
                        this.loadedCSS.add(moduleName);
                        console.log(
                            `CSS do módulo ${moduleName} carregado de: ${path}`,
                        );
                        return;
                    }
                } catch (pathError) {
                    continue;
                }
            }
        } catch (error) {
            console.log(`CSS do módulo ${moduleName} não encontrado`);
        }
    }

    async loadModule(moduleName) {
        console.log(`Carregando módulo: ${moduleName}`);

        try {
            await this.loadModuleCSS(moduleName);
            const html = await this.loadModuleHTML(moduleName);

            const contentArea = document.getElementById("dynamic-content-area");
            if (contentArea) {
                contentArea.innerHTML = html;
                console.log(`HTML do módulo ${moduleName} injetado`);
            }

            await this.executeModuleScripts(moduleName);
            return { success: true, html };
        } catch (error) {
            console.error(`Erro ao carregar módulo ${moduleName}:`, error);

            const contentArea = document.getElementById("dynamic-content-area");
            if (contentArea) {
                contentArea.innerHTML = `
                    <div class="content-card">
                        <div class="card-header">
                            <h2>Erro ao carregar módulo</h2>
                            <div class="card-subtitle">${error.message}</div>
                        </div>
                        <button class="back-button" onclick="window.orquestrador?.voltarParaCards()">
                            ← Voltar aos Cards
                        </button>
                    </div>
                `;
            }

            return { success: false, error: error.message };
        }
    }

    async executeModuleScripts(moduleName) {
        try {
            switch (moduleName) {
                case "ranking-geral":
                    const rankingContainer =
                        document.getElementById("ranking-geral");
                    if (rankingContainer)
                        rankingContainer.classList.add("active");

                    if (this.modules.ranking?.carregarRankingGeral) {
                        await this.modules.ranking.carregarRankingGeral();
                    } else if (
                        typeof window.carregarRankingGeral === "function"
                    ) {
                        await window.carregarRankingGeral();
                    }
                    break;

                case "rodadas":
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    const rodadasContainer = document.getElementById("rodadas");
                    if (rodadasContainer)
                        rodadasContainer.classList.add("active");

                    if (this.modules.rodadas?.carregarRodadas) {
                        await this.modules.rodadas.carregarRodadas();
                    } else if (typeof window.carregarRodadas === "function") {
                        await window.carregarRodadas();
                    }
                    break;

                case "mata-mata":
                    await new Promise((resolve) => setTimeout(resolve, 50));
                    const mataMataContainer =
                        document.getElementById("mata-mata");
                    if (mataMataContainer)
                        mataMataContainer.classList.add("active");

                    if (this.modules.mataMata?.carregarMataMata) {
                        await this.modules.mataMata.carregarMataMata();
                    }
                    break;

                case "pontos-corridos":
                    await new Promise((resolve) => setTimeout(resolve, 50));
                    const pontosCorridosContainer =
                        document.getElementById("pontos-corridos");
                    if (pontosCorridosContainer)
                        pontosCorridosContainer.classList.add("active");

                    if (this.modules.pontosCorridos?.carregarPontosCorridos) {
                        await this.modules.pontosCorridos.carregarPontosCorridos();
                    } else if (
                        typeof window.carregarPontosCorridos === "function"
                    ) {
                        await window.carregarPontosCorridos();
                    } else if (
                        typeof window.inicializarPontosCorridos === "function"
                    ) {
                        await window.inicializarPontosCorridos();
                    } else {
                        console.warn(
                            "Nenhuma função de inicialização de pontos corridos encontrada",
                        );
                    }
                    break;

                case "luva-de-ouro":
                    if (this.modules.luvaDeOuro?.inicializarLuvaDeOuro) {
                        await this.modules.luvaDeOuro.inicializarLuvaDeOuro();
                    }
                    break;

                case "artilheiro-campeao":
                    if (
                        this.modules.artilheiroCampeao
                            ?.inicializarArtilheiroCampeao
                    ) {
                        await this.modules.artilheiroCampeao.inicializarArtilheiroCampeao();
                    }
                    break;

                case "melhor-mes":
                    if (this.modules.melhorMes?.inicializarMelhorMes) {
                        await this.modules.melhorMes.inicializarMelhorMes();
                    }
                    break;

                case "top10":
                    if (this.modules.top10?.inicializarTop10) {
                        await this.modules.top10.inicializarTop10();
                    }
                    break;

                case "fluxo-financeiro":
                    if (
                        this.modules.fluxoFinanceiro?.inicializarFluxoFinanceiro
                    ) {
                        await this.modules.fluxoFinanceiro.inicializarFluxoFinanceiro();
                    }
                    break;

                case "participantes":
                    try {
                        await import("./participantes.js");
                        await new Promise((resolve) =>
                            setTimeout(resolve, 100),
                        );

                        if (
                            typeof window.carregarParticipantesComBrasoes ===
                            "function"
                        ) {
                            await window.carregarParticipantesComBrasoes();
                        } else {
                            console.warn(
                                "Função ainda não disponível após import",
                            );
                        }
                    } catch (error) {
                        console.error(
                            "Erro ao carregar módulo participantes:",
                            error,
                        );
                    }
                    break;
            }
        } catch (error) {
            console.error(`Erro ao executar módulo ${moduleName}:`, error);
        }
    }

    getFallbackHTML(moduleName) {
        const fallbacks = {
            "ranking-geral": `<div id="ranking-geral"><div class="loading-state">Carregando ranking...</div></div>`,
            rodadas: `<div id="rodadas"><div class="loading-state">Carregando rodadas...</div></div>`,
            "mata-mata": `<div id="mata-mata"><div class="loading-state">Carregando mata-mata...</div></div>`,
            "pontos-corridos": `<div id="pontos-corridos"><div class="loading-state">Carregando pontos corridos...</div></div>`,
            "luva-de-ouro": `<div id="luva-de-ouro-content"><div class="loading-state">Carregando luva de ouro...</div></div>`,
            "artilheiro-campeao": `<div id="artilheiro-content"><div class="loading-state">Carregando artilheiros...</div></div>`,
            "melhor-mes": `<div id="melhor-mes-content"><div class="loading-state">Carregando melhor mês...</div></div>`,
            top10: `<div id="top10-content"><div class="loading-state">Carregando top 10...</div></div>`,
            "fluxo-financeiro": `<div id="fluxo-financeiro-content"><div class="loading-state">Carregando fluxo financeiro...</div></div>`,
            participantes: `<div id="participantes-content"><div class="loading-state">Carregando participantes...</div></div>`,
        };

        return (
            fallbacks[moduleName] ||
            `<div class="empty-state"><h4>Módulo ${moduleName}</h4><p>Em desenvolvimento</p></div>`
        );
    }

    initializeNavigation() {
        const cards = document.querySelectorAll(".module-card");
        const items = document.querySelectorAll(
            ".module-items li[data-action]",
        );

        cards.forEach((card) => {
            if (card.classList.contains("disabled")) return;

            card.addEventListener("click", async (e) => {
                if (this.processingModule) return;

                card.style.transform = "translateY(-1px) scale(0.98)";
                setTimeout(() => (card.style.transform = ""), 150);

                const module = card.dataset.module;
                this.showSecondaryScreen();
                await this.handleModuleClick(module);
            });
        });

        items.forEach((item) => {
            const parentCard = item.closest(".module-card");
            if (parentCard && parentCard.classList.contains("disabled")) return;

            item.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (this.processingModule) return;

                item.style.opacity = "0.6";
                setTimeout(() => (item.style.opacity = ""), 150);
                await this.executeAction(item.dataset.action);
            });
        });
    }

    async executeAction(action, showSecondary = true) {
        if (this.processingModule) return;
        this.processingModule = true;

        try {
            if (showSecondary) this.showSecondaryScreen();
            await this.showModule(action);
        } catch (error) {
            document.getElementById("dynamic-content-area").innerHTML =
                `<div class="empty-state">Erro: ${error.message}</div>`;
        } finally {
            this.processingModule = false;
        }
    }

    async handleModuleClick(module) {
        if (this.processingModule) return;
        this.processingModule = true;

        try {
            await this.showModule(module);
        } catch (error) {
            console.error(`Erro ao carregar módulo ${module}:`, error);
            document.getElementById("dynamic-content-area").innerHTML =
                `<div class="empty-state">Erro: ${error.message}</div>`;
        } finally {
            this.processingModule = false;
        }
    }

    async showModule(moduleName) {
        const result = await this.loadModule(moduleName);
        if (!result.success) {
            document.getElementById("dynamic-content-area").innerHTML =
                `<div class="empty-state">Erro: ${result.error}</div>`;
        }
    }

    showSecondaryScreen() {
        const mainScreen = document.getElementById("main-screen");
        const secondaryScreen = document.getElementById("secondary-screen");

        if (mainScreen) {
            mainScreen.style.display = "none";
            console.log("Tela principal ocultada");
        }

        if (secondaryScreen) {
            secondaryScreen.classList.add("active");
            secondaryScreen.style.display = "block";
            console.log("Tela secundária ativada");
        }
    }

    voltarParaCards() {
        const mainScreen = document.getElementById("main-screen");
        const secondaryScreen = document.getElementById("secondary-screen");

        if (secondaryScreen) {
            secondaryScreen.classList.remove("active");
            secondaryScreen.style.display = "none";
            console.log("Tela secundária ocultada");
        }

        if (mainScreen) {
            mainScreen.style.display = "block";
            console.log("Tela principal exibida");
        }
    }

    async loadLayout() {
        try {
            const response = await fetch("layout.html");
            const layoutHtml = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(layoutHtml, "text/html");

            const sidebar = doc.querySelector(".app-sidebar");
            if (sidebar) {
                const placeholder = document.getElementById(
                    "sidebar-placeholder",
                );
                if (placeholder) {
                    placeholder.replaceWith(sidebar);

                    setTimeout(() => {
                        this.carregarLigasSidebar();
                    }, 100);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar layout:", error);
        }
    }

    async carregarLigasSidebar() {
        const ligasList = document.getElementById("ligasList");
        if (!ligasList) {
            console.warn("Elemento ligasList não encontrado");
            return;
        }

        try {
            console.log("Carregando ligas para o sidebar...");

            const response = await fetch("/api/ligas");
            const ligas = await response.json();

            if (!Array.isArray(ligas) || ligas.length === 0) {
                ligasList.innerHTML = `
                    <div class="ligas-empty">
                        Nenhuma liga criada<br>
                        <small style="color: #606060; font-size: 10px; margin-top: 4px; display: block;">
                            Clique em "Nova Liga" para começar
                        </small>
                    </div>
                `;
                return;
            }

            ligasList.innerHTML = ligas
                .map(
                    (liga) => `
                <a href="detalhe-liga.html?id=${liga._id || liga.id}" class="liga-item">
                    <div class="liga-info">
                        <div class="liga-name">${liga.nome || "Liga sem nome"}</div>
                        <div class="liga-details">${liga.times?.length || liga.participantes?.length || 0} times</div>
                    </div>
                </a>
            `,
                )
                .join("");

            console.log(`${ligas.length} ligas carregadas no sidebar`);

            const urlParams = new URLSearchParams(window.location.search);
            const ligaId = urlParams.get("id");
            if (ligaId) {
                this.highlightCurrentLigaInSidebar(ligaId);
            }
        } catch (error) {
            console.error("Erro ao carregar ligas:", error);
            ligasList.innerHTML = `
                <div class="ligas-empty">
                    Erro ao carregar<br>
                    <button onclick="window.orquestrador?.carregarLigasSidebar()" style="
                        margin-top: 8px; 
                        padding: 6px 10px; 
                        background: #ff4500; 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        font-size: 10px; 
                        cursor: pointer;
                        font-weight: 600;
                    ">Tentar Novamente</button>
                </div>
            `;
        }
    }

    highlightCurrentLigaInSidebar(ligaId) {
        try {
            const allLigaItems = document.querySelectorAll(".liga-item");
            allLigaItems.forEach((item) => {
                item.classList.remove("liga-atual");
                const badge = item.querySelector(".liga-current-badge");
                if (badge) badge.remove();
            });

            const currentLigaItem = document.querySelector(
                `a[href*="id=${ligaId}"]`,
            );
            if (currentLigaItem) {
                currentLigaItem.classList.add("liga-atual");

                const badge = document.createElement("span");
                badge.className = "liga-current-badge";
                badge.textContent = "● ";
                badge.style.cssText =
                    "color: #FF4500; font-size: 12px; font-weight: 700;";

                const ligaName = currentLigaItem.querySelector(".liga-name");
                if (ligaName) {
                    ligaName.prepend(badge);
                }

                console.log("Liga atual destacada no sidebar");
            }
        } catch (error) {
            console.warn("Erro ao destacar liga no sidebar:", error);
        }
    }

    async loadModules() {
        try {
            this.modules.ranking = await import("./ranking.js");
            // Importar e configurar módulos dinamicamente
            // Rodadas com função de carregamento
            const rodadasModule = await import("./rodadas.js");
            window.carregarRodadas = rodadasModule.carregarRodadas;
            this.modules.mataMata = await import("./mata-mata.js");
            this.modules.pontosCorridos = await import("./pontos-corridos.js");

            // 🥅 LUVA DE OURO - Carregar módulos na ordem correta
            console.log("📦 Carregando módulos Luva de Ouro...");
            await import("./luva-de-ouro/luva-de-ouro-config.js");
            await import("./luva-de-ouro/luva-de-ouro-core.js");
            await import("./luva-de-ouro/luva-de-ouro-ui.js");
            await import("./luva-de-ouro/luva-de-ouro-utils.js");
            await import("./luva-de-ouro/luva-de-ouro-cache.js");
            await import("./luva-de-ouro/luva-de-ouro-orquestrador.js");
            this.modules.luvaDeOuro = await import("./luva-de-ouro.js");
            console.log("✅ Módulos Luva de Ouro carregados");

            this.modules.artilheiroCampeao = await import(
                "./artilheiro-campeao.js"
            );
            this.modules.melhorMes = await import("./melhor-mes.js");
            this.modules.top10 = await import("./top10.js");
            this.modules.fluxoFinanceiro = await import(
                "./fluxo-financeiro.js"
            );
        } catch (error) {
            console.error("Erro ao carregar módulos:", error);
        }
    }

    async updateParticipantesCount() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const ligaId = urlParams.get("id");

            if (!ligaId) return;

            const response = await fetch(`/api/ligas/${ligaId}`);
            if (response.ok) {
                const liga = await response.json();

                const nomeElement = document.getElementById("nomeLiga");
                const quantidadeElement =
                    document.getElementById("quantidadeTimes");
                const participantesCardElement = document.getElementById(
                    "participantes-count",
                );

                if (nomeElement) {
                    nomeElement.textContent = liga.nome || "Nome da Liga";
                }

                const totalParticipantes =
                    liga.participantes?.length || liga.times?.length || 0;

                if (quantidadeElement) {
                    quantidadeElement.textContent = `${totalParticipantes} participantes`;
                }

                // CORREÇÃO: Atualizar também o card participantes
                if (participantesCardElement) {
                    participantesCardElement.textContent = `${totalParticipantes} membros`;
                }

                console.log(
                    `Liga atualizada: ${liga.nome} com ${totalParticipantes} participantes`,
                );

                setTimeout(() => {
                    this.highlightCurrentLigaInSidebar(ligaId);
                }, 200);

                setTimeout(() => this.limparLinhaDoMeio(), 100);
            }
        } catch (error) {
            console.warn("Erro ao atualizar contador:", error);
        }
    }

    limparLinhaDoMeio() {
        try {
            const ligaHeader = document.querySelector(".liga-header");
            if (!ligaHeader) return;

            const elementos = ligaHeader.querySelectorAll("*");
            elementos.forEach((el) => {
                const texto = el.textContent || "";
                if (
                    texto.includes("Liga:") &&
                    !el.id.includes("nomeLiga") &&
                    !el.id.includes("quantidadeTimes")
                ) {
                    el.remove();
                    console.log('Removido elemento com "Liga:"');
                }
            });
        } catch (error) {
            console.warn("Erro ao limpar header:", error);
        }
    }

    redirectToParciais() {
        const urlParams = new URLSearchParams(window.location.search);
        const ligaId = urlParams.get("id");
        if (ligaId) {
            window.location.href = `parciais.html?id=${ligaId}`;
        }
    }

    setupGlobalFunctions() {
        window.voltarParaCards = () => this.voltarParaCards();
        window.executeAction = (action) => this.executeAction(action);
        window.orquestrador = this;
    }
}

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
    window.detalheLigaOrquestrador = new DetalheLigaOrquestrador();
});
