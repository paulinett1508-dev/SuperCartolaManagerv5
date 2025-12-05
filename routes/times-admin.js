// routes/times-admin.js
// Rotas administrativas para gerenciamento de times
import express from "express";
import mongoose from "mongoose";
import fetch from "node-fetch";

const router = express.Router();

// Função para obter o Model Time
function getTimeModel() {
  if (mongoose.models.Time) {
    return mongoose.models.Time;
  }

  const TimeSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true, index: true },
    nome_time: { type: String, required: true },
    nome_cartoleiro: { type: String, required: true },
    url_escudo_png: { type: String },
    clube_id: { type: Number },
    ativo: { type: Boolean, default: true },
    rodada_desistencia: { type: Number, default: null },
    data_desistencia: { type: Date, default: null },
    senha_acesso: { type: String, default: "" },
  });

  return mongoose.model("Time", TimeSchema);
}

// Delay helper
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET /api/times-admin/diagnostico
 * Diagnóstico detalhado dos times
 */
router.get("/diagnostico", async (req, res) => {
  try {
    const Time = getTimeModel();

    // Buscar amostra de times
    const times = await Time.find({}).limit(5).lean();

    // Verificar cada condição
    const diagnostico = times.map((t) => ({
      id: t.id,
      nome_cartoleiro: t.nome_cartoleiro,
      nome_time: t.nome_time,
      checks: {
        cartoleiro_vazio: !t.nome_cartoleiro,
        cartoleiro_nd: t.nome_cartoleiro === "N/D",
        cartoleiro_na: t.nome_cartoleiro === "N/A",
        time_vazio: !t.nome_time,
        time_nd: t.nome_time === "N/D",
        time_starts_with_Time: t.nome_time?.startsWith("Time "),
      },
    }));

    // Contar por tipo
    const total = await Time.countDocuments();
    const comCartolaVazio = await Time.countDocuments({ nome_cartoleiro: "" });
    const comCartolaND = await Time.countDocuments({ nome_cartoleiro: "N/D" });
    const comCartolaNA = await Time.countDocuments({ nome_cartoleiro: "N/A" });
    const comCartolaNull = await Time.countDocuments({ nome_cartoleiro: null });
    const comTimeStartsTime = await Time.countDocuments({
      nome_time: { $regex: /^Time / },
    });

    res.json({
      success: true,
      resumo: {
        total,
        comCartolaVazio,
        comCartolaND,
        comCartolaNA,
        comCartolaNull,
        comTimeStartsTime,
      },
      amostra: diagnostico,
    });
  } catch (error) {
    console.error("[TIMES-ADMIN] Erro no diagnóstico:", error);
    res.status(500).json({ success: false, erro: error.message });
  }
});

/**
 * GET /api/times-admin/incompletos
 * Lista times com dados incompletos (N/D)
 */
router.get("/incompletos", async (req, res) => {
  try {
    const Time = getTimeModel();

    const timesIncompletos = await Time.find({
      $or: [
        { nome_cartoleiro: "N/D" },
        { nome_cartoleiro: "N/A" },
        { nome_cartoleiro: "" },
        { nome_cartoleiro: { $exists: false } },
        { nome_cartoleiro: null },
        { nome_time: { $regex: /^Time \d+$/ } },
        { nome_time: "N/D" },
        { nome_time: "" },
      ],
    })
      .select("id nome_time nome_cartoleiro")
      .lean();

    console.log(
      `[TIMES-ADMIN] ${timesIncompletos.length} times com dados incompletos`,
    );

    res.json({
      success: true,
      total: timesIncompletos.length,
      times: timesIncompletos,
    });
  } catch (error) {
    console.error("[TIMES-ADMIN] Erro ao listar times incompletos:", error);
    res.status(500).json({ success: false, erro: error.message });
  }
});

/**
 * POST /api/times-admin/corrigir-vazios
 * Corrige times com strings vazias buscando da API Cartola
 */
