// MATA-MATA CONFIG - Configurações e Constantes
// Responsável por: definições de edições, funções auxiliares de texto/rodadas

// Definição das edições do Mata-Mata (array mutável para carregamento dinâmico)
let _edicoes = [
  {
    id: 1,
    nome: "1ª Edição",
    rodadaInicial: 3,
    rodadaFinal: 7,
    rodadaDefinicao: 2,
    ativo: true,
  },
  {
    id: 2,
    nome: "2ª Edição",
    rodadaInicial: 10,
    rodadaFinal: 14,
    rodadaDefinicao: 9,
    ativo: true,
  },
  {
    id: 3,
    nome: "3ª Edição",
    rodadaInicial: 16,
    rodadaFinal: 20,
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
    rodadaInicial: 27,
    rodadaFinal: 31,
    rodadaDefinicao: 26,
    ativo: false,
  },
  {
    id: 6,
    nome: "6ª Edição",
    rodadaInicial: 33,
    rodadaFinal: 37,
    rodadaDefinicao: 32,
    ativo: false,
  },
];

// Getter para compatibilidade (todos os importadores continuam usando `edicoes`)
export const edicoes = _edicoes;

// Setter para carregar edições da API
export function setEdicoes(novasEdicoes) {
  _edicoes.length = 0;
  novasEdicoes.forEach(e => _edicoes.push(e));
  console.log(`[MATA-CONFIG] Edições atualizadas: ${_edicoes.length} edições carregadas`);
}

// Valores financeiros por fase (espelho do config/rules/mata_mata.json)
export const VALORES_FASE = {
  primeira: { vitoria: 10.0, derrota: -10.0 },
  oitavas:  { vitoria: 10.0, derrota: -10.0 },
  quartas:  { vitoria: 10.0, derrota: -10.0 },
  semis:    { vitoria: 10.0, derrota: -10.0 },
  final:    { vitoria: 10.0, derrota: -10.0 },
};

// Setter para carregar valores financeiros da config da liga
export function setValoresFase(valorVitoria, valorDerrota) {
  for (const fase of Object.keys(VALORES_FASE)) {
    VALORES_FASE[fase].vitoria = valorVitoria;
    VALORES_FASE[fase].derrota = valorDerrota;
  }
  console.log(`[MATA-CONFIG] Valores financeiros atualizados: vitória=${valorVitoria}, derrota=${valorDerrota}`);
}

// ⚠️ DEPRECATED: Tamanho agora vem do CACHE calculado pelo backend
// Mantido apenas como fallback extremo
export const TAMANHO_TORNEIO_DEFAULT = 32;

// ✅ Função para calcular tamanho ideal localmente (espelho do backend)
export function calcularTamanhoIdeal(totalParticipantes) {
  if (totalParticipantes < 8) return 0;
  
  // Encontra maior potência de 2 menor ou igual ao total
  let potenciaDeDois = Math.pow(2, Math.floor(Math.log2(totalParticipantes)));
  return potenciaDeDois >= 8 ? potenciaDeDois : 0;
}

// Labels e número de jogos por fase
export const FASE_LABELS = {
  primeira: "1ª FASE",
  oitavas: "OITAVAS",
  quartas: "QUARTAS",
  semis: "SEMIS",
  final: "FINAL",
};

export const FASE_NUM_JOGOS = {
  primeira: 16,
  oitavas: 8,
  quartas: 4,
  semis: 2,
  final: 1,
};

// Retorna as fases aplicáveis para o tamanho do torneio
export function getFasesParaTamanho(tamanho) {
  if (tamanho >= 32) return ["primeira", "oitavas", "quartas", "semis", "final"];
  if (tamanho >= 16) return ["oitavas", "quartas", "semis", "final"];
  if (tamanho >= 8)  return ["quartas", "semis", "final"];
  return [];
}

// Função para obter texto da rodada de pontos (dinâmico por tamanho)
export function getRodadaPontosText(faseLabel, edicao, tamanhoTorneio = TAMANHO_TORNEIO_DEFAULT) {
  const edicaoSelecionada = edicoes.find((e) => e.id === edicao);
  if (!edicaoSelecionada) return "";

  const fases = getFasesParaTamanho(tamanhoTorneio);
  // Mapear label para key
  const labelToKey = {};
  for (const key of Object.keys(FASE_LABELS)) {
    labelToKey[FASE_LABELS[key]] = key;
  }
  const faseKey = labelToKey[faseLabel.toUpperCase()];
  if (!faseKey) return "";

  const idx = fases.indexOf(faseKey);
  if (idx === -1) return "";

  return `Pontuação da Rodada ${edicaoSelecionada.rodadaInicial + idx}`;
}

// Função para obter número da rodada de pontos (dinâmico por tamanho)
export function getRodadaPontosNum(fase, edicao, tamanhoTorneio = TAMANHO_TORNEIO_DEFAULT) {
  const edicaoSelecionada = edicoes.find((e) => e.id === edicao);
  if (!edicaoSelecionada) return 0;

  const fases = getFasesParaTamanho(tamanhoTorneio);
  const idx = fases.indexOf(fase.toLowerCase());
  if (idx === -1) return 0;

  return edicaoSelecionada.rodadaInicial + idx;
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

// Função para gerar informações das fases (dinâmico por tamanho)
export function getFaseInfo(edicaoAtual, edicaoSelecionada, tamanhoTorneio = TAMANHO_TORNEIO_DEFAULT) {
  const fasesAtivas = getFasesParaTamanho(tamanhoTorneio);
  const resultado = {};

  fasesAtivas.forEach((fase, idx) => {
    resultado[fase] = {
      label: FASE_LABELS[fase],
      pontosRodada: edicaoSelecionada.rodadaInicial + idx,
      numJogos: FASE_NUM_JOGOS[fase],
      prevFaseRodada: idx > 0 ? edicaoSelecionada.rodadaInicial + idx - 1 : null,
    };
  });

  return resultado;
}

// Função para obter ID da liga
export function getLigaId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}
