// =====================================================================
// appVersion.js - Versão automática a cada deploy
// Destino: /config/appVersion.js
// =====================================================================

const startupTime = new Date();

// ✅ Converter para horário de Brasília (America/Sao_Paulo)
const brDate = new Date(
    startupTime.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
);

// Formato brasileiro: DD.MM.YY (dia.mês.ano)
const version = [
    String(brDate.getDate()).padStart(2, "0"),
    String(brDate.getMonth() + 1).padStart(2, "0"),
    String(brDate.getFullYear()).slice(-2),
].join(".");

// Build: HHmm (hora e minuto) - diferencia múltiplos deploys no mesmo dia
const build = [
    String(brDate.getHours()).padStart(2, "0"),
    String(brDate.getMinutes()).padStart(2, "0"),
].join("");

// ✅ Versão única para todo o sistema
export const APP_VERSION = {
    version: `${version}.${build}`,
    build,
    deployedAt: startupTime.toISOString(),
    releaseNotes: "Atualização do sistema",
};

console.log(`[APP-VERSION] ✅ v${APP_VERSION.version} (Horário de Brasília)`);

export default APP_VERSION;
