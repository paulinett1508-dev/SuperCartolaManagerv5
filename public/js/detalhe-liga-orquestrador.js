// 🎯 DETALHE-LIGA ORQUESTRADOR - SISTEMA DE CARREGAMENTO MODULAR
// Responsável por gerenciar navegação e carregamento dinâmico dos módulos

class DetalheLigaOrquestrador {
    constructor() {
        this.processingModule = false;
        this.modules = {};
        this.loadedCSS = new Set();

        this.init();
    }

    // 🚀 INICIALIZAÇÃO PRINCIPAL (CORRIGIDA)
    async init() {
        try {
            console.log("🚀 Iniciando orquestrador...");

            await this.loadLayout();
            console.log("✅ Layout carregado");

            await this.loadModules();
            console.log("✅ Módulos carregados");

            await this.updateParticipantesCount();
            console.log("✅ Participantes atualizados");

            this.initializeNavigation();
            console.log("✅ Navegação inicializada");

            this.setupGlobalFunctions();
            console.log("✅ Funções globais configuradas");

            // 🧹 GARANTIR LIMPEZA DO HEADER (timeout mais conservador)
            setTimeout(() => {
                try {
                    this.limparLinhaDoMeio();
                } catch (error) {
                    console.warn("⚠️ Erro ao limpar header:", error);
                }
            }, 1500);

            // Inicializar ícones Lucide
            if (typeof lucide !== "undefined") {
                lucide.createIcons();
                console.log("✅ Ícones Lucide inicializados");
            }

            console.log("✅ Orquestrador inicializado com sucesso");
        } catch (error) {
            console.error("❌ Erro na inicialização do orquestrador:", error);
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
            } else {
                console.log(
                    `ℹ️ CSS do módulo ${moduleName} não encontrado (usando CSS base)`,
                );
            }
        } catch (error) {
            console.log(
                `ℹ️ CSS do módulo ${moduleName} não encontrado, usando CSS base`,
            );
        }
    }

    // 📄 LOADING STATES (CORRIGIDOS)
    showLoading(text = "Carregando dados...") {
        try {
            const overlay = document.getElementById("processing-overlay");
            if (overlay) {
                const textEl = overlay.querySelector(".processing-text");
                if (textEl) {
                    textEl.textContent = text;
                }
                overlay.classList.add("active");
                console.log(`📄 Loading ativo: ${text}`);
            } else {
                console.warn("⚠️ Overlay de loading não encontrado");
            }
        } catch (error) {
            console.error("❌ Erro no showLoading:", error);
        }
    }

    hideLoading() {
        try {
            const overlay = document.getElementById("processing-overlay");
            if (overlay) {
                overlay.classList.remove("active");
                console.log("📄 Loading ocultado");
            }
        } catch (error) {
            console.error("❌ Erro no hideLoading:", error);
        }
    }

    // ⚡ CARREGADOR COMBINADO (SEM LOADING PARA EVITAR ERROS)
    async loadModule(moduleName) {
        console.log(`⚡ Carregando módulo: ${moduleName}`);

        try {
            // Carregar CSS primeiro
            await this.loadModuleCSS(moduleName);

            // Carregar HTML
            const html = await this.loadModuleHTML(moduleName);

            // Injetar HTML na área dinâmica
            const contentArea = document.getElementById("dynamic-content-area");
            if (contentArea) {
                contentArea.innerHTML = html;
                console.log(`✅ HTML do módulo ${moduleName} injetado`);
            } else {
                throw new Error("Área de conteúdo dinâmico não encontrada");
            }

            // Executar scripts específicos do módulo
            await this.executeModuleScripts(moduleName);

            return { success: true, html };
        } catch (error) {
            console.error(`❌ Erro ao carregar módulo ${moduleName}:`, error);

            // Mostrar erro na área de conteúdo
            const contentArea = document.getElementById("dynamic-content-area");
            if (contentArea) {
                contentArea.innerHTML = `
                    <div class="content-card">
                        <div class="card-header">
                            <div class="card-title">
                                <div class="card-icon">⚠️</div>
                                <h2>Erro ao carregar módulo</h2>
                            </div>
                            <div class="card-subtitle">${error.message}</div>
                        </div>
                        <div class="module-actions">
                            <button class="back-button" onclick="window.orquestrador?.voltarParaCards()">
                                ← Voltar aos Cards
                            </button>
                        </div>
                    </div>
                `;
            }

            return { success: false, error: error.message };
        }
    }

    // 🔧 EXECUTAR SCRIPTS DO MÓDULO
    async executeModuleScripts(moduleName) {
        try {
            switch (moduleName) {
                case "ranking-geral":
                    // INTERCEPTAR FUNÇÃO ANTES DE CARREGAR
                    this.interceptarRankingFunction();

                    if (this.modules.ranking?.carregarRankingGeral) {
                        await this.modules.ranking.carregarRankingGeral();
                    }

                    // APLICAR ESTILOS APÓS CARREGAMENTO
                    setTimeout(() => this.applyRankingStyles(), 500);
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
                    // Aguardar renderização do HTML antes de carregar dados
                    setTimeout(async () => {
                        // Primeiro carrega os dados básicos
                        await this.loadParticipantesData();

                        // Depois carrega os brasões
                        setTimeout(() => {
                            this.carregarParticipantesComBrasoes();
                        }, 500);
                    }, 200);
                    break;
            }
        } catch (error) {
            console.error(
                `❌ Erro ao executar scripts do módulo ${moduleName}:`,
                error,
            );
        }
    }

    // 🛡️ FUNÇÃO PARA CARREGAR PARTICIPANTES COM BRASÕES
    async carregarParticipantesComBrasoes() {
        const container = document.getElementById("participantes-grid");
        if (!container) {
            console.log("Container participantes-grid não encontrado");
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const ligaId = urlParams.get("id");

        if (!ligaId) {
            console.error("ID da liga não encontrado");
            return;
        }

        try {
            console.log(
                `🛡️ Carregando participantes com brasões da liga: ${ligaId}`,
            );

            // Buscar dados da liga
            const resLiga = await fetch(`/api/ligas/${ligaId}`);
            if (!resLiga.ok) throw new Error("Erro ao buscar liga");
            const liga = await resLiga.json();

            if (!liga.times || liga.times.length === 0) {
                container.innerHTML =
                    '<p class="no-data" style="text-align: center; padding: 60px; color: #95a5a6;">Nenhum participante cadastrado</p>';
                return;
            }

            // Buscar dados de cada time
            const timesData = await Promise.all(
                liga.times.map(async (timeId) => {
                    try {
                        const res = await fetch(`/api/time/${timeId}`);
                        if (!res.ok) return null;
                        const data = await res.json();
                        return { ...data, id: timeId, ativo: true };
                    } catch (err) {
                        console.error(`Erro ao buscar time ${timeId}:`, err);
                        return null;
                    }
                }),
            );

            // Filtrar times válidos e ordenar
            const timesValidos = timesData
                .filter((t) => t !== null)
                .sort((a, b) =>
                    (a.nome_cartoleiro || "").localeCompare(
                        b.nome_cartoleiro || "",
                    ),
                );

            // Limpar container e renderizar cards com brasões duplos
            container.innerHTML = "";
            container.style.display = "grid";
            container.style.gridTemplateColumns =
                "repeat(auto-fill, minmax(280px, 1fr))";
            container.style.gap = "20px";
            container.style.padding = "20px 0";

            timesValidos.forEach((timeData, i) => {
                const card = document.createElement("div");
                card.className = "participante-card";
                card.style.cssText = `
                    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    padding: 20px;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                    animation: fadeInUp 0.5s ease forwards;
                    animation-delay: ${i * 0.05}s;
                    opacity: 0;
                `;

                card.innerHTML = `
                    <!-- Header do Card -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; justify-content: center; width: 35px; height: 35px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; color: white; font-size: 16px;">
                            <span>👤</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #d4edda; color: #155724;">
                            <span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>
                            Ativo
                        </div>
                    </div>

                    <!-- Informações do Cartoleiro -->
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h4 style="font-size: 18px; font-weight: 700; color: #2c3e50; margin: 0 0 5px 0;">${timeData.nome_cartoleiro || "N/D"}</h4>
                        <p style="font-size: 14px; color: #7f8c8d; margin: 0;">${timeData.nome_time || "Time N/A"}</p>
                    </div>

                    <!-- Container dos Brasões -->
                    <div style="display: flex; align-items: center; justify-content: space-around; padding: 20px 10px; background: linear-gradient(135deg, #f6f9fc 0%, #e9ecef 100%); border-radius: 10px; margin-bottom: 15px;">
                        <!-- Brasão do Time Fantasy -->
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1;">
                            <img src="${timeData.url_escudo_png || "/escudos/default.png"}" 
                                 alt="Time no Cartola" 
                                 title="Time no Cartola FC"
                                 style="width: 60px; height: 60px; object-fit: contain; border-radius: 50%; padding: 5px; background: white; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1); border: 2px solid #3498db;"
                                 onerror="this.src='/escudos/default.png'">
                            <span style="font-size: 11px; color: #3498db; text-align: center; font-weight: 600;">Time Cartola</span>
                        </div>

                        <!-- Separador Visual -->
                        <div style="display: flex; align-items: center; justify-content: center; color: #95a5a6; font-size: 20px; margin: 0 10px;">
                            <span>⚡</span>
                        </div>

                        <!-- Brasão do Clube do Coração -->
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1;">
                            <img src="/escudos/${timeData.clube_id || "placeholder"}.png" 
                                 alt="Clube do Coração" 
                                 title="Clube do Coração"
                                 style="width: 60px; height: 60px; object-fit: contain; border-radius: 50%; padding: 5px; background: white; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1); border: 2px solid #e74c3c;"
                                 onerror="this.src='/escudos/placeholder.png'">
                            <span style="font-size: 11px; color: #e74c3c; text-align: center; font-weight: 600;">
                                ${timeData.clube_id ? "❤️ Clube" : "Não definido"}
                            </span>
                        </div>
                    </div>
                `;

                // Adicionar hover effect
                card.onmouseenter = function () {
                    this.style.transform = "translateY(-5px)";
                    this.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.15)";
                };
                card.onmouseleave = function () {
                    this.style.transform = "translateY(0)";
                    this.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                };

                container.appendChild(card);
            });

            // Adicionar CSS para animação se não existir
            if (!document.getElementById("participantes-animation-style")) {
                const style = document.createElement("style");
                style.id = "participantes-animation-style";
                style.textContent = `
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            // Atualizar estatísticas
            const totalElement = document.getElementById("total-participantes");
            if (totalElement) totalElement.textContent = timesValidos.length;

            const ativosElement = document.getElementById(
                "participantes-ativos",
            );
            if (ativosElement) ativosElement.textContent = timesValidos.length;

            const clubesUnicos = new Set(
                timesValidos.map((t) => t.clube_id).filter(Boolean),
            );
            const uniquesElement = document.getElementById("times-diferentes");
            if (uniquesElement) uniquesElement.textContent = clubesUnicos.size;

            console.log(
                `✅ ${timesValidos.length} participantes carregados com brasões duplos`,
            );
        } catch (error) {
            console.error(
                "❌ Erro ao carregar participantes com brasões:",
                error,
            );
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c;">
                    <p>❌ Erro ao carregar participantes</p>
                </div>
            `;
        }
    }

    // 📄 HTML FALLBACK PARA MÓDULOS SEM ARQUIVO PRÓPRIO
    getFallbackHTML(moduleName) {
        const fallbacks = {
            participantes: `
                <div id="participantes-content">
                    <!-- Header dos Participantes -->
                    <div class="module-header-section">
                        <div class="module-title-section">
                            <div class="module-title-icon">👥</div>
                            <h2>Participantes da Liga</h2>
                        </div>
                        <div class="module-subtitle">membros ativos na competição</div>
                    </div>

                    <!-- Estatísticas Rápidas -->
                    <div class="participants-stats">
                        <div class="stat-card">
                            <div class="stat-icon">👤</div>
                            <div class="stat-info">
                                <div class="stat-number" id="total-participantes">0</div>
                                <div class="stat-label">Total</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">⚡</div>
                            <div class="stat-info">
                                <div class="stat-number" id="participantes-ativos">0</div>
                                <div class="stat-label">Ativos</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">🏆</div>
                            <div class="stat-info">
                                <div class="stat-number" id="times-diferentes">0</div>
                                <div class="stat-label">Times Únicos</div>
                            </div>
                        </div>
                    </div>

                    <!-- Grid de Participantes -->
                    <div id="participantes-grid" class="participantes-grid">
                        <div class="loading-state-full">
                            <div style="display: flex; align-items: center; justify-content: center; gap: 15px; padding: 60px;">
                                <div style="width: 40px; height: 40px; border: 4px solid rgba(255, 69, 0, 0.3); border-top: 4px solid #ff4500; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                <div style="color: #ff4500; font-weight: 600; font-size: 16px">
                                    Carregando dados dos participantes...
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Botão Voltar -->
                    <div class="module-actions">
                        <button class="back-button" onclick="window.orquestrador?.voltarParaCards()">
                            ← Voltar aos Cards
                        </button>
                    </div>
                </div>
            `,
            "ranking-geral": `
                <div id="ranking-geral">
                    <div class="ranking-header">
                        <div class="ranking-title">
                            <div class="ranking-icon">🏅</div>
                            <h2>Classificação Geral</h2>
                        </div>
                        <div class="ranking-subtitle">carregando classificação oficial...</div>
                    </div>
                    <div class="loading-state">Processando dados da classificação...</div>
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

    // 🧭 SISTEMA DE NAVEGAÇÃO (CORRIGIDO)
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

                // ⚡ CORREÇÃO CRÍTICA: Sempre mostrar tela secundária primeiro
                this.showSecondaryScreen();

                if (module === "participantes") {
                    await this.showModule("participantes");
                } else {
                    // Para outros cards, mostrar primeira ação
                    const firstAction = card.querySelector("li[data-action]");
                    if (firstAction) {
                        await this.executeAction(
                            firstAction.dataset.action,
                            false,
                        ); // false = não chamar showSecondaryScreen novamente
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

    // ⚡ EXECUTAR AÇÃO ESPECÍFICA (ATUALIZADO)
    async executeAction(action, showSecondary = true) {
        if (this.processingModule) return;

        this.processingModule = true;

        try {
            // Só mostrar tela secundária se solicitado
            if (showSecondary) {
                this.showSecondaryScreen();
            }

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

    // 📄 NAVEGAÇÃO ENTRE TELAS (VERIFICAÇÃO DE CSS)
    showSecondaryScreen() {
        const mainScreen = document.getElementById("main-screen");
        const secondaryScreen = document.getElementById("secondary-screen");

        if (mainScreen) {
            mainScreen.style.display = "none";
            console.log("📄 Tela principal ocultada");
        }

        if (secondaryScreen) {
            secondaryScreen.classList.add("active");
            secondaryScreen.style.display = "block"; // ⚡ FORÇAR DISPLAY
            console.log("📄 Tela secundária ativada");
        }
    }

    voltarParaCards() {
        const mainScreen = document.getElementById("main-screen");
        const secondaryScreen = document.getElementById("secondary-screen");

        if (secondaryScreen) {
            secondaryScreen.classList.remove("active");
            secondaryScreen.style.display = "none"; // ⚡ FORÇAR OCULTAÇÃO
            console.log("📄 Tela secundária ocultada");
        }

        if (mainScreen) {
            mainScreen.style.display = "block";
            console.log("📄 Tela principal exibida");
        }
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

    // 👥 CARREGAR DADOS DE PARTICIPANTES (OTIMIZADO SEM LOADING)
    async loadParticipantesData() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const ligaId = urlParams.get("id");

            if (!ligaId) {
                const participantesGrid =
                    document.getElementById("participantes-grid");
                if (participantesGrid) {
                    participantesGrid.innerHTML = `
                        <div class="participantes-empty-state">
                            <div class="empty-icon">⚠️</div>
                            <div class="empty-title">ID da liga não encontrado</div>
                            <div class="empty-message">Não foi possível identificar a liga</div>
                        </div>
                    `;
                }
                return;
            }

            console.log(`👥 Carregando participantes da liga: ${ligaId}`);

            // Mostrar loading no grid específico
            const participantesGrid =
                document.getElementById("participantes-grid");
            if (participantesGrid) {
                participantesGrid.innerHTML = `
                    <div class="loading-state-full">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 15px; padding: 60px;">
                            <div style="width: 40px; height: 40px; border: 4px solid rgba(255, 69, 0, 0.3); border-top: 4px solid #ff4500; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            <div style="color: #ff4500; font-weight: 600; font-size: 16px">
                                Carregando dados dos participantes...
                            </div>
                        </div>
                    </div>
                `;
            }

            const response = await fetch(`/api/ligas/${ligaId}`);
            if (!response.ok) {
                throw new Error("Erro ao carregar liga");
            }

            const liga = await response.json();
            console.log(
                `📊 Liga carregada: ${liga.nome} - ${liga.times?.length || 0} times`,
            );

            if (!liga.times || liga.times.length === 0) {
                if (participantesGrid) {
                    participantesGrid.innerHTML = `
                        <div class="participantes-empty-state">
                            <div class="empty-icon">👥</div>
                            <div class="empty-title">Nenhum participante</div>
                            <div class="empty-message">Esta liga ainda não possui participantes cadastrados</div>
                        </div>
                    `;
                }
                return;
            }

            // Atualizar estatísticas iniciais
            this.updateParticipantesStats(liga.times.length);

            // Nota: A renderização dos cards com brasões será feita pela função carregarParticipantesComBrasoes()

            console.log(
                `✅ Dados básicos carregados, aguardando renderização com brasões`,
            );
        } catch (error) {
            console.error("❌ Erro ao carregar participantes:", error);
            const participantesGrid =
                document.getElementById("participantes-grid");
            if (participantesGrid) {
                participantesGrid.innerHTML = `
                    <div class="participantes-empty-state">
                        <div class="empty-icon">⚠️</div>
                        <div class="empty-title">Erro ao carregar</div>
                        <div class="empty-message">${error.message}</div>
                    </div>
                `;
            }
        }
    }

    // 📊 ATUALIZAR ESTATÍSTICAS DOS PARTICIPANTES
    updateParticipantesStats(total = 0, ativos = 0, timesUnicos = 0) {
        const totalElement = document.getElementById("total-participantes");
        const ativosElement = document.getElementById("participantes-ativos");
        const timesElement = document.getElementById("times-diferentes");

        if (totalElement) totalElement.textContent = total;
        if (ativosElement) ativosElement.textContent = ativos || total;
        if (timesElement) timesElement.textContent = timesUnicos || total;

        console.log(
            `📊 Stats atualizadas: Total=${total}, Ativos=${ativos || total}, Times=${timesUnicos || total}`,
        );
    }

    // 📊 ATUALIZAR CONTADOR DE PARTICIPANTES + LIMPAR HEADER (CORRIGIDO)
    async updateParticipantesCount() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const ligaId = urlParams.get("id");

            if (!ligaId) {
                console.log("ℹ️ ID da liga não encontrado na URL");
                return;
            }

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
                    const totalParticipantes =
                        liga.participantes?.length || liga.times?.length || 0;
                    quantidadeElement.textContent = `${totalParticipantes} participantes`;
                }

                // Atualizar contador no card
                const countElement = document.getElementById(
                    "participantes-count",
                );
                if (countElement) {
                    const totalMembros =
                        liga.participantes?.length || liga.times?.length || 0;
                    countElement.textContent = `${totalMembros} membros`;
                }

                console.log(
                    `✅ Liga atualizada: ${liga.nome} com ${liga.participantes?.length || liga.times?.length || 0} participantes`,
                );

                // 🔧 LIMPAR LINHA DO MEIO PROGRAMATICAMENTE
                setTimeout(() => this.limparLinhaDoMeio(), 100);
            } else {
                console.warn(
                    "⚠️ Erro ao carregar dados da liga:",
                    response.status,
                );
            }
        } catch (error) {
            console.warn("⚠️ Erro ao atualizar contador:", error);
        }
    }

    // 🧹 FUNÇÃO PARA LIMPAR LINHA DO MEIO (CORRIGIDA)
    limparLinhaDoMeio() {
        const ligaHeader = document.querySelector(".liga-header");
        if (!ligaHeader) {
            console.log("ℹ️ Liga header não encontrado");
            return;
        }

        // Remover qualquer elemento que contenha "Liga:" no texto
        const elementos = ligaHeader.querySelectorAll("*");
        elementos.forEach((el) => {
            const texto = el.textContent || el.innerText || "";
            if (
                texto.includes("Liga:") &&
                !el.id.includes("nomeLiga") &&
                !el.id.includes("quantidadeTimes") &&
                !el.classList.contains("liga-titulo") &&
                !el.classList.contains("liga-info")
            ) {
                el.style.display = "none";
                el.remove();
                console.log(
                    '🧹 Removido elemento com "Liga:":',
                    texto.substring(0, 50),
                );
            }
        });

        // Garantir que apenas 2 elementos filhos diretos estão visíveis
        const filhos = Array.from(ligaHeader.children);
        filhos.forEach((filho, index) => {
            const isNomeLiga =
                filho.id === "nomeLiga" ||
                filho.classList.contains("liga-titulo");
            const isQuantidade =
                filho.id === "quantidadeTimes" ||
                filho.classList.contains("liga-info");

            if (!isNomeLiga && !isQuantidade) {
                filho.style.display = "none";
                console.log(
                    "🧹 Removendo elemento extra do header:",
                    filho.textContent?.substring(0, 30),
                );
            }
        });

        // Observador para remover elementos inseridos dinamicamente
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "childList") {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            // Element node
                            const texto = node.textContent || "";
                            if (texto.includes("Liga:")) {
                                console.log(
                                    "🧹 Removendo elemento dinâmico:",
                                    texto.substring(0, 30),
                                );
                                node.style.display = "none";
                                node.remove();
                            }
                        }
                    });
                }
            });
        });

        // Observer completo e conectado
        observer.observe(ligaHeader, { childList: true, subtree: true });

        // Parar observação após 5 segundos
        setTimeout(() => {
            observer.disconnect();
            console.log("🧹 Observer do header desconectado após 5s");
        }, 5000);
    }

    // 🔧 INTERCEPTAR FUNÇÃO DO RANKING.JS (FUNCIONALIDADE CRÍTICA RESTAURADA)
    interceptarRankingFunction() {
        // Aguardar função estar disponível
        const checkFunction = setInterval(() => {
            if (window.criarTabelaRanking) {
                clearInterval(checkFunction);

                console.log("🎯 Interceptando função criarTabelaRanking");

                // Backup da função original
                window.criarTabelaRankingOriginal = window.criarTabelaRanking;

                // Substituir com versão profissional
                window.criarTabelaRanking = function (
                    participantes,
                    ultimaRodada,
                    ligaId,
                ) {
                    return `
                        <div class="ranking-header">
                            <div class="ranking-title">
                                <div class="ranking-icon">🏅</div>
                                <h2>Classificação Geral</h2>
                            </div>
                            <div class="ranking-subtitle">pontuação acumulada até a ${ultimaRodada}ª rodada</div>
                        </div>

                        <div class="ranking-controls">
                            <div class="ranking-info">
                                📈 ${participantes.length} participantes classificados
                            </div>
                            <div id="rankingGeralExportBtnContainer" class="export-btn-container"></div>
                        </div>

                        <table id="rankingGeralTable" class="ranking-table">
                            <thead>
                                <tr>
                                    <th style="width: 60px; text-align: center">Posição</th>
                                    <th style="width: 50px; text-align: center">❤️</th>
                                    <th style="min-width: 180px; text-align: left">Cartoleiro</th>
                                    <th style="min-width: 140px; text-align: left">Time</th>
                                    <th style="width: 100px; text-align: center">Pontos</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${participantes
                                    .map((participante, index) => {
                                        const posicao = index + 1;
                                        const pontos =
                                            participante.pontos.toFixed(2);
                                        const trofeu =
                                            index === 0
                                                ? "🏆"
                                                : index === 1
                                                  ? "🥈"
                                                  : index === 2
                                                    ? "🥉"
                                                    : posicao + "º";

                                        return `
                                    <tr style="${index < 3 ? "background: rgba(255, 69, 0, 0.1); font-weight: 600;" : ""}">
                                        <td style="text-align:center; padding:12px 8px; font-weight: 700;">
                                            ${trofeu}
                                        </td>
                                        <td style="text-align:center; padding:8px;">
                                            ${
                                                participante.clube_id
                                                    ? `<img src="/escudos/${participante.clube_id}.png" 
                                                   alt="Time do Coração" 
                                                   style="width:22px; height:22px; border-radius:50%; border:1px solid #333;"
                                                   onerror="this.outerHTML='❤️'"/>`
                                                    : "❤️"
                                            }
                                        </td>
                                        <td style="text-align:left; padding:12px 8px; font-weight: 600; color: #ffffff;">
                                            ${participante.nome_cartola || "N/D"}
                                        </td>
                                        <td style="text-align:left; padding:12px 8px; color: #e0e0e0;">
                                            ${participante.nome_time || "N/D"}
                                        </td>
                                        <td style="text-align:center; padding:12px 8px;">
                                            <span style="background: linear-gradient(135deg, #ff4500 0%, #e8472b 100%); 
                                                         color: white; padding: 4px 8px; border-radius: 6px; 
                                                         font-weight: 700; font-size: 12px; font-family: 'JetBrains Mono', monospace;">
                                                ${pontos}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                                    })
                                    .join("")}
                            </tbody>
                        </table>
                    `;
                };

                console.log(
                    "✅ Função criarTabelaRanking interceptada e substituída",
                );
            }
        }, 50);

        // Timeout de segurança
        setTimeout(() => {
            clearInterval(checkFunction);
        }, 3000);
    }

    // 🎨 APLICAR ESTILOS ESPECÍFICOS DO RANKING (FUNCIONALIDADE CRÍTICA RESTAURADA)
    applyRankingStyles() {
        // Observador para aplicar estilos quando conteúdo for injetado
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "childList") {
                    const rankingGeral =
                        document.getElementById("ranking-geral");
                    if (rankingGeral) {
                        // Aplicar estilos profissionais
                        const titulo = rankingGeral.querySelector("h2");
                        if (titulo) {
                            titulo.style.color = "#ffffff";
                            titulo.style.fontWeight = "800";
                            titulo.style.textShadow =
                                "0 2px 10px rgba(255, 255, 255, 0.3)";
                            titulo.style.fontFamily =
                                "Inter, -apple-system, sans-serif";
                        }

                        const subtitulo = rankingGeral.querySelector(
                            '[style*="color: #888"]',
                        );
                        if (subtitulo) {
                            subtitulo.style.color = "#a0a0a0";
                            subtitulo.style.fontWeight = "500";
                        }

                        // Aplicar estilos do botão
                        const exportBtn = rankingGeral.querySelector(
                            "#rankingGeralExportBtnContainer button",
                        );
                        if (exportBtn) {
                            exportBtn.style.background =
                                "linear-gradient(135deg, #ff4500 0%, #e8472b 100%)";
                            exportBtn.style.color = "white";
                            exportBtn.style.border =
                                "2px solid rgba(255, 69, 0, 0.3)";
                            exportBtn.style.fontWeight = "700";
                            exportBtn.style.textTransform = "uppercase";
                            exportBtn.style.letterSpacing = "0.5px";
                        }

                        // Aplicar estilos às posições específicas
                        const rows = rankingGeral.querySelectorAll("tbody tr");
                        rows.forEach((row, index) => {
                            if (index === 0) {
                                row.style.background =
                                    "linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 193, 7, 0.1) 100%)";
                                row.style.borderLeft = "4px solid #ffd700";
                            } else if (index === 1) {
                                row.style.background =
                                    "linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(169, 169, 169, 0.1) 100%)";
                                row.style.borderLeft = "4px solid #c0c0c0";
                            } else if (index === 2) {
                                row.style.background =
                                    "linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(184, 115, 51, 0.1) 100%)";
                                row.style.borderLeft = "4px solid #cd7f32";
                            }
                        });
                    }
                }
            });
        });

        const contentArea = document.getElementById("dynamic-content-area");
        if (contentArea) {
            observer.observe(contentArea, { childList: true, subtree: true });

            // Parar observação após 10 segundos
            setTimeout(() => observer.disconnect(), 10000);
        }
    }

    // 📄 REDIRECIONAMENTO PARA PARCIAIS
    redirectToParciais() {
        const urlParams = new URLSearchParams(window.location.search);
        const ligaId = urlParams.get("id");
        if (ligaId) {
            window.location.href = `parciais.html?id=${ligaId}`;
        }
    }

    // 🌐 CONFIGURAR FUNÇÕES GLOBAIS (COMPATIBILIDADE)
    setupGlobalFunctions() {
        window.voltarParaCards = () => this.voltarParaCards();
        window.showParticipantes = () => this.showModule("participantes");
        window.executeAction = (action) => this.executeAction(action);

        // Manter compatibilidade com sistema existente
        window.orquestrador = this;
    }
}

// 🚀 INICIALIZAÇÃO AUTOMÁTICA
document.addEventListener("DOMContentLoaded", () => {
    window.detalheLigaOrquestrador = new DetalheLigaOrquestrador();
});
