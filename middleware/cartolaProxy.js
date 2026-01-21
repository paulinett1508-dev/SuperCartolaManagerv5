/**
 * Middleware Proxy para API Cartola FC
 * Super Cartola Manager
 *
 * Funcionalidades:
 * - Bypass de CORS para chamadas a api.cartolafc.globo.com
 * - Injection automatica de tokens de autenticacao
 * - Gerenciamento de cookies e headers Globo
 * - Rate limiting para evitar bloqueios
 * - Auto-refresh de tokens expirados
 */
import axios from "axios";
import NodeCache from "node-cache";

// =====================================================================
// CONFIGURACAO
// =====================================================================
const CARTOLA_API_BASE = "https://api.cartolafc.globo.com";
const GLOBO_LOGIN_URL = "https://login.globo.com/api/authentication";
const SERVICE_ID = 4728; // ID do Cartola FC

// Cache de tokens (TTL: 1 hora)
const tokenCache = new NodeCache({ stdTTL: 3600 });

// Rate limiting (maximo 30 requests por minuto por IP)
const rateLimitCache = new NodeCache({ stdTTL: 60 });
const MAX_REQUESTS_PER_MINUTE = 30;

// =====================================================================
// LOGGER
// =====================================================================
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [CARTOLA-PROXY]`;

    if (level === 'error') {
        console.error(`${prefix} [ERROR] ${message}`, data || '');
    } else if (level === 'warn') {
        console.warn(`${prefix} [WARN] ${message}`, data || '');
    } else {
        console.log(`${prefix} [INFO] ${message}`, data || '');
    }
}

// =====================================================================
// CLIENTE HTTP CONFIGURADO
// =====================================================================
const httpClient = axios.create({
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin': 'https://cartola.globo.com',
        'Referer': 'https://cartola.globo.com/'
    }
});

// =====================================================================
// RATE LIMITER
// =====================================================================
function checkRateLimit(ip) {
    const key = `rate:${ip}`;
    const count = rateLimitCache.get(key) || 0;

    if (count >= MAX_REQUESTS_PER_MINUTE) {
        return false;
    }

    rateLimitCache.set(key, count + 1);
    return true;
}

// =====================================================================
// OBTER TOKEN GLB-ID
// =====================================================================
function getGlbToken(req) {
    // 1. Tentar da sessao OAuth
    if (req.session?.cartolaProAuth?.glbid) {
        return req.session.cartolaProAuth.glbid;
    }

    // 2. Tentar access_token OAuth
    if (req.session?.cartolaProAuth?.access_token) {
        return req.session.cartolaProAuth.access_token;
    }

    // 3. Tentar header X-GLB-Token
    if (req.headers['x-glb-token']) {
        return req.headers['x-glb-token'];
    }

    // 4. Tentar Authorization Bearer
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return null;
}

// =====================================================================
// CONSTRUIR HEADERS PARA API CARTOLA
// =====================================================================
function buildCartolaHeaders(req) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Origin': 'https://cartola.globo.com',
        'Referer': 'https://cartola.globo.com/'
    };

    // Adicionar token se disponivel
    const glbToken = getGlbToken(req);
    if (glbToken) {
        headers['X-GLB-Token'] = glbToken;
    }

    // Adicionar X-GLB-Tag se disponivel na sessao
    if (req.session?.cartolaProAuth?.glb_tag) {
        headers['X-GLB-Tag'] = req.session.cartolaProAuth.glb_tag;
    }

    // Adicionar cookies se disponivel
    if (req.session?.cartolaProAuth?.cookies) {
        const cookieString = Object.entries(req.session.cartolaProAuth.cookies)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ');
        headers['Cookie'] = cookieString;
    }

    return headers;
}

// =====================================================================
// MIDDLEWARE: Proxy para API Cartola (endpoints publicos)
// =====================================================================
export async function cartolaProxyPublic(req, res, next) {
    // Extrair endpoint do path
    const endpoint = req.path.replace('/api/cartola-proxy/', '');

    if (!endpoint) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint nao especificado'
        });
    }

    // Rate limiting
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(clientIp)) {
        log('warn', 'Rate limit atingido', { ip: clientIp });
        return res.status(429).json({
            success: false,
            error: 'Muitas requisicoes. Aguarde um momento.'
        });
    }

    try {
        log('info', `Proxy request: ${req.method} /${endpoint}`);

        const url = `${CARTOLA_API_BASE}/${endpoint}`;
        const headers = buildCartolaHeaders(req);

        const response = await httpClient({
            method: req.method,
            url: url,
            headers: headers,
            data: req.method !== 'GET' ? req.body : undefined,
            params: req.method === 'GET' ? req.query : undefined
        });

        // Retornar resposta
        res.status(response.status).json(response.data);

    } catch (error) {
        const status = error.response?.status || 500;
        const errorData = error.response?.data || { message: error.message };

        log('error', `Erro no proxy: ${endpoint}`, { status, error: errorData });

        if (status === 401) {
            return res.status(401).json({
                success: false,
                error: 'Sessao expirada. Faca login novamente.',
                needsGloboAuth: true
            });
        }

        res.status(status).json({
            success: false,
            error: 'Erro ao acessar API Cartola',
            details: errorData
        });
    }
}

// =====================================================================
// MIDDLEWARE: Proxy autenticado (requer token)
// =====================================================================
export async function cartolaProxyAuth(req, res, next) {
    const glbToken = getGlbToken(req);

    if (!glbToken) {
        return res.status(401).json({
            success: false,
            error: 'Token de autenticacao nao fornecido',
            needsGloboAuth: true
        });
    }

    // Passar para o proximo middleware
    req.glbToken = glbToken;
    next();
}

// =====================================================================
// MIDDLEWARE: Verificar e renovar token
// =====================================================================
export async function verificarTokenGlobo(req, res, next) {
    const auth = req.session?.cartolaProAuth;

    if (!auth) {
        return next(); // Sem auth, continuar
    }

    // Verificar expiracao
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = auth.expires_at;

    // Se falta menos de 5 minutos, tentar renovar
    if (expiresAt && (expiresAt - now) < 300) {
        log('info', 'Token proximo de expirar, tentando renovar...');

        if (auth.refresh_token) {
            try {
                // Importar dinamicamente para evitar dependencia circular
                const { getGloboOidcConfig } = await import('../config/globo-oauth.js');
                const client = await import('openid-client');

                const config = await getGloboOidcConfig();
                const tokenResponse = await client.refreshTokenGrant(config, auth.refresh_token);

                // Atualizar sessao
                const claims = tokenResponse.claims();
                req.session.cartolaProAuth = {
                    ...auth,
                    access_token: tokenResponse.access_token,
                    refresh_token: tokenResponse.refresh_token || auth.refresh_token,
                    glbid: claims.glbid || claims.fs_id || auth.glbid,
                    expires_at: claims.exp
                };

                log('info', 'Token renovado com sucesso');
            } catch (error) {
                log('warn', 'Falha ao renovar token:', error.message);
                // Nao bloquear, deixar continuar com token antigo
            }
        }
    }

    next();
}

// =====================================================================
// FUNCAO: Autenticar diretamente com email/senha
// =====================================================================
export async function autenticarDireto(email, password) {
    log('info', 'Tentando autenticacao direta', { email: email.substring(0, 3) + '***' });

    try {
        // Delay aleatorio para simular comportamento humano
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

        const response = await httpClient.post(GLOBO_LOGIN_URL, {
            payload: {
                email: email,
                password: password,
                serviceId: SERVICE_ID
            }
        });

        if (response.status === 200 && response.data.glbId) {
            log('info', 'Autenticacao direta bem-sucedida');

            return {
                success: true,
                glbId: response.data.glbId,
                expiresIn: 7200 // 2 horas estimado
            };
        }

        return {
            success: false,
            error: 'Resposta inesperada do servidor'
        };

    } catch (error) {
        const status = error.response?.status;
        const userMessage = error.response?.data?.userMessage;

        log('error', 'Erro na autenticacao direta', { status, userMessage });

        if (status === 401 || status === 400) {
            return {
                success: false,
                error: 'Email ou senha incorretos'
            };
        }

        if (status === 406) {
            return {
                success: false,
                error: 'Esta conta usa login via Google/Facebook. Use a opcao "Conectar com Globo" para fazer login.',
                needsOAuth: true
            };
        }

        if (status === 429) {
            return {
                success: false,
                error: 'Muitas tentativas. Aguarde alguns minutos.'
            };
        }

        return {
            success: false,
            error: 'Erro ao conectar com a Globo. Tente novamente.'
        };
    }
}

// =====================================================================
// FUNCAO: Fazer request autenticado para API Cartola
// =====================================================================
export async function requestCartolaAPI(endpoint, method = 'GET', data = null, glbToken = null, options = {}) {
    const url = `${CARTOLA_API_BASE}/${endpoint}`;

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Origin': 'https://cartola.globo.com',
        'Referer': 'https://cartola.globo.com/'
    };

    if (glbToken) {
        headers['X-GLB-Token'] = glbToken;
    }

    if (options.cookies) {
        headers['Cookie'] = options.cookies;
    }

    try {
        const response = await httpClient({
            method: method,
            url: url,
            headers: headers,
            data: method !== 'GET' ? data : undefined,
            params: method === 'GET' ? data : undefined
        });

        return {
            success: true,
            data: response.data,
            status: response.status
        };

    } catch (error) {
        const status = error.response?.status;

        return {
            success: false,
            error: error.response?.data || error.message,
            status: status,
            needsAuth: status === 401
        };
    }
}

// =====================================================================
// FUNCAO: Capturar cookies de autenticacao
// =====================================================================
export function capturarCookiesAutenticacao(cookieHeader) {
    if (!cookieHeader) return {};

    const cookies = {};
    const cookieList = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];

    // Cookies importantes da Globo
    const importantCookies = [
        'GLBID',
        '_glbId',
        'globo.com.user_id',
        'authx_',
        'goidc_',
        'fs_id',
        'glb_uid'
    ];

    for (const setCookie of cookieList) {
        const parts = setCookie.split(';')[0].split('=');
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();

        // Verificar se e um cookie importante
        const isImportant = importantCookies.some(prefix => name.startsWith(prefix));
        if (isImportant) {
            cookies[name] = value;
        }
    }

    return cookies;
}

// =====================================================================
// MIDDLEWARE: CORS para proxy
// =====================================================================
export function corsProxy(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-GLB-Token');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
}

// =====================================================================
// EXPORT DEFAULT
// =====================================================================
export default {
    cartolaProxyPublic,
    cartolaProxyAuth,
    verificarTokenGlobo,
    autenticarDireto,
    requestCartolaAPI,
    capturarCookiesAutenticacao,
    corsProxy,
    getGlbToken,
    buildCartolaHeaders
};
