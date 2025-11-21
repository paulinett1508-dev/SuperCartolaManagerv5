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

// Middleware para verificar sessão de participante ativo
function verificarSessaoParticipante(req, res, next) {
  if (!req.session || !req.session.participante) {
    return res.status(401).json({
      error: "Sessão expirada ou inválida",
      needsLogin: true
    });
  }
  next();
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

// GET - Verificar sessão
router.get('/session', async (req, res) => {
    try {
        if (!req.session.participante) {
            return res.status(401).json({
                authenticated: false,
                message: 'Não autenticado'
            });
        }

        // Buscar dados atualizados do time
        const { default: Time } = await import('../models/Time.js');
        const timeId = req.session.participante.timeId;

        let timeData = null;
        if (timeId) {
            timeData = await Time.findOne({ time_id: timeId });
        }

        res.json({
            authenticated: true,
            participante: {
                ...req.session.participante,
                time: timeData ? {
                    nome: timeData.nome,
                    nome_cartola: timeData.nome_cartola,
                    clube_id: timeData.clube_id,
                    url_escudo_png: timeData.url_escudo_png
                } : null
            }
        });
    } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        res.status(500).json({ error: 'Erro ao verificar sessão' });
    }
});

// Obter extrato financeiro do participante logado
router.get("/extrato", verificarSessaoParticipante, async (req, res) => {
    try {
        const { timeId, ligaId } = req.session.participante;

        // Buscar dados da liga
        const { default: Liga } = await import("../models/Liga.js");
        const liga = await Liga.findById(ligaId);

        if (!liga) {
            return res.status(404).json({ error: "Liga não encontrada" });
        }

        const participante = liga.participantes.find(
            p => String(p.time_id) === String(timeId)
        );

        if (!participante) {
            return res.status(404).json({ error: "Participante não encontrado" });
        }

        res.json({
            success: true,
            participante: {
                time_id: participante.time_id,
                nome_cartola: participante.nome_cartola,
                nome_time: participante.nome_time,
                foto_perfil: participante.foto_perfil,
                foto_time: participante.foto_time
            },
            liga: {
                _id: liga._id,
                nome: liga.nome,
                descricao: liga.descricao
            }
        });
    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro ao buscar extrato:", error);
        res.status(500).json({ error: "Erro ao buscar dados" });
    }
});

// Rota para verificar status de autenticação do participante
router.get("/check", (req, res) => {
  if (req.session && req.session.participante) {
    res.json({
      authenticated: true,
      participante: {
        timeId: req.session.participante.timeId,
        nome: req.session.participante.participante.nome_cartola,
        time: req.session.participante.participante.nome_time
      }
    });
  } else {
    res.json({
      authenticated: false,
      needsLogin: true
    });
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

export { verificarSessaoParticipante };
export default router;