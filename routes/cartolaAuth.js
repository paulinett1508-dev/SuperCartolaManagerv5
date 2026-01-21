/**
 * Rotas de Autenticacao Cartola FC
 * Super Cartola Manager
 *
 * Endpoints para autenticacao com API Globo/Cartola FC
 * Suporta: Login direto (email/senha), OAuth Globo, Captura de tokens
 */
import express from "express";
import Liga from "../models/Liga.js";
import {
    autenticarDireto,
    requestCartolaAPI,
    capturarCookiesAutenticacao,
    corsProxy
} from "../middleware/cartolaProxy.js";

const router = express.Router();

// Aplicar CORS em todas as rotas
router.use(corsProxy);

// =====================================================================
// LOGGER
// =====================================================================
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [CARTOLA-AUTH]`;

    if (level === 'error') {
        console.error(`${prefix} [ERROR] ${message}`, data || '');
    } else if (level === 'warn') {
        console.warn(`${prefix} [WARN] ${message}`, data || '');
    } else {
        console.log(`${prefix} [INFO] ${message}`, data || '');
    }
}

// =====================================================================
// MIDDLEWARE: Verificar sessao de participante
// =====================================================================
function verificarSessaoParticipante(req, res, next) {
    if (!req.session?.participante) {
        return res.status(401).json({
            success: false,
            error: "Sessao expirada. Faca login no app primeiro.",
            needsLogin: true
        });
    }
    next();
}

// =====================================================================
// POST /api/cartola-auth/login - Login direto com email/senha
// =====================================================================
router.post("/login", verificarSessaoParticipante, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: "Email e senha sao obrigatorios"
        });
    }

    log('info', 'Tentativa de login direto', { email: email.substring(0, 3) + '***' });

    try {
        const resultado = await autenticarDireto(email, password);

        if (!resultado.success) {
            log('warn', 'Login direto falhou', { error: resultado.error });
            return res.status(401).json(resultado);
        }

        // Salvar na sessao
        req.session.cartolaProAuth = {
            glbid: resultado.glbId,
            email: email,
            method: 'direct',
            authenticated_at: Date.now(),
            expires_at: Math.floor(Date.now() / 1000) + resultado.expiresIn
        };

        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        log('info', 'Login direto bem-sucedido', { email });

        res.json({
            success: true,
            message: "Autenticado com sucesso",
            expiresIn: resultado.expiresIn
        });

    } catch (error) {
        log('error', 'Erro no login direto', { error: error.message });
        res.status(500).json({
            success: false,
            error: "Erro interno ao autenticar"
        });
    }
});

// =====================================================================
// POST /api/cartola-auth/capture - Capturar tokens/cookies do frontend
// =====================================================================
router.post("/capture", verificarSessaoParticipante, async (req, res) => {
    const { glbId, glbTag, cookies, accessToken } = req.body;

    log('info', 'Recebendo captura de tokens', {
        hasGlbId: !!glbId,
        hasGlbTag: !!glbTag,
        hasCookies: !!cookies,
        hasAccessToken: !!accessToken
    });

    if (!glbId && !accessToken && !cookies) {
        return res.status(400).json({
            success: false,
            error: "Nenhum token ou cookie fornecido"
        });
    }

    try {
        // Validar token fazendo uma chamada de teste
        const testToken = glbId || accessToken;
        if (testToken) {
            const testResult = await requestCartolaAPI('auth/time', 'GET', null, testToken);

            if (!testResult.success) {
                log('warn', 'Token invalido na validacao', { status: testResult.status });

                if (testResult.status === 401) {
                    return res.status(401).json({
                        success: false,
                        error: "Token invalido ou expirado"
                    });
                }
            }
        }

        // Processar cookies se fornecidos
        const processedCookies = cookies ? capturarCookiesAutenticacao(
            typeof cookies === 'string' ? cookies.split('; ').map(c => c + ';') : cookies
        ) : {};

        // Salvar na sessao
        req.session.cartolaProAuth = {
            glbid: glbId || null,
            glb_tag: glbTag || null,
            access_token: accessToken || null,
            cookies: processedCookies,
            method: 'capture',
            authenticated_at: Date.now(),
            expires_at: Math.floor(Date.now() / 1000) + 7200 // 2 horas
        };

        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        log('info', 'Tokens capturados com sucesso');

        res.json({
            success: true,
            message: "Tokens capturados e validados"
        });

    } catch (error) {
        log('error', 'Erro ao capturar tokens', { error: error.message });
        res.status(500).json({
            success: false,
            error: "Erro ao processar tokens"
        });
    }
});

// =====================================================================
// GET /api/cartola-auth/status - Verificar status da autenticacao
// =====================================================================
router.get("/status", verificarSessaoParticipante, (req, res) => {
    const auth = req.session?.cartolaProAuth;

    if (!auth) {
        return res.json({
            authenticated: false,
            needsLogin: true
        });
    }

    // Verificar expiracao
    const now = Math.floor(Date.now() / 1000);
    const expired = auth.expires_at && now > auth.expires_at;

    if (expired) {
        return res.json({
            authenticated: false,
            needsLogin: true,
            reason: 'token_expired'
        });
    }

    res.json({
        authenticated: true,
        method: auth.method || 'unknown',
        email: auth.email || null,
        hasGlbId: !!auth.glbid,
        hasAccessToken: !!auth.access_token,
        hasCookies: Object.keys(auth.cookies || {}).length > 0,
        expires_at: auth.expires_at
    });
});

// =====================================================================
// POST /api/cartola-auth/logout - Desconectar conta Globo
// =====================================================================
router.post("/logout", verificarSessaoParticipante, (req, res) => {
    const email = req.session?.cartolaProAuth?.email || 'desconhecido';

    delete req.session.cartolaProAuth;

    req.session.save((err) => {
        if (err) {
            log('error', 'Erro ao salvar sessao apos logout', { error: err.message });
        }

        log('info', 'Logout Cartola realizado', { email });

        res.json({
            success: true,
            message: "Desconectado da conta Globo"
        });
    });
});

// =====================================================================
// GET /api/cartola-auth/time - Buscar time autenticado
// =====================================================================
router.get("/time", verificarSessaoParticipante, async (req, res) => {
    const auth = req.session?.cartolaProAuth;

    if (!auth || (!auth.glbid && !auth.access_token)) {
        return res.status(401).json({
            success: false,
            error: "Conecte sua conta Globo primeiro",
            needsGloboAuth: true
        });
    }

    try {
        const token = auth.glbid || auth.access_token;
        const result = await requestCartolaAPI('auth/time', 'GET', null, token, {
            cookies: auth.cookies
        });

        if (!result.success) {
            if (result.status === 401) {
                // Limpar auth expirada
                delete req.session.cartolaProAuth;

                return res.status(401).json({
                    success: false,
                    error: "Sessao expirada. Conecte novamente.",
                    needsGloboAuth: true
                });
            }

            return res.status(result.status || 500).json({
                success: false,
                error: "Erro ao buscar time"
            });
        }

        res.json({
            success: true,
            time: result.data
        });

    } catch (error) {
        log('error', 'Erro ao buscar time', { error: error.message });
        res.status(500).json({
            success: false,
            error: "Erro ao buscar time"
        });
    }
});

// =====================================================================
// GET /api/cartola-auth/ligas - Buscar ligas do usuario
// =====================================================================
router.get("/ligas", verificarSessaoParticipante, async (req, res) => {
    const auth = req.session?.cartolaProAuth;

    if (!auth || (!auth.glbid && !auth.access_token)) {
        return res.status(401).json({
            success: false,
            error: "Conecte sua conta Globo primeiro",
            needsGloboAuth: true
        });
    }

    try {
        const token = auth.glbid || auth.access_token;
        const result = await requestCartolaAPI('auth/ligas', 'GET', null, token, {
            cookies: auth.cookies
        });

        if (!result.success) {
            if (result.status === 401) {
                delete req.session.cartolaProAuth;
                return res.status(401).json({
                    success: false,
                    error: "Sessao expirada. Conecte novamente.",
                    needsGloboAuth: true
                });
            }

            return res.status(result.status || 500).json({
                success: false,
                error: "Erro ao buscar ligas"
            });
        }

        res.json({
            success: true,
            ligas: result.data
        });

    } catch (error) {
        log('error', 'Erro ao buscar ligas', { error: error.message });
        res.status(500).json({
            success: false,
            error: "Erro ao buscar ligas"
        });
    }
});

// =====================================================================
// POST /api/cartola-auth/salvar-escalacao - Salvar escalacao
// =====================================================================
router.post("/salvar-escalacao", verificarSessaoParticipante, async (req, res) => {
    const auth = req.session?.cartolaProAuth;
    const { atletas, esquema, capitao } = req.body;

    if (!auth || (!auth.glbid && !auth.access_token)) {
        return res.status(401).json({
            success: false,
            error: "Conecte sua conta Globo primeiro",
            needsGloboAuth: true
        });
    }

    // Validacoes
    if (!atletas || !Array.isArray(atletas) || atletas.length !== 12) {
        return res.status(400).json({
            success: false,
            error: "Selecione 12 jogadores (11 + tecnico)"
        });
    }

    if (!esquema || esquema < 1 || esquema > 7) {
        return res.status(400).json({
            success: false,
            error: "Esquema de formacao invalido (1-7)"
        });
    }

    if (!capitao || !atletas.includes(capitao)) {
        return res.status(400).json({
            success: false,
            error: "Capitao deve ser um dos atletas selecionados"
        });
    }

    try {
        log('info', 'Salvando escalacao', {
            atletas: atletas.length,
            esquema,
            capitao
        });

        const token = auth.glbid || auth.access_token;
        const result = await requestCartolaAPI(
            'auth/time/salvar',
            'POST',
            {
                esquema: esquema,
                atleta: atletas,
                capitao: capitao
            },
            token,
            { cookies: auth.cookies }
        );

        if (!result.success) {
            if (result.status === 401) {
                delete req.session.cartolaProAuth;
                return res.status(401).json({
                    success: false,
                    error: "Sessao expirada. Conecte novamente.",
                    needsGloboAuth: true
                });
            }

            return res.status(result.status || 400).json({
                success: false,
                error: result.error?.mensagem || "Erro ao salvar escalacao"
            });
        }

        log('info', 'Escalacao salva com sucesso');

        res.json({
            success: true,
            message: "Escalacao salva com sucesso!"
        });

    } catch (error) {
        log('error', 'Erro ao salvar escalacao', { error: error.message });
        res.status(500).json({
            success: false,
            error: "Erro ao salvar escalacao"
        });
    }
});

// =====================================================================
// GET /api/cartola-auth/debug - Debug de autenticacao
// =====================================================================
router.get("/debug", verificarSessaoParticipante, (req, res) => {
    const auth = req.session?.cartolaProAuth;

    res.json({
        session_id: req.sessionID,
        has_participante: !!req.session?.participante,
        participante: req.session?.participante ? {
            timeId: req.session.participante.timeId,
            ligaId: req.session.participante.ligaId
        } : null,
        cartola_auth: auth ? {
            method: auth.method,
            has_glbid: !!auth.glbid,
            has_access_token: !!auth.access_token,
            has_cookies: Object.keys(auth.cookies || {}).length,
            email: auth.email,
            authenticated_at: auth.authenticated_at,
            expires_at: auth.expires_at,
            is_expired: auth.expires_at ? (Math.floor(Date.now() / 1000) > auth.expires_at) : false
        } : null
    });
});

// =====================================================================
// POST /api/cartola-auth/save-to-liga - Salvar auth no participante da liga
// =====================================================================
router.post("/save-to-liga", verificarSessaoParticipante, async (req, res) => {
    const { timeId, ligaId } = req.session.participante;
    const auth = req.session?.cartolaProAuth;

    if (!auth) {
        return res.status(401).json({
            success: false,
            error: "Nenhuma autenticacao Cartola ativa"
        });
    }

    try {
        // Buscar liga
        const liga = await Liga.findById(ligaId);
        if (!liga) {
            return res.status(404).json({
                success: false,
                error: "Liga nao encontrada"
            });
        }

        // Encontrar participante
        const participanteIndex = liga.participantes.findIndex(
            p => String(p.time_id) === String(timeId)
        );

        if (participanteIndex === -1) {
            return res.status(404).json({
                success: false,
                error: "Participante nao encontrado na liga"
            });
        }

        // Salvar auth no participante (apenas dados nao-sensiveis)
        liga.participantes[participanteIndex].cartolaAuth = {
            email: auth.email,
            method: auth.method,
            lastAuthAt: new Date(),
            // NAO salvar tokens no banco por seguranca
            // Tokens ficam apenas na sessao
        };

        await liga.save();

        log('info', 'Auth salva no participante', { timeId, ligaId });

        res.json({
            success: true,
            message: "Configuracao salva"
        });

    } catch (error) {
        log('error', 'Erro ao salvar auth na liga', { error: error.message });
        res.status(500).json({
            success: false,
            error: "Erro ao salvar configuracao"
        });
    }
});

export default router;
