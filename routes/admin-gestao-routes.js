/**
 * Rotas de Gestao de Administradores
 * Super Cartola Manager
 *
 * IMPORTANTE: Super Admin é definido via variável de ambiente ADMIN_EMAILS.
 * ✅ Agora usa configuração centralizada (config/admin-config.js)
 */
import express from "express";
import mongoose from "mongoose";
import { getDB } from "../config/database.js";
import { isSuperAdmin as checkSuperAdmin, SUPER_ADMIN_EMAILS, PRIMARY_SUPER_ADMIN } from "../config/admin-config.js";

const { ObjectId } = mongoose.Types;
const router = express.Router();

const REPL_OWNER = process.env.REPL_OWNER || "";

console.log("[ADMIN-GESTAO] Rotas de gestao de admins carregadas");
console.log("[ADMIN-GESTAO] Super Admins (via env):", SUPER_ADMIN_EMAILS);
console.log("[ADMIN-GESTAO] Repl Owner:", REPL_OWNER || "(nao configurado)");

/**
 * Verifica se o admin logado é o Super Admin (DEV/Owner)
 * ✅ Agora usa configuração centralizada (config/admin-config.js)
 */
function isSuperAdmin(sessionAdmin) {
    if (!sessionAdmin) return false;

    const email = sessionAdmin.email?.toLowerCase();
    const nome = sessionAdmin.nome?.toLowerCase();
    const claims = sessionAdmin.claims;

    // 1. Verificar via config centralizada
    if (checkSuperAdmin(email)) {
        return true;
    }

    // 2. Verificar se é o REPL_OWNER (dono do Replit)
    if (REPL_OWNER) {
        const replOwnerLower = REPL_OWNER.toLowerCase();

        // Verificar pelo nome do usuário
        if (nome === replOwnerLower) {
            return true;
        }

        // Verificar pelos claims do Replit Auth (username, preferred_username, etc.)
        if (claims) {
            const username = (claims.preferred_username || claims.name || claims.sub || "").toLowerCase();
            if (username === replOwnerLower) {
                return true;
            }
        }

        // Verificar se o email começa com o username do owner
        if (email && email.startsWith(replOwnerLower + "@")) {
            return true;
        }
    }

    return false;
}

/**
 * Middleware para verificar se é super admin (DEV)
 * Super Admin é definido por variável de ambiente, NÃO por collection
 */
function requireSuperAdmin(req, res, next) {
    if (!req.session?.admin) {
        return res.status(401).json({
            success: false,
            message: "Acesso restrito a administradores"
        });
    }

    if (!isSuperAdmin(req.session.admin)) {
        return res.status(403).json({
            success: false,
            message: "Acesso restrito ao desenvolvedor do sistema"
        });
    }

    next();
}

/**
 * Middleware para verificar autenticacao admin
 */
function requireAdmin(req, res, next) {
    if (!req.session?.admin) {
        return res.status(401).json({
            success: false,
            message: "Acesso restrito a administradores"
        });
    }
    next();
}

/**
 * GET /api/admin/gestao/check-super
 * Verifica se o admin logado é Super Admin (DEV)
 */
router.get("/check-super", requireAdmin, (req, res) => {
    const isSuper = isSuperAdmin(req.session.admin);

    console.log("[ADMIN-GESTAO] check-super:", {
        email: req.session.admin?.email,
        isSuper,
        superAdmins: SUPER_ADMIN_EMAILS
    });

    res.json({
        success: true,
        isSuperAdmin: isSuper,
        email: req.session.admin.email,
        nome: req.session.admin.nome,
        replOwner: REPL_OWNER
    });
});

/**
 * GET /api/admin/gestao/admins
 * Lista todos os admins cadastrados (apenas para Super Admin)
 */
router.get("/admins", requireSuperAdmin, async (req, res) => {
    try {
        const db = getDB();

        const admins = await db.collection("admins").find({}).toArray();

        // Incluir o Super Admin na lista (sempre primeiro)
        const superAdminEntry = {
            id: "super-admin",
            email: PRIMARY_SUPER_ADMIN,
            nome: "Desenvolvedor",
            superAdmin: true,
            ativo: true,
            criadoEm: null,
            isEnvDefined: true // Marcador especial - não pode ser removido
        };

        const adminsList = [superAdminEntry, ...admins.map(a => ({
            id: a._id,
            email: a.email,
            nome: a.nome,
            superAdmin: false, // Admins da collection nunca são super
            ativo: a.ativo !== false,
            criadoEm: a.criadoEm,
            ultimoAcesso: a.ultimoAcesso,
            isEnvDefined: false
        }))];

        res.json({
            success: true,
            admins: adminsList,
            total: adminsList.length
        });

    } catch (error) {
        console.error("[ADMIN-GESTAO] Erro ao listar admins:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao listar administradores",
            error: error.message
        });
    }
});

