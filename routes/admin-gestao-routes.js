/**
 * Rotas de Gestao de Administradores
 * Super Cartola Manager
 *
 * Endpoints para gerenciar usuarios admin do sistema
 */
import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/database.js";

const router = express.Router();

console.log("[ADMIN-GESTAO] Rotas de gestao de admins carregadas");

/**
 * Middleware para verificar se e super admin (primeiro admin cadastrado)
 */
async function requireSuperAdmin(req, res, next) {
    if (!req.session?.admin) {
        return res.status(401).json({
            success: false,
            message: "Acesso restrito a administradores"
        });
    }

    const db = getDB();
    const adminEmail = req.session.admin.email;

    // Verificar se e super admin
    const admin = await db.collection("admins").findOne({ email: adminEmail });
    if (!admin?.superAdmin) {
        return res.status(403).json({
            success: false,
            message: "Acesso restrito a super administradores"
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
 * GET /api/admin/gestao/admins
 * Lista todos os admins cadastrados
 */
router.get("/admins", requireAdmin, async (req, res) => {
    try {
        const db = getDB();

        const admins = await db.collection("admins").find({}).toArray();

        res.json({
            success: true,
            admins: admins.map(a => ({
                id: a._id,
                email: a.email,
                nome: a.nome,
                superAdmin: a.superAdmin || false,
                ativo: a.ativo !== false,
                criadoEm: a.criadoEm,
                ultimoAcesso: a.ultimoAcesso
            })),
            total: admins.length
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
 * Adiciona novo admin
 */
router.post("/admins", requireSuperAdmin, async (req, res) => {
    try {
        const { email, nome, superAdmin } = req.body;
        const db = getDB();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email e obrigatorio"
            });
        }

        // Verificar se ja existe
        const existente = await db.collection("admins").findOne({ email: email.toLowerCase() });
        if (existente) {
            return res.status(400).json({
                success: false,
                message: "Este email ja esta cadastrado como admin"
            });
        }

        const novoAdmin = {
            email: email.toLowerCase(),
            nome: nome || email.split("@")[0],
            superAdmin: superAdmin === true,
            ativo: true,
            criadoEm: new Date(),
            criadoPor: req.session.admin.email
        };

        const result = await db.collection("admins").insertOne(novoAdmin);

        res.json({
            success: true,
            message: "Administrador adicionado com sucesso",
            admin: {
                id: result.insertedId,
                ...novoAdmin
            }
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

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "ID invalido"
            });
        }

        // Nao permitir remover a si mesmo
        const admin = await db.collection("admins").findOne({ _id: new ObjectId(id) });
        if (admin?.email === req.session.admin.email) {
            return res.status(400).json({
                success: false,
                message: "Voce nao pode remover a si mesmo"
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

        // Nao permitir desativar a si mesmo
        if (admin.email === req.session.admin.email) {
            return res.status(400).json({
                success: false,
                message: "Voce nao pode desativar a si mesmo"
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

/**
 * POST /api/admin/gestao/setup
 * Configura o primeiro admin (bootstrap)
 */
router.post("/setup", async (req, res) => {
    try {
        const db = getDB();

        // Verificar se ja existe algum admin
        const count = await db.collection("admins").countDocuments();
        if (count > 0) {
            return res.status(400).json({
                success: false,
                message: "Sistema ja configurado. Use a interface de gestao."
            });
        }

        // Usar email da sessao ou do body
        let email = req.session?.admin?.email || req.body?.email;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email nao informado"
            });
        }

        const primeiroAdmin = {
            email: email.toLowerCase(),
            nome: req.session?.admin?.nome || email.split("@")[0],
            superAdmin: true,
            ativo: true,
            criadoEm: new Date(),
            criadoPor: "setup-inicial"
        };

        await db.collection("admins").insertOne(primeiroAdmin);

        res.json({
            success: true,
            message: "Primeiro administrador configurado com sucesso",
            admin: primeiroAdmin
        });

    } catch (error) {
        console.error("[ADMIN-GESTAO] Erro no setup:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao configurar administrador",
            error: error.message
        });
    }
});

export default router;
