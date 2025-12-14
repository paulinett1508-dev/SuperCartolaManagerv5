// =====================================================================
// appVersion.js - Versionamento Automático Separado v2.0
// =====================================================================
// v2.0: Versões separadas para PARTICIPANTE e ADMIN
//       - Participante: baseado em modificações em public/participante/
//       - Admin: baseado em modificações em public/js/, public/fronts/, public/css/
//       - Formato: DD.MM.YY.HHmm (data + hora de Brasília)
// =====================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

// =====================================================================
// FUNÇÕES AUXILIARES
// =====================================================================

/**
 * Busca recursivamente a data de modificação mais recente em um diretório
 */
function getLatestMtime(dirPath, excludePaths = []) {
    let latestMtime = new Date(0);

    try {
        if (!fs.existsSync(dirPath)) {
            return latestMtime;
        }

        const items = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            const relativePath = path.relative(rootDir, fullPath);

            // Ignorar caminhos excluídos
            if (excludePaths.some((exc) => relativePath.startsWith(exc))) {
                continue;
            }

            // Ignorar node_modules e arquivos ocultos
            if (item.name.startsWith(".") || item.name === "node_modules") {
                continue;
            }

            if (item.isDirectory()) {
                const subMtime = getLatestMtime(fullPath, excludePaths);
                if (subMtime > latestMtime) {
                    latestMtime = subMtime;
                }
            } else if (item.isFile()) {
                // Apenas arquivos JS, CSS, HTML
                const ext = path.extname(item.name).toLowerCase();
                if ([".js", ".css", ".html"].includes(ext)) {
                    const stat = fs.statSync(fullPath);
                    if (stat.mtime > latestMtime) {
                        latestMtime = stat.mtime;
                    }
                }
            }
        }
    } catch (error) {
        console.error(`[APP-VERSION] Erro ao ler ${dirPath}:`, error.message);
    }

    return latestMtime;
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
// DETECÇÃO AUTOMÁTICA DE VERSÕES
// =====================================================================

// Diretórios do PARTICIPANTE (app mobile)
const participanteDirs = [path.join(rootDir, "public/participante")];

// Diretórios do ADMIN (painel desktop)
const adminDirs = [
    path.join(rootDir, "public/js"),
    path.join(rootDir, "public/fronts"),
    path.join(rootDir, "public/css"),
];

// Excluir participante dos diretórios admin (public/js não tem participante, mas por segurança)
const adminExcludes = ["public/participante"];

// Buscar última modificação de cada área
let participanteMtime = new Date(0);
for (const dir of participanteDirs) {
    const mtime = getLatestMtime(dir);
    if (mtime > participanteMtime) {
        participanteMtime = mtime;
    }
}

let adminMtime = new Date(0);
for (const dir of adminDirs) {
    const mtime = getLatestMtime(dir, adminExcludes);
    if (mtime > adminMtime) {
        adminMtime = mtime;
    }
}

// Se não encontrou modificações, usar startup time
const startupTime = new Date();
if (participanteMtime.getTime() === 0) {
    participanteMtime = startupTime;
}
if (adminMtime.getTime() === 0) {
    adminMtime = startupTime;
}

// =====================================================================
// EXPORTAÇÕES
// =====================================================================

// Versão do PARTICIPANTE (app mobile)
export const PARTICIPANTE_VERSION = {
    ...dateToVersion(participanteMtime),
    area: "participante",
    releaseNotes: "Atualização do app",
};

// Versão do ADMIN (painel desktop)
export const ADMIN_VERSION = {
    ...dateToVersion(adminMtime),
    area: "admin",
    releaseNotes: "Atualização do painel",
};

// APP_VERSION para compatibilidade (usa a mais recente das duas)
const latestMtime =
    participanteMtime > adminMtime ? participanteMtime : adminMtime;
export const APP_VERSION = {
    ...dateToVersion(latestMtime),
    releaseNotes: "Atualização do sistema",
};

// Logs de startup
console.log(
    `[APP-VERSION] ✅ Participante: v${PARTICIPANTE_VERSION.version} (${PARTICIPANTE_VERSION.deployedAt})`,
);
console.log(
    `[APP-VERSION] ✅ Admin: v${ADMIN_VERSION.version} (${ADMIN_VERSION.deployedAt})`,
);

export default APP_VERSION;
