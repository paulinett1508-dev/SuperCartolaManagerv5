// === CARDS-CONDICIONAIS.JS ===
// Sistema de desativação condicional de cards por liga

console.log("🎛️ [CARDS-CONDICIONAIS] Carregando sistema...");

/**
 * Configuração dos cards por liga
 */
const CARDS_CONFIG = {
    // Super Cartola 2025 - Desabilitar Prêmios
    "684cb1c8af923da7c7df51de": {
        disabled: ["premios"],
        reason: "Prêmios não se aplicam a esta liga",
    },

    // Cartoleiros do Sobral - Desabilitar Competições
    "684d821cf1a7ae16d1f89572": {
        disabled: ["competicoes"],
        reason: "Competições não se aplicam a esta liga",
    },
};

/**
 * Obter ID da liga atual da URL
 */
function getLigaIdAtual() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
}

/**
 * Verificar se um módulo está desabilitado para a liga atual
 */
function isModuleDisabled(moduleId) {
    const ligaId = getLigaIdAtual();
    const config = CARDS_CONFIG[ligaId];
    return config && config.disabled.includes(moduleId);
}

/**
 * Aplicar estado desabilitado visual nos cards
 */
function aplicarEstadoDesabilitado(card, moduleId) {
    // Adicionar classe CSS
    card.classList.add("disabled");

    // Remover event listeners existentes clonando o elemento
    const newCard = card.cloneNode(true);
    card.parentNode.replaceChild(newCard, card);

    console.log(`🚫 [CARDS-CONDICIONAIS] Card "${moduleId}" desabilitado`);
    return newCard;
}

/**
 * Aplicar configurações condicionais baseadas na liga
 */
function aplicarConfiguracaoCards() {
    console.log("🎯 [CARDS-CONDICIONAIS] Aplicando configuração...");

    try {
        const ligaId = getLigaIdAtual();

        if (!ligaId) {
            console.warn("⚠️ [CARDS-CONDICIONAIS] ID da liga não encontrado");
            return;
        }

        console.log(`🔍 [CARDS-CONDICIONAIS] Liga atual: ${ligaId}`);

        // Verificar se há configuração para esta liga
        const config = CARDS_CONFIG[ligaId];

        if (!config || !config.disabled.length) {
            console.log(
                "✅ [CARDS-CONDICIONAIS] Nenhuma restrição para esta liga",
            );
            return;
        }

        // Aplicar desabilitações
        config.disabled.forEach((moduleId) => {
            const card = document.querySelector(`[data-module="${moduleId}"]`);

            if (card) {
                aplicarEstadoDesabilitado(card, moduleId);
            } else {
                console.warn(
                    `⚠️ [CARDS-CONDICIONAIS] Card "${moduleId}" não encontrado`,
                );
            }
        });

        console.log(
            `✅ [CARDS-CONDICIONAIS] ${config.disabled.length} cards desabilitados`,
        );
    } catch (error) {
        console.error(
            "❌ [CARDS-CONDICIONAIS] Erro ao aplicar configuração:",
            error,
        );
    }
}

/**
 * Verificar se um card deve ser bloqueado na navegação
 */
function verificarCardBloqueado(card) {
    const moduleId = card?.dataset?.module;

    if (!moduleId) return false;

    if (isModuleDisabled(moduleId)) {
        console.log(
            `🚫 [CARDS-CONDICIONAIS] Clique bloqueado no card: ${moduleId}`,
        );
        return true;
    }

    return false;
}

/**
 * Override da navegação para aplicar verificações condicionais
 */
function aplicarNavegacaoCondicional() {
    console.log(
        "🧭 [CARDS-CONDICIONAIS] Configurando navegação condicional...",
    );

    // Interceptar cliques nos cards
    document.addEventListener(
        "click",
        (e) => {
            const card = e.target.closest(".module-card");

            if (card && card.classList.contains("disabled")) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                console.log(
                    "🚫 [CARDS-CONDICIONAIS] Clique bloqueado em card desabilitado",
                );
                return false;
            }
        },
        true,
    ); // useCapture = true para interceptar antes de outros listeners
}

/**
 * Controlar visibilidade do botão voltar de forma inteligente
 */
