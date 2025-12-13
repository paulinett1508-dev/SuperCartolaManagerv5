// ================================================
// PULL-TO-REFRESH v4.0 - Modo Temporada Encerrada
// ================================================
// v4.0: Desabilita pull-to-refresh quando temporada encerrada
// v3.1: Feedback visual: Bolinha de futebol que desce conforme puxa
// Ao soltar: Vibração + Vidro Fosco + Reload

(function () {
    "use strict";

    console.log("[PULL-REFRESH] v4.0 Inicializando...");

    // =====================================================================
    // FLAG DE TEMPORADA ENCERRADA
    // =====================================================================
    const TEMPORADA_ENCERRADA = true; // 2025 - Campeonato finalizado

    // Configuração
    const CONFIG = {
        threshold: 80,      // Pixels para ativar o refresh
        maxPull: 120,       // Máximo de pixels que pode puxar
        resistance: 2.5,    // Resistência do pull (maior = mais difícil)
    };

    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let isRefreshing = false;
    let pullIndicator = null;
    let loadingOverlay = null;

    // Criar indicador de pull (bolinha sutil)
    function createPullIndicator() {
        if (document.getElementById("pullIndicator")) {
            pullIndicator = document.getElementById("pullIndicator");
            return;
        }

        const html = `
            <div id="pullIndicator" class="pull-indicator">
                <div class="pull-ball">
                    <span class="material-icons">sports_soccer</span>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML("afterbegin", html);
        pullIndicator = document.getElementById("pullIndicator");

        // Injetar CSS inline para o indicador
        if (!document.getElementById("pullIndicatorStyles")) {
            const style = document.createElement("style");
            style.id = "pullIndicatorStyles";
            style.textContent = `
                .pull-indicator {
                    position: fixed;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%) translateY(-60px);
                    z-index: 99999;
                    pointer-events: none;
                    transition: none;
                }
                .pull-indicator .pull-ball {
                    width: 44px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.15s ease;
                }
                .pull-indicator .pull-ball .material-icons {
                    font-size: 44px;
                    color: rgba(255, 255, 255, 0.9);
                    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
                }
                .pull-indicator.active .pull-ball {
                    opacity: 1;
                }
                .pull-indicator.ready .pull-ball .material-icons {
                    color: #FF4500;
                    filter: drop-shadow(0 2px 12px rgba(255, 69, 0, 0.6));
                }
            `;
            document.head.appendChild(style);
        }
    }

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

    // Mostrar loading overlay (bolinha com blur - para navegação entre módulos)
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

    // Verificar se pode iniciar pull (no topo da página)
    function canStartPull() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const moduleContainer = document.querySelector(".module-container");
        const moduleScrollTop = moduleContainer ? moduleContainer.scrollTop : 0;

        return scrollTop <= 0 && moduleScrollTop <= 0;
    }

    // Atualizar posição da bolinha durante o pull
    function updatePullIndicator(pullDistance, progress) {
        if (!pullIndicator) return;

        if (pullDistance > 5) {
            pullIndicator.classList.add("active");

            // Posição Y: começa em -60px, vai até +20px conforme puxa
            const translateY = Math.min(-60 + pullDistance, 20);

            // Rotação baseada na distância
            const rotation = pullDistance * 3;

            pullIndicator.style.transform = `translateX(-50%) translateY(${translateY}px)`;
            pullIndicator.querySelector(".pull-ball").style.transform = `rotate(${rotation}deg)`;

            // Fica laranja quando pronto para refresh
            if (progress >= 1) {
                pullIndicator.classList.add("ready");
            } else {
                pullIndicator.classList.remove("ready");
            }
        } else {
            pullIndicator.classList.remove("active", "ready");
            pullIndicator.style.transform = "translateX(-50%) translateY(-60px)";
        }
    }

    // Resetar indicador
    function resetPullIndicator() {
        if (!pullIndicator) return;

        pullIndicator.classList.remove("active", "ready");
        pullIndicator.style.transform = "translateX(-50%) translateY(-60px)";
        pullIndicator.querySelector(".pull-ball").style.transform = "rotate(0deg)";
    }

    // Ativar vidro fosco (overlay de reload)
    function activateGlassOverlay() {
        const glassOverlay = document.getElementById('reload-glass-overlay');
        if (glassOverlay) {
            glassOverlay.classList.add('is-active');
            glassOverlay.style.opacity = '1';
        }
    }

    // Vibrar dispositivo (feedback tátil)
    function vibrate(duration = 50) {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    }

    // Executar refresh
    function executeRefresh() {
        if (isRefreshing) return;
        isRefreshing = true;

        console.log("[PULL-REFRESH] Executando refresh...");

        // Esconder indicador de pull
        resetPullIndicator();

        // 1. Vibrar o dispositivo
        vibrate(50);

        // 2. Ativar vidro fosco IMEDIATAMENTE
        activateGlassOverlay();

        // 3. Pequeno delay para garantir que o overlay apareça, depois recarrega
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }

    // Event Handlers
    function onTouchStart(e) {
        if (isRefreshing) return;
        if (!canStartPull()) return;

        startY = e.touches[0].pageY;
        isPulling = true;
    }

    function onTouchMove(e) {
        if (!isPulling || isRefreshing) return;

        currentY = e.touches[0].pageY;
        const deltaY = (currentY - startY) / CONFIG.resistance;

        // Se puxando para cima, cancelar
        if (deltaY < 0) {
            isPulling = false;
            resetPullIndicator();
            return;
        }

        // Limitar o pull
        const pullDistance = Math.min(deltaY, CONFIG.maxPull);
        const progress = Math.min(pullDistance / CONFIG.threshold, 1);

        // Atualizar indicador visual
        updatePullIndicator(pullDistance, progress);

        // Prevenir scroll nativo se estiver puxando (verificar se é cancelável)
        if (pullDistance > 10 && e.cancelable) {
            e.preventDefault();
        }
    }

    function onTouchEnd() {
        if (!isPulling || isRefreshing) return;

        const deltaY = (currentY - startY) / CONFIG.resistance;

        if (deltaY >= CONFIG.threshold) {
            // Limite atingido - executar refresh
            executeRefresh();
        } else {
            // Cancelar - resetar indicador
            resetPullIndicator();
        }

        // Reset
        isPulling = false;
        startY = 0;
        currentY = 0;
    }

    // Inicializar
    function init() {
        // Loading Overlay sempre disponível (usado por navegação entre módulos)
        createLoadingOverlay();

        // =====================================================================
        // TEMPORADA ENCERRADA: Desabilitar pull-to-refresh
        // =====================================================================
        if (TEMPORADA_ENCERRADA) {
            console.log("[PULL-REFRESH] v4.0 ⚠️ Temporada encerrada - Pull-to-refresh DESABILITADO");
            console.log("[PULL-REFRESH] Use o botão 'Atualizar Dados' em cada módulo para limpar cache");
            return; // Não registra event listeners de pull
        }

        createPullIndicator();

        // Usar passive: false para poder prevenir scroll
        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("touchend", onTouchEnd, { passive: true });

        console.log("[PULL-REFRESH] v4.0 Sistema inicializado (bolinha sutil)");
    }

    // Expor API global
    window.PullRefresh = {
        refresh: executeRefresh,
        isRefreshing: () => isRefreshing,
        isTemporadaEncerrada: () => TEMPORADA_ENCERRADA,
    };

    // Expor Loading Overlay API globalmente (para navegação entre módulos)
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
