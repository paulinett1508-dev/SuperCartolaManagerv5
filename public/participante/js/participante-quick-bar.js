// =====================================================================
// QUICK ACCESS BAR v2.2 - Splash-Aware
// =====================================================================
// 4 botões: Início, Ranking, Menu (sheet), Financeiro
// GPU-accelerated, 60fps guaranteed, DOM caching
// v2.2: Aguarda splash fechar antes de renderizar (evita conflito)
// =====================================================================

if (window.Log) Log.info('QUICK-BAR', '🚀 Carregando Quick Access Bar v2.2...');

class QuickAccessBar {
    constructor() {
        this.menuAberto = false;
        this.modulosAtivos = {};
        this.moduloAtual = 'boas-vindas';

        // DOM Cache - populated on render
        this._dom = {
            bottomNav: null,
            menuOverlay: null,
            menuSheet: null,
            menuButton: null,
            navItems: null
        };

        // Touch state
        this._touchStartY = 0;
        this._isAnimating = false;
    }

    async inicializar() {
        if (window.Log) Log.info('QUICK-BAR', 'Inicializando...');

        // ✅ v2.2: Aguardar splash fechar na primeira visita
        await this.aguardarSplashFechar();

        await this.aguardarNavegacao();
        await this.carregarModulosAtivos();

        this.renderizar();
        this.cacheDOM();
        this.configurarEventos();

        if (window.Log) Log.info('QUICK-BAR', '✅ Quick Access Bar v2.2 pronta');
    }

    /**
     * ✅ v2.2: Aguarda splash fechar antes de renderizar a barra
     * Evita conflito visual onde a barra aparece por cima da splash
     */
    async aguardarSplashFechar() {
        const STORAGE_KEY = 'participante_app_loaded';
        const isReload = sessionStorage.getItem(STORAGE_KEY);

        // Em reload, splash não aparece - continuar imediatamente
        if (isReload) {
            if (window.Log) Log.debug('QUICK-BAR', 'Reload detectado - inicializando imediatamente');
            return;
        }

        // Primeira visita: aguardar splash fechar
        if (window.Log) Log.info('QUICK-BAR', 'Primeira visita - aguardando splash fechar...');

        return new Promise((resolve) => {
            // Verificar se SplashScreen existe e está visível
            const checkSplash = () => {
                // Se SplashScreen não existe ou não está visível, continuar
                if (!window.SplashScreen || !window.SplashScreen.isVisible) {
                    if (window.Log) Log.debug('QUICK-BAR', 'Splash fechou - continuando inicialização');
                    resolve();
                    return true;
                }
                return false;
            };

            // Verificar imediatamente
            if (checkSplash()) return;

            // Polling a cada 100ms até splash fechar (max 8s)
            const interval = setInterval(() => {
                if (checkSplash()) {
                    clearInterval(interval);
                }
            }, 100);

            // Timeout de segurança (8s)
            setTimeout(() => {
                clearInterval(interval);
                if (window.Log) Log.warn('QUICK-BAR', 'Timeout aguardando splash - forçando inicialização');
                resolve();
            }, 8000);
        });
    }

    async aguardarNavegacao() {
        if (window.participanteNav) return;

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (window.participanteNav) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);

