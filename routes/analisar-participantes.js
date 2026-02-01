// routes/analisar-participantes.js
// Rotas do módulo "Analisar Participantes" - Painel Admin Unificado
// Consolida gestão de participantes: listagem, senhas, status, diagnóstico
import express from "express";
import mongoose from "mongoose";

const router = express.Router();

/**
 * GET /api/analisar-participantes/resumo
 * Dashboard: totais por liga, status de senhas, ativos/inativos
 */
router.get("/resumo", async (req, res) => {
  try {
    const { temporada } = req.query;
    const anoAtual = temporada ? Number(temporada) : new Date().getFullYear();

    const Liga = mongoose.models.Liga || (await import("../models/Liga.js")).default;
    const Time = mongoose.models.Time || (await import("../models/Time.js")).default;

    // Buscar ligas da temporada
    const ligas = await Liga.find({
      $or: [{ temporada: anoAtual }, { temporada: { $exists: false } }],
    })
      .select("_id nome times participantes temporada")
      .lean();

    let totalParticipantes = 0;
    let comSenha = 0;
    let semSenha = 0;
    let ativos = 0;
    let inativos = 0;
    const porLiga = [];

    for (const liga of ligas) {
      const participantes = liga.participantes || [];
      const timeIds = liga.times || [];

      // Buscar dados completos dos times desta liga
      const timesData = await Time.find({ id: { $in: timeIds } })
        .select("id ativo rodada_desistencia senha_acesso")
        .lean();

      const timesMap = new Map(timesData.map((t) => [t.id, t]));

      let ligaComSenha = 0;
      let ligaSemSenha = 0;
      let ligaAtivos = 0;
      let ligaInativos = 0;

      for (const p of participantes) {
        const timeId = p.time_id;
        const timeDb = timesMap.get(timeId);

        // Senha pode estar no participante da liga OU no time
        const temSenha = !!(p.senha_acesso || timeDb?.senha_acesso);
        if (temSenha) ligaComSenha++;
        else ligaSemSenha++;

        // Status ativo
        const estaAtivo = timeDb ? timeDb.ativo !== false : true;
        if (estaAtivo) ligaAtivos++;
        else ligaInativos++;
      }

      totalParticipantes += participantes.length;
      comSenha += ligaComSenha;
      semSenha += ligaSemSenha;
      ativos += ligaAtivos;
      inativos += ligaInativos;

      porLiga.push({
        ligaId: liga._id.toString(),
        nome: liga.nome,
        total: participantes.length,
        comSenha: ligaComSenha,
        semSenha: ligaSemSenha,
        ativos: ligaAtivos,
        inativos: ligaInativos,
      });
    }

    // Dados incompletos (via times-admin logic)
    const incompletos = await Time.countDocuments({
      $or: [
        { nome_cartoleiro: { $in: ["N/D", "N/A", "", null] } },
        { nome_cartoleiro: { $exists: false } },
        { nome_time: { $regex: /^Time \d+$/ } },
        { nome_time: { $in: ["N/D", ""] } },
      ],
    });

    res.json({
      success: true,
      temporada: anoAtual,
      totais: {
        participantes: totalParticipantes,
        comSenha,
        semSenha,
        ativos,
        inativos,
        dadosIncompletos: incompletos,
      },
      porLiga,
    });
  } catch (error) {
    console.error("[ANALISAR-PARTICIPANTES] Erro no resumo:", error);
    res.status(500).json({ success: false, erro: error.message });
  }
});

/**
 * GET /api/analisar-participantes/lista
 * Lista unificada de participantes com filtros
 * Query params: ligaId, status (ativo|inativo|todos), senha (com|sem|todos), busca
 */
