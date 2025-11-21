
import express from "express";
import Liga from "../models/Liga.js";

const router = express.Router();

// Rota de login
router.post("/login", async (req, res) => {
  try {
    const { timeId, senha, ligaId } = req.body;

    if (!timeId || !senha || !ligaId) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do time, senha e ID da liga são obrigatórios",
      });
    }

    // Buscar a liga
    const liga = await Liga.findById(ligaId);
    if (!liga) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Liga não encontrada",
      });
    }

    // Buscar o participante na liga
    const participante = liga.participantes.find(
      (p) => p.time_id === parseInt(timeId)
    );

    if (!participante) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Time não encontrado nesta liga",
      });
    }

    // Verificar senha
    if (participante.senha_acesso !== senha) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Senha incorreta",
      });
    }

    // Criar sessão
    req.session.participante = {
      timeId: participante.time_id,
      ligaId: ligaId,
      participante: participante,
    };

    res.json({
      sucesso: true,
      mensagem: "Login realizado com sucesso",
      dados: {
        timeId: participante.time_id,
        ligaId: ligaId,
        participante: participante,
      },
    });
  } catch (error) {
    console.error("[AUTH] Erro no login:", error);
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao realizar login",
      erro: error.message,
    });
  }
});

// Rota de logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        sucesso: false,
        mensagem: "Erro ao fazer logout",
      });
    }
    res.json({
      sucesso: true,
      mensagem: "Logout realizado com sucesso",
    });
  });
});

// Rota para verificar autenticação
router.get("/verificar", (req, res) => {
  if (req.session && req.session.participante) {
    res.json({
      autenticado: true,
      dados: req.session.participante,
    });
  } else {
    res.json({
      autenticado: false,
    });
  }
});

export default router;
