// controllers/luvaDeOuroController.js v3.0.0 - SaaS DINÂMICO
// v3.0.0: ranking-live, consolidar, temporada, desempate
// v2.0.0: Configurações dinâmicas via liga.configuracoes (White Label)
import {
  coletarDadosGoleiros,
  obterRankingGoleiros,
  detectarUltimaRodadaConcluida,
  consolidarRodada,
} from "../services/goleirosService.js";
import Liga from "../models/Liga.js";

// =====================================================================
// ✅ v2.0: VALIDAÇÃO DINÂMICA DE LIGA (SaaS)
// =====================================================================

/**
 * Verifica se a liga suporta o módulo Luva de Ouro
 * @param {string} ligaId - ID da liga
 * @returns {Promise<{valid: boolean, liga: Object|null, error: string|null}>}
 */
async function validarLigaLuvaOuro(ligaId) {
  try {
    const liga = await Liga.findById(ligaId).lean();

    if (!liga) {
      return { valid: false, liga: null, error: "Liga não encontrada" };
    }

    // ✅ v2.0: Verificar se o módulo está habilitado nas configurações
    const luvaOuroConfig = liga.configuracoes?.luva_ouro;
    const moduloAtivo = liga.modulos_ativos?.luvaOuro;

    if (!luvaOuroConfig?.habilitado && !moduloAtivo) {
      return {
        valid: false,
        liga,
        error: `Liga "${liga.nome}" não tem o módulo Luva de Ouro habilitado`
      };
    }

    return { valid: true, liga, error: null };
  } catch (error) {
    return { valid: false, liga: null, error: error.message };
  }
}

