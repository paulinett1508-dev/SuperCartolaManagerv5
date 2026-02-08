// MATA-MATA ORQUESTRADOR - Coordenador Principal v1.4
// Responsável por: coordenação de módulos, carregamento dinâmico, cache
// ✅ v1.4: FIX CRÍTICO - Verifica temporada da API antes de assumir dados anteriores
// ✅ v1.3: Detecção dinâmica de temporada (R1 + mercado aberto = temporada anterior)
// ✅ v1.2: Adiciona persistência no MongoDB ao calcular fases

import {
  edicoes,
  setEdicoes,
  getFaseInfo,
  getLigaId,
  getRodadaPontosText,
  getEdicaoMataMata,
  getFasesParaTamanho,
  TAMANHO_TORNEIO_DEFAULT,
  FASE_LABELS,
  FASE_NUM_JOGOS,
  setValoresFase,
  calcularTamanhoIdeal,
} from "./mata-mata-config.js";
import {
  setRankingFunction as setRankingConfronto,
  getPontosDaRodada,
  montarConfrontosPrimeiraFase,
  montarConfrontosFase,
  calcularValoresConfronto,
  extrairVencedores as extrairVencedoresFunc,
} from "./mata-mata-confrontos.js";
import { setRankingFunction as setRankingFinanceiro, setTamanhoTorneio as setTamanhoTorneioFinanceiro } from "./mata-mata-financeiro.js";
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

