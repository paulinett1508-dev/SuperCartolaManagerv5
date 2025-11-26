// PONTOS CORRIDOS CORE - Versão Otimizada com Persistência (Snapshot)
// Responsável por: processamento de dados, chamadas de API e CACHE INTELIGENTE

// 1. Importar configurações GERAIS do módulo de Rodadas
import {
  RODADAS_ENDPOINTS,
  STATUS_MERCADO_DEFAULT,
  valoresBancoPadrao,
  valoresBancoCartoleirosSobral,
} from "../rodadas/rodadas-config.js";

// 2. Importar configurações ESPECÍFICAS deste módulo
import { PONTOS_CORRIDOS_CONFIG, getLigaId } from "./pontos-corridos-config.js";

// VERIFICAÇÃO DE AMBIENTE
const isBackend = typeof window === "undefined";
const isFrontend = typeof window !== "undefined";

// ESTADO GLOBAL
let statusMercadoGlobal = STATUS_MERCADO_DEFAULT;
let getRankingRodadaEspecifica = null; // Injetado dinamicamente

// ============================================================================
// 🧠 SISTEMA DE PERSISTÊNCIA UNIFICADA (CACHE)
// ============================================================================

async function lerCachePersistente(ligaId, rodada) {
  try {
    const ts = new Date().getTime();
    const response = await fetch(
      `/api/pontos-corridos/cache/${ligaId}?rodada=${rodada}&_=${ts}`,
    );

    if (!response.ok) {
      console.log(`[CORE] ℹ️ Cache não encontrado para rodada ${rodada} (será calculado)`);
      return null;
    }

    const data = await response.json();
    if (data.cached && data.classificacao) {
      console.log(
        `[CORE] 💾 ✅ Cache MongoDB encontrado para Rodada ${rodada} (${data.classificacao.length} times)`,
      );
      return data.classificacao;
    }
    return null;
  } catch (error) {
    console.warn("[CORE] ⚠️ Erro ao ler cache persistente:", error);
    return null;
  }
}

