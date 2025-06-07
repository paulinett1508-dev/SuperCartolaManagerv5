import Rodada from "../models/Rodada.js";
import Gols from "../models/Gols.js";
import Time from "../models/Time.js";
import Liga from "../models/Liga.js";
import ArtilheiroCampeao from "../models/ArtilheiroCampeao.js"; // Importar o novo modelo
import NodeCache from "node-cache";
import fetch from "node-fetch";

// Cache com TTL de 10 minutos (600 segundos)
const cache = new NodeCache({ stdTTL: 600 });

// Constantes
const CARTOLA_API_BASE = "https://api.cartola.globo.com";
const LIGA_SOBRAL_ID = "6818c6125b30e1ad70847192";
const TOTAL_RODADAS = 38; // Total de rodadas do campeonato

// Função para buscar a rodada atual da API do Cartola
async function getRodadaAtualCartola() {
  const cacheKey = "rodada_atual_cartola";
  const cachedRodada = cache.get(cacheKey);
  if (cachedRodada) {
    console.log("[CACHE HIT] Rodada atual do Cartola");
    return cachedRodada;
  }

  try {
    const response = await fetch(`${CARTOLA_API_BASE}/mercado/status`);
    if (!response.ok) {
      console.error(
        "Erro ao buscar status do mercado do Cartola:",
        response.status,
        response.statusText,
      );
      return 1; // Fallback para rodada 1 em caso de erro
    }
    const data = await response.json();
    const rodadaAtual = data.rodada_atual;
    cache.set(cacheKey, rodadaAtual, 300); // Cache por 5 minutos
    console.log(`[CARTOLA API] Rodada atual: ${rodadaAtual}`);
    return rodadaAtual;
  } catch (error) {
    console.error("Erro ao buscar rodada atual do Cartola:", error);
    return 1; // Fallback para rodada 1 em caso de erro
  }
}

/**
 * Busca dados de artilheiros para uma rodada específica
 */
