/**
 * Configuracao OAuth Globo para Cartola PRO
 * Super Cartola Manager
 * Implementacao OIDC para autenticacao com conta Globo
 */
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import memoize from "memoizee";

// =====================================================================
// CONFIGURACAO GLOBO OIDC
// =====================================================================
const GLOBO_ISSUER = "https://goidc.globo.com/auth/realms/globo.com";
const GLOBO_CLIENT_ID = "cartola-web@apps.globoid";

// Logger especifico para OAuth Globo
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [GLOBO-OAUTH]`;

    if (level === 'error') {
        console.error(`${prefix} [ERROR] ${message}`, data || '');
    } else if (level === 'warn') {
        console.warn(`${prefix} [WARN] ${message}`, data || '');
    } else {
        console.log(`${prefix} [INFO] ${message}`, data || '');
    }
}

// =====================================================================
// DISCOVERY OIDC (memoizado para performance)
// =====================================================================
const getGloboOidcConfig = memoize(
    async () => {
        log('info', 'Iniciando discovery OIDC da Globo...');

        try {
            const config = await client.discovery(
                new URL(GLOBO_ISSUER),
                GLOBO_CLIENT_ID
            );

            log('info', 'Discovery OIDC da Globo concluido com sucesso');
            return config;
        } catch (error) {
            log('error', 'Erro no discovery OIDC:', error.message);
            throw error;
        }
    },
    { maxAge: 3600 * 1000 } // Cache por 1 hora
);

// =====================================================================
// ATUALIZAR SESSAO COM TOKENS
// =====================================================================
function updateCartolaProSession(session, tokens) {
    const claims = tokens.claims();

    session.cartolaProAuth = {
        // Tokens
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        id_token: tokens.id_token,

        // Claims importantes
        globo_id: claims.globo_id || claims.sub,
        glbid: claims.glbid || claims.fs_id,
        email: claims.email,
        nome: claims.name || claims.preferred_username,

        // Expiracao
        expires_at: claims.exp,
        authenticated_at: Date.now()
    };

    return session.cartolaProAuth;
}

// =====================================================================
// VERIFY FUNCTION (chamada apos receber tokens)
// =====================================================================
const verifyGlobo = async (tokens, done) => {
    log('info', 'Verificando tokens da Globo...');

    try {
        const claims = tokens.claims();
        log('info', 'Claims recebidos:', {
            email: claims.email,
            globo_id: claims.globo_id || claims.sub,
            name: claims.name
        });

        if (!claims.email && !claims.globo_id) {
            log('error', 'Claims invalidos - sem email ou globo_id');
            return done(null, false, { message: 'Dados de usuario invalidos' });
        }

        // Criar objeto de usuario para sessao
        const user = {
            globo_id: claims.globo_id || claims.sub,
            glbid: claims.glbid || claims.fs_id,
            email: claims.email,
            nome: claims.name || claims.preferred_username,
            foto: claims.picture,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: claims.exp
        };

        log('info', 'Usuario Globo autenticado com sucesso:', user.email);
        done(null, user);

    } catch (error) {
        log('error', 'Erro ao verificar tokens:', error.message);
        done(error);
    }
};

// =====================================================================
// REGISTRY DE STRATEGIES
// =====================================================================
const registeredStrategies = new Set();

function ensureGloboStrategy(domain, config) {
    const strategyName = `globo:${domain}`;

    if (!registeredStrategies.has(strategyName)) {
        log('info', 'Criando strategy para dominio:', domain);

        const strategy = new Strategy(
            {
                name: strategyName,
                config,
                scope: "openid email profile",
                callbackURL: `https://${domain}/api/cartola-pro/oauth/callback`
            },
            verifyGlobo
        );

        passport.use(strategy);
        registeredStrategies.add(strategyName);
    }

    return strategyName;
}

