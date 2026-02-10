/**
 * DICAS PREMIUM ROUTES v1.1
 * Rotas da API para o modulo Dicas Premium
 * ✅ v1.1: Middleware verificarPremium centralizado (padrao cartola-pro-routes)
 */

import express from 'express';
import { verificarParticipantePremium } from '../utils/premium-participante.js';
import * as dicasPremiumController from '../controllers/dicasPremiumController.js';

const router = express.Router();

// =====================================================================
// MIDDLEWARE: Verificar Acesso Premium (fonte unica: liga.participantes[].premium)
// =====================================================================
async function verificarPremium(req, res, next) {
    const acesso = await verificarParticipantePremium(req);

    if (!acesso.isPremium) {
        return res.status(acesso.code || 403).json({
            sucesso: false,
            erro: acesso.error || "Recurso exclusivo para participantes Premium",
            premium: false
        });
    }

    req.participantePremium = acesso.participante;
    next();
}

// GET /api/dicas-premium/jogadores - Lista jogadores com filtros
router.get('/jogadores', verificarPremium, dicasPremiumController.listarJogadores);

// GET /api/dicas-premium/jogador/:id - Detalhes de um jogador
router.get('/jogador/:id', verificarPremium, dicasPremiumController.obterJogador);

// GET /api/dicas-premium/confrontos - Pontuacao cedida
router.get('/confrontos', verificarPremium, dicasPremiumController.listarConfrontos);

// GET /api/dicas-premium/calculadora-mpv - Calculadora MPV
router.get('/calculadora-mpv', verificarPremium, dicasPremiumController.calcularMPV);

// POST /api/dicas-premium/sugestao - Gerar sugestao de escalacao
router.post('/sugestao', verificarPremium, dicasPremiumController.gerarSugestao);

export default router;
