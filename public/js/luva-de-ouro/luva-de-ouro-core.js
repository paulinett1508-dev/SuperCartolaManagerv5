// LUVA DE OURO CORE - Lógica de negócio e comunicação com API (REFATORADO)

console.log("🧠 [LUVA-CORE] Módulo core carregando...");

const LuvaDeOuroCore = {
  // ==============================
  // BUSCAR RANKING DE GOLEIROS
  // ==============================

  async buscarRankingGoleiros(inicio = 1, fim = null, forcarColeta = false) {
    console.log(
      `🔍 [LUVA-CORE] Buscando ranking: ${inicio} a ${fim || "atual"} (forçar: ${forcarColeta})`,
    );

    try {
      const config = window.LuvaDeOuroConfig;
      const ligaId = config.getLigaIdAtual();

      if (!ligaId) {
        throw new Error("Liga ID não encontrado na URL");
      }

      const params = new URLSearchParams({
        inicio: inicio.toString(),
        ...(fim && { fim: fim.toString() }),
        ...(forcarColeta && { forcar_coleta: "true" }),
      });

      const url = `${config.API.RANKING(ligaId)}?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || data.error || "Erro ao buscar ranking");
      }

      console.log(
        `✅ [LUVA-CORE] Ranking obtido: ${data.data.ranking.length} participantes`,
      );

      if (data.data.ranking.length > 0) {
        const lider = data.data.ranking[0];
        console.log(
          `🏆 [LUVA-CORE] Líder: ${lider.participanteNome} com ${lider.pontosTotais} pontos`,
        );
      }

      return data.data;
    } catch (error) {
      console.error("❌ [LUVA-CORE] Erro ao buscar ranking:", error);
      throw error;
    }
  },

  // ==============================
  // DETECTAR ÚLTIMA RODADA
  // ==============================

  async detectarUltimaRodada() {
    console.log("🔍 [LUVA-CORE] Detectando última rodada...");

    try {
      const config = window.LuvaDeOuroConfig;
      const ligaId = config.getLigaIdAtual();
      if (!ligaId) throw new Error("Liga ID não encontrado na URL");
      const url = config.API.DETECTAR_RODADA(ligaId);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erro ao detectar rodada");
      }

      console.log("✅ [LUVA-CORE] Rodada detectada:", data.data);
      return data.data;
    } catch (error) {
      console.error("❌ [LUVA-CORE] Erro ao detectar rodada:", error);
      throw error;
    }
  },

  // ==============================
  // BUSCAR DETALHES DO PARTICIPANTE
  // ==============================

  async buscarDetalhesParticipante(participanteId, inicio = 1, fim = null) {
    console.log(
      `🔍 [LUVA-CORE] Buscando detalhes: participante ${participanteId}`,
    );

    try {
      const config = window.LuvaDeOuroConfig;
      const ligaId = config.getLigaIdAtual();
      if (!ligaId) throw new Error("Liga ID não encontrado na URL");

      // Construir URL
      let url = `${config.API.DETALHES_PARTICIPANTE(ligaId, participanteId)}?inicio=${inicio}`;
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

      console.log(
        "✅ [LUVA-CORE] Detalhes obtidos:",
        data.data.totalRodadas,
        "rodadas",
      );
      return data.data;
    } catch (error) {
      console.error("❌ [LUVA-CORE] Erro ao buscar detalhes:", error);
      throw error;
    }
  },

  // ==============================
  // FORÇAR COLETA DE DADOS
  // ==============================

  async forcarColeta(inicio = 1, fim = null) {
    console.log(
      `🔄 [LUVA-CORE] Forçando coleta: ${inicio} a ${fim || "atual"}`,
    );

    try {
      const config = window.LuvaDeOuroConfig;
      const ligaId = config.getLigaIdAtual();
      if (!ligaId) throw new Error("Liga ID não encontrado na URL");

      const params = new URLSearchParams({
        inicio: inicio.toString(),
        ...(fim && { fim: fim.toString() }),
      });

      const url = `${config.API.COLETAR(ligaId)}?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erro na coleta");
      }

      console.log("✅ [LUVA-CORE] Coleta concluída:", data.data);
      return data.data;
    } catch (error) {
      console.error("❌ [LUVA-CORE] Erro na coleta:", error);
      throw error;
    }
  },

  // ==============================
  // DIAGNÓSTICO
  // ==============================

  async executarDiagnostico() {
    console.log("🔍 [LUVA-CORE] Executando diagnóstico...");

    try {
      const config = window.LuvaDeOuroConfig;
      const ligaId = config.getLigaIdAtual();
      if (!ligaId) throw new Error("Liga ID não encontrado na URL");
      const url = config.API.DIAGNOSTICO(ligaId);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erro no diagnóstico");
      }

      console.log("✅ [LUVA-CORE] Diagnóstico:", data.data);
      return data.data;
    } catch (error) {
      console.error("❌ [LUVA-CORE] Erro no diagnóstico:", error);
      throw error;
    }
  },
};

// Exportar para window
window.LuvaDeOuroCore = LuvaDeOuroCore;

console.log("✅ [LUVA-CORE] Módulo core carregado");
