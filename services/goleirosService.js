// ✅ services/goleirosService.js v2.0
// Fix baseado na estrutura REAL da API do Cartola FC 2025
// + Suporte a participantes inativos

import Goleiros from "../models/Goleiros.js";
import fetch from "node-fetch";
import {
  buscarStatusParticipantes,
  obterUltimaRodadaValida,
  ordenarRankingComInativos,
} from "../utils/participanteHelper.js";

console.log(
  "[GOLEIROS-SERVICE] ✅ Serviço carregado com correções da API 2025 + suporte inativos",
);

// ===== CACHE DE ATLETAS PONTUADOS (para parciais) =====
let atletasPontuadosCache = null;
let atletasPontuadosTimestamp = 0;
const CACHE_TTL = 60000; // 1 minuto

// ===== FUNÇÃO: Buscar atletas pontuados (parciais ao vivo) =====
async function buscarAtletasPontuados() {
  const agora = Date.now();

  // Usar cache se ainda válido
  if (atletasPontuadosCache && agora - atletasPontuadosTimestamp < CACHE_TTL) {
    console.log(
      `📦 [PONTUADOS] Usando cache (${Math.round((agora - atletasPontuadosTimestamp) / 1000)}s)`,
    );
    return atletasPontuadosCache;
  }

  console.log(`🔄 [PONTUADOS] Buscando atletas pontuados...`);

  try {
    const response = await fetch(
      "https://api.cartolafc.globo.com/atletas/pontuados",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        timeout: 10000,
      },
    );

    if (!response.ok) {
      console.warn(`⚠️ [PONTUADOS] API retornou ${response.status}`);
      return null;
    }

    const dados = await response.json();

    if (dados.atletas) {
      atletasPontuadosCache = dados.atletas;
      atletasPontuadosTimestamp = agora;
      console.log(
        `✅ [PONTUADOS] ${Object.keys(dados.atletas).length} atletas pontuados carregados`,
      );
      return dados.atletas;
    }

    return null;
  } catch (error) {
    console.error(`❌ [PONTUADOS] Erro:`, error.message);
    return null;
  }
}