// =====================================================================
// SETUP DAS ROTAS OAUTH GLOBO
// =====================================================================
export function setupGloboOAuthRoutes(router) {

    // =========================================================
    // GET /oauth/login - Inicia fluxo OAuth
    // =========================================================
    router.get("/oauth/login", async (req, res, next) => {
        log('info', 'Iniciando fluxo OAuth Globo...');
        log('info', 'Hostname:', req.hostname);

        // Verificar se participante esta logado
        if (!req.session?.participante) {
            log('warn', 'Tentativa de OAuth sem sessao de participante');
            return res.status(401).json({
                success: false,
                error: 'Faca login no app primeiro'
            });
        }

        try {
            const config = await getGloboOidcConfig();
            const strategyName = ensureGloboStrategy(req.hostname, config);

            log('info', 'Redirecionando para login Globo...');

            passport.authenticate(strategyName, {
                prompt: "login consent",
                scope: ["openid", "email", "profile"]
            })(req, res, next);

        } catch (error) {
            log('error', 'Erro ao iniciar OAuth:', error.message);
            res.redirect('/participante/?error=oauth_init_failed');
        }
    });

    // =========================================================
    // GET /oauth/callback - Recebe tokens
    // =========================================================
    router.get("/oauth/callback", async (req, res, next) => {
        log('info', 'Callback OAuth recebido');
        log('info', 'Query params:', Object.keys(req.query));

        // Verificar erro retornado pela Globo
        if (req.query.error) {
            log('error', 'Erro retornado pela Globo:', req.query.error);
            return res.redirect(`/participante/?error=${req.query.error}`);
        }

        try {
            const config = await getGloboOidcConfig();
            const strategyName = ensureGloboStrategy(req.hostname, config);

            passport.authenticate(strategyName, {
                failureRedirect: '/participante/?error=oauth_failed'
            })(req, res, (err) => {
                if (err) {
                    log('error', 'Erro no callback:', err.message);
                    return res.redirect('/participante/?error=oauth_callback_error');
                }

                if (!req.user) {
                    log('warn', 'Usuario nao autenticado apos callback');
                    return res.redirect('/participante/?error=oauth_no_user');
                }

                // Salvar dados de autenticacao Globo na sessao do participante
                req.session.cartolaProAuth = {
                    globo_id: req.user.globo_id,
                    glbid: req.user.glbid,
                    email: req.user.email,
                    nome: req.user.nome,
                    access_token: req.user.access_token,
                    refresh_token: req.user.refresh_token,
                    expires_at: req.user.expires_at,
                    authenticated_at: Date.now()
                };

                req.session.save((saveErr) => {
                    if (saveErr) {
                        log('error', 'Erro ao salvar sessao:', saveErr.message);
                        return res.redirect('/participante/?error=session_save_error');
                    }

                    log('info', 'Autenticacao Globo concluida com sucesso:', req.user.email);

                    // Redirecionar de volta para o app com sucesso
                    res.redirect('/participante/?cartola_pro=success');
                });
            });

        } catch (error) {
            log('error', 'Erro no callback (catch):', error.message);
            res.redirect('/participante/?error=oauth_exception');
        }
    });

    // =========================================================
    // GET /oauth/status - Verifica se esta autenticado
    // =========================================================
    router.get("/oauth/status", (req, res) => {
        const auth = req.session?.cartolaProAuth;

        if (!auth) {
            return res.json({
                authenticated: false,
                needsLogin: true
            });
        }

        // Verificar se token expirou
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
            email: auth.email,
            nome: auth.nome,
            expires_at: auth.expires_at
        });
    });

    // =========================================================
    // POST /oauth/logout - Limpa autenticacao Globo
    // =========================================================
    router.post("/oauth/logout", async (req, res) => {
        const email = req.session?.cartolaProAuth?.email || 'desconhecido';

        // Limpar apenas a autenticacao Globo (manter sessao do participante)
        delete req.session.cartolaProAuth;

        req.session.save((err) => {
            if (err) {
                log('error', 'Erro ao salvar sessao apos logout:', err.message);
            }

            log('info', 'Logout Globo realizado:', email);

            res.json({
                success: true,
                message: 'Desconectado da conta Globo'
            });
        });
    });

    // =========================================================
    // GET /oauth/debug - Debug da configuracao
    // =========================================================
    router.get("/oauth/debug", async (req, res) => {
        try {
            const config = await getGloboOidcConfig();

            res.json({
                ok: true,
                issuer: GLOBO_ISSUER,
                client_id: GLOBO_CLIENT_ID,
                hostname: req.hostname,
                callback_url: `https://${req.hostname}/api/cartola-pro/oauth/callback`,
                oidc_loaded: !!config,
                session_has_participante: !!req.session?.participante,
                session_has_globo_auth: !!req.session?.cartolaProAuth
            });
        } catch (error) {
            res.json({
                ok: false,
                error: error.message
            });
        }
    });

    log('info', 'Rotas OAuth Globo configuradas com sucesso');
}

// =====================================================================
// MIDDLEWARE: Verificar autenticacao Globo
// =====================================================================
export async function verificarAutenticacaoGlobo(req, res, next) {
    const auth = req.session?.cartolaProAuth;

    if (!auth) {
        return res.status(401).json({
            success: false,
            error: 'Conecte sua conta Globo primeiro',
            needsGloboAuth: true
        });
    }

    // Verificar expiracao
    const now = Math.floor(Date.now() / 1000);
    if (auth.expires_at && now > auth.expires_at) {
        // Tentar refresh
        if (auth.refresh_token) {
            try {
                const config = await getGloboOidcConfig();
                const tokenResponse = await client.refreshTokenGrant(config, auth.refresh_token);

                // Atualizar sessao
                updateCartolaProSession(req.session, tokenResponse);
                log('info', 'Token Globo renovado com sucesso');

                return next();
            } catch (error) {
                log('error', 'Erro ao renovar token Globo:', error.message);
                delete req.session.cartolaProAuth;

                return res.status(401).json({
                    success: false,
                    error: 'Sessao Globo expirada. Conecte novamente.',
                    needsGloboAuth: true
                });
            }
        }

        delete req.session.cartolaProAuth;
        return res.status(401).json({
            success: false,
            error: 'Sessao Globo expirada. Conecte novamente.',
            needsGloboAuth: true
        });
    }

    // Adicionar dados ao request
    req.globoAuth = auth;
    next();
}

// =====================================================================
// FUNCAO AUXILIAR: Obter token para API Cartola
// =====================================================================
export function getGloboToken(req) {
    const auth = req.session?.cartolaProAuth;

    if (!auth) return null;

    // Retornar glbid (session token) para uso na API Cartola
    return auth.glbid || auth.access_token;
}

export { getGloboOidcConfig };
