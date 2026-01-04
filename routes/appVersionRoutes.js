// =====================================================================
// appVersionRoutes.js - Rotas de versão do app v3.0
// =====================================================================
// v3.0: Endpoint unificado /check-version com detecção de cliente
//       - Header x-client-type: 'admin' | 'app' | 'participante'
//       - Fallback por User-Agent e Referer
//       - Suporte a version-scope.json
// =====================================================================

import express from "express";
import APP_VERSION, {
    PARTICIPANTE_VERSION,
    ADMIN_VERSION,
    VERSION_SCOPE
} from "../config/appVersion.js";
import { CURRENT_SEASON, SEASON_CONFIG } from "../config/seasons.js";

const router = express.Router();

// =====================================================================
// DETECÇÃO DE CLIENTE
// =====================================================================

/**
 * Detecta o tipo de cliente baseado em headers e contexto
 * Prioridade: x-client-type > Referer > User-Agent > default
 */
function detectClientType(req) {
    // 1. Header explícito (mais confiável)
    const clientType = req.headers['x-client-type'];
    if (clientType) {
        if (clientType === 'admin' || clientType === 'painel') return 'admin';
        if (clientType === 'app' || clientType === 'participante') return 'app';
    }

    // 2. Query param (fallback para debug)
    const queryType = req.query.client;
    if (queryType) {
        if (queryType === 'admin') return 'admin';
        if (queryType === 'app' || queryType === 'participante') return 'app';
    }

    // 3. Referer (detecta origem da requisição)
    const referer = req.headers.referer || '';
    if (referer.includes('/participante/') ||
        referer.includes('/participante-login') ||
        referer.includes('/participante-dashboard')) {
        return 'app';
    }
    if (referer.includes('/painel') ||
        referer.includes('/admin') ||
        referer.includes('/gerenciar') ||
        referer.includes('/ferramentas') ||
        referer.includes('/detalhe-liga') ||
        referer.includes('/criar-liga') ||
        referer.includes('/editar-liga')) {
        return 'admin';
    }

    // 4. User-Agent (detecta mobile vs desktop)
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);

    // Mobile geralmente é o app participante
    if (isMobile) return 'app';

    // 5. Default: assume admin (desktop)
    return 'admin';
}

// =====================================================================
// ENDPOINT PRINCIPAL: /check-version
// =====================================================================

/**
 * GET /api/app/check-version
 * Endpoint unificado que retorna a versão correta baseado no cliente
 *
 * Headers:
 *   x-client-type: 'admin' | 'app' | 'participante'
 *
 * Query params (fallback):
 *   ?client=admin | ?client=app
 *
 * Response:
 *   { version, build, deployedAt, area, releaseNotes, lastModifiedFile, clientDetected }
 */
router.get("/check-version", (req, res) => {
    const clientType = detectClientType(req);

    let versionData;
    if (clientType === 'admin') {
        versionData = { ...ADMIN_VERSION };
    } else {
        versionData = { ...PARTICIPANTE_VERSION };
    }

    // Adicionar metadata de detecção (útil para debug)
    versionData.clientDetected = clientType;
    versionData.timestamp = new Date().toISOString();

    res.json(versionData);
});

// =====================================================================
// ENDPOINTS LEGADOS (compatibilidade)
// =====================================================================

// GET /api/app/versao - Retorna versão do PARTICIPANTE (compatibilidade v1/v2)
router.get("/versao", (req, res) => {
    res.json(PARTICIPANTE_VERSION);
});

// GET /api/app/versao/participante - Versão específica do app mobile
router.get("/versao/participante", (req, res) => {
    res.json(PARTICIPANTE_VERSION);
});

// GET /api/app/versao/admin - Versão específica do painel admin
router.get("/versao/admin", (req, res) => {
    res.json(ADMIN_VERSION);
});

// =====================================================================
// ENDPOINTS DE DEBUG/DIAGNÓSTICO
// =====================================================================

// GET /api/app/versao/all - Retorna todas as versões
router.get("/versao/all", (req, res) => {
    res.json({
        participante: PARTICIPANTE_VERSION,
        admin: ADMIN_VERSION,
        global: APP_VERSION,
        scope_loaded: VERSION_SCOPE !== null,
        detected_client: detectClientType(req)
    });
});

// GET /api/app/versao/scope - Retorna configuração de escopo (debug)
router.get("/versao/scope", (req, res) => {
    if (!VERSION_SCOPE) {
        return res.status(503).json({
            error: "version-scope.json não carregado",
            fallback: "Usando lógica legacy"
        });
    }

    res.json({
        meta: VERSION_SCOPE._meta,
        triggers_count: VERSION_SCOPE.version_triggers?.rules?.length || 0,
        scopes: {
            admin_patterns: Object.keys(VERSION_SCOPE.scope_admin || {}),
            app_patterns: Object.keys(VERSION_SCOPE.scope_app || {}),
            shared_patterns: Object.keys(VERSION_SCOPE.shared || {})
        }
    });
});

// GET /api/app/versao/debug - Info completa para troubleshooting
router.get("/versao/debug", (req, res) => {
    const clientType = detectClientType(req);

    res.json({
        detected: {
            clientType,
            headers: {
                'x-client-type': req.headers['x-client-type'] || null,
                'referer': req.headers.referer || null,
                'user-agent': req.headers['user-agent']?.substring(0, 100) || null
            },
            query: req.query
        },
        versions: {
            participante: PARTICIPANTE_VERSION,
            admin: ADMIN_VERSION,
            global: APP_VERSION
        },
        scope: {
            loaded: VERSION_SCOPE !== null,
            triggers: VERSION_SCOPE?.version_triggers?.rules?.length || 0
        },
        server: {
            time: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    });
});

// =====================================================================
// CONFIGURAÇÃO DE TEMPORADA
// =====================================================================

// GET /api/app/season-config - Retorna configurações de temporada
router.get("/season-config", (req, res) => {
    res.json({
        current: CURRENT_SEASON,
        status: SEASON_CONFIG.status,
        rodadaFinal: SEASON_CONFIG.rodadaFinal,
        encerrado: SEASON_CONFIG.status === 'encerrada',
        dataMercadoAbre: SEASON_CONFIG.dataMercadoAbre,
        dataPrimeiraRodada: SEASON_CONFIG.dataPrimeiraRodada,
        dataFim: SEASON_CONFIG.dataFim,
        historico: SEASON_CONFIG.historico,
        timestamp: new Date().toISOString(),
    });
});

export default router;
