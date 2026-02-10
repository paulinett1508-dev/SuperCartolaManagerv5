// =====================================================================
// manutencao-participante-routes.js - Status de manutenção para o App
// =====================================================================
// Endpoint PÚBLICO que o app participante consulta para saber se deve
// exibir a tela "Calma aê!" ou liberar acesso normal.
// Também suporta dev bypass via sessão admin (Replit Auth).
// =====================================================================

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { verificarParticipantePremium } from "../utils/premium-participante.js";

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
 * GET /api/participante/manutencao/status
 *
 * Retorna o estado de manutenção para o app participante.
 * Verifica na ordem:
 *   1. Manutenção ativa? Se não → libera
 *   2. Sessão admin (dev bypass via Replit Auth)? → libera com flag devBypass
 *   3. Participante Premium? → libera com flag premiumBypass
 *   4. TimeId na whitelist? → libera
 *   5. Senão → bloqueado, retorna customização da splash
 */
router.get("/status", async (req, res) => {
    try {
        const estado = lerEstado();

        // Se manutenção não está ativa, liberar
        if (!estado.ativo) {
            return res.json({ ativo: false, bloqueado: false });
        }

        // Dev bypass: admin logado via Replit Auth na mesma sessão
        const isAdmin = !!req.session?.admin;
        if (isAdmin) {
            console.log("[MANUTENCAO-APP] Dev bypass ativo para:", req.session.admin.email);
            return res.json({
                ativo: true,
                bloqueado: false,
                devBypass: true
            });
        }

        // Premium bypass: participante premium nunca é bloqueado por manutenção
        const acesso = await verificarParticipantePremium(req);
        if (acesso.isPremium) {
            console.log("[MANUTENCAO-APP] Premium bypass para timeId:", req.session?.participante?.timeId);
            return res.json({
                ativo: true,
                bloqueado: false,
                premiumBypass: true
            });
        }

        // Verificar whitelist por timeId
        const timeId = req.session?.participante?.timeId;
        const controle = estado.controle_acesso || {};
        const whitelist = controle.whitelist_timeIds || [];

        if (controle.modo_lista === "whitelist" && timeId && whitelist.includes(String(timeId))) {
            return res.json({
                ativo: true,
                bloqueado: false,
                whitelisted: true
            });
        }

        // Bloqueado - retornar config da splash
        return res.json({
            ativo: true,
            bloqueado: true,
            customizacao: estado.customizacao || {}
        });
    } catch (error) {
        console.error("[MANUTENCAO-APP] Erro ao verificar status:", error.message);
        // Em caso de erro, não bloquear
        return res.json({ ativo: false, bloqueado: false });
    }
});

export default router;
