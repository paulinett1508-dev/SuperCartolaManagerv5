import fetch from "node-fetch";
import NodeCache from "node-cache";
import Time from "../models/Time.js";

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
    // Normaliza o ID para garantir consistência
    const timeId = String(id).trim();

    if (!timeId || (isNaN(Number(timeId)) && isNaN(parseInt(timeId)))) {
      console.error(`ID de time inválido: ${id}`);
      throw new Error("ID de time inválido");
    }

    // Verificar cache primeiro
    const cacheKey = `time_${timeId}`;
    if (cache.has(cacheKey)) {
      console.log(`Usando cache para time_${timeId}`);
      return cache.get(cacheKey);
    }

    // Buscar primeiro no banco de dados local - tenta com diferentes formatos de ID
    console.log(`Buscando time ${timeId} no banco de dados local`);
    let timeLocal = null;

    // Tenta buscar como número
    timeLocal = await Time.findOne({ id: Number(timeId) }).lean();

    // Se não encontrar, tenta buscar como string
    if (!timeLocal) {
      timeLocal = await Time.findOne({ id: timeId }).lean();
    }

    // Tenta buscar pelo campo time_id se existir
    if (!timeLocal) {
      timeLocal = await Time.findOne({ time_id: Number(timeId) }).lean();
    }

    if (timeLocal) {
      console.log(`Time ${timeId} encontrado no banco de dados local:`, timeLocal.nome_time || timeLocal.nome);
      const timeData = {
        nome_cartoleiro: timeLocal.nome_cartoleiro || timeLocal.nome_cartola || "N/D",
        nome_time: timeLocal.nome_time || timeLocal.nome || "N/D",
        url_escudo_png: timeLocal.url_escudo_png || timeLocal.escudo || "",
        clube_id: timeLocal.clube_id || null,
        time_id: timeLocal.time_id || timeLocal.id || timeId,
      };
      cache.set(cacheKey, timeData);
      return timeData;
    }

    // Se não encontrar no banco local, buscar na API externa
    console.log(`Time ${timeId} não encontrado no banco local, buscando na API do Cartola`);
    try {
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
      const data = await response.json();
      if (data && data.time) {
        const timeData = {
          nome_cartoleiro: data.time.nome_cartola || "N/D",
          nome_time: data.time.nome || "N/D",
          url_escudo_png: data.time.url_escudo_png || "",
          clube_id: data.time.clube_id || null,
          time_id: data.time.time_id || timeId,
        };
        cache.set(cacheKey, timeData);
        console.log(`Time ${timeId} encontrado na API do Cartola:`, timeData.nome_time);

        // Salva no banco local para futuras consultas
        try {
          const novoTime = new Time({
            id: Number(timeId),
            time_id: Number(timeId),
            nome_time: timeData.nome_time,
            nome_cartoleiro: timeData.nome_cartoleiro,
            url_escudo_png: timeData.url_escudo_png,
            clube_id: timeData.clube_id
          });
          await novoTime.save();
          console.log(`Time ${timeId} salvo no banco local`);
        } catch (saveErr) {
          console.warn(`Não foi possível salvar o time ${timeId} no banco local:`, saveErr.message);
        }

        return timeData;
      } else {
        throw new Error("Dados do time não encontrados na resposta da API");
      }
    } catch (apiErr) {
      console.error(`Erro ao buscar time ${timeId} na API:`, apiErr.message);
      // Retorna um objeto padrão mesmo em caso de falha
      const timeData = {
        nome_cartoleiro: "N/D",
        nome_time: "N/D",
        url_escudo_png: "",
        clube_id: null,
        time_id: timeId,
      };
      cache.set(cacheKey, timeData, 60); // Cache mais curto para dados de fallback
      return timeData;
    }
  } catch (err) {
    console.error(`Erro em buscarTimePorId(${id}):`, err.message);
    // Retorna um objeto padrão mesmo em caso de falha
    return {
      nome_cartoleiro: "N/D",
      nome_time: "N/D",
      url_escudo_png: "",
      clube_id: null,
      time_id: String(id),
    };
  }
}

export async function buscarPontuacaoPorRodada(id, rodada) {
  try {
    if (!id || (isNaN(Number(id)) && isNaN(parseInt(id))) || !rodada || isNaN(rodada)) {
      console.error(`Parâmetros inválidos - ID: ${id}, Rodada: ${rodada}`);
      throw new Error("Parâmetros inválidos");
    }

    const cacheKey = `pontuacao_${id}_${rodada}`;
    if (cache.has(cacheKey))
      return cache.get(cacheKey);

    const response = await fetchWithRetry(
      `https://api.cartola.globo.com/time/id/${id}/${rodada}`,
      {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "If-Modified-Since": "0",
        },
      },
    );
    const data = await response.json();
    cache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.error(
      `Erro em buscarPontuacaoPorRodada(${id}, ${rodada}):`,
      err.message,
    );
    throw new Error(
      `Falha ao buscar pontuação do time ${id} na rodada ${rodada}. Tente novamente mais tarde.`,
    );
  }
}

// 👇 Adicionado export do fetchWithRetry
export { fetchWithRetry };
