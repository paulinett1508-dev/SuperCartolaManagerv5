// MATA-MATA ORQUESTRADOR - Coordenador Principal
// Responsável por: coordenação de módulos, carregamento dinâmico, cache

import { edicoes, getFaseInfo, getLigaId } from "./mata-mata-config.js";

// Funções auxiliares para exportação
function getEdicaoMataMata(edicaoAtual) {
  if (!edicaoAtual) return "SuperCartola 2025";
  
  const edicoes = {
    1: "SuperCartola 2025 - 1ª Edição",
    2: "SuperCartola 2025 - 2ª Edição", 
    3: "SuperCartola 2025 - 3ª Edição",
    4: "SuperCartola 2025 - 4ª Edição",
  };
  
  return edicoes[edicaoAtual] || `SuperCartola 2025 - ${edicaoAtual}ª Edição`;
}

function getRodadaPontosText(faseLabel, edicaoAtual) {
  const fasesRodadas = {
    "Primeira Fase": "Rodada 22 do Brasileirão",
    "Oitavas de Final": "Rodada 23 do Brasileirão", 
    "Quartas de Final": "Rodada 24 do Brasileirão",
    "Semifinal": "Rodada 25 do Brasileirão",
    "Final": "Rodada 26 do Brasileirão",
  };
  
  return fasesRodadas[faseLabel] || `Rodada do ${faseLabel}`;
}
import {
  setRankingFunction as setRankingConfronto,
  getPontosDaRodada,
  montarConfrontosPrimeiraFase,
  montarConfrontosFase,
  calcularValoresConfronto,
} from "./mata-mata-confrontos.js";
import { setRankingFunction as setRankingFinanceiro } from "./mata-mata-financeiro.js";
import {
  renderizarInterface,
  renderLoadingState,
  renderInstrucaoInicial,
  renderErrorState,
  renderTabelaMataMata,
  renderRodadaPendente,
} from "./mata-mata-ui.js";

// Variáveis dinâmicas para exports
let criarBotaoExportacaoMataMata = null;
let exportsCarregados = false;
let exportsCarregando = false;

// Variáveis dinâmicas para rodadas
let getRankingRodadaEspecifica = null;
let rodadasCarregados = false;
let rodadasCarregando = false;

// Cache de módulos
const moduleCache = new Map();

// Estado atual
let edicaoAtual = null;

// Cache de rankings por rodada
const rankingCache = new Map();
const RANKING_CACHE_DURATION = 300000; // 5 minutos

// Função para obter ranking com cache
async function getRankingComCache(ligaId, rodada) {
  const cacheKey = `${ligaId}-${rodada}`;
  const cached = rankingCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < RANKING_CACHE_DURATION) {
    console.log(`[MATA-ORQUESTRADOR] ⚡ Cache hit para rodada ${rodada}`);
    return cached.data;
  }

  console.log(`[MATA-ORQUESTRADOR] 🌐 Buscando ranking da rodada ${rodada}...`);
  const ranking = await getRankingRodadaEspecifica(ligaId, rodada);
  
  rankingCache.set(cacheKey, {
    data: ranking,
    timestamp: Date.now()
  });

  return ranking;
}

