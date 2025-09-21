// ==============================
// CONFIGURAÇÕES E CONSTANTES
// ==============================

// Mapeamento de Posição -> Valor do Banco (Padrão)
export const valoresRodadaPadrao = {
    1: 20.0,
    2: 19.0,
    3: 18.0,
    4: 17.0,
    5: 16.0,
    6: 15.0,
    7: 14.0,
    8: 13.0,
    9: 12.0,
    10: 11.0,
    11: 10.0,
    22: -10.0,
    23: -11.0,
    24: -12.0,
    25: -13.0,
    26: -14.0,
    27: -15.0,
    28: -16.0,
    29: -17.0,
    30: -18.0,
    31: -19.0,
    32: -20.0,
};

// Valores específicos para a liga Cartoleiros Sobral 2025
export const valoresRodadaCartoleirosSobral = {
    1: 7.0, // MITO: ganha R$ 7,00
    2: 4.0, // G2: ganha R$ 4,00
    3: 0.0, // 3º: valor neutro (0)
    4: -2.0, // 4º: perde R$ -2,00
    5: -5.0, // 5º: perde R$ -5,00
    6: -10.0, // MICO: perde R$ -10,00
};

// Valores padronizados para Mata-Mata
export const VALOR_VITORIA_MATA_MATA = 10.0; // R$ 10,00 para vitória
export const VALOR_DERROTA_MATA_MATA = -10.0; // R$ -10,00 para derrota

// Constantes para Pontos Corridos
export const RODADA_INICIAL_PONTOS_CORRIDOS = 7; // Primeira rodada dos pontos corridos

// IDs das ligas especiais
export const ID_SUPERCARTOLA_2025 = "684cb1c8af923da7c7df51de";
export const ID_CARTOLEIROS_SOBRAL = "684d821cf1a7ae16d1f89572";

// ==============================
// FUNÇÕES UTILITÁRIAS
// ==============================

/**
 * Formata valor monetário para exibição
 * @param {number} valor - Valor a ser formatado
 * @returns {string} - Valor formatado
 */
