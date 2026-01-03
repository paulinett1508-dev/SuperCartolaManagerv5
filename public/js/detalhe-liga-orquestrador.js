// DETALHE-LIGA ORQUESTRADOR - COORDENADOR OTIMIZADO
// Responsável por coordenar navegação e carregar módulos sob demanda

class DetalheLigaOrquestrador {
    constructor() {
        this.processingModule = false;
        this.modules = {};
        this.loadedCSS = new Set();
        this.init();
    }

    async init() {
        try {
            await this.loadLayout();
            await this.loadModules();
            await this.updateParticipantesCount();
            this.initializeNavigation();
            this.setupGlobalFunctions();

            setTimeout(() => this.limparLinhaDoMeio(), 1500);

            if (typeof lucide !== "undefined") {
                lucide.createIcons();
            }

            console.log("[ORQUESTRADOR] ✅ Inicializado");
        } catch (error) {
            console.error("[ORQUESTRADOR] ❌ Erro na inicialização:", error);
        }
    }

    async loadModuleHTML(moduleName) {
        try {
            const response = await fetch(`/fronts/${moduleName}.html`);
            if (!response.ok) {
                throw new Error(
                    `Módulo ${moduleName} não encontrado (HTTP ${response.status})`,
                );
            }
            return await response.text();
        } catch (error) {
            console.warn(`[ORQUESTRADOR] HTML ${moduleName} não encontrado`);
            return this.getFallbackHTML(moduleName);
        }
    }

