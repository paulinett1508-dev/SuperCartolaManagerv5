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

/**
 * Calcula a última rodada efetivamente disputada baseado no status do mercado
 *
 * IMPORTANTE: A rodada_atual do Cartola representa a PRÓXIMA rodada quando
 * o mercado está aberto, não a última disputada.
 *
 * @param {number} rodadaMercado - Rodada atual retornada pela API do Cartola
 * @param {number|string} statusMercado - Status do mercado (1=aberto, 2=fechado, etc)
 * @returns {number} Última rodada com dados de escalação/pontuação disponíveis
 *
 * Lógica:
 * - status_mercado = 1 (ABERTO): Jogos ainda não começaram, última disputada = rodada - 1
 * - status_mercado = 2 (FECHADO): Jogos em andamento ou finalizados, usa rodada atual
 * - status_mercado = 3 (DESBLOQUEADO): Mercado reaberto, mesma lógica de aberto
 * - status_mercado = 4 (ENCERRADO): Rodada consolidada, usa rodada atual
 * - status_mercado = 6 (TEMPORADA_ENCERRADA): Usa rodada atual (última do campeonato)
 */
function obterUltimaRodadaDisputada(rodadaMercado, statusMercado) {
    const rodada = parseInt(rodadaMercado) || 1;
    const status = parseInt(statusMercado) || 1;

    // Mercado aberto (1) ou desbloqueado (3) = jogos ainda não começaram
    // A rodada_atual é a PRÓXIMA a ser disputada
    if (status === 1 || status === 3) {
        return Math.max(1, rodada - 1);
    }

    // Mercado fechado (2), encerrado (4) ou temporada encerrada (6)
    // A rodada atual está em andamento ou já foi disputada
    return rodada;
}

/**
 * Verifica se o mercado está aberto (aceitando escalações)
 * @param {number|string} statusMercado - Status do mercado
 * @returns {boolean} true se mercado está aberto
 */
function isMercadoAberto(statusMercado) {
    const status = parseInt(statusMercado) || 0;
    return status === 1 || status === 3; // ABERTO ou DESBLOQUEADO
}

/**
 * Verifica se há jogos em andamento (parciais disponíveis)
 * @param {number|string} statusMercado - Status do mercado
 * @returns {boolean} true se jogos estão rolando
 */
function isJogosEmAndamento(statusMercado) {
    const status = parseInt(statusMercado) || 0;
    return status === 2; // FECHADO = jogos em andamento
}

// Disponibilizar globalmente
window.formatarMoedaBR = formatarMoedaBR;
window.parseMoedaBR = parseMoedaBR;
window.truncarPontos = truncarPontos;
window.formatarPontos = formatarPontos;
window.obterUltimaRodadaDisputada = obterUltimaRodadaDisputada;
window.isMercadoAberto = isMercadoAberto;
window.isJogosEmAndamento = isJogosEmAndamento;
