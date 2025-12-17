// =============================================================================
// PARTICIPANTE-UTILS.JS - Funções utilitárias para o App do Participante
// =============================================================================

/**
 * Formata um número como moeda brasileira (R$ 1.234,56)
 * @param {number|string} valor - Valor a formatar
 * @param {boolean} incluirSimbolo - Se deve incluir "R$ " (default: true)
 * @returns {string} Valor formatado
 */
function formatarMoedaBR(valor, incluirSimbolo = true) {
    const num = parseFloat(valor) || 0;
    const abs = Math.abs(num);

    const formatted = abs.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    let resultado = incluirSimbolo ? `R$ ${formatted}` : formatted;

    if (num < 0) {
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
function parseMoedaBR(valor) {
    if (typeof valor === "number") return valor;
    if (!valor) return 0;

    let str = String(valor)
        .replace(/R\$\s*/gi, "")
        .replace(/\s/g, "")
        .trim();

    if (str.includes(",")) {
        str = str.replace(/\./g, "").replace(",", ".");
    }

    return parseFloat(str) || 0;
}

// Disponibilizar globalmente
window.formatarMoedaBR = formatarMoedaBR;
window.parseMoedaBR = parseMoedaBR;
