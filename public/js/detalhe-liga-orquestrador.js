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
            console.log(`[ORQUESTRADOR] Carregando HTML do módulo: ${moduleName}`);
            const response = await fetch(`/fronts/${moduleName}.html`);
            if (!response.ok) {
                throw new Error(`Módulo ${moduleName} não encontrado (HTTP ${response.status})`);
            }
            const html = await response.text();
            console.log(`[ORQUESTRADOR] ✅ HTML do módulo ${moduleName} carregado (${html.length} bytes)`);
            return html;
        } catch (error) {
            console.warn(`[ORQUESTRADOR] ⚠️ HTML do módulo ${moduleName} não encontrado:`, error);
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
                    
                    // Garantir que o módulo foi importado
                    if (!this.modules.rodadas) {
                        await carregarModuloRodadas();
                    }
                    
                    const rodadasContainer = document.getElementById("rodadas");
                    if (rodadasContainer) {
                        rodadasContainer.classList.add("active");
                    }

                    // Tentar múltiplas formas de inicialização
                    if (this.modules.rodadas?.carregarRodadas) {
                        await this.modules.rodadas.carregarRodadas();
                    } else if (typeof window.carregarRodadas === "function") {
                        await window.carregarRodadas();
                    } else if (window.rodadasOrquestrador?.inicializar) {
                        await window.rodadasOrquestrador.inicializar();
                    } else {
                        console.warn("Nenhuma função de inicialização de rodadas encontrada");
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
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    
                    // Garantir que o módulo foi importado
                    if (!this.modules.melhorMes) {
                        await carregarModuloMelhorMes();
                    }
                    
                    const melhorMesContainer = document.getElementById("melhor-mes");
                    if (melhorMesContainer) {
                        melhorMesContainer.classList.add("active");
                    }

                    // Tentar múltiplas formas de inicialização
                    if (this.modules.melhorMes?.inicializarMelhorMes) {
                        await this.modules.melhorMes.inicializarMelhorMes();
                    } else if (typeof window.inicializarMelhorMes === "function") {
                        await window.inicializarMelhorMes();
                    } else if (window.melhorMesOrquestrador?.inicializar) {
                        await window.melhorMesOrquestrador.inicializar();
                    } else {
                        console.warn("Nenhuma função de inicialização de Melhor do Mês encontrada");
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

        // Mostrar loading imediatamente
        this.showLoadingOverlay(`Carregando ${this.getModuleDisplayName(action)}...`);

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
        this.processingModule = true;

        // Mostrar loading imediatamente
        this.showLoadingOverlay(`Carregando ${this.getModuleDisplayName(module)}...`);

        try {
            await this.showModule(module);
        } catch (error) {
            console.error(`Erro ao carregar módulo ${module}:`, error);
            document.getElementById("dynamic-content-area").innerHTML =
                `<div class="empty-state">Erro: ${error.message}</div>`;
        } finally {
            this.processingModule = false;
            this.hideLoadingOverlay();
        }
    }

    getModuleDisplayName(module) {
        const names = {
            'participantes': 'Participantes',
            'ranking-geral': 'Classificação',
            'parciais': 'Parciais',
            'top10': 'Top 10',
            'rodadas': 'Rodadas',
            'melhor-mes': 'Melhor Mês',
            'mata-mata': 'Mata-Mata',
            'pontos-corridos': 'Pontos Corridos',
            'luva-de-ouro': 'Luva de Ouro',
            'artilheiro-campeao': 'Artilheiro',
            'fluxo-financeiro': 'Financeiro'
        };
        return names[module] || module;
    }

    showLoadingOverlay(message = 'Carregando...') {
        let overlay = document.getElementById('module-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'module-loading-overlay';
            overlay.className = 'module-loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-message">${message}</div>
                    <div class="loading-submessage">Carregando dependências...</div>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector('.loading-message').textContent = message;
        }
        // Força reflow para garantir animação
        overlay.offsetHeight;
        overlay.classList.add('active');
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('module-loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
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
            // Módulos essenciais carregados inicialmente
            this.modules.ranking = await import("./ranking.js");
            this.modules.top10 = await import("./top10.js");

            // Configuração para carregar outros módulos sob demanda
            setupLazyModuleLoading();

            // Carregar módulos específicos para Luva de Ouro (se necessário no layout inicial)
            await import("./luva-de-ouro/luva-de-ouro-config.js");
            await import("./luva-de-ouro/luva-de-ouro-core.js");
            await import("./luva-de-ouro/luva-de-ouro-ui.js");
            await import("./luva-de-ouro/luva-de-ouro-utils.js");
            await import("./luva-de-ouro/luva-de-ouro-cache.js");
            await import("./luva-de-ouro/luva-de-ouro-orquestrador.js");
            this.modules.luvaDeOuro = await import("./luva-de-ouro.js");

        } catch (error) {
            console.error("Erro ao carregar módulos iniciais:", error);
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

// Funções auxiliares para lazy loading de módulos
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
    console.log('[ORQUESTRADOR] Iniciando carregamento do módulo rodadas...');
    if (!window.orquestrador.modules.rodadas) {
        try {
            window.orquestrador.modules.rodadas = await import("./rodadas.js");
            console.log('[ORQUESTRADOR] ✅ Módulo rodadas importado com sucesso');
            
            // Aguardar um momento para garantir que todas as funções foram expostas
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('[ORQUESTRADOR] Funções disponíveis:', Object.keys(window.orquestrador.modules.rodadas));
        } catch (error) {
            console.error('[ORQUESTRADOR] ❌ Erro ao importar módulo rodadas:', error);
            throw error;
        }
    }
    return window.orquestrador.modules.rodadas;
}

async function carregarModuloMataMata() {
    if (!window.orquestrador.modules.mataMata) {
        window.orquestrador.modules.mataMata = await import("./mata-mata.js");
    }
    return window.orquestrador.modules.mataMata;
}

async function carregarModuloPontosCorridos() {
    if (!window.orquestrador.modules.pontosCorridos) {
        window.orquestrador.modules.pontosCorridos = await import("./pontos-corridos.js");
    }
    return window.orquestrador.modules.pontosCorridos;
}

async function carregarModuloMelhorMes() {
    console.log('[ORQUESTRADOR] Iniciando carregamento do módulo Melhor do Mês...');
    if (!window.orquestrador.modules.melhorMes) {
        try {
            window.orquestrador.modules.melhorMes = await import("./melhor-mes.js");
            console.log('[ORQUESTRADOR] ✅ Módulo Melhor do Mês importado com sucesso');
            
            // Aguardar um momento para garantir que todas as funções foram expostas
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('[ORQUESTRADOR] Funções disponíveis:', Object.keys(window.orquestrador.modules.melhorMes));
        } catch (error) {
            console.error('[ORQUESTRADOR] ❌ Erro ao importar módulo Melhor do Mês:', error);
            throw error;
        }
    }
    return window.orquestrador.modules.melhorMes;
}

async function carregarModuloArtilheiroCampeao() {
    if (!window.orquestrador.modules.artilheiroCampeao) {
        window.orquestrador.modules.artilheiroCampeao = await import("./artilheiro-campeao.js");
    }
    return window.orquestrador.modules.artilheiroCampeao;
}

async function carregarModuloLuvaDeOuro() {
    if (!window.orquestrador.modules.luvaDeOuro) {
        // Carregando dependências da Luva de Ouro antes do módulo principal
        await import("./luva-de-ouro/luva-de-ouro-config.js");
        await import("./luva-de-ouro/luva-de-ouro-core.js");
        await import("./luva-de-ouro/luva-de-ouro-ui.js");
        await import("./luva-de-ouro/luva-de-ouro-utils.js");
        await import("./luva-de-ouro/luva-de-ouro-cache.js");
        await import("./luva-de-ouro/luva-de-ouro-orquestrador.js");
        window.orquestrador.modules.luvaDeOuro = await import("./luva-de-ouro.js");
    }
    return window.orquestrador.modules.luvaDeOuro;
}

async function carregarModuloFluxoFinanceiro() {
    if (!window.orquestrador.modules.fluxoFinanceiro) {
        window.orquestrador.modules.fluxoFinanceiro = await import("./fluxo-financeiro.js");
    }
    return window.orquestrador.modules.fluxoFinanceiro;
}

function setupLazyModuleLoading() {
    const moduleLoaders = {
        "rodadas": carregarModuloRodadas,
        "mata-mata": carregarModuloMataMata,
        "pontos-corridos": carregarModuloPontosCorridos,
        "melhor-mes": carregarModuloMelhorMes,
        "artilheiro-campeao": carregarModuloArtilheiroCampeao,
        "luva-de-ouro": carregarModuloLuvaDeOuro,
        "fluxo-financeiro": carregarModuloFluxoFinanceiro,
        "participantes": async () => {
            if (!window.orquestrador.modules.participantes) {
                await import("./participantes.js");
                window.orquestrador.modules.participantes = window.carregarParticipantesComBrasoes || {};
            }
            return window.orquestrador.modules.participantes;
        }
    };

    // Pré-carregar módulos sob demanda (não no click)
    document.querySelectorAll('.module-card[data-module]').forEach(card => {
        const moduleName = card.dataset.module;
        if (moduleName && moduleLoaders[moduleName]) {
            // Remover listener { once: true } que causa problemas
            // O orquestrador já gerencia o estado de processamento
        }
    });
}

// Helper para obter o nome da função de inicialização do módulo
function getModuleInitFunctionName(moduleName) {
    switch (moduleName) {
        case "ranking-geral": return "carregarRankingGeral";
        case "rodadas": return "carregarRodadas";
        case "mata-mata": return "carregarMataMata";
        case "pontos-corridos": return "carregarPontosCorridos";
        case "luva-de-ouro": return "inicializarLuvaDeOuro";
        case "artilheiro-campeao": return "inicializarArtilheiroCampeao";
        case "melhor-mes": return "inicializarMelhorMes";
        case "top10": return "inicializarTop10";
        case "fluxo-financeiro": return "inicializarFluxoFinanceiro";
        case "participantes": return "carregarParticipantesComBrasoes";
        default: return `inicializar${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`;
    }
}

// Helper para obter o nome da função global (caso o módulo não esteja diretamente anexado ao orquestrador)
function getModuleFunctionName(moduleName) {
    switch (moduleName) {
        case "ranking-geral": return "carregarRankingGeral";
        case "rodadas": return "carregarRodadas";
        case "pontos-corridos": return "carregarPontosCorridos";
        default: return null; // Retorna null se não houver uma função global conhecida
    }
}


// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
    window.detalheLigaOrquestrador = new DetalheLigaOrquestrador();
});