async function salvarCachePersistente(ligaId, rodada, dados) {
  try {
    const response = await fetch(`/api/pontos-corridos/cache/${ligaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rodada: rodada,
        classificacao: dados,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`[CORE] 💾 ✅ Classificação da Rodada ${rodada} salva no MongoDB (ID: ${result.id})`);
      console.log(`[CORE] 📊 Snapshot vitalício: ${dados.length} times preservados`);
    } else {
      console.warn(`[CORE] ⚠️ Falha ao salvar cache (HTTP ${response.status})`);
    }
  } catch (error) {
    console.error("[CORE] ❌ Erro ao salvar cache persistente:", error);
  }
}

// ============================================================================
// FUNÇÕES DO CORE (Lógica de Negócio)
// ============================================================================

export function setRankingFunction(rankingFunction) {
  getRankingRodadaEspecifica = rankingFunction;
}

export async function atualizarStatusMercado() {
  try {
    const resMercado = await fetch(RODADAS_ENDPOINTS.mercadoStatus);
    if (resMercado.ok) {
      const mercadoData = await resMercado.json();
      statusMercadoGlobal = {
        rodada_atual: mercadoData.rodada_atual,
        status_mercado: mercadoData.status_mercado,
      };
    }
  } catch (err) {
    console.error("[CORE] Erro ao buscar status do mercado:", err);
  }
}

export function getStatusMercado() {
  return statusMercadoGlobal;
}

export function calcularRodadaBrasileirao(rodadaLiga, rodadaInicial = 1) {
  return rodadaInicial + (rodadaLiga - 1);
}

// ✅ FUNÇÃO RESTAURADA (Era solicitada pelo Orquestrador)
export async function buscarTimesLiga(ligaId) {
  try {
    const response = await fetch(`/api/ligas/${ligaId}/times`);
    if (!response.ok) throw new Error("Falha ao carregar times");
    return await response.json();
  } catch (error) {
    console.error("[CORE] Erro ao buscar times da liga:", error);
    return [];
  }
}

// ✅ FUNÇÃO RESTAURADA (Auxiliar de texto)
export function getRodadaPontosText(rodadaLiga, edicao) {
  if (!rodadaLiga) return "Rodada não definida";
  const rodadaBrasileirao =
    PONTOS_CORRIDOS_CONFIG.rodadaInicial + (rodadaLiga - 1);
  return `${rodadaLiga}ª Rodada da Liga (Rodada ${rodadaBrasileirao}ª do Brasileirão)`;
}

// ============================================================================
// ⚡ CÁLCULO DE CONFRONTOS (OTIMIZADO)
// ============================================================================

export async function getConfrontosLigaPontosCorridos(ligaId, rodadaAtual) {
  console.log(
    `[CORE] Iniciando processamento Pontos Corridos (Até rodada ${rodadaAtual})...`,
  );

  try {
    // 1. Cache Rápido
    const cache = await lerCachePersistente(ligaId, rodadaAtual);
    if (cache) return cache;

    console.log("[CORE] ⚠️ Cache Miss. Iniciando cálculo completo...");

    // 2. Cálculo Pesado
    if (!getRankingRodadaEspecifica) {
      try {
        const rodadasModule = await import("../rodadas.js");
        getRankingRodadaEspecifica = rodadasModule.getRankingRodadaEspecifica;
      } catch (e) {
        console.error("[CORE] ERRO CRÍTICO: Ranking function indisponível");
        return [];
      }
    }

    // Usa a função interna restaurada
    const times = await buscarTimesLiga(ligaId);
    const confrontosBase = gerarConfrontos(times);
    const confrontosComPontos = [];

    for (let rodadaNum = 1; rodadaNum <= rodadaAtual; rodadaNum++) {
      const jogosDaRodada = confrontosBase[rodadaNum - 1];
      if (!jogosDaRodada) continue;

      const jogosComPontos = [];
      const pontuacoesRaw = await getRankingRodadaEspecifica(ligaId, rodadaNum);

      const pontuacoesRodada = {};
      if (pontuacoesRaw && Array.isArray(pontuacoesRaw)) {
        pontuacoesRaw.forEach((p) => {
          const tid = p.time_id || p.timeId || p.id;
          pontuacoesRodada[tid] = p.pontos;
        });
      }

      for (const jogo of jogosDaRodada) {
        const timeAId = jogo.timeA.id || jogo.timeA.time_id;
        const timeBId = jogo.timeB.id || jogo.timeB.time_id;

        const pontosA = pontuacoesRodada[timeAId] ?? null;
        const pontosB = pontuacoesRodada[timeBId] ?? null;

        jogosComPontos.push({
          time1: jogo.timeA,
          time2: jogo.timeB,
          pontos1: pontosA,
          pontos2: pontosB,
        });
      }

      confrontosComPontos.push({
        rodada: rodadaNum,
        jogos: jogosComPontos,
      });
    }

    // 3. Salvar Cache
    if (confrontosComPontos.length > 0) {
      await salvarCachePersistente(ligaId, rodadaAtual, confrontosComPontos);
    }

    return confrontosComPontos;
  } catch (error) {
    console.error("[CORE] Erro fatal no cálculo:", error);
    return [];
  }
}

export function gerarConfrontos(times) {
  const n = times.length;
  const rodadas = [];
  const lista = [...times];
  if (n % 2 !== 0) lista.push(null);

  for (let rodada = 0; rodada < n - 1; rodada++) {
    const jogos = [];
    for (let i = 0; i < n / 2; i++) {
      const timeA = lista[i];
      const timeB = lista[n - 1 - i];
      if (timeA && timeB) {
        jogos.push({ timeA, timeB });
      }
    }
    rodadas.push(jogos);
    lista.splice(1, 0, lista.pop());
  }
  return rodadas;
}

export function calcularResultadoConfronto(pontosA, pontosB) {
  const A = parseFloat(pontosA || 0);
  const B = parseFloat(pontosB || 0);

  const vitoria = 10;
  const derrota = -10;
  const empate = 0;

  if (A > B)
    return {
      financeiroA: vitoria,
      financeiroB: derrota,
      pontosA: 3,
      pontosB: 0,
    };
  if (B > A)
    return {
      financeiroA: derrota,
      financeiroB: vitoria,
      pontosA: 0,
      pontosB: 3,
    };
  return { financeiroA: empate, financeiroB: empate, pontosA: 1, pontsB: 1 };
}

// ============================================================================
// 🔧 LÓGICA DE NEGÓCIO
// ============================================================================

/**
 * Calcula a classificação completa com todos os critérios de desempate
 */
export async function calcularClassificacao(ligaId, times, confrontos, rodadaAtualBrasileirao) {
  // ✅ VERIFICAR CACHE PRIMEIRO (MongoDB)
  const rodadaLiga = rodadaAtualBrasileirao - PONTOS_CORRIDOS_CONFIG.rodadaInicial + 1;
  const cacheClassificacao = await lerCachePersistente(ligaId, rodadaLiga);
  
  if (cacheClassificacao && Array.isArray(cacheClassificacao) && cacheClassificacao.length > 0) {
    console.log(`[CORE] 💾 Classificação em cache para rodada ${rodadaLiga} (${cacheClassificacao.length} times)`);
    return {
      classificacao: cacheClassificacao,
      ultimaRodadaComDados: rodadaAtualBrasileirao,
      houveErro: false,
      fromCache: true
    };
  }

  console.log(`[CORE] ⚙️ Calculando classificação do zero para rodada ${rodadaLiga}...`);

  const classificacao = times.map(time => ({
    time_id: time.id || time.time_id,
    nome_time: time.nome_time || time.nome || 'N/D',
    nome_cartola: time.nome_cartola || 'N/D',
    foto_perfil: time.foto_perfil || '',
    foto_time: time.foto_time || '',
    pontos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    gols_pro: 0,
    gols_contra: 0,
    saldo_gols: 0,
    financeiro: 0
  }));

  // Processar cada rodada de confrontos
  for (let rodadaIdx = 0; rodadaIdx < confrontos.length; rodadaIdx++) {
    const rodadaNum = rodadaIdx + 1;
    const rodadaBrasileirao = PONTOS_CORRIDOS_CONFIG.rodadaInicial + rodadaIdx;
    
    // Parar se já passou da rodada atual do brasileirão
    if (rodadaBrasileirao >= rodadaAtualBrasileirao) {
      break;
    }

    const jogosRodada = confrontos[rodadaIdx];
    if (!jogosRodada || !Array.isArray(jogosRodada)) continue;

    // Buscar pontuações da rodada
    const pontuacoesRaw = await getRankingRodadaEspecifica(ligaId, rodadaNum);
    const pontuacoesMap = {};
    
    if (pontuacoesRaw && Array.isArray(pontuacoesRaw)) {
      pontuacoesRaw.forEach((p) => {
        const tid = p.time_id || p.timeId || p.id;
        pontuacoesMap[tid] = p.pontos;
      });
    }

    // Processar cada jogo da rodada
    for (const jogo of jogosRodada) {
      const timeAId = jogo.timeA?.id || jogo.timeA?.time_id;
      const timeBId = jogo.timeB?.id || jogo.timeB?.time_id;

      if (!timeAId || !timeBId) continue;

      const pontosA = pontuacoesMap[timeAId] || null;
      const pontosB = pontuacoesMap[timeBId] || null;

      if (pontosA === null || pontosB === null) continue;

      const resultado = calcularFinanceiroConfronto(pontosA, pontosB);

      // Atualizar estatísticas do Time A
      const idxA = classificacao.findIndex(t => t.time_id === timeAId);
      if (idxA !== -1) {
        classificacao[idxA].pontos += resultado.pontosA;
        classificacao[idxA].vitorias += resultado.tipo === 'vitoria' ? 1 : 0;
        classificacao[idxA].empates += resultado.tipo === 'empate' ? 1 : 0;
        classificacao[idxA].derrotas += resultado.tipo !== 'vitoria' && resultado.tipo !== 'empate' ? 1 : 0;
        classificacao[idxA].financeiro += resultado.financeiroA;
        classificacao[idxA].gols_pro += pontosA || 0;
        classificacao[idxA].gols_contra += pontosB || 0;
        classificacao[idxA].saldo_gols = (classificacao[idxA].gols_pro || 0) - (classificacao[idxA].gols_contra || 0);
      }

      // Atualizar estatísticas do Time B
      const idxB = classificacao.findIndex(t => t.time_id === timeBId);
      if (idxB !== -1) {
        classificacao[idxB].pontos += resultado.pontosB;
        classificacao[idxB].vitorias += resultado.tipo !== 'vitoria' && resultado.tipo !== 'empate' ? 1 : 0;
        classificacao[idxB].empates += resultado.tipo === 'empate' ? 1 : 0;
        classificacao[idxB].derrotas += resultado.tipo === 'vitoria' ? 1 : 0;
        classificacao[idxB].financeiro += resultado.financeiroB;
        classificacao[idxB].gols_pro += pontosB || 0;
        classificacao[idxB].gols_contra += pontosA || 0;
        classificacao[idxB].saldo_gols = (classificacao[idxB].gols_pro || 0) - (classificacao[idxB].gols_contra || 0);
      }
    }
  }

  // Ordenar a classificação (por pontos, depois saldo de gols, depois vitórias)
  classificacao.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.saldo_gols !== a.saldo_gols) return b.saldo_gols - a.saldo_gols;
    return b.vitorias - a.vitorias;
  });

  // Adicionar informações de escudo e foto de perfil usando os dados originais de 'times'
  const classificacaoFinal = classificacao.map(timeClassificado => {
    const timeOriginal = times.find(t => t && t.id === timeClassificado.time_id);
    if (!timeOriginal) {
      console.warn(`[PONTOS-CORRIDOS-CORE] Time ${timeClassificado.time_id} não encontrado na lista de times para adicionar detalhes de imagem.`);
      return {
        ...timeClassificado,
        foto_perfil: '',
        foto_time: '',
        url_escudo_png: '', // Adicionando para garantir que o campo exista
      };
    }

    // Validar e extrair dados do time com fallbacks
    const nome = timeOriginal.nome_time || timeOriginal.nome || `Time ${timeClassificado.time_id}`;
    const escudo = timeOriginal.url_escudo_png || timeOriginal.escudo || timeOriginal.foto_time || "";

    return {
      ...timeClassificado,
      nome_time: nome, // Garante que o nome esteja presente
      foto_perfil: timeOriginal.foto_perfil || '',
      foto_time: timeOriginal.foto_time || '', // Pode ser usado como fallback para escudo
      url_escudo_png: escudo, // Mapeando para o campo esperado pela UI
    };
  });

  // ✅ SALVAR NO CACHE MONGODB (Snapshot vitalício)
  const statusMercado = getStatusMercado();
  const rodadaConsolidada = statusMercado.rodada_atual > rodadaLiga; // Rodada já encerrada?
  
  if (classificacaoFinal.length > 0 && rodadaConsolidada) {
    console.log(`[CORE] 💾 Salvando classificação consolidada da rodada ${rodadaLiga} no MongoDB...`);
    await salvarCachePersistente(ligaId, rodadaLiga, classificacaoFinal);
  } else if (classificacaoFinal.length > 0) {
    console.log(`[CORE] ⚠️ Rodada ${rodadaLiga} ainda em andamento, cache temporário não salvo.`);
  }

  return {
    classificacao: classificacaoFinal,
    ultimaRodadaComDados: rodadaAtualBrasileirao,
    houveErro: false,
    fromCache: false
  };
}

/**
 * Processa dados de uma rodada específica
 */
export async function processarDadosRodada(ligaId, rodadaCartola, jogos) {
  const pontuacoesMap = {};

  try {
    if (getRankingRodadaEspecifica) {
      const ranking = await getRankingRodadaEspecifica(ligaId, rodadaCartola);
      if (Array.isArray(ranking)) {
        ranking.forEach(p => {
          const timeId = p.time_id || p.timeId || p.id;
          pontuacoesMap[timeId] = p.pontos || 0;
        });
      }
    }
  } catch (error) {
    console.warn(`[CORE] Erro ao buscar pontuações da rodada ${rodadaCartola}:`, error);
  }

  return { pontuacoesMap };
}

/**
 * Normaliza dados de jogo para exportação
 */
export function normalizarDadosParaExportacao(jogo, pontuacoesMap = {}) {
  const timeAId = jogo.timeA?.id || jogo.timeA?.time_id;
  const timeBId = jogo.timeB?.id || jogo.timeB?.time_id;

  return {
    time1: {
      id: timeAId,
      nome_time: jogo.timeA?.nome_time || jogo.timeA?.nome || 'N/D',
      nome_cartola: jogo.timeA?.nome_cartola || 'N/D',
      foto_perfil: jogo.timeA?.foto_perfil || '',
      foto_time: jogo.timeA?.foto_time || ''
    },
    time2: {
      id: timeBId,
      nome_time: jogo.timeB?.nome_time || jogo.timeB?.nome || 'N/D',
      nome_cartola: jogo.timeB?.nome_cartola || 'N/D',
      foto_perfil: jogo.timeB?.foto_perfil || '',
      foto_time: jogo.timeB?.foto_time || ''
    },
    pontos1: pontuacoesMap[timeAId] || null,
    pontos2: pontuacoesMap[timeBId] || null
  };
}

/**
 * Normaliza classificação para exportação
 */
export function normalizarClassificacaoParaExportacao(classificacao) {
  if (!Array.isArray(classificacao)) return [];

  return classificacao.map(time => ({
    time_id: time.time_id,
    nome_time: time.nome_time || 'N/D',
    nome_cartola: time.nome_cartola || 'N/D',
    foto_perfil: time.foto_perfil || '',
    foto_time: time.foto_time || '',
    pontos: time.pontos || 0,
    vitorias: time.vitorias || 0,
    empates: time.empates || 0,
    derrotas: time.derrotas || 0,
    gols_pro: time.gols_pro || 0,
    gols_contra: time.gols_contra || 0,
    saldo_gols: time.saldo_gols || 0,
    financeiro: time.financeiro || 0
  }));
}

/**
 * Valida dados de entrada
 */
export function validarDadosEntrada(times, confrontos) {
  if (!Array.isArray(times) || times.length === 0) {
    throw new Error('Times inválidos ou vazios');
  }

  if (!Array.isArray(confrontos) || confrontos.length === 0) {
    throw new Error('Confrontos inválidos ou vazios');
  }

  return true;
}

/**
 * Calcula o resultado financeiro de um confronto
 */
export function calcularFinanceiroConfronto(pontosA, pontosB, config = PONTOS_CORRIDOS_CONFIG) {
  const A = parseFloat(pontosA || 0);
  const B = parseFloat(pontosB || 0);
  const diferenca = Math.abs(A - B);

  const { empateTolerancia, goleadaMinima } = config.criterios;
  const financeiro = config.financeiro;

  // Empate
  if (diferenca <= empateTolerancia) {
    return {
      financeiroA: financeiro.empate,
      financeiroB: financeiro.empate,
      pontosA: 1,
      pontosB: 1,
      tipo: 'empate'
    };
  }

  // Goleada
  if (diferenca >= goleadaMinima) {
    if (A > B) {
      return {
        financeiroA: financeiro.goleada,
        financeiroB: -financeiro.goleada,
        pontosA: 3,
        pontosB: 0,
        tipo: 'goleada'
      };
    } else {
      return {
        financeiroA: -financeiro.goleada,
        financeiroB: financeiro.goleada,
        pontosA: 0,
        pontosB: 3,
        tipo: 'goleada'
      };
    }
  }

  // Vitória simples
  if (A > B) {
    return {
      financeiroA: financeiro.vitoria,
      financeiroB: -financeiro.vitoria,
      pontosA: 3,
      pontosB: 0,
      tipo: 'vitoria'
    };
  } else {
    return {
      financeiroA: -financeiro.vitoria,
      financeiroB: financeiro.vitoria,
      pontosA: 0,
      pontosB: 3,
      tipo: 'vitoria'
    };
  }
}

// ============================================================================
// 🔌 EXPORTAÇÕES DE COMPATIBILIDADE
// ============================================================================

// Alias para manter compatibilidade com código antigo
export const buscarStatusMercado = atualizarStatusMercado;

// Re-exportar getLigaId
export { getLigaId };