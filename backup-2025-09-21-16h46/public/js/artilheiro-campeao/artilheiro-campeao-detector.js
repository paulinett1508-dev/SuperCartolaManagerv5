// ✅ ARTILHEIRO-CAMPEAO-DETECTOR.JS v1.0
// Módulo especializado em detecção dinâmica da rodada atual

console.log("🔍 [ARTILHEIRO-DETECTOR] Módulo v1.0 carregando...");

// ✅ IMPORTAÇÕES
import { ArtilheiroUtils } from "./artilheiro-campeao-utils.js";

// ✅ DETECTOR DE RODADA DINÂMICA
export const RodadaDetector = {
  version: "1.0.0",

  // Detectar rodada atual via API Cartola oficial
  async detectarViaApiCartola() {
    try {
      console.log("🔍 [DETECTOR] Detectando via API Cartola oficial...");

      const result = await ArtilheiroUtils.fazerRequisicao(
        "https://api.cartola.globo.com/mercado/status",
      );

      if (result.success && result.data && result.data.rodada_atual) {
        const rodadaAtual = result.data.rodada_atual;
        const statusMercado = result.data.status_mercado;

        console.log(
          `✅ [DETECTOR] API Cartola: Rodada ${rodadaAtual} (Status: ${statusMercado})`,
        );

        return {
          rodadaAtual,
          totalRodadas: 38, // Padrão Brasileirão
          statusMercado,
          fechamento: result.data.fechamento,
          fonte: "cartola_oficial",
        };
      }

      return null;
    } catch (error) {
      console.warn("⚠️ [DETECTOR] Erro na API Cartola:", error.message);
      return null;
    }
  },

  // Detectar via configuração do sistema
  async detectarViaConfiguracao() {
    try {
      console.log("🔍 [DETECTOR] Detectando via configuração do sistema...");

      const result = await ArtilheiroUtils.fazerRequisicao(
        "/api/configuracao/rodada-atual",
      );

      if (result.success && result.data && result.data.rodadaAtual) {
        console.log(
          `✅ [DETECTOR] Configuração: Rodada ${result.data.rodadaAtual}`,
        );

        return {
          rodadaAtual: result.data.rodadaAtual,
          totalRodadas: result.data.totalRodadas || 38,
          fonte: "configuracao_sistema",
        };
      }

      return null;
    } catch (error) {
      console.warn("⚠️ [DETECTOR] Erro na configuração:", error.message);
      return null;
    }
  },

  // Detectar por dados disponíveis (testando rodadas)
  async detectarPorDados(ligaId) {
    try {
      console.log("🔍 [DETECTOR] Detectando por dados disponíveis...");

      const result = await ArtilheiroUtils.fazerRequisicao(
        `/api/artilheiro-campeao/${ligaId}/detectar-rodada`,
      );

      if (result.success && result.data && result.data.rodadaAtual) {
        console.log(
          `✅ [DETECTOR] Detecção por dados: Rodada ${result.data.rodadaAtual}`,
        );

        return {
          rodadaAtual: result.data.rodadaAtual,
          totalRodadas: result.data.totalRodadas || 38,
          fonte: "deteccao_dados",
        };
      }

      return null;
    } catch (error) {
      console.warn("⚠️ [DETECTOR] Erro na detecção por dados:", error.message);
      return null;
    }
  },

  // Calcular rodada baseada na data (fallback)
  calcularPorData() {
    try {
      console.log("🔍 [DETECTOR] Calculando por data...");

      // Data aproximada de início do Brasileirão 2025
      const inicioTemporada = new Date("2025-04-13");
      const agora = new Date();

      // Calcular diferença em semanas
      const diferencaMs = agora.getTime() - inicioTemporada.getTime();
      const diferencaSemanas = Math.floor(
        diferencaMs / (7 * 24 * 60 * 60 * 1000),
      );

      // Ajustar para rodada (mínimo 1, máximo 38)
      const rodadaCalculada = Math.max(1, Math.min(38, diferencaSemanas + 1));

      console.log(`✅ [DETECTOR] Cálculo por data: Rodada ${rodadaCalculada}`);

      return {
        rodadaAtual: rodadaCalculada,
        totalRodadas: 38,
        fonte: "calculo_data",
      };
    } catch (error) {
      console.warn("⚠️ [DETECTOR] Erro no cálculo por data:", error.message);
      return {
        rodadaAtual: 15, // Fallback seguro
        totalRodadas: 38,
        fonte: "fallback",
      };
    }
  },

  // Função principal para detectar rodada atual
  async detectar(ligaId = null) {
    console.log("🚀 [DETECTOR] Iniciando detecção da rodada atual...");

    const estrategias = [
      // 1ª Prioridade: API oficial do Cartola (mais confiável)
      { nome: "API Cartola Oficial", func: () => this.detectarViaApiCartola() },

      // 2ª Prioridade: Configuração do sistema
      {
        nome: "Configuração Sistema",
        func: () => this.detectarViaConfiguracao(),
      },

      // 3ª Prioridade: Detecção por dados (se tiver ligaId)
      ...(ligaId
        ? [
            {
              nome: "Detecção por Dados",
              func: () => this.detectarPorDados(ligaId),
            },
          ]
        : []),

      // 4ª Prioridade: Cálculo por data (fallback)
      { nome: "Cálculo por Data", func: () => this.calcularPorData() },
    ];

    for (const estrategia of estrategias) {
      try {
        console.log(`📡 [DETECTOR] Tentando: ${estrategia.nome}...`);

        const resultado = await estrategia.func();

        if (resultado && resultado.rodadaAtual && resultado.rodadaAtual > 0) {
          console.log(
            `✅ [DETECTOR] Sucesso com ${estrategia.nome}: Rodada ${resultado.rodadaAtual}`,
          );

          return {
            rodadaAtual: resultado.rodadaAtual,
            totalRodadas: resultado.totalRodadas || 38,
            statusMercado: resultado.statusMercado,
            fechamento: resultado.fechamento,
            fonte: resultado.fonte,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (error) {
        console.warn(`⚠️ [DETECTOR] ${estrategia.nome} falhou:`, error.message);
      }
    }

    // Se todas falharam, usar fallback absoluto
    console.warn(
      "⚠️ [DETECTOR] Todas as estratégias falharam, usando fallback",
    );

    return {
      rodadaAtual: 15, // Fallback conservador
      totalRodadas: 38,
      fonte: "fallback_absoluto",
      timestamp: new Date().toISOString(),
    };
  },

  // Validar se rodada detectada é razoável
  validarRodada(rodada) {
    if (typeof rodada !== "number" || rodada < 1 || rodada > 38) {
      console.warn(`⚠️ [DETECTOR] Rodada inválida: ${rodada}`);
      return false;
    }
    return true;
  },

  // Obter informações do status do mercado
  interpretarStatusMercado(status) {
    const statusMap = {
      1: { nome: "Aberto", descricao: "Mercado aberto para escalações" },
      2: { nome: "Fechado", descricao: "Mercado fechado, rodada em andamento" },
      3: { nome: "Finalizado", descricao: "Rodada finalizada" },
      4: { nome: "Manutenção", descricao: "Sistema em manutenção" },
    };

    return (
      statusMap[status] || {
        nome: "Desconhecido",
        descricao: "Status não identificado",
      }
    );
  },
};

console.log("✅ [ARTILHEIRO-DETECTOR] Módulo carregado com sucesso!");