router.post("/corrigir-vazios", async (req, res) => {
  try {
    const Time = getTimeModel();
    const { limite = 10, delayMs = 1000 } = req.body;

    // Buscar times com strings vazias
    const timesVazios = await Time.find({
      $or: [
        { nome_cartoleiro: "" },
        { nome_cartoleiro: null },
        { nome_time: "" },
        { nome_time: null },
      ],
    })
      .limit(limite)
      .lean();

    if (timesVazios.length === 0) {
      return res.json({
        success: true,
        message: "Nenhum time com dados vazios encontrado",
        atualizados: 0,
      });
    }

    console.log(
      `[TIMES-ADMIN] Corrigindo ${timesVazios.length} times com dados vazios...`,
    );

    // Buscar rodada atual
    let rodadaAtual = 38;
    try {
      const statusRes = await fetch(
        "https://api.cartola.globo.com/mercado/status",
        {
          timeout: 10000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        },
      );
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        rodadaAtual = statusData.rodada_atual || 38;
      }
    } catch (e) {
      console.warn("[TIMES-ADMIN] Usando rodada 38 como fallback");
    }

    const resultados = { atualizados: 0, erros: 0, detalhes: [] };

    for (const time of timesVazios) {
      try {
        console.log(`[TIMES-ADMIN] Corrigindo time ${time.id}...`);

        const timeRes = await fetch(
          `https://api.cartola.globo.com/time/id/${time.id}/${rodadaAtual}`,
          {
            timeout: 10000,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          },
        );

        if (!timeRes.ok) {
          resultados.erros++;
          resultados.detalhes.push({
            id: time.id,
            status: "api_erro",
            code: timeRes.status,
          });
          await delay(delayMs);
          continue;
        }

        const data = await timeRes.json();

        if (data.time && data.time.nome_cartola) {
          await Time.updateOne(
            { id: time.id },
            {
              $set: {
                nome_time: data.time.nome || `Time ${time.id}`,
                nome_cartoleiro: data.time.nome_cartola,
                url_escudo_png: data.time.url_escudo_png || "",
                clube_id: data.time.clube_id || null,
              },
            },
          );

          console.log(
            `[TIMES-ADMIN] ✅ Time ${time.id} corrigido: ${data.time.nome_cartola}`,
          );
          resultados.atualizados++;
          resultados.detalhes.push({
            id: time.id,
            status: "corrigido",
            nome: data.time.nome_cartola,
          });
        } else {
          resultados.erros++;
          resultados.detalhes.push({ id: time.id, status: "dados_invalidos" });
        }

        await delay(delayMs);
      } catch (error) {
        console.error(
          `[TIMES-ADMIN] Erro ao corrigir time ${time.id}:`,
          error.message,
        );
        resultados.erros++;
        resultados.detalhes.push({
          id: time.id,
          status: "erro",
          message: error.message,
        });
        await delay(delayMs);
      }
    }

    res.json({
      success: true,
      message: `Correção concluída`,
      totalProcessados: timesVazios.length,
      ...resultados,
    });
  } catch (error) {
    console.error("[TIMES-ADMIN] Erro na correção:", error);
    res.status(500).json({ success: false, erro: error.message });
  }
});

/**
 * POST /api/times-admin/repopular
 * Repopula times com dados incompletos (com rate limiting)
 */
router.post("/repopular", async (req, res) => {
  try {
    const Time = getTimeModel();
    const { limite = 10, delayMs = 500 } = req.body;

    // Buscar times com dados incompletos
    const timesIncompletos = await Time.find({
      $or: [
        { nome_cartoleiro: "N/D" },
        { nome_cartoleiro: "N/A" },
        { nome_cartoleiro: "" },
        { nome_cartoleiro: { $exists: false } },
        { nome_cartoleiro: null },
        { nome_time: { $regex: /^Time \d+$/ } },
        { nome_time: "N/D" },
        { nome_time: "" },
      ],
    })
      .limit(limite)
      .lean();

    if (timesIncompletos.length === 0) {
      return res.json({
        success: true,
        message: "Nenhum time com dados incompletos encontrado",
        atualizados: 0,
      });
    }

    console.log(
      `[TIMES-ADMIN] Iniciando repopulação de ${timesIncompletos.length} times...`,
    );

    // Buscar rodada atual uma vez
    let rodadaAtual = 38;
    try {
      const statusRes = await fetch(
        "https://api.cartola.globo.com/mercado/status",
        {
          timeout: 10000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        },
      );
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        rodadaAtual = statusData.rodada_atual || 38;
      }
    } catch (e) {
      console.warn("[TIMES-ADMIN] Erro ao buscar rodada atual, usando 38");
    }

    const resultados = {
      atualizados: 0,
      erros: 0,
      detalhes: [],
    };

    // Processar times sequencialmente com delay
    for (const time of timesIncompletos) {
      try {
        console.log(`[TIMES-ADMIN] Buscando time ${time.id}...`);

        const timeRes = await fetch(
          `https://api.cartola.globo.com/time/id/${time.id}/${rodadaAtual}`,
          {
            timeout: 10000,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          },
        );

        if (!timeRes.ok) {
          console.warn(
            `[TIMES-ADMIN] Time ${time.id} não encontrado na API (${timeRes.status})`,
          );
          resultados.erros++;
          resultados.detalhes.push({
            id: time.id,
            status: "api_erro",
            code: timeRes.status,
          });
          await delay(delayMs);
          continue;
        }

        const data = await timeRes.json();

        if (data.time && data.time.nome_cartola) {
          await Time.updateOne(
            { id: time.id },
            {
              $set: {
                nome_time: data.time.nome || time.nome_time,
                nome_cartoleiro: data.time.nome_cartola,
                url_escudo_png: data.time.url_escudo_png || "",
                clube_id: data.time.clube_id || null,
              },
            },
          );

          console.log(
            `[TIMES-ADMIN] ✅ Time ${time.id} atualizado: ${data.time.nome_cartola}`,
          );
          resultados.atualizados++;
          resultados.detalhes.push({
            id: time.id,
            status: "atualizado",
            nome: data.time.nome_cartola,
          });
        } else {
          console.warn(
            `[TIMES-ADMIN] Time ${time.id} sem dados válidos na resposta`,
          );
          resultados.erros++;
          resultados.detalhes.push({ id: time.id, status: "dados_invalidos" });
        }

        // Delay entre requisições
        await delay(delayMs);
      } catch (error) {
        console.error(
          `[TIMES-ADMIN] Erro ao processar time ${time.id}:`,
          error.message,
        );
        resultados.erros++;
        resultados.detalhes.push({
          id: time.id,
          status: "erro",
          message: error.message,
        });
        await delay(delayMs);
      }
    }

    console.log(
      `[TIMES-ADMIN] Repopulação concluída: ${resultados.atualizados} atualizados, ${resultados.erros} erros`,
    );

    res.json({
      success: true,
      message: `Repopulação concluída`,
      totalProcessados: timesIncompletos.length,
      ...resultados,
    });
  } catch (error) {
    console.error("[TIMES-ADMIN] Erro na repopulação:", error);
    res.status(500).json({ success: false, erro: error.message });
  }
});

