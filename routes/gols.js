
import express from "express";
import {
  extrairGolsDaRodada,
  listarGols,
} from "../controllers/golsController.js";

const router = express.Router();

// CORREÇÃO: Removido o padrão duplicado "/gols/" que estava causando rotas como /api/gols/gols/
// Agora as rotas ficam limpas: /api/gols/extrair, /api/gols/listar

console.log("[ROUTES] gols.routes.js carregado");

// Middleware para log das requisições
router.use((req, res, next) => {
  console.log(`[GOLS ROUTES] ${req.method} ${req.originalUrl}`);
  next();
});

// CORREÇÃO: Rotas principais sem duplicação
router.post("/extrair", extrairGolsDaRodada);
router.get("/listar", listarGols);

// CORREÇÃO: Rota para artilheiros removida daqui pois deve estar em artilheiro-campeao-routes.js
// Esta separação evita conflitos e mantém a organização

// Rota de teste para verificar se o módulo está funcionando
router.get("/teste", (req, res) => {
  res.json({
    success: true,
    message: "Módulo de gols funcionando",
    timestamp: new Date().toISOString(),
    rotas_disponiveis: [
      "POST /api/gols/extrair - Extrair gols de uma rodada",
      "GET /api/gols/listar - Listar todos os gols",
      "GET /api/gols/teste - Esta rota de teste"
    ]
  });
});

// Middleware para rotas não encontradas específicas do módulo gols
router.use((req, res) => {
  console.log(`[GOLS ROUTES] Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Rota não encontrada no módulo gols: ${req.method} ${req.originalUrl}`,
    rotas_disponiveis: [
      "POST /api/gols/extrair",
      "GET /api/gols/listar",
      "GET /api/gols/teste"
    ]
  });
});

export default router;
