// =====================================================================
// CARTOLA PRO ROUTES - Endpoints de Escalação Automática
// =====================================================================
// ⚠️ APENAS PARA PARTICIPANTES PREMIUM
// =====================================================================

import express from "express";
import cartolaProService from "../services/cartolaProService.js";
import Liga from "../models/Liga.js";

const router = express.Router();

// =====================================================================
// MIDDLEWARE: Verificar Sessão de Participante
// =====================================================================
function verificarSessaoParticipante(req, res, next) {
    if (!req.session || !req.session.participante) {
        return res.status(401).json({
            success: false,
            error: "Sessão expirada. Faça login novamente.",
            needsLogin: true
        });
    }
    next();
}

// =====================================================================
// MIDDLEWARE: Verificar Acesso Premium
// =====================================================================
async function verificarPremium(req, res, next) {
    try {
        const { timeId, ligaId } = req.session.participante;

        // Buscar participante na liga
        const liga = await Liga.findById(ligaId);
        if (!liga) {
            return res.status(404).json({
                success: false,
                error: "Liga não encontrada"
            });
        }

        const participante = liga.participantes.find(
            p => String(p.time_id) === String(timeId)
        );

        if (!participante) {
            return res.status(404).json({
                success: false,
                error: "Participante não encontrado na liga"
            });
        }

        // Verificar flag premium
        if (!participante.premium) {
            return res.status(403).json({
                success: false,
                error: "Recurso exclusivo para assinantes PRO",
                needsPremium: true
            });
        }

        // Adicionar dados ao request para uso posterior
        req.participantePremium = participante;
        next();

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao verificar premium:', error);
        res.status(500).json({
            success: false,
            error: "Erro ao verificar permissões"
        });
    }
}

// =====================================================================
// POST /api/cartola-pro/auth - Autenticação na Globo
// =====================================================================
router.post("/auth", verificarSessaoParticipante, verificarPremium, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email e senha são obrigatórios"
            });
        }

        // Autenticar na Globo
        const resultado = await cartolaProService.autenticar(email, password);

        if (!resultado.success) {
            return res.status(401).json(resultado);
        }

        // Retornar token (NÃO armazenamos credenciais)
        res.json({
            success: true,
            glbId: resultado.glbId,
            expiresIn: resultado.expiresIn
        });

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro no auth:', error);
        res.status(500).json({
            success: false,
            error: "Erro interno ao autenticar"
        });
    }
});

// =====================================================================
// GET /api/cartola-pro/mercado - Buscar Jogadores Disponíveis
// =====================================================================
router.get("/mercado", verificarSessaoParticipante, verificarPremium, async (req, res) => {
    try {
        const glbId = req.headers['x-glb-token'];

        if (!glbId) {
            return res.status(401).json({
                success: false,
                error: "Token Globo não fornecido",
                needsAuth: true
            });
        }

        const resultado = await cartolaProService.buscarMercado(glbId);

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
// POST /api/cartola-pro/escalar - Salvar Escalação
// =====================================================================
router.post("/escalar", verificarSessaoParticipante, verificarPremium, async (req, res) => {
    try {
        const glbId = req.headers['x-glb-token'];
        const { atletas, esquema, capitao } = req.body;

        if (!glbId) {
            return res.status(401).json({
                success: false,
                error: "Token Globo não fornecido",
                needsAuth: true
            });
        }

        if (!atletas || !Array.isArray(atletas) || atletas.length !== 12) {
            return res.status(400).json({
                success: false,
                error: "Selecione 12 jogadores (11 + técnico)"
            });
        }

        if (!esquema || esquema < 1 || esquema > 7) {
            return res.status(400).json({
                success: false,
                error: "Esquema de formação inválido"
            });
        }

        if (!capitao || !atletas.includes(capitao)) {
            return res.status(400).json({
                success: false,
                error: "Capitão deve ser um dos atletas selecionados"
            });
        }

        // Salvar escalação
        const resultado = await cartolaProService.salvarEscalacao(
            glbId,
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
            message: "Escalação salva com sucesso!"
        });

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao salvar escalação:', error);
        res.status(500).json({
            success: false,
            error: "Erro ao salvar escalação"
        });
    }
});

// =====================================================================
// GET /api/cartola-pro/status - Verificar Status do Mercado
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
// GET /api/cartola-pro/verificar-premium - Verificar se é Premium
// =====================================================================
router.get("/verificar-premium", verificarSessaoParticipante, async (req, res) => {
    try {
        const { timeId, ligaId } = req.session.participante;

        const liga = await Liga.findById(ligaId);
        if (!liga) {
            return res.json({ premium: false });
        }

        const participante = liga.participantes.find(
            p => String(p.time_id) === String(timeId)
        );

        res.json({
            premium: participante?.premium === true
        });

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao verificar premium:', error);
        res.json({ premium: false });
    }
});

export default router;
