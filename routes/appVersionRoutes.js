// =====================================================================
// appVersionRoutes.js - Rota de versão do app
// Destino: /routes/appVersionRoutes.js
// =====================================================================

import express from "express";
import APP_VERSION from "../config/appVersion.js";

const router = express.Router();

// GET /api/app/versao
router.get("/versao", (req, res) => {
    res.json(APP_VERSION);
});

export default router;
