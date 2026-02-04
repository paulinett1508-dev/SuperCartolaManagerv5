// MATA-MATA ORQUESTRADOR - Coordenador Principal v1.4
// Responsável por: coordenação de módulos, carregamento dinâmico, cache
// ✅ v1.4: FIX CRÍTICO - Verifica temporada da API antes de assumir dados anteriores
// ✅ v1.3: Detecção dinâmica de temporada (R1 + mercado aberto = temporada anterior)
// ✅ v1.2: Adiciona persistência no MongoDB ao calcular fases

import {
  edicoes,
  getFaseInfo,
  getLigaId,
  getRodadaPontosText,
  getEdicaoMataMata,
} from "./mata-mata-config.js";
import {
  setRankingFunction as setRankingConfronto,
  getPontosDaRodada,
  montarConfrontosPrimeiraFase,
  montarConfrontosFase,
  calcularValoresConfronto,
  extrairVencedores as extrairVencedoresFunc,
} from "./mata-mata-confrontos.js";
import { setRankingFunction as setRankingFinanceiro } from "./mata-mata-financeiro.js";
import {
  renderizarInterface,
  renderLoadingState,
  renderInstrucaoInicial,
  renderErrorState,
  renderTabelaMataMata,
  renderRodadaPendente,
  renderBannerCampeao,
} from "./mata-mata-ui.js";
import { cacheManager } from "../core/cache-manager.js";

// Variáveis dinâmicas para rodadas
let getRankingRodadaEspecifica = null;
let rodadasCarregados = false;
let rodadasCarregando = false;

// Cache de módulos
const moduleCache = new Map();

// ✅ CACHE LOCAL DE PONTOS POR RODADA (evita buscas duplicadas)
const pontosRodadaCache = new Map();

// ✅ CACHE LOCAL DE RANKING BASE POR EDIÇÃO (evita buscas duplicadas)
const rankingBaseCache = new Map();

// Configuração de cache persistente
const CACHE_CONFIG = {
  ttl: {
    confrontos: 30 * 60 * 1000, // 30 minutos
    edicao: 60 * 60 * 1000, // 1 hora
    rodadaConsolidada: Infinity, // Cache permanente para rodadas fechadas
  },
};

// Estado atual
let edicaoAtual = null;

// ✅ Cache de status do mercado (evita fetches duplicados)
let mercadoStatusCache = null;
let mercadoStatusTimestamp = 0;
const MERCADO_CACHE_TTL = 60 * 1000; // 1 minuto

