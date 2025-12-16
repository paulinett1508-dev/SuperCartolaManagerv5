// === CARDS-CONDICIONAIS.JS v2.0 ===
// ✅ v2.0: Refatorado para SaaS - busca config do servidor via API
// Sistema de desativação condicional de cards por liga

console.log("[CARDS-CONDICIONAIS] v2.0 SaaS - Carregando sistema...");

// === CACHE DE CONFIG DA LIGA ===
let ligaConfigCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obter ID da liga atual da URL
 */
function getLigaIdAtual() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
}

/**
 * Buscar configuração da liga do servidor (v2.0 SaaS)
 */
async function fetchLigaConfig(ligaId) {
    // Verificar cache
    if (ligaConfigCache && Date.now() - cacheTimestamp < CACHE_TTL) {
        return ligaConfigCache;
    }

    try {
        const response = await fetch(`/api/ligas/${ligaId}/configuracoes`);
        if (!response.ok) return null;

        const data = await response.json();
        if (data.success) {
            ligaConfigCache = data;
            cacheTimestamp = Date.now();
            console.log(`[CARDS-CONDICIONAIS] Config carregada para ${data.liga_nome}`);
            return data;
        }
    } catch (error) {
        console.warn("[CARDS-CONDICIONAIS] Erro ao buscar config:", error.message);
    }

    return null;
}

/**
 * Verificar se um módulo está desabilitado para a liga atual (async)
 */
async function isModuleDisabledAsync(moduleId) {
    const ligaId = getLigaIdAtual();
    if (!ligaId) return false;

    const config = await fetchLigaConfig(ligaId);
    if (!config) return false;

    // Verificar em cards_desabilitados (array de IDs de cards)
    const cardsDesabilitados = config.cards_desabilitados || [];
    if (cardsDesabilitados.includes(moduleId)) {
        return true;
    }

    // Verificar em modulos_ativos (se habilitado = false)
    const moduloKey = moduleId.replace(/-/g, '_').replace(/([A-Z])/g, '_$1').toLowerCase();
    const moduloCamel = moduleId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

    const modulos = config.modulos_ativos || {};
    if (modulos[moduloCamel] === false || modulos[moduloKey] === false) {
        return true;
    }

    return false;
}

/**
 * Verificar se um módulo está desabilitado (sync - usa cache)
 */
