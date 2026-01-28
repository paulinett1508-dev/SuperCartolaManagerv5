import Liga from "../models/Liga.js";

const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

export async function verificarParticipantePremium(req, { cacheMaxAgeMs = CACHE_MAX_AGE_MS } = {}) {
    if (!req.session?.participante) {
        return { isPremium: false, error: "Sessao invalida", code: 401 };
    }

    const { timeId, ligaId } = req.session.participante;
    if (!timeId || !ligaId) {
        return { isPremium: false, error: "Dados de sessao incompletos", code: 401 };
    }

    const cache = req.session.participantePremium;
    if (
        cache &&
        cache.timeId === String(timeId) &&
        cache.ligaId === String(ligaId) &&
        Date.now() - (cache.checkedAt || 0) < cacheMaxAgeMs
    ) {
        return { isPremium: cache.isPremium === true, participante: cache.participante };
    }

    try {
        const liga = await Liga.findById(ligaId).select("participantes").lean();
        if (!liga) {
            return { isPremium: false, error: "Liga nao encontrada", code: 404 };
        }

        const participante = liga.participantes?.find(
            (p) => String(p.time_id) === String(timeId)
        );

        if (!participante) {
            return { isPremium: false, error: "Participante nao encontrado na liga", code: 404 };
        }

        const isPremium = participante.premium === true;

        req.session.participantePremium = {
            timeId: String(timeId),
            ligaId: String(ligaId),
            isPremium,
            checkedAt: Date.now(),
            participante: {
                time_id: participante.time_id,
                nome_time: participante.nome_time,
                nome_cartola: participante.nome_cartola,
                premium: participante.premium === true,
            },
        };

        return { isPremium, participante };
    } catch (error) {
        console.error("[PREMIUM] Erro ao verificar premium:", error);
        return { isPremium: false, error: "Erro interno", code: 500 };
    }
}
