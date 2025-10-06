// public/js/luva-de-ouro/luva-de-ouro-core.js - COM DETECÇÃO INTELIGENTE
console.log("🧠 [LUVA-CORE] Módulo core carregando...");

/**
 * Módulo Core - Lógica de negócio e comunicação com API
 */
const LuvaDeOuroCore = {
  /**
   * Busca ranking de goleiros
   */
  async buscarRankingGoleiros(inicio = 1, fim = null, forcarColeta = false) {
    console.log(`🔍 Buscando ranking goleiros: ${inicio} a ${fim || "atual"}`);

    try {
      const config = window.LuvaDeOuroConfig;
      const params = new URLSearchParams({
        inicio: inicio.toString(),
        ...(fim && { fim: fim.toString() }),
        ...(forcarColeta && { forcar_coleta: "true" }),
      });

      const url = `${config.API.RANKING(config.LIGA_SOBRAL_ID)}?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        console.error("❌ Erro na API:", data);
        throw new Error(data.message || data.error || "Erro ao buscar ranking");
      }

      console.log(
        "✅ Ranking obtido:",
        data.data.ranking.length,
        "participantes",
      );

      if (data.data.ranking.length > 0) {
        const lider = data.data.ranking[0];
        console.log(
          `🏆 Líder: ${lider.participanteNome} com ${lider.pontosTotais} pontos`,
        );
      }

      return data.data;
    } catch (error) {
      console.error("❌ Erro ao buscar ranking:", error);
      throw error;
    }
  },

  /**
   * ✅ NOVA VERSÃO: Detecta última rodada COM DADOS no banco
   */
  async detectarUltimaRodada() {
    console.log(
      "🔍 [DETECÇÃO INTELIGENTE] Detectando última rodada com dados...",
    );

    try {
      const config = window.LuvaDeOuroConfig;

      // 1. Detectar rodada atual do Cartola FC
      const urlDeteccao = config.API.DETECTAR_RODADA(config.LIGA_SOBRAL_ID);
      const responseDeteccao = await fetch(urlDeteccao);

      if (!responseDeteccao.ok) {
        throw new Error(
          `HTTP ${responseDeteccao.status}: ${responseDeteccao.statusText}`,
        );
      }

      const dataDeteccao = await responseDeteccao.json();

      if (!dataDeteccao.success) {
        throw new Error(dataDeteccao.error || "Erro ao detectar rodada");
      }

      const rodadaAtualCartola = dataDeteccao.data.rodadaAtualCartola;
      const mercadoFechado = dataDeteccao.data.mercadoFechado;

      console.log(
        `📊 Rodada atual Cartola: ${rodadaAtualCartola} | Mercado: ${mercadoFechado ? "Fechado" : "Aberto"}`,
      );

      // 2. Verificar se existe dados para a rodada atual
      const temDadosRodadaAtual =
        await this.verificarDadosRodada(rodadaAtualCartola);

      if (temDadosRodadaAtual) {
        console.log(`✅ Rodada ${rodadaAtualCartola} JÁ tem dados coletados`);
        return {
          rodadaAtualCartola,
          mercadoFechado,
          recomendacao: rodadaAtualCartola,
          temDados: true,
          mensagem: `Dados da rodada ${rodadaAtualCartola} disponíveis`,
        };
      }

      // 3. Se não tem dados na rodada atual, buscar última rodada COM dados
      console.log(`⚠️ Rodada ${rodadaAtualCartola} ainda NÃO tem dados`);

      const ultimaRodadaComDados =
        await this.buscarUltimaRodadaComDados(rodadaAtualCartola);

      if (ultimaRodadaComDados) {
        console.log(`✅ Última rodada COM dados: ${ultimaRodadaComDados}`);
        return {
          rodadaAtualCartola,
          mercadoFechado,
          recomendacao: ultimaRodadaComDados,
          temDados: true,
          rodadaPendente: rodadaAtualCartola,
          mensagem: `Última rodada com dados: ${ultimaRodadaComDados}. Rodada ${rodadaAtualCartola} ainda não coletada.`,
        };
      }

      // 4. Se não encontrou nenhuma rodada com dados, recomendar forçar coleta
      console.log(
        `⚠️ Nenhuma rodada com dados encontrada. Sugerindo forçar coleta.`,
      );
      return {
        rodadaAtualCartola,
        mercadoFechado,
        recomendacao: rodadaAtualCartola,
        temDados: false,
        sugerirForcaColeta: true,
        mensagem: `Rodada ${rodadaAtualCartola} não coletada. Use "Forçar Coleta" para obter dados.`,
      };
    } catch (error) {
      console.error("❌ Erro ao detectar rodada:", error);
      throw error;
    }
  },

  /**
   * ✅ NOVO: Verifica se uma rodada específica tem dados no banco
   */
  async verificarDadosRodada(rodada) {
    try {
      const config = window.LuvaDeOuroConfig;

      console.log(`🔎 Verificando se rodada ${rodada} tem dados...`);

      const params = new URLSearchParams({
        inicio: rodada.toString(),
        fim: rodada.toString(),
      });

      const url = `${config.API.RANKING(config.LIGA_SOBRAL_ID)}?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      const temDados =
        data.success &&
        data.data &&
        data.data.ranking &&
        data.data.ranking.length > 0 &&
        data.data.ranking.some((p) => p.pontosTotais > 0 || p.totalJogos > 0);

      console.log(
        `${temDados ? "✅" : "❌"} Rodada ${rodada}: ${temDados ? "TEM" : "NÃO TEM"} dados`,
      );

      return temDados;
    } catch (error) {
      console.warn(`⚠️ Erro ao verificar rodada ${rodada}:`, error.message);
      return false;
    }
  },

  /**
   * ✅ NOVO: Busca a última rodada que tem dados (busca regressiva)
   */
  async buscarUltimaRodadaComDados(rodadaInicial, tentativasMaximas = 5) {
    console.log(
      `🔄 Buscando última rodada com dados (a partir da ${rodadaInicial})...`,
    );

    for (let i = 1; i <= tentativasMaximas; i++) {
      const rodadaTeste = rodadaInicial - i;

      if (rodadaTeste < 1) {
        console.log(`⚠️ Chegou na rodada 1 sem encontrar dados`);
        return null;
      }

      const temDados = await this.verificarDadosRodada(rodadaTeste);

      if (temDados) {
        console.log(`✅ Encontrou dados na rodada ${rodadaTeste}`);
        return rodadaTeste;
      }
    }

    console.log(
      `⚠️ Não encontrou dados nas últimas ${tentativasMaximas} rodadas`,
    );
    return null;
  },

  /**
   * Obtém estatísticas gerais
   */
  async obterEstatisticas() {
    console.log("📊 Obtendo estatísticas...");

    try {
      const config = window.LuvaDeOuroConfig;
      const url = config.API.ESTATISTICAS(config.LIGA_SOBRAL_ID);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erro ao obter estatísticas");
      }

      console.log("✅ Estatísticas obtidas:", data.data);
      return data.data;
    } catch (error) {
      console.error("❌ Erro ao obter estatísticas:", error);
      throw error;
    }
  },

  /**
   * Busca detalhes de um participante específico
   */
  async buscarDetalhesParticipante(participanteId, inicio, fim) {
    console.log(`🔍 Buscando detalhes do participante ${participanteId}`);

    try {
      const config = window.LuvaDeOuroConfig;

      let url = `${config.API.DETALHES_PARTICIPANTE(config.LIGA_SOBRAL_ID, participanteId)}?inicio=${inicio}`;

      if (fim !== null && fim !== undefined && !isNaN(fim)) {
        url += `&fim=${fim}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erro ao buscar detalhes");
      }

      console.log("✅ Detalhes obtidos");
      return data.data;
    } catch (error) {
      console.error("❌ Erro ao buscar detalhes:", error);
      throw error;
    }
  },
};

window.LuvaDeOuroCore = LuvaDeOuroCore;

console.log("✅ [LUVA-CORE] Módulo core carregado com detecção inteligente");
