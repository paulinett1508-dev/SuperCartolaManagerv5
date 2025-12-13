// =====================================================================
// appVersion.js - Versões fixas separadas para Participante e Admin
// =====================================================================
// v3.0: Versões MANUAIS e SEPARADAS
//       - Só incrementar PARTICIPANTE quando houver mudança no app mobile
//       - Só incrementar ADMIN quando houver mudança no painel admin
//       - Evita notificações desnecessárias
// =====================================================================

const startupTime = new Date();

// =====================================================================
// 🔧 VERSÕES MANUAIS - INCREMENTAR APENAS QUANDO NECESSÁRIO
// =====================================================================

// ✅ PARTICIPANTE: Incrementar quando houver mudanças no app mobile
// Última atualização: Correção de valores Mata-Mata no extrato
export const PARTICIPANTE_VERSION = {
    version: "2025.12.1", // Formato: YYYY.MM.release
    build: "1",
    deployedAt: "2025-12-13T00:00:00.000Z",
    releaseNotes: "Correção de valores financeiros no extrato",
};

// ✅ ADMIN: Incrementar quando houver mudanças no painel administrativo
// Última atualização: Títulos editáveis nos campos manuais
export const ADMIN_VERSION = {
    version: "2025.12.2", // Formato: YYYY.MM.release
    build: "2",
    deployedAt: startupTime.toISOString(),
    releaseNotes: "Títulos dos campos editáveis no extrato",
};

// =====================================================================
// Versão geral do sistema (para logs e debug)
// =====================================================================
export const APP_VERSION = {
    version: `P${PARTICIPANTE_VERSION.version}/A${ADMIN_VERSION.version}`,
    participante: PARTICIPANTE_VERSION.version,
    admin: ADMIN_VERSION.version,
    deployedAt: startupTime.toISOString(),
};

console.log(`[APP-VERSION] ✅ Participante: v${PARTICIPANTE_VERSION.version} | Admin: v${ADMIN_VERSION.version}`);

export default APP_VERSION;
