import Time from "../models/Time.js";
import fetch from "node-fetch";

export const salvarTime = async (timeId) => {
  try {
    let time = await Time.findOne({ id: timeId });
    if (time) {
      console.log(`Time ${timeId} já existe na coleção times:`, time);
      return time;
    }

    const res = await fetch(`https://api.cartola.globo.com/time/id/${timeId}`);
    if (!res.ok) {
      throw new Error(`Erro ao buscar time ${timeId}: ${res.statusText}`);
    }
    const data = await res.json();
    console.log(`Dados recebidos da API para time ${timeId}:`, data);

    time = new Time({
      id: timeId,
      nome_time: data.time?.nome || "N/D",
      nome_cartoleiro: data.time?.nome_cartola || "N/D",
      url_escudo_png: data.time?.escudo_url_60x60 || "",
      clube_id: data.time?.clube_id || null,
    });

    await time.save();
    console.log(`Time ${timeId} salvo na coleção times:`, time);
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

  console.log(
    `Requisição recebida para obterTimePorId com ID: "${id}" (tipo: ${typeof id})`,
  );

  try {
    if (!id || id === "undefined" || id === "null") {
      console.warn(`ID inválido recebido: "${id}"`);
      return res
        .status(400)
        .json({ erro: "ID de time inválido ou não fornecido" });
    }

    let time = await Time.findOne({ id: id });
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
      const resultado = {
        nome_time: time.nome_time || "N/D",
        nome_cartoleiro: time.nome_cartoleiro || time.nome_cartola || "N/D",
        url_escudo_png: time.url_escudo_png || time.escudo || "",
        clube_id: time.clube_id || null,
      };
      return res.status(200).json(resultado);
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
