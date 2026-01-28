// =====================================================================
// CARTOLA PRO ROUTES - Endpoints de Escalacao Automatica + OAuth
// =====================================================================
// ⚠️ APENAS PARA PARTICIPANTES PREMIUM
// =====================================================================

import express from "express";
import cartolaProService from "../services/cartolaProService.js";
import { verificarParticipantePremium } from "../utils/premium-participante.js";
import { setupGloboOAuthRoutes, verificarAutenticacaoGlobo, getGloboToken } from "../config/globo-oauth.js";

const router = express.Router();

// =====================================================================
// MIDDLEWARE: Verificar Sessao de Participante
// =====================================================================
function verificarSessaoParticipante(req, res, next) {
    console.log('[CARTOLA-PRO] verificarSessaoParticipante:', {
        sessionId: req.sessionID,
        hasSession: !!req.session,
        hasParticipante: !!req.session?.participante,
        participante: req.session?.participante ? { timeId: req.session.participante.timeId, ligaId: req.session.participante.ligaId } : null
    });

    if (!req.session || !req.session.participante) {
        return res.status(401).json({
            success: false,
            error: "Sessao expirada. Faca login novamente.",
            needsLogin: true
        });
    }
    next();
}

// =====================================================================
// MIDDLEWARE: Verificar Acesso Premium (fonte unica: liga.participantes[].premium)
// =====================================================================
async function verificarPremium(req, res, next) {
    const acesso = await verificarParticipantePremium(req);

    if (!acesso.isPremium) {
        return res.status(acesso.code || 403).json({
            success: false,
            error: acesso.error || "Recurso exclusivo para participantes Premium",
            needsPremium: true
        });
    }

    req.participantePremium = acesso.participante;
    next();
}

// =====================================================================
// SETUP ROTAS OAUTH GLOBO
// =====================================================================
setupGloboOAuthRoutes(router);

// =====================================================================
// GET /api/cartola-pro/verificar-premium - Verificar se e Premium
// =====================================================================
router.get("/verificar-premium", verificarSessaoParticipante, async (req, res) => {
    try {
        const acesso = await verificarParticipantePremium(req);
        const isPremium = acesso.isPremium === true;

        // Verificar se esta autenticado na Globo
        const globoAuth = req.session?.cartolaProAuth;

        res.json({
            premium: isPremium,
            globoAuthenticated: !!globoAuth,
            globoEmail: globoAuth?.email || null
        });

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao verificar premium:', error);
        res.json({ premium: false });
    }
});

// =====================================================================
// GET /api/cartola-pro/status - Status do Mercado
// =====================================================================
router.get("/status", verificarSessaoParticipante, async (req, res) => {
    try {
        const resultado = await cartolaProService.verificarMercado();
        res.json(resultado);
    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao verificar status:', error);
        res.status(500).json({
            success: false,
            error: "Erro ao verificar status do mercado"
        });
    }
});

// =====================================================================
// GET /api/cartola-pro/mercado - Buscar Jogadores do Mercado
// =====================================================================
router.get("/mercado", verificarSessaoParticipante, verificarPremium, async (req, res) => {
    try {
        // Tentar usar token OAuth, senao usar header
        const glbToken = getGloboToken(req) || req.headers['x-glb-token'];

        if (!glbToken) {
            return res.status(401).json({
                success: false,
                error: "Conecte sua conta Globo primeiro",
                needsGloboAuth: true
            });
        }

        const resultado = await cartolaProService.buscarMercado(glbToken);

        if (!resultado.success) {
            const status = resultado.sessaoExpirada ? 401 : 400;
            return res.status(status).json(resultado);
        }

        res.json(resultado);

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao buscar mercado:', error);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar jogadores"
        });
    }
});

// =====================================================================
// GET /api/cartola-pro/sugestao - Time Sugerido (Algoritmo Proprio)
// =====================================================================
router.get("/sugestao", verificarSessaoParticipante, verificarPremium, async (req, res) => {
    try {
        const esquema = parseInt(req.query.esquema) || 3; // 4-3-3 padrao
        const patrimonio = parseFloat(req.query.patrimonio) || 100;

        const resultado = await cartolaProService.gerarTimeSugerido(esquema, patrimonio);

        res.json(resultado);

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao gerar sugestao:', error);
        res.status(500).json({
            success: false,
            error: "Erro ao gerar time sugerido"
        });
    }
});

