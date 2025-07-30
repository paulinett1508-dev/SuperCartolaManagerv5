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
      url_escudo_png: data.time?.escudo_url_60x60 || "",
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
      const resultado = {
        nome_time: time.nome_time || "N/D",
        nome_cartoleiro: time.nome_cartoleiro || time.nome_cartola || "N/D",
        url_escudo_png: time.url_escudo_png || time.escudo || "",
        clube_id: time.clube_id || null,
      };
      return res.status(200).json(resultado);
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

// ==========================================

// controllers/cartolaController.js - VERSÃO OTIMIZADA
import fetch from "node-fetch";
import NodeCache from "node-cache";
import {
  buscarClubes,
  buscarTimePorId,
  buscarPontuacaoPorRodada,
} from "../services/cartolaService.js";

// ⚡ CACHE PARA APIs EXTERNAS
const apiCache = new NodeCache({ stdTTL: 180, checkperiod: 30 }); // 3 minutos

// Retorna todos os clubes disponíveis
export async function listarClubes(req, res) {
  try {
    const clubes = await buscarClubes();
    res.status(200).json(clubes);
  } catch (error) {
    console.error("Erro ao listar clubes:", error.message);
    res.status(500).json({ error: `Erro ao buscar clubes: ${error.message}` });
  }
}

// Retorna dados de um time específico (mantém lógica original)
export async function obterTimePorId(req, res) {
  try {
    const time = await buscarTimePorId(req.params.id);
    res.status(200).json({
      nome: time.nome_time,
      nome_cartoleiro: time.nome_cartoleiro,
      url_escudo_png: time.url_escudo_png,
      clube_id: time.clube_id,
    });
  } catch (error) {
    console.error(
      `Erro ao buscar time com ID ${req.params.id}:`,
      error.message,
    );
    res.status(404).json({
      error: `Erro ao buscar time com ID ${req.params.id}: ${error.message}`,
    });
  }
}

// Retorna pontuação de um time numa rodada
export async function obterPontuacao(req, res) {
  const { id, rodada } = req.params;
  try {
    const dados = await buscarPontuacaoPorRodada(id, rodada);
    res.status(200).json(dados);
  } catch (error) {
    console.error(
      `Erro ao buscar pontuação do time ${id} na rodada ${rodada}:`,
      error.message,
    );
    res.status(500).json({
      error: `Erro ao buscar pontuação do time ${id} na rodada ${rodada}: ${error.message}`,
    });
  }
}

// Nova função para buscar escalação com cache
export async function obterEscalacao(req, res) {
  const { id, rodada } = req.params;

  // ⚡ CACHE TRANSPARENTE
  const cacheKey = `escalacao_${id}_${rodada}`;
  let time = apiCache.get(cacheKey);

  if (!time) {
    try {
      const response = await fetch(
        `https://api.cartola.globo.com/time/id/${id}/${rodada}`,
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            "If-Modified-Since": "0",
          },
        },
      );
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      time = await response.json();
      apiCache.set(cacheKey, time); // Cache por 3 minutos
    } catch (error) {
      console.error(
        `Erro ao buscar escalação do time ${id} na rodada ${rodada}:`,
        error.message,
      );
      return res.status(500).json({
        error: `Erro ao buscar escalação do time ${id} na rodada ${rodada}: ${error.message}`,
      });
    }
  }

  res.status(200).json({
    time_id: time.time.time_id,
    nome: time.time.nome,
    nome_cartoleiro: time.time.nome_cartola,
    url_escudo_png: time.time.url_escudo_png,
    atletas: time.atletas,
    capitao_id: time.capitao_id,
  });
}

// Função para buscar o status do mercado com cache
export async function getMercadoStatus(req, res) {
  const cacheKey = "mercado_status";
  let data = apiCache.get(cacheKey);

  if (!data) {
    try {
      const response = await fetch(
        "https://api.cartola.globo.com/mercado/status",
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            "If-Modified-Since": "0",
          },
        },
      );
      if (!response.ok) {
        throw new Error(
          `Erro ao buscar status do mercado: ${response.statusText}`,
        );
      }
      data = await response.json();
      apiCache.set(cacheKey, data, 60); // Cache por 1 minuto (dados mais dinâmicos)
    } catch (error) {
      console.error("Erro ao buscar status do mercado:", error.message);
      return res
        .status(500)
        .json({ error: `Erro ao buscar status do mercado: ${error.message}` });
    }
  }

  res.status(200).json({
    rodada_atual: data.rodada_atual,
    status_mercado: data.status_mercado,
    mercado_aberto: data.status_mercado === 1,
    fechamento: data.fechamento,
  });
}

// Nova função para buscar parciais com cache
export async function getParciais(req, res) {
  const cacheKey = "parciais";
  let data = apiCache.get(cacheKey);

  if (!data) {
    try {
      const response = await fetch(
        "https://api.cartola.globo.com/mercado/selecao/parciais",
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            "If-Modified-Since": "0",
          },
        },
      );
      if (!response.ok) {
        throw new Error(`Erro ao buscar parciais: ${response.statusText}`);
      }
      data = await response.json();
      apiCache.set(cacheKey, data, 30); // Cache por 30 segundos (dados muito dinâmicos)
    } catch (error) {
      console.error("Erro ao buscar parciais:", error.message);
      return res
        .status(500)
        .json({ error: `Erro ao buscar parciais: ${error.message}` });
    }
  }

  res.status(200).json(data);
}

// Função proxy para buscar clubes do Cartola com cache
export async function getClubes(req, res) {
  const cacheKey = "clubes";
  let data = apiCache.get(cacheKey);

  if (!data) {
    try {
      const response = await fetch("https://api.cartola.globo.com/clubes");
      data = await response.json();
      apiCache.set(cacheKey, data, 3600); // Cache por 1 hora (dados estáticos)
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar clubes do Cartola" });
    }
  }

  res.json(data);
}
