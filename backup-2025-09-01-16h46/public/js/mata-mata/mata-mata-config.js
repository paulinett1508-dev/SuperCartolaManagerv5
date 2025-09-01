// MATA-MATA CONFIG - Configurações e Constantes
// Responsável por: definições de edições, funções auxiliares de texto/rodadas

// Definição das edições do Mata-Mata
export const edicoes = [
  {
    id: 1,
    nome: "1ª Edição",
    rodadaInicial: 2,
    rodadaFinal: 7,
    rodadaDefinicao: 2,
    ativo: true,
  },
  {
    id: 2,
    nome: "2ª Edição",
    rodadaInicial: 9,
    rodadaFinal: 14,
    rodadaDefinicao: 9,
    ativo: true,
  },
  {
    id: 3,
    nome: "3ª Edição",
    rodadaInicial: 15,
    rodadaFinal: 21,
    rodadaDefinicao: 15,
    ativo: false,
  },
  {
    id: 4,
    nome: "4ª Edição",
    rodadaInicial: 22,
    rodadaFinal: 26,
    rodadaDefinicao: 21,
    ativo: false,
  },
  {
    id: 5,
    nome: "5ª Edição",
    rodadaInicial: 31,
    rodadaFinal: 35,
    rodadaDefinicao: 30,
    ativo: false,
    fasesSemSemis: true,
  },
];

// Função para obter texto da rodada de pontos
export function getRodadaPontosText(faseLabel, edicao) {
  const edicaoSelecionada = edicoes.find((e) => e.id === edicao);
  if (!edicaoSelecionada) return "";
  const rodadaBase = edicaoSelecionada.rodadaInicial;

  // Edição 5 tem estrutura diferente (sem semis)
  if (edicao === 5) {
    switch (faseLabel.toUpperCase()) {
      case "1ª FASE":
        return `Pontuação da Rodada ${rodadaBase}`;
      case "OITAVAS":
        return `Pontuação da Rodada ${rodadaBase + 1}`;
      case "QUARTAS":
        return `Pontuação da Rodada ${rodadaBase + 2}`;
      case "FINAL":
        return `Pontuação da Rodada ${rodadaBase + 4}`;
      default:
        return "";
    }
  }

  // Edições 1-4 (estrutura padrão)
  switch (faseLabel.toUpperCase()) {
    case "1ª FASE":
      return `Pontuação da Rodada ${rodadaBase}`;
    case "OITAVAS":
      return `Pontuação da Rodada ${rodadaBase + 1}`;
    case "QUARTAS":
      return `Pontuação da Rodada ${rodadaBase + 2}`;
    case "SEMIS":
      return `Pontuação da Rodada ${rodadaBase + 3}`;
    case "FINAL":
      return `Pontuação da Rodada ${rodadaBase + 4}`;
    default:
      return "";
  }
}

// Função para obter número da rodada de pontos
export function getRodadaPontosNum(fase, edicao) {
  const edicaoSelecionada = edicoes.find((e) => e.id === edicao);
  if (!edicaoSelecionada) return 0;
  const rodadaBase = edicaoSelecionada.rodadaInicial;

  // Edição 5 tem estrutura diferente (sem semis)
  if (edicao === 5) {
    switch (fase.toLowerCase()) {
      case "primeira":
        return rodadaBase;
      case "oitavas":
        return rodadaBase + 1;
      case "quartas":
        return rodadaBase + 2;
      case "final":
        return rodadaBase + 4;
      default:
        return 0;
    }
  }

  // Edições 1-4 (estrutura padrão)
  switch (fase.toLowerCase()) {
    case "primeira":
      return rodadaBase;
    case "oitavas":
      return rodadaBase + 1;
    case "quartas":
      return rodadaBase + 2;
    case "semis":
      return rodadaBase + 3;
    case "final":
      return rodadaBase + 4;
    default:
      return 0;
  }
}

// Função para obter nome da edição
export function getEdicaoMataMata(edicao) {
  const edicaoSelecionada = edicoes.find((e) => e.id === edicao);
  return edicaoSelecionada
    ? `${edicaoSelecionada.nome} do Mata-Mata`
    : "Mata-Mata";
}

// Função para gerar texto do confronto
export function gerarTextoConfronto(faseLabel) {
  const faseUpper = faseLabel.toUpperCase();
  if (faseUpper === "1ª FASE") return "Confronto da 1ª FASE";
  if (faseUpper === "OITAVAS") return "Confronto das OITAVAS";
  if (faseUpper === "QUARTAS") return "Confronto das QUARTAS";
  if (faseUpper === "SEMIS") return "Confronto das SEMIS";
  if (faseUpper === "FINAL") return "Confronto da FINAL";
  return `Confronto da ${faseLabel}`;
}

// Função para gerar informações das fases
export function getFaseInfo(edicaoAtual, edicaoSelecionada) {
  return {
    primeira: {
      label: "1ª FASE",
      pontosRodada: edicaoSelecionada.rodadaInicial,
      numJogos: 16,
      prevFaseRodada: null,
    },
    oitavas: {
      label: "OITAVAS",
      pontosRodada: edicaoSelecionada.rodadaInicial + 1,
      numJogos: 8,
      prevFaseRodada: edicaoSelecionada.rodadaInicial,
    },
    quartas: {
      label: "QUARTAS",
      pontosRodada: edicaoSelecionada.rodadaInicial + 2,
      numJogos: 4,
      prevFaseRodada: edicaoSelecionada.rodadaInicial + 1,
    },
    semis: {
      label: "SEMIS",
      pontosRodada: edicaoSelecionada.rodadaInicial + 3,
      numJogos: 2,
      prevFaseRodada: edicaoSelecionada.rodadaInicial + 2,
    },
    final: {
      label: "FINAL",
      pontosRodada:
        edicaoAtual === 5
          ? edicaoSelecionada.rodadaInicial + 4
          : edicaoSelecionada.rodadaInicial + 4,
      numJogos: 1,
      prevFaseRodada:
        edicaoAtual === 5
          ? edicaoSelecionada.rodadaInicial + 2
          : edicaoSelecionada.rodadaInicial + 3,
    },
  };
}

// Função para obter ID da liga
export function getLigaId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}