router.get("/lista", async (req, res) => {
  try {
    const { ligaId, status, senha, busca, temporada } = req.query;
    const anoAtual = temporada ? Number(temporada) : new Date().getFullYear();

    const Liga = mongoose.models.Liga || (await import("../models/Liga.js")).default;
    const Time = mongoose.models.Time || (await import("../models/Time.js")).default;

    // Buscar ligas
    let query = {
      $or: [{ temporada: anoAtual }, { temporada: { $exists: false } }],
    };
    if (ligaId) {
      query = { _id: new mongoose.Types.ObjectId(ligaId) };
    }

    const ligas = await Liga.find(query)
      .select("_id nome times participantes")
      .lean();

    // Coletar todos os time_ids
    const todosTimeIds = [];
    const participantesPorLiga = new Map();

    for (const liga of ligas) {
      const participantes = liga.participantes || [];
      for (const p of participantes) {
        todosTimeIds.push(p.time_id);
        if (!participantesPorLiga.has(p.time_id)) {
          participantesPorLiga.set(p.time_id, {
            ligaId: liga._id.toString(),
            ligaNome: liga.nome,
            participanteData: p,
          });
        }
      }
    }

    // Buscar dados dos times no banco
    const timesData = await Time.find({ id: { $in: todosTimeIds } })
      .select("id nome_time nome_cartoleiro nome_cartola url_escudo_png clube_id ativo rodada_desistencia data_desistencia senha_acesso assinante")
      .lean();

    const timesMap = new Map(timesData.map((t) => [t.id, t]));

    // Montar lista unificada
    let lista = [];

    for (const [timeId, info] of participantesPorLiga.entries()) {
      const timeDb = timesMap.get(timeId);
      const p = info.participanteData;

      const nomeCartola = timeDb?.nome_cartola || timeDb?.nome_cartoleiro || p.nome_cartola || p.nome_cartoleiro || "N/D";
      const nomeTime = timeDb?.nome_time || p.nome_time || "N/D";
      const temSenha = !!(p.senha_acesso || timeDb?.senha_acesso);
      const estaAtivo = timeDb ? timeDb.ativo !== false : true;

      lista.push({
        timeId,
        nomeCartola,
        nomeTime,
        escudo: timeDb?.url_escudo_png || "",
        clubeId: timeDb?.clube_id || p.clube_id || null,
        ligaId: info.ligaId,
        ligaNome: info.ligaNome,
        ativo: estaAtivo,
        rodadaDesistencia: timeDb?.rodada_desistencia || null,
        temSenha,
        assinante: timeDb?.assinante || false,
        dadosCompletos: !!(nomeCartola && nomeCartola !== "N/D" && nomeTime && nomeTime !== "N/D"),
      });
    }

    // Aplicar filtros
    if (status === "ativo") lista = lista.filter((p) => p.ativo);
    if (status === "inativo") lista = lista.filter((p) => !p.ativo);
    if (senha === "com") lista = lista.filter((p) => p.temSenha);
    if (senha === "sem") lista = lista.filter((p) => !p.temSenha);

    if (busca) {
      const termo = busca.toLowerCase();
      lista = lista.filter(
        (p) =>
          p.nomeCartola.toLowerCase().includes(termo) ||
          p.nomeTime.toLowerCase().includes(termo) ||
          String(p.timeId).includes(termo)
      );
    }

    // Ordenar por nome
    lista.sort((a, b) => a.nomeCartola.localeCompare(b.nomeCartola));

    res.json({
      success: true,
      total: lista.length,
      participantes: lista,
    });
  } catch (error) {
    console.error("[ANALISAR-PARTICIPANTES] Erro na lista:", error);
    res.status(500).json({ success: false, erro: error.message });
  }
});

/**
 * PUT /api/analisar-participantes/senha/:timeId
 * Definir/alterar senha de um participante
 */
router.put("/senha/:timeId", async (req, res) => {
  try {
    const { timeId } = req.params;
    const { senha, ligaId } = req.body;

    if (!senha || senha.length < 3) {
      return res.status(400).json({ success: false, erro: "Senha deve ter pelo menos 3 caracteres" });
    }

    const Liga = mongoose.models.Liga || (await import("../models/Liga.js")).default;

    // Atualizar senha no participante da liga
    let query = { "participantes.time_id": parseInt(timeId) };
    if (ligaId) {
      query._id = new mongoose.Types.ObjectId(ligaId);
    }

    const resultado = await Liga.updateOne(
      query,
      { $set: { "participantes.$.senha_acesso": senha } }
    );

    if (resultado.modifiedCount === 0) {
      return res.status(404).json({ success: false, erro: "Participante nao encontrado" });
    }

    // Também atualizar no Time se existir
    const Time = mongoose.models.Time || (await import("../models/Time.js")).default;
    await Time.updateOne(
      { id: parseInt(timeId) },
      { $set: { senha_acesso: senha } }
    );

    console.log(`[ANALISAR-PARTICIPANTES] Senha atualizada para time ${timeId}`);

    res.json({ success: true, message: "Senha atualizada" });
  } catch (error) {
    console.error("[ANALISAR-PARTICIPANTES] Erro ao atualizar senha:", error);
    res.status(500).json({ success: false, erro: error.message });
  }
});

