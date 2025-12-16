// =====================================================================
// appVersion.js - Versionamento Automático Separado v3.0
// =====================================================================
// v3.0: Usa config/version-scope.json para definir escopos
//       - Mapa lógico de arquivos Admin/App sem mover pastas
//       - Suporte a padrões glob para detecção automática
//       - Formato: DD.MM.YY.HHmm (data + hora de Brasília)
// =====================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");

// =====================================================================
// CARREGAR CONFIGURAÇÃO DE ESCOPO
// =====================================================================

let versionScope = null;
try {
    const scopePath = path.join(__dirname, "version-scope.json");
    const scopeContent = fs.readFileSync(scopePath, "utf-8");
    versionScope = JSON.parse(scopeContent);
    console.log("[APP-VERSION] ✅ version-scope.json carregado com sucesso");
} catch (error) {
    console.warn("[APP-VERSION] ⚠️ Falha ao carregar version-scope.json, usando fallback");
    versionScope = null;
}

// =====================================================================
// FUNÇÕES AUXILIARES
// =====================================================================

/**
 * Converte padrão glob simples para regex
 * Suporta: *, **, extensões
 */
function globToRegex(pattern) {
    let regex = pattern
        .replace(/\./g, "\\.")           // Escapar pontos
        .replace(/\*\*\//g, "(.+/)?")    // **/ = qualquer subdiretório
        .replace(/\*\*/g, ".*")          // ** = qualquer coisa
        .replace(/\*/g, "[^/]*");        // * = qualquer coisa exceto /
    return new RegExp(`^${regex}$`);
}

/**
 * Verifica se um arquivo pertence a um escopo baseado nos padrões
 */
function matchesScope(relativePath, patterns) {
    for (const pattern of patterns) {
        const regex = globToRegex(pattern);
        if (regex.test(relativePath)) {
            return true;
        }
    }
    return false;
}

/**
 * Coleta todos os padrões de um escopo do JSON
 */
function getScopePatterns(scopeConfig) {
    const patterns = [];

    for (const [key, value] of Object.entries(scopeConfig)) {
        if (key === "description") continue;

        if (Array.isArray(value)) {
            patterns.push(...value);
        } else if (typeof value === "object") {
            // Para objetos aninhados como "detailed_files"
            for (const subValue of Object.values(value)) {
                if (Array.isArray(subValue)) {
                    patterns.push(...subValue);
                }
            }
        }
    }

    return patterns;
}

/**
 * Determina o escopo de um arquivo usando version_triggers
 */
function getFileScope(relativePath) {
    if (!versionScope || !versionScope.version_triggers) {
        return null;
    }

    for (const rule of versionScope.version_triggers.rules) {
        const regex = globToRegex(rule.pattern);
        if (regex.test(relativePath)) {
            return rule.increments;
        }
    }

    return null;
}

/**
 * Busca recursivamente a data de modificação mais recente
 * filtrando por escopo usando o JSON de configuração
 */
function getLatestMtimeByScope(dirPath, scope) {
    let latestMtime = new Date(0);
    let latestFile = null;

    // Padrões do escopo (para fallback)
    const scopePatterns = versionScope ? getScopePatterns(versionScope[scope] || {}) : [];

    function scanDir(currentPath) {
        try {
            if (!fs.existsSync(currentPath)) return;

            const items = fs.readdirSync(currentPath, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(currentPath, item.name);
                const relativePath = path.relative(publicDir, fullPath);

                // Ignorar node_modules e arquivos ocultos
                if (item.name.startsWith(".") || item.name === "node_modules") {
                    continue;
                }

                if (item.isDirectory()) {
                    scanDir(fullPath);
                } else if (item.isFile()) {
                    // Apenas arquivos JS, CSS, HTML
                    const ext = path.extname(item.name).toLowerCase();
                    if (![".js", ".css", ".html"].includes(ext)) continue;

                    // Verificar se pertence ao escopo usando version_triggers
                    const fileScopes = getFileScope(relativePath);

                    let belongsToScope = false;
                    if (fileScopes) {
                        // Usar version_triggers se disponível
                        belongsToScope = fileScopes.includes(scope === "scope_app" ? "app" : "admin");
                    } else if (scopePatterns.length > 0) {
                        // Fallback: usar padrões do escopo
                        belongsToScope = matchesScope(relativePath, scopePatterns);
                    } else {
                        // Fallback legacy: lógica original
                        if (scope === "scope_app") {
                            belongsToScope = relativePath.startsWith("participante");
                        } else {
                            belongsToScope = !relativePath.startsWith("participante");
                        }
                    }

                    if (belongsToScope) {
                        const stat = fs.statSync(fullPath);
                        if (stat.mtime > latestMtime) {
                            latestMtime = stat.mtime;
                            latestFile = relativePath;
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[APP-VERSION] Erro ao ler ${currentPath}:`, error.message);
        }
    }

    scanDir(dirPath);

    return { mtime: latestMtime, file: latestFile };
}

/**
 * Busca mtime para arquivos shared (afeta ambos os escopos)
 */
function getSharedMtime(dirPath) {
    let latestMtime = new Date(0);
    let latestFile = null;

    const sharedPatterns = versionScope ? getScopePatterns(versionScope.shared || {}) : [];

    function scanDir(currentPath) {
        try {
            if (!fs.existsSync(currentPath)) return;

            const items = fs.readdirSync(currentPath, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(currentPath, item.name);
                const relativePath = path.relative(publicDir, fullPath);

                if (item.name.startsWith(".") || item.name === "node_modules") continue;

                if (item.isDirectory()) {
                    scanDir(fullPath);
                } else if (item.isFile()) {
                    const ext = path.extname(item.name).toLowerCase();
                    if (![".js", ".css", ".html"].includes(ext)) continue;

                    // Verificar usando version_triggers
                    const fileScopes = getFileScope(relativePath);

                    let isShared = false;
                    if (fileScopes && fileScopes.length === 2) {
                        // Arquivo que incrementa ambos é shared
                        isShared = fileScopes.includes("admin") && fileScopes.includes("app");
                    } else if (sharedPatterns.length > 0) {
                        isShared = matchesScope(relativePath, sharedPatterns);
                    }

                    if (isShared) {
                        const stat = fs.statSync(fullPath);
                        if (stat.mtime > latestMtime) {
                            latestMtime = stat.mtime;
                            latestFile = relativePath;
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[APP-VERSION] Erro ao ler shared ${currentPath}:`, error.message);
        }
    }

    scanDir(dirPath);

    return { mtime: latestMtime, file: latestFile };
}

/**
 * Converte uma data para o formato de versão DD.MM.YY.HHmm (Brasília)
 */
function dateToVersion(date) {
    // Converter para horário de Brasília
    const brDate = new Date(
        date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
    );

    // Formato: DD.MM.YY
    const version = [
        String(brDate.getDate()).padStart(2, "0"),
        String(brDate.getMonth() + 1).padStart(2, "0"),
        String(brDate.getFullYear()).slice(-2),
    ].join(".");

    // Build: HHmm
    const build = [
        String(brDate.getHours()).padStart(2, "0"),
        String(brDate.getMinutes()).padStart(2, "0"),
    ].join("");

    return {
        version: `${version}.${build}`,
        build,
        deployedAt: date.toISOString(),
    };
}

// =====================================================================
// DETECÇÃO AUTOMÁTICA DE VERSÕES (usando version-scope.json)
// =====================================================================

// Buscar última modificação de cada escopo
const appResult = getLatestMtimeByScope(publicDir, "scope_app");
const adminResult = getLatestMtimeByScope(publicDir, "scope_admin");
const sharedResult = getSharedMtime(publicDir);

// Participante: max entre scope_app e shared
let participanteMtime = appResult.mtime;
let participanteFile = appResult.file;
if (sharedResult.mtime > participanteMtime) {
    participanteMtime = sharedResult.mtime;
    participanteFile = sharedResult.file + " (shared)";
}

// Admin: max entre scope_admin e shared
let adminMtime = adminResult.mtime;
let adminFile = adminResult.file;
if (sharedResult.mtime > adminMtime) {
    adminMtime = sharedResult.mtime;
    adminFile = sharedResult.file + " (shared)";
}

// Se não encontrou modificações, usar startup time
const startupTime = new Date();
if (participanteMtime.getTime() === 0) {
    participanteMtime = startupTime;
    participanteFile = "(startup)";
}
if (adminMtime.getTime() === 0) {
    adminMtime = startupTime;
    adminFile = "(startup)";
}

// =====================================================================
// EXPORTAÇÕES
// =====================================================================

// Versão do PARTICIPANTE (app mobile)
export const PARTICIPANTE_VERSION = {
    ...dateToVersion(participanteMtime),
    area: "participante",
    releaseNotes: "Atualização do app",
    lastModifiedFile: participanteFile,
};

// Versão do ADMIN (painel desktop)
export const ADMIN_VERSION = {
    ...dateToVersion(adminMtime),
    area: "admin",
    releaseNotes: "Atualização do painel",
    lastModifiedFile: adminFile,
};

// APP_VERSION para compatibilidade (usa a mais recente das duas)
const latestMtime = participanteMtime > adminMtime ? participanteMtime : adminMtime;
export const APP_VERSION = {
    ...dateToVersion(latestMtime),
    releaseNotes: "Atualização do sistema",
};

// Exportar configuração de escopo para uso externo
export const VERSION_SCOPE = versionScope;

// =====================================================================
// LOGS DE STARTUP
// =====================================================================

console.log("[APP-VERSION] ═══════════════════════════════════════════");
console.log(`[APP-VERSION] 📱 Participante: v${PARTICIPANTE_VERSION.version}`);
if (participanteFile) {
    console.log(`[APP-VERSION]    └─ Último: ${participanteFile}`);
}
console.log(`[APP-VERSION] 🖥️  Admin: v${ADMIN_VERSION.version}`);
if (adminFile) {
    console.log(`[APP-VERSION]    └─ Último: ${adminFile}`);
}
console.log("[APP-VERSION] ═══════════════════════════════════════════");

export default APP_VERSION;
