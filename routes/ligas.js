import express from "express";
import mongoose from "mongoose";
import {
  listarLigas,
  buscarLigaPorId,
  criarLiga,
  excluirLiga,
  atualizarTimesLiga,
  removerTimeDaLiga,
  atualizarFluxoFinanceiro,
  consultarFluxoFinanceiro,
  buscarTimesDaLiga,
  buscarRodadasDaLiga,
  buscarConfrontosPontosCorridos,
  buscarCartoleiroPorId,
  buscarModulosAtivos,
  atualizarModulosAtivos,
  sincronizarParticipantesLiga,
  sincronizarTodasLigas,
} from "../controllers/ligaController.js";

import { popularRodadas } from "../controllers/rodadaController.js";
import Liga from "../models/Liga.js";

const router = express.Router();

// ==============================
// FUNÇÃO AUXILIAR: Buscar IDs de participantes inativos
// ==============================
async function getParticipantesInativos(ligaId) {
  try {
    const { obterParticipantesInativos } = await import(
      "../controllers/participanteStatusController.js"
    );
    const inativos = await obterParticipantesInativos(ligaId);

    // Retornar Map com timeId -> dados (incluindo rodada_inativo)
    const mapa = new Map();
    inativos.forEach((p) => {
      mapa.set(String(p.timeId), {
        rodada_inativo: p.rodada_inativo || null,
        status: p.status,
      });
    });
    return mapa;
  } catch (error) {
    console.error("Erro ao buscar inativos:", error);
    return new Map();
  }
}

// ==============================
// ROTAS DE SINCRONIZAÇÃO (NOVAS)
// ==============================
router.post("/:id/sincronizar-participantes", sincronizarParticipantesLiga);
router.post("/sincronizar-todas", sincronizarTodasLigas);

// Rotas existentes
router.get("/", listarLigas);
router.get("/:id", buscarLigaPorId);
router.post("/", criarLiga);
router.delete("/:id", excluirLiga);
router.put("/:id/times", atualizarTimesLiga);
router.delete("/:id/times/:timeId", removerTimeDaLiga);
router.put("/:id/fluxo/:rodada", atualizarFluxoFinanceiro);
router.get("/:id/fluxo", consultarFluxoFinanceiro);
router.get("/:id/times", buscarTimesDaLiga);
router.get("/:id/rodadas", buscarRodadasDaLiga);

router.post("/:id/rodadas", (req, res) => {
  req.params.ligaId = req.params.id;
  delete req.params.id;
  popularRodadas(req, res);
});

// Rota para salvar senha de participante
router.put("/:ligaId/participante/:timeId/senha", async (req, res) => {
  try {
    const { ligaId, timeId } = req.params;
    const { senha } = req.body;

    if (!senha || senha.trim().length < 4) {
      return res.status(400).json({
        erro: "Senha deve ter no mínimo 4 caracteres",
      });
    }

    const liga = await Liga.findById(ligaId).select("+times +participantes");
    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    const timeIdNum = Number(timeId);

    if (!liga.times || !liga.times.includes(timeIdNum)) {
      return res.status(404).json({
        erro: "Time não encontrado nesta liga",
      });
    }

    if (!liga.participantes) {
      liga.participantes = [];
    }

    let participante = liga.participantes.find(
      (p) => Number(p.time_id) === timeIdNum,
    );

    const Time = (await import("../models/Time.js")).default;

    if (!participante) {
      const timeData = await Time.findOne({ time_id: timeIdNum });

      participante = {
        time_id: timeIdNum,
        nome_cartola: timeData?.nome_cartoleiro || "N/D",
        nome_time: timeData?.nome_time || "N/D",
        senha_acesso: senha.trim(),
        ativo: true,
      };
      liga.participantes.push(participante);
    } else {
      participante.senha_acesso = senha.trim();
    }

    await Time.findOneAndUpdate(
      { time_id: timeIdNum },
      { senha_acesso: senha.trim() },
      { new: true },
    );

    await liga.save();

    res.json({
      success: true,
      mensagem: "Senha atualizada com sucesso",
      participante: {
        time_id: participante.time_id,
        nome_cartola: participante.nome_cartola,
      },
    });
  } catch (error) {
    console.error("[LIGAS] Erro ao salvar senha:", error);
    res.status(500).json({ erro: "Erro ao salvar senha: " + error.message });
  }
});