// ===== FUNÇÃO CORRIGIDA: buscarDadosTimeRodada =====
async function buscarDadosTimeRodada(
  participanteId,
  rodada,
  rodadaParcial = false,
) {
  console.log(
    `🔍 [API-CARTOLA] Buscando time ${participanteId} rodada ${rodada} ${rodadaParcial ? "(PARCIAL)" : ""}`,
  );

  try {
    const url = `https://api.cartolafc.globo.com/time/id/${participanteId}/${rodada}`;
    console.log(`📡 [API-CARTOLA] URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      timeout: 10000,
    });

    console.log(`📊 [API-CARTOLA] Response status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(
          `⚠️ [API-CARTOLA] Time ${participanteId} não encontrado na rodada ${rodada}`,
        );
        return {
          participanteId,
          rodada,
          goleiro: null,
          pontos: 0,
          dataColeta: new Date(),
        };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const dados = await response.json();
    console.log(`📊 [API-CARTOLA] Dados recebidos:`, {
      temAtletas: !!dados.atletas,
      totalAtletas: dados.atletas ? dados.atletas.length : 0,
      pontos: dados.pontos || 0,
      estrutura: Array.isArray(dados.atletas) ? "ARRAY" : "OBJECT",
    });

    // ✅ Se rodada parcial, buscar pontuações ao vivo
    let atletasPontuados = null;
    if (rodadaParcial) {
      atletasPontuados = await buscarAtletasPontuados();
      console.log(
        `🔥 [API-CARTOLA] Modo PARCIAL - cruzando com atletas pontuados`,
      );
    }

    // ✅ CORREÇÃO: Procurar goleiro na estrutura ATUAL (ARRAY)
    let goleiro = null;

    if (dados.atletas && Array.isArray(dados.atletas)) {
      // ✅ Nova estrutura: atletas é um ARRAY
      console.log(
        `🔍 [API-CARTOLA] Processando array de ${dados.atletas.length} atletas`,
      );

      for (const atleta of dados.atletas) {
        if (atleta.posicao_id === 1) {
          // Posição 1 = Goleiro
          let pontosGoleiro = parseFloat(atleta.pontos_num) || 0;

          // ✅ Se parcial e pontos = 0, buscar nos atletas pontuados
          if (rodadaParcial && atletasPontuados && atleta.atleta_id) {
            const pontuado = atletasPontuados[atleta.atleta_id];
            if (pontuado && pontuado.pontuacao !== undefined) {
              pontosGoleiro = parseFloat(pontuado.pontuacao) || 0;
              console.log(
                `🔥 [API-CARTOLA] Pontuação PARCIAL do goleiro: ${pontosGoleiro}`,
              );
            }
          }

          goleiro = {
            id: atleta.atleta_id,
            nome: atleta.apelido || atleta.nome || "Goleiro",
            clube: getClubeName(atleta.clube_id),
            pontos: pontosGoleiro,
            status: getStatusName(atleta.status_id),
            clubeId: atleta.clube_id,
          };

          console.log(`🥅 [API-CARTOLA] Goleiro encontrado:`, {
            nome: goleiro.nome,
            pontos: goleiro.pontos,
            clube: goleiro.clube,
            status: goleiro.status,
            parcial: rodadaParcial,
          });
          break;
        }
      }
    } else if (dados.atletas && typeof dados.atletas === "object") {
      // ✅ Estrutura antiga: atletas é um OBJECT (fallback)
      console.log(
        `🔍 [API-CARTOLA] Processando objeto de atletas (estrutura antiga)`,
      );

      for (const atletaId in dados.atletas) {
        const atleta = dados.atletas[atletaId];

        if (atleta.posicao_id === 1) {
          // Posição 1 = Goleiro
          let pontosGoleiro = parseFloat(atleta.pontos_num) || 0;

          // ✅ Se parcial e pontos = 0, buscar nos atletas pontuados
          if (rodadaParcial && atletasPontuados) {
            const pontuado = atletasPontuados[atletaId];
            if (pontuado && pontuado.pontuacao !== undefined) {
              pontosGoleiro = parseFloat(pontuado.pontuacao) || 0;
            }
          }

          goleiro = {
            id: parseInt(atletaId),
            nome: atleta.apelido || atleta.nome,
            clube: getClubeName(atleta.clube_id),
            pontos: pontosGoleiro,
            status: getStatusName(atleta.status_id),
            clubeId: atleta.clube_id,
          };
          console.log(
            `🥅 [API-CARTOLA] Goleiro encontrado (estrutura antiga):`,
            goleiro,
          );
          break;
        }
      }
    }

    if (!goleiro) {
      console.log(
        `⚠️ [API-CARTOLA] Nenhum goleiro encontrado para ${participanteId} R${rodada}`,
      );
    }

    return {
      participanteId,
      rodada,
      goleiro,
      pontos: parseFloat(dados.pontos) || 0,
      dataColeta: new Date(),
    };
  } catch (error) {
    console.error(
      `❌ [API-CARTOLA] Erro ao buscar ${participanteId} R${rodada}:`,
      error.message,
    );
    return {
      participanteId,
      rodada,
      goleiro: null,
      pontos: 0,
      dataColeta: new Date(),
      erro: error.message,
    };
  }
}

// ===== FUNÇÕES AUXILIARES =====

function getClubeName(clubeId) {
  const clubes = {
    262: "Flamengo",
    263: "Botafogo",
    264: "Corinthians",
    265: "Grêmio",
    266: "Fluminense",
    267: "Vasco",
    268: "Cruzeiro",
    269: "Atlético-MG",
    270: "São Paulo",
    271: "Santos",
    272: "Palmeiras",
    273: "Internacional",
    275: "Palmeiras",
    276: "São Paulo",
    277: "Santos",
    278: "Corinthians",
    279: "Flamengo",
    280: "Red Bull Bragantino",
    281: "Atlético-GO",
    282: "Ceará",
    283: "Cruzeiro",
    284: "Bahia",
    285: "Sport",
    286: "Vasco",
    287: "Goiás",
    288: "Coritiba",
    289: "Avaí",
    290: "Juventude",
    354: "Ceará",
    355: "Fortaleza",
  };
  return clubes[clubeId] || `Clube ${clubeId}`;
}

function getStatusName(statusId) {
  const status = {
    2: "duvida",
    3: "suspenso",
    4: "contundido",
    5: "nulo",
    6: "possivel_escalacao",
    7: "escalado",
  };
  return status[statusId] || "desconhecido";
}

// ===== FUNÇÃO CORRIGIDA: obterParticipantesLiga =====
async function obterParticipantesLiga(ligaId) {
  console.log(`👥 [PARTICIPANTES] Buscando participantes da liga ${ligaId}`);

  // ✅ CORREÇÃO: Fallback hardcoded para Liga Sobral
  const participantesHardcoded = {
    "684d821cf1a7ae16d1f89572": [
      {
        id: 1926323,
        nome: "Daniel Barbosa",
        nomeTime: "Daniel Barbosa",
        clubeId: 262,
        assinante: false,
      },
      {
        id: 13935277,
        nome: "Paulinett Miranda",
        nomeTime: "Paulinett Miranda",
        clubeId: 263,
        assinante: false,
      },
      {
        id: 14747183,
        nome: "Carlos Henrique",
        nomeTime: "Carlos Henrique",
        clubeId: 264,
        assinante: false,
      },
      {
        id: 49149009,
        nome: "Matheus Coutinho",
        nomeTime: "Matheus Coutinho",
        clubeId: 266,
        assinante: false,
      },
      {
        id: 49149388,
        nome: "Junior Brasilino",
        nomeTime: "Junior Brasilino",
        clubeId: 267,
        assinante: false,
      },
      {
        id: 50180257,
        nome: "Hivisson",
        nomeTime: "Hivisson",
        clubeId: 275,
        assinante: false,
      },
    ],
  };

  // ✅ Se é Liga Sobral, usar dados hardcoded
  if (participantesHardcoded[ligaId]) {
    console.log(
      `✅ [PARTICIPANTES] Usando dados hardcoded para liga ${ligaId}`,
    );
    const participantes = participantesHardcoded[ligaId];
    console.log(
      `✅ [PARTICIPANTES] ${participantes.length} participantes hardcoded:`,
      participantes.map((p) => `${p.nome} (${p.id})`),
    );
    return participantes;
  }

  try {
    const url = `https://api.cartolafc.globo.com/liga/${ligaId}`;
    console.log(`📡 [PARTICIPANTES] URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      timeout: 10000,
    });

    console.log(`📊 [PARTICIPANTES] Response status: ${response.status}`);

    if (!response.ok) {
      console.log(
        `⚠️ [PARTICIPANTES] API falhou, tentando fallback hardcoded...`,
      );
      if (participantesHardcoded[ligaId]) {
        return participantesHardcoded[ligaId];
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const dados = await response.json();
    console.log(`📊 [PARTICIPANTES] Liga dados:`, {
      nome: dados.nome,
      totalTimes: dados.times ? dados.times.length : 0,
    });

    if (!dados.times || dados.times.length === 0) {
      console.log(
        `⚠️ [PARTICIPANTES] Sem dados da API, usando fallback hardcoded...`,
      );
      if (participantesHardcoded[ligaId]) {
        return participantesHardcoded[ligaId];
      }
      throw new Error("Nenhum participante encontrado na liga");
    }

    const participantes = dados.times.map((time) => ({
      id: time.time_id || time.id,
      nome: time.nome_cartola || time.nome,
      nomeTime: time.nome,
      clubeId: time.clube_id,
      assinante: time.assinante || false,
    }));

    console.log(
      `✅ [PARTICIPANTES] ${participantes.length} participantes encontrados:`,
      participantes.map((p) => `${p.nome} (${p.id})`),
    );

    return participantes;
  } catch (error) {
    console.error(`❌ [PARTICIPANTES] Erro:`, error);

    // ✅ Última tentativa: usar dados hardcoded
    if (participantesHardcoded[ligaId]) {
      console.log(
        `🔄 [PARTICIPANTES] Usando dados hardcoded como último recurso`,
      );
      return participantesHardcoded[ligaId];
    }

    throw error;
  }
}

// ===== FUNÇÃO CORRIGIDA: verificarStatusRodada =====
async function verificarStatusRodada(rodada) {
  console.log(`📅 [STATUS-RODADA] Verificando rodada ${rodada}`);

  try {
    const url = `https://api.cartolafc.globo.com/mercado/status`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      timeout: 5000,
    });

    if (!response.ok) {
      console.log(
        `⚠️ [STATUS-RODADA] Erro ${response.status}, assumindo rodada ${rodada} como concluída`,
      );
      return { concluida: true, rodadaAtual: rodada };
    }

    const dados = await response.json();
    const rodadaAtual = dados.rodada_atual || 0;
    // ✅ CORREÇÃO: status_mercado === 2 significa mercado FECHADO (rodada em andamento)
    const mercadoFechado = dados.status_mercado === 2;

    // ✅ CORREÇÃO CRÍTICA:
    // - Rodada concluída = rodada MENOR que a atual (já passou)
    // - Rodada atual com mercado fechado = EM ANDAMENTO (parcial), NÃO concluída!
    const concluida = rodada < rodadaAtual;

    console.log(`📊 [STATUS-RODADA] Status:`, {
      rodadaAtual,
      rodadaSolicitada: rodada,
      statusMercado: dados.status_mercado,
      mercadoFechado,
      concluida,
      parcial: rodada === rodadaAtual && mercadoFechado,
    });

    return {
      concluida,
      rodadaAtual,
      mercadoFechado,
    };
  } catch (error) {
    console.error(`❌ [STATUS-RODADA] Erro:`, error.message);
    // Em caso de erro, assume que rodadas passadas estão concluídas
    return { concluida: rodada <= 14, rodadaAtual: 15 };
  }
}

