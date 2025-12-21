// =====================================================================
// PARTICIPANTE NAVIGATION v4.0 - Bottom Sheet Premium
// =====================================================================
// ✅ v4.0: Menu inferior colapsável com Bottom Sheet
//    - Dock fixo com 5 módulos core + botão "Mais"
//    - Bottom Sheet expansível para todos os módulos
//    - Animações premium 60fps
//    - Gesture de swipe para fechar
//    - Categorização de módulos
// =====================================================================

if (window.Log) Log.info('PARTICIPANTE-NAV', '🚀 Carregando sistema de navegação v4.0 (Bottom Sheet)...');

class ParticipanteNavigationV4 {
    constructor() {
        this.moduloAtual = "boas-vindas";
        this.participanteData = null;
        this.modulosAtivos = {};
        this.historicoNavegacao = [];
        this.sheetOpen = false;

        // Configuração dos módulos
        this.modulos = {
            "boas-vindas": "/participante/fronts/boas-vindas.html",
            extrato: "/participante/fronts/extrato.html",
            ranking: "/participante/fronts/ranking.html",
            rodadas: "/participante/fronts/rodadas.html",
            historico: "/participante/fronts/historico.html",
            top10: "/participante/fronts/top10.html",
            "melhor-mes": "/participante/fronts/melhor-mes.html",
            "pontos-corridos": "/participante/fronts/pontos-corridos.html",
            "mata-mata": "/participante/fronts/mata-mata.html",
            artilheiro: "/participante/fronts/artilheiro.html",
            "luva-ouro": "/participante/fronts/luva-ouro.html",
        };

        // Módulos do Dock (fixos na barra inferior)
        this.dockModulos = [
            { id: "boas-vindas", icon: "home", label: "Início" },
            { id: "extrato", icon: "payments", label: "Extrato" },
            { id: "ranking", icon: "leaderboard", label: "Ranking" },
            { id: "rodadas", icon: "target", label: "Rodadas" },
        ];

        // Todos os módulos com categorias
        this.todosModulos = {
            core: {
                titulo: "Principal",
                icon: "dashboard",
                itens: [
                    { id: "boas-vindas", icon: "home", label: "Início", config: "extrato", base: true },
                    { id: "extrato", icon: "payments", label: "Extrato", config: "extrato", base: true },
                    { id: "ranking", icon: "leaderboard", label: "Ranking", config: "ranking", base: true },
                    { id: "rodadas", icon: "target", label: "Rodadas", config: "rodadas", base: true },
                    { id: "historico", icon: "emoji_events", label: "Hall da Fama", config: "historico", base: true },
                ]
            },
            competicoes: {
                titulo: "Competições",
                icon: "sports_score",
                itens: [
                    { id: "pontos-corridos", icon: "sync", label: "Pontos Corridos", config: "pontosCorridos", base: false },
                    { id: "mata-mata", icon: "swords", label: "Mata-Mata", config: "mataMata", base: false },
                    { id: "top10", icon: "format_list_numbered", label: "Top 10", config: "top10", base: false },
                ]
            },
            premiacoes: {
                titulo: "Premiações",
                icon: "workspace_premium",
                itens: [
                    { id: "melhor-mes", icon: "calendar_month", label: "Melhor do Mês", config: "melhorMes", base: false },
                    { id: "artilheiro", icon: "sports_soccer", label: "Artilheiro", config: "artilheiro", base: false },
                    { id: "luva-ouro", icon: "front_hand", label: "Luva de Ouro", config: "luvaOuro", base: false },
                ]
            }
        };

        // Controles
        this._inicializando = false;
        this._ultimaNavegacao = 0;
        this._debounceMs = 100;
        this._touchStartY = 0;
    }

    async inicializar() {
        if (this._inicializando) return;
        this._inicializando = true;

        if (window.Log) Log.info('PARTICIPANTE-NAV', 'Inicializando navegação v4.0...');

        await this.aguardarDadosParticipante();
        await this.carregarModulosAtivos();

        this.renderizarNavegacao();
        this.configurarEventListeners();
        this.configurarHistoryAPI();

        const moduloSalvo = sessionStorage.getItem("participante_modulo_atual") || "boas-vindas";
        this.atualizarAtivo(moduloSalvo);
        await this.navegarPara(moduloSalvo);
    }