// Rota: Buscar ranking da liga
// ✅ ATUALIZADO: Filtra participantes inativos
router.get("/:id/ranking", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    const Rodada = (await import("../models/Rodada.js")).default;

    // ✅ Buscar participantes inativos
    const inativos = await getParticipantesInativos(ligaId);

    const rodadas = await Rodada.find({ ligaId }).lean();

    if (!rodadas || rodadas.length === 0) {
      return res.json([]);
    }

    const rankingMap = {};

    rodadas.forEach((rodada) => {
      const timeId = rodada.timeId;

      // ✅ Ignorar participantes inativos
      if (inativos.has(String(timeId))) return;

      const pontos = parseFloat(rodada.pontos) || 0;

      if (!rankingMap[timeId]) {
        rankingMap[timeId] = {
          timeId,
          nome_time: rodada.nome_time || "N/D",
          nome_cartola: rodada.nome_cartola || "N/D",
          escudo: rodada.escudo || "",
          pontos_totais: 0,
          rodadas_jogadas: 0,
        };
      }

      rankingMap[timeId].pontos_totais += pontos;
      rankingMap[timeId].rodadas_jogadas++;
    });

    const ranking = Object.values(rankingMap)
      .sort((a, b) => b.pontos_totais - a.pontos_totais)
      .map((time, index) => ({
        ...time,
        posicao: index + 1,
        media:
          time.rodadas_jogadas > 0
            ? (time.pontos_totais / time.rodadas_jogadas).toFixed(2)
            : "0.00",
      }));

    res.json(ranking);
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar ranking:`, error);
    res.status(500).json({ erro: "Erro ao buscar ranking" });
  }
});

// Rota: Buscar rodadas de um time específico
router.get("/:id/rodadas/:timeId", async (req, res) => {
  const { id: ligaId, timeId } = req.params;

  try {
    const Rodada = (await import("../models/Rodada.js")).default;
    const rodadas = await Rodada.find({
      ligaId,
      timeId: parseInt(timeId),
    })
      .sort({ rodada: 1 })
      .lean();

    res.json(rodadas);
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar rodadas do time:`, error);
    res.status(500).json({ erro: "Erro ao buscar rodadas do time" });
  }
});

// =====================================================================
// Rota: Buscar Melhor Mês de TODOS os participantes (ranking mensal)
// ✅ v4.0 COM CACHE MONGODB - Edições consolidadas são imutáveis
// IMPORTANTE: Esta rota DEVE vir ANTES de "/:id/melhor-mes/:timeId"
// =====================================================================
router.get("/:id/melhor-mes", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    // Importar service
    const melhorMesService = (await import("../services/melhorMesService.js"))
      .default;

    // Buscar rodada atual do sistema (última rodada processada)
    const Rodada = (await import("../models/Rodada.js")).default;
    const ultimaRodada = await Rodada.findOne({ ligaId })
      .sort({ rodada: -1 })
      .select("rodada")
      .lean();

    const rodadaAtual = ultimaRodada?.rodada || 0;

    // Buscar dados usando service (com cache)
    const dados = await melhorMesService.buscarMelhorMes(ligaId, rodadaAtual);

    res.json({
      ...dados,
      ligaId: ligaId,
    });
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar Melhor Mês:`, error);
    res.status(500).json({ erro: "Erro ao buscar Melhor Mês" });
  }
});

// Rota: Buscar Melhor Mês de um participante específico
router.get("/:id/melhor-mes/:timeId", async (req, res) => {
  const { id: ligaId, timeId } = req.params;

  try {
    // Importar service
    const melhorMesService = (await import("../services/melhorMesService.js"))
      .default;

    // Buscar rodada atual
    const Rodada = (await import("../models/Rodada.js")).default;
    const ultimaRodada = await Rodada.findOne({ ligaId })
      .sort({ rodada: -1 })
      .select("rodada")
      .lean();

    const rodadaAtual = ultimaRodada?.rodada || 0;

    // Buscar dados do participante usando service
    const dados = await melhorMesService.buscarParticipanteMelhorMes(
      ligaId,
      timeId,
      rodadaAtual,
    );

    res.json(dados);
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar Melhor Mês do participante:`, error);
    res.status(500).json({ erro: "Erro ao buscar Melhor Mês" });
  }
});