/**
 * POST /api/times-admin/repopular-time/:timeId
 * Repopula um time específico
 */
router.post("/repopular-time/:timeId", async (req, res) => {
  try {
    const Time = getTimeModel();
    const { timeId } = req.params;

    // Buscar rodada atual
    let rodadaAtual = 38;
    try {
      const statusRes = await fetch(
        "https://api.cartola.globo.com/mercado/status",
        {
          timeout: 10000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        },
      );
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        rodadaAtual = statusData.rodada_atual || 38;
      }
    } catch (e) {
      console.warn("[TIMES-ADMIN] Usando rodada 38 como fallback");
    }

    // Buscar dados do time na API
    const timeRes = await fetch(
      `https://api.cartola.globo.com/time/id/${timeId}/${rodadaAtual}`,
      {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    );

    if (!timeRes.ok) {
      return res.status(404).json({
        success: false,
        erro: `Time ${timeId} não encontrado na API Cartola`,
      });
    }

    const data = await timeRes.json();

    if (!data.time) {
      return res.status(404).json({
        success: false,
        erro: "Resposta da API sem dados do time",
      });
    }

    // Atualizar ou criar no banco
    const resultado = await Time.findOneAndUpdate(
      { id: Number(timeId) },
      {
        $set: {
          id: Number(timeId),
          nome_time: data.time.nome || `Time ${timeId}`,
          nome_cartoleiro: data.time.nome_cartola || "N/D",
          url_escudo_png: data.time.url_escudo_png || "",
          clube_id: data.time.clube_id || null,
        },
      },
      { upsert: true, new: true },
    );

    console.log(
      `[TIMES-ADMIN] ✅ Time ${timeId} atualizado: ${resultado.nome_cartoleiro}`,
    );

    res.json({
      success: true,
      time: {
        id: resultado.id,
        nome_time: resultado.nome_time,
        nome_cartoleiro: resultado.nome_cartoleiro,
        url_escudo_png: resultado.url_escudo_png,
      },
    });
  } catch (error) {
    console.error(
      `[TIMES-ADMIN] Erro ao repopular time ${req.params.timeId}:`,
      error,
    );
    res.status(500).json({ success: false, erro: error.message });
  }
});

/**
 * GET /api/times-admin/debug/:timeId
 * 🔍 DEBUG: Retorna documento RAW do MongoDB (bypassa Mongoose)
 */
router.get("/debug/:timeId", async (req, res) => {
  try {
    const timeId = Number(req.params.timeId);
    
    // Query direta na collection (bypassa Mongoose Schema)
    const docRaw = await mongoose.connection.db
      .collection("times")
      .findOne({ id: timeId });
    
    if (!docRaw) {
      return res.status(404).json({
        success: false,
        erro: `Time ${timeId} não encontrado no MongoDB`
      });
    }
    
    // Também buscar via Model para comparar
    const Time = getTimeModel();
    const docMongoose = await Time.findOne({ id: timeId }).lean();
    
    res.json({
      success: true,
      timeId,
      documentoRaw: docRaw,
      documentoMongoose: docMongoose,
      camposPresentes: Object.keys(docRaw),
      comparacao: {
        temNome: !!docRaw.nome,
        temNomeTime: !!docRaw.nome_time,
        temNomeCartola: !!docRaw.nome_cartola,
        temNomeCartoleiro: !!docRaw.nome_cartoleiro
      }
    });
  } catch (error) {
    console.error(`[TIMES-ADMIN] Erro no debug do time ${req.params.timeId}:`, error);
    res.status(500).json({ success: false, erro: error.message });
  }
});

