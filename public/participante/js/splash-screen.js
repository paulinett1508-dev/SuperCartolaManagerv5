// =====================================================================
// splash-screen.js - Gerenciador da Splash Screen v4.2
// =====================================================================
// v4.2: Classe 'app-ready' no body para revelar app após splash
// v4.1: Usa chave específica 'participante_app_loaded' para distinguir
//       primeira visita (vindo do login) de reload/pull-refresh
// v4.0: Lógica de reload movida para index.html (script inline imediato)
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
        this.element = document.getElementById('splashScreen');

        if (!this.element) {
            if (window.Log) Log.warn('SPLASH', 'Elemento #splashScreen não encontrado');
            return;
        }

        // Configurar listener de visibilidade (inatividade)
        this.setupVisibilityListener();

        // ✅ Verificar se é primeira visita usando chave específica do participante
        const isReload = sessionStorage.getItem(this.STORAGE_KEY);

        if (!isReload) {
            // Primeira vez na sessão (vindo do login): mostrar splash completa
            this.show('inicial');
            if (window.Log) Log.info('SPLASH', '✅ Exibindo splash (primeira entrada no app)');

            // ✅ Marcar que o app foi carregado (para próximos reloads)
            sessionStorage.setItem(this.STORAGE_KEY, 'true');
        } else {
            // Reload/Pull-refresh: NÃO TOCAR na splash - o script inline do index.html já escondeu
            // Apenas garantir que o estado interno está correto
            this.isVisible = false;

            // ✅ v4.2: Em reload, mostrar app imediatamente
            document.body.classList.add('app-ready');

            if (window.Log) Log.info('SPLASH', '✅ Reload detectado - app-ready ativado imediatamente');
        }

        if (window.Log) Log.info('SPLASH', '✅ Sistema v4.1 inicializado');
    },

    // ✅ Mostrar splash screen
    show(motivo = 'inicializacao') {
        if (!this.element) return;

        // PROTEÇÃO: Em reloads, NUNCA mostrar splash (apenas vidro fosco)
        const isReload = sessionStorage.getItem(this.STORAGE_KEY);
        if (isReload && motivo !== 'inatividade-forcada') {
            if (window.Log) Log.info('SPLASH', `Bloqueado: tentativa de mostrar splash em reload (${motivo})`);
            return;
        }

        this.isVisible = true;
        this.showTimestamp = Date.now();
        this.element.style.display = '';

        // Remover classe hidden e adicionar animate
        this.element.classList.remove('hidden');

        // Pequeno delay para garantir transição CSS
        requestAnimationFrame(() => {
            this.element.classList.add('animate');
        });

        if (window.Log) Log.info('SPLASH', `Exibindo splash (${motivo})`);
    },

    // ✅ Esconder splash screen E o overlay de reload
    hide() {
        // Sempre esconder o overlay de reload (se existir)
        this.esconderReloadOverlay();

        // Esconder Splash Screen tradicional
        if (!this.element || !this.isVisible) return;

        // Garantir tempo mínimo de exibição
        const tempoExibido = Date.now() - (this.showTimestamp || 0);
        const tempoRestante = Math.max(0, this.MIN_DISPLAY_TIME - tempoExibido);

        setTimeout(() => {
            this.element.classList.add('hidden');
            this.element.classList.remove('animate');
            this.isVisible = false;

            // ✅ v4.2: Adicionar classe app-ready para mostrar o app
            document.body.classList.add('app-ready');

            if (window.Log) Log.info('SPLASH', 'Splash ocultada - app-ready ativado');
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

        // Se ficou mais de 5 minutos fora
        if (tempoAusente >= this.INACTIVITY_THRESHOLD) {
            if (window.Log) Log.info('SPLASH', 'Inatividade detectada (>5min) - recarregando');

            // Mostrar overlay de reload
            this.mostrarReloadOverlay();

            try {
                // Recarregar módulo atual
                if (window.participanteNavigation || window.participanteNav) {
                    const nav = window.participanteNavigation || window.participanteNav;
                    const moduloAtual = nav.moduloAtual || 'boas-vindas';
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

if (window.Log) Log.info('SPLASH', '✅ Módulo v4.1 carregado');
