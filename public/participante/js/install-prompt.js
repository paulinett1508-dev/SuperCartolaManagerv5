// =====================================================================
// install-prompt.js - PWA Install Prompt v1.1
// =====================================================================
// Sistema de prompt de instalacao PWA persistente
// - Captura evento beforeinstallprompt (Android/Chrome)
// - Detecta iOS e mostra instrucoes especificas
// - Controle de exibicao: 24h entre lembretes
// - Respeita se ja instalado ou se usuario marcou "nao mostrar"
// - Segue design system do projeto (Material Icons, CSS tokens)
//
// DEBUG via URL:
//   ?debug=install      -> Forca banner Android
//   ?debug=install-ios  -> Forca banner iOS
//   ?debug=install-reset -> Limpa dados e forca banner
// =====================================================================

const InstallPrompt = {
    STORAGE_KEY: 'install_prompt_data',
    FORCE_MODE: true, // ⚠️ Modo forte para destacar instalação do PWA
    FORCE_COOLDOWN_HOURS: 6,
    FORCE_SESSION_KEY: 'install_prompt_seen_session',
    FORCE_MIN_OPEN_MS: 1500,
    COOLDOWN_HOURS: 24,
    DELAY_MS: 2000, // Aguardar 2s apos carregamento para mostrar
    deferredPrompt: null,
    debugMode: null, // 'android', 'ios', ou null

    // =====================================================================
    // DETECCAO DE AMBIENTE
    // =====================================================================

    /**
     * Verifica se o app ja esta instalado como PWA
     */
    isInstalled() {
        // Modo standalone (Android/Desktop)
        if (window.matchMedia('(display-mode: standalone)').matches) return true;
        // iOS standalone
        if (window.navigator.standalone === true) return true;
        return false;
    },

    /**
     * Detecta se e dispositivo iOS (ou modo debug iOS)
     */
    isIOS() {
        // Modo debug forca iOS
        if (this.debugMode === 'ios') return true;
        if (this.debugMode === 'android') return false;
        return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    },

    /**
     * Detecta se e Android
     */
    isAndroid() {
        return /android/.test(window.navigator.userAgent.toLowerCase());
    },

    // =====================================================================
    // CONTROLE DE PERSISTENCIA
    // =====================================================================

    /**
     * Obter dados do localStorage
     */
    getData() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : { installed: false, lastShown: null, neverShow: false };
        } catch (e) {
            return { installed: false, lastShown: null, neverShow: false };
        }
    },

    /**
     * Salvar dados no localStorage
     */
    setData(updates) {
        try {
            const current = this.getData();
            const newData = { ...current, ...updates };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newData));
        } catch (e) {
            if (window.Log) Log.warn('INSTALL-PROMPT', 'Erro ao salvar dados:', e);
        }
    },

    /**
     * Verifica se deve mostrar o prompt
     */
    shouldShow() {
        // Nunca mostrar se ja instalado
        if (this.isInstalled()) return false;

        const data = this.getData();

        // Nunca mostrar se usuario optou por nao ver mais
        if (data.neverShow) return false;

        // Nunca mostrar se ja marcou como instalado
        if (data.installed) return false;

        // Modo forte: mostrar pelo menos 1x por sessao (com cooldown menor)
        if (this.FORCE_MODE) {
            try {
                if (sessionStorage.getItem(this.FORCE_SESSION_KEY)) {
                    return false;
                }
            } catch (e) {
                // Ignorar erro de sessionStorage
            }

            if (!data.lastShown) return true;
            const hoursSince = (Date.now() - data.lastShown) / (1000 * 60 * 60);
            return hoursSince >= this.FORCE_COOLDOWN_HOURS;
        }

        // Primeira vez sempre mostra
        if (!data.lastShown) return true;

        // Verificar cooldown de 24h
        const hoursSince = (Date.now() - data.lastShown) / (1000 * 60 * 60);
        return hoursSince >= this.COOLDOWN_HOURS;
    },

    // =====================================================================
    // UI DO BANNER
    // =====================================================================

    /**
     * Injetar estilos (evita duplicar)
     */
    ensureStyles() {
        if (document.getElementById('install-prompt-styles')) return;
        const style = document.createElement('style');
        style.id = 'install-prompt-styles';
        style.textContent = `
            @keyframes slideUpBanner {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes slideDownBanner {
                from { transform: translateY(0); opacity: 1; }
                to { transform: translateY(100%); opacity: 0; }
            }
            @keyframes installOverlayIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes installOverlayOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes installModalIn {
                from { transform: translateY(8px) scale(0.98); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
            }
            @keyframes installModalOut {
                from { transform: translateY(0) scale(1); opacity: 1; }
                to { transform: translateY(8px) scale(0.98); opacity: 0; }
            }
            body.install-prompt-lock {
                overflow: hidden;
            }
            .install-prompt-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.82);
                backdrop-filter: blur(6px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                animation: installOverlayIn 0.2s ease-out;
            }
            .install-prompt-overlay.is-closing {
                animation: installOverlayOut 0.2s ease-in forwards;
            }
            .install-prompt-modal {
                width: min(560px, 92vw);
                background: #121212;
                color: var(--app-text-primary);
                border: 1px solid #2a2a2a;
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
                animation: installModalIn 0.2s ease-out;
                font-family: var(--font-family-base, 'Inter', sans-serif);
            }
            .install-prompt-overlay.is-closing .install-prompt-modal {
                animation: installModalOut 0.2s ease-in forwards;
            }
            .install-modal-header {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .install-modal-icon {
                width: 48px;
                height: 48px;
                border-radius: 14px;
                background: rgba(255, 69, 0, 0.12);
                border: 1px solid rgba(255, 69, 0, 0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .install-modal-icon .material-icons {
                font-size: 26px;
                color: var(--laranja, #ff4500);
            }
            .install-modal-title {
                flex: 1;
                min-width: 0;
            }
            .install-modal-title strong {
                display: block;
                font-family: var(--font-family-brand, 'Russo One', sans-serif);
                font-size: 18px;
                letter-spacing: 0.3px;
            }
            .install-modal-title span {
                display: block;
                font-size: 12px;
                color: #a0a0a0;
                margin-top: 4px;
                line-height: 1.4;
            }
            .install-modal-close {
                background: #1f1f1f;
                border: 1px solid #2d2d2d;
                color: #cfcfcf;
                width: 34px;
                height: 34px;
                border-radius: 10px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background 0.2s, color 0.2s;
            }
            .install-modal-close:hover {
                background: #262626;
                color: var(--app-text-primary);
            }
            .install-modal-benefits {
                margin: 16px 0;
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }
            .install-modal-benefit {
                display: flex;
                gap: 8px;
                align-items: flex-start;
                background: var(--app-surface);
                border: 1px solid #2a2a2a;
                border-radius: 12px;
                padding: 10px 12px;
                font-size: 12px;
                color: #d4d4d4;
            }
            .install-modal-benefit .material-icons {
                font-size: 18px;
                color: var(--laranja, #ff4500);
            }
            .install-modal-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .install-btn-primary {
                background: linear-gradient(135deg, var(--laranja, #ff4500), #cc3700);
                color: var(--app-text-primary);
                border: none;
                padding: 12px 18px;
                border-radius: 10px;
                font-size: 13px;
                letter-spacing: 0.3px;
                font-family: var(--font-family-brand, 'Russo One', sans-serif);
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .install-btn-primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 8px 18px rgba(255, 69, 0, 0.3);
            }
            .install-btn-secondary {
                background: #1f1f1f;
                color: #e5e5e5;
                border: 1px solid #2d2d2d;
                padding: 12px 16px;
                border-radius: 10px;
                font-size: 12px;
                cursor: pointer;
                transition: background 0.2s, color 0.2s;
            }
            .install-btn-secondary:hover {
                background: #262626;
                color: var(--app-text-primary);
            }
            .install-modal-ios {
                margin-top: 12px;
                font-size: 12px;
                color: #b5b5b5;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .install-modal-ios .material-icons {
                font-size: 16px;
                color: var(--laranja, #ff4500);
            }
            .install-btn-primary:disabled,
            .install-btn-secondary:disabled,
            .install-modal-close:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            #install-btn-action:active {
                transform: scale(0.97);
            }
            #install-btn-close:hover {
                background: rgba(255, 255, 255, 0.25);
            }
            @media (max-width: 520px) {
                .install-modal-benefits {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Criar e mostrar o banner de instalacao
     */
    mostrarBanner() {
        // Evitar duplicatas
        if (document.getElementById('install-prompt-banner') || document.getElementById('install-prompt-overlay')) return;

        if (this.FORCE_MODE) {
            this.mostrarModal();
            return;
        }

        this.ensureStyles();

        const isIOS = this.isIOS();

        const banner = document.createElement('div');
        banner.id = 'install-prompt-banner';
        banner.innerHTML = `
            <div class="install-banner-content">
                <div class="install-banner-icon">
                    <span class="material-icons">install_mobile</span>
                </div>
                <div class="install-banner-text">
                    <strong>Instale o Super Cartola</strong>
                    <small>${isIOS
                        ? 'Toque em <b>Compartilhar</b> e depois <b>"Adicionar a Tela de Inicio"</b>'
                        : 'Acesso rapido direto da sua tela inicial'}</small>
                </div>
                <div class="install-banner-actions">
                    <button id="install-btn-action" class="install-btn-primary">
                        ${isIOS ? 'OK' : 'Instalar'}
                    </button>
                    <button id="install-btn-close" class="install-btn-close" title="Fechar">
                        <span class="material-icons">close</span>
                    </button>
                </div>
            </div>
        `;

        // Estilos inline (seguindo padrao app-version.js)
        banner.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, var(--app-primary), var(--app-primary-dark));
            color: white;
            padding: 16px;
            padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
            z-index: 99999;
            animation: slideUpBanner 0.3s ease-out;
        `;

        const content = banner.querySelector('.install-banner-content');
        content.style.cssText = `
            max-width: 600px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        const icon = banner.querySelector('.install-banner-icon');
        icon.style.cssText = `
            width: 44px;
            height: 44px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        `;

        const iconSpan = banner.querySelector('.install-banner-icon .material-icons');
        iconSpan.style.cssText = `
            font-size: 24px;
            color: white;
        `;

        const text = banner.querySelector('.install-banner-text');
        text.style.cssText = `
            flex: 1;
            min-width: 0;
        `;

        const strong = banner.querySelector('.install-banner-text strong');
        strong.style.cssText = `
            display: block;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 2px;
        `;

        const small = banner.querySelector('.install-banner-text small');
        small.style.cssText = `
            display: block;
            font-size: 12px;
            opacity: 0.9;
            line-height: 1.3;
        `;

        const actions = banner.querySelector('.install-banner-actions');
        actions.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        `;

        const btnPrimary = banner.querySelector('.install-btn-primary');
        btnPrimary.style.cssText = `
            background: var(--app-text-primary);
            color: var(--app-bg);
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            white-space: nowrap;
            transition: transform 0.2s, box-shadow 0.2s;
        `;

        const btnClose = banner.querySelector('.install-btn-close');
        btnClose.style.cssText = `
            background: rgba(255, 255, 255, 0.15);
            color: white;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s;
        `;

        const closeIcon = banner.querySelector('.install-btn-close .material-icons');
        closeIcon.style.cssText = `
            font-size: 20px;
        `;

        // Event listeners
        btnPrimary.addEventListener('click', () => this.onInstallClick());
        btnClose.addEventListener('click', () => this.onCloseClick());

        document.body.appendChild(banner);

        if (window.Log) Log.info('INSTALL-PROMPT', 'Banner exibido', { isIOS });
    },

    /**
     * Criar e mostrar modal de instalacao (modo forte)
     */
    mostrarModal() {
        if (document.getElementById('install-prompt-overlay') || document.getElementById('install-prompt-banner')) return;

        this.ensureStyles();

        const isIOS = this.isIOS();
        const canPrompt = !!this.deferredPrompt && !isIOS;

        const descricao = isIOS
            ? 'No iPhone, toque em Compartilhar e depois "Adicionar à Tela de Início".'
            : (canPrompt
                ? 'Acesso rápido direto da sua tela inicial, sem navegador.'
                : 'Abra o menu do navegador e toque em "Instalar app".');

        const primaryLabel = isIOS ? 'Entendi' : (canPrompt ? 'Instalar agora' : 'Como instalar');

        const overlay = document.createElement('div');
        overlay.id = 'install-prompt-overlay';
        overlay.className = 'install-prompt-overlay';
        overlay.innerHTML = `
            <div class="install-prompt-modal" role="dialog" aria-modal="true" aria-labelledby="install-title" aria-describedby="install-desc">
                <div class="install-modal-header">
                    <div class="install-modal-icon">
                        <span class="material-icons">app_shortcut</span>
                    </div>
                    <div class="install-modal-title">
                        <strong id="install-title">Instale o Super Cartola</strong>
                        <span id="install-desc">${descricao}</span>
                    </div>
                    <button id="install-btn-close" class="install-modal-close" aria-label="Fechar">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="install-modal-benefits">
                    <div class="install-modal-benefit">
                        <span class="material-icons">flash_on</span>
                        <div>Abre mais rápido e sem distrações.</div>
                    </div>
                    <div class="install-modal-benefit">
                        <span class="material-icons">offline_bolt</span>
                        <div>Funciona melhor mesmo com internet instável.</div>
                    </div>
                    <div class="install-modal-benefit">
                        <span class="material-icons">fullscreen</span>
                        <div>Experiência em tela cheia.</div>
                    </div>
                    <div class="install-modal-benefit">
                        <span class="material-icons">system_update</span>
                        <div>Atualizações automáticas.</div>
                    </div>
                </div>
                ${isIOS ? `
                <div class="install-modal-ios">
                    <span class="material-icons">share</span>
                    Toque em Compartilhar e depois "Adicionar à Tela de Início".
                </div>` : ''}
                <div class="install-modal-actions">
                    <button id="install-btn-action" class="install-btn-primary">${primaryLabel}</button>
                    ${!isIOS ? `<button id="install-btn-secondary" class="install-btn-secondary">Continuar no navegador</button>` : ''}
                </div>
            </div>
        `;

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                this.onCloseClick();
            }
        });

        document.body.appendChild(overlay);
        document.body.classList.add('install-prompt-lock');

        try {
            sessionStorage.setItem(this.FORCE_SESSION_KEY, '1');
        } catch (e) {
            // Ignorar erro de sessionStorage
        }

        const btnPrimary = overlay.querySelector('#install-btn-action');
        const btnClose = overlay.querySelector('#install-btn-close');
        const btnSecondary = overlay.querySelector('#install-btn-secondary');

        btnPrimary?.addEventListener('click', () => this.onInstallClick());
        btnClose?.addEventListener('click', () => this.onCloseClick());
        btnSecondary?.addEventListener('click', () => this.onCloseClick());

        if (this.FORCE_MODE) {
            const lockButtons = [btnClose, btnSecondary].filter(Boolean);
            lockButtons.forEach((btn) => {
                btn.disabled = true;
            });
            setTimeout(() => {
                lockButtons.forEach((btn) => {
                    btn.disabled = false;
                });
            }, this.FORCE_MIN_OPEN_MS);
        }

        if (window.Log) Log.info('INSTALL-PROMPT', 'Modal exibido', { isIOS, canPrompt });
    },

    /**
     * Esconder o banner com animacao
     */
    esconderBanner() {
        const banner = document.getElementById('install-prompt-banner');
        if (banner) {
            banner.style.animation = 'slideDownBanner 0.3s ease-out forwards';
            setTimeout(() => banner.remove(), 300);
        }

        const overlay = document.getElementById('install-prompt-overlay');
        if (overlay) {
            overlay.classList.add('is-closing');
            setTimeout(() => {
                overlay.remove();
                document.body.classList.remove('install-prompt-lock');
            }, 220);
        }
    },

    // =====================================================================
    // HANDLERS DE EVENTOS
    // =====================================================================

    /**
     * Handler do clique em "Instalar" (Android) ou "OK" (iOS)
     */
    async onInstallClick() {
        if (this.isIOS()) {
            // iOS: apenas fechar o banner (usuario seguira instrucoes)
            this.setData({ lastShown: Date.now() });
            this.esconderBanner();
            return;
        }

        // Android: acionar prompt nativo
        if (this.deferredPrompt) {
            try {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;

                if (window.Log) Log.info('INSTALL-PROMPT', 'Resultado do prompt:', outcome);

                if (outcome === 'accepted') {
                    this.setData({ installed: true });
                } else {
                    this.setData({ lastShown: Date.now() });
                }

                this.deferredPrompt = null;
            } catch (e) {
                if (window.Log) Log.warn('INSTALL-PROMPT', 'Erro ao acionar prompt:', e);
            }
        } else {
            if (window.Log) Log.warn('INSTALL-PROMPT', 'Prompt nativo indisponivel - exibindo instrucoes');
            this.setData({ lastShown: Date.now() });
        }

        this.esconderBanner();
    },

    /**
     * Handler do clique em fechar (X)
     */
    onCloseClick() {
        this.setData({ lastShown: Date.now() });
        this.esconderBanner();
        if (window.Log) Log.info('INSTALL-PROMPT', 'Banner fechado pelo usuario');
    },

    // =====================================================================
    // INICIALIZACAO
    // =====================================================================

    /**
     * Verifica parametros de debug na URL
     */
    checkDebugMode() {
        const params = new URLSearchParams(window.location.search);
        const debug = params.get('debug');

        if (debug === 'install') {
            this.debugMode = 'android';
            return true;
        }
        if (debug === 'install-ios') {
            this.debugMode = 'ios';
            return true;
        }
        if (debug === 'install-reset') {
            // Limpa dados e detecta automaticamente
            localStorage.removeItem(this.STORAGE_KEY);
            if (window.Log) Log.info('INSTALL-PROMPT', 'Dados resetados via debug');
            return true;
        }
        return false;
    },

    /**
     * Inicializar o sistema de install prompt
     */
    init() {
        // Verificar modo debug via URL
        const isDebug = this.checkDebugMode();

        if (isDebug) {
            // Modo debug: mostrar banner imediatamente
            if (window.Log) Log.info('INSTALL-PROMPT', 'Modo DEBUG ativo:', this.debugMode || 'auto');
            setTimeout(() => this.mostrarBanner(), 500);
            return; // Nao registrar listeners normais em modo debug
        }

        // Capturar evento beforeinstallprompt (Android/Chrome)
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;

            if (window.Log) Log.info('INSTALL-PROMPT', 'Evento beforeinstallprompt capturado');

            // Verificar se deve mostrar
            if (this.shouldShow()) {
                setTimeout(() => this.mostrarBanner(), this.DELAY_MS);
            }
        });

        // iOS: verificar apos carregamento
        window.addEventListener('load', () => {
            if (!this.shouldShow()) return;

            if (this.isIOS()) {
                setTimeout(() => this.mostrarBanner(), this.DELAY_MS);
                return;
            }

            // Android: fallback para mostrar mesmo antes do evento nativo
            if (this.isAndroid() && !this.deferredPrompt) {
                setTimeout(() => this.mostrarBanner(), this.DELAY_MS);
            }
        });

        // Detectar quando app foi instalado (Android)
        window.addEventListener('appinstalled', () => {
            this.setData({ installed: true });
            this.esconderBanner();
            if (window.Log) Log.info('INSTALL-PROMPT', 'App instalado com sucesso!');
        });

        if (window.Log) Log.info('INSTALL-PROMPT', 'Sistema inicializado v1.1');
    }
};

// Expor globalmente
window.InstallPrompt = InstallPrompt;

// Auto-inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => InstallPrompt.init());
} else {
    InstallPrompt.init();
}
