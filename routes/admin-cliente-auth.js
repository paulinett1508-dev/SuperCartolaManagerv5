/**
 * Autenticação para Clientes Admin (Email + Senha)
 * Super Cartola Manager
 *
 * IMPORTANTE: Este sistema é para clientes que adquiriram o sistema.
 * Eles NÃO são Super Admin, apenas Admin regular.
 * Super Admin sempre autentica via Replit Auth.
 */
import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDB } from "../config/database.js";
import {
    isSuperAdmin as checkSuperAdmin,
    isAdminSuper,
    SUPER_ADMIN_EMAILS
} from "../config/admin-config.js";

const router = express.Router();

// ✅ isSuperAdmin removida (usar isAdminSuper de config/admin-config.js)

console.log("[CLIENTE-AUTH] Rotas de autenticacao cliente carregadas");
console.log("[CLIENTE-AUTH] Super Admins (via env):", SUPER_ADMIN_EMAILS);

/**
 * Gera senha provisoria aleatoria
 */
function gerarSenhaProvisoria(tamanho = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let senha = "";
    for (let i = 0; i < tamanho; i++) {
        senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return senha;
}

/**
 * POST /api/admin/cliente/registrar
 * Registra novo cliente admin (apenas Super Admin pode fazer isso)
 * Gera senha provisoria e retorna (para ser enviada por email)
 */
router.post("/registrar", async (req, res) => {
    try {
        const { email, nome } = req.body;
        const db = getDB();

        // Verificar se quem está chamando é Super Admin
        if (!isAdminSuper(req.session?.admin)) {
            console.log("[CLIENTE-AUTH] Acesso negado para:", req.session?.admin?.email);
            return res.status(403).json({
                success: false,
                message: "Apenas o desenvolvedor pode registrar novos clientes"
            });
        }

        console.log("[CLIENTE-AUTH] Super Admin autorizado:", req.session?.admin?.email);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email e obrigatorio"
            });
        }

        const emailLower = email.toLowerCase();

        // Verificar se ja existe
        const existente = await db.collection("admins").findOne({ email: emailLower });
        if (existente) {
            return res.status(400).json({
                success: false,
                message: "Este email ja esta cadastrado"
            });
        }

        // Gerar senha provisoria
        const senhaProvisoria = gerarSenhaProvisoria();
        const senhaHash = await bcrypt.hash(senhaProvisoria, 10);

        const novoCliente = {
            email: emailLower,
            nome: nome || email.split("@")[0],
            senhaHash: senhaHash,
            senhaProvisoria: true, // Indica que precisa trocar a senha
            superAdmin: false, // NUNCA super admin
            ativo: true,
            criadoEm: new Date(),
            criadoPor: req.session?.admin?.email?.toLowerCase() || "sistema",
            tipo: "cliente" // Diferencia de outros admins
        };

        const result = await db.collection("admins").insertOne(novoCliente);

        console.log(`[CLIENTE-AUTH] Novo cliente registrado: ${emailLower}`);
        console.log(`[CLIENTE-AUTH] Senha provisoria: ${senhaProvisoria}`);

        res.json({
            success: true,
            message: "Cliente registrado com sucesso",
            cliente: {
                id: result.insertedId,
                email: emailLower,
                nome: novoCliente.nome
            },
            senhaProvisoria: senhaProvisoria,
            instrucoes: "Envie esta senha por email para o cliente. Ele devera troca-la no primeiro acesso."
        });

    } catch (error) {
        console.error("[CLIENTE-AUTH] Erro ao registrar cliente:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao registrar cliente",
            error: error.message
        });
    }
});

/**
 * POST /api/admin/cliente/login
 * Login com email e senha (para clientes)
 */
