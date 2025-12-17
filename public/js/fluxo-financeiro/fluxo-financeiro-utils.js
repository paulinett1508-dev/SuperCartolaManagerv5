// FLUXO-FINANCEIRO-UTILS.JS v2.1.0 - Utilitarios e Constantes
// ✅ v2.1.0: Funções globais de formatação de moeda brasileira
// ✅ v2.0.0: Preparado para SaaS Multi-Tenant

// ===== CONSTANTES DE IDENTIFICACAO (FALLBACK) =====
// NOTA: Estas constantes sao mantidas para compatibilidade.
// O sistema agora busca configs de /api/ligas/:id/configuracoes
// Use fetchLigaConfig() de rodadas-config.js para configs dinamicas.
export const ID_SUPERCARTOLA_2025 = "684cb1c8af923da7c7df51de";
export const ID_CARTOLEIROS_SOBRAL = "684d821cf1a7ae16d1f89572";
export const RODADA_INICIAL_PONTOS_CORRIDOS = 7;

// NOTA: Os valores de bonus/onus por posicao estao em ../rodadas/rodadas-config.js
// Use getBancoPorRodadaAsync() para valores dinamicos do banco

// =============================================================================
// FUNÇÕES GLOBAIS DE FORMATAÇÃO DE MOEDA BRASILEIRA
// =============================================================================

/**
 * Formata um número como moeda brasileira (R$ 1.234,56)
 * @param {number|string} valor - Valor a formatar
 * @param {boolean} incluirSimbolo - Se deve incluir "R$ " (default: true)
 * @param {boolean} incluirSinal - Se deve incluir +/- (default: false)
 * @returns {string} Valor formatado
 */
export function formatarMoedaBR(valor, incluirSimbolo = true, incluirSinal = false) {
    const num = parseFloat(valor) || 0;
    const abs = Math.abs(num);

    const formatted = abs.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    let resultado = incluirSimbolo ? `R$ ${formatted}` : formatted;

    if (incluirSinal && num !== 0) {
        resultado = (num > 0 ? "+" : "-") + resultado;
    } else if (num < 0 && !incluirSinal) {
        resultado = "-" + resultado;
    }

    return resultado;
}

/**
 * Converte string de moeda brasileira para número
 * Aceita formatos: "1.234,56", "R$ 1.234,56", "1234.56", "1234,56"
 * @param {string} valor - String a converter
 * @returns {number} Valor numérico
 */
export function parseMoedaBR(valor) {
    if (typeof valor === "number") return valor;
    if (!valor) return 0;

    // Remove R$, espaços e pontos de milhar
    let str = String(valor)
        .replace(/R\$\s*/gi, "")
        .replace(/\s/g, "")
        .trim();

    // Se tem vírgula como decimal (formato BR), converte
    if (str.includes(",")) {
        // Remove pontos de milhar e troca vírgula por ponto
        str = str.replace(/\./g, "").replace(",", ".");
    }

    return parseFloat(str) || 0;
}

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
        return formatarMoedaBR(valor, false, false);
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
    window.formatarMoedaBR = formatarMoedaBR;
    window.parseMoedaBR = parseMoedaBR;
}
