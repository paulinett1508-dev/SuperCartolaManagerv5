// ================================================
// PULL-TO-REFRESH - Bola Quicando (v2.0)
// + LOADING OVERLAY com Blur
// ================================================
// Intercepta o gesto de arrastar para baixo e recarrega
// apenas o módulo atual, sem splash screen completo

(function () {
    "use strict";

    console.log("[PULL-REFRESH] 🏀 Inicializando sistema de refresh v2.0...");

    // Configuração
    const CONFIG = {
        threshold: 80, // Pixels para ativar o refresh
        maxPull: 120, // Máximo de pixels que pode puxar
        resistance: 2.5, // Resistência do pull (maior = mais difícil)
        refreshDelay: 600, // Tempo mínimo de animação (ms)
    };

    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let isRefreshing = false;
    let indicator = null;
    let loadingOverlay = null;

    // Criar Loading Overlay (bolinha com blur - para navegação interna)
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

    // Criar indicador HTML (pull-to-refresh)
    function createIndicator() {
        if (document.getElementById("pullRefreshIndicator")) return;

        const html = `
            <div id="pullRefreshIndicator" class="pull-refresh-indicator">
                <div class="refresh-ball">
                    <div class="refresh-ball-icon"></div>
                    <div class="refresh-ball-shadow"></div>
                </div>
                <span class="refresh-status-text">Puxe para atualizar</span>
            </div>
        `;

        document.body.insertAdjacentHTML("afterbegin", html);
        indicator = document.getElementById("pullRefreshIndicator");
    }

    // Mostrar loading overlay (bolinha com blur)
    function showLoading(texto = "Carregando...") {
        if (!loadingOverlay) createLoadingOverlay();

        const textEl = loadingOverlay.querySelector(".loading-text");
        if (textEl) textEl.textContent = texto;

        loadingOverlay.classList.add("visible");
        console.log("[LOADING] Exibindo overlay com blur");
    }

    // Esconder loading overlay
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove("visible");
            console.log("[LOADING] Ocultando overlay");
        }
    }

    // Verificar se pode iniciar pull (no topo da página)
    function canStartPull() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const moduleContainer = document.querySelector(".module-container");
        const moduleScrollTop = moduleContainer ? moduleContainer.scrollTop : 0;

        return scrollTop <= 0 && moduleScrollTop <= 0;
    }

    // Atualizar visual do indicador
    function updateIndicator(progress) {
        if (!indicator) return;

        const statusText = indicator.querySelector(".refresh-status-text");
        const ballIcon = indicator.querySelector(".refresh-ball-icon");

        if (progress >= 1) {
            indicator.classList.add("visible");
            indicator.classList.remove("pulling");
            statusText.textContent = "Solte para atualizar";
            statusText.style.color = "#FF4500";
        } else if (progress > 0) {
            indicator.classList.add("visible", "pulling");
            statusText.textContent = "Puxe para atualizar";
            statusText.style.color = "rgba(255, 255, 255, 0.5)";

            // Aplicar progresso visual na bola
            const pullY = progress * 20;
            ballIcon.style.transform = `translateY(${pullY}px) rotate(${progress * 180}deg)`;
        } else {
            indicator.classList.remove("visible", "pulling");
            ballIcon.style.transform = "";
        }
    }

    // Iniciar refresh
    async function startRefresh() {
        if (isRefreshing) return;
        isRefreshing = true;

        console.log("[PULL-REFRESH] 🔄 Iniciando refresh do módulo...");

        const statusText = indicator.querySelector(".refresh-status-text");
        indicator.classList.remove("pulling");
        indicator.classList.add("refreshing");
        statusText.textContent = "Atualizando...";
        statusText.style.color = "#FF4500";

        const startTime = Date.now();

        try {
            // ✅ CORREÇÃO: Verificar ambas as referências do navigation
            const nav = window.participanteNav || window.participanteNavigation;

            if (nav && nav.moduloAtual) {
                const moduloAtual = nav.moduloAtual;
                console.log(
                    `[PULL-REFRESH] 📦 Recarregando módulo: ${moduloAtual}`,
                );

                // Recarregar o módulo com força
                await nav.navegarPara(moduloAtual, true);
            } else if (nav) {
                // Nav existe mas sem módulo atual - navegar para boas-vindas
                console.log("[PULL-REFRESH] 📦 Navegando para boas-vindas");
                await nav.navegarPara('boas-vindas', true);
            } else {
                // ✅ CORREÇÃO: Fallback melhor - recarregar a página inteira
                console.log(
                    "[PULL-REFRESH] ⚠️ Nav não encontrado, recarregando página",
                );

                // Atualizar texto do status
                statusText.textContent = "Recarregando...";

                // Simular delay mínimo antes do reload
                await new Promise((resolve) =>
                    setTimeout(resolve, CONFIG.refreshDelay),
                );

                // Reload suave (mantém scroll position)
                window.location.reload();
                return; // Não chama finishRefresh porque a página vai recarregar
            }
        } catch (error) {
            console.error("[PULL-REFRESH] ❌ Erro ao atualizar:", error);
            statusText.textContent = "Erro!";
            statusText.style.color = "#ef4444";
        }

        // Garantir tempo mínimo de animação
        const elapsed = Date.now() - startTime;
        if (elapsed < CONFIG.refreshDelay) {
            await new Promise((resolve) =>
                setTimeout(resolve, CONFIG.refreshDelay - elapsed),
            );
        }

        // Finalizar
        finishRefresh();
    }

    // Finalizar refresh
    function finishRefresh() {
        isRefreshing = false;
        isPulling = false;

        if (indicator) {
            indicator.classList.remove("visible", "pulling", "refreshing");
            const statusText = indicator.querySelector(".refresh-status-text");
            statusText.textContent = "Puxe para atualizar";
            statusText.style.color = "rgba(255, 255, 255, 0.5)";
        }

        document.body.classList.remove("pull-refresh-active");

        console.log("[PULL-REFRESH] ✅ Refresh concluído");
    }

    // Event Handlers
    function onTouchStart(e) {
        if (isRefreshing) return;
        if (!canStartPull()) return;

        startY = e.touches[0].pageY;
        isPulling = true;
        document.body.classList.add("pull-refresh-active");
    }

    function onTouchMove(e) {
        if (!isPulling || isRefreshing) return;

        currentY = e.touches[0].pageY;
        const deltaY = (currentY - startY) / CONFIG.resistance;

        if (deltaY < 0) {
            isPulling = false;
            document.body.classList.remove("pull-refresh-active");
            updateIndicator(0);
            return;
        }

        // Limitar o pull
        const pullDistance = Math.min(deltaY, CONFIG.maxPull);
        const progress = Math.min(pullDistance / CONFIG.threshold, 1);

        updateIndicator(progress);

        // Prevenir scroll se estiver puxando (verificar se é cancelável)
        if (pullDistance > 10 && e.cancelable) {
            e.preventDefault();
        }
    }

    function onTouchEnd() {
        if (!isPulling || isRefreshing) return;

        const deltaY = (currentY - startY) / CONFIG.resistance;

        if (deltaY >= CONFIG.threshold) {
            startRefresh();
        } else {
            // Cancelar pull
            isPulling = false;
            document.body.classList.remove("pull-refresh-active");
            updateIndicator(0);
        }

        startY = 0;
        currentY = 0;
    }

    // Inicializar
    function init() {
        createIndicator();
        createLoadingOverlay();

        // Usar passive: false para poder prevenir scroll
        document.addEventListener("touchstart", onTouchStart, {
            passive: true,
        });
        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("touchend", onTouchEnd, { passive: true });

        // Prevenir comportamento nativo de overscroll
        document.body.style.overscrollBehaviorY = "contain";

        console.log("[PULL-REFRESH] ✅ Sistema v2.0 inicializado (com Loading Overlay)");
    }

    // Expor API global
    window.PullRefresh = {
        refresh: startRefresh,
        isRefreshing: () => isRefreshing,
    };

    // Expor Loading Overlay API globalmente
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
