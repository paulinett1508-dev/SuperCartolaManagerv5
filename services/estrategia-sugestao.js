/**
 * ESTRATEGIA SUGESTAO SERVICE v1.0
 * Modulo centralizado de modos de estrategia para sugestao de escalacao.
 *
 * Modos:
 *   MITAR       - Maximizar pontuacao (jogadores de media alta)
 *   EQUILIBRADO - Balance entre pontuacao e valorizacao (padrao)
 *   VALORIZAR   - Maximizar valorizacao (jogadores baratos com potencial)
 */

// =====================================================================
// ENUM DE MODOS
// =====================================================================
export const MODOS = {
    MITAR: 'mitar',
    EQUILIBRADO: 'equilibrado',
    VALORIZAR: 'valorizar',
};

export const MODOS_CONFIG = {
    [MODOS.MITAR]: {
        nome: 'Mitar',
        descricao: 'Foco em pontuacao alta',
        pesoValorizacao: 0,
        icone: 'rocket_launch',
        cor: '#ef4444',
    },
    [MODOS.EQUILIBRADO]: {
        nome: 'Equilibrado',
        descricao: 'Pontuacao + valorizacao',
        pesoValorizacao: 50,
        icone: 'balance',
        cor: '#f59e0b',
    },
    [MODOS.VALORIZAR]: {
        nome: 'Valorizar',
        descricao: 'Foco em valorizacao (C$)',
        pesoValorizacao: 100,
        icone: 'trending_up',
        cor: '#22c55e',
    },
};

// =====================================================================
// SUGESTAO INTELIGENTE DE MODO
// =====================================================================

/**
 * Sugere o melhor modo com base no patrimonio disponivel.
 * - Patrimonio baixo  (< C$ 80)  → VALORIZAR  (precisa crescer)
 * - Patrimonio medio  (80-140)   → EQUILIBRADO
 * - Patrimonio alto   (> C$ 140) → MITAR (pode gastar para pontuar)
 *
 * @param {number} patrimonio - Cartoletas disponiveis
 * @returns {{ modo: string, config: object, razao: string }}
 */
export function sugerirModo(patrimonio) {
    if (!patrimonio || patrimonio <= 0) {
        return {
            modo: MODOS.EQUILIBRADO,
            config: MODOS_CONFIG[MODOS.EQUILIBRADO],
            razao: 'Patrimonio nao informado, usando padrao',
        };
    }

    if (patrimonio < 80) {
        return {
            modo: MODOS.VALORIZAR,
            config: MODOS_CONFIG[MODOS.VALORIZAR],
            razao: `Patrimonio baixo (C$ ${patrimonio.toFixed(2)}). Priorize valorizacao para crescer.`,
        };
    }

    if (patrimonio > 140) {
        return {
            modo: MODOS.MITAR,
            config: MODOS_CONFIG[MODOS.MITAR],
            razao: `Patrimonio alto (C$ ${patrimonio.toFixed(2)}). Invista em jogadores de media alta.`,
        };
    }

    return {
        modo: MODOS.EQUILIBRADO,
        config: MODOS_CONFIG[MODOS.EQUILIBRADO],
        razao: `Patrimonio medio (C$ ${patrimonio.toFixed(2)}). Equilibre pontuacao e valorizacao.`,
    };
}

// =====================================================================
// SCORING UNIFICADO
// =====================================================================

/**
 * Calcula score de um atleta com base no modo escolhido.
 * Reutilizado por dicasPremiumService e cartolaProService.
 *
 * @param {object} atleta - { media, preco, mpv, variacao, jogos }
 * @param {number} pesoValorizacao - 0 (mitar) a 100 (valorizar)
 * @returns {number} Score final
 */
export function calcularScoreAtleta(atleta, pesoValorizacao = 50) {
    const media = atleta.media || 0;
    const preco = atleta.preco || 0;
    const mpv = atleta.mpv || 0;

    // Score de mitar (baseado em media pura)
    const scoreMitar = media;

    // Score de valorizar (custo-beneficio + potencial acima do MPV)
    const custoBeneficio = media / (preco || 1);
    const potencialValorizacao = media > mpv ? (media - mpv) * 0.5 : 0;
    const scoreValorizar = custoBeneficio * 2 + potencialValorizacao;

    // Combinacao ponderada
    const pesoMitar = (100 - pesoValorizacao) / 100;
    const pesoValor = pesoValorizacao / 100;

    return (scoreMitar * pesoMitar) + (scoreValorizar * pesoValor);
}

/**
 * Converte modo nomeado para pesoValorizacao numerico.
 * Se receber um numero valido (0-100), retorna como esta.
 *
 * @param {string|number} modoOuPeso - 'mitar'|'equilibrado'|'valorizar' ou 0-100
 * @returns {number} pesoValorizacao (0-100)
 */
export function resolverPesoValorizacao(modoOuPeso) {
    // Se ja e numero, retorna direto (retrocompatibilidade com slider)
    if (typeof modoOuPeso === 'number') {
        return Math.max(0, Math.min(100, modoOuPeso));
    }

    const modo = String(modoOuPeso).toLowerCase();
    const config = MODOS_CONFIG[modo];

    if (config) {
        return config.pesoValorizacao;
    }

    // Fallback: tentar parse numerico
    const parsed = parseInt(modoOuPeso, 10);
    if (!isNaN(parsed)) {
        return Math.max(0, Math.min(100, parsed));
    }

    // Default: equilibrado
    return 50;
}

/**
 * Retorna lista de modos disponiveis (para frontends).
 * @returns {Array<{ id: string, nome: string, descricao: string, pesoValorizacao: number, icone: string, cor: string }>}
 */
export function listarModos() {
    return Object.entries(MODOS_CONFIG).map(([id, config]) => ({
        id,
        ...config,
    }));
}

export default {
    MODOS,
    MODOS_CONFIG,
    sugerirModo,
    calcularScoreAtleta,
    resolverPesoValorizacao,
    listarModos,
};
