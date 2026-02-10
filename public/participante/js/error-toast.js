// =====================================================================
// ERROR TOAST v1.0 - Feedback Visual de Erros para Módulos
// =====================================================================
// Componente global reutilizável para notificar erros ao usuário
// com ações contextuais (retry, voltar, etc.)
// =====================================================================

(function () {
    "use strict";

    let toastContainer = null;
    let activeToast = null;
    let hideTimeout = null;

    function createContainer() {
        if (document.getElementById("errorToastContainer")) {
            toastContainer = document.getElementById("errorToastContainer");
            return;
        }

        const el = document.createElement("div");
        el.id = "errorToastContainer";
        el.setAttribute("role", "alert");
        el.setAttribute("aria-live", "assertive");
        document.body.appendChild(el);
        toastContainer = el;
    }

    /**
     * Mostra um toast de erro/aviso/info
     * @param {string} mensagem - Texto principal
     * @param {Object} opcoes - Configurações opcionais
     * @param {string} opcoes.tipo - 'error' | 'warning' | 'info' | 'success' (default: 'error')
     * @param {number} opcoes.duracao - Duração em ms (default: 4000, 0 = permanente)
     * @param {string} opcoes.acao - Texto do botão de ação (ex: "Tentar novamente")
     * @param {Function} opcoes.onAcao - Callback ao clicar na ação
     */
    function show(mensagem, opcoes = {}) {
        const {
            tipo = "error",
            duracao = 4000,
            acao = null,
            onAcao = null
        } = opcoes;

        if (!toastContainer) createContainer();

        // Remove toast anterior
        if (activeToast) {
            activeToast.remove();
            activeToast = null;
        }
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }

        const config = {
            error:   { icone: "error",        corVar: "var(--app-danger)" },
            warning: { icone: "warning",      corVar: "var(--app-warning)" },
            info:    { icone: "info",          corVar: "var(--app-info)" },
            success: { icone: "check_circle",  corVar: "var(--app-success-light)" }
        }[tipo] || { icone: "error", corVar: "var(--app-danger)" };

        const toast = document.createElement("div");
        toast.className = "app-error-toast";
        toast.setAttribute("data-tipo", tipo);

        let acaoHTML = "";
        if (acao) {
            acaoHTML = `<button class="app-error-toast__acao">${acao}</button>`;
        }

        toast.innerHTML = `
            <span class="material-symbols-outlined app-error-toast__icon" style="color: ${config.corVar}">${config.icone}</span>
            <span class="app-error-toast__msg">${mensagem}</span>
            ${acaoHTML}
            <button class="app-error-toast__close" aria-label="Fechar">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;

        // Event listeners
        const closeBtn = toast.querySelector(".app-error-toast__close");
        closeBtn.addEventListener("click", () => hide());

        if (acao && onAcao) {
            const acaoBtn = toast.querySelector(".app-error-toast__acao");
            acaoBtn.addEventListener("click", () => {
                hide();
                onAcao();
            });
        }

        toastContainer.appendChild(toast);
        activeToast = toast;

        // Animar entrada
        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add("show"));
        });

        // Auto-hide
        if (duracao > 0) {
            hideTimeout = setTimeout(() => hide(), duracao);
        }
    }

    function hide() {
        if (!activeToast) return;
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }

        activeToast.classList.remove("show");
        const ref = activeToast;
        setTimeout(() => ref.remove(), 300);
        activeToast = null;
    }

    // Inicializar
    function init() {
        createContainer();
    }

    // API Global
    window.ErrorToast = { show, hide };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
