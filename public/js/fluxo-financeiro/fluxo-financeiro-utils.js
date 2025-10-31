// FLUXO-FINANCEIRO-UTILS.JS - Utilitários e Constantes

// ===== CONSTANTES DE IDENTIFICAÇÃO =====
export const ID_SUPERCARTOLA_2025 = "684cb1c8af923da7c7df51de";
export const ID_CARTOLEIROS_SOBRAL = "684d821cf1a7ae16d1f89572";
export const RODADA_INICIAL_PONTOS_CORRIDOS = 7; // Pontos Corridos começam na rodada 7

// NOTA: Os valores de bônus/ônus por posição estão em ../rodadas/rodadas-config.js
// e são importados corretamente pelo fluxo-financeiro-core.js

// ===== FUNÇÃO PARA NORMALIZAR IDS =====
export function normalizarTimeId(timeId) {
    if (!timeId) return null;
    return String(timeId).trim();
}

// ===== FUNÇÃO PARA GERAR RANKING SIMULADO =====
export function gerarRankingSimulado(rodada, participantes) {
    if (!Array.isArray(participantes) || participantes.length === 0) {
        return [];
    }

    return participantes.map((p, index) => {
        const timeId = normalizarTimeId(p.time_id || p.timeId || p.id);
        return {
            timeId: timeId,
            time_id: timeId,
            id: timeId,
            posicao: index + 1,
            pontos: 0,
            patrimonio: 0,
            rodada: rodada,
            nome_cartola: p.nome_cartola || "N/D",
            nome_time: p.nome_time || "Time S/ Nome",
            clube_id: p.clube_id,
            url_escudo_png: p.url_escudo_png,
            escudo_url: p.escudo_url,
        };
    });
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
        return function (...args) {
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
