
// controllers/rankingGeralCacheController.js
import RankingGeralCache from "../models/RankingGeralCache.js";
import Rodada from "../models/Rodada.js";
import mongoose from "mongoose";

/**
 * Buscar ranking consolidado (com fallback para cálculo se necessário)
 */
export async function buscarRankingConsolidado(req, res) {
  const { ligaId } = req.params;
  const { force = false } = req.query;

  try {
    if (!mongoose.Types.ObjectId.isValid(ligaId)) {
      return res.status(400).json({ error: "ID de liga inválido" });
    }

    // Determinar rodada final (última rodada com dados)
    const ultimaRodadaComDados = await Rodada.findOne({ 
      ligaId: new mongoose.Types.ObjectId(ligaId) 
    })
      .sort({ rodada: -1 })
      .select("rodada")
      .lean();

    if (!ultimaRodadaComDados) {
      return res.status(404).json({ 
        error: "Nenhuma rodada encontrada para esta liga" 
      });
    }

    const rodadaFinal = ultimaRodadaComDados.rodada;

    // Tentar buscar do cache (se não forçar recalculo)
    if (!force) {
      const cacheExistente = await RankingGeralCache.findOne({
        ligaId: new mongoose.Types.ObjectId(ligaId),
        rodadaFinal
      }).lean();

      if (cacheExistente) {
        console.log(`[RANKING-CACHE] ✅ Cache encontrado para liga ${ligaId} rodada ${rodadaFinal}`);
        return res.status(200).json({
          cached: true,
          rodadaFinal,
          ranking: cacheExistente.ranking,
          atualizadoEm: cacheExistente.atualizadoEm
        });
      }
    }

    // Cache miss ou forçado - calcular e armazenar
    console.log(`[RANKING-CACHE] 🔄 Calculando ranking consolidado para liga ${ligaId}...`);
    const rankingCalculado = await calcularRankingConsolidado(ligaId, rodadaFinal);

    // Salvar no cache
    await RankingGeralCache.findOneAndUpdate(
      { 
        ligaId: new mongoose.Types.ObjectId(ligaId), 
        rodadaFinal 
      },
      {
        ligaId: new mongoose.Types.ObjectId(ligaId),
        rodadaFinal,
        ranking: rankingCalculado,
        atualizadoEm: new Date()
      },
      { upsert: true, new: true }
    );

    console.log(`[RANKING-CACHE] ✅ Ranking calculado e armazenado (${rankingCalculado.length} participantes)`);

    return res.status(200).json({
      cached: false,
      rodadaFinal,
      ranking: rankingCalculado,
      atualizadoEm: new Date()
    });

  } catch (error) {
    console.error("[RANKING-CACHE] Erro ao buscar ranking consolidado:", error);
    return res.status(500).json({ 
      error: "Erro ao processar ranking consolidado",
      details: error.message 
    });
  }
}

/**
 * Calcular ranking usando agregação MongoDB (RÁPIDO)
 */
async function calcularRankingConsolidado(ligaId, rodadaFinal) {
  const ligaObjectId = new mongoose.Types.ObjectId(ligaId);

  const pipeline = [
    // Filtrar apenas rodadas da liga e até a rodada final
    {
      $match: {
        ligaId: ligaObjectId,
        rodada: { $lte: rodadaFinal }
      }
    },
    // Agrupar por time e somar pontos
    {
      $group: {
        _id: "$timeId",
        nome_cartola: { $last: "$nome_cartola" },
        nome_time: { $last: "$nome_time" },
        escudo: { $last: "$escudo" },
        clube_id: { $last: "$clube_id" },
        pontos_totais: { $sum: "$pontos" },
        rodadas_jogadas: { $sum: 1 }
      }
    },
    // Ordenar por pontos (decrescente)
    {
      $sort: { pontos_totais: -1 }
    },
    // Adicionar campo de posição
    {
      $group: {
        _id: null,
        participantes: { $push: "$$ROOT" }
      }
    },
    {
      $unwind: { 
        path: "$participantes", 
        includeArrayIndex: "posicao" 
      }
    },
    // Formatar output final
    {
      $project: {
        _id: 0,
        timeId: "$participantes._id",
        nome_cartola: "$participantes.nome_cartola",
        nome_time: "$participantes.nome_time",
        escudo: "$participantes.escudo",
        clube_id: "$participantes.clube_id",
        pontos_totais: "$participantes.pontos_totais",
        rodadas_jogadas: "$participantes.rodadas_jogadas",
        posicao: { $add: ["$posicao", 1] }
      }
    }
  ];

  const resultado = await Rodada.aggregate(pipeline);
  return resultado;
}

/**
 * Invalidar cache de uma liga (quando novas rodadas forem adicionadas)
 */
export async function invalidarCacheRanking(req, res) {
  const { ligaId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(ligaId)) {
      return res.status(400).json({ error: "ID de liga inválido" });
    }

    const resultado = await RankingGeralCache.deleteMany({
      ligaId: new mongoose.Types.ObjectId(ligaId)
    });

    console.log(`[RANKING-CACHE] 🗑️ Cache invalidado: ${resultado.deletedCount} registros removidos`);

    return res.status(200).json({
      message: "Cache de ranking invalidado com sucesso",
      registrosRemovidos: resultado.deletedCount
    });

  } catch (error) {
    console.error("[RANKING-CACHE] Erro ao invalidar cache:", error);
    return res.status(500).json({ error: "Erro ao invalidar cache" });
  }
}
