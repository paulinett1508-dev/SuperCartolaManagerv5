// MELHOR DO MÊS - CONFIGURAÇÕES v1.0
// public/js/melhor-mes/melhor-mes-config.js

console.log("[MELHOR-MES-CONFIG] Carregando configurações...");

export const MELHOR_MES_CONFIG = {
  // EDIÇÕES DO MELHOR DO MÊS
  edicoes: [
    { id: 1, nome: "Edição 01", inicio: 1, fim: 6, cor: "#e74c3c" },
    { id: 2, nome: "Edição 02", inicio: 7, fim: 10, cor: "#f39c12" },
    { id: 3, nome: "Edição 03", inicio: 11, fim: 17, cor: "#f1c40f" },
    { id: 4, nome: "Edição 04", inicio: 18, fim: 22, cor: "#2ecc71" },
    { id: 5, nome: "Edição 05", inicio: 23, fim: 28, cor: "#3498db" },
    { id: 6, nome: "Edição 06", inicio: 29, fim: 32, cor: "#9b59b6" },
    { id: 7, nome: "Edição 07", inicio: 33, fim: 38, cor: "#34495e" },
  ],

  // CONFIGURAÇÃO DE PRÊMIOS POR LIGA
  premios: {
    "684d821cf1a7ae16d1f89572": {
      nome: "Cartoleiros Sobral",
      primeiro: { valor: 15.0, label: "R$ 15,00", cor: "#28a745" },
      ultimo: { valor: -15.0, label: "-R$ 15,00", cor: "#dc3545" },
      minimo_participantes: 6,
    },
    default: {
      nome: "Liga Padrão",
      primeiro: { valor: 0, label: "Troféu", cor: "#ffd700" },
      ultimo: { valor: 0, label: "-", cor: "#6c757d" },
      minimo_participantes: 1,
    },
  },

  // CONFIGURAÇÕES DE INTERFACE
  ui: {
    miniCards: {
      grid: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "20px",
      borderRadius: "16px",
      padding: "20px",
      maxWidth: "1000px",
    },

    cores: {
      ativo: "#007bff",
      ativoGradiente: "linear-gradient(135deg, #007bff, #0056b3)",
      ativoSombra: "0 12px 40px rgba(0,123,255,0.4)",

      concluida: "#28a745",
      andamento: "#ffc107",
      aguardando: "#6c757d",
      erro: "#dc3545",

      background: "#fff",
      backgroundSecundario: "#f8f9fa",
      border: "#e9ecef",
      borderAtiva: "#007bff",

      texto: "#333",
      textoSecundario: "#666",
      textoMuted: "#999",
    },

    icones: {
      concluida: "✅",
      andamento: "🔄",
      aguardando: "⏳",
      erro: "❌",
      vencedor: "🏆",
      medalhaOuro: "🥇",
      medalhaPrata: "🥈",
      medalhaBronze: "🥉",
      clube: "⚽",
      pontos: "📊",
      calendario: "📅",
      participantes: "👥",
    },

    animacoes: {
      hover: "translateY(-6px) scale(1.03)",
      ativo: "scale(1.03)",
      normal: "scale(1)",
      duracao: "0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },

  // CACHE E PERFORMANCE
  cache: {
    ttl: 300000, // 5 minutos
    prefix: "melhor_mes_",
    maxEntries: 50,
  },

  // DEBUG
  debug: true,
  version: "1.0.0",
};

// FUNÇÕES UTILITÁRIAS
export function getPremiosLiga(ligaId) {
  return MELHOR_MES_CONFIG.premios[ligaId] || MELHOR_MES_CONFIG.premios.default;
}

export function getEdicaoById(id) {
  return MELHOR_MES_CONFIG.edicoes.find((ed) => ed.id === id);
}

export function getEdicaoByIndex(index) {
  return MELHOR_MES_CONFIG.edicoes[index] || null;
}

export function getEdicaoAtual(ultimaRodada) {
  for (let i = MELHOR_MES_CONFIG.edicoes.length - 1; i >= 0; i--) {
    const edicao = MELHOR_MES_CONFIG.edicoes[i];
    if (ultimaRodada >= edicao.inicio) {
      return i;
    }
  }
  return 0;
}

export function isEdicaoConcluida(edicao, ultimaRodada) {
  return ultimaRodada >= edicao.fim;
}

export function isEdicaoIniciada(edicao, ultimaRodada) {
  return ultimaRodada >= edicao.inicio;
}

export function getStatusEdicao(edicao, ultimaRodada) {
  if (!isEdicaoIniciada(edicao, ultimaRodada)) {
    return "aguardando";
  } else if (isEdicaoConcluida(edicao, ultimaRodada)) {
    return "concluida";
  } else {
    return "andamento";
  }
}

export function formatarNomeArquivo(edicao, tipo = "ranking") {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `melhor-mes-${edicao.nome.toLowerCase().replace(/ /g, "-")}-${tipo}-${timestamp}.png`;
}

console.log("[MELHOR-MES-CONFIG] ✅ Configurações carregadas");
console.log(
  `[MELHOR-MES-CONFIG] 📊 ${MELHOR_MES_CONFIG.edicoes.length} edições configuradas`,
);
console.log(
  `[MELHOR-MES-CONFIG] 🎨 Interface com ${Object.keys(MELHOR_MES_CONFIG.ui.cores).length} cores`,
);

export default MELHOR_MES_CONFIG;
