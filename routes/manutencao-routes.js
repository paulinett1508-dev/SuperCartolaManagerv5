// =====================================================================
// manutencao-routes.js - Modo Manutenção do App Participante v1.0
// =====================================================================
// Permite ao admin ativar/desativar um aviso amigável no app
// que bloqueia o uso normal mas permite ver ranking e rodada
// =====================================================================

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, "..", "config", "manutencao.json");

const router = express.Router();

/**
 * Lê o estado atual do modo manutenção
 */
function lerEstado() {
    try {
        const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
        return JSON.parse(raw);
    } catch {
        return { ativo: false };
    }
}

/**
 * Salva o estado do modo manutenção
 */
function salvarEstado(estado) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(estado, null, 2), "utf-8");
}

// GET /api/admin/manutencao - Status atual
router.get("/manutencao", (req, res) => {
    const estado = lerEstado();
    res.json(estado);
});

// POST /api/admin/manutencao/ativar - Ativa modo manutenção
router.post("/manutencao/ativar", (req, res) => {
    try {
        const estado = { ativo: true, ativadoEm: new Date().toISOString() };
        salvarEstado(estado);
        console.log("[MANUTENCAO] Modo manutenção ATIVADO");
        res.json({ ok: true, ...estado });
    } catch (error) {
        console.error("[MANUTENCAO] Erro ao ativar:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// POST /api/admin/manutencao/desativar - Desativa modo manutenção
router.post("/manutencao/desativar", (req, res) => {
    try {
        const estado = { ativo: false };
        salvarEstado(estado);
        console.log("[MANUTENCAO] Modo manutenção DESATIVADO");
        res.json({ ok: true, ...estado });
    } catch (error) {
        console.error("[MANUTENCAO] Erro ao desativar:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

export default router;