/**
 * POST /api/times-admin/migrar-times-ligas
 * Popula a collection times com dados de todos os times que estão em ligas
 * Executa UMA VEZ para corrigir dados históricos
 */
router.post("/migrar-times-ligas", async (req, res) => {
  try {
    const Time = getTimeModel();
    const Liga =
      mongoose.models.Liga ||
      mongoose.model("Liga", new mongoose.Schema({ times: [Number] }));

    const { delayMs = 1000 } = req.body;

    // 1. Buscar todos os IDs de times de todas as ligas
    const ligas = await Liga.find({}).select("times nome").lean();
    const todosTimeIds = [...new Set(ligas.flatMap((l) => l.times || []))];

    console.log(
      `[TIMES-ADMIN] Total de times únicos nas ligas: ${todosTimeIds.length}`,
    );

    // 2. Verificar quais já existem com dados completos
    const timesExistentes = await Time.find({
      id: { $in: todosTimeIds },
      nome_cartoleiro: { $nin: ["", "N/D", "N/A", null] },
    })
      .select("id")
      .lean();

    const idsCompletos = new Set(timesExistentes.map((t) => t.id));
    const idsParaPopular = todosTimeIds.filter((id) => !idsCompletos.has(id));

    console.log(
      `[TIMES-ADMIN] Times com dados completos: ${idsCompletos.size}`,
    );
    console.log(`[TIMES-ADMIN] Times para popular: ${idsParaPopular.length}`);

    if (idsParaPopular.length === 0) {
      return res.json({
        success: true,
        message: "Todos os times já possuem dados completos",
        totalLigas: ligas.length,
        totalTimes: todosTimeIds.length,
        jaCompletos: idsCompletos.size,
        populados: 0,
      });
    }

    // 3. Buscar rodada atual
    let rodadaAtual = 38;
    try {
      const statusRes = await fetch(
        "https://api.cartola.globo.com/mercado/status",
        {
          timeout: 10000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        },
      );
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        rodadaAtual = statusData.rodada_atual || 38;
      }
    } catch (e) {
      console.warn("[TIMES-ADMIN] Usando rodada 38 como fallback");
    }

    // 4. Popular times sequencialmente
    const resultados = { populados: 0, erros: 0, detalhes: [] };

    for (const timeId of idsParaPopular) {
      try {
        console.log(`[TIMES-ADMIN] Populando time ${timeId}...`);

        const timeRes = await fetch(
          `https://api.cartola.globo.com/time/id/${timeId}/${rodadaAtual}`,
          {
            timeout: 10000,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          },
        );

        if (!timeRes.ok) {
          resultados.erros++;
          resultados.detalhes.push({
            id: timeId,
            status: "api_erro",
            code: timeRes.status,
          });
          await delay(delayMs);
          continue;
        }

        const data = await timeRes.json();

        if (data.time && data.time.nome_cartola) {
          await Time.findOneAndUpdate(
            { id: timeId },
            {
              $set: {
                id: timeId,
                nome_time: data.time.nome || `Time ${timeId}`,
                nome_cartoleiro: data.time.nome_cartola,
                url_escudo_png: data.time.url_escudo_png || "",
                clube_id: data.time.clube_id || null,
              },
            },
            { upsert: true, new: true },
          );

          console.log(
            `[TIMES-ADMIN] ✅ Time ${timeId} populado: ${data.time.nome_cartola}`,
          );
          resultados.populados++;
          resultados.detalhes.push({
            id: timeId,
            status: "populado",
            nome: data.time.nome_cartola,
          });
        } else {
          resultados.erros++;
          resultados.detalhes.push({ id: timeId, status: "dados_invalidos" });
        }

        await delay(delayMs);
      } catch (error) {
        console.error(
          `[TIMES-ADMIN] Erro ao popular time ${timeId}:`,
          error.message,
        );
        resultados.erros++;
        resultados.detalhes.push({
          id: timeId,
          status: "erro",
          message: error.message,
        });
        await delay(delayMs);
      }
    }

    res.json({
      success: true,
      message: "Migração concluída",
      totalLigas: ligas.length,
      totalTimes: todosTimeIds.length,
      jaCompletos: idsCompletos.size,
      paraPopular: idsParaPopular.length,
      ...resultados,
    });
  } catch (error) {
    console.error("[TIMES-ADMIN] Erro na migração:", error);
    res.status(500).json({ success: false, erro: error.message });
  }
});

export default router;