            setTimeout(() => {
                clearInterval(interval);
                resolve();
            }, 3000);
        });
    }

    async carregarModulosAtivos() {
        if (window.participanteNav?.modulosAtivos) {
            this.modulosAtivos = window.participanteNav.modulosAtivos;
        }
    }

    renderizar() {
        // Skip if already rendered
        if (document.querySelector('.bottom-nav')) {
            if (window.Log) Log.warn('QUICK-BAR', 'Já existe');
            return;
        }

        // Create fragment for batch DOM insertion
        const fragment = document.createDocumentFragment();

        // Menu Overlay
        const menuOverlay = document.createElement('div');
        menuOverlay.className = 'menu-overlay';
        menuOverlay.id = 'menuOverlay';
        fragment.appendChild(menuOverlay);

        // Menu Sheet (lazy content - rendered on first open)
        const menuSheet = document.createElement('div');
        menuSheet.className = 'menu-sheet';
        menuSheet.id = 'menuSheet';
        menuSheet.innerHTML = '<div class="menu-handle"></div>';
        fragment.appendChild(menuSheet);

        // Bottom Navigation
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'bottom-nav';
        bottomNav.innerHTML = `
            <div class="nav-container">
                <button class="nav-item active" data-page="boas-vindas" type="button">
                    <span class="material-icons nav-icon">home</span>
                    <span class="nav-label">Início</span>
                </button>
                <button class="nav-item" data-page="ranking" type="button">
                    <span class="material-icons nav-icon">trending_up</span>
                    <span class="nav-label">Ranking</span>
                </button>
                <button class="nav-item" data-page="menu" id="menuButton" type="button">
                    <span class="material-icons nav-icon">apps</span>
                    <span class="nav-label">Menu</span>
                </button>
                <button class="nav-item" data-page="extrato" type="button">
                    <span class="material-icons nav-icon">account_balance_wallet</span>
                    <span class="nav-label">Financeiro</span>
                </button>
            </div>
        `;
        fragment.appendChild(bottomNav);

        // Single DOM insertion
        document.body.appendChild(fragment);

        if (window.Log) Log.debug('QUICK-BAR', '✅ Renderizado');
    }

    cacheDOM() {
        this._dom.bottomNav = document.querySelector('.bottom-nav');
        this._dom.menuOverlay = document.getElementById('menuOverlay');
        this._dom.menuSheet = document.getElementById('menuSheet');
        this._dom.menuButton = document.getElementById('menuButton');
        this._dom.navItems = document.querySelectorAll('.nav-item');
    }

    renderizarMenuContent() {
        return `
            <div class="menu-handle"></div>

            <div class="menu-category">
                <div class="menu-category-title">
                    <span class="material-icons">emoji_events</span>
                    Competições
                </div>
                <div class="menu-grid">
                    <div class="menu-card" data-module="rodadas">
                        <span class="material-icons">view_week</span>
                        <span class="menu-card-label">Rodadas</span>
                    </div>
                    <div class="menu-card" data-module="pontos-corridos">
                        <span class="material-icons">format_list_numbered</span>
                        <span class="menu-card-label">Pontos Corridos</span>
                    </div>
                    <div class="menu-card" data-module="mata-mata">
                        <span class="material-icons">military_tech</span>
                        <span class="menu-card-label">Mata-Mata</span>
                    </div>
                    <div class="menu-card" data-module="top10">
                        <span class="material-icons">leaderboard</span>
                        <span class="menu-card-label">TOP 10</span>
                    </div>
                    <div class="menu-card" data-module="campinho">
                        <span class="material-icons">sports_soccer</span>
                        <span class="menu-card-label">Meu Campinho</span>
                    </div>
                </div>
            </div>

            <div class="menu-category">
                <div class="menu-category-title">
                    <span class="material-icons">workspace_premium</span>
                    Prêmios & Estatísticas
                </div>
                <div class="menu-grid">
                    <div class="menu-card" data-module="artilheiro">
                        <span class="material-icons">sports_soccer</span>
                        <span class="menu-card-label">Artilheiro</span>
                    </div>
                    <div class="menu-card" data-module="luva-ouro">
                        <span class="material-icons">sports_handball</span>
                        <span class="menu-card-label">Luva de Ouro</span>
                    </div>
                    <div class="menu-card" data-module="melhor-mes">
                        <span class="material-icons">calendar_month</span>
                        <span class="menu-card-label">Melhor do Mês</span>
                    </div>
                    <div class="menu-card" data-module="historico">
                        <span class="material-icons">history</span>
                        <span class="menu-card-label">Hall da Fama</span>
                    </div>
                </div>
            </div>

            <div class="menu-category">
                <div class="menu-category-title">
                    <span class="material-icons">tips_and_updates</span>
                    Ferramentas
                </div>
                <div class="menu-grid">
                    <div class="menu-card" data-module="dicas">
                        <span class="material-icons">psychology</span>
                        <span class="menu-card-label">Dicas</span>
                    </div>
                </div>
            </div>

            <div class="menu-category">
                <div class="menu-category-title">
                    <span class="material-icons">upcoming</span>
                    Em Breve (2026)
                </div>
                <div class="menu-grid">
                    <div class="menu-card disabled" data-action="em-breve">
                        <span class="material-icons">sports</span>
                        <span class="menu-card-label">Bolão Copa</span>
                    </div>
                    <div class="menu-card disabled" data-action="em-breve">
                        <span class="material-icons">stadium</span>
                        <span class="menu-card-label">Bolão Libertadores</span>
                    </div>
                    <div class="menu-card disabled" data-action="em-breve">
                        <span class="material-icons">sensors</span>
                        <span class="menu-card-label">Ao Vivo</span>
                    </div>
                </div>
            </div>
        `;
    }

    configurarEventos() {
        const { menuOverlay, menuSheet, bottomNav } = this._dom;

        // Event Delegation for nav items (single listener)
        if (bottomNav) {
            bottomNav.addEventListener('click', (e) => {
                const navItem = e.target.closest('.nav-item');
                if (!navItem) return;

                const page = navItem.dataset.page;
                if (page === 'menu') {
                    this.toggleMenu();
                } else {
                    this.navegarPara(page);
                    this.atualizarNavAtivo(page);
                }
            }, { passive: true });
        }

        // Overlay click
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => this.fecharMenu(), { passive: true });
        }

        // Menu sheet - Event Delegation + Swipe
        if (menuSheet) {
            // Click delegation for menu cards
            menuSheet.addEventListener('click', (e) => {
                const card = e.target.closest('.menu-card');
                const handle = e.target.closest('.menu-handle');

                if (handle) {
                    this.fecharMenu();
                    return;
                }

                if (!card) return;

                const module = card.dataset.module;
                const action = card.dataset.action;

                if (action === 'em-breve') {
                    this.mostrarToast('Em breve na temporada 2026!');
                    return;
                }

                if (module) {
                    this.fecharMenu();
                    this.navegarPara(module);
                    // Clear nav active states
                    this._dom.navItems.forEach(nav => nav.classList.remove('active'));
                }
            }, { passive: true });

            // Swipe down to close
            menuSheet.addEventListener('touchstart', (e) => {
                this._touchStartY = e.touches[0].clientY;
            }, { passive: true });

            menuSheet.addEventListener('touchend', (e) => {
                const deltaY = e.changedTouches[0].clientY - this._touchStartY;
                if (deltaY > 60) {
                    this.fecharMenu();
                }
            }, { passive: true });
        }

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menuAberto) {
                this.fecharMenu();
            }
        });

        if (window.Log) Log.debug('QUICK-BAR', '✅ Eventos configurados');
    }

    toggleMenu() {
        if (this._isAnimating) return;
        this.menuAberto ? this.fecharMenu() : this.abrirMenu();
    }

    abrirMenu() {
        if (this._isAnimating) return;
        this._isAnimating = true;

        const { menuOverlay, menuSheet } = this._dom;

        // Lazy load menu content on first open
        if (menuSheet && !menuSheet.querySelector('.menu-category')) {
            menuSheet.innerHTML = this.renderizarMenuContent();
        }

        // Use RAF for smooth animation start
        requestAnimationFrame(() => {
            if (menuOverlay) menuOverlay.classList.add('visible');
            if (menuSheet) menuSheet.classList.add('visible');
            this.menuAberto = true;

            setTimeout(() => {
                this._isAnimating = false;
            }, 350);
        });
    }

    fecharMenu() {
        if (this._isAnimating) return;
        this._isAnimating = true;

        const { menuOverlay, menuSheet } = this._dom;

        requestAnimationFrame(() => {
            if (menuOverlay) menuOverlay.classList.remove('visible');
            if (menuSheet) menuSheet.classList.remove('visible');
            this.menuAberto = false;

            setTimeout(() => {
                this._isAnimating = false;
            }, 350);
        });
    }

    navegarPara(modulo) {
        if (window.participanteNav) {
            window.participanteNav.navegarPara(modulo);
            this.moduloAtual = modulo;
        }
    }

    atualizarNavAtivo(page) {
        this._dom.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
    }

    mostrarToast(mensagem, tipo = 'info') {
        // Remove existing
        const existente = document.querySelector('.quick-toast');
        if (existente) existente.remove();

        const toast = document.createElement('div');
        toast.className = 'quick-toast';

        // Configuracao por tipo
        const configs = {
            info: { icone: 'info', cor: '#3b82f6', duracao: 2500 },
            success: { icone: 'check_circle', cor: '#22c55e', duracao: 2500 },
            warning: { icone: 'warning', cor: '#f59e0b', duracao: 3500 },
            urgente: { icone: 'alarm', cor: '#f97316', duracao: 4500 },
            critico: { icone: 'alarm_on', cor: '#ef4444', duracao: 5500 }
        };
        const config = configs[tipo] || configs.info;

        // Adicionar classe de tipo para estilos customizados
        toast.classList.add(`toast-${tipo}`);

        toast.innerHTML = `
            <span class="material-icons" style="color: ${config.cor}">${config.icone}</span>
            <span>${mensagem}</span>
        `;

        document.body.appendChild(toast);

        // RAF for animation
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });
        });

        // Auto hide com duracao variavel por tipo
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, config.duracao);
    }

    atualizarModulosAtivos(modulosAtivos) {
        this.modulosAtivos = modulosAtivos;
        if (window.Log) Log.debug('QUICK-BAR', 'Módulos atualizados');
    }
}

// Singleton instance
const quickAccessBar = new QuickAccessBar();

// Global exports
window.quickAccessBar = quickAccessBar;
window.QuickBar = quickAccessBar;

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => quickAccessBar.inicializar());
} else {
    quickAccessBar.inicializar();
}

if (window.Log) Log.info('QUICK-BAR', '✅ v2.2 carregado');
