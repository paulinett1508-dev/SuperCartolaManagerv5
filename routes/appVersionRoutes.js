// =====================================================================
// appVersionRoutes.js - Rotas de versão do app v2.0
// =====================================================================
// v2.0: Endpoints separados para participante e admin
// =====================================================================

import express from "express";
import APP_VERSION, { PARTICIPANTE_VERSION, ADMIN_VERSION } from "../config/appVersion.js";

const router = express.Router();

// GET /api/app/versao - Retorna versão do PARTICIPANTE (compatibilidade)
router.get("/versao", (req, res) => {
    res.json(PARTICIPANTE_VERSION);
});

// GET /api/app/versao/participante - Versão específica do app mobile
router.get("/versao/participante", (req, res) => {
    res.json(PARTICIPANTE_VERSION);
});

// GET /api/app/versao/admin - Versão específica do painel admin
router.get("/versao/admin", (req, res) => {
    res.json(ADMIN_VERSION);
});

// GET /api/app/versao/all - Retorna todas as versões (debug)
router.get("/versao/all", (req, res) => {
    res.json({
        participante: PARTICIPANTE_VERSION,
        admin: ADMIN_VERSION,
    });
});

export default router;
