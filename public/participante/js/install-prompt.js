// =====================================================================
// install-prompt.js - PWA Install Prompt v1.0
// =====================================================================
// Sistema de prompt de instalacao PWA persistente
// - Captura evento beforeinstallprompt (Android/Chrome)
// - Detecta iOS e mostra instrucoes especificas
// - Controle de exibicao: 24h entre lembretes
// - Respeita se ja instalado ou se usuario marcou "nao mostrar"
// - Segue design system do projeto (Material Icons, CSS tokens)
// =====================================================================

const InstallPrompt = {
    STORAGE_KEY: 'install_prompt_data',
    COOLDOWN_HOURS: 24,
    DELAY_MS: 3000, // Aguardar 3s apos carregamento para mostrar
    deferredPrompt: null,

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
     * Detecta se e dispositivo iOS
     */
    isIOS() {
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
     * Criar e mostrar o banner de instalacao
     */
    mostrarBanner() {
        // Evitar duplicatas
        if (document.getElementById('install-prompt-banner')) return;

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
            background: linear-gradient(135deg, #FF5500, #e8472b);
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
            background: white;
            color: #FF5500;
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

        // Adicionar animacao CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUpBanner {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes slideDownBanner {
                from { transform: translateY(0); opacity: 1; }
                to { transform: translateY(100%); opacity: 0; }
            }
            #install-btn-action:active {
                transform: scale(0.95);
            }
            #install-btn-close:hover {
                background: rgba(255, 255, 255, 0.25);
            }
        `;
        document.head.appendChild(style);

        // Event listeners
        btnPrimary.addEventListener('click', () => this.onInstallClick());
        btnClose.addEventListener('click', () => this.onCloseClick());

        document.body.appendChild(banner);

        if (window.Log) Log.info('INSTALL-PROMPT', 'Banner exibido', { isIOS });
    },

    /**
     * Esconder o banner com animacao
     */
    esconderBanner() {
        const banner = document.getElementById('install-prompt-banner');
        if (!banner) return;

        banner.style.animation = 'slideDownBanner 0.3s ease-out forwards';
        setTimeout(() => banner.remove(), 300);
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
     * Inicializar o sistema de install prompt
     */
    init() {
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
            if (this.isIOS() && this.shouldShow()) {
                setTimeout(() => this.mostrarBanner(), this.DELAY_MS);
            }
        });

        // Detectar quando app foi instalado (Android)
        window.addEventListener('appinstalled', () => {
            this.setData({ installed: true });
            this.esconderBanner();
            if (window.Log) Log.info('INSTALL-PROMPT', 'App instalado com sucesso!');
        });

        if (window.Log) Log.info('INSTALL-PROMPT', 'Sistema inicializado v1.0');
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