async function getMercadoStatusCached() {
  const now = Date.now();
  if (mercadoStatusCache && (now - mercadoStatusTimestamp) < MERCADO_CACHE_TTL) {
    return mercadoStatusCache;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch("/api/cartola/mercado/status", {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      mercadoStatusCache = await response.json();
      mercadoStatusTimestamp = now;
      return mercadoStatusCache;
    }
  } catch (err) {
    console.warn("[MATA-ORQUESTRADOR] Erro ao buscar status do mercado:", err.message);
  }
  return null;
}

// =====================================================================
// ✅ NOVA FUNÇÃO: PERSISTIR FASE NO MONGODB
// =====================================================================
async function salvarFaseNoMongoDB(
  ligaId,
  edicao,
  fase,
  confrontos,
  rodadaAtual,
) {
  try {
    console.log(`[MATA-ORQUESTRADOR] 💾 Salvando fase ${fase} no MongoDB...`);

    // 1. Buscar dados atuais do MongoDB
    let dadosAtuais = {};
    try {
      const resGet = await fetch(`/api/mata-mata/cache/${ligaId}/${edicao}`);
      if (resGet.ok) {
        const cacheAtual = await resGet.json();
        if (cacheAtual.cached && cacheAtual.dados) {
          dadosAtuais = cacheAtual.dados;
        }
      }
    } catch (err) {
      console.warn("[MATA-ORQUESTRADOR] Cache não existe ainda, criando novo");
    }

    // 2. Atualizar apenas a fase calculada
    dadosAtuais[fase] = confrontos;

    // 3. Se for a final e tiver vencedor, salvar o campeão
    if (fase === "final" && confrontos.length > 0) {
      const confrontoFinal = confrontos[0];
      const pontosA = parseFloat(confrontoFinal.timeA?.pontos) || 0;
      const pontosB = parseFloat(confrontoFinal.timeB?.pontos) || 0;

      if (pontosA > 0 || pontosB > 0) {
        const campeao =
          pontosA > pontosB ? confrontoFinal.timeA : confrontoFinal.timeB;
        dadosAtuais.campeao = campeao;
      }
    }

    // 4. Salvar no MongoDB
    const resPost = await fetch(`/api/mata-mata/cache/${ligaId}/${edicao}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rodada: rodadaAtual,
        dados: dadosAtuais,
      }),
    });

    if (resPost.ok) {
      console.log(
        `[MATA-ORQUESTRADOR] ✅ Fase ${fase} salva no MongoDB com sucesso`,
      );
    } else {
      console.error(
        `[MATA-ORQUESTRADOR] ❌ Erro ao salvar fase ${fase}:`,
        await resPost.text(),
      );
    }
  } catch (error) {
    console.error(
      `[MATA-ORQUESTRADOR] ❌ Erro ao persistir fase ${fase}:`,
      error,
    );
  }
}

// ✅ FUNÇÃO PARA OBTER PONTOS COM CACHE LOCAL
async function getPontosDaRodadaCached(ligaId, rodada) {
  const cacheKey = `${ligaId}_${rodada}`;

  if (pontosRodadaCache.has(cacheKey)) {
    console.log(`[MATA-ORQUESTRADOR] 💾 Cache hit: pontos rodada ${rodada}`);
    return pontosRodadaCache.get(cacheKey);
  }

  const pontos = await getPontosDaRodada(ligaId, rodada);
  pontosRodadaCache.set(cacheKey, pontos);
  return pontos;
}

// ✅ FUNÇÃO PARA OBTER RANKING BASE COM CACHE LOCAL
async function getRankingBaseCached(ligaId, rodadaDefinicao) {
  const cacheKey = `${ligaId}_base_${rodadaDefinicao}`;

  if (rankingBaseCache.has(cacheKey)) {
    console.log(
      `[MATA-ORQUESTRADOR] 💾 Cache hit: ranking base rodada ${rodadaDefinicao}`,
    );
    return rankingBaseCache.get(cacheKey);
  }

  console.log(
    `[MATA-ORQUESTRADOR] Buscando ranking base da Rodada ${rodadaDefinicao}...`,
  );

  const rankingBase = await Promise.race([
    getRankingRodadaEspecifica(ligaId, rodadaDefinicao),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout ao buscar ranking")), 10000),
    ),
  ]);

  rankingBaseCache.set(cacheKey, rankingBase);
  return rankingBase;
}

// Função de carregamento dinâmico das rodadas
async function carregarRodadas() {
  if (rodadasCarregados) return true;
  if (rodadasCarregando) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (rodadasCarregados || !rodadasCarregando) {
          clearInterval(checkInterval);
          resolve(rodadasCarregados);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 5000);
    });
  }

  rodadasCarregando = true;

  try {
    if (moduleCache.has("rodadas")) {
      const cached = moduleCache.get("rodadas");
      getRankingRodadaEspecifica = cached.getRankingRodadaEspecifica;
      rodadasCarregados = true;
      return true;
    }

    console.log("[MATA-ORQUESTRADOR] Carregando módulo rodadas...");
    const rodadasModule = await import("../rodadas.js");

    if (rodadasModule && rodadasModule.getRankingRodadaEspecifica) {
      getRankingRodadaEspecifica = rodadasModule.getRankingRodadaEspecifica;

      // Injetar dependência nos módulos
      setRankingConfronto(getRankingRodadaEspecifica);
      setRankingFinanceiro(getRankingRodadaEspecifica);

      moduleCache.set("rodadas", { getRankingRodadaEspecifica });
      rodadasCarregados = true;
      console.log("[MATA-ORQUESTRADOR] Módulo rodadas carregado com sucesso");
      return true;
    } else {
      throw new Error("Função getRankingRodadaEspecifica não encontrada");
    }
  } catch (error) {
    console.error(
      "[MATA-ORQUESTRADOR] Erro ao carregar módulo rodadas:",
      error,
    );
    rodadasCarregados = false;
    return false;
  } finally {
    rodadasCarregando = false;
  }
}

// Função principal para carregar mata-mata
export async function carregarMataMata() {
  const container = document.getElementById("mata-mata");
  if (!container) return;

  console.log("[MATA-ORQUESTRADOR] Iniciando carregamento do mata-mata...");

  try {
    console.log("[MATA-ORQUESTRADOR] Pré-carregando dependências...");
    const rodadasOk = await carregarRodadas();
    if (!rodadasOk) {
      console.warn("[MATA-ORQUESTRADOR] Módulo rodadas não carregou");
    }
  } catch (error) {
    console.warn("[MATA-ORQUESTRADOR] Erro no pré-carregamento:", error);
  }

  const ligaId = getLigaId();

  try {
    const data = await getMercadoStatusCached();

    if (data) {
      let rodadaAtual = data.rodada_atual || 1;
      const mercadoAberto = data.status_mercado === 1;
      const temporadaAPI = data.temporada || new Date().getFullYear();
      const anoAtual = new Date().getFullYear();
      const RODADA_FINAL_CAMPEONATO = data.rodada_final || 38;

      // v1.4: Detecção dinâmica de temporada com verificação do ano
      if (rodadaAtual === 1 && mercadoAberto) {
        // Se API já retorna ano atual, NÃO há dados anteriores
        if (temporadaAPI >= anoAtual) {
          console.log("[MATA-ORQUESTRADOR] Temporada iniciando - nenhuma edição ativa ainda");
          edicoes.forEach((edicao) => {
            edicao.ativo = false;
          });
          renderizarAguardandoDados(container, ligaId);
          return;
        }
        // Pré-temporada real: usar rodada 38 da anterior
        console.log("[MATA-ORQUESTRADOR] Pré-temporada - usando rodada 38 da temporada anterior");
        rodadaAtual = RODADA_FINAL_CAMPEONATO;
      }

      edicoes.forEach((edicao) => {
        edicao.ativo = rodadaAtual >= edicao.rodadaDefinicao;
      });
    } else {
      // Fallback: ativar todas as edições para temporada anterior
      edicoes.forEach((edicao) => {
        edicao.ativo = true;
      });
    }
  } catch (error) {
    console.warn(
      "[MATA-ORQUESTRADOR] Erro ao verificar status do mercado:",
      error.message,
    );
    edicoes.forEach((edicao) => {
      edicao.ativo = true;
    });
  }

  renderizarInterface(container, ligaId, handleEdicaoChange, handleFaseClick);
}

// v1.4: Renderizar UI de aguardando dados
function renderizarAguardandoDados(container, ligaId) {
  if (!container) return;

  container.innerHTML = `
    <div class="mata-mata-aguardando" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
      border-radius: 16px;
      border: 1px solid rgba(255, 136, 0, 0.2);
      min-height: 300px;
      margin: 20px;
    ">
      <span class="material-icons" style="
        font-size: 64px;
        color: var(--laranja, #ff8800);
        margin-bottom: 20px;
      ">account_tree</span>
      <h2 style="
        font-family: 'Russo One', sans-serif;
        color: white;
        font-size: 24px;
        margin-bottom: 12px;
      ">Aguardando Início do Campeonato</h2>
      <p style="
        color: rgba(255, 255, 255, 0.7);
        font-size: 16px;
        max-width: 400px;
        line-height: 1.5;
      ">
        As chaves do Mata-Mata serão definidas quando as rodadas de classificação forem concluídas.
      </p>
    </div>
  `;
}

// Handler para mudança de edição
function handleEdicaoChange(novaEdicao, fase, ligaId) {
  edicaoAtual = novaEdicao;
  // ✅ Limpar caches locais ao trocar de edição
  pontosRodadaCache.clear();
  rankingBaseCache.clear();
  carregarFase(fase, ligaId);
}

// Handler para clique em fase
function handleFaseClick(fase, edicao) {
  edicaoAtual = edicao;
  const ligaId = getLigaId();
  carregarFase(fase, ligaId);
}

// Função auxiliar para cache de confrontos
async function getCachedConfrontos(ligaId, edicao, fase, rodadaPontos) {
  const cacheKey = `matamata_confrontos_${ligaId}_${edicao}_${fase}_${rodadaPontos}`;

  return await cacheManager.get("rodadas", cacheKey, null, {
    ttl: CACHE_CONFIG.ttl.confrontos,
  });
}

async function setCachedConfrontos(
  ligaId,
  edicao,
  fase,
  rodadaPontos,
  confrontos,
) {
  const cacheKey = `matamata_confrontos_${ligaId}_${edicao}_${fase}_${rodadaPontos}`;

  await cacheManager.set("rodadas", cacheKey, confrontos);
  console.log(
    `[MATA-ORQUESTRADOR] Confrontos salvos em cache local: ${cacheKey}`,
  );
}

// Função para carregar uma fase específica
async function carregarFase(fase, ligaId) {
  const contentId = "mataMataContent";
  const contentElement = document.getElementById(contentId);

  if (!contentElement) {
    console.error("[MATA-ORQUESTRADOR] Elemento de conteúdo não encontrado");
    return;
  }

  console.log(`[MATA-ORQUESTRADOR] Carregando fase: ${fase}`);

  renderLoadingState(contentId, fase, edicaoAtual);

  try {
    const rodadasOk = await carregarRodadas();

    if (!rodadasOk) {
      throw new Error(
        "Módulo rodadas não disponível - não é possível calcular confrontos",
      );
    }

    if (!edicaoAtual) {
      renderInstrucaoInicial(contentId);
      return;
    }

    let rodada_atual = 1;
    let isTemporadaAnterior = false;
    try {
      const data = await getMercadoStatusCached();

      if (data) {
        rodada_atual = data.rodada_atual || 1;
        const mercadoAberto = data.status_mercado === 1;
        const temporadaAPI = data.temporada || new Date().getFullYear();
        const anoAtual = new Date().getFullYear();
        const RODADA_FINAL_CAMPEONATO = data.rodada_final || 38;

        // v1.4: Detecção dinâmica de temporada com verificação do ano
        if (rodada_atual === 1 && mercadoAberto) {
          if (temporadaAPI >= anoAtual) {
            console.log("[MATA-ORQUESTRADOR] Temporada iniciando - sem dados para calcular fases");
            rodada_atual = 0;
            isTemporadaAnterior = false;
          } else {
            console.log("[MATA-ORQUESTRADOR] Pré-temporada - usando rodada 38 para cálculo de fases");
            rodada_atual = RODADA_FINAL_CAMPEONATO;
            isTemporadaAnterior = true;
          }
        }
      } else {
        rodada_atual = 0;
      }
    } catch (err) {
      console.warn("[MATA-ORQUESTRADOR] Erro ao buscar mercado, usando defaults seguros");
      rodada_atual = 0;
      isTemporadaAnterior = false;
    }

    const edicaoSelecionada = edicoes.find((e) => e.id === edicaoAtual);
    if (!edicaoSelecionada) {
      throw new Error(`Edição ${edicaoAtual} não encontrada.`);
    }

    const rodadaDefinicao = edicaoSelecionada.rodadaDefinicao;

    // ✅ USA CACHE LOCAL PARA RANKING BASE
    const rankingBase = await getRankingBaseCached(ligaId, rodadaDefinicao);

    console.log(
      `[MATA-ORQUESTRADOR] Ranking base recebido: ${rankingBase?.length || 0} times`,
    );

    if (!Array.isArray(rankingBase) || rankingBase.length < 32) {
      throw new Error(
        `Ranking base inválido: ${rankingBase?.length || 0}/32 times encontrados`,
      );
    }

    const faseInfo = getFaseInfo(edicaoAtual, edicaoSelecionada);
    const currentFaseInfo = faseInfo[fase.toLowerCase()];
    if (!currentFaseInfo) throw new Error(`Fase desconhecida: ${fase}`);

    const {
      label: faseLabel,
      pontosRodada: rodadaPontosNum,
      numJogos,
      prevFaseRodada,
    } = currentFaseInfo;

    let isPending = rodada_atual < rodadaPontosNum;
    console.log(
      `[MATA-ORQUESTRADOR] Rodada ${rodadaPontosNum} - Status: ${isPending ? "Pendente" : "Concluída"}`,
    );

    // ✅ TENTAR CACHE PRIMEIRO (apenas para rodadas consolidadas)
    if (!isPending) {
      const cachedConfrontos = await getCachedConfrontos(
        ligaId,
        edicaoAtual,
        fase,
        rodadaPontosNum,
      );

      if (cachedConfrontos) {
        console.log(`[MATA-ORQUESTRADOR] 💾 Confrontos recuperados do cache`);
        renderTabelaMataMata(
          cachedConfrontos,
          contentId,
          faseLabel,
          edicaoAtual,
          isPending,
        );

        if (fase === "final" && cachedConfrontos.length > 0) {
          const edicaoNome = edicaoSelecionada.nome;
          renderBannerCampeao(
            contentId,
            cachedConfrontos[0],
            edicaoNome,
            isPending,
          );
        }

        return; // ✅ RETORNA CEDO COM CACHE (MongoDB já tem os dados se cache local existe)
      }
    }

    // ❌ CACHE MISS - CALCULAR
    let timesParaConfronto = rankingBase;
    if (prevFaseRodada) {
      let vencedoresAnteriores = rankingBase;

      for (let r = edicaoSelecionada.rodadaInicial; r <= prevFaseRodada; r++) {
        // ✅ USAR CACHE LOCAL PARA EVITAR BUSCAS DUPLICADAS
        const pontosDaRodadaAnterior = await getPontosDaRodadaCached(ligaId, r);
        const jogosFaseAnterior =
          r === edicaoSelecionada.rodadaInicial
            ? 16
            : 32 / Math.pow(2, r - edicaoSelecionada.rodadaInicial + 1);
        const confrontosAnteriores =
          r === edicaoSelecionada.rodadaInicial
            ? montarConfrontosPrimeiraFase(rankingBase, pontosDaRodadaAnterior)
            : montarConfrontosFase(
                vencedoresAnteriores,
                pontosDaRodadaAnterior,
                jogosFaseAnterior,
              );
        vencedoresAnteriores = await extrairVencedores(confrontosAnteriores);
      }
      timesParaConfronto = vencedoresAnteriores;
    }

    // ✅ USAR CACHE LOCAL PARA PONTOS DA RODADA ATUAL
    const pontosRodadaAtual = isPending
      ? {}
      : await getPontosDaRodadaCached(ligaId, rodadaPontosNum);

    const confrontos =
      fase === "primeira"
        ? montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual)
        : montarConfrontosFase(timesParaConfronto, pontosRodadaAtual, numJogos);

    // ✅ SALVAR NO CACHE LOCAL (apenas se rodada consolidada)
    if (!isPending) {
      await setCachedConfrontos(
        ligaId,
        edicaoAtual,
        fase,
        rodadaPontosNum,
        confrontos,
      );

      // ✅ NOVO: SALVAR NO MONGODB TAMBÉM
      await salvarFaseNoMongoDB(
        ligaId,
        edicaoAtual,
        fase,
        confrontos,
        rodada_atual,
      );
    }

    // Calcular valores dos confrontos
    calcularValoresConfronto(confrontos, isPending, fase);

    // Renderizar tabela
    renderTabelaMataMata(
      confrontos,
      contentId,
      faseLabel,
      edicaoAtual,
      isPending,
    );

    // Renderizar mensagem de rodada pendente se necessário
    if (isPending) {
      renderRodadaPendente(contentId, rodadaPontosNum);
    }

    // Renderizar banner do campeão na FINAL (apenas se não estiver pendente)
    if (fase === "final" && !isPending && confrontos.length > 0) {
      const edicaoNome = edicaoSelecionada.nome;
      renderBannerCampeao(contentId, confrontos[0], edicaoNome, isPending);
      console.log(
        `[MATA-ORQUESTRADOR] Banner do campeão renderizado para ${edicaoNome}`,
      );
    }

    console.log(`[MATA-ORQUESTRADOR] Fase ${fase} carregada com sucesso`);
  } catch (err) {
    console.error(`[MATA-ORQUESTRADOR] Erro ao carregar fase ${fase}:`, err);
    renderErrorState(contentId, fase, err);
  }
}

// Função wrapper para extrair vencedores (usa import estático)
function extrairVencedores(confrontos) {
  return extrairVencedoresFunc(confrontos);
}

// Cleanup global para evitar memory leaks
function setupCleanup() {
  window.addEventListener("beforeunload", () => {
    moduleCache.clear();
    pontosRodadaCache.clear();
    rankingBaseCache.clear();
    mercadoStatusCache = null;
    rodadasCarregados = false;
    console.log("[MATA-ORQUESTRADOR] Cleanup executado");
  });

  // Interceptar erros de Promise não tratadas
  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason &&
      event.reason.message &&
      event.reason.message.includes("message channel closed")
    ) {
      event.preventDefault();
    }
  });
}

// Inicialização do módulo
setupCleanup();

console.log("[MATA-ORQUESTRADOR] Módulo v1.3 carregado - Detecção dinâmica de temporada");
