/**
 * MIDDLEWARE DE TENANT - Multi-Tenant Isolation
 *
 * Garante que cada admin veja apenas suas próprias ligas.
 * Super Admins podem ver todas as ligas (para suporte).
 *
 * @version 1.0.0
 * @since 2026-01-03
 */

import mongoose from "mongoose";

// Lista de Super Admins (carregada de env)
const SUPER_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

/**
 * Verifica se o email é de um Super Admin
 * @param {string} email
 * @returns {boolean}
 */
export function isSuperAdmin(email) {
    if (!email) return false;
    const emailLower = email.toLowerCase().trim();

    // Verifica na lista de env
    if (SUPER_ADMIN_EMAILS.includes(emailLower)) {
        return true;
    }

    // Verifica flag na sessão (definida no login)
    return false;
}

/**
 * Rotas públicas que NÃO requerem autenticação admin
 * Estas rotas são acessíveis por participantes
 *
 * ✅ v1.1: Whitelist para prevenir 403 Forbidden em rotas públicas
 */
const ROTAS_PUBLICAS_PARTICIPANTE = [
    // GET /api/ligas/:id - Dados gerais da liga
    /^\/api\/ligas\/[a-f0-9]{24}$/,
    // GET /api/ligas/:id/ranking - Ranking geral
    /^\/api\/ligas\/[a-f0-9]{24}\/ranking$/,
    // GET /api/ligas/:id/ranking/:rodada - Ranking de rodada específica
    /^\/api\/ligas\/[a-f0-9]{24}\/ranking\/\d+$/,
    // GET /api/ligas/:id/rodadas - Todas rodadas
    /^\/api\/ligas\/[a-f0-9]{24}\/rodadas$/,
    // GET /api/ligas/:id/rodadas/:timeId - Rodadas de um time
    /^\/api\/ligas\/[a-f0-9]{24}\/rodadas\/\d+$/,
    // GET /api/ligas/:id/melhor-mes - Ranking mensal
    /^\/api\/ligas\/[a-f0-9]{24}\/melhor-mes$/,
    // GET /api/ligas/:id/melhor-mes/:timeId - Melhor mês do participante
    /^\/api\/ligas\/[a-f0-9]{24}\/melhor-mes\/\d+$/,
    // GET /api/ligas/:id/top10 - Top 10
    /^\/api\/ligas\/[a-f0-9]{24}\/top10$/,
    // GET /api/ligas/:id/mata-mata - Dados do Mata-Mata
    /^\/api\/ligas\/[a-f0-9]{24}\/mata-mata$/,
    // GET /api/ligas/:id/modulos-ativos - Configuração de módulos
    /^\/api\/ligas\/[a-f0-9]{24}\/modulos-ativos$/,
    // GET /api/ligas/:id/configuracoes - Configs da liga
    /^\/api\/ligas\/[a-f0-9]{24}\/configuracoes$/,
    // GET /api/ligas/:id/participantes - Lista de participantes (por temporada)
    /^\/api\/ligas\/[a-f0-9]{24}\/participantes$/,
    // GET /api/ligas/:id/temporadas - Temporadas disponíveis
    /^\/api\/ligas\/[a-f0-9]{24}\/temporadas$/,
];

/**
 * Middleware que injeta filtro de tenant em req.tenantFilter
 *
 * Uso nos controllers:
 *   const ligas = await Liga.find({ ...req.tenantFilter });
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
export function tenantFilter(req, res, next) {
    // ✅ v1.1: Verificar se é rota pública (acessível por participantes)
    const isRotaPublica = ROTAS_PUBLICAS_PARTICIPANTE.some(regex => regex.test(req.path));

    if (isRotaPublica) {
        req.tenantFilter = {};
        req.isPublicRoute = true;
        return next();
    }

    // Se não está autenticado como admin, não aplica filtro (outras rotas cuidam da autenticação)
    if (!req.session?.admin) {
        req.tenantFilter = {};
        return next();
    }

    const admin = req.session.admin;
    const email = admin.email?.toLowerCase();

    // Super Admin vê tudo
    if (admin.superAdmin || isSuperAdmin(email)) {
        req.tenantFilter = {};
        req.isSuperAdmin = true;
        console.log(`[TENANT] Super Admin ${email} - sem filtro`);
    } else {
        // Admin normal vê apenas suas ligas
        const adminId = admin._id || admin.id;

        // Verifica se adminId é válido para conversão em ObjectId
        const isValidObjectId = adminId &&
            (mongoose.Types.ObjectId.isValid(adminId) ||
             (typeof adminId === 'object' && adminId._bsontype === 'ObjectId'));

        if (isValidObjectId) {
            // Converte para ObjectId se for string válida
            const objectId = typeof adminId === "string"
                ? new mongoose.Types.ObjectId(adminId)
                : adminId;

            req.tenantFilter = { admin_id: objectId };
            req.isSuperAdmin = false;
            console.log(`[TENANT] Admin ${email} - filtro: admin_id=${adminId}`);
        } else if (adminId) {
            // adminId existe mas não é um ObjectId válido - log de warning
            console.warn(`[TENANT] Admin ${email} - adminId inválido: "${adminId}" (tipo: ${typeof adminId})`);
            req.tenantFilter = { owner_email: email };
            req.isSuperAdmin = false;
        } else {
            // Fallback: filtra por email (caso admin_id não esteja disponível)
            req.tenantFilter = { owner_email: email };
            req.isSuperAdmin = false;
            console.log(`[TENANT] Admin ${email} - filtro por email (fallback)`);
        }
    }

    next();
}

/**
 * Middleware para rotas que EXIGEM isolamento de tenant
 * Bloqueia acesso se admin tentar acessar liga de outro tenant
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
export function requireTenantAccess(req, res, next) {
    // Super Admin tem acesso total
    if (req.isSuperAdmin) {
        return next();
    }

    // Para rotas com :ligaId, verificar ownership será feito no controller
    // Este middleware apenas garante que o filtro está definido
    if (!req.tenantFilter || Object.keys(req.tenantFilter).length === 0) {
        // Sem filtro definido para admin não-super = erro de configuração
        console.error("[TENANT] Erro: Admin sem filtro de tenant definido");
        return res.status(403).json({
            success: false,
            error: "Acesso negado - configuração de tenant inválida"
        });
    }

    next();
}

/**
 * Verifica se o admin tem acesso a uma liga específica
 *
 * @param {Object} liga - Documento da liga
 * @param {Object} admin - Dados do admin da sessão
 * @returns {boolean}
 */
export function hasAccessToLiga(liga, admin) {
    if (!liga || !admin) return false;

    // Super Admin tem acesso total
    if (admin.superAdmin || isSuperAdmin(admin.email)) {
        return true;
    }

    const adminId = admin._id || admin.id;
    const adminEmail = admin.email?.toLowerCase();

    // Verifica por admin_id
    if (liga.admin_id) {
        const ligaAdminId = liga.admin_id.toString();
        const currentAdminId = adminId?.toString();
        if (ligaAdminId === currentAdminId) {
            return true;
        }
    }

    // Fallback: verifica por email
    if (liga.owner_email && adminEmail) {
        if (liga.owner_email.toLowerCase() === adminEmail) {
            return true;
        }
    }

    return false;
}

export default {
    isSuperAdmin,
    tenantFilter,
    requireTenantAccess,
    hasAccessToLiga
};
