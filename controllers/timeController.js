// controllers/timeController.js - VERSÃO CORRIGIDA v2.0
import mongoose from "mongoose";
import fetch from "node-fetch";
import NodeCache from "node-cache";

// ⚡ CACHE TRANSPARENTE (5 minutos TTL)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ✅ Função para obter o Model de forma segura
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

/**
 * Busca dados do time na API do Cartola
 */
async function buscarDadosApiCartola(timeId) {
  try {
    // Buscar rodada atual
    const statusRes = await fetch(
      "https://api.cartola.globo.com/mercado/status",
    );
    let rodadaAtual = 1;

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      rodadaAtual = statusData.rodada_atual || 1;
    }

    // Buscar time na rodada atual
    const res = await fetch(
      `https://api.cartola.globo.com/time/id/${timeId}/${rodadaAtual}`,
    );

    if (!res.ok) {
      console.warn(
        `[TIME-CONTROLLER] API Cartola retornou ${res.status} para time ${timeId}`,
      );
      return null;
    }

    const data = await res.json();

    if (data.time) {
      return {
        nome_time: data.time.nome || null,
        nome_cartoleiro: data.time.nome_cartola || null,
        url_escudo_png: data.time.url_escudo_png || "",
        clube_id: data.time.clube_id || null,
      };
    }

    return null;
  } catch (error) {
    console.error(
      `[TIME-CONTROLLER] Erro ao buscar API Cartola para time ${timeId}:`,
      error.message,
    );
    return null;
  }
}

/**
 * Verifica se os dados do time estão incompletos (N/D)
 */
function dadosIncompletos(time) {
  return (
    !time.nome_cartola ||
    time.nome_cartola === "N/D" ||
    time.nome_cartola === "N/A" ||
    time.nome_cartola === "" ||
    !time.nome ||
    time.nome === "N/D" ||
    time.nome === "N/A" ||
    time.nome.startsWith("Time ")
  );
}

export const salvarTime = async (timeId) => {
  try {
    const Time = getTimeModel();
    let time = await Time.findOne({ id: timeId });

    if (time && !dadosIncompletos(time)) {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[TIME-CONTROLLER] Time ${timeId} já existe com dados completos`,
        );
      }
      return time;
    }

    // ⚡ CACHE DA API CARTOLA
    const cacheKey = `api_time_${timeId}`;
    let dadosApi = cache.get(cacheKey);

    if (!dadosApi) {
      dadosApi = await buscarDadosApiCartola(timeId);
      if (dadosApi) {
        cache.set(cacheKey, dadosApi, 300);
      }
    }

    // Se não conseguiu dados da API, retornar o que tem ou criar com padrão
    if (!dadosApi) {
      if (time) {
        console.warn(
          `[TIME-CONTROLLER] Mantendo dados existentes para time ${timeId} (API indisponível)`,
        );
        return time;
      }

      // Criar com dados padrão apenas se não existe
      console.warn(
        `[TIME-CONTROLLER] Criando time ${timeId} com dados padrão (API indisponível)`,
      );
      time = new Time({
        id: timeId,
        nome: `Time ${timeId}`,
        nome_cartola: "N/D",
        url_escudo_png: "",
        clube_id: null,
      });
      await time.save();
      return time;
    }

    // Atualizar ou criar com dados da API
    if (time) {
      // Atualizar time existente
      time.nome = dadosApi.nome_time || time.nome;
      time.nome_cartola = dadosApi.nome_cartoleiro || time.nome_cartola;
      time.url_escudo_png = dadosApi.url_escudo_png || time.url_escudo_png;
      time.clube_id = dadosApi.clube_id || time.clube_id;
      await time.save();
      console.log(
        `[TIME-CONTROLLER] ✅ Time ${timeId} ATUALIZADO: ${time.nome_cartola} - ${time.nome}`,
      );
    } else {
      // Criar novo time
      time = new Time({
        id: timeId,
        nome: dadosApi.nome_time || `Time ${timeId}`,
        nome_cartola: dadosApi.nome_cartoleiro || "N/D",
        url_escudo_png: dadosApi.url_escudo_png || "",
        clube_id: dadosApi.clube_id || null,
      });
      await time.save();
      console.log(
        `[TIME-CONTROLLER] ✅ Time ${timeId} CRIADO: ${time.nome_cartola} - ${time.nome}`,
      );
    }

    return time;
  } catch (err) {
    console.error(
      `[TIME-CONTROLLER] Erro ao salvar time ${timeId}:`,
      err.message,
    );
    throw err;
  }
};

export const obterTimePorId = async (req, res) => {
  const { id } = req.params;

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `Requisição recebida para obterTimePorId com ID: "${id}" (tipo: ${typeof id})`,
    );
  }

  try {
    if (!id || id === "undefined" || id === "null") {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`ID inválido recebido: "${id}"`);
      }
      return res
        .status(400)
        .json({ erro: "ID de time inválido ou não fornecido" });
    }

    const Time = getTimeModel();
    const timeId = Number(id);

    // ⚡ CACHE DO MONGODB
    const cacheKey = `mongo_time_${id}`;
    let time = cache.get(cacheKey);

    if (!time) {
      time = await Time.findOne({ id: timeId });
      if (!time) {
        time = await Time.findOne({ id: id });
      }
      if (!time) {
        time = await Time.findOne({ time_id: timeId });
      }
    }

    // ⚠️ Revalidação automática DESABILITADA (causa rate limiting na API Cartola)
    // Use POST /api/times-admin/repopular para atualizar times com dados incompletos

    if (time) {
      // Atualizar cache
      cache.set(cacheKey, time, 300);

      return res.json({
        id: time.id,
        nome_time: time.nome, // ✅ Campo correto do Model
        nome_cartola: time.nome_cartola, // ✅ Campo correto do Model
        nome_cartoleiro: time.nome_cartola, // Alias para compatibilidade
        url_escudo_png: time.url_escudo_png,
        clube_id: time.clube_id,
        assinante: time.assinante,
        senha_acesso: time.senha_acesso,
        ativo: time.ativo !== false,
        rodada_desistencia: time.rodada_desistencia,
        data_desistencia: time.data_desistencia,
      });
    }

    // Time não existe, criar
    const novoTime = await salvarTime(timeId);

    if (novoTime) {
      return res.status(200).json({
        id: novoTime.id,
        nome_time: novoTime.nome, // ✅ Campo correto do Model
        nome_cartola: novoTime.nome_cartola, // ✅ Campo correto do Model
        nome_cartoleiro: novoTime.nome_cartola, // Alias para compatibilidade
        url_escudo_png: novoTime.url_escudo_png,
        clube_id: novoTime.clube_id,
        ativo: novoTime.ativo !== false,
        rodada_desistencia: novoTime.rodada_desistencia,
      });
    }

    return res.status(404).json({ erro: "Time não encontrado" });
  } catch (err) {
    console.error(`[TIME-CONTROLLER] Erro em obterTimePorId: ${err.message}`);
    return res.status(500).json({ erro: "Erro interno no servidor" });
  }
};
