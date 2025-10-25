// FLUXO-FINANCEIRO-UTILS.JS - Utilitários e Constantes

// ===== CONSTANTES DE IDENTIFICAÇÃO =====
export const ID_SUPERCARTOLA_2025 = "684cb1c8af923da7c7df51de";
export const ID_CARTOLEIROS_SOBRAL = "684d821cf1a7ae16d1f89572";
export const RODADA_INICIAL_PONTOS_CORRIDOS = 23;

// ===== VALORES DE BÔNUS/ÔNUS =====
export const valoresRodadaPadrao = {
    1: 15, 2: 5, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0,
    11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0,
    21: 0, 22: 0, 23: 0, 24: 0, 25: 0, 26: 0, 27: 0, 28: 0, 29: 0, 30: 0,
    31: 0, 32: -15
};

export const valoresRodadaCartoleirosSobral = {
    1: 10, 2: 0, 3: 0, 4: 0, 5: 0, 6: -10
};

// ===== FUNÇÃO PARA NORMALIZAR IDS =====
export function normalizarTimeId(timeId) {
    if (!timeId) return null;
    return String(timeId).trim();
}

export class FluxoFinanceiroUtils {
    constructor() {
        this.debounce = this.debounce.bind(this);
        this.throttle = this.throttle.bind(this);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    formatarMoeda(valor) {
        const num = parseFloat(valor) || 0;
        return num.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    formatarData(data) {
        if (!data) return "-";
        const d = new Date(data);
        return d.toLocaleDateString("pt-BR");
    }
}

// Disponibilizar globalmente
if (typeof window !== "undefined") {
    window.FluxoFinanceiroUtils = FluxoFinanceiroUtils;
}