import express from "express";
import session from "express-session";

const router = express.Router();

// Middleware de autenticação Replit
function verificarAutenticacao(req, res, next) {
  if (req.headers["x-replit-user-id"]) {
    req.user = {
      id: req.headers["x-replit-user-id"],
      name: req.headers["x-replit-user-name"],
      roles: req.headers["x-replit-user-roles"],
    };
    return next();
  }
  res.status(401).json({ erro: "Não autenticado" });
}

// Login do participante (valida timeId + senha)
router.post("/login", async (req, res) => {
    try {
        const { timeId, senha } = req.body;

        if (!timeId || !senha) {
            return res.status(400).json({ 
                error: "ID do time e senha são obrigatórios" 
            });
        }

        // Buscar time em todas as ligas
        const { default: Liga } = await import("../models/Liga.js");
        const ligas = await Liga.find({});

        let participanteEncontrado = null;
        let ligaEncontrada = null;

        for (const liga of ligas) {
            const participante = liga.participantes.find(
                (p) => String(p.time_id) === String(timeId)
            );

            if (participante) {
                participanteEncontrado = participante;
                ligaEncontrada = liga;
                break;
            }
        }

        if (!participanteEncontrado) {
            return res.status(404).json({ 
                error: "ID do time não encontrado" 
            });
        }

        // Validar senha
        if (participanteEncontrado.senha_acesso !== senha) {
            return res.status(401).json({ 
                error: "Senha incorreta" 
            });
        }

        // Criar sessão
        req.session.participante = {
            timeId: timeId,
            ligaId: ligaEncontrada._id.toString(),
            participante: participanteEncontrado,
        };

        res.json({
            success: true,
            message: "Login realizado com sucesso",
            participante: {
                nome: participanteEncontrado.nome_cartola,
                time: participanteEncontrado.nome_time,
            },
        });
    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro no login:", error);
        res.status(500).json({ error: "Erro ao processar login" });
    }
});

// Verificar sessão ativa
router.get("/session", (req, res) => {
    if (!req.session || !req.session.participante) {
        return res.status(401).json({ error: "Sessão não encontrada" });
    }

    res.json(req.session.participante);
});

// Rota para verificar status de autenticação Replit
router.get("/check", (req, res) => {
  if (req.headers["x-replit-user-id"]) {
    res.json({
      authenticated: true,
      user: {
        id: req.headers["x-replit-user-id"],
        name: req.headers["x-replit-user-name"],
        roles: req.headers["x-replit-user-roles"],
      },
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Rota para logout (ajustada para o novo padrão)
router.post("/logout", (req, res) => {
  // Se houver sessão de participante, a destruímos
  if (req.session && req.session.participante) {
    req.session.destroy();
  }
  // Respondemos com sucesso, indicando que o logout foi processado
  res.json({ success: true, message: "Logout realizado com sucesso" });
});

export default router;