// Rota: Buscar Pontos Corridos (Classificação)
router.get("/:id/pontos-corridos", buscarConfrontosPontosCorridos);

// Rota: Buscar ranking de uma rodada específica
// ✅ ATUALIZADO: Filtra participantes inativos
router.get("/:id/ranking/:rodada", async (req, res) => {
  const { id: ligaId, rodada } = req.params;

  try {
    const Rodada = (await import("../models/Rodada.js")).default;

    const rodadaNum = parseInt(rodada);
    if (isNaN(rodadaNum)) {
      return res.status(400).json({ erro: "Rodada inválida" });
    }

    // ✅ Buscar participantes inativos
    const inativos = await getParticipantesInativos(ligaId);

    const dados = await Rodada.find({
      ligaId,
      rodada: rodadaNum,
    }).lean();

    if (!dados || dados.length === 0) {
      return res.status(404).json({
        erro: `Dados da rodada ${rodada} não encontrados`,
        rodada: rodadaNum,
      });
    }

    // ✅ Filtrar inativos e ordenar
    const ranking = dados
      .filter((item) => {
        const inativoData = inativos.get(String(item.timeId));
        // Se não está inativo, ou se ficou inativo DEPOIS desta rodada, incluir
        return (
          !inativoData ||
          (inativoData.rodada_inativo &&
            item.rodada < inativoData.rodada_inativo)
        );
      })
      .sort((a, b) => (b.pontos || 0) - (a.pontos || 0));

    res.json(ranking);
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar ranking da rodada ${rodada}:`, error);
    res.status(500).json({ erro: "Erro ao buscar ranking da rodada" });
  }
});

// Rota: Buscar Mata-Mata para participante
router.get("/:id/mata-mata", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    let rodada_atual = 1;
    try {
      const resMercado = await fetch("/api/cartola/mercado/status");
      if (resMercado.ok) {
        rodada_atual = (await resMercado.json()).rodada_atual;
      }
    } catch (err) {
      // Silencioso
    }

    const edicoes = [
      {
        id: 1,
        nome: "1ª Edição",
        rodadaInicial: 2,
        rodadaFinal: 7,
        rodadaDefinicao: 2,
      },
      {
        id: 2,
        nome: "2ª Edição",
        rodadaInicial: 9,
        rodadaFinal: 14,
        rodadaDefinicao: 9,
      },
      {
        id: 3,
        nome: "3ª Edição",
        rodadaInicial: 15,
        rodadaFinal: 21,
        rodadaDefinicao: 15,
      },
      {
        id: 4,
        nome: "4ª Edição",
        rodadaInicial: 22,
        rodadaFinal: 26,
        rodadaDefinicao: 21,
      },
      {
        id: 5,
        nome: "5ª Edição",
        rodadaInicial: 31,
        rodadaFinal: 35,
        rodadaDefinicao: 30,
      },
    ];

    const edicoesAtivas = edicoes.filter(
      (e) => rodada_atual >= e.rodadaDefinicao,
    );

    if (edicoesAtivas.length === 0) {
      return res.json({
        edicoes: [],
        rodada_atual,
        mensagem: "Nenhuma edição iniciada ainda",
      });
    }

    const resultado = {
      edicoes: edicoesAtivas.map((e) => ({
        id: e.id,
        nome: e.nome,
        rodadaInicial: e.rodadaInicial,
        rodadaFinal: e.rodadaFinal,
        rodadaDefinicao: e.rodadaDefinicao,
        ativo: true,
      })),
      rodada_atual,
    };

    res.json(resultado);
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar Mata-Mata:`, error);
    res.status(500).json({ erro: "Erro ao buscar dados do Mata-Mata" });
  }
});