export const getArtilheiroCampeao = async (req, res) => {
  try {
    const { ligaId, rodada } = req.params;
    const rodadaAtualCartola = await getRodadaAtualCartola();

    console.log(`[DEBUG] getArtilheiroCampeao - URL: ${req.originalUrl}`);
    console.log(
      `[DEBUG] getArtilheiroCampeao - Params: ${JSON.stringify(req.params)}`,
    );
    console.log(`[DEBUG] getArtilheiroCampeao - rodada param: ${rodada}`);
    console.log(`[DEBUG] getArtilheiroCampeao - ligaId: ${ligaId}`);

    // Verificar cache primeiro
    const cacheKey = `artilheiro_${ligaId}_${rodada}`;
    const dadosCache = cache.get(cacheKey);

    if (dadosCache) {
      console.log(
        `[CACHE HIT] Artilheiro - Liga: ${ligaId}, Rodada: ${rodada}`,
      );
      return res.json(dadosCache);
    }

    console.log(
      `[CACHE MISS] Processando artilheiro - Liga: ${ligaId}, Rodada: ${rodada}`,
    );

    // Validar parâmetros
    const rodadaNum = parseInt(rodada);
    console.log(`[DEBUG] getArtilheiroCampeao - rodadaNum: ${rodadaNum}`);
    if (isNaN(rodadaNum) || rodadaNum < 1 || rodadaNum > TOTAL_RODADAS) {
      console.log(
        `[DEBUG] getArtilheiroCampeao - Rodada inválida: ${rodadaNum}`,
      );
      return res.status(400).json({
        success: false,
        message: `Rodada deve ser um número entre 1 e ${TOTAL_RODADAS}`,
      });
    }

    // Verificar se a rodada já aconteceu
    if (rodadaNum > rodadaAtualCartola) {
      console.log(`[DEBUG] getArtilheiroCampeao - Rodada futura: ${rodadaNum}`);
      return res.status(400).json({
        success: false,
        message: `A rodada ${rodadaNum} ainda não aconteceu. A rodada atual é ${rodadaAtualCartola}.`,
      });
    }

    // Buscar dados da liga
    const liga = await Liga.findById(ligaId);
    console.log(`[DEBUG] getArtilheiroCampeao - Liga encontrada: ${!!liga}`);
    if (!liga) {
      return res.status(404).json({
        success: false,
        message: "Liga não encontrada",
      });
    }

    // Adicionar verificação para a lista de times da liga
    console.log(
      `[DEBUG] getArtilheiroCampeao - Liga.times: ${liga.times ? liga.times.length : "undefined"}`,
    );
    if (!liga.times || !Array.isArray(liga.times) || liga.times.length === 0) {
      console.log(
        `[DEBUG] getArtilheiroCampeao - Liga sem times ou times inválidos.`,
      );
      return res.status(400).json({
        success: false,
        message:
          "A liga especificada não possui times associados ou a lista de times é inválida.",
      });
    }

    // Processar dados dos artilheiros
    const dadosArtilheiros = await processarArtilheirosRodada(liga, rodadaNum);

    if (dadosArtilheiros.length === 0) {
      console.log(
        `[DEBUG] getArtilheiroCampeao - Nenhum dado de gols encontrado para a rodada ${rodada}`,
      );
      return res.json({
        success: false,
        message: `Nenhum dado de gols encontrado para a rodada ${rodada}`,
        dados: [],
        rodada: rodadaNum,
      });
    }

    const resultado = {
      success: true,
      rodada: rodadaNum,
      ligaId: ligaId,
      dados: dadosArtilheiros,
      timestamp: new Date().toISOString(),
      totalTimes: dadosArtilheiros.length,
    };

    // Salvar no cache
    cache.set(cacheKey, resultado);
    console.log(
      `[CACHE SET] Artilheiro - Liga: ${ligaId}, Rodada: ${rodada}, Times: ${dadosArtilheiros.length}`,
    );

    res.json(resultado);
  } catch (error) {
    console.error("[ERRO] getArtilheiroCampeao:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Teste de conectividade
 */
export const testeConectividade = async (req, res) => {
  res.json({
    success: true,
    message: "Artilheiro Campeão API funcionando",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Busca todas as rodadas disponíveis que possuem dados de gols
 */
export const getRodadasDisponiveis = async (req, res) => {
  try {
    const { ligaId } = req.params;
    const rodadaAtualCartola = await getRodadaAtualCartola();

    const cacheKey = `rodadas_artilheiro_${ligaId}`;
    const dadosCache = cache.get(cacheKey);

    if (dadosCache) {
      console.log(`[CACHE HIT] Rodadas Artilheiro - Liga: ${ligaId}`);
      return res.json(dadosCache);
    }

    console.log(`[CACHE MISS] Buscando rodadas disponíveis - Liga: ${ligaId}`);

    // Buscar liga
    const liga = await Liga.findById(ligaId);
    if (!liga) {
      return res.status(404).json({
        success: false,
        message: "Liga não encontrada",
      });
    }

    // Gerar lista de rodadas de 1 até a rodada atual
    const rodadas = [];
    for (let i = 1; i <= rodadaAtualCartola; i++) {
      rodadas.push(i);
    }

    const resultado = {
      success: true,
      ligaId: ligaId,
      rodadas: rodadas,
      totalRodadas: rodadas.length,
      rodadaAtual: rodadaAtualCartola,
      rodadasFuturas: TOTAL_RODADAS - rodadaAtualCartola,
      totalCampeonato: TOTAL_RODADAS,
      timestamp: new Date().toISOString(),
    };

    // Cache por um tempo maior
    cache.set(cacheKey, resultado, 1800); // 30 minutos

    res.json(resultado);
  } catch (error) {
    console.error("[ERRO] getRodadasDisponiveis:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Limpa o cache do artilheiro campeão
 */
export const limparCacheArtilheiro = async (req, res) => {
  try {
    const { ligaId } = req.params;

    if (ligaId) {
      const keys = cache.keys();
      const keysLiga = keys.filter(
        (key) => key.includes(`_${ligaId}_`) || key.includes(`_${ligaId}`),
      );

      keysLiga.forEach((key) => cache.del(key));

      // Limpar também do MongoDB
      await ArtilheiroCampeao.deleteOne({ ligaId: ligaId });

      console.log(
        `[CACHE] Limpo para liga ${ligaId}: ${keysLiga.length} entradas removidas do NodeCache e do MongoDB`,
      );

      return res.json({
        success: true,
        message: `Cache limpo para a liga ${ligaId}`,
        itensRemovidos: keysLiga.length,
      });
    }

    // Limpar todo o cache relacionado ao artilheiro
    const keys = cache.keys();
    const keysArtilheiro = keys.filter(
      (key) =>
        key.includes("artilheiro_") || key.includes("rodadas_artilheiro_"),
    );

    keysArtilheiro.forEach((key) => cache.del(key));

    // Limpar todo o cache do ArtilheiroCampeao do MongoDB
    await ArtilheiroCampeao.deleteMany({});

    console.log(
      `[CACHE] Cache geral do artilheiro limpo: ${keysArtilheiro.length} entradas removidas do NodeCache e do MongoDB`,
    );

    res.json({
      success: true,
      message: "Cache do artilheiro campeão limpo com sucesso",
      itensRemovidos: keysArtilheiro.length,
    });
  } catch (error) {
    console.error("[ERRO] limparCacheArtilheiro:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao limpar cache",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Busca dados acumulados de artilheiros (todas as rodadas)
 */
export const getArtilheiroCampeaoAcumulado = async (req, res) => {
  try {
    const { ligaId } = req.params;
    const { forceUpdate } = req.query; // Novo parâmetro para forçar atualização
    const rodadaAtualCartola = await getRodadaAtualCartola();

    console.log(
      `[DEBUG] getArtilheiroCampeaoAcumulado - URL: ${req.originalUrl}`,
    );
    console.log(
      `[DEBUG] getArtilheiroCampeaoAcumulado - Params: ${JSON.stringify(req.params)}`,
    );
    console.log(
      `[DEBUG] getArtilheiroCampeaoAcumulado - Query: ${JSON.stringify(req.query)}`,
    );
    console.log(
      `[ARTILHEIRO ACUMULADO] Liga: ${ligaId}, Force Update: ${forceUpdate}`,
    );

    // Verificar se a liga existe
    const liga = await Liga.findById(ligaId);
    console.log(
      `[DEBUG] getArtilheiroCampeaoAcumulado - Liga encontrada: ${!!liga}`,
    );
    if (!liga) {
      return res.status(404).json({
        success: false,
        message: "Liga não encontrada",
      });
    }

    // Adicionar verificação para a lista de times da liga
    console.log(
      `[DEBUG] getArtilheiroCampeaoAcumulado - Liga.times: ${liga.times ? liga.times.length : "undefined"}`,
    );
    if (!liga.times || !Array.isArray(liga.times) || liga.times.length === 0) {
      console.log(
        `[DEBUG] getArtilheiroCampeaoAcumulado - Liga sem times ou times inválidos.`,
      );
      return res.status(400).json({
        success: false,
        message:
          "A liga especificada não possui times associados ou a lista de times é inválida.",
      });
    }

    // Verificar cache no MongoDB primeiro, a menos que forceUpdate seja true
    if (forceUpdate !== "true") {
      try {
        const dadosMongoDB = await ArtilheiroCampeao.findOne({
          ligaId: ligaId,
        });
        if (
          dadosMongoDB &&
          dadosMongoDB.dados &&
          dadosMongoDB.dados.length > 0
        ) {
          console.log(
            `[CACHE HIT] Artilheiro Acumulado - MongoDB para Liga: ${ligaId}`,
          );
          return res.json({
            success: true,
            ligaId: dadosMongoDB.ligaId,
            dados: dadosMongoDB.dados,
            rodadaAtual: dadosMongoDB.rodadaAtual,
            timestamp: dadosMongoDB.timestamp,
            totalTimes: dadosMongoDB.dados.length,
            totalRodadas: TOTAL_RODADAS,
          });
        }
      } catch (mongoError) {
        console.error("[ERRO] Falha ao buscar dados do MongoDB:", mongoError);
        // Continuar com o processamento mesmo se houver erro no MongoDB
      }
    }

    console.log(
      `[CACHE MISS/FORCED] Processando artilheiro acumulado - Liga: ${ligaId}`,
    );

    // Processar dados acumulados
    const dadosAcumulados = await processarArtilheirosAcumulado(
      liga,
      rodadaAtualCartola,
    );

    // Verificar se temos dados válidos
    if (!dadosAcumulados || dadosAcumulados.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Não foi possível processar os dados acumulados",
      });
    }

    const resultado = {
      success: true,
      ligaId: ligaId,
      dados: dadosAcumulados,
      rodadaAtual: rodadaAtualCartola,
      timestamp: new Date().toISOString(),
      totalTimes: dadosAcumulados.length,
      totalRodadas: TOTAL_RODADAS,
    };

    // Salvar/Atualizar no MongoDB
    try {
      await ArtilheiroCampeao.findOneAndUpdate(
        { ligaId: ligaId },
        {
          ligaId: ligaId,
          rodadaAtual: rodadaAtualCartola,
          dados: dadosAcumulados,
          timestamp: new Date(),
        },
        { upsert: true, new: true }, // upsert: cria se não existir, new: retorna o documento atualizado
      );
      console.log(
        `[MONGO SAVE] Artilheiro Acumulado salvo/atualizado para Liga: ${ligaId}`,
      );
    } catch (mongoError) {
      console.error("[ERRO] Falha ao salvar no MongoDB:", mongoError);
      // Continuar e retornar os dados mesmo se falhar ao salvar no MongoDB
    }

    res.json(resultado);
  } catch (error) {
    console.error("[ERRO] getArtilheiroCampeaoAcumulado:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Processar dados de artilheiros para uma rodada específica
 */
async function processarArtilheirosRodada(liga, rodada) {
  console.log(
    `[PROCESSAMENTO] Iniciando rodada ${rodada} para ${liga.times.length} times`,
  );

  const resultados = [];

  // Buscar dados do ranking geral para critério de desempate
  const rankingGeral = await buscarRankingGeral(liga._id);

  for (const timeId of liga.times) {
    try {
      const dadosTime = await buscarDadosTimeCartola(timeId, rodada);

      if (dadosTime) {
        // Buscar informações adicionais do time
        const timeInfo = (await Time.findOne({ id: timeId })) || {};
        console.log(
          `[DEBUG] processarArtilheirosRodada - timeInfo para ${timeId}: ${JSON.stringify(timeInfo)}`,
        );
        console.log(
          `[DEBUG] processarArtilheirosRodada - escudo para ${timeId}: ${timeInfo.url_escudo_png}`,
        );

        // Buscar pontos da rodada para critério de desempate
        const rodadaInfo =
          (await Rodada.findOne({
            ligaId: liga._id,
            rodada: rodada,
            timeId: timeId,
          })) || {};

        // Buscar pontos do ranking geral
        const rankingInfo = rankingGeral.find((r) => r.timeId == timeId) || {};

        const dadosCompletos = {
          posicao: 0, // Será calculado depois
          timeId: timeId,
          nomeCartoleiro:
            timeInfo.nome_cartoleiro ||
            dadosTime.nome_cartola ||
            "Cartoleiro Desconhecido",
          nomeTime:
            timeInfo.nome_time || dadosTime.nome_time || "Time Desconhecido",
          escudo: timeInfo.url_escudo_png || "",
          golsPro: dadosTime.golsPro,
          golsContra: dadosTime.golsContra,
          saldoGols: dadosTime.golsPro - dadosTime.golsContra,
          pontosRodada: rodadaInfo.pontos || dadosTime.pontos || 0,
          pontosRankingGeral: rankingInfo.pontos || 0,
          posicaoRanking: rankingInfo.posicao || 999,
          jogadores: dadosTime.jogadores || [],
        };

        resultados.push(dadosCompletos);
      }
    } catch (error) {
      console.warn(
        `[AVISO] Erro ao processar time ${timeId} na rodada ${rodada}:`,
        error.message,
      );
    }
  }

  // Ordenar por: 1) Saldo de gols (desc), 2) Gols pró (desc), 3) Pontos ranking geral (desc)
  resultados.sort((a, b) => {
    if (b.saldoGols !== a.saldoGols) {
      return b.saldoGols - a.saldoGols;
    }
    if (b.golsPro !== a.golsPro) {
      return b.golsPro - a.golsPro;
    }
    return b.pontosRankingGeral - a.pontosRankingGeral;
  });

  // Atribuir posições
  resultados.forEach((time, index) => {
    time.posicao = index + 1;
  });

  console.log(
    `[PROCESSAMENTO] Concluído: ${resultados.length} times processados para rodada ${rodada}`,
  );

  return resultados;
}

/**
 * Processar dados acumulados de artilheiros (todas as rodadas)
 */
async function processarArtilheirosAcumulado(liga, rodadaAtual) {
  console.log(
    `[PROCESSAMENTO ACUMULADO] Processando ${liga.times.length} times de R1 até R${rodadaAtual}`,
  );

  const acumulado = {};

  // Buscar ranking geral para pontos
  const rankingGeral = await buscarRankingGeral(liga._id);

  // Inicializar estrutura para cada time
  for (const timeId of liga.times) {
    const timeInfo = (await Time.findOne({ id: timeId })) || {};
    console.log(
      `[DEBUG] processarArtilheirosAcumulado - timeInfo para ${timeId}: ${JSON.stringify(timeInfo)}`,
    );
    console.log(
      `[DEBUG] processarArtilheirosAcumulado - escudo para ${timeId}: ${timeInfo.url_escudo_png}`,
    );
    const rankingInfo = rankingGeral.find((r) => r.timeId == timeId) || {};

    acumulado[timeId] = {
      timeId: timeId,
      nomeCartoleiro: timeInfo.nome_cartoleiro || `Cartoleiro ${timeId}`,
      nomeTime: timeInfo.nome_time || `Time ${timeId}`,
      escudo: timeInfo.url_escudo_png || "",
      golsPro: 0,
      golsContra: 0,
      saldoGols: 0,
      pontosRankingGeral: rankingInfo.pontos || 0,
      posicaoRanking: rankingInfo.posicao || 999,
      rodadasProcessadas: 0,
      jogadores: [],
      detalhePorRodada: {}, // Armazenará os gols por rodada
      totalGolsVerificacao: 0,
    };
  }

  // Processar APENAS as rodadas que já aconteceram (até a rodada atual)
  const rodadaMaxima = rodadaAtual;

  for (let rodada = 1; rodada <= rodadaMaxima; rodada++) {
    console.log(
      `\n[ACUMULADO] === INICIANDO RODADA ${rodada}/${rodadaMaxima} ===`,
    );

    let golsTotalRodada = 0;
    let timesProcessadosRodada = 0;

    // Processar todos os times da rodada atual
    for (const timeId of liga.times) {
      try {
        console.log(
          `[ACUMULADO] Processando Time ${timeId} - Rodada ${rodada}`,
        );

        const dadosTime = await buscarDadosTimeCartola(timeId, rodada);

        if (dadosTime && dadosTime.golsPro !== undefined) {
          // ACUMULAR os gols (não substituir!)
          const golsProAntes = acumulado[timeId].golsPro;
          const golsContraAntes = acumulado[timeId].golsContra;

          acumulado[timeId].golsPro += dadosTime.golsPro;
          acumulado[timeId].golsContra += dadosTime.golsContra;
          acumulado[timeId].rodadasProcessadas++;

          // Log detalhado da acumulação
          console.log(`[ACUMULADO] Time ${timeId} R${rodada}:`);
          console.log(
            `  - Gols R${rodada}: ${dadosTime.golsPro} pró, ${dadosTime.golsContra} contra`,
          );
          console.log(
            `  - Antes: ${golsProAntes} pró, ${golsContraAntes} contra`,
          );
          console.log(
            `  - DEPOIS: ${acumulado[timeId].golsPro} pró, ${acumulado[timeId].golsContra} contra`,
          );

          // Guardar detalhes da rodada
          acumulado[timeId].detalhePorRodada[rodada] = {
            golsPro: dadosTime.golsPro,
            golsContra: dadosTime.golsContra,
            saldo: dadosTime.golsPro - dadosTime.golsContra,
            pontos: dadosTime.pontos || 0,
            jogadores: dadosTime.jogadores || [],
          };

          golsTotalRodada += dadosTime.golsPro;
          timesProcessadosRodada++;
        } else {
          console.warn(
            `[ACUMULADO] Dados inválidos ou ausentes para time ${timeId} na rodada ${rodada}`,
          );

          // Adicionar rodada vazia para manter consistência
          acumulado[timeId].detalhePorRodada[rodada] = {
            golsPro: 0,
            golsContra: 0,
            saldo: 0,
            pontos: 0,
            jogadores: [],
          };
        }
      } catch (error) {
        console.error(
          `[ACUMULADO] Erro ao processar time ${timeId} na rodada ${rodada}:`,
          error.message,
        );

        // Adicionar rodada vazia em caso de erro
        acumulado[timeId].detalhePorRodada[rodada] = {
          golsPro: 0,
          golsContra: 0,
          saldo: 0,
          pontos: 0,
          jogadores: [],
          erro: true,
        };
      }
    }

    console.log(
      `[ACUMULADO] Rodada ${rodada} concluída. Gols totais: ${golsTotalRodada}, Times processados: ${timesProcessadosRodada}`,
    );
  }

  // Converter o mapa acumulado de volta para um array
  let resultadosAcumulados = Object.values(acumulado);

  // Calcular saldo de gols final
  resultadosAcumulados.forEach((time) => {
    time.saldoGols = time.golsPro - time.golsContra;

    // Criar array de gols por rodada para facilitar o frontend
    time.golsPorRodada = [];
    for (let i = 1; i <= TOTAL_RODADAS; i++) {
      if (i <= rodadaAtual) {
        // Rodadas já ocorridas
        const dadosRodada = time.detalhePorRodada[i] || {
          golsPro: 0,
          golsContra: 0,
          saldo: 0,
        };
        time.golsPorRodada.push({
          rodada: i,
          golsPro: dadosRodada.golsPro,
          golsContra: dadosRodada.golsContra,
          saldo: dadosRodada.saldo,
          ocorreu: true,
        });
      } else {
        // Rodadas futuras
        time.golsPorRodada.push({
          rodada: i,
          golsPro: 0,
          golsContra: 0,
          saldo: 0,
          ocorreu: false,
        });
      }
    }
  });

  // Ordenar por: 1) Saldo de gols (desc), 2) Gols pró (desc), 3) Pontos ranking geral (desc)
  resultadosAcumulados.sort((a, b) => {
    if (b.saldoGols !== a.saldoGols) {
      return b.saldoGols - a.saldoGols;
    }
    if (b.golsPro !== a.golsPro) {
      return b.golsPro - a.golsPro;
    }
    return b.pontosRankingGeral - a.pontosRankingGeral;
  });

  // Atribuir posições
  resultadosAcumulados.forEach((time, index) => {
    time.posicao = index + 1;
  });

  console.log(
    `[PROCESSAMENTO ACUMULADO] Concluído: ${resultadosAcumulados.length} times acumulados`,
  );

  return resultadosAcumulados;
}

// Função auxiliar para buscar dados de um time específico na API do Cartola
async function buscarDadosTimeCartola(timeId, rodada) {
  const cacheKey = `cartola_time_${timeId}_${rodada}`;
  const dadosCache = cache.get(cacheKey);

  if (dadosCache) {
    return dadosCache;
  }

  try {
    const url = `${CARTOLA_API_BASE}/time/id/${timeId}/${rodada}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(
        `[CARTOLA API] Falha ao buscar dados do time ${timeId} na rodada ${rodada}: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = await response.json();

    let golsPro = 0;
    let golsContra = 0;
    const jogadoresComGols = [];

    if (data.atletas && Array.isArray(data.atletas)) {
      data.atletas.forEach((atleta) => {
        if (atleta.scout) {
          const gols = parseInt(atleta.scout.G) || 0;
          if (gols > 0) {
            golsPro += gols;
            jogadoresComGols.push({
              nome: atleta.apelido,
              gols: gols,
            });
          }

          // Gols contra para goleiros e zagueiros
          if (atleta.posicao_id === 1 || atleta.posicao_id === 2) {
            const gc = parseInt(atleta.scout.GC) || 0;
            golsContra += gc;
          }
        }
      });
    }

    const resultado = {
      nome_time: data.time?.nome || "",
      nome_cartola: data.time?.nome_cartola || "",
      url_escudo_png: data.time?.url_escudo_png || "",
      golsPro: golsPro,
      golsContra: golsContra,
      pontos: data.pontos || 0,
      jogadores: jogadoresComGols,
    };

    cache.set(cacheKey, resultado);
    return resultado;
  } catch (error) {
    console.error(
      `[CARTOLA API] Erro ao buscar dados do time ${timeId} na rodada ${rodada}:`,
      error.message,
    );
    return null;
  }
}

// Função auxiliar para buscar ranking geral da liga
async function buscarRankingGeral(ligaId) {
  const cacheKey = `ranking_geral_${ligaId}`;
  const dadosCache = cache.get(cacheKey);

  if (dadosCache) {
    return dadosCache;
  }

  try {
    const url = `${CARTOLA_API_BASE}/ligas/${ligaId}/ranking`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(
        `[CARTOLA API] Falha ao buscar ranking geral da liga ${ligaId}: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data = await response.json();

    const ranking = data.times.map((time, index) => ({
      timeId: time.time_id,
      pontos: time.pontos,
      posicao: index + 1,
    }));

    cache.set(cacheKey, ranking);
    return ranking;
  } catch (error) {
    console.error(
      `[CARTOLA API] Erro ao buscar ranking geral da liga ${ligaId}:`,
      error.message,
    );
    return [];
  }
}
