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
    ativo: true, // ✅ ATIVADO
  },
  {
    id: 4,
    nome: "4ª Edição",
    rodadaInicial: 22,
    rodadaFinal: 26,
    rodadaDefinicao: 21,
    ativo: true, // ✅ ATIVADO
  },
  {
    id: 5,
    nome: "5ª Edição",
    rodadaInicial: 31,
    rodadaFinal: 35,
    rodadaDefinicao: 30,
    ativo: true, // ✅ ATIVADO (Estamos na final desta!)
  },
];

// Função para obter texto da rodada de pontos
export function getRodadaPontosText(faseLabel, edicao) {
  const edicaoSelecionada = edicoes.find((e) => e.id === edicao);
  if (!edicaoSelecionada) return "";
  const rodadaBase = edicaoSelecionada.rodadaInicial;

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

export function getRodadaPontosNum(fase, edicao) {
  const edicaoSelecionada = edicoes.find((e) => e.id === edicao);
  if (!edicaoSelecionada) return 0;
  const rodadaBase = edicaoSelecionada.rodadaInicial;

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

export function getEdicaoMataMata(edicao) {
  const edicaoSelecionada = edicoes.find((e) => e.id === edicao);
  return edicaoSelecionada
    ? `${edicaoSelecionada.nome} do Mata-Mata`
    : "Mata-Mata";
}

export function gerarTextoConfronto(faseLabel) {
  const faseUpper = faseLabel.toUpperCase();
  if (faseUpper === "1ª FASE") return "Confronto da 1ª FASE";
  if (faseUpper === "OITAVAS") return "Confronto das OITAVAS";
  if (faseUpper === "QUARTAS") return "Confronto das QUARTAS";
  if (faseUpper === "SEMIS") return "Confronto das SEMIS";
  if (faseUpper === "FINAL") return "Confronto da FINAL";
  return `Confronto da ${faseLabel}`;
}

export function getFaseInfo(faseNome, edicao) {
  const nomeLower = faseNome.toLowerCase();
  const map = {
    oitavas: { numJogos: 8, pontosRodada: edicao.rodadaInicial + 1 },
    quartas: { numJogos: 4, pontosRodada: edicao.rodadaInicial + 2 },
    semifinal: { numJogos: 2, pontosRodada: edicao.rodadaInicial + 3 }, // Corrigido para bater com a chave do Orquestrador
    semis: { numJogos: 2, pontosRodada: edicao.rodadaInicial + 3 },
    final: { numJogos: 1, pontosRodada: edicao.rodadaInicial + 4 },
  };
  return map[nomeLower] || map["final"];
}

export function getLigaId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}
