// controllers/timeController.js - VERSÃO CORRIGIDA
import mongoose from "mongoose";
import fetch from "node-fetch";
import NodeCache from "node-cache";

// ⚡ CACHE TRANSPARENTE (5 minutos TTL)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ✅ CORREÇÃO: Função para obter o Model de forma segura
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

export const salvarTime = async (timeId) => {
  try {
    const Time = getTimeModel();
    let time = await Time.findOne({ id: timeId });
    if (time) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`Time ${timeId} já existe na coleção times:`, time);
      }
      return time;
    }

    // ⚡ CACHE DA API CARTOLA
    const cacheKey = `api_time_${timeId}`;
    let data = cache.get(cacheKey);

    if (!data) {
      try {
        const statusRes = await fetch(
          "https://api.cartola.globo.com/mercado/status",
        );
        let rodadaAtual = 1;

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          rodadaAtual = statusData.rodada_atual || 1;
        }

        const res = await fetch(
          `https://api.cartola.globo.com/time/id/${timeId}/${rodadaAtual}`,
        );

        if (!res.ok) {
          data = {
            time: {
              nome: `Time ${timeId}`,
              nome_cartola: "N/D",
              url_escudo_png: "",
              clube_id: null,
            },
          };
        } else {
          data = await res.json();
        }
      } catch (error) {
        console.warn(
          `Não foi possível buscar dados completos do time ${timeId}, usando dados padrão`,
        );
        data = {
          time: {
            nome: `Time ${timeId}`,
            nome_cartola: "N/D",
            url_escudo_png: "",
            clube_id: null,
          },
        };
      }

      cache.set(cacheKey, data, 300);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`Dados recebidos da API para time ${timeId}:`, data);
    }

    time = new Time({
      id: timeId,
      nome_time: data.time?.nome || "N/D",
      nome_cartoleiro: data.time?.nome_cartola || "N/D",
      url_escudo_png: data.time?.url_escudo_png || "",
      clube_id: data.time?.clube_id || null,
    });

    await time.save();
    if (process.env.NODE_ENV !== "production") {
      console.log(`Time ${timeId} salvo na coleção times:`, time);
    }
    return time;
  } catch (err) {
    console.error(
      `Erro ao salvar time ${timeId} na coleção times:`,
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

    // ⚡ CACHE DO MONGODB
    const cacheKey = `mongo_time_${id}`;
    let time = cache.get(cacheKey);

    if (!time) {
      time = await Time.findOne({ id: id });
      if (!time && !isNaN(Number(id))) {
        time = await Time.findOne({ id: Number(id) });
      }
      if (!time) {
        time = await Time.findOne({ time_id: id });
        if (!time && !isNaN(Number(id))) {
          time = await Time.findOne({ time_id: Number(id) });
        }
      }

      if (time) {
        cache.set(cacheKey, time, 300);
      }
    }

    if (time) {
      return res.json({
        id: time.id,
        nome_time: time.nome_time,
        nome_cartoleiro: time.nome_cartoleiro,
        url_escudo_png: time.url_escudo_png,
        clube_id: time.clube_id,
        assinante: time.assinante,
        senha_acesso: time.senha_acesso,
        ativo: time.ativo !== false,
        rodada_desistencia: time.rodada_desistencia,
        data_desistencia: time.data_desistencia,
      });
    }

    const novoTime = await salvarTime(id);
    if (novoTime) {
      const resultado = {
        nome_time: novoTime.nome_time || "N/D",
        nome_cartoleiro:
          novoTime.nome_cartoleiro || novoTime.nome_cartola || "N/D",
        url_escudo_png: novoTime.url_escudo_png || novoTime.escudo || "",
        clube_id: novoTime.clube_id || null,
      };
      return res.status(200).json(resultado);
    }

    return res.status(404).json({ erro: "Time não encontrado" });
  } catch (err) {
    console.error(`Erro em obterTimePorId: ${err.message}`);
    return res.status(500).json({ erro: "Erro interno no servidor" });
  }
};