// ===== FUNÇÃO PRINCIPAL CORRIGIDA: coletarDadosGoleiros =====
export async function coletarDadosGoleiros(ligaId, rodadaInicio, rodadaFim) {
  console.log(
    `🔄 [GOLEIROS-SERVICE] Iniciando coleta: ${rodadaInicio} a ${rodadaFim}`,
  );

  try {
    // Obter participantes da liga
    const participantes = await obterParticipantesLiga(ligaId);
    console.log(
      `👥 [GOLEIROS-SERVICE] Participantes encontrados: ${participantes.length}`,
    );

    if (participantes.length === 0) {
      throw new Error("Nenhum participante encontrado na liga");
    }

    let totalColetados = 0;
    let totalErros = 0;

    // Processar cada rodada
    for (let rodada = rodadaInicio; rodada <= rodadaFim; rodada++) {
      console.log(
        `🔄 [GOLEIROS-SERVICE] ===== PROCESSANDO RODADA ${rodada} =====`,
      );

      // Verificar se rodada já foi processada CORRETAMENTE
      const registrosExistentes = await Goleiros.find({
        ligaId,
        rodada,
        rodadaConcluida: true, // ✅ Só considera concluídas
      }).exec();

      // ✅ CORREÇÃO: Só pular se TODOS os participantes foram processados E têm dados válidos E rodada concluída
      const participantesProcessados = registrosExistentes.filter(
        (r) => r.goleiroNome !== "Sem goleiro" || r.pontos > 0,
      );

      // Verificar se rodada está concluída
      const statusRodada = await verificarStatusRodada(rodada);
      const rodadaParcial = !statusRodada.concluida;
      console.log(`📊 [GOLEIROS-SERVICE] Status rodada ${rodada}:`, {
        ...statusRodada,
        parcial: rodadaParcial,
      });

      // ✅ Se rodada concluída e todos processados, pular
      // ✅ Se rodada parcial, sempre atualizar (dados podem mudar)
      if (
        statusRodada.concluida &&
        participantesProcessados.length === participantes.length
      ) {
        console.log(
          `✅ [GOLEIROS-SERVICE] Rodada ${rodada} já processada e concluída`,
        );
        continue;
      }

      // Coletar dados de cada participante na rodada
      for (const participante of participantes) {
        try {
          console.log(
            `🔍 [GOLEIROS-SERVICE] === ${participante.nome} - Rodada ${rodada} ${rodadaParcial ? "(PARCIAL)" : ""} ===`,
          );

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));

          // ✅ CORREÇÃO: Usar função corrigida com flag de parcial
          const dadosTime = await buscarDadosTimeRodada(
            participante.id,
            rodada,
            rodadaParcial, // ✅ Passar flag para buscar pontuação parcial
          );

          if (dadosTime) {
            console.log(`📊 [GOLEIROS-SERVICE] Dados obtidos:`, {
              participante: participante.nome,
              rodada,
              temGoleiro: !!dadosTime.goleiro,
              nomeGoleiro: dadosTime.goleiro?.nome || "Sem goleiro",
              pontosGoleiro: dadosTime.goleiro?.pontos || 0,
              pontosTime: dadosTime.pontos || 0,
              parcial: rodadaParcial,
            });

            // ✅ CORREÇÃO: Marcar como parcial ou concluída
            const registro = {
              ligaId,
              participanteId: participante.id,
              participanteNome: participante.nome,
              rodada,
              goleiroId: dadosTime.goleiro?.id || null,
              goleiroNome: dadosTime.goleiro?.nome || null,
              goleiroClube: dadosTime.goleiro?.clube || null,
              pontos: dadosTime.goleiro?.pontos || 0,
              status: dadosTime.goleiro
                ? dadosTime.goleiro.status
                : "sem_goleiro",
              dataColeta: new Date(),
              rodadaConcluida: !rodadaParcial, // ✅ false se parcial
            };

            const resultado = await Goleiros.findOneAndUpdate(
              { ligaId, participanteId: participante.id, rodada },
              registro,
              { upsert: true, new: true },
            );

            totalColetados++;
            console.log(
              `✅ [GOLEIROS-SERVICE] Salvo: ${participante.nome} R${rodada} - ${resultado._id} ${rodadaParcial ? "(PARCIAL)" : ""}`,
            );
          } else {
            console.log(
              `⚠️ [GOLEIROS-SERVICE] Sem dados para ${participante.nome} R${rodada}`,
            );
          }
        } catch (error) {
          totalErros++;
          console.error(
            `❌ [GOLEIROS-SERVICE] Erro ${participante.nome} R${rodada}:`,
            error.message,
          );
        }
      }

      // Pausa entre rodadas
      console.log(`⏸️ [GOLEIROS-SERVICE] Pausa entre rodadas...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`✅ [GOLEIROS-SERVICE] COLETA FINALIZADA:`, {
      totalColetados,
      totalErros,
      rodadas: `${rodadaInicio}-${rodadaFim}`,
    });

    return {
      success: true,
      totalColetados,
      totalErros,
      message: `Coleta concluída: ${totalColetados} registros processados`,
    };
  } catch (error) {
    console.error(`❌ [GOLEIROS-SERVICE] Erro na coleta:`, error);
    throw error;
  }
}

// ===== FUNÇÃO CORRIGIDA: gerarRankingGoleiros =====
async function gerarRankingGoleiros(ligaId, rodadaInicio, rodadaFim) {
  console.log(`🏆 [RANKING] Gerando ranking: ${rodadaInicio} a ${rodadaFim}`);

  try {
    // Buscar todos os dados da faixa de rodadas
    const dados = await Goleiros.find({
      ligaId,
      rodada: { $gte: rodadaInicio, $lte: rodadaFim },
      rodadaConcluida: true,
    }).exec();

    console.log(`📊 [RANKING] Dados encontrados: ${dados.length} registros`);

    // Agrupar por participante
    const participantesMap = new Map();

    dados.forEach((registro) => {
      const participanteId = registro.participanteId;

      if (!participantesMap.has(participanteId)) {
        participantesMap.set(participanteId, {
          participanteId,
          participanteNome: registro.participanteNome,
          pontosTotais: 0,
          totalJogos: 0,
          rodadasJogadas: 0,
          melhorRodada: 0,
          piorRodada: 999,
          ultimaRodada: null,
          detalhes: [],
        });
      }

      const participante = participantesMap.get(participanteId);

      // ✅ CORREÇÃO: Somar pontos se tiver goleiro OU pontos válidos
      if (registro.goleiroNome || registro.pontos !== 0) {
        participante.pontosTotais += registro.pontos || 0;
        participante.totalJogos++;

        const pontosRodada = registro.pontos || 0;

        if (pontosRodada > participante.melhorRodada) {
          participante.melhorRodada = pontosRodada;
        }

        if (
          pontosRodada < participante.piorRodada ||
          participante.piorRodada === 999
        ) {
          participante.piorRodada = pontosRodada;
        }
      }

      participante.rodadasJogadas++;

      // Última rodada (maior número de rodada)
      if (
        !participante.ultimaRodada ||
        registro.rodada > participante.ultimaRodada.rodada
      ) {
        participante.ultimaRodada = {
          rodada: registro.rodada,
          goleiroNome: registro.goleiroNome || "Sem goleiro",
          goleiroClube: registro.goleiroClube || "",
          pontos: registro.pontos || 0,
        };
      }

      participante.detalhes.push(registro);
    });

    // Converter para array e ordenar
    const ranking = Array.from(participantesMap.values())
      .map((p, index) => ({
        posicao: index + 1,
        ...p,
        mediaPontos:
          p.totalJogos > 0
            ? (p.pontosTotais / p.totalJogos).toFixed(2)
            : "0.00",
      }))
      .sort((a, b) => b.pontosTotais - a.pontosTotais)
      .map((p, index) => ({
        ...p,
        posicao: index + 1,
      }));

    console.log(`🏆 [RANKING] Ranking gerado: ${ranking.length} participantes`);
    console.log(
      `🥇 [RANKING] Líder: ${ranking[0]?.participanteNome} com ${ranking[0]?.pontosTotais} pontos`,
    );

    return ranking;
  } catch (error) {
    console.error(`❌ [RANKING] Erro:`, error);
    throw error;
  }
}

// ===== FUNÇÃO PRINCIPAL: obterRankingGoleiros =====
export async function obterRankingGoleiros(
  ligaId,
  rodadaInicio = 1,
  rodadaFim = null,
) {
  console.log(`🥅 [GOLEIROS-SERVICE] ===== INICIANDO RANKING GOLEIROS =====`);
  console.log(`📋 [GOLEIROS-SERVICE] Parâmetros:`, {
    ligaId,
    rodadaInicio,
    rodadaFim,
  });

  try {
    // Detectar rodada fim se não especificada
    // ✅ CORREÇÃO: Se mercado fechado, incluir rodada atual (parciais)
    let mercadoFechado = false;
    let rodadaAtualAPI = 35;

    if (!rodadaFim) {
      try {
        const statusMercado = await verificarStatusRodada(999);
        rodadaAtualAPI = statusMercado.rodadaAtual || 35;
        mercadoFechado = statusMercado.mercadoFechado || false;

        // Se mercado FECHADO → incluir rodada atual (parciais ao vivo)
        // Se mercado ABERTO → usar rodada anterior (consolidada)
        // ✅ CORREÇÃO: Se rodada >= 38, sempre usar 38 (temporada encerrada)
        if (rodadaAtualAPI >= 38) {
          rodadaFim = 38;
          console.log(
            `🏁 [GOLEIROS-SERVICE] Temporada encerrada - usando R38`,
          );
        } else if (mercadoFechado) {
          rodadaFim = rodadaAtualAPI;
          console.log(
            `🔥 [GOLEIROS-SERVICE] Mercado FECHADO - incluindo parciais R${rodadaFim}`,
          );
        } else {
          rodadaFim = Math.max(1, rodadaAtualAPI - 1);
          console.log(
            `📊 [GOLEIROS-SERVICE] Mercado ABERTO - até R${rodadaFim}`,
          );
        }
      } catch (error) {
        rodadaFim = 35; // fallback
        console.log(
          `⚠️ [GOLEIROS-SERVICE] Usando rodada fim padrão: ${rodadaFim}`,
        );
      }
    }

    // Verificar dados existentes (incluindo parciais)
    const registrosExistentes = await Goleiros.find({
      ligaId,
      rodada: { $gte: rodadaInicio, $lte: rodadaFim },
      // ✅ Buscar todos, não só concluídos
    }).exec();

    console.log(`📊 [GOLEIROS-SERVICE] Registros no MongoDB:`, {
      total: registrosExistentes.length,
      rodadasCobertas: [
        ...new Set(registrosExistentes.map((r) => r.rodada)),
      ].sort(),
      participantesUnicos: [
        ...new Set(registrosExistentes.map((r) => r.participanteId)),
      ].length,
      comGoleiro: registrosExistentes.filter(
        (r) => r.goleiroNome && r.goleiroNome !== "Sem goleiro",
      ).length,
      parciais: registrosExistentes.filter((r) => !r.rodadaConcluida).length,
    });

    // Se não há dados suficientes, forçar coleta
    if (registrosExistentes.length < 10) {
      console.log(
        `⚠️ [GOLEIROS-SERVICE] Poucos dados encontrados, iniciando coleta...`,
      );
      await coletarDadosGoleiros(ligaId, rodadaInicio, rodadaFim);
    }

    // ✅ NOVO: Se mercado fechado, SEMPRE coletar parciais da rodada atual
    if (mercadoFechado && rodadaAtualAPI) {
      const parciaisRodadaAtual = registrosExistentes.filter(
        (r) => r.rodada === rodadaAtualAPI,
      );

      // Se não tem dados da rodada atual OU se são muito antigos (>2min), coletar
      const precisaAtualizar =
        parciaisRodadaAtual.length === 0 ||
        parciaisRodadaAtual.some((r) => {
          const idadeMs = Date.now() - new Date(r.dataColeta).getTime();
          return idadeMs > 2 * 60 * 1000; // 2 minutos
        });

      if (precisaAtualizar) {
        console.log(
          `🔥 [GOLEIROS-SERVICE] Coletando parciais R${rodadaAtualAPI}...`,
        );
        await coletarDadosGoleiros(ligaId, rodadaAtualAPI, rodadaAtualAPI);
      }
    }

    // Mapear participantes hardcoded com escudos corretos (baseado em participantes.js)
    const participantesMap = {
      1926323: { nome: "Daniel Barbosa", clubeId: 262 }, // Flamengo
      13935277: { nome: "Paulinett Miranda", clubeId: 263 }, // Botafogo
      14747183: { nome: "Carlos Henrique", clubeId: 264 }, // Corinthians
      49149009: { nome: "Matheus Coutinho", clubeId: 266 }, // Fluminense
      49149388: { nome: "Junior Brasilino", clubeId: 267 }, // Vasco
      50180257: { nome: "Hivisson", clubeId: 275 }, // Palmeiras
    };

    // ✅ NOVO: Buscar status de participantes (ativos/inativos)
    const timeIds = Object.keys(participantesMap).map((id) => parseInt(id));
    const statusMap = await buscarStatusParticipantes(timeIds);
    console.log(`👥 [GOLEIROS-SERVICE] Status participantes:`, statusMap);

    // Gerar ranking
    const ranking = [];

    for (const participanteId of Object.keys(participantesMap)) {
      const timeId = parseInt(participanteId);
      const participanteInfo = participantesMap[participanteId];
      const nome = participanteInfo.nome;
      const clubeId = participanteInfo.clubeId;

      // ✅ NOVO: Obter status do participante
      const statusParticipante = statusMap[String(timeId)] || { ativo: true };
      const isAtivo = statusParticipante.ativo !== false;

      // ✅ NOVO: Limitar rodadaFim para participantes inativos
      const rodadaFimParticipante = obterUltimaRodadaValida(
        statusParticipante,
        rodadaFim,
      );

      if (!isAtivo) {
        console.log(
          `⏸️ [GOLEIROS-SERVICE] Participante inativo: ${nome} - dados até R${rodadaFimParticipante}`,
        );
      }

      // Buscar dados do participante (limitado para inativos)
      const dadosParticipante = await Goleiros.find({
        ligaId,
        participanteId: timeId,
        rodada: { $gte: rodadaInicio, $lte: rodadaFimParticipante }, // ✅ Limitado
      }).sort({ rodada: 1 });

      // Calcular estatísticas
      const pontosTotais = dadosParticipante.reduce(
        (acc, item) => acc + (item.pontos || 0),
        0,
      );
      const rodadasJogadas = dadosParticipante.length;
      const ultimaRodada = dadosParticipante[dadosParticipante.length - 1];

      // ✅ NOVO: Mapear todas as rodadas para exibição em colunas
      const rodadas = dadosParticipante.map((item) => ({
        rodada: item.rodada,
        pontos: parseFloat((item.pontos || 0).toFixed(2)),
        goleiroNome: item.goleiroNome || "Sem goleiro",
        goleiroClube: item.goleiroClube || "",
        parcial: !item.rodadaConcluida, // ✅ Flag para UI destacar
      }));

      ranking.push({
        participanteId: timeId,
        participanteNome: nome,
        clubeId: clubeId,
        pontosTotais: parseFloat(pontosTotais.toFixed(2)),
        rodadasJogadas,
        totalJogos: rodadasJogadas,
        rodadas, // ✅ NOVO: Array completo de rodadas
        ultimaRodada: ultimaRodada
          ? {
              rodada: ultimaRodada.rodada,
              goleiroNome: ultimaRodada.goleiroNome,
              goleiroClube: ultimaRodada.goleiroClube,
              pontos: parseFloat((ultimaRodada.pontos || 0).toFixed(2)),
            }
          : null,
        // ✅ NOVO: Campos de status
        ativo: isAtivo,
        rodada_desistencia: statusParticipante.rodada_desistencia || null,
      });

      console.log(
        `✅ Processado ${nome}: ${pontosTotais.toFixed(2)} pontos em ${rodadasJogadas} rodadas ${!isAtivo ? "(INATIVO)" : ""}`,
      );
    }

    // ✅ NOVO: Ordenar com ativos primeiro, depois inativos
    const sortFn = (a, b) => b.pontosTotais - a.pontosTotais;
    const rankingOrdenado = ordenarRankingComInativos(ranking, sortFn);

    // ✅ NOVO: Atribuir posições (null para inativos)
    let posAtivo = 0;
    rankingOrdenado.forEach((p) => {
      if (p.ativo !== false) {
        posAtivo++;
        p.posicao = posAtivo;
      } else {
        p.posicao = null; // Inativos sem posição
      }
    });

    // ✅ NOVO: Contar ativos e inativos
    const participantesAtivos = rankingOrdenado.filter(
      (p) => p.ativo !== false,
    ).length;
    const participantesInativos = rankingOrdenado.filter(
      (p) => p.ativo === false,
    ).length;

    const resultado = {
      ranking: rankingOrdenado,
      rodadaInicio,
      rodadaFim,
      rodadaParcial: mercadoFechado ? rodadaAtualAPI : null, // ✅ Flag para UI
      mercadoFechado, // ✅ Status do mercado
      totalParticipantes: rankingOrdenado.length,
      participantesAtivos, // ✅ NOVO
      participantesInativos, // ✅ NOVO
      dataGeracao: new Date(),
    };

    console.log(`✅ [GOLEIROS-SERVICE] RESULTADO FINAL:`, {
      totalParticipantes: rankingOrdenado.length,
      participantesAtivos,
      participantesInativos,
      lider: rankingOrdenado[0]?.participanteNome || "N/D",
      pontosLider: rankingOrdenado[0]?.pontosTotais || 0,
      rodadaParcial: resultado.rodadaParcial,
    });

    return resultado;
  } catch (error) {
    console.error(`❌ [GOLEIROS-SERVICE] Erro no ranking:`, error);
    throw error;
  }
}

// ===== FUNÇÃO DE DETECÇÃO DE RODADA =====
export async function detectarUltimaRodadaConcluida() {
  console.log(`📅 [DETECCAO] Detectando última rodada concluída`);

  try {
    const statusRodada = await verificarStatusRodada(999);
    const rodadaAtual = statusRodada.rodadaAtual || 15;
    const mercadoFechado = statusRodada.mercadoFechado || false;

    let recomendacao;
    if (mercadoFechado) {
      recomendacao = rodadaAtual;
    } else {
      recomendacao = Math.max(1, rodadaAtual - 1);
    }

    const resultado = {
      rodadaAtualCartola: rodadaAtual,
      mercadoFechado,
      recomendacao,
      timestamp: new Date(),
    };

    console.log(`✅ [DETECCAO] Resultado:`, resultado);
    return resultado;
  } catch (error) {
    console.error(`❌ [DETECCAO] Erro:`, error);
    return {
      rodadaAtualCartola: 15,
      mercadoFechado: true,
      recomendacao: 14,
      timestamp: new Date(),
      erro: error.message,
    };
  }
}

/**
 * Obter detalhes completos de um participante específico
 */
async function obterDetalhesParticipante(
  ligaId,
  participanteId,
  rodadaInicio = 1,
  rodadaFim = null,
) {
  console.log(
    `🔍 [GOLEIROS-SERVICE] Detalhes participante ${participanteId} rodadas ${rodadaInicio}-${rodadaFim || "atual"}`,
  );

  try {
    // Detectar rodada fim se não especificada
    if (!rodadaFim) {
      const statusRodada = await verificarStatusRodada(999);
      rodadaFim = statusRodada.concluida
        ? statusRodada.rodadaAtual
        : Math.max(1, statusRodada.rodadaAtual - 1);
    }

    // ✅ NOVO: Verificar se participante está ativo
    const statusMap = await buscarStatusParticipantes([participanteId]);
    const statusParticipante = statusMap[String(participanteId)] || {
      ativo: true,
    };
    const isAtivo = statusParticipante.ativo !== false;

    // ✅ NOVO: Limitar rodadaFim para participantes inativos
    const rodadaFimEfetiva = obterUltimaRodadaValida(
      statusParticipante,
      rodadaFim,
    );

    // Buscar dados do participante
    const dadosParticipante = await Goleiros.find({
      ligaId: ligaId,
      participanteId: participanteId,
      rodada: { $gte: rodadaInicio, $lte: rodadaFimEfetiva }, // ✅ Limitado
      rodadaConcluida: true,
    }).sort({ rodada: 1 });

    if (dadosParticipante.length === 0) {
      throw new Error(
        `Nenhum dado encontrado para o participante ${participanteId}`,
      );
    }

    // Processar dados
    let totalPontos = 0;
    let melhorRodada = 0;
    let piorRodada = Infinity;
    const rodadas = [];

    dadosParticipante.forEach((item) => {
      const pontos = item.pontos || 0;
      totalPontos += pontos;
      melhorRodada = Math.max(melhorRodada, pontos);
      piorRodada = Math.min(piorRodada, pontos);

      rodadas.push({
        rodada: item.rodada,
        goleiroNome: item.goleiroNome || "Sem goleiro",
        goleiroClube: item.goleiroClube || "N/A",
        pontos: Math.floor(pontos * 100) / 100,
      });
    });

    const totalRodadas = dadosParticipante.length;
    const mediaPontos = totalRodadas > 0 ? totalPontos / totalRodadas : 0;

    return {
      participanteId,
      participanteNome:
        dadosParticipante[0].participanteNome ||
        `Participante ${participanteId}`,
      rodadaInicio,
      rodadaFim: rodadaFimEfetiva,
      totalPontos: Math.floor(totalPontos * 100) / 100,
      totalRodadas,
      rodadas,
      estatisticas: {
        melhorRodada: Math.floor(melhorRodada * 100) / 100,
        piorRodada:
          piorRodada === Infinity ? 0 : Math.floor(piorRodada * 100) / 100,
        mediaPontos: Math.floor(mediaPontos * 100) / 100,
      },
      // ✅ NOVO: Status do participante
      ativo: isAtivo,
      rodada_desistencia: statusParticipante.rodada_desistencia || null,
    };
  } catch (error) {
    console.error(
      `❌ [GOLEIROS-SERVICE] Erro ao obter detalhes do participante:`,
      error,
    );
    throw error;
  }
}

console.log(
  "[GOLEIROS-SERVICE] ✅ Serviço v2.0 carregado com suporte a inativos",
);
