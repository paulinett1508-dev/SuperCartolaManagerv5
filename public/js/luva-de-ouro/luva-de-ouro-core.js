// public/js/luva-de-ouro/luva-de-ouro-core.js
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
   * Detecta última rodada disponível
   */
  async detectarUltimaRodada() {
    console.log("🔍 Detectando última rodada...");

    try {
      const config = window.LuvaDeOuroConfig;
      const url = config.API.DETECTAR_RODADA(config.LIGA_SOBRAL_ID);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erro ao detectar rodada");
      }

      console.log("✅ Rodada detectada:", data.data);
      return data.data;
    } catch (error) {
      console.error("❌ Erro ao detectar rodada:", error);
      throw error;
    }
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
      const url = `${config.API.DETALHES_PARTICIPANTE(config.LIGA_SOBRAL_ID, participanteId)}?inicio=${inicio}&fim=${fim}`;
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

// Exportar módulo
window.LuvaDeOuroCore = LuvaDeOuroCore;

console.log("✅ [LUVA-CORE] Módulo core carregado");
