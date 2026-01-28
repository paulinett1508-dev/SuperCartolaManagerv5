/**
 * DICAS PREMIUM ROUTES v1.0
 * Rotas da API para o modulo Dicas Premium
 */

import express from 'express';
import * as dicasPremiumController from '../controllers/dicasPremiumController.js';

const router = express.Router();

// GET /api/dicas-premium/jogadores - Lista jogadores com filtros
router.get('/jogadores', dicasPremiumController.listarJogadores);

// GET /api/dicas-premium/jogador/:id - Detalhes de um jogador
router.get('/jogador/:id', dicasPremiumController.obterJogador);

// GET /api/dicas-premium/confrontos - Pontuacao cedida
router.get('/confrontos', dicasPremiumController.listarConfrontos);

// GET /api/dicas-premium/calculadora-mpv - Calculadora MPV
router.get('/calculadora-mpv', dicasPremiumController.calcularMPV);

// POST /api/dicas-premium/sugestao - Gerar sugestao de escalacao
router.post('/sugestao', dicasPremiumController.gerarSugestao);

export default router;
