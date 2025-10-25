// FLUXO-FINANCEIRO-UTILS.JS - Utilitários
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