// Função de carregamento dinâmico dos exports
async function carregarExports() {
  if (exportsCarregados) return true;
  if (exportsCarregando) {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const checkInterval = setInterval(() => {
        if (exportsCarregados || !exportsCarregando) {
          clearInterval(checkInterval);
          controller.abort();
          resolve(exportsCarregados);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        controller.abort();
        resolve(false);
      }, 5000);
    });
  }

  exportsCarregando = true;

  try {
    if (moduleCache.has("exports")) {
      const cached = moduleCache.get("exports");
      criarBotaoExportacaoMataMata = cached.criarBotaoExportacaoMataMata;
      exportsCarregados = true;
      console.log("[MATA-ORQUESTRADOR] Exports carregados do cache");
      return true;
    }

    console.log("[MATA-ORQUESTRADOR] Carregando módulo de exports...");

    try {
      const exportModule = await import("../exports/export-exports.js");
      if (exportModule && exportModule.exportarMataMata) {
        criarBotaoExportacaoMataMata = exportModule.exportarMataMata;
        moduleCache.set("exports", { criarBotaoExportacaoMataMata });
        exportsCarregados = true;
        console.log(
          "[MATA-ORQUESTRADOR] Exports carregados via função centralizada",
        );
        return true;
      }
    } catch (error) {
      console.warn(
        "[MATA-ORQUESTRADOR] Função centralizada não disponível, tentando módulo específico",
      );
    }

    const exportMataMataModule = await import("../exports/export-mata-mata.js");
    if (
      exportMataMataModule &&
      exportMataMataModule.criarBotaoExportacaoMataMata
    ) {
      criarBotaoExportacaoMataMata =
        exportMataMataModule.criarBotaoExportacaoMataMata;
      moduleCache.set("exports", { criarBotaoExportacaoMataMata });
      exportsCarregados = true;
      console.log(
        "[MATA-ORQUESTRADOR] Exports carregados via módulo específico",
      );
      return true;
    }

    throw new Error("Nenhuma função de exportação encontrada");
  } catch (error) {
    console.warn("[MATA-ORQUESTRADOR] Erro ao carregar exports:", error);
    exportsCarregados = false;
    return false;
  } finally {
    exportsCarregando = false;
  }
}

