// =====================================================================
// PARTICIPANTE-REFRESH-BUTTON.JS - Botão de Atualização Manual v2.1
// =====================================================================
// v2.1: Fix duplicação de botão (verifica existência antes de adicionar)
// Componente global para atualização de cache quando temporada encerrada
// Substitui o pull-to-refresh quando os dados são estáticos
// =====================================================================

if (window.Log) Log.info('REFRESH-BUTTON', 'Carregando componente v2.1...');

const RefreshButton = {
    // Modal HTML
    _modalHTML: `
        <div id="refreshModal" class="refresh-modal-overlay">
            <div class="refresh-modal-content">
                <div class="refresh-modal-header">
                    <div class="refresh-modal-icon">
                        <span class="material-symbols-outlined">cached</span>
                    </div>
                    <h3 class="refresh-modal-title">Atualizar Dados</h3>
                </div>
                <div class="refresh-modal-body">
                    <p>Isso vai limpar o cache local e buscar os dados novamente do servidor.</p>
                    <p class="refresh-modal-hint">Use apenas se suspeitar que os dados estão desatualizados.</p>
                </div>
                <div class="refresh-modal-actions">
                    <button id="refreshModalCancel" class="refresh-modal-btn refresh-modal-btn-cancel">
                        Cancelar
                    </button>
                    <button id="refreshModalConfirm" class="refresh-modal-btn refresh-modal-btn-confirm">
                        <span class="material-symbols-outlined">refresh</span>
                        Atualizar
                    </button>
                </div>
            </div>
        </div>
    `,

    // CSS do componente
    _styles: `
        /* ============================================
           BOTÃO DE ATUALIZAÇÃO
           ============================================ */
        .refresh-button {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            -webkit-tap-highlight-color: transparent;
        }

        .refresh-button:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.25);
            color: rgba(255, 255, 255, 0.9);
        }

        .refresh-button:active {
            transform: scale(0.95);
            background: rgba(255, 69, 0, 0.2);
            border-color: rgba(255, 69, 0, 0.4);
        }

        .refresh-button .material-symbols-outlined {
            font-size: 18px;
        }

        /* Container do botão no topo do módulo */
        .refresh-button-container {
            display: flex;
            justify-content: flex-end;
            padding: 8px 12px;
            margin-bottom: 8px;
        }

        /* ============================================
           MODAL DE CONFIRMAÇÃO
           ============================================ */
        .refresh-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s ease;
        }

        .refresh-modal-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        .refresh-modal-content {
            background: linear-gradient(180deg, #1f1f1f 0%, #171717 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 24px;
            max-width: 340px;
            width: 90%;
            transform: scale(0.9);
            transition: transform 0.2s ease;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .refresh-modal-overlay.active .refresh-modal-content {
            transform: scale(1);
        }

        .refresh-modal-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .refresh-modal-icon {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, rgba(255, 69, 0, 0.2), rgba(255, 69, 0, 0.1));
            border: 2px solid rgba(255, 69, 0, 0.4);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .refresh-modal-icon .material-symbols-outlined {
            font-size: 28px;
            color: #ff4500;
        }

        .refresh-modal-title {
            color: white;
            font-size: 18px;
            font-weight: 600;
            margin: 0;
        }

        .refresh-modal-body {
            text-align: center;
            margin-bottom: 24px;
        }

        .refresh-modal-body p {
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
            line-height: 1.5;
            margin: 0 0 8px 0;
        }

        .refresh-modal-hint {
            color: rgba(255, 255, 255, 0.5) !important;
            font-size: 12px !important;
            font-style: italic;
        }

        .refresh-modal-actions {
            display: flex;
            gap: 12px;
        }

        .refresh-modal-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 12px 16px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
        }

        .refresh-modal-btn-cancel {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
        }

        .refresh-modal-btn-cancel:active {
            background: rgba(255, 255, 255, 0.15);
            transform: scale(0.95);
        }

        .refresh-modal-btn-confirm {
            background: linear-gradient(135deg, #ff4500, var(--app-primary-light));
            color: white;
        }

        .refresh-modal-btn-confirm:active {
            transform: scale(0.95);
            filter: brightness(0.9);
        }

        .refresh-modal-btn .material-symbols-outlined {
            font-size: 18px;
        }
    `,

    // Inicializado?
    _initialized: false,

    /**
     * Inicializar o componente (injeta CSS e modal)
     */
    init() {
        if (this._initialized) return;

        // Injetar CSS
        if (!document.getElementById('refreshButtonStyles')) {
            const style = document.createElement('style');
            style.id = 'refreshButtonStyles';
            style.textContent = this._styles;
            document.head.appendChild(style);
        }

        // Injetar Modal
        if (!document.getElementById('refreshModal')) {
            document.body.insertAdjacentHTML('beforeend', this._modalHTML);
            this._setupModalEvents();
        }

        this._initialized = true;
        if (window.Log) Log.info('REFRESH-BUTTON', '✅ Componente inicializado');
    },

    /**
     * Configurar eventos do modal
     */
    _setupModalEvents() {
        const modal = document.getElementById('refreshModal');
        const cancelBtn = document.getElementById('refreshModalCancel');
        const confirmBtn = document.getElementById('refreshModalConfirm');

        // Fechar ao clicar no overlay
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
            }
        });

        // Botão cancelar
        cancelBtn?.addEventListener('click', () => {
            this.hideModal();
        });

        // Botão confirmar
        confirmBtn?.addEventListener('click', async () => {
            await this.executeRefresh();
        });
    },

    /**
     * Mostrar modal de confirmação
     */
    showModal() {
        const modal = document.getElementById('refreshModal');
        if (modal) {
            modal.classList.add('active');
        }
    },

    /**
     * Esconder modal
     */
    hideModal() {
        const modal = document.getElementById('refreshModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * Executar atualização (limpar cache e recarregar)
     */
    async executeRefresh() {
        if (window.Log) Log.info('REFRESH-BUTTON', '🔄 Limpando cache e recarregando...');

        // Alterar texto do botão
        const confirmBtn = document.getElementById('refreshModalConfirm');
        if (confirmBtn) {
            confirmBtn.innerHTML = `
                <span class="material-symbols-outlined animate-spin">refresh</span>
                Atualizando...
            `;
            confirmBtn.disabled = true;
        }

        try {
            // 1. Limpar IndexedDB
            if (window.OfflineCache) {
                await window.OfflineCache.clearAll();
            }

            // 2. Limpar memória (ParticipanteCache)
            if (window.ParticipanteCache) {
                window.ParticipanteCache.clear();
            }

            // 3. Ativar overlay de reload
            const glassOverlay = document.getElementById('reload-glass-overlay');
            if (glassOverlay) {
                glassOverlay.classList.add('is-active');
            }

            // 4. Vibrar (feedback tátil)
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }

            // 5. Aguardar um pouco e recarregar
            setTimeout(() => {
                window.location.reload();
            }, 300);

        } catch (error) {
            if (window.Log) Log.error('REFRESH-BUTTON', 'Erro ao atualizar:', error);
            this.hideModal();
        }
    },

    /**
     * Criar botão de atualização
     * @param {Object} options - Opções do botão
     * @param {string} options.text - Texto do botão (padrão: "Atualizar Dados")
     * @param {boolean} options.showIcon - Mostrar ícone (padrão: true)
     * @returns {HTMLElement} Elemento do botão
     */
    createButton(options = {}) {
        this.init();

        const text = options.text || 'Atualizar Dados';
        const showIcon = options.showIcon !== false;

        const button = document.createElement('button');
        button.className = 'refresh-button';
        button.innerHTML = `
            ${showIcon ? '<span class="material-symbols-outlined">refresh</span>' : ''}
            ${text}
        `;

        button.addEventListener('click', () => {
            this.showModal();
        });

        return button;
    },

    /**
     * Adicionar botão a um container
     * @param {HTMLElement|string} container - Container ou seletor
     * @param {Object} options - Opções do botão
     */
    addTo(container, options = {}) {
        this.init();

        const containerEl = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!containerEl) {
            if (window.Log) Log.warn('REFRESH-BUTTON', 'Container não encontrado');
            return null;
        }

        // ✅ v2.1: Evitar duplicação - verificar se já existe botão no container
        const existingButton = containerEl.querySelector('.refresh-button-container');
        if (existingButton) {
            if (window.Log) Log.debug('REFRESH-BUTTON', 'Botão já existe no container, ignorando duplicação');
            return existingButton;
        }

        // Criar container para o botão
        const wrapper = document.createElement('div');
        wrapper.className = 'refresh-button-container';
        wrapper.appendChild(this.createButton(options));

        // Inserir no início do container
        containerEl.insertBefore(wrapper, containerEl.firstChild);

        return wrapper;
    },

    /**
     * Verificar se deve mostrar botão (temporada encerrada)
     */
    shouldShow() {
        // Verificar via OfflineCache
        if (window.OfflineCache?.TEMPORADA_ENCERRADA) {
            return true;
        }
        return false;
    }
};

// Inicializar automaticamente
RefreshButton.init();

// Expor globalmente
window.RefreshButton = RefreshButton;

if (window.Log) Log.info('REFRESH-BUTTON', '✅ Componente pronto');
