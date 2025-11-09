// === CARDS-CONDICIONAIS.JS ===
// Sistema de desativação condicional de cards por liga

console.log("🎛️ [CARDS-CONDICIONAIS] Carregando sistema...");

// === CONFIGURAÇÕES POR LIGA ===
const CARDS_CONFIG = {
    // Super Cartola 2025 - Desabilitar Prêmios individuais
    "684cb1c8af923da7c7df51de": {
        disabled: ["luva-de-ouro", "artilheiro-campeao"],
        reason: "Prêmios não se aplicam a esta liga",
    },

    // Cartoleiros do Sobral - Desabilitar Competições individuais e Melhor do Mês
    "684d821cf1a7ae16d1f89572": {
        disabled: ["mata-mata", "pontos-corridos", "melhor-mes"],
        reason: "Competições não se aplicam a esta liga",
    },

    // Configurações adicionais podem ser adicionadas aqui
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
 * Interceptar navegação - OTIMIZADO
 */
function interceptarNavegacao() {
    // Usar event delegation ao invés de observers para melhor performance
    const mainScreen = document.getElementById("main-screen");
    const secondaryScreen = document.getElementById("secondary-screen");

    if (!mainScreen || !secondaryScreen) return;

    // Observer simplificado apenas para mudanças de classe
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "attributes" && mutation.attributeName === "class") {
                const target = mutation.target;
                
                if (target.id === "secondary-screen" && target.classList.contains("active")) {
                    requestAnimationFrame(() => {
                        if (!target.querySelector(".back-button")) {
                            controlarBotaoVoltar();
                        }
                    });
                }
            }
        }
    });

    // Observar apenas o necessário
    observer.observe(secondaryScreen, {
        attributes: true,
        attributeFilter: ["class"],
    });
}

/**
 * Melhorar experiência visual dos cards - OTIMIZADO
 */
function melhorarExperienciaCards() {
    const cards = document.querySelectorAll(".module-card:not(.disabled)");
    
    // Usar CSS classes ao invés de inline styles para melhor performance
    cards.forEach((card, index) => {
        card.classList.add('card-animated');
        card.style.setProperty('--card-delay', `${index * 50}ms`);
    });
}

/**
 * Adicionar animações CSS otimizadas
 */
function adicionarAnimacoes() {
    // Verificar se já existe para evitar duplicação
    if (document.getElementById('cards-animations')) return;
    
    const style = document.createElement("style");
    style.id = 'cards-animations';
    style.textContent = `
        @keyframes cardEntrance {
            from {
                opacity: 0;
                transform: translateY(15px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .card-animated {
            animation: cardEntrance 0.3s ease-out forwards;
            animation-delay: var(--card-delay, 0ms);
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