/**
 * PUT /api/analisar-participantes/senha-lote
 * Definir senhas em lote
 */
router.put("/senha-lote", async (req, res) => {
  try {
    const { participantes } = req.body;
    // participantes: [{ timeId, senha, ligaId }]

    if (!Array.isArray(participantes) || participantes.length === 0) {
      return res.status(400).json({ success: false, erro: "Lista de participantes vazia" });
    }

    const Liga = mongoose.models.Liga || (await import("../models/Liga.js")).default;
    const Time = mongoose.models.Time || (await import("../models/Time.js")).default;

    let atualizados = 0;
    let erros = 0;

    for (const p of participantes) {
      try {
        if (!p.senha || p.senha.length < 3) {
          erros++;
          continue;
        }

        let query = { "participantes.time_id": parseInt(p.timeId) };
        if (p.ligaId) {
          query._id = new mongoose.Types.ObjectId(p.ligaId);
        }

        const result = await Liga.updateOne(
          query,
          { $set: { "participantes.$.senha_acesso": p.senha } }
        );

        await Time.updateOne(
          { id: parseInt(p.timeId) },
          { $set: { senha_acesso: p.senha } }
        );

        if (result.modifiedCount > 0) atualizados++;
      } catch (e) {
        erros++;
      }
    }

    console.log(`[ANALISAR-PARTICIPANTES] Senhas em lote: ${atualizados} ok, ${erros} erros`);

    res.json({
      success: true,
      atualizados,
      erros,
      total: participantes.length,
    });
  } catch (error) {
    console.error("[ANALISAR-PARTICIPANTES] Erro no lote de senhas:", error);
    res.status(500).json({ success: false, erro: error.message });
  }
});

/**
 * PUT /api/analisar-participantes/toggle-status/:timeId
 * Ativar/desativar participante
 */
router.put("/toggle-status/:timeId", async (req, res) => {
  try {
    const { timeId } = req.params;
    const { ativo, rodadaDesistencia } = req.body;

    const Time = mongoose.models.Time || (await import("../models/Time.js")).default;

    const updateFields = { ativo: !!ativo };
    if (!ativo && rodadaDesistencia) {
      updateFields.rodada_desistencia = Number(rodadaDesistencia);
      updateFields.data_desistencia = new Date();
    }
    if (ativo) {
      updateFields.rodada_desistencia = null;
      updateFields.data_desistencia = null;
    }

    const resultado = await Time.updateOne(
      { id: parseInt(timeId) },
      { $set: updateFields }
    );

    if (resultado.matchedCount === 0) {
      return res.status(404).json({ success: false, erro: "Time nao encontrado" });
    }

    console.log(`[ANALISAR-PARTICIPANTES] Status time ${timeId}: ativo=${ativo}`);

    res.json({ success: true, ativo: !!ativo });
  } catch (error) {
    console.error("[ANALISAR-PARTICIPANTES] Erro ao alterar status:", error);
    res.status(500).json({ success: false, erro: error.message });
  }
});

/**
 * GET /api/analisar-participantes/dumps-stats
 * Estatísticas do Data Lake (CartolaOficialDump)
 */
router.get("/dumps-stats", async (req, res) => {
  try {
    const { temporada } = req.query;
    const anoAtual = temporada ? Number(temporada) : new Date().getFullYear();

    const CartolaOficialDump = mongoose.models.CartolaOficialDump ||
      (await import("../models/CartolaOficialDump.js")).default;

    const stats = await CartolaOficialDump.estatisticas(anoAtual);

    res.json({ success: true, ...stats });
  } catch (error) {
    console.error("[ANALISAR-PARTICIPANTES] Erro nas stats de dumps:", error);
    res.status(500).json({ success: false, erro: error.message });
  }
});

export default router;
