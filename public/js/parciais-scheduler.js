// =====================================================================
// PARCIAIS-SCHEDULER - v2.0 (Temporada Encerrada - Desativado)
// public/js/parciais-scheduler.js
// =====================================================================

console.log("[PARCIAIS-SCHEDULER] Módulo v2.0 - Temporada encerrada");

// Scheduler desativado - apenas stub para compatibilidade
window.ParciaisScheduler = {
    iniciar: function () {
        console.log(
            "[PARCIAIS-SCHEDULER] Temporada encerrada - scheduler desativado",
        );
    },
    parar: function () {
        console.log("[PARCIAIS-SCHEDULER] Scheduler já está parado");
    },
    forcarAtualizacao: function () {
        console.log(
            "[PARCIAIS-SCHEDULER] Temporada encerrada - função desabilitada",
        );
    },
    getStatus: function () {
        return {
            ativo: false,
            motivo: "Temporada 2025 encerrada",
            rodada: 38,
            status: "finalizado",
        };
    },
};

console.log("[PARCIAIS-SCHEDULER] Stub carregado - aguardando nova temporada");