// Função de carregamento dinâmico das rodadas
async function carregarRodadas() {
  if (rodadasCarregados) return true;
  if (rodadasCarregando) {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const checkInterval = setInterval(() => {
        if (rodadasCarregados || !rodadasCarregando) {
          clearInterval(checkInterval);
          controller.abort();
          resolve(rodadasCarregados);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        controller.abort();
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
      console.log("[MATA-ORQUESTRADOR] Módulo rodadas carregado do cache");
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

// Cache do status do mercado
let mercadoStatusCache = null;
let mercadoStatusTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minuto

// Função para obter status do mercado com cache
async function getMercadoStatus() {
  const now = Date.now();
  if (mercadoStatusCache && (now - mercadoStatusTimestamp) < CACHE_DURATION) {
    return mercadoStatusCache;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch("/api/cartola/mercado/status", {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      mercadoStatusCache = await response.json();
      mercadoStatusTimestamp = now;
      return mercadoStatusCache;
    }
  } catch (error) {
    console.warn("[MATA-ORQUESTRADOR] Erro ao buscar status:", error);
  }
  
  return mercadoStatusCache || { rodada_atual: 1 };
}

// Função principal para carregar mata-mata (OTIMIZADA)
export async function carregarMataMata() {
  const container = document.getElementById("mata-mata");
  if (!container) return;

  const startTime = performance.now();
  console.log("[MATA-ORQUESTRADOR] Iniciando carregamento OTIMIZADO...");

  const ligaId = getLigaId();

  // Carregar tudo em paralelo
  const [rodadasOk, exportsOk, mercadoData] = await Promise.allSettled([
    carregarRodadas(),
    carregarExports(),
    getMercadoStatus(),
  ]);

  // Processar resultados
  if (rodadasOk.status !== 'fulfilled') {
    console.warn("[MATA-ORQUESTRADOR] Módulo rodadas não carregou");
  }
  if (exportsOk.status !== 'fulfilled') {
    console.warn("[MATA-ORQUESTRADOR] Módulo exports não carregou");
  }

  // Atualizar edições ativas
  if (mercadoData.status === 'fulfilled' && mercadoData.value) {
    const rodadaAtual = mercadoData.value.rodada_atual || 1;
    edicoes.forEach((edicao) => {
      edicao.ativo = rodadaAtual >= edicao.rodadaDefinicao;
    });
  }

  renderizarInterface(container, ligaId, handleEdicaoChange, handleFaseClick);

  const endTime = performance.now();
  console.log(`[MATA-ORQUESTRADOR] ✅ Carregado em ${(endTime - startTime).toFixed(0)}ms`);
}

// Handler para mudança de edição
function handleEdicaoChange(novaEdicao, fase, ligaId) {
  edicaoAtual = novaEdicao;
  carregarFase(fase, ligaId);
}

// Handler para clique em fase
function handleFaseClick(fase, edicao) {
  edicaoAtual = edicao;
  const ligaId = getLigaId();
  carregarFase(fase, ligaId);
}

// Função para carregar uma fase específica
async function carregarFase(fase, ligaId) {
  const perfStart = performance.now();
  const contentId = "mataMataContent";
  const contentElement = document.getElementById(contentId);

  if (!contentElement) {
    console.error("[MATA-ORQUESTRADOR] Elemento de conteúdo não encontrado");
    return;
  }

  console.log(`[MATA-ORQUESTRADOR] ⚡ Carregando fase: ${fase}`);

  renderLoadingState(contentId, fase, edicaoAtual);

  try {
    // Verificar dependências (já devem estar carregadas)
    if (!getRankingRodadaEspecifica) {
      throw new Error(
        "Módulo rodadas não disponível - não é possível calcular confrontos",
      );
    }

    if (!edicaoAtual) {
      renderInstrucaoInicial(contentId);
      return;
    }

    // Usar cache do mercado ao invés de fazer nova requisição
    const mercadoData = await getMercadoStatus();
    const rodada_atual = mercadoData.rodada_atual || 1;

    const edicaoSelecionada = edicoes.find((e) => e.id === edicaoAtual);
    if (!edicaoSelecionada) {
      throw new Error(`Edição ${edicaoAtual} não encontrada.`);
    }

    const rodadaDefinicao = edicaoSelecionada.rodadaDefinicao;
    console.log(
      `[MATA-ORQUESTRADOR] Buscando ranking base da Rodada ${rodadaDefinicao}...`,
    );

    // Usar cache de ranking
    const rankingBase = await Promise.race([
      getRankingComCache(ligaId, rodadaDefinicao),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout ao buscar ranking")), 8000),
      ),
    ]);

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

    let timesParaConfronto = rankingBase;
    if (prevFaseRodada) {
      let vencedoresAnteriores = rankingBase;
      const rodadaInicial = edicaoSelecionada.rodadaInicial;

      for (let r = edicaoSelecionada.rodadaInicial; r <= prevFaseRodada; r++) {
        const pontosDaRodadaAnterior = await getPontosDaRodada(ligaId, r);
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

    // LÓGICA CORRIGIDA: Verificar status baseado na rodada de pontuação
    // Uma rodada está PENDENTE se:
    // 1. Ainda não começou (rodada_atual < rodadaPontosNum)
    // 2. OU está em andamento (rodada_atual === rodadaPontosNum)
    // Apenas rodadas CONCLUÍDAS (rodada_atual > rodadaPontosNum) podem ter valores financeiros
    const isPending = rodada_atual <= rodadaPontosNum;
    
    // Se a rodada de pontos é a ATUAL (em andamento), podemos buscar parciais
    const isRodadaEmAndamento = rodada_atual === rodadaPontosNum;
    
    console.log(
      `[MATA-ORQUESTRADOR] Rodada ${rodadaPontosNum} - Atual: ${rodada_atual} - Status: ${isPending ? (isRodadaEmAndamento ? "Em Andamento (Parciais - SEM valores financeiros)" : "Pendente") : "Concluída"}`,
    );

    // Verificar se é uma fase FUTURA (rodada ainda não começou)
    if (isPending && fase !== "primeira" && (!timesParaConfronto || timesParaConfronto.length === 0)) {
      contentElement.innerHTML = `
        <div class="rodada-pendente-fase">
          <span class="pendente-icon">⏳</span>
          <h3>Rodada Ainda Não Aconteceu</h3>
          <p><strong>Fase:</strong> ${faseLabel} <strong>•</strong> <strong>Rodada:</strong> ${rodadaPontosNum}</p>
          <p class="pendente-message">Aguardando definição dos times classificados.</p>
          <p class="pendente-submessage">Os confrontos serão gerados automaticamente após a conclusão da rodada ${prevFaseRodada}.</p>
        </div>
      `;
      return;
    }

    // Buscar pontos: se está pendente E não tem times, retorna vazio
    // Se está em andamento (rodada atual), busca parciais da API Cartola
    // Se já finalizou, busca pontos finais do MongoDB
    let pontosRodadaAtual = {};
    
    if (isPending && (!timesParaConfronto || timesParaConfronto.length === 0)) {
      pontosRodadaAtual = {};
    } else if (isRodadaEmAndamento) {
      // Buscar parciais usando API de atletas pontuados (mesmo padrão do módulo PARCIAIS)
      console.log(`[MATA-ORQUESTRADOR] 🔄 Buscando PARCIAIS da rodada ${rodadaPontosNum} (em andamento)...`);
      try {
        // Buscar atletas pontuados da rodada
        const resPartials = await fetch("/api/cartola/atletas/pontuados", {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            "If-Modified-Since": "0",
          },
        });

        if (!resPartials.ok) {
          throw new Error("Erro ao buscar parciais da API Cartola");
        }

        const partialsData = await resPartials.json();
        
        // Verificar se há dados de atletas pontuados
        if (!partialsData || !partialsData.atletas || Object.keys(partialsData.atletas).length === 0) {
          console.warn(`[MATA-ORQUESTRADOR] ⚠️ Parciais ainda não disponíveis na API Cartola`);
          // Fallback: usar dados zerados do MongoDB
          pontosRodadaAtual = await getPontosDaRodada(ligaId, rodadaPontosNum);
        } else {
          console.log(`[MATA-ORQUESTRADOR] ✅ Atletas pontuados recebidos (${Object.keys(partialsData.atletas).length} atletas)`);

        // Buscar escalações e calcular pontos para cada time
        const timesIds = timesParaConfronto.map(t => t.timeId);
        const parciaisPromises = timesIds.map(async (timeId) => {
          try {
            // Buscar escalação do time
            const resEscalacao = await fetch(`/api/cartola/time/id/${timeId}/${rodadaPontosNum}`);
            if (!resEscalacao.ok) {
              console.warn(`[MATA-ORQUESTRADOR] Time ${timeId} não tem escalação na rodada ${rodadaPontosNum}`);
              return { timeId, pontos: 0 };
            }

            const dadosEscalacao = await resEscalacao.json();
            
            // Calcular pontos baseado nos atletas escalados
            let pontos = 0;
            if (dadosEscalacao.atletas && Array.isArray(dadosEscalacao.atletas)) {
              dadosEscalacao.atletas.forEach((atleta) => {
                const pontuacao = partialsData.atletas[atleta.atleta_id]?.pontuacao || 0;
                // Capitão vale o dobro
                if (atleta.atleta_id === dadosEscalacao.capitao_id) {
                  pontos += pontuacao * 2;
                } else {
                  pontos += pontuacao;
                }
              });
            }

            return { timeId, pontos: parseFloat(pontos.toFixed(2)) };
          } catch (err) {
            console.warn(`[MATA-ORQUESTRADOR] Erro ao processar time ${timeId}:`, err.message);
            return { timeId, pontos: 0 };
          }
        });

        const parciais = await Promise.all(parciaisPromises);
          pontosRodadaAtual = Object.fromEntries(
            parciais.map(({ timeId, pontos }) => [timeId, pontos])
          );
          console.log(`[MATA-ORQUESTRADOR] ✅ Parciais calculadas:`, pontosRodadaAtual);
        }
      } catch (error) {
        console.error(`[MATA-ORQUESTRADOR] ❌ Erro ao buscar parciais:`, error);
        // Fallback para dados do MongoDB
        pontosRodadaAtual = await getPontosDaRodada(ligaId, rodadaPontosNum);
      }
    } else {
      pontosRodadaAtual = await getPontosDaRodada(ligaId, rodadaPontosNum);
    }

    const confrontos =
      fase === "primeira"
        ? montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual)
        : montarConfrontosFase(timesParaConfronto, pontosRodadaAtual, numJogos);

    // ✅ APENAS calcular valores financeiros se a rodada já foi CONCLUÍDA
    // Rodadas em andamento NÃO devem ter valores (+R$ 10 / -R$ 10)
    if (!isPending) {
      calcularValoresConfronto(confrontos, false);
    } else {
      // Para rodadas pendentes/em andamento, zerar valores
      confrontos.forEach(c => {
        c.timeA.valor = 0;
        c.timeB.valor = 0;
        c.vencedorDeterminado = null;
      });
    }

    // Renderizar tabela
    renderTabelaMataMata(
      confrontos,
      contentId,
      faseLabel,
      edicaoAtual,
      isPending,
    );

    // Adicionar botão de exportação
    if (exportsCarregados && criarBotaoExportacaoMataMata) {
      try {
        await criarBotaoExportacaoMataMata({
          containerId: contentId,
          fase: faseLabel,
          confrontos: confrontos,
          isPending: isPending,
          rodadaPontos: getRodadaPontosText(faseLabel, edicaoAtual),
          edicao: getEdicaoMataMata(edicaoAtual),
        });
        console.log("[MATA-ORQUESTRADOR] Botão de exportação adicionado");
      } catch (exportError) {
        console.warn(
          "[MATA-ORQUESTRADOR] Erro ao adicionar botão de exportação:",
          exportError,
        );
      }
    } else {
      console.warn("[MATA-ORQUESTRADOR] Função de exportação não disponível");
    }

    // Renderizar mensagem de rodada pendente APENAS se realmente não tiver pontos
    // (rodada futura ou sem dados)
    if (isPending && (!timesParaConfronto || timesParaConfronto.length === 0)) {
      renderRodadaPendente(contentId, rodadaPontosNum);
    } else if (isRodadaEmAndamento) {
      // Se está em andamento, mostrar aviso de parciais
      const avisoDiv = document.createElement("div");
      avisoDiv.className = "rodada-pendente-fase";
      avisoDiv.style.background = "rgba(255, 152, 0, 0.05)";
      avisoDiv.style.borderColor = "rgba(255, 152, 0, 0.3)";
      avisoDiv.style.borderLeftColor = "rgba(255, 152, 0, 0.8)";
      avisoDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <span class="pendente-icon" style="font-size: 32px;">⚡</span>
          <h3 style="margin: 0; color: var(--text-primary, #ffffff); font-size: 18px; font-weight: 600;">Rodada em Andamento</h3>
        </div>
        <p class="pendente-message" style="margin: 8px 0;">A Rodada ${rodadaPontosNum} está acontecendo agora.</p>
        <p class="pendente-submessage" style="margin: 8px 0;"><strong style="color: rgba(255, 152, 0, 1);">⚠️ Os pontos exibidos são PARCIAIS.</strong> Valores financeiros serão calculados após a conclusão da rodada.</p>
      `;
      contentElement.appendChild(avisoDiv);
    }

    const perfEnd = performance.now();
    console.log(`[MATA-ORQUESTRADOR] ✅ Fase ${fase} carregada em ${(perfEnd - perfStart).toFixed(0)}ms`);
  } catch (err) {
    console.error(`[MATA-ORQUESTRADOR] Erro ao carregar fase ${fase}:`, err);
    renderErrorState(contentId, fase, err);
  }
}

// Função para extrair vencedores (importada de confrontos)
async function extrairVencedores(confrontos) {
  const { extrairVencedores: extrairVencedoresFunc } = await import(
    "./mata-mata-confrontos.js"
  );
  return extrairVencedoresFunc(confrontos);
}

// Cleanup global para evitar memory leaks
function setupCleanup() {
  window.addEventListener("beforeunload", () => {
    moduleCache.clear();
    exportsCarregados = false;
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
      console.log(
        "[MATA-ORQUESTRADOR] Promise rejection interceptada e ignorada",
      );
    }
  });
}

// Inicialização do módulo
setupCleanup();

console.log("[MATA-ORQUESTRADOR] Módulo carregado com arquitetura refatorada");