router.post("/login", async (req, res) => {
    try {
        const { email, senha } = req.body;
        const db = getDB();

        if (!email || !senha) {
            return res.status(400).json({
                success: false,
                message: "Email e senha sao obrigatorios"
            });
        }

        const emailLower = email.toLowerCase();

        // Buscar admin
        const admin = await db.collection("admins").findOne({ email: emailLower });

        if (!admin) {
            console.log(`[CLIENTE-AUTH] Login falhou - email nao encontrado: ${emailLower}`);
            return res.status(401).json({
                success: false,
                message: "Email ou senha incorretos"
            });
        }

        // Verificar se esta ativo
        if (admin.ativo === false) {
            console.log(`[CLIENTE-AUTH] Login falhou - conta desativada: ${emailLower}`);
            return res.status(401).json({
                success: false,
                message: "Conta desativada. Contate o suporte."
            });
        }

        // Verificar senha
        if (!admin.senhaHash) {
            console.log(`[CLIENTE-AUTH] Login falhou - admin sem senha (use Replit Auth): ${emailLower}`);
            return res.status(401).json({
                success: false,
                message: "Esta conta usa autenticacao Replit. Use o botao 'Entrar com Replit'."
            });
        }

        const senhaValida = await bcrypt.compare(senha, admin.senhaHash);
        if (!senhaValida) {
            console.log(`[CLIENTE-AUTH] Login falhou - senha incorreta: ${emailLower}`);
            return res.status(401).json({
                success: false,
                message: "Email ou senha incorretos"
            });
        }

        // Login bem sucedido - criar sessao
        req.session.admin = {
            id: admin._id.toString(),
            email: admin.email,
            nome: admin.nome,
            foto: null,
            tipo: admin.tipo || "cliente",
            superAdmin: false // NUNCA super admin via login com senha
        };

        // Atualizar ultimo acesso
        await db.collection("admins").updateOne(
            { _id: admin._id },
            { $set: { ultimoAcesso: new Date() } }
        );

        console.log(`[CLIENTE-AUTH] Login bem sucedido: ${emailLower}`);

        res.json({
            success: true,
            message: "Login realizado com sucesso",
            admin: {
                email: admin.email,
                nome: admin.nome,
                tipo: admin.tipo || "cliente"
            },
            senhaProvisoria: admin.senhaProvisoria || false
        });

    } catch (error) {
        console.error("[CLIENTE-AUTH] Erro no login:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao realizar login",
            error: error.message
        });
    }
});

/**
 * POST /api/admin/cliente/trocar-senha
 * Troca de senha (requer estar logado)
 */
router.post("/trocar-senha", async (req, res) => {
    try {
        const { senhaAtual, novaSenha } = req.body;
        const db = getDB();

        if (!req.session?.admin) {
            return res.status(401).json({
                success: false,
                message: "Nao autenticado"
            });
        }

        if (!novaSenha || novaSenha.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Nova senha deve ter pelo menos 6 caracteres"
            });
        }

        const emailLower = req.session.admin.email.toLowerCase();
        const admin = await db.collection("admins").findOne({ email: emailLower });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin nao encontrado"
            });
        }

        // Se nao e senha provisoria, verificar senha atual
        if (!admin.senhaProvisoria && senhaAtual) {
            const senhaValida = await bcrypt.compare(senhaAtual, admin.senhaHash);
            if (!senhaValida) {
                return res.status(401).json({
                    success: false,
                    message: "Senha atual incorreta"
                });
            }
        }

        // Gerar hash da nova senha
        const novoHash = await bcrypt.hash(novaSenha, 10);

        await db.collection("admins").updateOne(
            { _id: admin._id },
            {
                $set: {
                    senhaHash: novoHash,
                    senhaProvisoria: false,
                    updatedAt: new Date()
                }
            }
        );

        console.log(`[CLIENTE-AUTH] Senha alterada: ${emailLower}`);

        res.json({
            success: true,
            message: "Senha alterada com sucesso"
        });

    } catch (error) {
        console.error("[CLIENTE-AUTH] Erro ao trocar senha:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao trocar senha",
            error: error.message
        });
    }
});

/**
 * POST /api/admin/cliente/resetar-senha
 * Reseta senha de um cliente (apenas Super Admin)
 */
router.post("/resetar-senha", async (req, res) => {
    try {
        const { email } = req.body;
        const db = getDB();

        // Verificar se quem está chamando é Super Admin
        const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL ||
            (process.env.ADMIN_EMAILS || "").split(",")[0] || "").toLowerCase();

        const callerEmail = req.session?.admin?.email?.toLowerCase();

        if (callerEmail !== superAdminEmail) {
            return res.status(403).json({
                success: false,
                message: "Apenas o desenvolvedor pode resetar senhas"
            });
        }

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email e obrigatorio"
            });
        }

        const emailLower = email.toLowerCase();
        const admin = await db.collection("admins").findOne({ email: emailLower });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Cliente nao encontrado"
            });
        }

        // Gerar nova senha provisoria
        const senhaProvisoria = gerarSenhaProvisoria();
        const senhaHash = await bcrypt.hash(senhaProvisoria, 10);

        await db.collection("admins").updateOne(
            { _id: admin._id },
            {
                $set: {
                    senhaHash: senhaHash,
                    senhaProvisoria: true,
                    updatedAt: new Date()
                }
            }
        );

        console.log(`[CLIENTE-AUTH] Senha resetada: ${emailLower}`);
        console.log(`[CLIENTE-AUTH] Nova senha provisoria: ${senhaProvisoria}`);

        res.json({
            success: true,
            message: "Senha resetada com sucesso",
            senhaProvisoria: senhaProvisoria,
            instrucoes: "Envie esta nova senha por email para o cliente."
        });

    } catch (error) {
        console.error("[CLIENTE-AUTH] Erro ao resetar senha:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao resetar senha",
            error: error.message
        });
    }
});

export default router;
