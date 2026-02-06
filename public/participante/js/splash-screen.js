// =====================================================================
// splash-screen.js - Gerenciador da Splash Screen v5.0
// =====================================================================
// v5.0: Manipulação direta de estilos inline para compatibilidade cross-platform
//       Revela app manipulando style.display diretamente
// v4.2: Classe 'app-ready' no body para revelar app após splash
// v4.1: Usa chave específica 'participante_app_loaded' para distinguir
//       primeira visita (vindo do login) de reload/pull-refresh
// =====================================================================

const SplashScreen = {
    // Configurações
    INACTIVITY_THRESHOLD: 5 * 60 * 1000, // 5 minutos
    MIN_DISPLAY_TIME: 1500, // Tempo mínimo de exibição (1.5s)
    STORAGE_KEY: 'participante_app_loaded', // ✅ Chave específica do app participante

    // Estado
    element: null,
    hiddenTimestamp: null,
    showTimestamp: null,
    isVisible: false,

    // ✅ Inicializar splash screen
    init() {
        console.log('[SPLASH v5.0] Inicializando...');

        this.element = document.getElementById('splashScreen');

        if (!this.element) {
            console.warn('[SPLASH] Elemento #splashScreen não encontrado');
            // Revelar app mesmo sem splash
            this.revelarApp();
            return;
        }

        // Configurar listener de visibilidade (inatividade)
        this.setupVisibilityListener();

        // ✅ Verificar se é primeira visita usando chave específica do participante
        const isReload = sessionStorage.getItem(this.STORAGE_KEY);

        console.log('[SPLASH] sessionStorage check:', { isReload: !!isReload, key: this.STORAGE_KEY });

        if (!isReload) {
            // Primeira vez na sessão (vindo do login): mostrar splash completa
            this.show('inicial');
            console.log('[SPLASH] ✅ Primeira visita - exibindo splash');

            // ✅ Marcar que o app foi carregado (para próximos reloads)
            sessionStorage.setItem(this.STORAGE_KEY, 'true');
        } else {
            // Reload/Pull-refresh: NÃO TOCAR na splash - o script inline do index.html já escondeu
            // Apenas garantir que o estado interno está correto
            this.isVisible = false;

            // ✅ v5.0: Em reload, revelar app imediatamente
            this.revelarApp();

            console.log('[SPLASH] ✅ Reload detectado - app revelado imediatamente');
        }

        console.log('[SPLASH] ✅ Sistema v5.0 inicializado');
    },

    // ✅ v5.0: Revelar app manipulando estilos inline diretamente
    revelarApp() {
        // ✅ FIX: NÃO revelar app se modo manutenção está ativo
        if (window.ManutencaoScreen && window.ManutencaoScreen.estaAtivo()) {
            console.log('[SPLASH] Manutenção ativa - não revelar app');
            return;
        }

        console.log('[SPLASH] Revelando app...');

        // Adicionar classe app-ready (para CSS que depende dela)
        document.body.classList.add('app-ready');

        // ✅ v5.0: Manipular estilos inline diretamente (cross-platform)
        const container = document.querySelector('.participante-container');
        const bottomNav = document.querySelector('.bottom-nav-modern');

        if (container) {
            container.style.cssText = 'display:flex !important;flex-direction:column;';
            console.log('[SPLASH] Container revelado');
        }

        if (bottomNav) {
            bottomNav.style.cssText = 'display:flex !important;';
            console.log('[SPLASH] Bottom nav revelado');
        }
    },

    // ✅ Mostrar splash screen
    show(motivo = 'inicializacao') {
        if (!this.element) return;

        // PROTEÇÃO: Em reloads, NUNCA mostrar splash (apenas vidro fosco)
        const isReload = sessionStorage.getItem(this.STORAGE_KEY);
        if (isReload && motivo !== 'inatividade-forcada') {
            console.log('[SPLASH] Bloqueado: tentativa de mostrar splash em reload');
            return;
        }

        this.isVisible = true;
        this.showTimestamp = Date.now();

        // ✅ v5.0: Manipular display diretamente
        this.element.style.display = 'flex';
        this.element.style.opacity = '1';
        this.element.style.visibility = 'visible';
        this.element.style.pointerEvents = 'all';

        // Remover classe hidden e adicionar animate
        this.element.classList.remove('hidden');

        // Pequeno delay para garantir transição CSS
        requestAnimationFrame(() => {
            this.element.classList.add('animate');
        });

        console.log('[SPLASH] Exibindo splash:', motivo);
    },

    // ✅ Esconder splash screen E o overlay de reload
    hide() {
        console.log('[SPLASH] hide() chamado');

        // Sempre esconder o overlay de reload (se existir)
        this.esconderReloadOverlay();

        // Esconder Splash Screen tradicional
        if (!this.element || !this.isVisible) {
            // Mesmo sem splash visível, garantir que app seja revelado
            this.revelarApp();
            return;
        }

        // Garantir tempo mínimo de exibição
        const tempoExibido = Date.now() - (this.showTimestamp || 0);
        const tempoRestante = Math.max(0, this.MIN_DISPLAY_TIME - tempoExibido);

        setTimeout(() => {
            // ✅ v5.0: Manipular display diretamente
            this.element.style.display = 'none';
            this.element.style.opacity = '0';
            this.element.style.visibility = 'hidden';
            this.element.style.pointerEvents = 'none';

            this.element.classList.add('hidden');
            this.element.classList.remove('animate');
            this.isVisible = false;

            // ✅ v5.0: Revelar app
            this.revelarApp();

            console.log('[SPLASH] Splash ocultada - app revelado');
        }, tempoRestante);
    },

    // ✅ Esconder o overlay de reload (usado pelo index.html)
    esconderReloadOverlay() {
        const overlay = document.getElementById('reload-glass-overlay');
        if (overlay && overlay.classList.contains('is-active')) {
            overlay.classList.remove('is-active');
            if (window.Log) Log.info('SPLASH', 'Reload overlay ocultado');
        }
    },

    // ✅ Mostrar o overlay de reload (para inatividade)
    mostrarReloadOverlay() {
        const overlay = document.getElementById('reload-glass-overlay');
        if (overlay) {
            overlay.classList.add('is-active');
        }
    },

    // ✅ Configurar listener de visibilidade (aba/app)
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Usuário saiu da aba/app
                this.hiddenTimestamp = Date.now();
                if (window.Log) Log.debug('SPLASH', 'Usuário saiu da aba');
            } else {
                // Usuário voltou
                this.handleReturn();
            }
        });
    },

    // ✅ Tratar retorno do usuário
    async handleReturn() {
        if (!this.hiddenTimestamp) return;

        const tempoAusente = Date.now() - this.hiddenTimestamp;
        this.hiddenTimestamp = null;

        if (window.Log) Log.debug('SPLASH', `Usuário retornou após ${Math.round(tempoAusente / 1000)}s`);

        // ✅ FIX: Não recarregar módulos se manutenção está ativa
        if (window.ManutencaoScreen && window.ManutencaoScreen.estaAtivo()) {
            if (window.Log) Log.info('SPLASH', 'Manutenção ativa - skip handleReturn');
            return;
        }

        // Se ficou mais de 5 minutos fora
        if (tempoAusente >= this.INACTIVITY_THRESHOLD) {
            if (window.Log) Log.info('SPLASH', 'Inatividade detectada (>5min) - recarregando');

            // Mostrar overlay de reload
            this.mostrarReloadOverlay();

            try {
                // Recarregar módulo atual
                if (window.participanteNavigation || window.participanteNav) {
                    const nav = window.participanteNavigation || window.participanteNav;
                    // ✅ v5.1: Módulo padrão agora é "home" (temporada em andamento)
                    const moduloAtual = nav.moduloAtual || 'home';
                    await nav.navegarPara(moduloAtual, true);
                } else {
                    if (window.Log) Log.warn('SPLASH', 'Navigation não disponível');
                }
            } catch (error) {
                if (window.Log) Log.error('SPLASH', 'Erro ao recarregar:', error);
            }

            // Esconder overlay de reload
            this.esconderReloadOverlay();

            // Timeout de segurança
            setTimeout(() => {
                this.esconderReloadOverlay();
            }, 10000);
        }
    },

    // ✅ Verificar se está visível
    estaVisivel() {
        return this.isVisible;
    }
};

// Expor globalmente
window.SplashScreen = SplashScreen;

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SplashScreen.init());
} else {
    SplashScreen.init();
}

console.log('[SPLASH] ✅ Módulo v5.0 carregado');
