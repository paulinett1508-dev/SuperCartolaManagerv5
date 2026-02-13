/**
 * ORCHESTRATOR ROUTES v1.0.0
 *
 * API endpoints para o Round-Market Orchestrator.
 * Usado pelo Admin Dashboard e para debugging.
 */

import express from 'express';
import orchestrator from '../services/orchestrator/roundMarketOrchestrator.js';
import OrchestratorState from '../models/OrchestratorState.js';
import { verificarAdmin } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// STATUS & MONITORAMENTO
// ============================================================================

/**
 * GET /api/orchestrator/status
 * Retorna status completo do orquestrador (tempo real)
 */
router.get('/status', verificarAdmin, async (req, res) => {
    try {
        const statusLive = orchestrator.getStatus();
        const estadoDB = await OrchestratorState.carregar();

        res.json({
            success: true,
            live: statusLive,
            persistido: estadoDB,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/orchestrator/managers
 * Lista todos os managers e seus status
 */
router.get('/managers', verificarAdmin, async (req, res) => {
    try {
        const managers = orchestrator.getManagers().map(m => m.toJSON());
        res.json({ success: true, managers, total: managers.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/orchestrator/managers/:id
 * Detalhe de um manager específico
 */
router.get('/managers/:id', verificarAdmin, async (req, res) => {
    try {
        const manager = orchestrator.getManager(req.params.id);
        if (!manager) {
            return res.status(404).json({ success: false, error: 'Manager não encontrado' });
        }
        res.json({ success: true, manager: manager.toJSON() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/orchestrator/eventos
 * Últimos eventos do orquestrador
 */
router.get('/eventos', verificarAdmin, async (req, res) => {
    try {
        const estado = await OrchestratorState.carregar();
        const eventos = estado?.eventos || [];

        res.json({
            success: true,
            eventos: eventos.reverse(), // Mais recente primeiro
            total: eventos.length,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// AÇÕES MANUAIS (Admin)
// ============================================================================

/**
 * POST /api/orchestrator/forcar-consolidacao
 * Força consolidação de uma rodada específica
 */
router.post('/forcar-consolidacao', verificarAdmin, async (req, res) => {
    try {
        const { rodada } = req.body;

        if (!rodada || rodada < 1 || rodada > 38) {
            return res.status(400).json({
                success: false,
                error: 'Rodada inválida (1-38)',
            });
        }

        console.log(`[ORCHESTRATOR-API] Consolidação forçada R${rodada} solicitada`);

        // Executa assíncrono
        orchestrator.forcarConsolidacao(rodada).catch(err => {
            console.error('[ORCHESTRATOR-API] Erro na consolidação forçada:', err.message);
        });

        res.json({
            success: true,
            message: `Consolidação R${rodada} iniciada em background`,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/orchestrator/forcar-verificacao
 * Força nova verificação do mercado (limpa cache)
 */
router.post('/forcar-verificacao', verificarAdmin, async (req, res) => {
    try {
        await orchestrator.forcarVerificacao();
        const status = orchestrator.getStatus();

        res.json({
            success: true,
            message: 'Verificação forçada concluída',
            status,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SSE - SERVER-SENT EVENTS (para dashboard em tempo real)
// ============================================================================

/**
 * GET /api/orchestrator/stream
 * Stream de eventos em tempo real via SSE
 */
router.get('/stream', verificarAdmin, (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    // Enviar status atual imediatamente
    const statusInicial = orchestrator.getStatus();
    res.write(`data: ${JSON.stringify({ tipo: 'status', dados: statusInicial })}\n\n`);

    // Listeners de eventos do orquestrador
    const onTransicao = (dados) => {
        res.write(`data: ${JSON.stringify({ tipo: 'transicao', dados })}\n\n`);
    };

    const onMercadoAbriu = (dados) => {
        res.write(`data: ${JSON.stringify({ tipo: 'mercado_abriu', dados })}\n\n`);
    };

    const onMercadoFechou = (dados) => {
        res.write(`data: ${JSON.stringify({ tipo: 'mercado_fechou', dados })}\n\n`);
    };

    orchestrator.on('mercado:abriu', onMercadoAbriu);
    orchestrator.on('mercado:fechou', onMercadoFechou);

    // Heartbeat a cada 30s
    const heartbeat = setInterval(() => {
        const status = orchestrator.getStatus();
        res.write(`data: ${JSON.stringify({ tipo: 'heartbeat', dados: status })}\n\n`);
    }, 30000);

    // Cleanup quando cliente desconectar
    req.on('close', () => {
        clearInterval(heartbeat);
        orchestrator.removeListener('mercado:abriu', onMercadoAbriu);
        orchestrator.removeListener('mercado:fechou', onMercadoFechou);
    });
});

export default router;
