// =====================================================================
// appVersion.js - Sistema de Versionamento Separado v2.0
// =====================================================================
// v2.0: Versões independentes para Participante e Admin
//       - participante: Versão MANUAL (incrementar quando houver mudanças no app)
//       - admin: Versão AUTOMÁTICA (gerada a cada deploy)
// =====================================================================

const startupTime = new Date();

// ✅ Converter para horário de Brasília (America/Sao_Paulo)
const brDate = new Date(
    startupTime.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
);

// Formato brasileiro: DD.MM.YY (dia.mês.ano)
const autoVersion = [
    String(brDate.getDate()).padStart(2, "0"),
    String(brDate.getMonth() + 1).padStart(2, "0"),
    String(brDate.getFullYear()).slice(-2),
].join(".");

// Build: HHmm (hora e minuto) - diferencia múltiplos deploys no mesmo dia
const autoBuild = [
    String(brDate.getHours()).padStart(2, "0"),
    String(brDate.getMinutes()).padStart(2, "0"),
].join("");

// =====================================================================
// VERSÃO DO PARTICIPANTE (App Mobile) - MANUAL
// =====================================================================
// Incrementar APENAS quando houver mudanças no app do participante
// Mudanças apenas no admin NÃO devem alterar esta versão
// =====================================================================
export const PARTICIPANTE_VERSION = {
    version: "1.0.0",
    build: "1",
    releaseNotes: "Modo arquivo - Temporada 2025 encerrada",
    updatedAt: "2025-12-13",
};

// =====================================================================
// VERSÃO DO ADMIN (Painel Desktop) - AUTOMÁTICA
// =====================================================================
export const ADMIN_VERSION = {
    version: `${autoVersion}.${autoBuild}`,
    build: autoBuild,
    deployedAt: startupTime.toISOString(),
    releaseNotes: "Deploy automático",
};

// ✅ Exportação legada (compatibilidade)
export const APP_VERSION = {
    participante: PARTICIPANTE_VERSION,
    admin: ADMIN_VERSION,
    // Campos legados apontam para participante
    version: PARTICIPANTE_VERSION.version,
    build: PARTICIPANTE_VERSION.build,
    releaseNotes: PARTICIPANTE_VERSION.releaseNotes,
};

console.log(`[APP-VERSION] ✅ Participante: v${PARTICIPANTE_VERSION.version} | Admin: v${ADMIN_VERSION.version}`);

export default APP_VERSION;
