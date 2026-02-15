/**
 * SYSTEM TOKEN SERVICE v1.0
 * Gerencia token OAuth do admin como "token de sistema" para chamadas autenticadas.
 *
 * O admin (Paulinett) "doa" seu token OAuth para que o backend possa fazer
 * chamadas autenticadas a API do Cartola em nome do sistema.
 *
 * Armazena na collection systemconfig do MongoDB.
 * Auto-refresh usando refresh_token quando necessario.
 */

import axios from "axios";
import mongoose from "mongoose";

const COLLECTION = 'systemconfig';
const CONFIG_KEY = 'globo_system_token';

// =====================================================================
// OBTER TOKEN DO SISTEMA
// =====================================================================
async function obterTokenSistema() {
    try {
        const db = mongoose.connection.db;
        if (!db) {
            console.error('[SYSTEM-TOKEN] MongoDB nao conectado');
            return null;
        }

        const doc = await db.collection(COLLECTION).findOne({ key: CONFIG_KEY });
        if (!doc || !doc.value) return null;

        const token = doc.value;

        // Verificar expiracao
        const now = Math.floor(Date.now() / 1000);
        if (token.expires_at && now > token.expires_at) {
            // Tentar refresh
            if (token.refresh_token) {
                console.log('[SYSTEM-TOKEN] Token expirado, tentando refresh...');
                const refreshed = await refreshToken(token.refresh_token);
                if (refreshed) {
                    await salvarTokenSistema(refreshed);
                    return refreshed;
                }
            }
            console.warn('[SYSTEM-TOKEN] Token expirado e sem refresh valido');
            return null;
        }

        return token;
    } catch (error) {
        console.error('[SYSTEM-TOKEN] Erro ao obter token:', error.message);
        return null;
    }
}

// =====================================================================
// SALVAR TOKEN DO SISTEMA
// =====================================================================
async function salvarTokenSistema(auth) {
    try {
        const db = mongoose.connection.db;
        if (!db) throw new Error('MongoDB nao conectado');

        const tokenData = {
            access_token: auth.access_token,
            refresh_token: auth.refresh_token,
            id_token: auth.id_token,
            globo_id: auth.globo_id,
            glbid: auth.glbid,
            email: auth.email,
            nome: auth.nome,
            expires_at: auth.expires_at,
            doado_em: new Date().toISOString(),
            doado_por: auth.email || 'admin',
        };

        await db.collection(COLLECTION).updateOne(
            { key: CONFIG_KEY },
            { $set: { key: CONFIG_KEY, value: tokenData, updatedAt: new Date() } },
            { upsert: true }
        );

        console.log(`[SYSTEM-TOKEN] Token salvo com sucesso (${auth.email})`);
        return true;
    } catch (error) {
        console.error('[SYSTEM-TOKEN] Erro ao salvar token:', error.message);
        return false;
    }
}

// =====================================================================
// REVOGAR TOKEN DO SISTEMA
// =====================================================================
async function revogarTokenSistema() {
    try {
        const db = mongoose.connection.db;
        if (!db) throw new Error('MongoDB nao conectado');

        await db.collection(COLLECTION).deleteOne({ key: CONFIG_KEY });
        console.log('[SYSTEM-TOKEN] Token revogado');
        return true;
    } catch (error) {
        console.error('[SYSTEM-TOKEN] Erro ao revogar token:', error.message);
        return false;
    }
}

// =====================================================================
// REFRESH TOKEN
// =====================================================================
async function refreshToken(refreshTokenValue) {
    try {
        // Usar o endpoint de token da Globo OIDC
        const resp = await axios.post(
            'https://goidc.globo.com/auth/realms/globo.com/protocol/openid-connect/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshTokenValue,
                client_id: 'cartola-web@apps.globoid',
            }).toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 10000,
            }
        );

        if (!resp.data?.access_token) {
            throw new Error('Resposta de refresh invalida');
        }

        const expiresIn = resp.data.expires_in || 3600;

        return {
            access_token: resp.data.access_token,
            refresh_token: resp.data.refresh_token || refreshTokenValue,
            id_token: resp.data.id_token,
            expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        };
    } catch (error) {
        console.error('[SYSTEM-TOKEN] Erro ao fazer refresh:', error.message);
        return null;
    }
}

// =====================================================================
// FAZER REQUISICAO AUTENTICADA
// =====================================================================
async function fazerRequisicaoAutenticada(endpoint, params = {}) {
    const token = await obterTokenSistema();
    if (!token) {
        return { success: false, error: 'Token de sistema nao disponivel', needsToken: true };
    }

    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
            'Accept': 'application/json',
        };

        // Usar glbid ou access_token dependendo do endpoint
        if (token.glbid) {
            headers['X-GLB-Token'] = token.glbid;
        } else if (token.access_token) {
            headers['Authorization'] = `Bearer ${token.access_token}`;
        }

        const url = endpoint.startsWith('http')
            ? endpoint
            : `https://api.cartolafc.globo.com${endpoint}`;

        const resp = await axios.get(url, {
            headers,
            params,
            timeout: 15000,
        });

        return { success: true, data: resp.data, status: resp.status };
    } catch (error) {
        const status = error.response?.status;

        // Token expirado - tentar refresh automatico
        if (status === 401 && token.refresh_token) {
            const refreshed = await refreshToken(token.refresh_token);
            if (refreshed) {
                await salvarTokenSistema({ ...token, ...refreshed });
                // Retry uma vez
                return fazerRequisicaoAutenticada(endpoint, params);
            }
        }

        return {
            success: false,
            error: error.message,
            status,
            data: error.response?.data,
        };
    }
}

// =====================================================================
// STATUS DO TOKEN
// =====================================================================
async function statusToken() {
    const token = await obterTokenSistema();

    if (!token) {
        return { disponivel: false, mensagem: 'Nenhum token de sistema configurado' };
    }

    const now = Math.floor(Date.now() / 1000);
    const expirado = token.expires_at ? now > token.expires_at : false;
    const temRefresh = !!token.refresh_token;

    return {
        disponivel: !expirado || temRefresh,
        email: token.email,
        doadoPor: token.doado_por,
        doadoEm: token.doado_em,
        expirado,
        temRefresh,
        expiraEm: token.expires_at
            ? new Date(token.expires_at * 1000).toISOString()
            : null,
    };
}

export default {
    obterTokenSistema,
    salvarTokenSistema,
    revogarTokenSistema,
    fazerRequisicaoAutenticada,
    statusToken,
};