export function formatarMoeda(valor) {
    if (typeof valor !== "number") return "R$ 0,00";
    return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

/**
 * Calcula saldo acumulado de um array de rodadas
 * @param {Array} rodadas - Array de rodadas com valores
 * @returns {number} - Saldo acumulado
 */
export function calcularSaldoAcumulado(rodadas) {
    return rodadas.reduce((acumulado, rodada) => {
        const valorRodada =
            (rodada.bonusOnus || 0) +
            (rodada.pontosCorridos || 0) +
            (rodada.mataMata || 0) +
            (rodada.melhorMes || 0);
        return acumulado + valorRodada;
    }, 0);
}

/**
 * Gera ranking simulado para desenvolvimento/teste
 * @param {number} rodada - Número da rodada
 * @param {Array} participantes - Array de participantes
 * @returns {Array} - Ranking simulado
 */
export function gerarRankingSimulado(rodada, participantes) {
    if (!participantes || participantes.length === 0) {
        return [];
    }

    return participantes
        .map((p) => {
            const pontos = Math.random() * 90 + 30;
            return {
                time_id: p.time_id,
                timeId: p.time_id,
                nome_cartola: p.nome_cartola,
                nome_time: p.nome_time,
                clube_id: p.clube_id,
                pontos: pontos.toFixed(2),
                rodada: rodada,
            };
        })
        .sort((a, b) => b.pontos - a.pontos);
}

/**
 * Normaliza IDs de times para string
 * @param {*} timeId - ID do time em qualquer formato
 * @returns {string} - ID normalizado como string
 */
export function normalizarTimeId(timeId) {
    return String(timeId || "");
}

/**
 * Verifica se uma rodada é válida
 * @param {number} rodada - Número da rodada
 * @param {number} ultimaRodadaCompleta - Última rodada completa
 * @returns {boolean} - True se a rodada é válida
 */
export function isRodadaValida(rodada, ultimaRodadaCompleta) {
    return rodada >= 1 && rodada <= ultimaRodadaCompleta;
}

/**
 * Converte número para ordinal (1º, 2º, 3º, etc.)
 * @param {number} numero - Número a ser convertido
 * @returns {string} - Número ordinal
 */
export function numeroParaOrdinal(numero) {
    if (typeof numero !== "number" || numero < 1) return "";
    return `${numero}º`;
}

/**
 * Calcula diferença de pontos entre dois valores
 * @param {number} pontosA - Pontos do time A
 * @param {number} pontosB - Pontos do time B
 * @returns {number} - Diferença absoluta
 */
export function calcularDiferencaPontos(pontosA, pontosB) {
    return Math.abs(pontosA - pontosB);
}

/**
 * Verifica se é empate técnico (diferença ≤ 0.3)
 * @param {number} pontosA - Pontos do time A
 * @param {number} pontosB - Pontos do time B
 * @returns {boolean} - True se é empate técnico
 */
export function isEmpateTecnico(pontosA, pontosB) {
    return calcularDiferencaPontos(pontosA, pontosB) <= 0.3;
}

/**
 * Verifica se é goleada (diferença ≥ 50 pontos)
 * @param {number} pontosA - Pontos do time A
 * @param {number} pontosB - Pontos do time B
 * @returns {boolean} - True se é goleada
 */
export function isGoleada(pontosA, pontosB) {
    return calcularDiferencaPontos(pontosA, pontosB) >= 50;
}

/**
 * Formata nome do participante
 * @param {Object} participante - Dados do participante
 * @returns {string} - Nome formatado
 */
export function formatarNomeParticipante(participante) {
    if (!participante) return "N/D";

    const nomeCartola =
        participante.nome_cartola || participante.nome_cartoleiro;
    const nomeTime = participante.nome_time;

    if (nomeCartola && nomeCartola !== "N/D") {
        return nomeCartola;
    }

    if (nomeTime && nomeTime !== "Time S/ Nome") {
        return nomeTime;
    }

    return "Participante S/ Nome";
}

/**
 * Gera cor baseada na posição
 * @param {number} posicao - Posição do time
 * @param {number} totalTimes - Total de times
 * @returns {string} - Cor CSS
 */
export function gerarCorPosicao(posicao, totalTimes) {
    if (posicao === 1) return "#28a745"; // Verde - MITO
    if (posicao === totalTimes) return "#dc3545"; // Vermelho - MICO
    if (posicao <= 11) return "#007bff"; // Azul - Top 11
    if (posicao >= 22 && posicao <= 32) return "#fd7e14"; // Laranja - Z22-32
    return "#6c757d"; // Cinza - Meio da tabela
}

/**
 * Valida se um valor é numérico
 * @param {*} valor - Valor a ser validado
 * @returns {boolean} - True se é numérico
 */
export function isNumerico(valor) {
    return typeof valor === "number" && !isNaN(valor);
}

/**
 * Converte string para número seguro
 * @param {*} valor - Valor a ser convertido
 * @param {number} padrao - Valor padrão se conversão falhar
 * @returns {number} - Número convertido ou padrão
 */
export function paraNumero(valor, padrao = 0) {
    const numero = parseFloat(valor);
    return isNumerico(numero) ? numero : padrao;
}

/**
 * Trunca texto com reticências
 * @param {string} texto - Texto a ser truncado
 * @param {number} limite - Limite de caracteres
 * @returns {string} - Texto truncado
 */
export function truncarTexto(texto, limite = 20) {
    if (!texto || typeof texto !== "string") return "";
    return texto.length > limite ? texto.substring(0, limite) + "..." : texto;
}

/**
 * Gera ID único para elementos DOM
 * @param {string} prefixo - Prefixo do ID
 * @returns {string} - ID único
 */
export function gerarIdUnico(prefixo = "fluxo") {
    return `${prefixo}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce para funções
 * @param {Function} func - Função a ser debounced
 * @param {number} delay - Delay em ms
 * @returns {Function} - Função debounced
 */
export function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Throttle para funções
 * @param {Function} func - Função a ser throttled
 * @param {number} limit - Limite em ms
 * @returns {Function} - Função throttled
 */
export function throttle(func, limit = 100) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

// ==============================
// CLASSE FLUXO FINANCEIRO UTILS
// ==============================

/**
 * Classe principal para utilitários do fluxo financeiro
 */
export class FluxoFinanceiroUtils {
    constructor() {
        this.version = "1.0.0";
        console.log("🔧 [FLUXO-FINANCEIRO-UTILS] Classe inicializada v" + this.version);
    }

    // Métodos estáticos que encapsulam as funções utilitárias
    static formatarMoeda = formatarMoeda;
    static calcularSaldoAcumulado = calcularSaldoAcumulado;
    static gerarRankingSimulado = gerarRankingSimulado;
    static normalizarTimeId = normalizarTimeId;
    static isRodadaValida = isRodadaValida;
    static numeroParaOrdinal = numeroParaOrdinal;
    static calcularDiferencaPontos = calcularDiferencaPontos;
    static isEmpateTecnico = isEmpateTecnico;
    static isGoleada = isGoleada;
    static formatarNomeParticipante = formatarNomeParticipante;
    static gerarCorPosicao = gerarCorPosicao;
    static isNumerico = isNumerico;
    static paraNumero = paraNumero;
    static truncarTexto = truncarTexto;
    static gerarIdUnico = gerarIdUnico;
    static debounce = debounce;
    static throttle = throttle;

    // Métodos de instância
    formatarMoeda = formatarMoeda;
    calcularSaldoAcumulado = calcularSaldoAcumulado;
    gerarRankingSimulado = gerarRankingSimulado;
    normalizarTimeId = normalizarTimeId;
    isRodadaValida = isRodadaValida;
    numeroParaOrdinal = numeroParaOrdinal;
    calcularDiferencaPontos = calcularDiferencaPontos;
    isEmpateTecnico = isEmpateTecnico;
    isGoleada = isGoleada;
    formatarNomeParticipante = formatarNomeParticipante;
    gerarCorPosicao = gerarCorPosicao;
    isNumerico = isNumerico;
    paraNumero = paraNumero;
    truncarTexto = truncarTexto;
    gerarIdUnico = gerarIdUnico;
    debounce = debounce;
    throttle = throttle;
}

// ===== DISPONIBILIZAR GLOBALMENTE =====
if (typeof window !== "undefined") {
    window.FluxoFinanceiroUtils = FluxoFinanceiroUtils;
}

console.log("✅ [FLUXO-FINANCEIRO-UTILS] Módulo carregado com sucesso!");
