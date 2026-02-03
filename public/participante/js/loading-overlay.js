// =====================================================================
// LOADING OVERLAY v1.0 - Feedback Visual para Navegação
// =====================================================================
// Overlay com blur usado durante navegação entre módulos
// Separado do antigo sistema de pull-to-refresh
// =====================================================================

(function () {
    "use strict";

    console.log("[LOADING-OVERLAY] v1.0 Inicializando...");

    let loadingOverlay = null;

    // Criar Loading Overlay
    function createLoadingOverlay() {
        if (document.getElementById("loadingOverlay")) {
            loadingOverlay = document.getElementById("loadingOverlay");
            return;
        }

        const html = `
            <div id="loadingOverlay" class="loading-overlay">
                <div class="loading-ball-container">
                    <div class="loading-ball">
                        <span class="material-icons">sports_soccer</span>
                    </div>
                    <div class="loading-ball-shadow"></div>
                </div>
                <span class="loading-text">Carregando...</span>
            </div>
        `;

        document.body.insertAdjacentHTML("afterbegin", html);
        loadingOverlay = document.getElementById("loadingOverlay");
    }

    // Mostrar loading overlay
    function showLoading(texto = "Carregando...") {
        if (!loadingOverlay) createLoadingOverlay();

        const textEl = loadingOverlay.querySelector(".loading-text");
        if (textEl) textEl.textContent = texto;

        loadingOverlay.classList.add("visible");
    }

    // Esconder loading overlay
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove("visible");
        }
    }

    // Inicializar
    function init() {
        createLoadingOverlay();
        console.log("[LOADING-OVERLAY] v1.0 Sistema inicializado");
    }

    // Expor API global
    window.LoadingOverlay = {
        show: showLoading,
        hide: hideLoading,
        isVisible: () => loadingOverlay?.classList.contains("visible") || false,
    };

    // Inicializar quando DOM estiver pronto
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
