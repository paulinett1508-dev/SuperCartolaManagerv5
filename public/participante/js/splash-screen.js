// =====================================================================
// splash-screen.js - Gerenciador da Splash Screen v3.0
// Destino: /participante/js/splash-screen.js
// =====================================================================
// DIFERENÇA IMPORTANTE:
// - Splash Screen: Tela de abertura COMPLETA (logo, animações) - APENAS no load inicial
// - Glass Overlay: Efeito vidro fosco com bolinha - Para reload/pull-to-refresh
//
// v3.0: Overlay "Vidro Fosco" injetado IMEDIATAMENTE no reload
//       Não depende de outros scripts para exibir o loading
// =====================================================================

const SplashScreen = {
    // Configurações
    INACTIVITY_THRESHOLD: 5 * 60 * 1000, // 5 minutos
    MIN_DISPLAY_TIME: 1500, // Tempo mínimo de exibição (1.5s)
    SESSION_KEY: 'app_initialized', // Chave do sessionStorage

    // Estado
    element: null,
    glassOverlay: null,
    hiddenTimestamp: null,
    showTimestamp: null,
    isVisible: false,
    isInitialLoad: true, // Flag para distinguir load inicial de navegação

    // ✅ Inicializar splash screen
    init() {
        this.element = document.getElementById('splashScreen');

        if (!this.element) {
            if (window.Log) Log.warn('SPLASH', 'Elemento #splashScreen não encontrado');
            return;
        }

        // Verificar se é load inicial via sessionStorage
        const jaInicializado = sessionStorage.getItem(this.SESSION_KEY);
        this.isInitialLoad = !jaInicializado;

        // Configurar listener de visibilidade (inatividade)
        this.setupVisibilityListener();

        if (this.isInitialLoad) {
            // Primeira vez na sessão: mostrar splash completa
            this.show('inicial');
            if (window.Log) Log.info('SPLASH', '✅ Exibindo splash (primeira vez na sessão)');
        } else {
            // ✅ RELOAD: Ocultar splash IMEDIATAMENTE e mostrar Glass Overlay
            this.element.style.display = 'none';
            this.element.classList.add('hidden');
            this.isVisible = false;

            // Injetar e mostrar o Glass Overlay imediatamente
            this.criarGlassOverlay();
            this.mostrarGlassOverlay();
            if (window.Log) Log.info('SPLASH', '✅ Reload detectado - exibindo Glass Overlay');
        }

        if (window.Log) Log.info('SPLASH', '✅ Sistema v3.0 inicializado');
    },

    // ✅ Criar Glass Overlay (Vidro Fosco com Bolinha)
    criarGlassOverlay() {
        // Evitar duplicatas
        if (document.getElementById('glassOverlay')) {
            this.glassOverlay = document.getElementById('glassOverlay');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'glassOverlay';
        overlay.innerHTML = `
            <div class="glass-ball-container">
                <div class="glass-ball">
                    <span class="material-icons">sports_soccer</span>
                </div>
                <div class="glass-ball-shadow"></div>
            </div>
        `;

        // Injetar estilos inline para garantir funcionamento imediato
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            opacity: 0;
            transition: opacity 0.2s ease;
        `;

        document.body.insertBefore(overlay, document.body.firstChild);
        this.glassOverlay = overlay;

        // Injetar CSS da animação se não existir
        if (!document.getElementById('glassOverlayStyles')) {
            const style = document.createElement('style');
            style.id = 'glassOverlayStyles';
            style.textContent = `
                #glassOverlay .glass-ball-container {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                #glassOverlay .glass-ball {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: glassBounce 0.6s infinite;
                }
                #glassOverlay .glass-ball .material-icons {
                    font-size: 48px;
                    color: white;
                    animation: glassSpin 1.2s linear infinite;
                }
                #glassOverlay .glass-ball-shadow {
                    width: 36px;
                    height: 10px;
                    background: rgba(255, 69, 0, 0.5);
                    border-radius: 50%;
                    filter: blur(4px);
                    margin-top: 4px;
                    animation: glassShadow 0.6s infinite;
                }
                @keyframes glassBounce {
                    0%, 100% {
                        transform: translateY(0);
                        animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
                    }
                    50% {
                        transform: translateY(-24px);
                        animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
                    }
                }
                @keyframes glassSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes glassShadow {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(0.5); opacity: 0.2; }
                }
            `;
            document.head.appendChild(style);
        }
    },

    // ✅ Mostrar Glass Overlay
    mostrarGlassOverlay() {
        if (!this.glassOverlay) this.criarGlassOverlay();

        // Forçar reflow para garantir transição
        this.glassOverlay.offsetHeight;
        this.glassOverlay.style.opacity = '1';
    },

    // ✅ Esconder Glass Overlay
    esconderGlassOverlay() {
        if (this.glassOverlay) {
            this.glassOverlay.style.opacity = '0';
            setTimeout(() => {
                if (this.glassOverlay) {
                    this.glassOverlay.remove();
                    this.glassOverlay = null;
                }
            }, 200);
        }
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

    // ✅ Esconder splash screen (e Glass Overlay se existir)
    hide() {
        // Esconder Glass Overlay se existir (caso de reload)
        if (this.glassOverlay) {
            this.esconderGlassOverlay();
            if (window.Log) Log.info('SPLASH', 'Glass Overlay ocultado');
            return;
        }

        // Esconder Splash Screen tradicional
        if (!this.element || !this.isVisible) return;

        // Garantir tempo mínimo de exibição
        const tempoExibido = Date.now() - (this.showTimestamp || 0);
        const tempoRestante = Math.max(0, this.MIN_DISPLAY_TIME - tempoExibido);

        setTimeout(() => {
            this.element.classList.add('hidden');
            this.element.classList.remove('animate');
            this.isVisible = false;

            // Marcar que o load inicial já foi feito (memória)
            this.isInitialLoad = false;

            // ✅ PERSISTIR no sessionStorage para próximos reloads
            sessionStorage.setItem(this.SESSION_KEY, 'true');

            if (window.Log) Log.info('SPLASH', 'Splash ocultada e sessão marcada como inicializada');
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

            // ✅ v3.0: Usar Glass Overlay (vidro fosco) em vez de Splash completa
            this.criarGlassOverlay();
            this.mostrarGlassOverlay();

            try {
                // Verificar versão (integrado com app-version.js)
                if (window.AppVersion) {
                    await window.AppVersion.verificarVersao();
                }

                // Recarregar módulo atual
                if (window.participanteNavigation || window.participanteNav) {
                    const nav = window.participanteNavigation || window.participanteNav;
                    const moduloAtual = nav.moduloAtual || 'boas-vindas';
                    await nav.navegarPara(moduloAtual, true);
                } else {
                    // Fallback: se navigation não disponível
                    if (window.Log) Log.warn('SPLASH', 'Navigation não disponível');
                }
            } catch (error) {
                if (window.Log) Log.error('SPLASH', 'Erro ao recarregar:', error);
            }

            // ✅ Esconder Glass Overlay
            this.esconderGlassOverlay();

            // ✅ Timeout de segurança - esconde glass overlay após 10s se ainda visível
            setTimeout(() => {
                if (this.glassOverlay) {
                    if (window.Log) Log.warn('SPLASH', 'Timeout de segurança - forçando esconder glass overlay');
                    this.esconderGlassOverlay();
                }
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

if (window.Log) Log.info('SPLASH', '✅ Módulo carregado');
