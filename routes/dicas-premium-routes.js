/**
 * DICAS PREMIUM ROUTES v1.2
 * Rotas da API para o modulo Dicas Premium
 * ✅ v1.1: Middleware verificarPremium centralizado (padrao cartola-pro-routes)
 * ✅ v1.2: Endpoints de modos de estrategia + modo-sugerido
 */

import express from 'express';
import { verificarParticipantePremium } from '../utils/premium-participante.js';
import * as dicasPremiumController from '../controllers/dicasPremiumController.js';
import { sugerirModo, listarModos } from '../services/estrategia-sugestao.js';

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

// GET /api/dicas-premium/modos - Listar modos de estrategia disponiveis
router.get('/modos', (req, res) => {
    res.json({ sucesso: true, modos: listarModos() });
});

// GET /api/dicas-premium/modo-sugerido - Sugerir modo por patrimonio
router.get('/modo-sugerido', (req, res) => {
    const patrimonio = parseFloat(req.query.patrimonio) || 100;
    res.json({ sucesso: true, ...sugerirModo(patrimonio) });
});

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
