// controllers/timeController.js - VERSÃO OTIMIZADA
import Time from "../models/Time.js";
import fetch from "node-fetch";
import NodeCache from "node-cache";

// ⚡ CACHE TRANSPARENTE (5 minutos TTL)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export const salvarTime = async (timeId) => {
  try {
    let time = await Time.findOne({ id: timeId });
    if (time) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`Time ${timeId} já existe na coleção times:`, time);
      }
      return time;
    }

    // ⚡ CACHE DA API CARTOLA (mantém lógica original)
    const cacheKey = `api_time_${timeId}`;
    let data = cache.get(cacheKey);

    if (!data) {
      const res = await fetch(
        `https://api.cartola.globo.com/time/id/${timeId}`,
      );
      if (!res.ok) {
        throw new Error(`Erro ao buscar time ${timeId}: ${res.statusText}`);
      }
      data = await res.json();
      cache.set(cacheKey, data); // Cache por 5 minutos
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

    // ⚡ CACHE DO MONGODB (mantém lógica de busca original)
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
        cache.set(cacheKey, time, 300); // Cache por 5 minutos
      }
    }

    if (time) {
      // Atualiza para incluir campos de status
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

    // Mantém lógica original de buscar na API se não encontrar
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