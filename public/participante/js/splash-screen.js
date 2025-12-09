// =====================================================================
// splash-screen.js - Gerenciador da Splash Screen
// Destino: /participante/js/splash-screen.js
// =====================================================================

const SplashScreen = {
    // Configurações
    INACTIVITY_THRESHOLD: 5 * 60 * 1000, // 5 minutos
    MIN_DISPLAY_TIME: 1500, // Tempo mínimo de exibição (1.5s)
    
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
        
        if (window.Log) Log.info('SPLASH', '✅ Sistema inicializado');
    },

    // ✅ Mostrar splash screen
    show(motivo = 'inicializacao') {
        if (!this.element) return;
        
        this.isVisible = true;
        this.showTimestamp = Date.now();
        
        // Remover classe hidden e adicionar animate
        this.element.classList.remove('hidden');
        
        // Pequeno delay para garantir transição CSS
        requestAnimationFrame(() => {
            this.element.classList.add('animate');
        });
        
        if (window.Log) Log.info('SPLASH', `Exibindo splash (${motivo})`);
    },

    // ✅ Esconder splash screen
    hide() {
        if (!this.element || !this.isVisible) return;

        // Garantir tempo mínimo de exibição
        const tempoExibido = Date.now() - (this.showTimestamp || 0);
        const tempoRestante = Math.max(0, this.MIN_DISPLAY_TIME - tempoExibido);

        setTimeout(() => {
            this.element.classList.add('hidden');
            this.element.classList.remove('animate');
            this.isVisible = false;
            
            if (window.Log) Log.info('SPLASH', 'Splash ocultada');
        }, tempoRestante);
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
            
            // Mostrar splash
            this.show('inatividade');

            // Verificar versão (integrado com app-version.js)
            if (window.AppVersion) {
                await window.AppVersion.verificarVersao();
            }

            // Recarregar módulo atual
            if (window.participanteNavigation) {
                const moduloAtual = window.participanteNavigation.moduloAtual || 'boas-vindas';
                await window.participanteNavigation.navegarPara(moduloAtual, true);
            }

            // Splash será ocultada pelo navigation após carregar módulo
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

if (window.Log) Log.info('SPLASH', '✅ Módulo carregado');
