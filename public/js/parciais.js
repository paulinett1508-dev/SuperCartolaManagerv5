// =====================================================================
// MÓDULO PARCIAIS - v3.0 (Temporada Encerrada)
// public/js/parciais.js
// =====================================================================

console.log("[PARCIAIS] Módulo v3.0 carregando...");

// =====================================================================
// INICIALIZAÇÃO - SEM CHAMADAS DE API
// =====================================================================
export async function inicializarParciais() {
    console.log("[PARCIAIS] Temporada 2025 encerrada - módulo em modo standby");

    // Parar scheduler se estiver rodando
    if (window.ParciaisScheduler?.parar) {
        window.ParciaisScheduler.parar();
        console.log("[PARCIAIS] Scheduler desativado");
    }

    console.log("[PARCIAIS] Módulo inicializado (sem chamadas de API)");
}

// Funções vazias para compatibilidade
function carregarParciais() {
    console.log("[PARCIAIS] Temporada encerrada - função desabilitada");
}

function atualizarParciais() {
    console.log("[PARCIAIS] Temporada encerrada - função desabilitada");
}

// Expor globalmente
window.carregarParciais = carregarParciais;
window.atualizarParciais = atualizarParciais;
window.inicializarParciais = inicializarParciais;

console.log("[PARCIAIS] Módulo v3.0 carregado - Temporada 2025 encerrada");
