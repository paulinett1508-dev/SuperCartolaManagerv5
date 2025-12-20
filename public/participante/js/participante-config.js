// =====================================================================
// PARTICIPANTE-CONFIG.JS - Configurações globais do App do Participante
// =====================================================================
// ✅ v1.1 FIX: Removidos exports ES6 pois arquivo é carregado como script normal

// Temporada atual (sincronizado com config/seasons.js do backend)
// ✅ Mantido em 2025 até admin disparar turn_key para 2026
const CURRENT_SEASON = 2025;
const PREVIOUS_SEASON = 2024;

// Feature flags
const FEATURES = {
    SHOW_HISTORY_BANNER: true,      // Mostrar banner de resumo da temporada anterior
    SHOW_SEASON_SELECTOR: true,     // Mostrar seletor de temporada no header
    ENABLE_OFFLINE_MODE: true,      // Habilitar modo offline com IndexedDB
};

// Mapeamento de badges para exibição
const BADGES_CONFIG = {
    campeao: { icon: "🏆", nome: "Campeão", cor: "#ffd700" },
    campeao_2025: { icon: "🏆", nome: "Campeão", cor: "#ffd700" },
    vice: { icon: "🥈", nome: "Vice", cor: "#c0c0c0" },
    vice_2025: { icon: "🥈", nome: "Vice", cor: "#c0c0c0" },
    terceiro: { icon: "🥉", nome: "3º Lugar", cor: "#cd7f32" },
    terceiro_2025: { icon: "🥉", nome: "3º Lugar", cor: "#cd7f32" },
    top10_mito: { icon: "⭐", nome: "Top Mito", cor: "#10b981" },
    top10_mito_2025: { icon: "⭐", nome: "Top Mito", cor: "#10b981" },
    top10_mico: { icon: "💀", nome: "Top Mico", cor: "#ef4444" },
    top10_mico_2025: { icon: "💀", nome: "Top Mico", cor: "#ef4444" },
    artilheiro: { icon: "⚽", nome: "Artilheiro", cor: "#3b82f6" },
    luva_ouro: { icon: "🧤", nome: "Luva Ouro", cor: "#f59e0b" },
    melhor_mes: { icon: "📅", nome: "Melhor Mês", cor: "#8b5cf6" },
    mata_mata_campeao: { icon: "⚔️", nome: "Mata-Mata", cor: "#ec4899" },
};

// Exportar para uso global
window.ParticipanteConfig = {
    CURRENT_SEASON,
    PREVIOUS_SEASON,
    FEATURES,
    BADGES_CONFIG
};