class LuvaDeOuroController {
  // GET /api/luva-de-ouro/:ligaId/ranking
  static async obterRanking(req, res) {
    try {
      const { ligaId } = req.params;
      const { inicio = 1, fim = null, forcar_coleta = false } = req.query;

      console.log(`🥅 [LUVA-OURO] Solicitação de ranking - Liga: ${ligaId}`);
      console.log(
        `📊 Parâmetros: início=${inicio}, fim=${fim}, forcar_coleta=${forcar_coleta}`,
      );

      // ✅ v2.0: Validar liga dinamicamente
      const validacao = await validarLigaLuvaOuro(ligaId);
      if (!validacao.valid) {
        return res.status(400).json({
          success: false,
          error: validacao.error,
          ligaId,
        });
      }

      const rodadaInicio = parseInt(inicio);
      const rodadaFim = fim ? parseInt(fim) : null;

      // Validar parâmetros
      if (rodadaInicio < 1 || rodadaInicio > 38) {
        return res.status(400).json({
          success: false,
          error: "Rodada de início deve estar entre 1 e 38",
          inicio: rodadaInicio,
        });
      }

      if (rodadaFim && (rodadaFim < rodadaInicio || rodadaFim > 38)) {
        return res.status(400).json({
          success: false,
          error: "Rodada de fim inválida",
          fim: rodadaFim,
          inicio: rodadaInicio,
        });
      }

      // Se forçar coleta, coletar dados primeiro
      if (forcar_coleta === "true") {
        console.log("🔄 Forçando coleta de dados...");
        try {
          const fimColeta =
            rodadaFim ||
            (await detectarUltimaRodadaConcluida().then((r) => r.recomendacao));
          await coletarDadosGoleiros(ligaId, rodadaInicio, fimColeta);
        } catch (coletaError) {
          console.error("❌ Erro na coleta forçada:", coletaError);
          // Continua mesmo com erro na coleta
        }
      }

      // Obter ranking
      const resultado = await obterRankingGoleiros(
        ligaId,
        rodadaInicio,
        rodadaFim,
      );

      console.log(
        `✅ Ranking gerado: ${resultado.ranking.length} participantes`,
      );

      res.json({
        success: true,
        data: resultado,
        timestamp: new Date().toISOString(),
        parametros: {
          inicio: rodadaInicio,
          fim: rodadaFim,
          forcar_coleta: forcar_coleta === "true",
        },
      });
    } catch (error) {
      console.error("❌ [LUVA-OURO] Erro ao obter ranking:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/luva-de-ouro/:ligaId/detectar-rodada
  static async detectarRodada(req, res) {
    try {
      const { ligaId } = req.params;

      console.log(`🥅 [LUVA-OURO] Detectando rodada - Liga: ${ligaId}`);

      // ✅ v2.0: Validar liga dinamicamente
      const validacao = await validarLigaLuvaOuro(ligaId);
      if (!validacao.valid) {
        return res.status(400).json({
          success: false,
          error: validacao.error,
        });
      }

      const deteccao = await detectarUltimaRodadaConcluida();

      console.log(`✅ Rodada detectada:`, deteccao);

      res.json({
        success: true,
        data: deteccao,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ [LUVA-OURO] Erro ao detectar rodada:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/luva-de-ouro/:ligaId/coletar
  static async coletarDados(req, res) {
    try {
      const { ligaId } = req.params;
      const { rodada, inicio, fim, forcar = false } = req.query;

      console.log(`🥅 [LUVA-OURO] Solicitação de coleta - Liga: ${ligaId}`);

      // ✅ v2.0: Validar liga dinamicamente
      const validacao = await validarLigaLuvaOuro(ligaId);
      if (!validacao.valid) {
        return res.status(400).json({
          success: false,
          error: validacao.error,
        });
      }

      let resultado;

      if (rodada) {
        // Coletar rodada específica
        const numeroRodada = parseInt(rodada);
        if (numeroRodada < 1 || numeroRodada > 38) {
          return res.status(400).json({
            success: false,
            error: "Rodada deve estar entre 1 e 38",
          });
        }

        resultado = await coletarDadosGoleiros(
          ligaId,
          numeroRodada,
          numeroRodada,
        );
      } else if (inicio && fim) {
        // Coletar múltiplas rodadas
        const rodadaInicio = parseInt(inicio);
        const rodadaFim = parseInt(fim);

        if (rodadaInicio < 1 || rodadaFim > 38 || rodadaInicio > rodadaFim) {
          return res.status(400).json({
            success: false,
            error: "Parâmetros de rodada inválidos",
          });
        }

        resultado = await coletarDadosGoleiros(ligaId, rodadaInicio, rodadaFim);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Especifique "rodada" ou "inicio" e "fim"',
        });
      }

      console.log(`✅ Coleta concluída:`, resultado);

      res.json({
        success: true,
        data: resultado,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ [LUVA-OURO] Erro na coleta:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/luva-de-ouro/:ligaId/diagnostico
  static async diagnostico(req, res) {
    try {
      const { ligaId } = req.params;

      console.log(`🔍 [LUVA-OURO] Executando diagnóstico - Liga: ${ligaId}`);

      // ✅ v2.0: Validar liga dinamicamente
      const validacao = await validarLigaLuvaOuro(ligaId);
      if (!validacao.valid) {
        return res.status(400).json({
          success: false,
          error: validacao.error,
        });
      }

      const Goleiros = (await import("../models/Goleiros.js")).default;

      // Buscar dados no MongoDB
      const totalRegistros = await Goleiros.countDocuments({ ligaId });
      const registrosComGoleiro = await Goleiros.countDocuments({
        ligaId,
        goleiroNome: { $ne: null, $ne: "Sem goleiro" },
      });
      const registrosComPontos = await Goleiros.countDocuments({
        ligaId,
        pontos: { $gt: 0 },
      });

      const rodadasDisponiveis = await Goleiros.distinct("rodada", { ligaId });
      const participantes = await Goleiros.distinct("participanteId", {
        ligaId,
      });

      // Buscar alguns exemplos
      const exemplos = await Goleiros.find({ ligaId })
        .limit(5)
        .sort({ rodada: -1 })
        .select("participanteNome rodada goleiroNome pontos dataColeta");

      const diagnostico = {
        ligaId,
        mongodb: {
          totalRegistros,
          registrosComGoleiro,
          registrosComPontos,
          rodadasDisponiveis: rodadasDisponiveis.sort(),
          totalParticipantes: participantes.length,
          participantes,
          exemplos: exemplos.map((e) => ({
            participante: e.participanteNome,
            rodada: e.rodada,
            goleiro: e.goleiroNome || "N/D",
            pontos: e.pontos || 0,
            dataColeta: e.dataColeta,
          })),
        },
        api: {
          status: "Testando...",
          ultimaRodada: null,
          erro: null,
        },
        recomendacoes: [],
      };

      // Testar API
      try {
        const deteccao = await (
          await import("../services/goleirosService.js")
        ).detectarUltimaRodadaConcluida();
        diagnostico.api.status = "OK";
        diagnostico.api.ultimaRodada = deteccao.recomendacao;
      } catch (apiError) {
        diagnostico.api.status = "ERRO";
        diagnostico.api.erro = apiError.message;
      }

      // Gerar recomendações
      if (totalRegistros === 0) {
        diagnostico.recomendacoes.push("Executar coleta inicial de dados");
      }
      if (registrosComPontos < totalRegistros * 0.1) {
        diagnostico.recomendacoes.push(
          "Verificar estrutura da API - poucos registros com pontuação",
        );
      }
      if (rodadasDisponiveis.length < 5) {
        diagnostico.recomendacoes.push(
          "Coletar mais rodadas para análise completa",
        );
      }

      res.json({
        success: true,
        data: diagnostico,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ [LUVA-OURO] Erro no diagnóstico:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/luva-de-ouro/:ligaId/estatisticas
  static async obterEstatisticas(req, res) {
    try {
      const { ligaId } = req.params;

      console.log(`🥅 [LUVA-OURO] Obtendo estatísticas - Liga: ${ligaId}`);

      // ✅ v2.0: Validar liga dinamicamente
      const validacao = await validarLigaLuvaOuro(ligaId);
      if (!validacao.valid) {
        return res.status(400).json({
          success: false,
          error: validacao.error,
        });
      }

      // For now, return basic statistics
      const estatisticas = {
        message: "Estatísticas não implementadas ainda",
        ligaId,
        timestamp: new Date().toISOString(),
      };

      console.log(`✅ Estatísticas obtidas:`, estatisticas);

      res.json({
        success: true,
        data: estatisticas,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ [LUVA-OURO] Erro ao obter estatísticas:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/luva-de-ouro/:ligaId/participantes
  static async listarParticipantes(req, res) {
    try {
      const { ligaId } = req.params;

      console.log(`🥅 [LUVA-OURO] Listando participantes - Liga: ${ligaId}`);

      // ✅ v2.0: Validar liga dinamicamente
      const validacao = await validarLigaLuvaOuro(ligaId);
      if (!validacao.valid) {
        return res.status(400).json({
          success: false,
          error: validacao.error,
        });
      }

      // ✅ v2.0: Buscar participantes da liga no banco (não mais hardcoded)
      const liga = validacao.liga;
      const participantes = (liga.participantes || [])
        .filter(p => p.ativo !== false) // Apenas ativos
        .map(p => ({
          timeId: p.time_id,
          nome: p.nome_cartola,
          clubeId: p.clube_id,
        }));

      res.json({
        success: true,
        data: {
          ligaId,
          ligaNome: liga.nome,
          totalParticipantes: participantes.length,
          participantes,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ [LUVA-OURO] Erro ao listar participantes:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/luva-de-ouro/:ligaId/ranking-live
  static async getRankingLive(req, res) {
    try {
      const { ligaId } = req.params;

      console.log(`🔥 [LUVA-OURO] Ranking LIVE (parciais) - Liga: ${ligaId}`);

      // Validar liga
      const validacao = await validarLigaLuvaOuro(ligaId);
      if (!validacao.valid) {
        return res.status(400).json({
          success: false,
          error: validacao.error,
        });
      }

      // Obter ranking com forcar_coleta para parciais mais frescos
      const resultado = await obterRankingGoleiros(ligaId, 1, null);

      res.json({
        success: true,
        data: resultado,
        live: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ [LUVA-OURO] Erro no ranking live:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // POST /api/luva-de-ouro/:ligaId/consolidar (admin only)
  static async consolidarTemporada(req, res) {
    try {
      const { ligaId } = req.params;
      const { rodada } = req.body || req.query;

      console.log(`🔒 [LUVA-OURO] Consolidar rodada ${rodada} - Liga: ${ligaId}`);

      // Validar liga
      const validacao = await validarLigaLuvaOuro(ligaId);
      if (!validacao.valid) {
        return res.status(400).json({
          success: false,
          error: validacao.error,
        });
      }

      if (!rodada) {
        return res.status(400).json({
          success: false,
          error: 'Parâmetro "rodada" é obrigatório',
        });
      }

      const resultado = await consolidarRodada(ligaId, rodada);

      res.json({
        success: true,
        data: resultado,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ [LUVA-OURO] Erro ao consolidar:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/luva-de-ouro/:ligaId/participante/:participanteId/detalhes
  static async obterDetalhesParticipante(req, res) {
    try {
      const { ligaId, participanteId } = req.params;
      const { inicio = 1, fim } = req.query;

      console.log(
        `🥅 [LUVA-OURO] Detalhes do participante ${participanteId} - Liga: ${ligaId}`,
      );
      console.log(`📊 Parâmetros: início=${inicio}, fim=${fim}`);

      // ✅ v2.0: Validar liga dinamicamente
      const validacao = await validarLigaLuvaOuro(ligaId);
      if (!validacao.valid) {
        return res.status(400).json({
          success: false,
          error: validacao.error,
        });
      }

      const rodadaInicio = parseInt(inicio);
      // ✅ CORREÇÃO: Detectar rodada fim se não fornecida
      let rodadaFim = fim ? parseInt(fim) : null;

      // Se fim não foi especificado, detectar automaticamente
      if (!rodadaFim || isNaN(rodadaFim)) {
        try {
          const { detectarUltimaRodadaConcluida } = await import(
            "../services/goleirosService.js"
          );
          const deteccao = await detectarUltimaRodadaConcluida();
          rodadaFim = deteccao.recomendacao || 26;
          console.log(`📅 Rodada fim detectada automaticamente: ${rodadaFim}`);
        } catch (error) {
          rodadaFim = 26; // fallback
        }
      }

      const timeId = parseInt(participanteId);

      // Validar parâmetros
      if (
        rodadaInicio < 1 ||
        rodadaInicio > 38 ||
        rodadaFim < 1 ||
        rodadaFim > 38 ||
        rodadaInicio > rodadaFim
      ) {
        return res.status(400).json({
          success: false,
          error: "Parâmetros de rodada inválidos",
        });
      }

      if (isNaN(timeId)) {
        return res.status(400).json({
          success: false,
          error: "ID do participante inválido",
        });
      }

      const Goleiros = (await import("../models/Goleiros.js")).default;

      // Buscar dados do participante
      const dadosParticipante = await Goleiros.find({
        ligaId,
        participanteId: timeId,
        rodada: { $gte: rodadaInicio, $lte: rodadaFim },
      })
        .sort({ rodada: 1 })
        .exec();

      if (dadosParticipante.length === 0) {
        return res.json({
          success: true,
          data: {
            participanteId: timeId,
            ligaId,
            rodadaInicio,
            rodadaFim,
            totalPontos: 0,
            totalRodadas: 0,
            rodadas: [],
            estatisticas: {
              melhorRodada: 0,
              piorRodada: 0,
              mediaPontos: 0,
              rodadasComGoleiro: 0,
            },
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Processar dados
      const rodadas = dadosParticipante.map((item) => ({
        rodada: item.rodada,
        goleiroNome: item.goleiroNome,
        goleiroClube: item.goleiroClube,
        pontos: item.pontos || 0,
        status: item.status,
        dataColeta: item.dataColeta,
      }));

      const totalPontos = rodadas.reduce((acc, r) => acc + r.pontos, 0);
      const rodadasComGoleiro = rodadas.filter(
        (r) => r.goleiroNome && r.goleiroNome !== "Sem goleiro",
      ).length;
      const pontosValidos = rodadas
        .filter((r) => r.pontos > 0)
        .map((r) => r.pontos);

      const estatisticas = {
        melhorRodada: pontosValidos.length > 0 ? Math.max(...pontosValidos) : 0,
        piorRodada: pontosValidos.length > 0 ? Math.min(...pontosValidos) : 0,
        mediaPontos: rodadas.length > 0 ? totalPontos / rodadas.length : 0,
        rodadasComGoleiro,
      };

      const resultado = {
        participanteId: timeId,
        participanteNome: dadosParticipante[0].participanteNome,
        ligaId,
        rodadaInicio,
        rodadaFim,
        totalPontos,
        totalRodadas: rodadas.length,
        rodadas,
        estatisticas,
      };

      console.log(
        `✅ Detalhes obtidos: ${rodadas.length} rodadas, ${totalPontos.toFixed(1)} pontos totais`,
      );

      res.json({
        success: true,
        data: resultado,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "❌ [LUVA-OURO] Erro ao obter detalhes do participante:",
        error,
      );
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export default LuvaDeOuroController;
