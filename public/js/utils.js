// utils.js
const cache = {};
async function fetchWithTimeout(url, options, timeout = 5000) {
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
export async function buscarDadosRodadas(
  liga,
  inicio,
  fim,
  ligaId,
  forceRefresh = false,
  rodadaAtual,
) {
  const times = liga.times;
  const allRankings = {};
  for (let rodada = inicio; rodada <= fim; rodada++) {
    const cacheKeyRodada = `rodada_${ligaId}_${rodada}`;
    if (!forceRefresh && cache[cacheKeyRodada]) {
      allRankings[rodada] = cache[cacheKeyRodada];
      continue;
    }
    if (rodada > rodadaAtual) {
      allRankings[rodada] = times.map((time) => ({
        id: time.id,
        cartoleiro: "N/D",
        time: "N/D",
        escudo: "",
        timeDoCoracao: time.timeDoCoracao || "",
        pontos: "0.00",
        rodadaNaoJogada: true,
      }));
      cache[cacheKeyRodada] = allRankings[rodada];
      continue;
    }
    const rankings = await Promise.all(
      times.map(async (time) => {
        try {
          if (!time.id || isNaN(time.id)) {
            console.warn(`ID de time inválido: ${time.id}`);
            return null;
          }
          const resTimeInfo = await fetchWithTimeout(
            `/api/time/${time.id}`,
            {
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
                "If-Modified-Since": "0",
              },
            },
            5000,
          );
          if (!resTimeInfo.ok) {
            console.warn(
              `Erro ao buscar time ${time.id}: ${resTimeInfo.status} - ${resTimeInfo.statusText}`,
            );
            const responseText = await resTimeInfo.text();
            console.warn(`Resposta da API: ${responseText}`);
            return null;
          }
          let dadosInfo;
          try {
            dadosInfo = await resTimeInfo.json();
          } catch (jsonErr) {
            console.warn(
              `Erro ao parsear JSON para time ${time.id}: ${jsonErr.message}`,
            );
            const responseText = await resTimeInfo.text();
            console.warn(`Resposta da API: ${responseText}`);
            return null;
          }
          const resTimeRodada = await fetchWithTimeout(
            `/api/time/${time.id}/${rodada}`,
            {
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
                "If-Modified-Since": "0",
              },
            },
            5000,
          );
          let pontos = 0;
          let rodadaNaoJogada = false;
          if (!resTimeRodada.ok) {
            console.warn(
              `Erro ao buscar pontuação do time ${time.id} na rodada ${rodada}: ${resTimeRodada.status} - ${resTimeRodada.statusText}`,
            );
            const responseText = await resTimeRodada.text();
            console.warn(`Resposta da API: ${responseText}`);
            pontos = 0;
            rodadaNaoJogada = true;
          } else {
            const dadosRodada = await resTimeRodada.json();
            pontos = dadosRodada.pontos || 0;
          }
          return {
            id: time.id,
            cartoleiro: dadosInfo.time?.nome_cartola || "N/D",
            time: dadosInfo.time?.nome || "N/D",
            escudo: dadosInfo.time?.url_escudo_png || "",
            timeDoCoracao: time.timeDoCoracao || "",
            pontos: pontos.toFixed(2),
            rodadaNaoJogada,
          };
        } catch (err) {
          console.warn(
            `Erro ao buscar dados do time ${time.id}: ${err.message}`,
          );
          return null;
        }
      }),
    ).then((results) => results.filter(Boolean));
    allRankings[rodada] = rankings;
    cache[cacheKeyRodada] = rankings;
    localStorage.setItem(cacheKeyRodada, JSON.stringify(rankings));
    localStorage.setItem(
      `rodada_timestamp_${ligaId}_${rodada}`,
      Date.now().toString(),
    );
  }
  return allRankings;
}
export async function calcularPontosEncerradas(
  liga,
  inicio,
  fim,
  ligaId,
  allRankings,
) {
  const times = await Promise.all(
    liga.times.map(async (time) => {
      let totalPontos = 0;
      let nome_cartoleiro = "N/D";
      let nome_time = "N/D";
      for (let rodada = inicio; rodada <= fim; rodada++) {
        const rankings = allRankings[rodada];
        if (rankings) {
          const timeData = rankings.find((t) => t.id === time.id);
          if (timeData && !timeData.rodadaNaoJogada) {
            const pontos = parseFloat(timeData.pontos || 0);
            if (!isNaN(pontos)) {
              totalPontos += pontos;
            }
            nome_cartoleiro = timeData.cartoleiro;
            nome_time = timeData.time;
          }
        }
      }
      return { id: time.id, totalPontos, nome_cartoleiro, nome_time };
    }),
  );
  return times;
}
export async function calcularPontosParciais(liga, rodadaAtual, ligaId) {
  const resPartials = await fetch("/api/partials", {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "If-Modified-Since": "0",
    },
  });
  if (!resPartials.ok) throw new Error("Erro ao buscar parciais");
  const partialsData = await resPartials.json();
  if (!partialsData.atletas)
    throw new Error("Dados de parciais não disponíveis");
  const times = await Promise.all(
    liga.times.map(async (time) => {
      const resInfo = await fetch(`/api/time/${time.id}`);
      const resEscalacao = await fetch(`/api/time/${time.id}/${rodadaAtual}`);
      if (!resInfo.ok || !resEscalacao.ok)
        return { id: time.id, totalPontos: 0 };
      const dadosInfo = await resInfo.json();
      const dadosEscalacao = await resEscalacao.json();
      let pontos = 0;
      dadosEscalacao.atletas.forEach((atleta) => {
        const pontuacao =
          partialsData.atletas[atleta.atleta_id]?.pontuacao || 0;
        pontos +=
          atleta.atleta_id === dadosEscalacao.capitao_id
            ? pontuacao * 2
            : pontuacao;
      });
      return {
        id: time.id,
        totalPontos: pontos,
        nome_cartoleiro: dadosInfo.time?.nome_cartola || "N/D",
        nome_time: dadosInfo.time?.nome || "N/D",
      };
    }),
  );
  return times;
}
// Recomendações Adicionais:
// - Implementar um sistema de cache mais eficiente no backend para reduzir o número de requisições à API do Cartola FC.
// - Adicionar validação de IDs de times no backend para evitar requisições inválidas.
// - Considerar o uso de uma biblioteca de UI (ex.: Material-UI) para melhorar a experiência do usuário com elementos de espera mais estilizados.
