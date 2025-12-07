// =====================================================================
// appVersion.js - Versão auto-gerada a cada deploy
// Destino: /config/appVersion.js
// =====================================================================

// ✅ Versão gerada automaticamente no startup do servidor
const startupTime = new Date();

// Formato: YYYY.MM.DD (ano.mês.dia)
const version = [
    startupTime.getFullYear(),
    String(startupTime.getMonth() + 1).padStart(2, "0"),
    String(startupTime.getDate()).padStart(2, "0"),
].join(".");

// Build: timestamp único (garante unicidade mesmo com múltiplos deploys no mesmo dia)
const build = startupTime.getTime().toString(36).toUpperCase();

export const APP_VERSION = {
    version,
    build,
    deployedAt: startupTime.toISOString(),
    releaseNotes: "Atualização automática",
};

console.log(`[APP-VERSION] ✅ Versão ${version} (build ${build})`);

export default APP_VERSION;
