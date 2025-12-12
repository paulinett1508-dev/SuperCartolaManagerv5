import fetch from "node-fetch";
import NodeCache from "node-cache";
import Time from "../models/Time.js";
import { isSeasonFinished, logBlockedOperation, SEASON_CONFIG } from "../utils/seasonGuard.js";

const cache = new NodeCache({ stdTTL: 300 });

async function fetchWithTimeout(url, options, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(url, options, retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (err) {
      if (i === retries - 1) {
        console.error(
          `Falha após ${retries} tentativas para ${url}: ${err.message}`,
        );
        throw new Error("Serviço indisponível após várias tentativas");
      }
      console.warn(
        `Tentativa ${i + 1} falhou para ${url}: ${err.message}. Tentando novamente em ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function buscarClubes() {
  try {
    // ⛔ SEASON GUARD: Temporada encerrada - retornar cache ou vazio
    if (isSeasonFinished()) {
      logBlockedOperation('buscarClubes', { reason: 'Dados estáticos de clubes' });
      if (cache.has("clubes")) return cache.get("clubes");
      return {}; // Clubes não mudam, pode retornar vazio
    }

    if (cache.has("clubes")) return cache.get("clubes");
    const response = await fetchWithRetry(
      "https://api.cartola.globo.com/clubes",
      {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "If-Modified-Since": "0",
        },
      },
    );
    const data = await response.json();
    if (!data || typeof data !== "object") {
      throw new Error("Dados de clubes inválidos");
    }
    cache.set("clubes", data);
    return data;
  } catch (err) {
    console.error("Erro em buscarClubes:", err.message);
    return {};
  }
}

export async function buscarTimePorId(id) {
  try {
    const timeId = String(id).trim();

    if (!timeId || (isNaN(Number(timeId)) && isNaN(parseInt(timeId)))) {
      console.error(`ID de time inválido: ${id}`);
      throw new Error("ID de time inválido");
    }

    const cacheKey = `time_${timeId}`;
    if (cache.has(cacheKey)) {
      console.log(`Usando cache para time_${timeId}`);
      return cache.get(cacheKey);
    }

    console.log(`Buscando time ${timeId} no banco de dados local`);
    let timeLocal = await Time.findOne({ id: Number(timeId) }).lean();
    if (!timeLocal) {
      timeLocal = await Time.findOne({ id: timeId }).lean();
    }
    if (!timeLocal) {
      timeLocal = await Time.findOne({ time_id: Number(timeId) }).lean();
    }

    if (timeLocal) {
      console.log(`Time ${timeId} encontrado no banco local:`, timeLocal);
      const timeData = {
        nome_cartoleiro:
          timeLocal.nome_cartoleiro || timeLocal.nome_cartola || "N/D",
        nome_time: timeLocal.nome_time || timeLocal.nome || "N/D",
        url_escudo_png: timeLocal.url_escudo_png || timeLocal.escudo || "",
        clube_id: timeLocal.clube_id || null,
        time_id: timeLocal.time_id || timeLocal.id || null,
      };
      cache.set(cacheKey, timeData);
      return timeData;
    }

    // ⛔ SEASON GUARD: Temporada encerrada - NÃO buscar API externa
    if (isSeasonFinished()) {
      logBlockedOperation('buscarTimePorId', { timeId, reason: 'Time não encontrado localmente' });
      throw new Error(`Time ${timeId} não encontrado. ${SEASON_CONFIG.BLOCK_MESSAGE}`);
    }

    console.log(
      `Time ${timeId} não encontrado localmente. Buscando na API externa...`,
    );
    const response = await fetchWithRetry(
      `https://api.cartola.globo.com/time/id/${timeId}`,
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

    const data = await response.json();
    console.log(`Resposta da API externa para time ${timeId}:`, data);

    if (!data || !data.nome_cartoleiro) {
      throw new Error("Dados do time inválidos ou incompletos");
    }

    const timeData = {
      nome_cartoleiro: data.nome_cartoleiro,
      nome_time: data.nome_time || "N/D",
      url_escudo_png: data.url_escudo_png || "",
      clube_id: data.clube_id || null,
      time_id: data.time_id || timeId,
    };

    const novoTime = new Time(timeData);
    await novoTime.save();

    cache.set(cacheKey, timeData);

    return timeData;
  } catch (err) {
    console.error(`Erro em buscarTimePorId para ID ${id}:`, err.message);
    throw err;
  }
}

export async function buscarPontuacaoPorRodada(id, rodada) {
  // ⛔ SEASON GUARD: Temporada encerrada - bloquear chamada
  if (isSeasonFinished()) {
    logBlockedOperation('buscarPontuacaoPorRodada', { timeId: id, rodada });
    throw new Error(`buscarPontuacaoPorRodada: ${SEASON_CONFIG.BLOCK_MESSAGE}`);
  }

  try {
    const response = await fetchWithRetry(
      `https://api.cartola.globo.com/time/mercado/${id}/pontuacao/${rodada}`,
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
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`Erro em buscarPontuacaoPorRodada: ${err.message}`);
    throw err;
  }
}
