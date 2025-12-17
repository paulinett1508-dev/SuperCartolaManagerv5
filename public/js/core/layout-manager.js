/**
 * LAYOUT MANAGER
 * Centraliza o carregamento de layout.html
 * Elimina duplicação de código entre páginas
 */

export class LayoutManager {
    constructor() {
        this.layoutLoaded = false;
        this.layoutPromise = null;
    }

    async load(pageConfig = {}) {
        // Evitar múltiplos carregamentos simultâneos
        if (this.layoutPromise) {
            return this.layoutPromise;
        }

        this.layoutPromise = this._loadLayout(pageConfig);
        return this.layoutPromise;
    }

    async _loadLayout(pageConfig) {
        if (this.layoutLoaded) {
            this._updatePageHeader(pageConfig);
            return;
        }

        try {
            const response = await fetch("layout.html");
            if (!response.ok) {
                throw new Error(`Layout request failed: ${response.status}`);
            }

            const layoutHtml = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(layoutHtml, "text/html");

            this._injectSidebar(doc);
            this._injectHeader(doc, pageConfig);
            this._executeLayoutScripts(doc);

            // Garantir que AccordionManager seja inicializado
            setTimeout(() => {
                if (window.AccordionManager && !window.AccordionManager._initialized) {
                    window.AccordionManager.init();
                }
            }, 150);

            this.layoutLoaded = true;
        } catch (error) {
            console.error('Erro ao carregar layout:', error);
            throw new Error('Falha ao carregar layout do sistema');
        }
    }

    _injectSidebar(doc) {
        const sidebar = doc.querySelector(".app-sidebar");
        const placeholder = document.getElementById("sidebar-placeholder");

        if (sidebar && placeholder) {
            placeholder.replaceWith(sidebar);
        }
    }

    _injectHeader(doc, pageConfig) {
        const header = doc.querySelector(".page-header");
        const placeholder = document.getElementById("header-placeholder");

        if (header && placeholder) {
            this._updatePageHeader(pageConfig, header);
            placeholder.replaceWith(header);
        }
    }

    _updatePageHeader(pageConfig, headerElement = null) {
        const header = headerElement || document.querySelector(".page-header");
        if (!header) return;

        const pageTitle = header.querySelector("#pageTitle");
        const pageSubtitle = header.querySelector("#pageSubtitle");

        if (pageTitle && pageConfig.title) {
            pageTitle.textContent = pageConfig.title;
        }
        if (pageSubtitle && pageConfig.subtitle) {
            pageSubtitle.textContent = pageConfig.subtitle;
        }
    }

    _executeLayoutScripts(doc) {
        const scripts = doc.querySelectorAll("script");
        scripts.forEach((script) => {
            if (script.textContent.trim()) {
                try {
                    const newScript = document.createElement("script");
                    newScript.textContent = script.textContent;
                    document.head.appendChild(newScript);
                } catch (error) {
                    console.error('Erro ao executar script do layout:', error);
                }
            }
        });
    }

    updatePageTitle(title, subtitle = null) {
        this._updatePageHeader({ title, subtitle });
        document.title = `${title} - Super Cartola Manager`;
    }
}