function isModuleDisabled(moduleId) {
    if (!ligaConfigCache) return false;

    const cardsDesabilitados = ligaConfigCache.cards_desabilitados || [];
    return cardsDesabilitados.includes(moduleId);
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
 * Aplicar configurações condicionais baseadas na liga (v2.0 - async)
 */
async function aplicarConfiguracaoCards() {
    console.log("[CARDS-CONDICIONAIS] Aplicando configuração dinâmica...");

    try {
        const ligaId = getLigaIdAtual();

        if (!ligaId) {
            console.warn("[CARDS-CONDICIONAIS] ID da liga não encontrado");
            return;
        }

        console.log(`[CARDS-CONDICIONAIS] Liga atual: ${ligaId}`);

        // v2.0: Buscar configuração do servidor
        const config = await fetchLigaConfig(ligaId);

        if (!config) {
            console.log("[CARDS-CONDICIONAIS] Config não encontrada - usando padrão (sem restrições)");
            return;
        }

        // Obter lista de cards desabilitados da config
        const cardsDesabilitados = config.cards_desabilitados || [];

        // Também verificar modulos_ativos para detectar módulos desativados
        const modulos = config.modulos_ativos || {};
        const modulosDesabilitados = Object.entries(modulos)
            .filter(([_, enabled]) => enabled === false)
            .map(([key]) => key.replace(/([A-Z])/g, '-$1').toLowerCase());

        // Unir listas sem duplicatas
        const todosDesabilitados = [...new Set([...cardsDesabilitados, ...modulosDesabilitados])];

        if (todosDesabilitados.length === 0) {
            console.log("[CARDS-CONDICIONAIS] Nenhuma restrição para esta liga");
            return;
        }

        // Aplicar desabilitações
        todosDesabilitados.forEach((moduleId) => {
            const card = document.querySelector(`[data-module="${moduleId}"]`);

            if (card) {
                aplicarEstadoDesabilitado(card, moduleId);
            } else {
                console.log(`[CARDS-CONDICIONAIS] Card "${moduleId}" não encontrado no DOM`);
            }
        });

        console.log(`[CARDS-CONDICIONAIS] ${todosDesabilitados.length} cards desabilitados`);
    } catch (error) {
        console.error("[CARDS-CONDICIONAIS] Erro ao aplicar configuração:", error);
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

// =============================================
// ✅ FUNÇÃO VOLTAR UNIVERSAL - CORRIGIDA
// =============================================

/**
 * Função universal para voltar aos cards de módulos
 * Funciona para TODOS os módulos (Rodadas, Melhor do Mês, etc.)
 */
function voltarParaCards() {
    console.log("[CARDS-CONDICIONAIS] Executando voltarParaCards universal...");

    const mainScreen = document.getElementById("main-screen");
    const secondaryScreen = document.getElementById("secondary-screen");

    // Esconder tela secundária
    if (secondaryScreen) {
        secondaryScreen.classList.remove("active");
        secondaryScreen.style.display = "none";
    }

    // Mostrar tela principal com cards
    if (mainScreen) {
        mainScreen.classList.add("active");
        mainScreen.style.display = "block";
    }

    // Limpar conteúdo dinâmico para evitar conflitos ao recarregar
    const dynamicContent = document.getElementById("dynamic-content-area");
    if (dynamicContent) {
        // Não limpar - preservar estado do módulo
    }

    // ✅ COMPATIBILIDADE: Também esconder elementos específicos de módulos
    // Rodadas
    const rodadaContentSection = document.getElementById(
        "rodadaContentSection",
    );
    const rodadasCards = document.getElementById("rodadasCards");
    const relatorioMitosMicos = document.getElementById("relatorioMitosMicos");

    if (rodadaContentSection) rodadaContentSection.style.display = "none";
    if (relatorioMitosMicos) relatorioMitosMicos.style.display = "none";
    if (rodadasCards && rodadasCards.parentElement) {
        rodadasCards.parentElement.style.display = "block";
    }

    console.log("✅ [CARDS-CONDICIONAIS] Voltou para visualização de cards");
}

// ✅ REGISTRAR GLOBALMENTE IMEDIATAMENTE
window.voltarParaCards = voltarParaCards;

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
        backButton.onclick = voltarParaCards; // ✅ Usar função direta

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
            if (
                mutation.type === "attributes" &&
                mutation.attributeName === "class"
            ) {
                const target = mutation.target;

                if (
                    target.id === "secondary-screen" &&
                    target.classList.contains("active")
                ) {
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
        card.classList.add("card-animated");
        card.style.setProperty("--card-delay", `${index * 50}ms`);
    });
}

/**
 * Adicionar animações CSS otimizadas
 */
function adicionarAnimacoes() {
    // Verificar se já existe para evitar duplicação
    if (document.getElementById("cards-animations")) return;

    const style = document.createElement("style");
    style.id = "cards-animations";
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
 * Inicializar sistema quando DOM estiver pronto (v2.0 - async)
 */
async function inicializar() {
    console.log("[CARDS-CONDICIONAIS] Inicializando v2.0 SaaS...");

    try {
        // Garantir que voltarParaCards está disponível globalmente
        window.voltarParaCards = voltarParaCards;

        // v2.0: Aplicar configurações visuais (agora async)
        await aplicarConfiguracaoCards();

        // Configurar navegação condicional
        aplicarNavegacaoCondicional();

        // Controlar botão voltar
        controlarBotaoVoltar();

        // Interceptar navegação para controle dinâmico
        interceptarNavegacao();

        // Melhorar experiência visual
        adicionarAnimacoes();
        setTimeout(melhorarExperienciaCards, 100);

        console.log("[CARDS-CONDICIONAIS] Sistema v2.0 inicializado");
    } catch (error) {
        console.error("[CARDS-CONDICIONAIS] Erro na inicialização:", error);
    }
}

/**
 * API pública do módulo (v2.0 SaaS)
 */
window.cardsCondicionais = {
    aplicarConfiguracao: aplicarConfiguracaoCards,
    isModuleDisabled: isModuleDisabled,
    isModuleDisabledAsync: isModuleDisabledAsync,
    verificarBloqueado: verificarCardBloqueado,
    controlarBotaoVoltar: controlarBotaoVoltar,
    voltarParaCards: voltarParaCards,
    melhorarUX: melhorarExperienciaCards,
    fetchLigaConfig: fetchLigaConfig,
    getLigaConfigCache: () => ligaConfigCache,
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

console.log("[CARDS-CONDICIONAIS] Módulo v2.0 SaaS carregado");
