// controllers/luvaDeOuroController.js
import GoleirosService from "../services/goleirosService.js";

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

      // Validar liga (apenas Cartoleiros do Sobral)
      if (ligaId !== "684d821cf1a7ae16d1f89572") {
        return res.status(400).json({
          success: false,
          error: "Liga não suportada para Luva de Ouro",
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
            (await GoleirosService.detectarUltimaRodada(ligaId).then(
              (r) => r.recomendacao,
            ));
          await GoleirosService.coletarMultiplasRodadas(
            ligaId,
            rodadaInicio,
            fimColeta,
            true,
          );
        } catch (coletaError) {
          console.error("❌ Erro na coleta forçada:", coletaError);
          // Continua mesmo com erro na coleta
        }
      }

      // Obter ranking
      const resultado = await GoleirosService.obterRanking(
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

      // Validar liga
      if (ligaId !== "684d821cf1a7ae16d1f89572") {
        return res.status(400).json({
          success: false,
          error: "Liga não suportada para Luva de Ouro",
        });
      }

      const deteccao = await GoleirosService.detectarUltimaRodada(ligaId);

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

      // Validar liga
      if (ligaId !== "684d821cf1a7ae16d1f89572") {
        return res.status(400).json({
          success: false,
          error: "Liga não suportada para Luva de Ouro",
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

        resultado = await GoleirosService.coletarRodada(
          ligaId,
          numeroRodada,
          forcar === "true",
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

        resultado = await GoleirosService.coletarMultiplasRodadas(
          ligaId,
          rodadaInicio,
          rodadaFim,
          forcar === "true",
        );
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

  // GET /api/luva-de-ouro/:ligaId/estatisticas
  static async obterEstatisticas(req, res) {
    try {
      const { ligaId } = req.params;

      console.log(`🥅 [LUVA-OURO] Obtendo estatísticas - Liga: ${ligaId}`);

      // Validar liga
      if (ligaId !== "684d821cf1a7ae16d1f89572") {
        return res.status(400).json({
          success: false,
          error: "Liga não suportada para Luva de Ouro",
        });
      }

      const estatisticas = await GoleirosService.obterEstatisticas(ligaId);

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

      // Validar liga
      if (ligaId !== "684d821cf1a7ae16d1f89572") {
        return res.status(400).json({
          success: false,
          error: "Liga não suportada para Luva de Ouro",
        });
      }

      const participantes = GoleirosService.PARTICIPANTES_SOBRAL;

      res.json({
        success: true,
        data: {
          ligaId,
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
}

export default LuvaDeOuroController;