// Rota: Buscar TOP 10 da liga
// ✅ ATUALIZADO: Filtra participantes inativos
router.get("/:id/top10", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    const Rodada = (await import("../models/Rodada.js")).default;

    // ✅ Buscar participantes inativos
    const inativos = await getParticipantesInativos(ligaId);

    const rodadas = await Rodada.find({ ligaId }).lean();

    if (!rodadas || rodadas.length === 0) {
      return res.json([]);
    }

    const rodadasAgrupadas = {};

    rodadas.forEach((r) => {
      // ✅ Ignorar participantes inativos
      if (inativos.has(String(r.timeId))) return;

      if (!rodadasAgrupadas[r.rodada]) {
        rodadasAgrupadas[r.rodada] = [];
      }
      rodadasAgrupadas[r.rodada].push(r);
    });

    const top10PorRodada = {};

    Object.keys(rodadasAgrupadas).forEach((numRodada) => {
      const timesRodada = rodadasAgrupadas[numRodada];

      const top10 = timesRodada
        .sort(
          (a, b) => (parseFloat(b.pontos) || 0) - (parseFloat(a.pontos) || 0),
        )
        .slice(0, 10)
        .map((time, index) => ({
          posicao: index + 1,
          timeId: time.timeId,
          nome_time: time.nome_time || "N/D",
          nome_cartola: time.nome_cartola || "N/D",
          escudo: time.escudo || "",
          pontos: parseFloat(time.pontos) || 0,
        }));

      top10PorRodada[numRodada] = top10;
    });

    res.json(top10PorRodada);
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar TOP 10:`, error);
    res.status(500).json({ erro: "Erro ao buscar TOP 10" });
  }
});

// Rota de análise de performance
router.get("/:id/performance", async (req, res) => {
  res.status(501).json({ erro: "Em desenvolvimento" });
});

// Rotas de rodadas
router.get("/:id/rodadas", buscarRodadasDaLiga);
router.get("/:id/rodadas/:rodadaNum", buscarRodadasDaLiga);

// Rota de módulos ativos
router.get("/:id/modulos-ativos", buscarModulosAtivos);
router.put("/:id/modulos-ativos", atualizarModulosAtivos);

// =====================================================================
// ROTAS DE MANUTENÇÃO - MELHOR DO MÊS (ADMIN)
// =====================================================================

// Forçar reconsolidação do cache
router.post("/:id/melhor-mes/reconsolidar", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    const melhorMesService = (await import("../services/melhorMesService.js"))
      .default;
    const Rodada = (await import("../models/Rodada.js")).default;

    // Buscar rodada atual
    const ultimaRodada = await Rodada.findOne({ ligaId })
      .sort({ rodada: -1 })
      .select("rodada")
      .lean();

    const rodadaAtual = ultimaRodada?.rodada || 0;

    // Forçar reconsolidação
    const dados = await melhorMesService.forcarReconsolidacao(
      ligaId,
      rodadaAtual,
    );

    res.json({
      sucesso: true,
      mensagem: "Cache reconsolidado com sucesso",
      edicoes: dados.edicoes?.length || 0,
      rodada_sistema: rodadaAtual,
      temporada_encerrada: dados.temporada_encerrada,
    });
  } catch (error) {
    console.error(`[LIGAS] Erro ao reconsolidar Melhor Mês:`, error);
    res.status(500).json({ erro: "Erro ao reconsolidar cache" });
  }
});

// Invalidar cache (remove completamente)
router.delete("/:id/melhor-mes/cache", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    const melhorMesService = (await import("../services/melhorMesService.js"))
      .default;

    const resultado = await melhorMesService.invalidarCache(ligaId);

    res.json({
      sucesso: true,
      mensagem: "Cache removido",
      deletados: resultado.deletedCount,
    });
  } catch (error) {
    console.error(`[LIGAS] Erro ao invalidar cache:`, error);
    res.status(500).json({ erro: "Erro ao invalidar cache" });
  }
});

// Status do cache
router.get("/:id/melhor-mes/status", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    const MelhorMesCache = (await import("../models/MelhorMesCache.js"))
      .default;
    const mongoose = (await import("mongoose")).default;

    const ligaObjectId = new mongoose.Types.ObjectId(ligaId);
    const cache = await MelhorMesCache.findOne({ ligaId: ligaObjectId }).lean();

    if (!cache) {
      return res.json({
        existe: false,
        mensagem: "Cache não existe para esta liga",
      });
    }

    // Resumo das edições
    const resumo = cache.edicoes.map((e) => ({
      id: e.id,
      nome: e.nome,
      status: e.status,
      participantes: e.total_participantes,
      campeao: e.campeao?.nome_time || null,
    }));

    res.json({
      existe: true,
      rodada_sistema: cache.rodada_sistema,
      temporada_encerrada: cache.temporada_encerrada,
      total_edicoes: cache.edicoes.length,
      edicoes: resumo,
      atualizado_em: cache.atualizado_em,
    });
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar status do cache:`, error);
    res.status(500).json({ erro: "Erro ao buscar status" });
  }
});

export default router;