    async aguardarDadosParticipante() {
        if (window.participanteAuth?.participante) {
            this.participanteData = {
                timeId: window.participanteAuth.timeId,
                ligaId: window.participanteAuth.ligaId,
                nomeCartola: window.participanteAuth.participante.participante?.nome_cartola || "Participante",
                nomeTime: window.participanteAuth.participante.participante?.nome_time || "Meu Time",
            };
            return;
        }

        return new Promise((resolve, reject) => {
            const pollInterval = setInterval(() => {
                if (window.participanteAuth?.participante) {
                    clearInterval(pollInterval);
                    clearTimeout(timeout);
                    this.participanteData = {
                        timeId: window.participanteAuth.timeId,
                        ligaId: window.participanteAuth.ligaId,
                        nomeCartola: window.participanteAuth.participante.participante?.nome_cartola || "Participante",
                        nomeTime: window.participanteAuth.participante.participante?.nome_time || "Meu Time",
                    };
                    resolve();
                }
            }, 200);

            const timeout = setTimeout(() => {
                clearInterval(pollInterval);
                if (window.participanteAuth?.participante) {
                    this.participanteData = {
                        timeId: window.participanteAuth.timeId,
                        ligaId: window.participanteAuth.ligaId,
                    };
                    resolve();
                    return;
                }
                window.location.href = "/participante-login.html";
                reject(new Error('Timeout'));
            }, 5000);

            window.addEventListener('participante-auth-ready', (event) => {
                clearInterval(pollInterval);
                clearTimeout(timeout);
                const { participante, ligaId, timeId, ligaData } = event.detail;
                this.participanteData = { timeId, ligaId };
                if (ligaData) this._ligaDataFromEvent = ligaData;
                resolve();
            }, { once: true });
        });
    }

    async carregarModulosAtivos() {
        try {
            if (window.participanteAuth?.ligaDataCache) {
                this.modulosAtivos = window.participanteAuth.ligaDataCache.modulos_ativos || {};
                return;
            }

            if (this._ligaDataFromEvent) {
                this.modulosAtivos = this._ligaDataFromEvent.modulos_ativos || {};
                return;
            }

            const response = await fetch(`/api/ligas/${this.participanteData.ligaId}`);
            if (response.ok) {
                const liga = await response.json();
                this.modulosAtivos = liga.modulos_ativos || {};
            }
        } catch (error) {
            if (window.Log) Log.error('PARTICIPANTE-NAV', 'Erro ao buscar módulos:', error);
            this.modulosAtivos = { extrato: true, ranking: true, rodadas: true };
        }
    }

    verificarModuloAtivo(configKey) {
        const modulosBase = ["extrato", "ranking", "rodadas", "historico"];
        if (modulosBase.includes(configKey)) return true;
        return this.modulosAtivos[configKey] === true;
    }