    async loadModuleCSS(moduleName) {
        // Módulos que não precisam de CSS próprio
        const modulosSemCSS = [];
        if (modulosSemCSS.includes(moduleName)) return;

        const cssPaths = [
            `/css/modules/${moduleName}.css`,
            `/${moduleName}.css`,
            `/css/${moduleName}.css`,
        ];

        for (const path of cssPaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    const styleElement = document.createElement("style");
                    styleElement.id = `module-css-${moduleName}`;
                    styleElement.textContent = await response.text();
                    document.head.appendChild(styleElement);
                    this.loadedCSS.add(moduleName);
                    return;
                }
            } catch (e) {
                /* continua */
            }
        }
    }

    async loadModule(moduleName) {
        try {
            await this.loadModuleCSS(moduleName);
            const html = await this.loadModuleHTML(moduleName);

            const contentArea = document.getElementById("dynamic-content-area");
            if (contentArea) {
                contentArea.innerHTML = html;
            }

            await this.executeModuleScripts(moduleName);
            return { success: true, html };
        } catch (error) {
            console.error(
                `[ORQUESTRADOR] Erro no módulo ${moduleName}:`,
                error,
            );

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

                    if (!this.modules.rodadas) {
                        await carregarModuloRodadas();
                    }

                    const rodadasContainer = document.getElementById("rodadas");
                    if (rodadasContainer)
                        rodadasContainer.classList.add("active");

                    if (this.modules.rodadas?.carregarRodadas) {
                        await this.modules.rodadas.carregarRodadas();
                    } else if (typeof window.carregarRodadas === "function") {
                        await window.carregarRodadas();
                    } else if (window.rodadasOrquestrador?.inicializar) {
                        await window.rodadasOrquestrador.inicializar();
                    }
                    break;

                case "mata-mata":
                    if (!this.modules.mataMata) {
                        await carregarModuloMataMata();
                    }

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

                    try {
                        const pontosCorridosModule = await import(
                            "./pontos-corridos.js"
                        );
                        if (pontosCorridosModule?.carregarPontosCorridos) {
                            await pontosCorridosModule.carregarPontosCorridos();
                        }
                    } catch (error) {
                        console.error(
                            "[ORQUESTRADOR] Erro pontos-corridos:",
                            error,
                        );
                        const container =
                            document.getElementById("pontos-corridos");
                        if (container) {
                            container.innerHTML = `
                                <div style="padding: 20px; text-align: center; color: var(--text-muted);">
                                    <p><span class="material-symbols-outlined" style="vertical-align: middle; color: #facc15;">warning</span> Erro ao carregar Pontos Corridos</p>
                                    <p style="font-size: 12px;">${error.message}</p>
                                </div>
                            `;
                        }
                    }
                    break;

                case "luva-de-ouro":
                    // ✅ LAZY LOADING - Só carrega quando clica
                    if (!this.modules.luvaDeOuro) {
                        await carregarModuloLuvaDeOuro();
                    }
                    if (this.modules.luvaDeOuro?.inicializarLuvaDeOuro) {
                        await this.modules.luvaDeOuro.inicializarLuvaDeOuro();
                    }
                    break;

                case "artilheiro-campeao":
                    if (!this.modules.artilheiroCampeao) {
                        await carregarModuloArtilheiroCampeao();
                    }
                    // ✅ CORRIGIDO: Usar window.inicializarArtilheiroCampeao (a função está no window, não no módulo ES6)
                    if (
                        typeof window.inicializarArtilheiroCampeao ===
                        "function"
                    ) {
                        await window.inicializarArtilheiroCampeao();
                    } else if (window.ArtilheiroCampeao?.inicializar) {
                        await window.ArtilheiroCampeao.inicializar();
                    }
                    break;

                case "melhor-mes":
                    await new Promise((resolve) => setTimeout(resolve, 100));

                    if (!this.modules.melhorMes) {
                        await carregarModuloMelhorMes();
                    }

                    const melhorMesContainer =
                        document.getElementById("melhor-mes");
                    if (melhorMesContainer)
                        melhorMesContainer.classList.add("active");

                    if (this.modules.melhorMes?.inicializarMelhorMes) {
                        await this.modules.melhorMes.inicializarMelhorMes();
                    } else if (
                        typeof window.inicializarMelhorMes === "function"
                    ) {
                        await window.inicializarMelhorMes();
                    } else if (window.melhorMesOrquestrador?.inicializar) {
                        await window.melhorMesOrquestrador.inicializar();
                    }
                    break;

                case "top10":
                    if (this.modules.top10?.inicializarTop10) {
                        await this.modules.top10.inicializarTop10();
                    }
                    break;

                case "fluxo-financeiro":
                    await new Promise((resolve) => setTimeout(resolve, 100));

                    if (!this.modules.fluxoFinanceiro) {
                        await carregarModuloFluxoFinanceiro();
                    }

                    const fluxoFinanceiroContainer =
                        document.getElementById("fluxo-financeiro");
                    if (fluxoFinanceiroContainer)
                        fluxoFinanceiroContainer.classList.add("active");

                    if (
                        this.modules.fluxoFinanceiro?.inicializarFluxoFinanceiro
                    ) {
                        await this.modules.fluxoFinanceiro.inicializarFluxoFinanceiro();
                    } else if (
                        typeof window.inicializarFluxoFinanceiro === "function"
                    ) {
                        await window.inicializarFluxoFinanceiro();
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
                        }
                    } catch (error) {
                        console.error(
                            "[ORQUESTRADOR] Erro participantes:",
                            error,
                        );
                    }
                    break;

                case "parciais":
                    try {
                        const parciaisModule = await import("./parciais.js");
                        await new Promise((resolve) =>
                            setTimeout(resolve, 100),
                        );

                        if (parciaisModule?.inicializarParciais) {
                            await parciaisModule.inicializarParciais();
                        } else if (
                            typeof window.inicializarParciais === "function"
                        ) {
                            await window.inicializarParciais();
                        }
                    } catch (error) {
                        console.error("[ORQUESTRADOR] Erro parciais:", error);
                    }
                    break;
            }
        } catch (error) {
            console.error(
                `[ORQUESTRADOR] Erro ao executar módulo ${moduleName}:`,
                error,
            );
        }
    }

    getFallbackHTML(moduleName) {
        const fallbacks = {
            "ranking-geral": `<div id="ranking-geral"><div class="loading-state">Carregando ranking...</div></div>`,
            rodadas: `<div id="rodadas"><div class="loading-state">Carregando rodadas...</div></div>`,
            "mata-mata": `<div id="mata-mata"><div class="loading-state">Carregando mata-mata...</div></div>`,
            "pontos-corridos": `<div id="pontos-corridos"><div class="loading-state">Carregando pontos corridos...</div></div>`,
            "luva-de-ouro": `<div id="luvaDeOuroContent"><div class="loading-state">Carregando luva de ouro...</div></div>`,
            "artilheiro-campeao": `<div id="artilheiro-content"><div class="loading-state">Carregando artilheiros...</div></div>`,
            "melhor-mes": `<div id="melhor-mes-content"><div class="loading-state">Carregando melhor mês...</div></div>`,
            top10: `<div id="top10-content"><div class="loading-state">Carregando top 10...</div></div>`,
            "fluxo-financeiro": `<div id="fluxo-financeiro-content"><div class="loading-state">Carregando fluxo financeiro...</div></div>`,
            participantes: `<div id="participantes-content"><div class="loading-state">Carregando participantes...</div></div>`,
            parciais: `<div id="parciais-content"><div class="loading-state">Carregando parciais...</div></div>`,
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

        this.showLoadingOverlay(
            `Carregando ${this.getModuleDisplayName(action)}...`,
        );

        try {
            if (showSecondary) this.showSecondaryScreen();
            await this.showModule(action);
        } catch (error) {
            document.getElementById("dynamic-content-area").innerHTML =
                `<div class="empty-state">Erro: ${error.message}</div>`;
        } finally {
            this.processingModule = false;
            this.hideLoadingOverlay();
        }
    }

    async handleModuleClick(module) {
        if (this.processingModule) return;

        // Verificar se é módulo 2026 (em breve)
        if (this.isModule2026(module)) {
            this.showComingSoonToast(module);
            return;
        }

        this.processingModule = true;

        this.showLoadingOverlay(
            `Carregando ${this.getModuleDisplayName(module)}...`,
        );

        try {
            await this.showModule(module);
        } catch (error) {
            console.error(`[ORQUESTRADOR] Erro módulo ${module}:`, error);
            document.getElementById("dynamic-content-area").innerHTML =
                `<div class="empty-state">Erro: ${error.message}</div>`;
        } finally {
            this.processingModule = false;
            this.hideLoadingOverlay();
        }
    }

    getModuleDisplayName(module) {
        const names = {
            participantes: "Participantes",
            "ranking-geral": "Classificação",
            parciais: "Parciais",
            top10: "Top 10",
            rodadas: "Rodadas",
            "melhor-mes": "Melhor Mês",
            "mata-mata": "Mata-Mata",
            "pontos-corridos": "Pontos Corridos",
            "luva-de-ouro": "Luva de Ouro",
            "artilheiro-campeao": "Artilheiro",
            "fluxo-financeiro": "Fluxo Financeiro",
            // Módulos 2026
            "tiro-certo": "Tiro Certo",
            "bolao-copa": "Bolão Copa & Liberta",
            "resta-um": "Resta Um",
            "capitao-luxo": "Capitão Luxo",
        };
        return names[module] || module;
    }

    // Verifica se módulo é 2026 (em breve)
    isModule2026(module) {
        const modules2026 = ["tiro-certo", "bolao-copa", "resta-um", "capitao-luxo"];
        return modules2026.includes(module);
    }

    // Mostra toast de "Em Breve" para módulos 2026
    showComingSoonToast(moduleName) {
        const displayName = this.getModuleDisplayName(moduleName);

        // Criar toast se não existir
        let toast = document.getElementById("toast-2026");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "toast-2026";
            toast.className = "toast-2026";
            toast.innerHTML = `
                <span class="material-icons">rocket_launch</span>
                <div class="toast-2026-content">
                    <strong></strong>
                    <span>Disponível na Temporada 2026</span>
                </div>
            `;
            document.body.appendChild(toast);

            // Adicionar estilos inline
            const style = document.createElement("style");
            style.textContent = `
                .toast-2026 {
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%) translateY(100px);
                    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
                    border: 1px solid rgba(255, 85, 0, 0.4);
                    border-radius: 12px;
                    padding: 16px 24px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 85, 0, 0.2);
                    z-index: 10001;
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .toast-2026.show {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                .toast-2026 .material-icons {
                    font-size: 28px;
                    color: #FF5500;
                }
                .toast-2026-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .toast-2026-content strong {
                    color: #fff;
                    font-size: 14px;
                    font-weight: 600;
                }
                .toast-2026-content span {
                    color: #9ca3af;
                    font-size: 12px;
                }
            `;
            document.head.appendChild(style);
        }

        // Atualizar conteúdo
        toast.querySelector("strong").textContent = displayName;

        // Mostrar toast
        setTimeout(() => toast.classList.add("show"), 10);

        // Esconder após 3s
        setTimeout(() => toast.classList.remove("show"), 3000);
    }

    showLoadingOverlay(message = "Carregando...") {
        let overlay = document.getElementById("module-loading-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "module-loading-overlay";
            overlay.className = "module-loading-overlay";
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-message">${message}</div>
                    <div class="loading-submessage">Carregando dependências...</div>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector(".loading-message").textContent = message;
        }
        overlay.offsetHeight;
        overlay.classList.add("active");
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById("module-loading-overlay");
        if (overlay) {
            overlay.classList.remove("active");
            setTimeout(() => {
                if (overlay.parentNode) overlay.remove();
            }, 300);
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

        if (mainScreen) mainScreen.style.display = "none";
        if (secondaryScreen) {
            secondaryScreen.classList.add("active");
            secondaryScreen.style.display = "block";
        }
    }

    voltarParaCards() {
        const mainScreen = document.getElementById("main-screen");
        const secondaryScreen = document.getElementById("secondary-screen");

        if (secondaryScreen) {
            secondaryScreen.classList.remove("active");
            secondaryScreen.style.display = "none";
        }

        if (mainScreen) mainScreen.style.display = "block";
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
                    setTimeout(() => this.carregarLigasSidebar(), 100);
                }
            }

            // Injetar scripts do layout
            const scripts = doc.querySelectorAll("script");
            scripts.forEach((script) => {
                if (script.textContent.trim()) {
                    const newScript = document.createElement("script");
                    newScript.textContent = script.textContent;
                    document.head.appendChild(newScript);
                }
            });

            // Garantir que AccordionManager seja inicializado
            setTimeout(() => {
                if (window.AccordionManager && !window.AccordionManager._initialized) {
                    window.AccordionManager.init();
                }
                if (typeof window.verificarMenuSuperAdmin === 'function') {
                    window.verificarMenuSuperAdmin();
                }
            }, 150);
        } catch (error) {
            console.error("[ORQUESTRADOR] Erro ao carregar layout:", error);
        }
    }

    async carregarLigasSidebar() {
        const ligasList = document.getElementById("ligasList");
        if (!ligasList) return;

        try {
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

            const urlParams = new URLSearchParams(window.location.search);
            const ligaId = urlParams.get("id");
            if (ligaId) this.highlightCurrentLigaInSidebar(ligaId);
        } catch (error) {
            console.error("[ORQUESTRADOR] Erro ao carregar ligas:", error);
            ligasList.innerHTML = `
                <div class="ligas-empty">
                    Erro ao carregar<br>
                    <button onclick="window.orquestrador?.carregarLigasSidebar()" style="
                        margin-top: 8px; padding: 6px 10px; background: #ff4500;
                        color: white; border: none; border-radius: 4px;
                        font-size: 10px; cursor: pointer; font-weight: 600;
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
                if (ligaName) ligaName.prepend(badge);
            }
        } catch (error) {
            // Silencioso
        }
    }

    // ✅ OTIMIZADO: Carrega apenas módulos essenciais
    async loadModules() {
        try {
            // Apenas módulos que aparecem na tela inicial
            this.modules.ranking = await import("./ranking.js");
            this.modules.top10 = await import("./top10.js");

            // Configuração lazy loading para os demais
            setupLazyModuleLoading();

            // ✅ REMOVIDO: Luva de Ouro NÃO carrega mais aqui
            // Será carregado sob demanda quando o usuário clicar
        } catch (error) {
            console.error("[ORQUESTRADOR] Erro ao carregar módulos:", error);
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

                if (nomeElement)
                    nomeElement.textContent = liga.nome || "Nome da Liga";

                const totalParticipantes =
                    liga.participantes?.length || liga.times?.length || 0;

                if (quantidadeElement)
                    quantidadeElement.textContent = `${totalParticipantes} participantes`;
                if (participantesCardElement)
                    participantesCardElement.textContent = `${totalParticipantes} membros`;

                setTimeout(
                    () => this.highlightCurrentLigaInSidebar(ligaId),
                    200,
                );
                setTimeout(() => this.limparLinhaDoMeio(), 100);
            }
        } catch (error) {
            // Silencioso
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
                }
            });
        } catch (error) {
            // Silencioso
        }
    }

    redirectToParciais() {
        const urlParams = new URLSearchParams(window.location.search);
        const ligaId = urlParams.get("id");
        if (ligaId) window.location.href = `parciais.html?id=${ligaId}`;
    }

    setupGlobalFunctions() {
        window.voltarParaCards = () => this.voltarParaCards();
        window.executeAction = (action) => this.executeAction(action);
        window.orquestrador = this;
    }
}

// ==============================
// LAZY LOADING DE MÓDULOS
// ==============================

async function carregarModuloRanking() {
    if (!window.orquestrador.modules.ranking) {
        window.orquestrador.modules.ranking = await import("./ranking.js");
    }
    return window.orquestrador.modules.ranking;
}

async function carregarModuloTop10() {
    if (!window.orquestrador.modules.top10) {
        window.orquestrador.modules.top10 = await import("./top10.js");
    }
    return window.orquestrador.modules.top10;
}

async function carregarModuloRodadas() {
    if (!window.orquestrador.modules.rodadas) {
        try {
            window.orquestrador.modules.rodadas = await import("./rodadas.js");
            await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
            console.error("[ORQUESTRADOR] Erro ao importar rodadas:", error);
            throw error;
        }
    }
    return window.orquestrador.modules.rodadas;
}

async function carregarModuloMataMata() {
    if (!window.orquestrador.modules.mataMata) {
        window.orquestrador.modules.mataMata = await import(
            "/js/mata-mata/mata-mata-orquestrador.js"
        );
    }
    return window.orquestrador.modules.mataMata;
}

async function carregarModuloPontosCorridos() {
    if (!window.orquestrador.modules.pontosCorridos) {
        window.orquestrador.modules.pontosCorridos = await import(
            "./pontos-corridos.js"
        );
    }
    return window.orquestrador.modules.pontosCorridos;
}

async function carregarModuloMelhorMes() {
    if (!window.orquestrador.modules.melhorMes) {
        try {
            window.orquestrador.modules.melhorMes = await import(
                "./melhor-mes.js"
            );
            await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
            console.error("[ORQUESTRADOR] Erro ao importar melhor-mes:", error);
            throw error;
        }
    }
    return window.orquestrador.modules.melhorMes;
}

async function carregarModuloArtilheiroCampeao() {
    if (!window.orquestrador.modules.artilheiroCampeao) {
        window.orquestrador.modules.artilheiroCampeao = await import(
            "./artilheiro-campeao.js"
        );
    }
    return window.orquestrador.modules.artilheiroCampeao;
}

// ✅ LAZY LOADING COMPLETO - Só carrega quando clica
async function carregarModuloLuvaDeOuro() {
    if (!window.orquestrador.modules.luvaDeOuro) {
        // Carrega dependências apenas quando necessário
        await import("./luva-de-ouro/luva-de-ouro-config.js");
        await import("./luva-de-ouro/luva-de-ouro-core.js");
        await import("./luva-de-ouro/luva-de-ouro-ui.js");
        await import("./luva-de-ouro/luva-de-ouro-utils.js");
        await import("./luva-de-ouro/luva-de-ouro-cache.js");
        await import("./luva-de-ouro/luva-de-ouro-orquestrador.js");
        window.orquestrador.modules.luvaDeOuro = await import(
            "./luva-de-ouro.js"
        );
    }
    return window.orquestrador.modules.luvaDeOuro;
}

async function carregarModuloFluxoFinanceiro() {
    if (!window.orquestrador.modules.fluxoFinanceiro) {
        window.orquestrador.modules.fluxoFinanceiro = await import(
            "./fluxo-financeiro.js?v7.0"
        );
    }
    return window.orquestrador.modules.fluxoFinanceiro;
}

async function carregarModuloParciais() {
    if (!window.orquestrador.modules.parciais) {
        window.orquestrador.modules.parciais = await import("./parciais.js");
    }
    return window.orquestrador.modules.parciais;
}

function setupLazyModuleLoading() {
    // Configuração para lazy loading - módulos carregam sob demanda
}

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
    window.detalheLigaOrquestrador = new DetalheLigaOrquestrador();
});
