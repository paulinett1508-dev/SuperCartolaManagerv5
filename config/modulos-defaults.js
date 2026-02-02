/**
 * MODULOS DEFAULTS - Configuração Padrão de Módulos
 *
 * Este arquivo define os valores padrão para módulos ativos.
 * Usado como fallback quando liga.modulos_ativos ou liga.configuracoes não existe.
 *
 * PROBLEMA RESOLVIDO:
 * - fluxo-financeiro-cache.js tinha mata-mata: true
 * - admin-tesouraria.js tinha mataMata: false
 * - Inconsistência causava módulos diferentes no Admin vs Participante
 *
 * @version 1.0.0
 */

/**
 * Valores padrão para módulos ativos
 *
 * LÓGICA v2.0:
 * - banco: sempre ativo (é o módulo base de rodadas)
 * - TODOS os outros módulos OPCIONAIS: desativados por padrão
 * - Admin deve configurar regras antes de habilitar módulos opcionais
 *
 * Módulos BASE (sempre ativos): extrato, ranking, rodadas, historico
 * Módulos OPCIONAIS: top10, pontosCorridos, mataMata, artilheiro, etc.
 */
export const MODULOS_DEFAULTS = {
    banco: true,            // Bônus/Ônus por rodada - sempre ativo (módulo BASE)
    pontosCorridos: false,  // Liga de pontos corridos - OPCIONAL
    mataMata: false,        // Mata-mata - OPCIONAL
    top10: false,           // Ranking Top 10 (Mito/Mico) - OPCIONAL (admin habilita)
    melhorMes: false,       // Prêmio melhor do mês - OPCIONAL
    artilheiro: false,      // Prêmio artilheiro - OPCIONAL
    luvaOuro: false,        // Prêmio luva de ouro - OPCIONAL
    campinho: false,        // Campinho virtual - OPCIONAL
    dicas: false,           // Dicas de escalação - OPCIONAL
};

/**
 * Retorna os módulos ativos com valores padrão aplicados
 *
 * @param {object} modulosAtivos - Módulos configurados na liga (pode ser parcial)
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
        campinho: modulosAtivos.campinho ?? MODULOS_DEFAULTS.campinho,
        dicas: modulosAtivos.dicas ?? MODULOS_DEFAULTS.dicas,
    };
}

/**
 * Verifica se um módulo está ativo (considerando defaults)
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

    // Mapear kebab-case para camelCase
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
