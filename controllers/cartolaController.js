import fetch from "node-fetch";
import {
  buscarClubes,
  buscarTimePorId,
  buscarPontuacaoPorRodada,
} from "../services/cartolaService.js";

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

// Retorna dados de um time específico
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

// Nova função para buscar escalação de um time para a rodada atual
export async function obterEscalacao(req, res) {
  const { id, rodada } = req.params;
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
    const time = await response.json();
    res.status(200).json({
      time_id: time.time.time_id,
      nome: time.time.nome,
      nome_cartoleiro: time.time.nome_cartola,
      url_escudo_png: time.time.url_escudo_png,
      atletas: time.atletas,
      capitao_id: time.capitao_id,
    });
  } catch (error) {
    console.error(
      `Erro ao buscar escalação do time ${id} na rodada ${rodada}:`,
      error.message,
    );
    res.status(500).json({
      error: `Erro ao buscar escalação do time ${id} na rodada ${rodada}: ${error.message}`,
    });
  }
}

// Função para buscar o status do mercado
export async function getMercadoStatus(req, res) {
  try {
    console.log("[CARTOLA-CONTROLLER] Buscando status do mercado...");
    const response = await fetch(
      "https://api.cartola.globo.com/mercado/status",
      {
        timeout: 10000,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "If-Modified-Since": "0",
          "User-Agent": "SuperCartola/1.0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `API externa retornou ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log("[CARTOLA-CONTROLLER] Status recebido:", data);

    res.status(200).json({
      rodada_atual: data.rodada_atual,
      status_mercado: data.status_mercado,
      mercado_aberto: data.status_mercado === 1, // 1 = ABERTO, 2 = FECHADO
      fechamento: data.fechamento,
    });
  } catch (error) {
    console.error(
      "[CARTOLA-CONTROLLER] Erro ao buscar status do mercado:",
      error.message,
    );

    // Retornar dados de fallback em vez de erro 503
    console.log("[CARTOLA-CONTROLLER] Retornando fallback (rodada 1)");
    res.status(200).json({
      rodada_atual: 1,
      status_mercado: 2,
      mercado_aberto: false,
      fechamento: null,
      fallback: true,
      message: "API Cartola indisponível, usando dados padrão"
    });
  }
}

// Nova função para buscar os dados de parciais
export async function getParciais(req, res) {
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
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Erro ao buscar parciais:", error.message);
    res
      .status(500)
      .json({ error: `Erro ao buscar parciais: ${error.message}` });
  }
}

// Função proxy para buscar clubes do Cartola
export async function getClubes(req, res) {
  try {
    const response = await fetch("https://api.cartola.globo.com/clubes");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar clubes do Cartola" });
  }
}
