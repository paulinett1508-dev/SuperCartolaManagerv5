/**
 * Admin Shell Bootstrap v1.0
 *
 * Centraliza o carregamento do layout (sidebar + scripts) para TODAS as páginas admin.
 * Cada página precisa apenas de:
 *   <script src="js/admin-shell.js"></script>
 *
 * Responsabilidades:
 * 1. Carregar sidebar de layout.html (se acesso direto, não SPA)
 * 2. Injetar scripts do layout (AccordionManager, SPA, Navigation, etc.)
 * 3. Inicializar AccordionManager e verificarMenuSuperAdmin
 * 4. Prover sistema de cleanup registry para páginas registrarem limpeza
 */

(function () {
    'use strict';

    const TAG = '[ADMIN-SHELL]';

    // ========================================================================
    // CLEANUP REGISTRY
    // ========================================================================

    if (!window.__adminShell) {
        window.__adminShell = {
            cleanups: [],

            /**
             * Registra uma função de cleanup que será chamada antes da navegação SPA.
             * Use para: clearInterval, eventSource.close(), removeEventListener, etc.
             */
            registerCleanup(fn) {
                if (typeof fn === 'function') {
                    this.cleanups.push(fn);
                }
            },

            /**
             * Executa todos os cleanups registrados e limpa a lista.
             * Chamado automaticamente pelo SPANavigation antes de trocar página.
             */
            runCleanups() {
                const count = this.cleanups.length;
                this.cleanups.forEach(fn => {
                    try { fn(); } catch (e) {
                        console.warn(TAG, 'Erro em cleanup:', e);
                    }
                });
                this.cleanups = [];
                if (count > 0) {
                    console.log(TAG, 'Cleanups executados:', count);
                }
            }
        };
    }

    // ========================================================================
    // LOAD LAYOUT (sidebar + scripts)
    // ========================================================================

    async function loadLayout() {
        try {
            // Se sidebar já existe (navegação SPA), não precisa carregar
            if (document.querySelector('.app-sidebar')) {
                console.log(TAG, 'Sidebar já existe (SPA), pulando loadLayout');
                return;
            }

            console.log(TAG, 'Carregando layout...');
            const response = await fetch('layout.html');
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Injetar sidebar
            const sidebar = doc.querySelector('.app-sidebar');
            const placeholder = document.getElementById('sidebar-placeholder');
            if (sidebar && placeholder) {
                placeholder.replaceWith(sidebar);
                console.log(TAG, 'Sidebar injetado');
            } else if (!placeholder) {
                console.log(TAG, 'Placeholder já substituído, pulando');
            }

            // Injetar toggle button do sidebar (está fora do nav)
            const toggleBtn = doc.querySelector('.sidebar-toggle-btn');
            if (toggleBtn && !document.querySelector('.sidebar-toggle-btn')) {
                document.body.insertBefore(toggleBtn, document.body.firstChild);
            }

            // Injetar scripts do layout (apenas uma vez)
            if (!window.__layoutScriptsInjected) {
                window.__layoutScriptsInjected = true;
                const scripts = doc.querySelectorAll('script');
                let injected = 0;
                scripts.forEach(script => {
                    if (script.textContent.trim()) {
                        const s = document.createElement('script');
                        s.textContent = '(function(){' + script.textContent + '})();';
                        document.head.appendChild(s);
                        injected++;
                    }
                });
                console.log(TAG, 'Scripts do layout injetados:', injected);
            }

            // Inicializar componentes do layout após scripts carregarem
            setTimeout(() => {
                if (window.AccordionManager && !window.AccordionManager._initialized) {
                    window.AccordionManager.init();
                }
                if (typeof window.verificarMenuSuperAdmin === 'function') {
                    window.verificarMenuSuperAdmin();
                }
            }, 200);

            console.log(TAG, 'Layout carregado com sucesso');
        } catch (err) {
            console.error(TAG, 'Erro ao carregar layout:', err);
        }
    }

    // ========================================================================
    // INIT
    // ========================================================================

    loadLayout();
})();
