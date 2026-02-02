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

    // Busca ligas ativas
    const ligas = await db.collection('ligas').find({
      ativo: true
    }).sort({ id: 1 }).toArray();

    // Para cada liga, busca dados agregados
    const ligasComDados = await Promise.all(
      ligas.map(async (liga) => {
        try {
          // Busca participantes ativos
          const participantes = await db.collection('times').find({
            liga_id: liga.id,
            ativo: true
          }).toArray();

          const participantesAtivos = participantes.length;
          const participantesTotais = await db.collection('times').countDocuments({
            liga_id: liga.id
          });

          // Busca última consolidação (via logs de atividade)
          const ultimaConsolidacao = await db.collection('adminactivitylogs')
            .find({
              action: 'consolidacao_manual',
              'details.ligaId': liga.id,
              result: 'success'
            })
            .sort({ timestamp: -1 })
            .limit(1)
            .toArray();

          let ultimaConsolidacaoData = null;
          if (ultimaConsolidacao.length > 0) {
            ultimaConsolidacaoData = {
              rodada: ultimaConsolidacao[0].details?.rodada || 0,
              timestamp: ultimaConsolidacao[0].timestamp,
              status: 'success'
            };
          }

          // Calcula saldo total da liga (soma dos saldos dos participantes)
          const extratos = await db.collection('extratofinanceirocaches').find({
            liga_id: liga.id,
            temporada: liga.temporada || 2026
          }).toArray();

          let saldoTotal = 0;
          let inadimplentes = 0;

          extratos.forEach(extrato => {
            const saldo = extrato.saldo_final || 0;
            saldoTotal += saldo;
            if (saldo < 0) {
              inadimplentes++;
            }
          });

          // Busca módulos ativos
          const modulosAtivos = [];
          if (liga.modulos_ativos) {
            Object.entries(liga.modulos_ativos).forEach(([modulo, ativo]) => {
              if (ativo) {
                modulosAtivos.push(modulo);
              }
            });
          }

          return {
            id: liga.id,
            nome: liga.nome,
            temporada: liga.temporada || 2026,
            participantesAtivos,
            participantesTotais,
            rodadaAtual: liga.rodada_atual || 0,
            ultimaConsolidacao: ultimaConsolidacaoData,
            saldoTotal: parseFloat(saldoTotal.toFixed(2)),
            inadimplentes,
            modulosAtivos
          };
        } catch (ligaError) {
          console.error(`[adminMobile] Erro ao processar liga ${liga.id}:`, ligaError);
          return null;
        }
      })
    );

    // Remove ligas com erro
    const ligasValidas = ligasComDados.filter(l => l !== null);

    // Busca últimas 10 ações do admin
    const ultimasAcoes = await db.collection('adminactivitylogs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    const acoesFormatadas = ultimasAcoes.map(acao => {
      const tipoMap = {
        'consolidacao_manual': 'consolidacao',
        'novo_acerto': 'acerto',
        'aprovar_quitacao': 'quitacao',
        'login': 'login'
      };

      return {
        tipo: tipoMap[acao.action] || 'outro',
        ligaNome: acao.details?.ligaNome || 'N/A',
        rodada: acao.details?.rodada,
        participante: acao.details?.participante,
        valor: acao.details?.valor,
        timestamp: acao.timestamp,
        status: acao.result
      };
    });

    // Health score (TODO: implementar lógica real de health check)
    // Por enquanto, retorna mock
    const healthScore = 95;
    const healthStatus = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';

    res.json({
      healthScore,
      healthStatus,
      ligas: ligasValidas,
      ultimasAcoes: acoesFormatadas
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

    // Busca liga
    const liga = await db.collection('ligas').findOne({ id: ligaId });

    if (!liga) {
      return res.status(404).json({
        error: 'Liga não encontrada',
        code: 'LIGA_NOT_FOUND'
      });
    }

    // Busca participantes
    const participantes = await db.collection('times').find({
      liga_id: ligaId
    }).sort({ nome_cartoleiro: 1 }).toArray();

    const participantesAtivos = participantes.filter(p => p.ativo).length;
    const participantesTotais = participantes.length;

    // Busca extratos financeiros
    const extratos = await db.collection('extratofinanceirocaches').find({
      liga_id: ligaId,
      temporada: liga.temporada || 2026
    }).toArray();

    // Mapeia extratos por time_id
    const extratosMap = {};
    extratos.forEach(extrato => {
      extratosMap[extrato.time_id] = extrato;
    });

    // Busca ranking atual (pontoscorridoscaches)
    const ranking = await db.collection('pontoscorridoscaches').find({
      liga_id: ligaId,
      temporada: liga.temporada || 2026
    }).sort({ posicao: 1 }).toArray();

    // Mapeia ranking por time_id
    const rankingMap = {};
    ranking.forEach(r => {
      rankingMap[r.time_id] = r;
    });

    // Monta lista de participantes com dados completos
    const participantesComDados = participantes.map(p => {
      const extrato = extratosMap[p.id] || {};
      const rank = rankingMap[p.id] || {};

      return {
        id: p.id,
        nome: p.nome_cartoleiro,
        nomeTime: p.nome_time,
        ativo: p.ativo,
        escudo: p.clube_id || '262',
        saldo: extrato.saldo_final || 0,
        inadimplente: (extrato.saldo_final || 0) < 0,
        pontos: rank.pontos_total || 0,
        posicao: rank.posicao || null,
        patrimonio: rank.patrimonio || 0,
        rodadasParticipadas: rank.rodadas_participadas || 0
      };
    });

    // Calcula saldo total e inadimplentes
    let saldoTotal = 0;
    let inadimplentes = 0;
    participantesComDados.forEach(p => {
      saldoTotal += p.saldo;
      if (p.inadimplente) inadimplentes++;
    });

    // Busca última consolidação
    const ultimaConsolidacao = await db.collection('adminactivitylogs')
      .find({
        action: 'consolidacao_manual',
        'details.ligaId': ligaId,
        result: 'success'
      })
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    let ultimaConsolidacaoData = null;
    if (ultimaConsolidacao.length > 0) {
      ultimaConsolidacaoData = {
        rodada: ultimaConsolidacao[0].details?.rodada || 0,
        timestamp: ultimaConsolidacao[0].timestamp,
        status: 'success'
      };
    }

    // Módulos ativos
    const modulosAtivos = {};
    if (liga.modulos_ativos) {
      Object.entries(liga.modulos_ativos).forEach(([modulo, ativo]) => {
        modulosAtivos[modulo] = ativo;
      });
    }

    // Calcula estatísticas
    const participantesComPontos = participantesComDados.filter(p => p.pontos > 0);
    const mediaPontos = participantesComPontos.length > 0
      ? participantesComPontos.reduce((sum, p) => sum + p.pontos, 0) / participantesComPontos.length
      : 0;

    const participantesComPatrimonio = participantesComDados.filter(p => p.patrimonio > 0);
    const mediaPatrimonio = participantesComPatrimonio.length > 0
      ? participantesComPatrimonio.reduce((sum, p) => sum + p.patrimonio, 0) / participantesComPatrimonio.length
      : 0;

    // Busca total de pagamentos e premiações
    const acertos = await db.collection('acertofinanceiros').find({
      ligaId: String(ligaId),
      temporada: liga.temporada || 2026,
      ativo: true
    }).toArray();

    let totalPagamentos = 0;
    let totalPremiacoes = 0;

    acertos.forEach(a => {
      if (a.tipo === 'pagamento') {
        totalPagamentos += a.valor;
      } else {
        totalPremiacoes += a.valor;
      }
    });

    res.json({
      id: liga.id,
      nome: liga.nome,
      temporada: liga.temporada || 2026,
      ativo: liga.ativo,
      rodadaAtual: liga.rodada_atual || 0,
      participantesAtivos,
      participantesTotais,
      saldoTotal: parseFloat(saldoTotal.toFixed(2)),
      inadimplentes,
      ultimaConsolidacao: ultimaConsolidacaoData,
      modulosAtivos,
      participantes: participantesComDados,
      estatisticas: {
        totalPagamentos: parseFloat(totalPagamentos.toFixed(2)),
        totalPremiacoes: parseFloat(totalPremiacoes.toFixed(2)),
        mediaPontos: parseFloat(mediaPontos.toFixed(2)),
        mediaPatrimonio: parseFloat(mediaPatrimonio.toFixed(2))
      }
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
    const { ligaId, rodada, forcar } = req.body;
    const db = req.app.locals.db;

    // Validações
    if (!ligaId || !rodada) {
      return res.status(400).json({
        error: 'ligaId e rodada são obrigatórios',
        code: 'MISSING_PARAMS'
      });
    }

    const ligaIdNum = parseInt(ligaId);
    const rodadaNum = parseInt(rodada);

    if (isNaN(ligaIdNum) || isNaN(rodadaNum)) {
      return res.status(400).json({
        error: 'ligaId e rodada devem ser números válidos',
        code: 'INVALID_PARAMS'
      });
    }

    // Verifica se liga existe
    const liga = await db.collection('ligas').findOne({ id: ligaIdNum });
    if (!liga) {
      return res.status(404).json({
        error: 'Liga não encontrada',
        code: 'LIGA_NOT_FOUND'
      });
    }

    // Verifica se rodada já foi consolidada (a menos que forcar=true)
    if (!forcar) {
      const jaConsolidada = await db.collection('rodasnapshots').findOne({
        liga_id: String(liga._id),
        rodada: rodadaNum,
        status: 'consolidada',
        versao_schema: { $gte: 2 }
      });

      if (jaConsolidada) {
        return res.json({
          success: true,
          jaConsolidada: true,
          rodada: rodadaNum,
          consolidadaEm: jaConsolidada.data_consolidacao,
          message: 'Rodada já consolidada anteriormente'
        });
      }
    }

    // Importa dinamicamente o controller de consolidação para evitar dependências circulares
    const { consolidarRodada: consolidarRodadaOriginal } = await import('./consolidacaoController.js');

    // Cria um objeto req/res mockado para chamar o controller original
    const mockReq = {
      params: {
        ligaId: String(liga._id),
        rodada: String(rodadaNum)
      },
      query: {
        forcar: forcar ? 'true' : 'false'
      }
    };

    // Captura a resposta do controller original
    let consolidacaoResult = null;
    let consolidacaoError = null;
    let statusCode = 200;

    const mockRes = {
      json: (data) => {
        consolidacaoResult = data;
        return mockRes;
      },
      status: (code) => {
        statusCode = code;
        return mockRes;
      }
    };

    // Executa consolidação usando o controller existente
    await consolidarRodadaOriginal(mockReq, mockRes);

    // Registra ação no log de auditoria
    await db.collection('adminactivitylogs').insertOne({
      action: 'consolidacao_manual',
      user: req.admin.email,
      timestamp: new Date(),
      details: {
        ligaId: ligaIdNum,
        ligaNome: liga.nome,
        rodada: rodadaNum,
        forcar: !!forcar
      },
      result: consolidacaoResult?.success ? 'success' : 'error',
      error: consolidacaoError || null
    });

    // Retorna resultado
    if (statusCode !== 200) {
      return res.status(statusCode).json(consolidacaoResult);
    }

    res.json({
      success: consolidacaoResult?.success || false,
      jaConsolidada: consolidacaoResult?.jaConsolidada || false,
      rodada: rodadaNum,
      ligaId: ligaIdNum,
      ligaNome: liga.nome,
      consolidadaEm: consolidacaoResult?.consolidadaEm || new Date().toISOString(),
      message: consolidacaoResult?.jaConsolidada
        ? 'Rodada já estava consolidada'
        : 'Rodada consolidada com sucesso'
    });
  } catch (error) {
    console.error('[adminMobile] Erro no consolidarRodada:', error);
    res.status(500).json({
      error: 'Erro ao consolidar rodada: ' + error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/admin/mobile/consolidacao/status/:ligaId/:rodada
 * Status de consolidação de uma rodada específica
 */
async function getConsolidacaoStatus(req, res) {
  try {
    const { ligaId, rodada } = req.params;
    const db = req.app.locals.db;

    const ligaIdNum = parseInt(ligaId);
    const rodadaNum = parseInt(rodada);

    // Busca liga para obter _id do MongoDB
    const liga = await db.collection('ligas').findOne({ id: ligaIdNum });
    if (!liga) {
      return res.status(404).json({
        error: 'Liga não encontrada',
        code: 'LIGA_NOT_FOUND'
      });
    }

    // Busca snapshot consolidado
    const snapshot = await db.collection('rodasnapshots').findOne({
      liga_id: String(liga._id),
      rodada: rodadaNum
    });

    if (!snapshot) {
      return res.json({
        ligaId: ligaIdNum,
        rodada: rodadaNum,
        status: 'nao_consolidada',
        consolidada: false,
        message: 'Rodada ainda não foi consolidada'
      });
    }

    // Retorna detalhes do snapshot
    res.json({
      ligaId: ligaIdNum,
      rodada: rodadaNum,
      status: snapshot.status || 'consolidada',
      consolidada: snapshot.status === 'consolidada',
      versaoSchema: snapshot.versao_schema || 1,
      dataConsolidacao: snapshot.data_consolidacao,
      totalParticipantes: snapshot.dados_consolidados?.ranking_geral?.length || 0,
      temRankingRodada: (snapshot.dados_consolidados?.ranking_rodada?.length || 0) > 0,
      temFinanceiro: !!snapshot.dados_consolidados?.financeiro,
      modulosProcessados: {
        pontosCorridos: (snapshot.dados_consolidados?.confrontos_pontos_corridos?.length || 0) > 0,
        mataMata: (snapshot.dados_consolidados?.confrontos_mata_mata?.length || 0) > 0,
        top10: (snapshot.dados_consolidados?.top_10?.mitos?.length || 0) > 0,
        artilheiro: !!snapshot.dados_consolidados?.artilheiro_campeao
      }
    });
  } catch (error) {
    console.error('[adminMobile] Erro no getConsolidacaoStatus:', error);
    res.status(500).json({
      error: 'Erro ao buscar status: ' + error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/admin/mobile/consolidacao/historico/:ligaId
 * Histórico de consolidações de uma liga
 * Query params: temporada, limit
 */
async function getConsolidacaoHistorico(req, res) {
  try {
    const ligaId = parseInt(req.params.ligaId);
    const db = req.app.locals.db;

    // Query params opcionais
    const temporada = req.query.temporada ? parseInt(req.query.temporada) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    // Busca liga
    const liga = await db.collection('ligas').findOne({ id: ligaId });
    if (!liga) {
      return res.status(404).json({
        error: 'Liga não encontrada',
        code: 'LIGA_NOT_FOUND'
      });
    }

    // Busca snapshots consolidados
    const query = {
      liga_id: String(liga._id),
      status: 'consolidada'
    };

    // Filtra por temporada se especificado
    if (temporada) {
      query.temporada = temporada;
    }

    const snapshots = await db.collection('rodasnapshots')
      .find(query)
      .sort({ rodada: -1 }) // Mais recentes primeiro
      .limit(limit)
      .toArray();

    // Formata histórico para resposta mobile
    const historico = snapshots.map(snapshot => {
      const rankingGeral = snapshot.dados_consolidados?.ranking_geral || [];
      const rankingRodada = snapshot.dados_consolidados?.ranking_rodada || [];
      const top10 = snapshot.dados_consolidados?.top_10 || {};

      // Identifica campeão da rodada e lider geral
      const campeaoRodada = rankingRodada[0] || null;
      const liderGeral = rankingGeral[0] || null;

      return {
        rodada: snapshot.rodada,
        temporada: snapshot.temporada || liga.temporada || 2026,
        dataConsolidacao: snapshot.data_consolidacao,
        versaoSchema: snapshot.versao_schema || 1,
        totalParticipantes: rankingGeral.length,
        campeaoRodada: campeaoRodada ? {
          timeId: campeaoRodada.time_id,
          nome: campeaoRodada.nome_time || campeaoRodada.nome,
          pontos: campeaoRodada.pontos_rodada || campeaoRodada.pontos
        } : null,
        liderGeral: liderGeral ? {
          timeId: liderGeral.time_id,
          nome: liderGeral.nome_time || liderGeral.nome,
          pontos: liderGeral.pontos_acumulados || liderGeral.pontos
        } : null,
        mito: top10.mitos?.[0] || null,
        mico: top10.micos?.[0] || null,
        modulosAtivos: {
          pontosCorridos: (snapshot.dados_consolidados?.confrontos_pontos_corridos?.length || 0) > 0,
          mataMata: (snapshot.dados_consolidados?.confrontos_mata_mata?.length || 0) > 0,
          artilheiro: !!snapshot.dados_consolidados?.artilheiro_campeao,
          luvaOuro: !!snapshot.dados_consolidados?.luva_ouro
        }
      };
    });

    // Busca informações de rodadas não consolidadas (se temporada atual)
    const temporadaAtual = liga.temporada || 2026;
    const rodadaAtual = liga.rodada_atual || 1;

    let rodadasPendentes = [];
    if (!temporada || temporada === temporadaAtual) {
      const rodadasConsolidadas = snapshots.map(s => s.rodada);
      rodadasPendentes = [];

      for (let r = 1; r <= rodadaAtual; r++) {
        if (!rodadasConsolidadas.includes(r)) {
          rodadasPendentes.push(r);
        }
      }
    }

    res.json({
      ligaId,
      ligaNome: liga.nome,
      temporada: temporada || temporadaAtual,
      totalConsolidadas: snapshots.length,
      rodadaAtual,
      rodadasPendentes,
      historico
    });
  } catch (error) {
    console.error('[adminMobile] Erro no getConsolidacaoHistorico:', error);
    res.status(500).json({
      error: 'Erro ao buscar histórico: ' + error.message,
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