    // =========================================================================
    // RENDERIZAÇÃO
    // =========================================================================
    renderizarNavegacao() {
        // Remover navegação antiga se existir
        document.querySelector('.bottom-nav-modern')?.remove();
        document.querySelector('.nav-dock')?.remove();
        document.querySelector('.nav-sheet-overlay')?.remove();
        document.querySelector('.nav-sheet')?.remove();

        // Contar módulos extras ativos
        const modulosExtras = this.contarModulosExtras();

        // Criar Dock
        const dock = document.createElement('nav');
        dock.className = 'nav-dock';
        dock.innerHTML = this.dockModulos.map(m => `
            <button class="nav-dock-item" data-module="${m.id}" title="${m.label}">
                <span class="material-icons nav-dock-icon">${m.icon}</span>
                <span class="nav-dock-label">${m.label}</span>
            </button>
        `).join('') + `
            <button class="nav-dock-item nav-dock-more" data-action="toggle-sheet" title="Mais opções">
                ${modulosExtras > 0 ? `<span class="nav-dock-badge">${modulosExtras}</span>` : ''}
                <span class="material-icons nav-dock-icon">apps</span>
                <span class="nav-dock-label">Mais</span>
            </button>
        `;

        // Criar Overlay
        const overlay = document.createElement('div');
        overlay.className = 'nav-sheet-overlay';
        overlay.id = 'navSheetOverlay';

        // Criar Bottom Sheet
        const sheet = document.createElement('div');
        sheet.className = 'nav-sheet';
        sheet.id = 'navSheet';
        sheet.innerHTML = `
            <div class="nav-sheet-handle"></div>
            <div class="nav-sheet-header">
                <h3 class="nav-sheet-title">
                    <span class="material-icons">apps</span>
                    Módulos
                </h3>
                <button class="nav-sheet-close" data-action="close-sheet">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="nav-sheet-content">
                ${this.renderizarCategoriasSheet()}
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(sheet);
        document.body.appendChild(dock);

        if (window.Log) Log.info('PARTICIPANTE-NAV', '✅ Bottom Sheet Navigation renderizado');
    }

    contarModulosExtras() {
        let count = 0;
        Object.values(this.todosModulos).forEach(categoria => {
            categoria.itens.forEach(m => {
                if (!this.dockModulos.find(d => d.id === m.id)) {
                    if (this.verificarModuloAtivo(m.config)) {
                        count++;
                    }
                }
            });
        });
        return count;
    }

    renderizarCategoriasSheet() {
        let html = '';

        Object.entries(this.todosModulos).forEach(([key, categoria]) => {
            const itensAtivos = categoria.itens.filter(m => this.verificarModuloAtivo(m.config));
            if (itensAtivos.length === 0) return;

            html += `
                <div class="nav-sheet-category">
                    <div class="nav-sheet-category-title">
                        <span class="material-icons">${categoria.icon}</span>
                        ${categoria.titulo}
                    </div>
                    <div class="nav-sheet-grid">
                        ${itensAtivos.map(m => `
                            <button class="nav-sheet-item" data-module="${m.id}">
                                <div class="nav-sheet-item-icon">
                                    <span class="material-icons">${m.icon}</span>
                                </div>
                                <span class="nav-sheet-item-label">${m.label}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        return html;
    }

    // =========================================================================
    // EVENT LISTENERS
    // =========================================================================
    configurarEventListeners() {
        // Dock items
        document.querySelectorAll('.nav-dock-item[data-module]').forEach(btn => {
            btn.addEventListener('click', () => this.handleDockClick(btn.dataset.module));
        });

        // Toggle sheet
        document.querySelector('[data-action="toggle-sheet"]')?.addEventListener('click', () => {
            this.toggleSheet();
        });

        // Close sheet
        document.querySelector('[data-action="close-sheet"]')?.addEventListener('click', () => {
            this.fecharSheet();
        });

        // Overlay click
        document.getElementById('navSheetOverlay')?.addEventListener('click', () => {
            this.fecharSheet();
        });

        // Sheet items
        document.querySelectorAll('.nav-sheet-item[data-module]').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.add('tapped');
                setTimeout(() => btn.classList.remove('tapped'), 150);
                this.handleSheetItemClick(btn.dataset.module);
            });
        });

        // Gesture: swipe down to close
        const sheet = document.getElementById('navSheet');
        const handle = sheet?.querySelector('.nav-sheet-handle');

        if (handle) {
            handle.addEventListener('touchstart', (e) => {
                this._touchStartY = e.touches[0].clientY;
            }, { passive: true });

            handle.addEventListener('touchmove', (e) => {
                const deltaY = e.touches[0].clientY - this._touchStartY;
                if (deltaY > 50) {
                    this.fecharSheet();
                }
            }, { passive: true });
        }

        if (window.Log) Log.debug('PARTICIPANTE-NAV', '✅ Event listeners configurados');
    }

    handleDockClick(moduloId) {
        this.atualizarAtivo(moduloId);
        this.navegarPara(moduloId);
    }

    handleSheetItemClick(moduloId) {
        this.fecharSheet();
        setTimeout(() => {
            this.atualizarAtivo(moduloId);
            this.navegarPara(moduloId);
        }, 200);
    }

    toggleSheet() {
        if (this.sheetOpen) {
            this.fecharSheet();
        } else {
            this.abrirSheet();
        }
    }

    abrirSheet() {
        this.sheetOpen = true;
        document.getElementById('navSheetOverlay')?.classList.add('visible');
        document.getElementById('navSheet')?.classList.add('open');
        document.querySelector('.nav-dock-more')?.classList.add('sheet-open');
        document.body.style.overflow = 'hidden';
    }

    fecharSheet() {
        this.sheetOpen = false;
        document.getElementById('navSheetOverlay')?.classList.remove('visible');
        document.getElementById('navSheet')?.classList.remove('open');
        document.querySelector('.nav-dock-more')?.classList.remove('sheet-open');
        document.body.style.overflow = '';
    }

    atualizarAtivo(moduloId) {
        // Dock items
        document.querySelectorAll('.nav-dock-item').forEach(item => {
            item.classList.toggle('active', item.dataset.module === moduloId);
        });

        // Sheet items
        document.querySelectorAll('.nav-sheet-item').forEach(item => {
            item.classList.toggle('active', item.dataset.module === moduloId);
        });
    }

    // =========================================================================
    // HISTORY API
    // =========================================================================
    configurarHistoryAPI() {
        if (!history.state?.modulo) {
            history.replaceState({ modulo: this.moduloAtual, index: 0 }, '', window.location.href);
        }

        window.addEventListener('popstate', (event) => {
            this.tratarBotaoVoltar(event);
        });
    }

    tratarBotaoVoltar(event) {
        if (['boas-vindas', 'home'].includes(this.moduloAtual)) {
            history.pushState({ modulo: this.moduloAtual, index: this.historicoNavegacao.length }, '', window.location.href);
            this.mostrarModalSairApp();
            return;
        }

        if (this.historicoNavegacao.length > 0) {
            const moduloAnterior = this.historicoNavegacao.pop();
            this.navegarPara(moduloAnterior, false, true);
        } else {
            history.pushState({ modulo: 'boas-vindas', index: 0 }, '', window.location.href);
            this.navegarPara('boas-vindas', false, true);
        }
    }

    mostrarModalSairApp() {
        let modal = document.getElementById('modalSairApp');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalSairApp';
            modal.innerHTML = `
                <div class="modal-sair-overlay" onclick="window.participanteNav.fecharModalSairApp()">
                    <div class="modal-sair-content" onclick="event.stopPropagation()">
                        <div class="modal-sair-icon">
                            <span class="material-symbols-outlined">logout</span>
                        </div>
                        <h3 class="modal-sair-titulo">Deseja fechar o app?</h3>
                        <p class="modal-sair-texto">Você está prestes a sair do Super Cartola.</p>
                        <div class="modal-sair-botoes">
                            <button class="modal-sair-btn cancelar" onclick="window.participanteNav.fecharModalSairApp()">
                                <span class="material-symbols-outlined">close</span> Cancelar
                            </button>
                            <button class="modal-sair-btn confirmar" onclick="window.participanteNav.confirmarSairApp()">
                                <span class="material-symbols-outlined">exit_to_app</span> Sair
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        modal.style.display = 'block';
    }

    fecharModalSairApp() {
        document.getElementById('modalSairApp')?.style && (document.getElementById('modalSairApp').style.display = 'none');
    }

    confirmarSairApp() {
        try { window.close(); } catch (e) {
            history.go(-(this.historicoNavegacao.length + 1));
        }
    }

    // =========================================================================
    // NAVEGAÇÃO
    // =========================================================================
    async navegarPara(moduloId, forcarReload = false, voltandoHistorico = false) {
        const agora = Date.now();
        if (agora - this._ultimaNavegacao < this._debounceMs) return;
        this._ultimaNavegacao = agora;

        const container = document.getElementById("moduleContainer");
        if (!container) return;

        if (window.Log) Log.info('PARTICIPANTE-NAV', `🧭 Navegando para: ${moduloId}`);

        const timeoutId = setTimeout(() => {
            this.mostrarErroCarregamento(container, moduloId, 'Timeout');
        }, 15000);

        if (!voltandoHistorico && this.moduloAtual && this.moduloAtual !== moduloId) {
            this.historicoNavegacao.push(this.moduloAtual);
            history.pushState({ modulo: moduloId, index: this.historicoNavegacao.length }, '', window.location.href);
        }

        container.style.transition = 'opacity 0.15s ease-out';
        container.style.opacity = '0.6';

        try {
            const htmlPath = this.modulos[moduloId];
            if (!htmlPath) throw new Error(`Módulo "${moduloId}" não encontrado`);

            const response = await fetch(htmlPath);
            if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);

            const html = await response.text();
            clearTimeout(timeoutId);

            container.innerHTML = html;
            await this.carregarModuloJS(moduloId);

            this.moduloAtual = moduloId;
            window.moduloAtualParticipante = moduloId;
            sessionStorage.setItem("participante_modulo_atual", moduloId);
            localStorage.setItem(`modulo_loaded_${moduloId}`, Date.now().toString());

            container.style.opacity = '1';
            this.atualizarAtivo(moduloId);

            if (window.SplashScreen) window.SplashScreen.hide();
            if (window.LoadingOverlay) window.LoadingOverlay.hide();
            if (window.RefreshButton?.shouldShow()) window.RefreshButton.addTo(container, { text: 'Atualizar Dados' });

        } catch (error) {
            clearTimeout(timeoutId);
            container.style.opacity = '1';
            if (window.SplashScreen) window.SplashScreen.hide();
            if (window.LoadingOverlay) window.LoadingOverlay.hide();
            this.mostrarErroCarregamento(container, moduloId, error.message);
        }
    }

    mostrarErroCarregamento(container, moduloId, mensagem) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="background: rgba(239, 68, 68, 0.1); border-radius: 16px; padding: 40px; border: 2px solid rgba(239, 68, 68, 0.2);">
                    <span class="material-symbols-outlined" style="font-size: 64px; color: #facc15;">warning</span>
                    <h3 style="color: #dc2626; margin: 16px 0; font-size: 20px;">Ops! Algo deu errado</h3>
                    <p style="color: #999; margin-bottom: 24px;">${mensagem}</p>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="window.participanteNav.navegarPara('${moduloId}', true)"
                                style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 8px; cursor: pointer;">
                            <span class="material-symbols-outlined" style="font-size: 18px; vertical-align: middle;">refresh</span>
                            Tentar Novamente
                        </button>
                        <button onclick="window.participanteNav.navegarPara('boas-vindas')"
                                style="background: #ff4500; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer;">
                            <span class="material-symbols-outlined" style="font-size: 18px; vertical-align: middle;">home</span>
                            Voltar ao Início
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async carregarModuloJS(modulo) {
        const modulosPaths = {
            "boas-vindas": "/participante/js/modules/participante-boas-vindas.js",
            extrato: "/participante/js/modules/participante-extrato.js",
            ranking: "/participante/js/modules/participante-ranking.js",
            rodadas: "/participante/js/modules/participante-rodadas.js",
            historico: "/participante/js/modules/participante-historico.js",
            top10: "/participante/js/modules/participante-top10.js",
            "melhor-mes": "/participante/js/modules/participante-melhor-mes.js",
            "pontos-corridos": "/participante/js/modules/participante-pontos-corridos.js",
            "mata-mata": "/participante/js/modules/participante-mata-mata.js",
            artilheiro: "/participante/js/modules/participante-artilheiro.js",
            "luva-ouro": "/participante/js/modules/participante-luva-ouro.js",
        };

        const jsPath = modulosPaths[modulo];
        if (!jsPath) return;

        try {
            const moduloJS = await import(jsPath);
            const moduloCamelCase = modulo.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("");
            const funcNames = [
                `inicializar${moduloCamelCase}Participante`,
                `inicializar${moduloCamelCase}`,
            ];

            for (const funcName of funcNames) {
                if (moduloJS[funcName]) {
                    await moduloJS[funcName]({
                        participante: this.participanteData,
                        ligaId: this.participanteData?.ligaId,
                        timeId: this.participanteData?.timeId,
                    });
                    break;
                }
            }
        } catch (error) {
            if (window.Log) Log.error('PARTICIPANTE-NAV', `Erro ao importar JS:`, error);
        }
    }
}

// Instância global
const participanteNavV4 = new ParticipanteNavigationV4();

// Expor globalmente
window.participanteNavigation = participanteNavV4;
window.participanteNav = participanteNavV4;

// Inicializar
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => participanteNavV4.inicializar());
} else {
    participanteNavV4.inicializar();
}

if (window.Log) Log.info('PARTICIPANTE-NAV', '✅ Sistema v4.0 (Bottom Sheet) pronto');
