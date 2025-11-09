
import express from "express";

const router = express.Router();

// Middleware para verificar autenticação Replit
function verificarReplitAuth(req, res, next) {
    const userId = req.headers["x-replit-user-id"];
    const username = req.headers["x-replit-user-name"];

    if (!userId || !username) {
        return res.status(401).json({ error: "Não autenticado com Replit" });
    }

    req.replitUser = { userId, username };
    next();
}

// Verificar status de autenticação
router.get("/check", verificarReplitAuth, (req, res) => {
    res.json({
        authenticated: true,
        userId: req.replitUser.userId,
        username: req.replitUser.username,
    });
});

// Login do participante (valida timeId)
router.post("/login", verificarReplitAuth, async (req, res) => {
    try {
        const { timeId } = req.body;

        if (!timeId) {
            return res.status(400).json({ error: "timeId é obrigatório" });
        }

        // Buscar time em todas as ligas
        const { default: Liga } = await import("../models/Liga.js");
        const ligas = await Liga.find({});

        let participanteEncontrado = null;
        let ligaEncontrada = null;

        for (const liga of ligas) {
            const participante = liga.participantes.find(
                (p) => String(p.time_id) === String(timeId),
            );

            if (participante) {
                participanteEncontrado = participante;
                ligaEncontrada = liga;
                break;
            }
        }

        if (!participanteEncontrado) {
            return res
                .status(404)
                .json({ error: "ID do time não encontrado em nenhuma liga" });
        }

        // Criar sessão
        req.session = req.session || {};
        req.session.participante = {
            timeId: timeId,
            ligaId: ligaEncontrada._id.toString(),
            replitUserId: req.replitUser.userId,
            replitUsername: req.replitUser.username,
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

// Logout
router.post("/logout", (req, res) => {
    if (req.session) {
        req.session.destroy();
    }
    res.json({ success: true });
});

export default router;
