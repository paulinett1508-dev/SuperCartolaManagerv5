// DETALHE-LIGA ORQUESTRADOR - COORDENADOR OTIMIZADO v3.2
// Responsável por coordenar navegação e carregar módulos sob demanda
// v3.2: FIX CRÍTICO - Double RAF para garantir container no DOM após injeção de HTML
//       Resolve problema de "renderização perdida" em refresh (F5)
// v3.1: FIX - Evita re-injeção de scripts do layout + invalida cache ao navegar entre ligas

class DetalheLigaOrquestrador {
    constructor() {
        this.processingModule = false;
        this.modules = {};
        this.loadedCSS = new Set();
        // Multi-Temporada: contexto de navegação
        this.temporada = this.obterTemporadaDaUrl();
        this.isTemporadaHistorica = false;
        this.init();
    }

    // Lê o parâmetro ?temporada= da URL
    obterTemporadaDaUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const temporadaParam = urlParams.get("temporada");
        return temporadaParam ? parseInt(temporadaParam, 10) : new Date().getFullYear();
    }

    // Detecta se é temporada histórica e configura o contexto global
    async detectarTemporadaHistorica() {
        try {
            const response = await fetch('/api/cartola/mercado-status');
            if (response.ok) {
                const mercado = await response.json();
                const temporadaAtual = mercado.temporada || new Date().getFullYear();
                this.isTemporadaHistorica = this.temporada < temporadaAtual;

                // Expor globalmente para uso em módulos
                window.temporadaAtual = this.temporada;
                window.isTemporadaHistorica = this.isTemporadaHistorica;

                // Mostrar badge e aplicar modo histórico
                if (this.isTemporadaHistorica) {
                    document.body.classList.add('temporada-historica');
                    this.mostrarBadgeTemporada();
                    console.log(`[ORQUESTRADOR] 📜 Modo histórico: Temporada ${this.temporada}`);
                } else {
                    console.log(`[ORQUESTRADOR] 📅 Temporada atual: ${this.temporada}`);
                }
            }
        } catch (error) {
            console.warn('[ORQUESTRADOR] Erro ao detectar temporada:', error);
            // Fallback: assumir temporada atual
            window.temporadaAtual = this.temporada;
            window.isTemporadaHistorica = false;
        }
    }

    // Mostra o badge de temporada histórica no header
    mostrarBadgeTemporada() {
        const badge = document.getElementById('temporadaBadge');
        const label = document.getElementById('temporadaLabel');
        if (badge && label) {
            label.textContent = this.temporada;
            badge.style.display = 'inline-flex';
        }
    }

    async init() {
        try {
            await this.loadLayout();
            // Multi-Temporada: detectar e configurar contexto
            await this.detectarTemporadaHistorica();
            await this.loadModules();
            await this.updateParticipantesCount();
            this.initializeNavigation();
            this.setupGlobalFunctions();

            setTimeout(() => this.limparLinhaDoMeio(), 1500);

            if (typeof lucide !== "undefined") {
                lucide.createIcons();
            }

            // ✅ v2.0: Auto-navegar para módulo via URL (section + timeId)
            this.handleUrlNavigation();

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

            // ✅ v3.2: Aguardar DOM estar pintado antes de executar scripts
            // Double RAF garante que o browser completou o layout após innerHTML
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

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
        // ✅ v9.0: Preservar temporada antes de executar modulo
        // Alguns modulos (ex: fluxo-financeiro) podem sobrescrever window.temporadaAtual
        const temporadaPreservada = window.temporadaAtual;
        const isHistoricaPreservada = window.isTemporadaHistorica;

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
                    // ✅ v3.2: Double RAF em vez de setTimeout fixo
                    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

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
                    // ✅ v3.2: Double RAF em vez de setTimeout fixo
                    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
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
                    // ✅ v3.2: Double RAF em vez de setTimeout fixo
                    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

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
                    // ✅ v3.2: Double RAF em vez de setTimeout fixo
                    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

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
                        // ✅ v3.2: Double RAF em vez de setTimeout fixo
                        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

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
                        // ✅ v3.2: Double RAF em vez de setTimeout fixo
                        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

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
                `[ORQUESTRADOR] Erro ao executar modulo ${moduleName}:`,
                error,
            );
        } finally {
            // ✅ v9.0: Restaurar temporada se modulo sobrescreveu
            if (window.temporadaAtual !== temporadaPreservada) {
                console.warn(`[ORQUESTRADOR] Modulo ${moduleName} alterou temporada de ${temporadaPreservada} para ${window.temporadaAtual}. Restaurando.`);
                window.temporadaAtual = temporadaPreservada;
                window.isTemporadaHistorica = isHistoricaPreservada;
            }
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
        // ✅ v3.0: Event delegation para sobreviver a navegação SPA
        // Listener no document ao invés de nos cards individuais

        if (this._navigationInitialized) {
            console.log(`[ORQUESTRADOR] Navegação já inicializada (event delegation)`);
            return;
        }
        this._navigationInitialized = true;

        console.log(`[ORQUESTRADOR] Inicializando navegação via event delegation`);

        // Event delegation para module-cards
        document.addEventListener("click", async (e) => {
            const card = e.target.closest(".module-card");
            if (!card) return;

            // Ignorar cards desabilitados
            if (card.classList.contains("disabled")) {
                console.log(`[ORQUESTRADOR] Card DISABLED: ${card.dataset.module}`);
                return;
            }

            // Verificar se é item de ação dentro do card
            const actionItem = e.target.closest(".module-items li[data-action]");
            if (actionItem) {
                e.stopPropagation();
                if (this.processingModule) return;

                actionItem.style.opacity = "0.6";
                setTimeout(() => (actionItem.style.opacity = ""), 150);
                await this.executeAction(actionItem.dataset.action);
                return;
            }

            // Clique no card principal
            console.log(`[ORQUESTRADOR] CLICK em: ${card.dataset.module}`);

            if (this.processingModule) {
                console.log(`[ORQUESTRADOR] BLOQUEADO - processingModule=true`);
                return;
            }

            card.style.transform = "translateY(-1px) scale(0.98)";
            setTimeout(() => (card.style.transform = ""), 150);

            const module = card.dataset.module;
            this.showSecondaryScreen();
            await this.handleModuleClick(module);
        });

        console.log(`[ORQUESTRADOR] Navegação via event delegation ativada`);
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

        // ✅ v2.1 FIX: Fluxo financeiro SEMPRE carrega inline (não redireciona mais)
        // O módulo já tem sua própria lista de participantes
        if (module === 'fluxo-financeiro') {
            const urlParams = new URLSearchParams(window.location.search);
            const timeIdFromUrl = urlParams.get('timeId');

            if (timeIdFromUrl) {
                console.log('[ORQUESTRADOR] Carregando fluxo-financeiro inline para timeId:', timeIdFromUrl);
            } else {
                console.log('[ORQUESTRADOR] Carregando fluxo-financeiro (lista de participantes)');
            }
            // Sempre continua para showModule - o módulo exibe lista ou extrato conforme timeId
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
            const toggleBtn = doc.querySelector(".sidebar-toggle-btn");
            if (sidebar) {
                const placeholder = document.getElementById(
                    "sidebar-placeholder",
                );
                if (placeholder) {
                    // ✅ v1.1: Incluir botão toggle junto com sidebar
                    const fragment = document.createDocumentFragment();
                    if (toggleBtn) fragment.appendChild(toggleBtn);
                    fragment.appendChild(sidebar);
                    placeholder.replaceWith(fragment);
                    // Ligas já são carregadas pelo layout.html via carregarLigasLayout()
                }
            }

            // Injetar scripts do layout APENAS na primeira vez
            // v3.1 FIX: Evita re-injeção de scripts que causa problemas de estado
            if (!window._layoutScriptsInjected) {
                const scripts = doc.querySelectorAll("script");
                scripts.forEach((script) => {
                    if (script.textContent.trim()) {
                        const newScript = document.createElement("script");
                        newScript.textContent = script.textContent;
                        document.head.appendChild(newScript);
                    }
                });
                window._layoutScriptsInjected = true;
                console.log('[ORQUESTRADOR] Scripts do layout injetados');
            } else {
                console.log('[ORQUESTRADOR] Scripts do layout já injetados, pulando...');
                // Apenas recarregar as ligas se a função já existir
                if (typeof window.carregarLigasLayout === 'function') {
                    window.carregarLigasLayout();
                }
            }

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

                // ✅ Definir logo da liga para uso no header (dinâmico via banco)
                window._currentLigaLogo = liga.logo || null;

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

    // ✅ v2.0: Auto-navegar para módulo via URL (section/timeId)
    // ✅ v2.1 FIX: Mostrar secondary screen ANTES de carregar módulo para evitar flash dos cards
    handleUrlNavigation() {
        const urlParams = new URLSearchParams(window.location.search);
        const sectionFromUrl = urlParams.get('section');
        const timeIdFromUrl = urlParams.get('timeId');

        if (sectionFromUrl) {
            console.log(`[ORQUESTRADOR] Auto-navegando para seção: ${sectionFromUrl}${timeIdFromUrl ? ` (timeId: ${timeIdFromUrl})` : ''}`);

            // ✅ v2.1 FIX: Esconder cards IMEDIATAMENTE para evitar flash
            this.showSecondaryScreen();

            // Pequeno delay para garantir que o DOM está pronto
            setTimeout(async () => {
                await this.handleModuleClick(sectionFromUrl);
            }, 200);
        }
    }

    setupGlobalFunctions() {
        window.voltarParaCards = () => this.voltarParaCards();
        window.executeAction = (action) => this.executeAction(action);
        window.orquestrador = this;

        // ✅ v3.2: Utilitário global para aguardar container no DOM
        // Usado por módulos para garantir que container existe após injeção de HTML
        window.aguardarContainerAdmin = async (containerId, maxTentativas = 10, intervalo = 100) => {
            // Double RAF primeiro
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            let container = document.getElementById(containerId);
            if (container) return container;

            // Polling com retry
            return new Promise((resolve) => {
                let tentativas = 0;
                const poll = setInterval(() => {
                    tentativas++;
                    const el = document.getElementById(containerId);
                    if (el) {
                        clearInterval(poll);
                        resolve(el);
                    } else if (tentativas >= maxTentativas) {
                        clearInterval(poll);
                        console.warn(`[ORQUESTRADOR] Container #${containerId} não encontrado após ${maxTentativas} tentativas`);
                        resolve(null);
                    }
                }, intervalo);
            });
        };

        // Multi-Temporada: função para obter URL com contexto de temporada preservado
        window.obterUrlComTemporada = (baseUrl) => {
            if (!this.isTemporadaHistorica) return baseUrl;
            try {
                const url = new URL(baseUrl, window.location.origin);
                url.searchParams.set('temporada', this.temporada);
                return url.toString();
            } catch {
                // Se não for URL válida, retorna como está
                return baseUrl;
            }
        };
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
            "./fluxo-financeiro.js?v8.0"
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

// ✅ FIX v3.0: Função de inicialização que pode ser chamada múltiplas vezes
// Flag para evitar inicialização duplicada na mesma sessão de página
let _orquestradorInitPending = false;

function initOrquestrador() {
    // Verificar se estamos na página detalhe-liga
    if (!window.location.pathname.includes('detalhe-liga')) {
        return;
    }

    // Verificar se já existe um orquestrador válido
    if (window.detalheLigaOrquestrador && window.detalheLigaOrquestrador._navigationInitialized) {
        console.log('[ORQUESTRADOR] Já inicializado, pulando...');
        return;
    }

    // Evitar chamadas simultâneas durante init
    if (_orquestradorInitPending) {
        console.log('[ORQUESTRADOR] Init já em andamento, pulando...');
        return;
    }
    _orquestradorInitPending = true;

    console.log('[ORQUESTRADOR] Criando nova instância...');
    window.detalheLigaOrquestrador = new DetalheLigaOrquestrador();
    window.orquestrador = window.detalheLigaOrquestrador;

    // Resetar flag após criação
    _orquestradorInitPending = false;
}

// INICIALIZAÇÃO - DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    initOrquestrador();
});

// ✅ FIX: Reinicializar após navegação SPA
window.addEventListener('spa:navigated', (e) => {
    const { pageName } = e.detail || {};
    if (pageName === 'detalhe-liga.html') {
        console.log('[ORQUESTRADOR] Reinicializando após navegação SPA...');
        // v3.1: Invalidar cache de cards-condicionais ao navegar para outra liga
        if (window.cardsCondicionais?.invalidarCache) {
            window.cardsCondicionais.invalidarCache();
        }
        // Resetar flag para permitir nova inicialização
        if (window.detalheLigaOrquestrador) {
            window.detalheLigaOrquestrador._navigationInitialized = false;
        }
        _orquestradorInitPending = false; // Permitir novo init
        initOrquestrador();
    }
});

// ✅ FIX: Também inicializar se o DOM já estiver pronto (para navegação SPA)
if (document.readyState !== 'loading') {
    // Delay mínimo para evitar race condition com DOMContentLoaded
    setTimeout(() => initOrquestrador(), 10);
}
