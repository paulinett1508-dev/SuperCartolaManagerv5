
// === SISTEMA DE CARDS CONDICIONAIS ===
// Sistema para desabilitar cards específicos baseado na liga atual

/**
 * Configuração dos cards por liga
 */
const CARDS_CONFIG = {
    // Super Cartola 2025 - Desabilitar Prêmios
    "684cb1c8af923da7c7df51de": {
        disabled: ["premios"],
        reason: "Prêmios não se aplicam a esta liga"
    },
    
    // Cartoleiros do Sobral - Desabilitar Competições  
    "684d821cf1a7ae16d1f89572": {
        disabled: ["competicoes"],
        reason: "Competições não se aplicam a esta liga"
    }
};

/**
 * Aplicar configurações condicionais baseadas na liga
 */
function aplicarConfiguracaoCards() {
    console.log("🎛️ [CARDS] Aplicando configuração condicional...");
    
    try {
        // Obter ID da liga atual
        const urlParams = new URLSearchParams(window.location.search);
        const ligaId = urlParams.get("id");
        
        if (!ligaId) {
            console.warn("⚠️ [CARDS] ID da liga não encontrado");
            return;
        }
        
        console.log(`🎯 [CARDS] Liga atual: ${ligaId}`);
        
        // Verificar se há configuração para esta liga
        const config = CARDS_CONFIG[ligaId];
        
        if (!config) {
            console.log("✅ [CARDS] Nenhuma restrição para esta liga");
            return;
        }
        
        // Aplicar desabilitações
        config.disabled.forEach(moduleId => {
            const card = document.querySelector(`[data-module="${moduleId}"]`);
            
            if (card) {
                // Adicionar classe desabilitada
                card.classList.add('disabled');
                
                // Remover event listeners existentes clonando o elemento
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);
                
                console.log(`🚫 [CARDS] Card "${moduleId}" desabilitado`);
            } else {
                console.warn(`⚠️ [CARDS] Card "${moduleId}" não encontrado`);
            }
        });
        
        console.log(`✅ [CARDS] Configuração aplicada: ${config.disabled.length} cards desabilitados`);
        
    } catch (error) {
        console.error("❌ [CARDS] Erro ao aplicar configuração:", error);
    }
}

/**
 * Verificar se um módulo está desabilitado
 */
function isModuleDisabled(moduleId) {
    const urlParams = new URLSearchParams(window.location.search);
    const ligaId = urlParams.get("id");
    
    const config = CARDS_CONFIG[ligaId];
    return config && config.disabled.includes(moduleId);
}

/**
 * Override do sistema de navegação para verificar cards desabilitados
 */
function initializeConditionalNavigation() {
    console.log("🧭 [CARDS] Inicializando navegação condicional...");
    
    const cards = document.querySelectorAll(".module-card");
    const items = document.querySelectorAll(".module-items li[data-action]");
    
    // Cards principais com verificação condicional
    cards.forEach((card) => {
        const moduleId = card.dataset.module;
        
        // Verificar se está desabilitado
        if (isModuleDisabled(moduleId)) {
            card.classList.add('disabled');
            return; // Não adicionar event listener
        }
        
        // Event listener normal para cards ativos
        card.addEventListener("click", async (e) => {
            if (card.classList.contains('disabled')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // Lógica original mantida
            if (window.processingModule) return;
            
            card.style.transform = "translateY(-1px) scale(0.98)";
            setTimeout(() => {
                card.style.transform = "";
            }, 150);
            
            if (moduleId === "participantes") {
                await window.showParticipantes();
            } else {
                const firstAction = card.querySelector("li[data-action]");
                if (firstAction && window.executeAction) {
                    await window.executeAction(firstAction.dataset.action);
                }
            }
        });
    });
    
    // Items específicos com verificação
    items.forEach((item) => {
        const parentCard = item.closest('.module-card');
        const moduleId = parentCard?.dataset.module;
        
        if (isModuleDisabled(moduleId)) {
            return; // Não adicionar event listener
        }
        
        item.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (window.processingModule) return;
            
            item.style.opacity = "0.6";
            setTimeout(() => {
                item.style.opacity = "";
            }, 150);
            
            if (window.executeAction) {
                await window.executeAction(item.dataset.action);
            }
        });
    });
    
    console.log("✅ [CARDS] Navegação condicional inicializada");
}

/**
 * Integração com o sistema existente
 */
function integrarSistemaCondicional() {
    console.log("🔧 [CARDS] Integrando sistema condicional...");
    
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                aplicarConfiguracaoCards();
                initializeConditionalNavigation();
            }, 500);
        });
    } else {
        setTimeout(() => {
            aplicarConfiguracaoCards();
            initializeConditionalNavigation();
        }, 500);
    }
}

/**
 * Expor funções globalmente para compatibilidade
 */
window.cardsCondicionais = {
    aplicarConfiguracao: aplicarConfiguracaoCards,
    isModuleDisabled: isModuleDisabled,
    initializeNavigation: initializeConditionalNavigation,
    config: CARDS_CONFIG
};

// Inicializar automaticamente
integrarSistemaCondicional();

console.log("✅ [CARDS] Sistema condicional carregado");
