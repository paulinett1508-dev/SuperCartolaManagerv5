/**
 * MODULOS DEFAULTS - Configuração Padrão de Módulos (Frontend)
 *
 * Espelho do arquivo config/modulos-defaults.js para uso no frontend.
 *
 * @version 1.0.0
 */

/**
 * Valores padrão para módulos ativos
 *
 * v2.0: TODOS os módulos opcionais desabilitados por padrão
 * Admin deve configurar regras antes de habilitar
 */
export const MODULOS_DEFAULTS = {
    banco: true,            // Bônus/Ônus por rodada - sempre ativo (módulo BASE)
    pontosCorridos: false,  // Liga de pontos corridos - OPCIONAL
    mataMata: false,        // Mata-mata - OPCIONAL
    top10: false,           // Ranking Top 10 (Mito/Mico) - OPCIONAL (admin habilita)
    melhorMes: false,       // Prêmio melhor do mês - OPCIONAL
    artilheiro: false,      // Prêmio artilheiro - OPCIONAL
    luvaOuro: false,        // Prêmio luva de ouro - OPCIONAL
};

/**
 * Retorna os módulos ativos com valores padrão aplicados
 *
 * @param {object} modulosAtivos - Módulos configurados na liga
 * @returns {object} Módulos com defaults aplicados
 */
export function aplicarDefaults(modulosAtivos = {}) {
    return {
        banco: modulosAtivos.banco ?? MODULOS_DEFAULTS.banco,
        pontosCorridos: modulosAtivos.pontosCorridos ?? MODULOS_DEFAULTS.pontosCorridos,
        mataMata: modulosAtivos.mataMata ?? MODULOS_DEFAULTS.mataMata,
        top10: modulosAtivos.top10 ?? MODULOS_DEFAULTS.top10,
        melhorMes: modulosAtivos.melhorMes ?? MODULOS_DEFAULTS.melhorMes,
        artilheiro: modulosAtivos.artilheiro ?? MODULOS_DEFAULTS.artilheiro,
        luvaOuro: modulosAtivos.luvaOuro ?? MODULOS_DEFAULTS.luvaOuro,
    };
}

/**
 * Verifica se um módulo está ativo
 *
 * @param {string} modulo - Nome do módulo
 * @param {object} modulosAtivos - Configuração da liga
 * @returns {boolean}
 */
export function isModuloAtivo(modulo, modulosAtivos = {}) {
    const normalized = aplicarDefaults(modulosAtivos);
    return normalized[modulo] === true;
}

/**
 * Compatibilidade: converte kebab-case para camelCase
 *
 * @param {object} modulos - Objeto com possíveis chaves em kebab-case
 * @returns {object} Objeto normalizado para camelCase
 */
export function normalizarModulos(modulos = {}) {
    const normalized = {};

    const keyMap = {
        'mata-mata': 'mataMata',
        'pontos-corridos': 'pontosCorridos',
        'melhor-mes': 'melhorMes',
        'luva-ouro': 'luvaOuro',
    };

    for (const [key, value] of Object.entries(modulos)) {
        const normalizedKey = keyMap[key] || key;
        normalized[normalizedKey] = value;
    }

    return aplicarDefaults(normalized);
}

export default {
    MODULOS_DEFAULTS,
    aplicarDefaults,
    isModuloAtivo,
    normalizarModulos,
};
