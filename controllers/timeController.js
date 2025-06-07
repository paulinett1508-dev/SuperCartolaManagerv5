import Time from "../models/Time.js";

// Função para salvar ou atualizar um time na coleção times
export const salvarTime = async (timeId) => {
  try {
    // Verifica se o time já existe na coleção times
    let time = await Time.findOne({ id: timeId });
    if (time) {
      console.log(`Time ${timeId} já existe na coleção times:`, time);
      return time;
    }

    // Busca os detalhes do time na API do Cartola FC
    const res = await fetch(`https://api.cartola.globo.com/time/id/${timeId}`);
    if (!res.ok) {
      throw new Error(`Erro ao buscar time ${timeId}: ${res.statusText}`);
    }
    const data = await res.json();

    // Cria um novo documento na coleção times
    time = new Time({
      id: timeId,
      nome_time: data.time?.nome || "N/D",
      nome_cartoleiro: data.time?.nome_cartola || "N/D",
      url_escudo_png: data.time?.url_escudo_png || "",
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

// ===============================
// FUNÇÃO PARA BUSCAR TIME POR ID NA API DO CARTOLA FC (SEM SALVAR NO BANCO)
// ===============================
import fetch from "node-fetch";

export const obterTimePorId = async (req, res) => {
  const { id } = req.params;

  // Log detalhado para depuração
  console.log(
    `Requisição recebida para obterTimePorId com ID: "${id}" (tipo: ${typeof id})`,
  );

  try {
    // Verifica se o ID é válido
    if (!id || id === "undefined" || id === "null") {
      console.warn(`ID inválido recebido: "${id}"`);
      return res
        .status(400)
        .json({ erro: "ID de time inválido ou não fornecido" });
    }

    // Primeiro tenta buscar no banco de dados local
    console.log(`Buscando time ${id} no banco de dados local...`);

    // Tenta diferentes formatos de ID para aumentar chance de encontrar
    let time = null;

    // Tenta como string exata
    time = await Time.findOne({ id: id });

    // Se não encontrar e for numérico, tenta como número
    if (!time && !isNaN(Number(id))) {
      time = await Time.findOne({ id: Number(id) });
    }

    // Tenta pelo campo time_id também
    if (!time) {
      time = await Time.findOne({ time_id: id });
      if (!time && !isNaN(Number(id))) {
        time = await Time.findOne({ time_id: Number(id) });
      }
    }

    // Se encontrou no banco local, retorna os dados
    if (time) {
      console.log(
        `Time ${id} encontrado no banco de dados local:`,
        time.nome_time || time.nome,
      );
      const resultado = {
        nome_time: time.nome_time || "N/D",
        nome_cartoleiro: time.nome_cartoleiro || time.nome_cartola || "N/D",
        escudo_url: time.url_escudo_png || "",
        clube_id: time.clube_id || null,
      };
      return res.json(resultado);
    }

    // Se não encontrou no banco local, busca na API do Cartola FC
    console.log(
      `Time ${id} não encontrado no banco local, buscando na API do Cartola FC...`,
    );
    const response = await fetch(`https://api.cartola.globo.com/time/id/${id}`);

    if (!response.ok) {
      console.warn(
        `Time ${id} não encontrado na API do Cartola FC. Status: ${response.status}`,
      );

      // Retorna um objeto com valores padrão para evitar erros no frontend
      return res.status(404).json({
        erro: "Time não encontrado",
        nome_time: "Time não encontrado",
        nome_cartoleiro: "N/D",
        escudo_url: "",
        clube_id: null,
      });
    }

    const data = await response.json();
    const resultado = {
      nome_time: data.time?.nome || "N/D",
      nome_cartoleiro: data.time?.nome_cartola || "N/D",
      escudo_url: data.time?.escudo_url_60x60 || "",
      clube_id: data.time?.clube_id || null,
    };

    console.log(
      `Dados do time ${id} retornados da API do Cartola FC:`,
      resultado,
    );

    // Salva no banco local para futuras consultas
    try {
      const novoTime = new Time({
        id: id,
        time_id: id,
        nome_time: resultado.nome_time,
        nome_cartoleiro: resultado.nome_cartoleiro,
        url_escudo_png: resultado.escudo_url,
        clube_id: resultado.clube_id,
      });
      await novoTime.save();
      console.log(`Time ${id} salvo no banco local para consultas futuras`);
    } catch (saveErr) {
      console.warn(
        `Não foi possível salvar o time ${id} no banco local:`,
        saveErr.message,
      );
    }

    res.json(resultado);
  } catch (e) {
    console.error(`Erro ao buscar time ${id}:`, e.message);

    // Retorna um objeto com valores padrão para evitar erros no frontend
    res.status(500).json({
      erro: "Erro ao buscar time",
      nome_time: "Erro ao buscar time",
      nome_cartoleiro: "N/D",
      escudo_url: "",
      clube_id: null,
    });
  }
};
