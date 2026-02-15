/**
 * ESTRATEGIA SUGESTAO SERVICE v2.0
 * Modulo centralizado de modos de estrategia para sugestao de escalacao.
 *
 * v2.0: Scoring enriquecido com dados GatoMestre (mandante/visitante, minutos)
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

// =====================================================================
// SCORING ENRIQUECIDO COM GATO MESTRE
// =====================================================================

/**
 * Calcula score enriquecido usando dados do GatoMestre (media mandante/visitante, minutos jogados).
 * Se gato_mestre nao estiver disponivel, faz fallback para calcularScoreAtleta basico.
 *
 * @param {object} atleta - Dados do atleta (media, preco, mpv, variacao, jogos, gato_mestre)
 * @param {number} pesoValorizacao - 0 (mitar) a 100 (valorizar)
 * @param {object} confronto - { mandante: boolean, adversarioId: number, cedidoMediaAdv: number }
 * @returns {{ score: number, fontes: string[], detalhes: object }}
 */
export function calcularScoreAtletaEnriquecido(atleta, pesoValorizacao = 50, confronto = {}) {
    const baseScore = calcularScoreAtleta(atleta, pesoValorizacao);
    const fontes = ['cartola-api'];
    const detalhes = { baseScore, mediaUsada: atleta.media || 0 };

    const gm = atleta.gato_mestre;
    if (!gm) {
        return { score: baseScore, fontes, detalhes };
    }

    fontes.push('gato-mestre');
    const media = atleta.media || 0;

    // 1. Media contextual (mandante vs visitante)
    let mediaContextual = media;
    if (confronto.mandante !== undefined) {
        const mediaMandante = gm.media_pontos_mandante || media;
        const mediaVisitante = gm.media_pontos_visitante || media;
        mediaContextual = confronto.mandante ? mediaMandante : mediaVisitante;
        detalhes.mediaContextual = mediaContextual;
        detalhes.mandante = confronto.mandante;
    }

    // 2. Fator minutagem (titular confiavel vs reserva/rotacao)
    const mediaMinutos = gm.media_minutos_jogados || 0;
    let fatorMinutos = 1.0;
    if (mediaMinutos >= 70) {
        fatorMinutos = 1.1;  // Titular confiavel
    } else if (mediaMinutos >= 45) {
        fatorMinutos = 1.0;  // Regular
    } else if (mediaMinutos > 0) {
        fatorMinutos = 0.85; // Reserva / rodizio
    }
    detalhes.mediaMinutos = mediaMinutos;
    detalhes.fatorMinutos = fatorMinutos;

    // 3. Fator confronto (adversario cede muitos pontos)
    let fatorConfronto = 1.0;
    if (confronto.cedidoMediaAdv && confronto.cedidoMediaAdv > 0) {
        // Media cedida acima de 5 e favoravel, abaixo e desfavoravel
        fatorConfronto = 0.9 + (confronto.cedidoMediaAdv / 50);
        fatorConfronto = Math.max(0.8, Math.min(1.3, fatorConfronto));
        fontes.push('confronto');
        detalhes.cedidoMediaAdv = confronto.cedidoMediaAdv;
        detalhes.fatorConfronto = fatorConfronto;
    }

    // 4. Score final: base ajustado pela media contextual, minutagem e confronto
    const fatorMedia = media > 0 ? (mediaContextual / media) : 1;
    const scoreEnriquecido = baseScore * fatorMedia * fatorMinutos * fatorConfronto;

    detalhes.fatorMedia = fatorMedia;

    return {
        score: Number(scoreEnriquecido.toFixed(3)),
        fontes,
        detalhes
    };
}

export default {
    MODOS,
    MODOS_CONFIG,
    sugerirModo,
    calcularScoreAtleta,
    calcularScoreAtletaEnriquecido,
    resolverPesoValorizacao,
    listarModos,
};
