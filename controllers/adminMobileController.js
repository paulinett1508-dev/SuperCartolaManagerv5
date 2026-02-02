/**
 * Admin Mobile Controller
 * Lógica de negócio para rotas mobile
 */

import { generateToken, isAdminAutorizado } from '../middleware/adminMobileAuth.js';

/**
 * POST /api/admin/mobile/auth
 * Gera JWT token após autenticação via Replit Auth
 */
async function authenticate(req, res) {
  try {
    // Verifica se usuário está autenticado via session (Replit Auth)
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        error: 'Não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const { email, nome } = req.session.usuario;

    // Verifica se é admin
    const db = req.app.locals.db;
    const isAdmin = await isAdminAutorizado(email, db);

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Acesso negado. Você não é um administrador.',
        code: 'ACCESS_DENIED'
      });
    }

    // Gera JWT token
    const token = generateToken(email, nome);

    // Log de atividade
    try {
      await db.collection('adminactivitylogs').insertOne({
        email,
        action: 'login',
        details: { platform: 'mobile' },
        result: 'success',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      });
    } catch (logError) {
      console.error('[adminMobile] Erro ao registrar log:', logError);
      // Não bloqueia o login se log falhar
    }

    res.json({
      token,
      email,
      nome,
      expiresIn: '24h'
    });
  } catch (error) {
    console.error('[adminMobile] Erro no authenticate:', error);
    res.status(500).json({
      error: 'Erro ao autenticar',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/admin/mobile/dashboard
 * Retorna dados do dashboard (ligas, health, últimas ações)
 */
async function getDashboard(req, res) {
  try {
    const db = req.app.locals.db;
    const adminEmail = req.admin.email;

    // TODO FASE 2: Implementar lógica completa do dashboard
    // Por enquanto, retorna mock data

    res.json({
      healthScore: 95,
      healthStatus: 'healthy',
      ligas: [],
      ultimasAcoes: []
    });
  } catch (error) {
    console.error('[adminMobile] Erro no getDashboard:', error);
    res.status(500).json({
      error: 'Erro ao carregar dashboard',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/admin/mobile/ligas
 * Lista todas as ligas gerenciadas
 */
async function getLigas(req, res) {
  try {
    const db = req.app.locals.db;
    const { temporada, ativo } = req.query;

    // TODO FASE 3: Implementar lógica completa
    res.json({ ligas: [] });
  } catch (error) {
    console.error('[adminMobile] Erro no getLigas:', error);
    res.status(500).json({
      error: 'Erro ao listar ligas',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/admin/mobile/ligas/:ligaId
 * Detalhes de uma liga específica
 */
async function getLigaDetalhes(req, res) {
  try {
    const db = req.app.locals.db;
    const ligaId = parseInt(req.params.ligaId);

    // TODO FASE 3: Implementar lógica completa
    res.json({
      id: ligaId,
      nome: 'Liga Teste',
      participantes: []
    });
  } catch (error) {
    console.error('[adminMobile] Erro no getLigaDetalhes:', error);
    res.status(500).json({
      error: 'Erro ao buscar detalhes da liga',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * POST /api/admin/mobile/consolidacao
 * Inicia consolidação manual
 */
async function consolidarRodada(req, res) {
  try {
    const { ligaId, rodada } = req.body;

    // TODO FASE 4: Implementar lógica completa
    res.json({
      jobId: `consolidacao-${ligaId}-${rodada}-${Date.now()}`,
      ligaId,
      rodada,
      status: 'processing',
      message: 'Consolidação iniciada'
    });
  } catch (error) {
    console.error('[adminMobile] Erro no consolidarRodada:', error);
    res.status(500).json({
      error: 'Erro ao iniciar consolidação',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/admin/mobile/consolidacao/status/:jobId
 * Status de consolidação em tempo real
 */
async function getConsolidacaoStatus(req, res) {
  try {
    const { jobId } = req.params;

    // TODO FASE 4: Implementar lógica completa
    res.json({
      jobId,
      status: 'completed',
      progress: 100
    });
  } catch (error) {
    console.error('[adminMobile] Erro no getConsolidacaoStatus:', error);
    res.status(500).json({
      error: 'Erro ao buscar status',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/admin/mobile/consolidacao/historico/:ligaId
 * Histórico de consolidações
 */
async function getConsolidacaoHistorico(req, res) {
  try {
    const ligaId = parseInt(req.params.ligaId);

    // TODO FASE 4: Implementar lógica completa
    res.json({
      ligaId,
      historico: []
    });
  } catch (error) {
    console.error('[adminMobile] Erro no getConsolidacaoHistorico:', error);
    res.status(500).json({
      error: 'Erro ao buscar histórico',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * POST /api/admin/mobile/acertos
 * Registra novo acerto financeiro
 */
async function registrarAcerto(req, res) {
  try {
    const { ligaId, timeId, tipo, valor, descricao, temporada } = req.body;

    // TODO FASE 5: Implementar lógica completa
    res.status(201).json({
      id: 'mock-id',
      ligaId,
      timeId,
      tipo,
      valor,
      descricao
    });
  } catch (error) {
    console.error('[adminMobile] Erro no registrarAcerto:', error);
    res.status(500).json({
      error: 'Erro ao registrar acerto',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/admin/mobile/acertos/:ligaId
 * Histórico de acertos
 */
async function getAcertos(req, res) {
  try {
    const ligaId = parseInt(req.params.ligaId);

    // TODO FASE 5: Implementar lógica completa
    res.json({
      ligaId,
      acertos: []
    });
  } catch (error) {
    console.error('[adminMobile] Erro no getAcertos:', error);
    res.status(500).json({
      error: 'Erro ao buscar acertos',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/admin/mobile/quitacoes/pendentes
 * Lista quitações pendentes
 */
async function getQuitacoesPendentes(req, res) {
  try {
    // TODO FASE 5: Implementar lógica completa
    res.json({ quitacoes: [] });
  } catch (error) {
    console.error('[adminMobile] Erro no getQuitacoesPendentes:', error);
    res.status(500).json({
      error: 'Erro ao buscar quitações',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * PUT /api/admin/mobile/quitacoes/:id/aprovar
 * Aprova quitação
 */
async function aprovarQuitacao(req, res) {
  try {
    const { id } = req.params;
    const { observacao } = req.body;

    // TODO FASE 5: Implementar lógica completa
    res.json({
      id,
      status: 'aprovado',
      observacao
    });
  } catch (error) {
    console.error('[adminMobile] Erro no aprovarQuitacao:', error);
    res.status(500).json({
      error: 'Erro ao aprovar quitação',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * PUT /api/admin/mobile/quitacoes/:id/recusar
 * Recusa quitação
 */
async function recusarQuitacao(req, res) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    // TODO FASE 5: Implementar lógica completa
    res.json({
      id,
      status: 'recusado',
      motivo
    });
  } catch (error) {
    console.error('[adminMobile] Erro no recusarQuitacao:', error);
    res.status(500).json({
      error: 'Erro ao recusar quitação',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/admin/mobile/health
 * Dashboard de saúde adaptado
 */
async function getHealth(req, res) {
  try {
    // TODO FASE 6: Implementar lógica completa
    res.json({
      healthScore: 95,
      status: 'healthy',
      components: []
    });
  } catch (error) {
    console.error('[adminMobile] Erro no getHealth:', error);
    res.status(500).json({
      error: 'Erro ao buscar health',
      code: 'INTERNAL_ERROR'
    });
  }
}

export {
  authenticate,
  getDashboard,
  getLigas,
  getLigaDetalhes,
  consolidarRodada,
  getConsolidacaoStatus,
  getConsolidacaoHistorico,
  registrarAcerto,
  getAcertos,
  getQuitacoesPendentes,
  aprovarQuitacao,
  recusarQuitacao,
  getHealth
};
