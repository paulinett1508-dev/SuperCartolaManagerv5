// 🎯 DETALHE-LIGA ORQUESTRADOR - SISTEMA DE CARREGAMENTO MODULAR
// Responsável por gerenciar navegação e carregamento dinâmico dos módulos

class DetalheLigaOrquestrador {
    constructor() {
        this.processingModule = false;
        this.modules = {};
        this.loadedCSS = new Set();

        this.init();
    }

    // 🚀 INICIALIZAÇÃO PRINCIPAL
    async init() {
        try {
            await this.loadLayout();
            await this.loadModules();
            await this.updateParticipantesCount();
            this.initializeNavigation();
            this.setupGlobalFunctions();
            
            // Verificar compatibilidade com cards condicionais
            this.initializeCardsCondicionais();

            // Inicializar ícones Lucide
            if (typeof lucide !== "undefined") {
                lucide.createIcons();
            }

            console.log("✅ Orquestrador inicializado com sucesso");
        } catch (error) {
            console.error("❌ Erro na inicialização:", error);
        }
    }

    // 🔧 INICIALIZAR COMPATIBILIDADE COM CARDS CONDICIONAIS
    initializeCardsCondicionais() {
        // Verificar se o sistema de cards condicionais está disponível
        if (window.cardsCondicionais) {
            try {
                // Controlar botão voltar se disponível
                if (window.cardsCondicionais.controlarBotaoVoltar) {
                    window.cardsCondicionais.controlarBotaoVoltar();
                }
                
                // Aplicar configurações de cards se disponível
                if (window.cardsCondicionais.aplicarConfiguracoes) {
                    window.cardsCondicionais.aplicarConfiguracoes();
                }
                
                console.log("✅ Cards condicionais integrados");
            } catch (error) {
                console.warn("⚠️ Erro na integração de cards condicionais:", error);
            }
        }
    }

    // 📄 CARREGADOR DE MÓDULOS HTML
    async loadModuleHTML(moduleName) {
        try {
            const response = await fetch(`/fronts/${moduleName}.html`);
            if (!response.ok) {
                throw new Error(`Módulo ${moduleName} não encontrado`);
            }
            return await response.text();
        } catch (error) {
            console.warn(
                `⚠️ HTML do módulo ${moduleName} não encontrado, usando fallback`,
            );
            return this.getFallbackHTML(moduleName);
        }
    }

    // 🎨 CARREGADOR DE CSS MODULAR
    async loadModuleCSS(moduleName) {
        const cssId = `module-css-${moduleName}`;

        // Verificar se já foi carregado
        if (this.loadedCSS.has(moduleName)) {
            return;
        }

        try {
            const cssPath = `/css/modules/${moduleName}.css`;
            const response = await fetch(cssPath);

            if (response.ok) {
                const cssContent = await response.text();

                // Injetar CSS no head
                const styleElement = document.createElement("style");
                styleElement.id = cssId;
                styleElement.textContent = cssContent;
                document.head.appendChild(styleElement);

                this.loadedCSS.add(moduleName);
                console.log(`✅ CSS do módulo ${moduleName} carregado`);
            }
        } catch (error) {
            console.warn(
                `⚠️ CSS do módulo ${moduleName} não encontrado, usando CSS base`,
            );
        }
    }

    // ⚡ CARREGADOR COMBINADO
    async loadModule(moduleName) {
        this.showLoading(`Carregando módulo ${moduleName}...`);

        try {
            // Carregar HTML e CSS em paralelo
            await Promise.all([
                this.loadModuleCSS(moduleName),
                // CSS sempre tenta carregar primeiro
            ]);

            const html = await this.loadModuleHTML(moduleName);

            // Injetar HTML na área dinâmica
            const contentArea = document.getElementById("dynamic-content-area");
            contentArea.innerHTML = html;

            // Executar scripts específicos do módulo se existirem
            await this.executeModuleScripts(moduleName);

            return { success: true, html };
        } catch (error) {
            console.error(`❌ Erro ao carregar módulo ${moduleName}:`, error);
            return { success: false, error: error.message };
        } finally {
            this.hideLoading();
        }
    }