function controlarBotaoVoltar() {
    const mainScreen = document.getElementById("main-screen");
    const secondaryScreen = document.getElementById("secondary-screen");

    // Remover botão voltar existente da tela principal se existir
    const existingButton = document.querySelector("#main-screen .back-button");
    if (existingButton) {
        existingButton.remove();
    }

    // Criar botão voltar apenas para tela secundária se não existir
    let backButton = document.querySelector("#secondary-screen .back-button");
    if (!backButton && secondaryScreen) {
        backButton = document.createElement("button");
        backButton.className = "back-button";
        backButton.innerHTML = "← Voltar aos Módulos";
        backButton.onclick = () => {
            if (typeof voltarParaCards === "function") {
                voltarParaCards();
            }
        };

        const contentArea = document.getElementById("dynamic-content-area");
        if (contentArea) {
            secondaryScreen.insertBefore(backButton, contentArea);
        }
    }

    console.log("✅ [CARDS-CONDICIONAIS] Botão voltar controlado");
}

/**
 * Interceptar navegação para controlar botão voltar
 */
function interceptarNavegacao() {
    // Observar mudanças nas telas
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (
                mutation.type === "attributes" &&
                mutation.attributeName === "style"
            ) {
                const target = mutation.target;

                // Se tela principal ficou visível, garantir que não tenha botão voltar
                if (
                    target.id === "main-screen" &&
                    target.style.display !== "none"
                ) {
                    const backButton = target.querySelector(".back-button");
                    if (backButton) {
                        backButton.remove();
                    }
                }

                // Se tela secundária ficou ativa, garantir que tenha botão voltar
                if (
                    target.id === "secondary-screen" &&
                    target.classList.contains("active")
                ) {
                    let backButton = target.querySelector(".back-button");
                    if (!backButton) {
                        controlarBotaoVoltar();
                    }
                }
            }
        });
    });

    // Observar ambas as telas
    const mainScreen = document.getElementById("main-screen");
    const secondaryScreen = document.getElementById("secondary-screen");

    if (mainScreen) {
        observer.observe(mainScreen, { attributes: true });
    }

    if (secondaryScreen) {
        observer.observe(secondaryScreen, {
            attributes: true,
            attributeFilter: ["class"],
        });
    }
}

/**
 * Melhorar experiência visual dos cards
 */
function melhorarExperienciaCards() {
    // Adicionar efeito de loading nos cards
    const cards = document.querySelectorAll(".module-card:not(.disabled)");

    cards.forEach((card, index) => {
        // Animação de entrada escalonada
        card.style.animationDelay = `${index * 100}ms`;
        card.style.animation = "cardEntrance 0.6s ease forwards";

        // Efeito de hover melhorado
        card.addEventListener("mouseenter", () => {
            card.style.transform = "translateY(-8px) scale(1.02)";
            card.style.boxShadow = "0 20px 40px rgba(255, 69, 0, 0.3)";
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "translateY(0) scale(1)";
            card.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.3)";
        });
    });
}

/**
 * Adicionar animações CSS dinamicamente
 */
function adicionarAnimacoes() {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes cardEntrance {
            from {
                opacity: 0;
                transform: translateY(30px) scale(0.9);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .module-card {
            opacity: 0;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Inicializar sistema quando DOM estiver pronto
 */
function inicializar() {
    console.log("🚀 [CARDS-CONDICIONAIS] Inicializando...");

    try {
        // Aplicar configurações visuais
        aplicarConfiguracaoCards();

        // Configurar navegação condicional
        aplicarNavegacaoCondicional();

        // Controlar botão voltar
        controlarBotaoVoltar();

        // Interceptar navegação para controle dinâmico
        interceptarNavegacao();

        // Melhorar experiência visual
        adicionarAnimacoes();
        setTimeout(melhorarExperienciaCards, 100);

        console.log(
            "✅ [CARDS-CONDICIONAIS] Sistema inicializado com UX melhorado",
        );
    } catch (error) {
        console.error("❌ [CARDS-CONDICIONAIS] Erro na inicialização:", error);
    }
}

/**
 * API pública do módulo
 */
window.cardsCondicionais = {
    aplicarConfiguracao: aplicarConfiguracaoCards,
    isModuleDisabled: isModuleDisabled,
    verificarBloqueado: verificarCardBloqueado,
    controlarBotaoVoltar: controlarBotaoVoltar,
    melhorarUX: melhorarExperienciaCards,
    CARDS_CONFIG: CARDS_CONFIG,
};

// Auto-inicialização
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        // Aguardar um pouco para outros scripts carregarem
        setTimeout(inicializar, 150);
    });
} else {
    // DOM já carregado
    setTimeout(inicializar, 150);
}

console.log("✅ [CARDS-CONDICIONAIS] Módulo carregado");
