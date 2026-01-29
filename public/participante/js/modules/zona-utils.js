// =====================================================================
// ZONA-UTILS.JS - Zona de desempenho compartilhada (Premiação / Neutra / Risco)
// =====================================================================
const DEFAULT_ZONE = {
    premiacao: {
        texto: "Zona de Premiação",
        cor: "var(--app-success, #10b981)",
        bg: "rgba(16, 185, 129, 0.15)",
        classe: "zona-premiacao",
        icon: "emoji_events"
    },
    neutra: {
        texto: "Zona Neutra",
        cor: "var(--app-warning, #f97316)",
        bg: "rgba(249, 115, 22, 0.12)",
        classe: "zona-neutra",
        icon: "remove"
    },
    risco: {
        texto: "Zona de Risco",
        cor: "var(--app-danger, #ef4444)",
        bg: "rgba(239, 68, 68, 0.18)",
        classe: "zona-risco",
        icon: "warning"
    },
    aguardando: {
        texto: "Aguardando atualização",
        cor: "var(--app-primary, #ff6d00)",
        bg: "rgba(255, 255, 255, 0.08)",
        classe: "zona-neutra",
        icon: "schedule"
    }
};

function escolherZona(posicao, total) {
    if (!posicao || !total || total <= 0) {
        return DEFAULT_ZONE.aguardando;
    }
    const percentual = (posicao / total) * 100;
    if (percentual <= 33) {
        return DEFAULT_ZONE.premiacao;
    }
    if (percentual <= 66) {
        return DEFAULT_ZONE.neutra;
    }
    return DEFAULT_ZONE.risco;
}

export function getZonaInfo(posicao, total) {
    const zonaPadrao = escolherZona(posicao, total);
    return {
        texto: zonaPadrao.texto,
        zonaTexto: zonaPadrao.texto,
        cor: zonaPadrao.cor,
        zonaCor: zonaPadrao.cor,
        bg: zonaPadrao.bg,
        zonaBg: zonaPadrao.bg,
        zonaClass: zonaPadrao.classe,
        icon: zonaPadrao.icon
    };
}
