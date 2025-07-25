// ✅ ARTILHEIRO-CAMPEAO-CORE.JS v1.0
// Lógica central de processamento de dados dos artilheiros

console.log("🧠 [ARTILHEIRO-CORE] Módulo v1.0 carregando...");

// ✅ IMPORTAÇÕES
import { ArtilheiroUtils } from "./artilheiro-campeao-utils.js";
import { ArtilheiroCache } from "./artilheiro-campeao-cache.js";

// ✅ CONFIGURAÇÕES
const CORE_CONFIG = {
  apiBackend: "/api/artilheiro-campeao",
  batchSize: 10,
  maxConcurrentRequests: 5,
};

// ✅ MÓDULO CORE
export const ArtilheiroCore = {
  version: "1.0.0",

  // Obter participantes da liga
  async obterParticipantesLiga(ligaId) {
    return await ArtilheiroCache.obterComCache(
      `${ArtilheiroCache._cache.prefixes?.participantes || "part_"}${ligaId}`,
      async () => {
        ArtilheiroUtils.logger.info("👥 Obtendo participantes da liga...");

        const strategies = [
          // Estratégia 1: API específica de participantes
          async () => {
            const result = await ArtilheiroUtils.fazerRequisicao(
              `/api/ligas/${ligaId}/participantes`,
            );
            if (result.success && result.data?.length > 0) {
              return result.data;
            }
            return null;
          },

          // Estratégia 2: API de times da liga
          async () => {
            const result = await ArtilheiroUtils.fazerRequisicao(
              `/api/ligas/${ligaId}/times`,
            );
            if (result.success && result.data?.length > 0) {
              return result.data;
            }
            return null;
          },

          // Estratégia 3: Dados da liga completa
          async () => {
            const result = await ArtilheiroUtils.fazerRequisicao(
              `/api/ligas/${ligaId}`,
            );
            if (result.success && result.data?.times?.length > 0) {
              return result.data.times;
            }
            return null;
          },
        ];

        for (let i = 0; i < strategies.length; i++) {
          try {
            const data = await strategies[i]();
            if (data && data.length > 0) {
              const participantesFormatados = data.map((p) => ({
                id: p.id || p.time_id || p.timeId,
                nome_cartola:
                  p.nome_cartoleiro ||
                  p.nome_cartola ||
                  p.cartoleiro ||
                  `Cartoleiro ${p.id}`,
                nome_time: p.nome_time || p.nome || p.time || `Time ${p.id}`,
                url_escudo_png: p.url_escudo_png || p.escudo || "",
                clube_id: p.clube_id || null,
              }));

              ArtilheiroUtils.logger.success(
                `✅ ${participantesFormatados.length} participantes encontrados`,
              );
              return participantesFormatados;
            }
          } catch (error) {
            ArtilheiroUtils.logger.warn(
              `Estratégia ${i + 1} falhou:`,
              error.message,
            );
          }
        }

        throw new Error("Nenhum participante encontrado na liga");
      },
    );
  },

  // Obter gols de um time em uma rodada específica
  async obterGolsTimeRodada(ligaId, timeId, rodada) {
    const chaveCache = `gols_${timeId}_${rodada}`;

    return await ArtilheiroCache.obterComCache(
      chaveCache,
      async () => {
        const url = `${CORE_CONFIG.apiBackend}/${ligaId}/gols/${timeId}/${rodada}`;
        const result = await ArtilheiroUtils.fazerRequisicao(url);

        if (!result.success) {
          ArtilheiroUtils.logger.warn(
            `Erro ao obter gols do time ${timeId}, rodada ${rodada}:`,
            result.error,
          );
          return {
            golsPro: 0,
            golsContra: 0,
            jogadores: [],
            erro: result.error,
            timeId: parseInt(timeId),
            rodada: parseInt(rodada),
          };
        }

        const dados = result.data;

        return {
          timeId: parseInt(timeId),
          rodada: parseInt(rodada),
          golsPro: dados.golsPro || 0,
          golsContra: dados.golsContra || 0,
          saldo: (dados.golsPro || 0) - (dados.golsContra || 0),
          jogadores: dados.jogadores || [],
          pontos: dados.pontos || 0,
          dados_completos: dados.dados_originais || null,
        };
      },
      30 * 60 * 1000, // Cache por 30 minutos para dados de rodadas antigas
    );
  },

  // Obter dados de múltiplas rodadas via backend
  async obterDadosTodasRodadas(
    ligaId,
    timeId,
    rodadaInicio = 1,
    rodadaFim = null,
  ) {
    ArtilheiroUtils.logger.info(
      `📊 Obtendo dados do time ${timeId}, rodadas ${rodadaInicio}-${rodadaFim}`,
    );

    // ✅ ESTRATÉGIA 1: Tentar buscar dados agregados primeiro
    try {
      const url = `${CORE_CONFIG.apiBackend}/${ligaId}/gols/${timeId}/agregado?inicio=${rodadaInicio}&fim=${rodadaFim}`;
      const result = await ArtilheiroUtils.fazerRequisicao(url);

      if (result.success && result.data && result.data.rodadas) {
        ArtilheiroUtils.logger.success(
          `✅ Dados agregados obtidos para time ${timeId}`,
        );
        return result.data.rodadas;
      }
    } catch (error) {
      ArtilheiroUtils.logger.warn(
        `Dados agregados não disponíveis, usando rodada por rodada:`,
        error,
      );
    }

    // ✅ FALLBACK: Buscar rodada por rodada
    const rodadas = [];

    // Processar em lotes para performance
    for (let i = rodadaInicio; i <= rodadaFim; i += CORE_CONFIG.batchSize) {
      const lote = [];

      for (let j = i; j < i + CORE_CONFIG.batchSize && j <= rodadaFim; j++) {
        lote.push(this.obterGolsTimeRodada(ligaId, timeId, j));
      }

      const resultadosLote = await Promise.allSettled(lote);

      resultadosLote.forEach((resultado, index) => {
        const rodadaNum = i + index;
        if (resultado.status === "fulfilled") {
          rodadas[rodadaNum - 1] = {
            rodada: rodadaNum,
            ...resultado.value,
            ocorreu: true,
          };
        } else {
          ArtilheiroUtils.logger.warn(
            `Erro na rodada ${rodadaNum}:`,
            resultado.reason,
          );
          rodadas[rodadaNum - 1] = {
            rodada: rodadaNum,
            golsPro: 0,
            golsContra: 0,
            saldo: 0,
            jogadores: [],
            ocorreu: false,
            erro: resultado.reason,
          };
        }
      });

      // Delay entre lotes
      if (i + CORE_CONFIG.batchSize <= rodadaFim) {
        await ArtilheiroUtils.delay(200);
      }
    }

    return rodadas;
  },

  // Obter dados completos da liga
  async obterDadosCompletosLiga(ligaId, rodadaFim = null) {
    const chaveCache = `liga_completa_${ligaId}_${rodadaFim}`;

    return await ArtilheiroCache.obterComCache(
      chaveCache,
      async () => {
        ArtilheiroUtils.logger.info(
          `🏆 Obtendo dados completos da liga até rodada ${rodadaFim}`,
        );

        const url = `${CORE_CONFIG.apiBackend}/${ligaId}/completo?rodada=${rodadaFim}`;
        const result = await ArtilheiroUtils.fazerRequisicao(url);

        if (result.success && result.data) {
          ArtilheiroUtils.logger.success(
            `✅ Dados completos obtidos da API backend`,
          );
          return result.data;
        }

        return null;
      },
      10 * 60 * 1000, // Cache por 10 minutos para dados completos
    );
  },

  // Processar dados completos dos artilheiros
  async processarDadosCompletos(
    participantes,
    rodadaFim = null,
    callbackProgresso = null,
  ) {
    ArtilheiroUtils.validarArray(participantes, "participantes");

    ArtilheiroUtils.logger.info(
      `🔄 Processando dados de ${participantes.length} participantes até rodada ${rodadaFim}`,
    );

    // ✅ ESTRATÉGIA 1: Tentar obter dados completos primeiro
    try {
      const dadosCompletos = await this.obterDadosCompletosLiga(
        participantes[0]?.ligaId,
        rodadaFim,
      );

      if (
        dadosCompletos &&
        dadosCompletos.participantes &&
        dadosCompletos.participantes.length > 0
      ) {
        ArtilheiroUtils.logger.success(`✅ Usando dados completos do backend`);

        // Mapear dados do backend para formato esperado
        const resultados = dadosCompletos.participantes.map((p, index) => ({
          posicao: index + 1,
          timeId: p.timeId || p.id,
          nomeCartoleiro: p.nomeCartoleiro || p.nome_cartola,
          nomeTime: p.nomeTime || p.nome_time,
          escudo: p.escudo || p.url_escudo_png,
          clube_id: p.clube_id,
          golsPro: p.golsPro || 0,
          golsContra: p.golsContra || 0,
          saldoGols: (p.golsPro || 0) - (p.golsContra || 0),
          mediaGols: p.mediaGols || "0.00",
          jogadores: p.jogadores || [],
          golsPorRodada: p.golsPorRodada || [],
          rodadasJogadas: p.rodadasJogadas || 0,
        }));

        return this.ordenarEAtribuirPosicoes(resultados);
      }
    } catch (error) {
      ArtilheiroUtils.logger.warn(
        `Erro ao obter dados completos, processando individualmente:`,
        error,
      );
    }

    // ✅ FALLBACK: Processar individualmente
    return await this.processarIndividualmente(
      participantes,
      rodadaFim,
      callbackProgresso,
    );
  },

  // Processar participantes individualmente
  async processarIndividualmente(
    participantes,
    rodadaFim,
    callbackProgresso = null,
  ) {
    const resultados = [];
    const ligaId = participantes[0]?.ligaId;

    for (let i = 0; i < participantes.length; i++) {
      const participante = participantes[i];

      // Atualizar progresso se callback fornecido
      if (callbackProgresso) {
        callbackProgresso(i + 1, participantes.length);
      }

      try {
        ArtilheiroUtils.logger.info(
          `📊 Processando ${participante.nome_cartola} (${i + 1}/${participantes.length})`,
        );

        const dadosRodadas = await this.obterDadosTodasRodadas(
          ligaId,
          participante.id,
          1,
          rodadaFim,
        );

        // Processar dados das rodadas
        const resultado = this.processarDadosParticipante(
          participante,
          dadosRodadas,
          rodadaFim,
        );
        resultados.push(resultado);
      } catch (error) {
        ArtilheiroUtils.logger.error(
          `Erro ao processar ${participante.nome_cartola}:`,
          error,
        );

        // Adicionar participante com dados zerados em caso de erro
        resultados.push(
          this.criarParticipanteVazio(participante, error.message),
        );
      }
    }

    return this.ordenarEAtribuirPosicoes(resultados);
  },

  // Processar dados de um participante
  processarDadosParticipante(participante, dadosRodadas, rodadaFim) {
    let totalGolsPro = 0;
    let totalGolsContra = 0;
    const todosJogadores = new Map();

    // Processar cada rodada
    dadosRodadas.forEach((rodada) => {
      if (rodada && rodada.ocorreu) {
        totalGolsPro += rodada.golsPro || 0;
        totalGolsContra += rodada.golsContra || 0;

        // Agregar jogadores que marcaram gols
        if (rodada.jogadores && rodada.jogadores.length > 0) {
          rodada.jogadores.forEach((jogador) => {
            const chave = jogador.nome;
            if (todosJogadores.has(chave)) {
              todosJogadores.get(chave).gols += jogador.gols;
            } else {
              todosJogadores.set(chave, { ...jogador });
            }
          });
        }
      }
    });

    const saldoGols = totalGolsPro - totalGolsContra;

    return {
      posicao: 1, // Será reordenado depois
      timeId: participante.id,
      nomeCartoleiro: participante.nome_cartola,
      nomeTime: participante.nome_time,
      escudo: participante.url_escudo_png,
      clube_id: participante.clube_id,
      golsPro: totalGolsPro,
      golsContra: totalGolsContra,
      saldoGols: saldoGols,
      mediaGols: rodadaFim > 0 ? (totalGolsPro / rodadaFim).toFixed(2) : "0.00",
      jogadores: Array.from(todosJogadores.values()).sort(
        (a, b) => b.gols - a.gols,
      ),
      golsPorRodada: dadosRodadas,
      rodadasJogadas: dadosRodadas.filter((r) => r && r.ocorreu).length,
    };
  },

  // Criar participante com dados zerados
  criarParticipanteVazio(participante, erro = null) {
    return {
      posicao: 999,
      timeId: participante.id,
      nomeCartoleiro: participante.nome_cartola,
      nomeTime: participante.nome_time,
      escudo: participante.url_escudo_png,
      clube_id: participante.clube_id,
      golsPro: 0,
      golsContra: 0,
      saldoGols: 0,
      mediaGols: "0.00",
      jogadores: [],
      golsPorRodada: [],
      rodadasJogadas: 0,
      erro: erro,
    };
  },

  // Ordenar e atribuir posições
  ordenarEAtribuirPosicoes(resultados) {
    // Ordenar por critérios específicos
    const resultadosOrdenados = ArtilheiroUtils.ordenarPorCriterios(
      resultados,
      [
        { campo: "saldoGols", ordem: "desc" },
        { campo: "golsPro", ordem: "desc" },
        { campo: "mediaGols", ordem: "desc" },
      ],
    );

    // Atualizar posições após ordenação
    resultadosOrdenados.forEach((item, index) => {
      item.posicao = index + 1;
    });

    ArtilheiroUtils.logger.success(
      `✅ ${resultadosOrdenados.length} participantes processados e ordenados`,
    );
    return resultadosOrdenados;
  },

  // Calcular estatísticas gerais
  calcularEstatisticas(dados) {
    if (!dados || dados.length === 0) {
      return {
        totalGolsPro: 0,
        totalGolsContra: 0,
        totalSaldo: 0,
        mediaGolsPorParticipante: 0,
        artilheiroAtual: null,
        participantesAtivos: 0,
        maiorSaldoPositivo: 0,
        maiorSaldoNegativo: 0,
        participantesSemGols: 0,
      };
    }

    const totalGolsPro = dados.reduce((sum, p) => sum + p.golsPro, 0);
    const totalGolsContra = dados.reduce((sum, p) => sum + p.golsContra, 0);
    const totalSaldo = totalGolsPro - totalGolsContra;
    const participantesAtivos = dados.filter(
      (p) => p.golsPro > 0 || p.golsContra > 0,
    ).length;
    const participantesSemGols = dados.filter(
      (p) => p.golsPro === 0 && p.golsContra === 0,
    ).length;

    // Encontrar maior saldo positivo e negativo
    const saldos = dados.map((p) => p.saldoGols);
    const maiorSaldoPositivo = Math.max(...saldos.filter((s) => s > 0), 0);
    const maiorSaldoNegativo = Math.min(...saldos.filter((s) => s < 0), 0);

    return {
      totalGolsPro,
      totalGolsContra,
      totalSaldo,
      mediaGolsPorParticipante:
        dados.length > 0
          ? ArtilheiroUtils.calcularMedia(dados.map((p) => p.golsPro))
          : 0,
      artilheiroAtual: dados[0] || null,
      participantesAtivos,
      maiorSaldoPositivo,
      maiorSaldoNegativo,
      participantesSemGols,
      distribuicaoGols: this.calcularDistribuicaoGols(dados),
    };
  },

  // Calcular distribuição de gols
  calcularDistribuicaoGols(dados) {
    const distribuicao = {
      0: 0,
      "1-3": 0,
      "4-6": 0,
      "7-10": 0,
      "11+": 0,
    };

    dados.forEach((participante) => {
      const gols = participante.golsPro;

      if (gols === 0) distribuicao["0"]++;
      else if (gols <= 3) distribuicao["1-3"]++;
      else if (gols <= 6) distribuicao["4-6"]++;
      else if (gols <= 10) distribuicao["7-10"]++;
      else distribuicao["11+"]++;
    });

    return distribuicao;
  },

  // Obter top artilheiros
  obterTopArtilheiros(dados, quantidade = 5) {
    if (!dados || dados.length === 0) return [];

    return dados
      .filter((p) => p.golsPro > 0)
      .slice(0, quantidade)
      .map((p) => ({
        nome: p.nomeCartoleiro,
        time: p.nomeTime,
        gols: p.golsPro,
        saldo: p.saldoGols,
        posicao: p.posicao,
      }));
  },

  // Obter participantes com mais gols contra
  obterMaisGolsContra(dados, quantidade = 3) {
    if (!dados || dados.length === 0) return [];

    return dados
      .filter((p) => p.golsContra > 0)
      .sort((a, b) => b.golsContra - a.golsContra)
      .slice(0, quantidade)
      .map((p) => ({
        nome: p.nomeCartoleiro,
        time: p.nomeTime,
        golsContra: p.golsContra,
        saldo: p.saldoGols,
        posicao: p.posicao,
      }));
  },

  // Validar dados de entrada
  validarDadosEntrada(participantes, rodadaFim) {
    ArtilheiroUtils.validarArray(participantes, "participantes");

    if (!rodadaFim || rodadaFim < 1 || rodadaFim > 38) {
      throw new Error("Rodada fim deve estar entre 1 e 38");
    }

    participantes.forEach((participante, index) => {
      if (!participante.id) {
        throw new Error(`Participante ${index + 1} não possui ID`);
      }

      if (!participante.nome_cartola && !participante.nome_cartoleiro) {
        throw new Error(`Participante ${index + 1} não possui nome`);
      }
    });

    return true;
  },
};

console.log("✅ [ARTILHEIRO-CORE] Módulo carregado com sucesso!");