/**
 * POST /api/admin/gestao/admins
 * Adiciona novo admin (apenas Super Admin pode fazer isso)
 */
router.post("/admins", requireSuperAdmin, async (req, res) => {
    try {
        const { email, nome } = req.body;
        const db = getDB();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email e obrigatorio"
            });
        }

        const emailLower = email.toLowerCase();

        // Não permitir adicionar um super admin (já configurado via env)
        if (checkSuperAdmin(emailLower)) {
            return res.status(400).json({
                success: false,
                message: "Este email ja e Super Admin (configurado via ambiente)"
            });
        }

        // Verificar se ja existe
        const existente = await db.collection("admins").findOne({ email: emailLower });
        if (existente) {
            return res.status(400).json({
                success: false,
                message: "Este email ja esta cadastrado como admin"
            });
        }

        // Nota: Para persistir, precisa adicionar nos Secrets do Replit
        // SUPER_ADMIN_EMAILS é readonly (vem de env), então só logamos
        if (SUPER_ADMIN_EMAILS.includes(emailLower)) {
            console.log(`[ADMIN-GESTAO] Email ${emailLower} já é Super Admin via env`);
        }

        const novoAdmin = {
            email: emailLower,
            nome: nome || email.split("@")[0],
            superAdmin: false, // Nunca super admin via interface
            ativo: true,
            criadoEm: new Date(),
            criadoPor: req.session.admin.email
        };

        const result = await db.collection("admins").insertOne(novoAdmin);

        console.log(`[ADMIN-GESTAO] Novo admin adicionado: ${emailLower} por ${req.session.admin.email}`);

        res.json({
            success: true,
            message: "Administrador adicionado com sucesso",
            admin: {
                id: result.insertedId,
                ...novoAdmin
            },
            nota: "Lembre-se de adicionar este email na variavel ADMIN_EMAILS nos Secrets do Replit para persistir"
        });

    } catch (error) {
        console.error("[ADMIN-GESTAO] Erro ao adicionar admin:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao adicionar administrador",
            error: error.message
        });
    }
});

/**
 * DELETE /api/admin/gestao/admins/:id
 * Remove um admin
 */
router.delete("/admins/:id", requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();

        // Não permitir remover o super admin definido por env
        if (id === "super-admin") {
            return res.status(400).json({
                success: false,
                message: "Super Admin e definido por variavel de ambiente e nao pode ser removido"
            });
        }

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "ID invalido"
            });
        }

        const result = await db.collection("admins").deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Administrador nao encontrado"
            });
        }

        res.json({
            success: true,
            message: "Administrador removido com sucesso"
        });

    } catch (error) {
        console.error("[ADMIN-GESTAO] Erro ao remover admin:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao remover administrador",
            error: error.message
        });
    }
});

/**
 * PUT /api/admin/gestao/admins/:id/toggle
 * Ativa/desativa um admin
 */
router.put("/admins/:id/toggle", requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();

        // Não permitir desativar o super admin
        if (id === "super-admin") {
            return res.status(400).json({
                success: false,
                message: "Super Admin nao pode ser desativado"
            });
        }

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "ID invalido"
            });
        }

        const admin = await db.collection("admins").findOne({ _id: new ObjectId(id) });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Administrador nao encontrado"
            });
        }

        const novoStatus = !(admin.ativo !== false);

        await db.collection("admins").updateOne(
            { _id: new ObjectId(id) },
            { $set: { ativo: novoStatus, updatedAt: new Date() } }
        );

        res.json({
            success: true,
            message: `Administrador ${novoStatus ? "ativado" : "desativado"} com sucesso`,
            ativo: novoStatus
        });

    } catch (error) {
        console.error("[ADMIN-GESTAO] Erro ao alternar status:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao alternar status",
            error: error.message
        });
    }
});

export default router;