// =====================================================================
// GET /api/cartola-pro/nao-escalaram - Participantes que Nao Escalaram
// =====================================================================
router.get("/nao-escalaram", verificarSessaoParticipante, verificarPremium, async (req, res) => {
    try {
        const { ligaId } = req.session.participante;
        const liga = req.liga;

        // Buscar status do mercado para saber rodada atual
        const statusMercado = await cartolaProService.verificarMercado();
        const rodadaAtual = statusMercado.rodadaAtual || 1;

        // Buscar escalacoes da rodada
        const participantesAtivos = liga.participantes.filter(p => p.ativo !== false);
        const naoEscalaram = [];
        const escalaram = [];

        for (const p of participantesAtivos) {
            try {
                // Verificar se escalou (buscar no Cartola)
                const response = await fetch(`https://api.cartolafc.globo.com/time/id/${p.time_id}`);
                const data = await response.json();

                // Se rodada_atual do time for diferente da rodada atual, nao escalou
                if (data.time && data.time.rodada_atual !== rodadaAtual) {
                    naoEscalaram.push({
                        time_id: p.time_id,
                        nome_cartola: p.nome_cartola,
                        nome_time: p.nome_time,
                        clube_id: p.clube_id
                    });
                } else {
                    escalaram.push({
                        time_id: p.time_id,
                        nome_cartola: p.nome_cartola,
                        nome_time: p.nome_time
                    });
                }
            } catch {
                // Se falhar, considerar como nao verificado
                naoEscalaram.push({
                    time_id: p.time_id,
                    nome_cartola: p.nome_cartola,
                    nome_time: p.nome_time,
                    clube_id: p.clube_id,
                    status: 'nao_verificado'
                });
            }
        }

        res.json({
            success: true,
            rodada: rodadaAtual,
            naoEscalaram,
            escalaram,
            total: participantesAtivos.length
        });

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao buscar nao escalaram:', error);
        res.status(500).json({
            success: false,
            error: "Erro ao verificar escalacoes"
        });
    }
});

// =====================================================================
// GET /api/cartola-pro/meu-time - Time Atual do Usuario
// =====================================================================
router.get("/meu-time", verificarSessaoParticipante, verificarPremium, async (req, res) => {
    try {
        const glbToken = getGloboToken(req) || req.headers['x-glb-token'];

        if (!glbToken) {
            return res.status(401).json({
                success: false,
                error: "Conecte sua conta Globo primeiro",
                needsGloboAuth: true
            });
        }

        const resultado = await cartolaProService.buscarMeuTime(glbToken);
        res.json(resultado);

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao buscar meu time:', error);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar seu time"
        });
    }
});

// =====================================================================
// POST /api/cartola-pro/escalar - Salvar Escalacao
// =====================================================================
router.post("/escalar", verificarSessaoParticipante, verificarPremium, async (req, res) => {
    try {
        const glbToken = getGloboToken(req) || req.headers['x-glb-token'];
        const { atletas, esquema, capitao } = req.body;

        if (!glbToken) {
            return res.status(401).json({
                success: false,
                error: "Conecte sua conta Globo primeiro",
                needsGloboAuth: true
            });
        }

        if (!atletas || !Array.isArray(atletas) || atletas.length !== 12) {
            return res.status(400).json({
                success: false,
                error: "Selecione 12 jogadores (11 + tecnico)"
            });
        }

        if (!esquema || esquema < 1 || esquema > 7) {
            return res.status(400).json({
                success: false,
                error: "Esquema de formacao invalido"
            });
        }

        if (!capitao || !atletas.includes(capitao)) {
            return res.status(400).json({
                success: false,
                error: "Capitao deve ser um dos atletas selecionados"
            });
        }

        const resultado = await cartolaProService.salvarEscalacao(
            glbToken,
            atletas,
            esquema,
            capitao
        );

        if (!resultado.success) {
            const status = resultado.sessaoExpirada ? 401 : 400;
            return res.status(status).json(resultado);
        }

        res.json({
            success: true,
            message: "Escalacao salva com sucesso!"
        });

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao salvar escalacao:', error);
        res.status(500).json({
            success: false,
            error: "Erro ao salvar escalacao"
        });
    }
});

// =====================================================================
// POST /api/cartola-pro/auth - Autenticacao Direta (FALLBACK)
// =====================================================================
// Mantido como fallback caso OAuth nao funcione
router.post("/auth", verificarSessaoParticipante, verificarPremium, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email e senha sao obrigatorios"
            });
        }

        const resultado = await cartolaProService.autenticar(email, password);

        if (!resultado.success) {
            return res.status(401).json(resultado);
        }

        // Salvar na sessao
        req.session.cartolaProAuth = {
            glbid: resultado.glbId,
            email: email,
            authenticated_at: Date.now(),
            method: 'direct'
        };

        res.json({
            success: true,
            glbId: resultado.glbId,
            expiresIn: resultado.expiresIn
        });

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro no auth direto:', error);
        res.status(500).json({
            success: false,
            error: "Erro interno ao autenticar"
        });
    }
});

export default router;