// ✅ CACHE LOCAL DE TAMANHO DO TORNEIO POR EDIÇÃO
const tamanhoTorneioCache = new Map();

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
let tamanhoTorneio = TAMANHO_TORNEIO_DEFAULT;

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

    // ✅ 3.5. Adicionar metadata do tamanho calculado
    if (tamanhoTorneio && tamanhoTorneio !== TAMANHO_TORNEIO_DEFAULT) {
      dadosAtuais.metadata = {
        tamanhoTorneio: tamanhoTorneio,
        calculadoEm: new Date().toISOString()
      };
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

// ✅ FUNÇÃO PARA OBTER TAMANHO DO TORNEIO (prioriza cache MongoDB)
async function getTamanhoTorneioCached(ligaId, edicao) {
  const cacheKey = `${ligaId}_tamanho_${edicao}`;

  // 1. Verificar cache local
  if (tamanhoTorneioCache.has(cacheKey)) {
    console.log(`[MATA-ORQUESTRADOR] 💾 Cache hit: tamanho edição ${edicao}`);
    return tamanhoTorneioCache.get(cacheKey);
  }

  // 2. Buscar do MongoDB
  try {
    const resCache = await fetch(`/api/mata-mata/cache/${ligaId}/${edicao}`);
    if (resCache.ok) {
      const cacheData = await resCache.json();
      if (cacheData.cached) {
        const tamanhoDoMongo = Number(cacheData.dados?.tamanhoTorneio) || 
                               Number(cacheData.dados?.metadata?.tamanhoTorneio);
        
        if (tamanhoDoMongo && tamanhoDoMongo >= 8) {
          tamanhoTorneioCache.set(cacheKey, tamanhoDoMongo);
          console.log(`[MATA-ORQUESTRADOR] Tamanho (MongoDB): ${tamanhoDoMongo}`);
          return tamanhoDoMongo;
        }
      }
    }
  } catch (err) {
    console.warn(`[MATA-ORQUESTRADOR] Erro ao buscar tamanho do MongoDB:`, err.message);
  }

  // 3. Fallback: calcular localmente
  console.log(`[MATA-ORQUESTRADOR] Calculando tamanho localmente...`);
  const edicaoData = edicoes.find(e => e.id === edicao);
  if (!edicaoData) {
    console.warn(`[MATA-ORQUESTRADOR] Edição ${edicao} não encontrada`);
    return TAMANHO_TORNEIO_DEFAULT;
  }

  try {
    const rankingCompleto = await getRankingRodadaEspecifica(ligaId, edicaoData.rodadaDefinicao);
    const timesAtivos = rankingCompleto.filter(t => t.ativo !== false).length;
    const tamanhoCalculado = calcularTamanhoIdeal(timesAtivos);
    
    if (tamanhoCalculado > 0) {
      tamanhoTorneioCache.set(cacheKey, tamanhoCalculado);
      console.log(`[MATA-ORQUESTRADOR] Tamanho calculado: ${tamanhoCalculado} (${timesAtivos} ativos)`);
      return tamanhoCalculado;
    } else {
      console.warn(`[MATA-ORQUESTRADOR] Participantes insuficientes (${timesAtivos}), mínimo: 8`);
      return 0;
    }
  } catch (err) {
    console.error(`[MATA-ORQUESTRADOR] Erro ao calcular tamanho:`, err);
    return TAMANHO_TORNEIO_DEFAULT;
  }
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

  // ✅ v2.0: Buscar config para valores financeiros e edições (NÃO mais para tamanho)
  try {
    const resConfig = await fetch(`/api/liga/${ligaId}/modulos/mata_mata`);
    if (resConfig.ok) {
      const configData = await resConfig.json();
      const wizardRespostas = configData?.config?.wizard_respostas;

      // ⚠️ NOTA: Tamanho do torneio agora vem do CACHE, não do wizard
      // O wizard pode definir um "mínimo" mas não o tamanho real
      console.log(`[MATA-ORQUESTRADOR] Config carregada (valores financeiros e edições)`);

      // Valores financeiros da config da liga
      const valorVitoria = Number(wizardRespostas?.valor_vitoria);
      const valorDerrota = Number(wizardRespostas?.valor_derrota);
      if (valorVitoria > 0 && valorDerrota < 0) {
        setValoresFase(valorVitoria, valorDerrota);
        console.log(`[MATA-ORQUESTRADOR] Valores financeiros: vitória=${valorVitoria}, derrota=${valorDerrota}`);
      }

      // Carregar edições da config (se qtd_edicoes definida)
      const qtdEdicoes = Number(wizardRespostas?.qtd_edicoes);
      if (qtdEdicoes && qtdEdicoes >= 1 && qtdEdicoes <= 10) {
        const calendario = configData?.config?.configuracao_override?.calendario?.edicoes
          || configData?.config?.calendario?.edicoes;
        if (Array.isArray(calendario) && calendario.length > 0) {
          setEdicoes(calendario.slice(0, qtdEdicoes));
          console.log(`[MATA-ORQUESTRADOR] ${qtdEdicoes} edições configuradas`);
        }
      }
    }
  } catch (err) {
    console.warn("[MATA-ORQUESTRADOR] Erro ao buscar config do mata-mata:", err.message);
  }

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

  const fasesAtivas = getFasesParaTamanho(tamanhoTorneio);
  renderizarInterface(container, ligaId, handleEdicaoChange, handleFaseClick, fasesAtivas);
}

// v1.4: Renderizar UI de aguardando dados
function renderizarAguardandoDados(container, ligaId) {
  if (!container) return;

  container.innerHTML = `
    <div class="mata-mata-aguardando">
      <span class="material-symbols-outlined mata-mata-aguardando-icon">account_tree</span>
      <h2 class="mata-mata-aguardando-titulo">Aguardando Início do Campeonato</h2>
      <p class="mata-mata-aguardando-texto">
        As chaves do Mata-Mata serão definidas quando as rodadas de classificação forem concluídas.
      </p>
    </div>
  `;
}

// =====================================================================
// PARCIAIS - Rodada de classificação em andamento
// =====================================================================

function renderParciaisOptions(contentElement, ligaId, edicaoId, edicaoSelecionada, tamanhoTorneioVal, rodadaDefinicao) {
  const edicaoNome = edicaoSelecionada.nome || `Edição ${edicaoId}`;

  contentElement.innerHTML = `
    <div class="mata-mata-aguardando-fase">
      <span class="material-symbols-outlined">schedule</span>
      <h4>Rodada de Classificação em Andamento</h4>
      <p>As chaves definitivas serão definidas após a Rodada ${rodadaDefinicao}.</p>
      <div class="parciais-actions">
        <button class="fase-btn parciais-btn" id="btnClassificadosParciais">
          <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">leaderboard</span>
          Classificados da ${edicaoNome}
          <span class="parciais-badge">PARCIAIS</span>
        </button>
        <button class="fase-btn parciais-btn" id="btnConfrontosParciais">
          <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">account_tree</span>
          Confrontos da 1ª Fase
          <span class="parciais-badge">PARCIAIS</span>
        </button>
      </div>
    </div>
  `;

  document.getElementById("btnClassificadosParciais")?.addEventListener("click", () => {
    carregarClassificadosParciais(contentElement, ligaId, edicaoId, edicaoSelecionada, tamanhoTorneioVal, rodadaDefinicao);
  });

  document.getElementById("btnConfrontosParciais")?.addEventListener("click", () => {
    carregarConfrontosParciais(contentElement, ligaId, edicaoId, edicaoSelecionada, tamanhoTorneioVal, rodadaDefinicao);
  });
}

async function carregarClassificadosParciais(contentElement, ligaId, edicaoId, edicaoSelecionada, tamanhoTorneioVal, rodadaDefinicao) {
  contentElement.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Buscando parciais...</p>
    </div>`;

  try {
    const res = await fetch(`/api/matchday/parciais/${ligaId}`);
    const data = res.ok ? await res.json() : null;

    if (!data || !data.disponivel) {
      const msg = data?.message || "Parciais não disponíveis no momento.";
      contentElement.innerHTML = `
        <div class="mata-mata-aguardando-fase">
          <span class="material-symbols-outlined">info</span>
          <h4>${msg}</h4>
          <div class="parciais-voltar">
            <button class="fase-btn" id="btnVoltarParciais">← Voltar</button>
          </div>
        </div>`;
      document.getElementById("btnVoltarParciais")?.addEventListener("click", () => {
        renderParciaisOptions(contentElement, ligaId, edicaoId, edicaoSelecionada, tamanhoTorneioVal, rodadaDefinicao);
      });
      return;
    }

    const ranking = data.ranking || [];
    const classificados = ranking.slice(0, tamanhoTorneioVal);
    const eliminados = ranking.slice(tamanhoTorneioVal);
    const edicaoNome = edicaoSelecionada.nome || `Edição ${edicaoId}`;

    const rowsClassificados = classificados.map((t, i) => `
      <tr class="${i === tamanhoTorneioVal - 1 ? "parciais-cutoff" : ""}">
        <td class="jogo-cell">${i + 1}º</td>
        <td class="time-cell">
          <div class="time-info">
            <img src="/escudos/${t.clube_id}.png" class="escudo-img" onerror="this.src='/escudos/default.png'">
            <div class="time-details">
              <span class="time-nome">${t.nome_time || "—"}</span>
              <span class="time-cartoleiro">${t.nome_cartola || "—"}</span>
            </div>
          </div>
        </td>
        <td class="pontos-cell valor-positivo">
          <div class="pontos-valor">${t.pontos?.toFixed(2).replace(".", ",") || "0,00"}</div>
        </td>
      </tr>`).join("");

    const rowsEliminados = eliminados.slice(0, 5).map((t, i) => `
      <tr style="opacity:0.4;">
        <td class="jogo-cell">${tamanhoTorneioVal + i + 1}º</td>
        <td class="time-cell">
          <div class="time-info">
            <img src="/escudos/${t.clube_id}.png" class="escudo-img" onerror="this.src='/escudos/default.png'">
            <div class="time-details">
              <span class="time-nome">${t.nome_time || "—"}</span>
              <span class="time-cartoleiro">${t.nome_cartola || "—"}</span>
            </div>
          </div>
        </td>
        <td class="pontos-cell">
          <div class="pontos-valor">${t.pontos?.toFixed(2).replace(".", ",") || "0,00"}</div>
        </td>
      </tr>`).join("");

    contentElement.innerHTML = `
      <div class="parciais-header">
        <span class="parciais-live-badge">AO VIVO</span>
        <h4>Classificados — ${edicaoNome}</h4>
        <p>Top ${tamanhoTorneioVal} classificam para o Mata-Mata (Rodada ${data.rodada})</p>
      </div>
      <div class="mata-mata-table-container">
        <table class="mata-mata-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th class="pontos-cell">Pts</th>
            </tr>
          </thead>
          <tbody>
            ${rowsClassificados}
            ${rowsEliminados}
          </tbody>
        </table>
      </div>
      <div class="parciais-voltar">
        <button class="fase-btn" id="btnVoltarParciais">← Voltar</button>
      </div>`;

    document.getElementById("btnVoltarParciais")?.addEventListener("click", () => {
      renderParciaisOptions(contentElement, ligaId, edicaoId, edicaoSelecionada, tamanhoTorneioVal, rodadaDefinicao);
    });

    console.log(`[MATA-ORQUESTRADOR] Classificados parciais: ${classificados.length}/${ranking.length} times`);
  } catch (err) {
    console.error("[MATA-ORQUESTRADOR] Erro ao buscar parciais:", err);
    contentElement.innerHTML = `
      <div class="mata-mata-aguardando-fase">
        <span class="material-symbols-outlined">error</span>
        <h4>Erro ao buscar parciais</h4>
        <p>${err.message}</p>
        <div class="parciais-voltar">
          <button class="fase-btn" id="btnVoltarParciais">← Voltar</button>
        </div>
      </div>`;
    document.getElementById("btnVoltarParciais")?.addEventListener("click", () => {
      renderParciaisOptions(contentElement, ligaId, edicaoId, edicaoSelecionada, tamanhoTorneioVal, rodadaDefinicao);
    });
  }
}

async function carregarConfrontosParciais(contentElement, ligaId, edicaoId, edicaoSelecionada, tamanhoTorneioVal, rodadaDefinicao) {
  contentElement.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Buscando parciais para montar confrontos...</p>
    </div>`;

  try {
    const res = await fetch(`/api/matchday/parciais/${ligaId}`);
    const data = res.ok ? await res.json() : null;

    if (!data || !data.disponivel) {
      const msg = data?.message || "Parciais não disponíveis no momento.";
      contentElement.innerHTML = `
        <div class="mata-mata-aguardando-fase">
          <span class="material-symbols-outlined">info</span>
          <h4>${msg}</h4>
          <div class="parciais-voltar">
            <button class="fase-btn" id="btnVoltarParciais">← Voltar</button>
          </div>
        </div>`;
      document.getElementById("btnVoltarParciais")?.addEventListener("click", () => {
        renderParciaisOptions(contentElement, ligaId, edicaoId, edicaoSelecionada, tamanhoTorneioVal, rodadaDefinicao);
      });
      return;
    }

    const ranking = data.ranking || [];
    if (ranking.length < tamanhoTorneioVal) {
      contentElement.innerHTML = `
        <div class="mata-mata-aguardando-fase">
          <span class="material-symbols-outlined">group</span>
          <h4>Dados insuficientes</h4>
          <p>${ranking.length} de ${tamanhoTorneioVal} times encontrados nas parciais.</p>
          <div class="parciais-voltar">
            <button class="fase-btn" id="btnVoltarParciais">← Voltar</button>
          </div>
        </div>`;
      document.getElementById("btnVoltarParciais")?.addEventListener("click", () => {
        renderParciaisOptions(contentElement, ligaId, edicaoId, edicaoSelecionada, tamanhoTorneioVal, rodadaDefinicao);
      });
      return;
    }

    // Transformar ranking parcial para formato do montarConfrontosPrimeiraFase
    const rankingSlice = ranking.slice(0, tamanhoTorneioVal).map((t, i) => ({
      timeId: String(t.timeId),
      nome_time: t.nome_time,
      nome_cartoleiro: t.nome_cartola,
      clube_id: t.clube_id,
      pontos: t.pontos,
      posicao: i + 1,
    }));

    const confrontos = montarConfrontosPrimeiraFase(rankingSlice, {}, tamanhoTorneioVal);
    const fasesAtivas = getFasesParaTamanho(tamanhoTorneioVal);
    const primeiraFase = fasesAtivas[0];
    calcularValoresConfronto(confrontos, true, primeiraFase);

    const faseLabel = FASE_LABELS[primeiraFase] || primeiraFase.toUpperCase();
    renderTabelaMataMata(confrontos, "mataMataContent", faseLabel, edicaoId, true);

    // Inserir badge AO VIVO antes da tabela
    contentElement.insertAdjacentHTML("afterbegin", `
      <div class="parciais-header">
        <span class="parciais-live-badge">AO VIVO</span>
        <h4>Confrontos da ${faseLabel} — ${edicaoSelecionada.nome || "Edição " + edicaoId}</h4>
        <p>Baseado nas parciais da Rodada ${data.rodada}. Sujeito a alteração.</p>
      </div>
    `);

    // Inserir botão Voltar
    contentElement.insertAdjacentHTML("beforeend", `
      <div class="parciais-voltar">
        <button class="fase-btn" id="btnVoltarParciais">← Voltar</button>
      </div>
    `);

    document.getElementById("btnVoltarParciais")?.addEventListener("click", () => {
      renderParciaisOptions(contentElement, ligaId, edicaoId, edicaoSelecionada, tamanhoTorneioVal, rodadaDefinicao);
    });

    console.log(`[MATA-ORQUESTRADOR] Confrontos parciais: ${confrontos.length} jogos montados`);
  } catch (err) {
    console.error("[MATA-ORQUESTRADOR] Erro ao montar confrontos parciais:", err);
    contentElement.innerHTML = `
      <div class="mata-mata-aguardando-fase">
        <span class="material-symbols-outlined">error</span>
        <h4>Erro ao montar confrontos</h4>
        <p>${err.message}</p>
        <div class="parciais-voltar">
          <button class="fase-btn" id="btnVoltarParciais">← Voltar</button>
        </div>
      </div>`;
    document.getElementById("btnVoltarParciais")?.addEventListener("click", () => {
      renderParciaisOptions(contentElement, ligaId, edicaoId, edicaoSelecionada, tamanhoTorneioVal, rodadaDefinicao);
    });
  }
}

// Handler para mudança de edição
async function handleEdicaoChange(novaEdicao, fase, ligaId) {
  edicaoAtual = novaEdicao;
  // ✅ Limpar caches locais ao trocar de edição
  pontosRodadaCache.clear();
  rankingBaseCache.clear();

  // ✅ v1.5: Calcular tamanho ANTES de carregar fase para atualizar navegação
  const tamanhoCalculado = await getTamanhoTorneioCached(ligaId, novaEdicao);

  if (tamanhoCalculado > 0 && tamanhoCalculado !== tamanhoTorneio) {
    console.log(`[MATA-ORQUESTRADOR] Tamanho mudou: ${tamanhoTorneio} → ${tamanhoCalculado}`);
    tamanhoTorneio = tamanhoCalculado;

    // Re-renderizar navegação com fases corretas
    const fasesReais = getFasesParaTamanho(tamanhoTorneio);
    atualizarNavegacaoFases(fasesReais);

    // Usar primeira fase válida se a fase atual não existe
    if (!fasesReais.includes(fase.toLowerCase())) {
      fase = fasesReais[0];
      console.log(`[MATA-ORQUESTRADOR] Fase ajustada para: ${fase}`);
    }
  }

  carregarFase(fase, ligaId);
}

// ✅ v1.5: Atualizar botões de navegação de fases dinamicamente
function atualizarNavegacaoFases(fasesAtivas) {
  const faseNav = document.querySelector('.fase-nav');
  if (!faseNav) return;

  const botoesHtml = fasesAtivas
    .map((fase, idx) => `<button class="fase-btn${idx === 0 ? " active" : ""}" data-fase="${fase}">${FASE_LABELS[fase] || fase.toUpperCase()}</button>`)
    .join("\n");

  faseNav.innerHTML = botoesHtml;

  // Re-bind event listeners
  faseNav.querySelectorAll('.fase-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const edicaoSelect = document.getElementById('edicao-select');
      const edicao = edicaoSelect ? parseInt(edicaoSelect.value) : null;

      if (!edicao) {
        console.warn('[MATA-ORQUESTRADOR] Nenhuma edição selecionada');
        return;
      }

      faseNav.querySelectorAll('.fase-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const fase = this.getAttribute('data-fase');
      handleFaseClick(fase, edicao);
    });
  });

  // Atualizar data attribute da primeira fase
  const container = document.getElementById('mata-mata');
  if (container) {
    container.dataset.primeiraFase = fasesAtivas[0];
  }

  console.log(`[MATA-ORQUESTRADOR] Navegação atualizada: ${fasesAtivas.join(', ')}`);
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

    // FIX-1: Guard pré-temporada - não buscar ranking se temporada não iniciou
    if (rodada_atual === 0) {
      contentElement.innerHTML = `
        <div class="mata-mata-aguardando-fase">
          <span class="material-symbols-outlined">hourglass_empty</span>
          <h4>Temporada ainda não iniciou</h4>
          <p>Os confrontos serão calculados quando as rodadas começarem.</p>
        </div>`;
      return;
    }

    // ✅ v2.0: Buscar tamanho calculado do cache MongoDB ANTES de qualquer cálculo
    const tamanhoCalculado = await getTamanhoTorneioCached(ligaId, edicaoAtual);
    if (tamanhoCalculado === 0) {
      contentElement.innerHTML = `
        <div class="mata-mata-aguardando-fase">
          <span class="material-symbols-outlined">group_off</span>
          <h4>Participantes insuficientes</h4>
          <p>O Mata-Mata requer no mínimo 8 participantes ativos.</p>
        </div>`;
      return;
    }

    // Atualizar tamanho global
    tamanhoTorneio = tamanhoCalculado;
    setTamanhoTorneioFinanceiro(tamanhoTorneio);

    if (rodada_atual <= rodadaDefinicao) {
      renderParciaisOptions(contentElement, ligaId, edicaoAtual, edicaoSelecionada, tamanhoTorneio, rodadaDefinicao);
      return;
    }

    // ✅ USA CACHE LOCAL PARA RANKING BASE
    const rankingBase = await getRankingBaseCached(ligaId, rodadaDefinicao);

    console.log(
      `[MATA-ORQUESTRADOR] Ranking base recebido: ${rankingBase?.length || 0} times`,
    );

    if (!Array.isArray(rankingBase) || rankingBase.length < tamanhoTorneio) {
      throw new Error(
        `Ranking base inválido: ${rankingBase?.length || 0}/${tamanhoTorneio} times encontrados`,
      );
    }

    const faseInfo = getFaseInfo(edicaoAtual, edicaoSelecionada, tamanhoTorneio);
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

      const fasesDoTorneio = getFasesParaTamanho(tamanhoTorneio);
      const primeiraFaseKey = fasesDoTorneio[0];

      for (let r = edicaoSelecionada.rodadaInicial; r <= prevFaseRodada; r++) {
        // ✅ USAR CACHE LOCAL PARA EVITAR BUSCAS DUPLICADAS
        const pontosDaRodadaAnterior = await getPontosDaRodadaCached(ligaId, r);
        const idxRodada = r - edicaoSelecionada.rodadaInicial;
        const faseAnterior = fasesDoTorneio[idxRodada];
        const jogosFaseAnterior = FASE_NUM_JOGOS[faseAnterior] || 1;
        const confrontosAnteriores =
          r === edicaoSelecionada.rodadaInicial && faseAnterior === primeiraFaseKey
            ? montarConfrontosPrimeiraFase(rankingBase, pontosDaRodadaAnterior, tamanhoTorneio)
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

    const fasesDoTorneioCalc = getFasesParaTamanho(tamanhoTorneio);
    const primeiraFaseCalc = fasesDoTorneioCalc[0];
    const confrontos =
      fase === primeiraFaseCalc
        ? montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual, tamanhoTorneio)
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

console.log("[MATA-ORQUESTRADOR] Módulo v1.5 carregado - Suporte a torneios 8/16/32 times");