    // 🔧 EXECUTAR SCRIPTS DO MÓDULO
    async executeModuleScripts(moduleName) {
        try {
            switch (moduleName) {
                case "ranking-geral":
                    if (this.modules.ranking?.carregarRankingGeral) {
                        await this.modules.ranking.carregarRankingGeral();
                        // Aplicar interceptação e estilos específicos do ranking
                        this.interceptarRankingFunction();
                        this.setupRankingObserver();
                    }
                    break;

                case "rodadas":
                    if (this.modules.rodadas?.carregarRodadas) {
                        await this.modules.rodadas.carregarRodadas();
                    }
                    break;

                case "mata-mata":
                    if (this.modules.mataMata?.carregarMataMata) {
                        await this.modules.mataMata.carregarMataMata();
                    }
                    break;

                case "pontos-corridos":
                    if (
                        this.modules.pontosCorreidos?.inicializarPontosCorreidos
                    ) {
                        await this.modules.pontosCorreidos.inicializarPontosCorreidos();
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
                    await this.loadParticipantesData();
                    break;
            }
        } catch (error) {
            console.error(
                `❌ Erro ao executar scripts do módulo ${moduleName}:`,
                error,
            );
        }
    }

    // 📄 HTML FALLBACK PARA MÓDULOS SEM ARQUIVO PRÓPRIO
    getFallbackHTML(moduleName) {
        const fallbacks = {
            participantes: `
                <div id="participantes-content">
                    <h4 style="color: #ffffff; margin-bottom: 15px;">
                        👥 Participantes da Liga
                    </h4>
                    <div class="participantes-grid">
                        <div class="loading-state">
                            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px;">
                                <div style="width: 24px; height: 24px; border: 2px solid rgba(255, 69, 0, 0.3); 
                                            border-top: 2px solid #ff4500; border-radius: 50%; 
                                            animation: spin 1s linear infinite;"></div>
                                <span style="color: #ff4500; font-weight: 600;">Carregando participantes...</span>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            "ranking-geral": `
                <div id="ranking-geral" class="active">
                    <div class="ranking-header">
                        <div class="ranking-title">
                            <div class="ranking-icon">🏅</div>
                            <h2>Classificação Geral</h2>
                        </div>
                        <div class="ranking-subtitle">carregando classificação oficial...</div>
                    </div>
                    <div class="loading-state">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 40px;">
                            <div style="width: 32px; height: 32px; border: 3px solid rgba(255, 69, 0, 0.3); 
                                        border-top: 3px solid #ff4500; border-radius: 50%; 
                                        animation: spin 1s linear infinite;"></div>
                            <span style="color: #ff4500; font-weight: 600;">Processando dados da classificação...</span>
                        </div>
                    </div>
                </div>
            `,
            rodadas: `
                <div id="rodadas">
                    <div class="mb-3">
                        <select id="rodadaSelect" class="form-control">
                            <option value="">Escolha uma rodada</option>
                        </select>
                    </div>
                    <div class="table-responsive">
                        <table class="ranking-table">
                            <thead>
                                <tr><th>Pos</th><th>❤️</th><th>Cartoleiro</th><th>Time</th><th>Pontos</th><th>Banco</th></tr>
                            </thead>
                            <tbody id="rankingBody">
                                <tr><td colspan="6" class="empty-state">Selecione uma rodada</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `,
        };

        return (
            fallbacks[moduleName] ||
            `
            <div class="empty-state">
                <h4>Módulo ${moduleName}</h4>
                <p>Funcionalidade em desenvolvimento</p>
            </div>
        `
        );
    }

    // 🧭 SISTEMA DE NAVEGAÇÃO
    initializeNavigation() {
        const cards = document.querySelectorAll(".module-card");
        const items = document.querySelectorAll(
            ".module-items li[data-action]",
        );

        // Cards principais
        cards.forEach((card) => {
            if (card.classList.contains("disabled")) return;

            card.addEventListener("click", async (e) => {
                if (this.processingModule) return;

                // Feedback visual imediato
                card.style.transform = "translateY(-1px) scale(0.98)";
                setTimeout(() => (card.style.transform = ""), 150);

                const module = card.dataset.module;
                if (module === "participantes") {
                    await this.showModule("participantes");
                } else {
                    // Para outros cards, mostrar primeira ação
                    const firstAction = card.querySelector("li[data-action]");
                    if (firstAction) {
                        await this.executeAction(firstAction.dataset.action);
                    }
                }
            });
        });

        // Items específicos
        items.forEach((item) => {
            const parentCard = item.closest(".module-card");
            if (parentCard && parentCard.classList.contains("disabled")) return;

            item.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (this.processingModule) return;

                // Feedback visual
                item.style.opacity = "0.6";
                setTimeout(() => (item.style.opacity = ""), 150);

                await this.executeAction(item.dataset.action);
            });
        });
    }

    // ⚡ EXECUTAR AÇÃO ESPECÍFICA
    async executeAction(action) {
        if (this.processingModule) return;

        this.processingModule = true;

        try {
            this.showSecondaryScreen();

            switch (action) {
                case "ranking-geral":
                    await this.showModule("ranking-geral");
                    break;
                case "parciais":
                    this.redirectToParciais();
                    break;
                case "rodadas":
                    await this.showModule("rodadas");
                    break;
                case "mata-mata":
                    await this.showModule("mata-mata");
                    break;
                case "pontos-corridos":
                    await this.showModule("pontos-corridos");
                    break;
                case "luva-de-ouro":
                    await this.showModule("luva-de-ouro");
                    break;
                case "artilheiro-campeao":
                    await this.showModule("artilheiro-campeao");
                    break;
                case "melhor-mes":
                    await this.showModule("melhor-mes");
                    break;
                case "top10":
                    await this.showModule("top10");
                    break;
                case "fluxo-financeiro":
                    await this.showModule("fluxo-financeiro");
                    break;
                default:
                    document.getElementById("dynamic-content-area").innerHTML =
                        '<div class="empty-state">Funcionalidade em desenvolvimento</div>';
            }
        } catch (error) {
            document.getElementById("dynamic-content-area").innerHTML =
                `<div class="empty-state">Erro: ${error.message}</div>`;
        } finally {
            this.processingModule = false;
        }
    }

    // 📄 MOSTRAR MÓDULO ESPECÍFICO
    async showModule(moduleName) {
        const result = await this.loadModule(moduleName);

        if (!result.success) {
            document.getElementById("dynamic-content-area").innerHTML =
                `<div class="empty-state">Erro ao carregar módulo: ${result.error}</div>`;
        }
    }

    // 🔄 NAVEGAÇÃO ENTRE TELAS
    showSecondaryScreen() {
        document.getElementById("main-screen").style.display = "none";
        document.getElementById("secondary-screen").classList.add("active");
    }

    voltarParaCards() {
        document.getElementById("secondary-screen").classList.remove("active");
        document.getElementById("main-screen").style.display = "block";
    }

    // 🔄 LOADING STATES
    showLoading(text = "Carregando dados...") {
        const overlay = document.getElementById("processing-overlay");
        const textEl = overlay.querySelector(".processing-text");
        textEl.textContent = text;
        overlay.classList.add("active");
    }

    hideLoading() {
        const overlay = document.getElementById("processing-overlay");
        overlay.classList.remove("active");
    }

    // 📊 CARREGAR LAYOUT (MANTIDO PARA COMPATIBILIDADE)
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
                }
            }

            const scripts = doc.querySelectorAll("script");
            scripts.forEach((script) => {
                if (script.textContent.trim()) {
                    const newScript = document.createElement("script");
                    newScript.textContent = script.textContent;
                    document.head.appendChild(newScript);
                }
            });
        } catch (error) {
            console.error("Erro ao carregar layout:", error);
        }
    }

    // 📦 CARREGAR MÓDULOS JS (MANTIDO PARA COMPATIBILIDADE)
    async loadModules() {
        try {
            this.modules.ranking = await import("./ranking.js");
            this.modules.rodadas = await import("./rodadas.js");
            this.modules.mataMata = await import("./mata-mata.js");
            this.modules.pontosCorreidos = await import("./pontos-corridos.js");
            this.modules.luvaDeOuro = await import("./luva-de-ouro.js");
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

    // 👥 CARREGAR DADOS DE PARTICIPANTES
    async loadParticipantesData() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const ligaId = urlParams.get("id");

            if (!ligaId) {
                document.getElementById("dynamic-content-area").innerHTML =
                    '<div class="empty-state">ID da liga não encontrado</div>';
                return;
            }

            const response = await fetch(`/api/ligas/${ligaId}`);
            if (!response.ok) {
                throw new Error("Erro ao carregar liga");
            }

            const liga = await response.json();
            if (!liga.times || liga.times.length === 0) {
                document.getElementById("dynamic-content-area").innerHTML =
                    '<div class="empty-state">Nenhum participante cadastrado</div>';
                return;
            }

            let participantesHtml = `
                <h4 style="color: #ffffff; margin-bottom: 15px;">
                    👥 Participantes da Liga (${liga.times.length})
                </h4>
                <div class="participantes-grid">
            `;

            for (const timeId of liga.times) {
                try {
                    const timeResponse = await fetch(`/api/time/${timeId}`);
                    if (timeResponse.ok) {
                        const time = await timeResponse.json();
                        participantesHtml += `
                            <div class="participante-card">
                                <img src="${time.url_escudo_png || "/escudos/default.png"}" 
                                     alt="Escudo" class="participante-escudo"
                                     onerror="this.src='/escudos/default.png'">
                                <div class="participante-nome">${time.nome_cartoleiro || "N/A"}</div>
                                <div class="participante-time">${time.nome_time || "Time N/A"}</div>
                            </div>
                        `;
                    }
                } catch (error) {
                    console.warn(`Erro ao carregar time ${timeId}:`, error);
                }
            }

            participantesHtml += "</div>";
            document.getElementById("dynamic-content-area").innerHTML =
                participantesHtml;
        } catch (error) {
            document.getElementById("dynamic-content-area").innerHTML =
                `<div class="empty-state">Erro ao carregar participantes: ${error.message}</div>`;
        }
    }

    // 📊 ATUALIZAR CONTADOR DE PARTICIPANTES
    async updateParticipantesCount() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const ligaId = urlParams.get("id");

            if (!ligaId) return;

            const response = await fetch(`/api/ligas/${ligaId}`);
            if (response.ok) {
                const liga = await response.json();

                // Atualizar header da liga
                const nomeElement = document.getElementById("nomeLiga");
                const quantidadeElement =
                    document.getElementById("quantidadeTimes");

                if (nomeElement) {
                    nomeElement.textContent = liga.nome || "Nome da Liga";
                }

                if (quantidadeElement) {
                    const participantes =
                        liga.participantes?.length || liga.times?.length || 0;
                    quantidadeElement.textContent = `${participantes} participantes`;
                }

                // Atualizar contador no card
                const countElement = document.getElementById(
                    "participantes-count",
                );
                if (countElement) {
                    countElement.textContent = `${participantes} membros`;
                }
            }
        } catch (error) {
            console.warn("Erro ao atualizar contador:", error);
        }
    }

    // 🔄 REDIRECIONAMENTO PARA PARCIAIS
    redirectToParciais() {
        const urlParams = new URLSearchParams(window.location.search);
        const ligaId = urlParams.get("id");
        if (ligaId) {
            window.location.href = `parciais.html?id=${ligaId}`;
        }
    }

    // 🔧 INTERCEPTAÇÃO DO RANKING.JS
    interceptarRankingFunction() {
        // Backup da função original se existir
        if (window.criarTabelaRanking && !window.criarTabelaRankingOriginal) {
            window.criarTabelaRankingOriginal = window.criarTabelaRanking;
        }

        // Tentativas de interceptação com timeout
        let tentativas = 0;
        const maxTentativas = 10;
        
        const tentarInterceptar = () => {
            if (window.criarTabelaRanking && tentativas < maxTentativas) {
                const originalFunction = window.criarTabelaRanking;
                
                window.criarTabelaRanking = (...args) => {
                    const resultado = originalFunction.apply(this, args);
                    
                    // Aplicar estilos após criar a tabela
                    setTimeout(() => this.applyRankingStyles(), 100);
                    
                    return resultado;
                };
                
                console.log("✅ Função criarTabelaRanking interceptada com sucesso");
                return;
            }
            
            tentativas++;
            if (tentativas < maxTentativas) {
                setTimeout(tentarInterceptar, 300);
            }
        };
        
        tentarInterceptar();
    }

    // 📊 OBSERVADOR DE MUTAÇÃO PARA RANKING
    setupRankingObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const addedNodes = Array.from(mutation.addedNodes);
                    const hasRankingContent = addedNodes.some(node => 
                        node.nodeType === 1 && 
                        (node.querySelector?.('.ranking-table') || 
                         node.classList?.contains('ranking-table') ||
                         node.id === 'ranking-geral')
                    );
                    
                    if (hasRankingContent) {
                        setTimeout(() => this.applyRankingStyles(), 150);
                    }
                }
            });
        });

        // Observar mudanças no conteúdo dinâmico
        const contentArea = document.getElementById('dynamic-content-area');
        if (contentArea) {
            observer.observe(contentArea, {
                childList: true,
                subtree: true
            });
        }
    }

    // 🎨 APLICAR ESTILOS ESPECÍFICOS DO RANKING
    applyRankingStyles() {
        const rankingTable = document.querySelector('#ranking-geral .ranking-table, .ranking-table');
        if (!rankingTable) return;

        const rows = rankingTable.querySelectorAll('tbody tr');
        
        rows.forEach((row, index) => {
            const posCell = row.querySelector('td:first-child');
            if (!posCell) return;
            
            const posicao = parseInt(posCell.textContent);
            
            // Remover classes anteriores
            row.classList.remove('posicao-1', 'posicao-2', 'posicao-3');
            
            // Aplicar estilos por posição
            switch (posicao) {
                case 1:
                    row.classList.add('posicao-1');
                    row.style.background = 'linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)';
                    row.style.color = '#000';
                    row.style.fontWeight = 'bold';
                    break;
                case 2:
                    row.classList.add('posicao-2');
                    row.style.background = 'linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 50%, #c0c0c0 100%)';
                    row.style.color = '#000';
                    row.style.fontWeight = 'bold';
                    break;
                case 3:
                    row.classList.add('posicao-3');
                    row.style.background = 'linear-gradient(135deg, #cd7f32 0%, #e8a462 50%, #cd7f32 100%)';
                    row.style.color = '#000';
                    row.style.fontWeight = 'bold';
                    break;
            }
        });

        console.log(`✅ Estilos aplicados em ${rows.length} linhas do ranking`);
    }

    // 🌐 CONFIGURAR FUNÇÕES GLOBAIS (COMPATIBILIDADE)
    setupGlobalFunctions() {
        window.voltarParaCards = () => this.voltarParaCards();
        window.showParticipantes = () => this.showModule("participantes");
        window.executeAction = (action) => this.executeAction(action);

        // Manter compatibilidade com sistema existente
        window.orquestrador = this;
        
        // Disponibilizar funções de interceptação globalmente
        window.interceptarRanking = () => this.interceptarRankingFunction();
        window.aplicarEstilosRanking = () => this.applyRankingStyles();
    }
}

// 🚀 INICIALIZAÇÃO AUTOMÁTICA
document.addEventListener("DOMContentLoaded", () => {
    window.detalheLigaOrquestrador = new DetalheLigaOrquestrador();
});
