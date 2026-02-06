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

/**
 * Trunca pontos para 2 casas decimais (não arredonda) e formata em pt-BR
 * @param {number|string} valor - Valor a truncar
 * @returns {string} Valor truncado formatado (ex: "123,45")
 */
function truncarPontos(valor) {
    const num = parseFloat(valor) || 0;
    // Trunca para 2 casas decimais (não arredonda)
    const truncado = Math.floor(num * 100) / 100;
    return truncado.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Formata pontos com 2 casas decimais (com arredondamento) em pt-BR
 * @param {number|string} valor - Valor a formatar
 * @returns {string} Valor formatado (ex: "123,46")
 */
function formatarPontos(valor) {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Disponibilizar globalmente
window.formatarMoedaBR = formatarMoedaBR;
window.parseMoedaBR = parseMoedaBR;
window.truncarPontos = truncarPontos;
window.formatarPontos = formatarPontos;
