// =====================================================================
// PARTICIPANTE MATA-MATA v7.5 (Botão Classificados)
// ✅ v7.5: FEAT - Botão "Classificados" mostra os N classificados e seus adversários
// ✅ v7.4: FIX - Mostra mensagem adequada quando não há edições na temporada
// ✅ v7.3: FIX - Fases dinâmicas baseadas no tamanho real do torneio
// ✅ v7.3: FIX - Contador de participantes usa tamanhoTorneio real
// ✅ v7.2: FEAT - Parciais ao vivo na rodada de classificação
// ✅ v7.0: FIX - Double RAF para garantir container no DOM após refresh
// ✅ v6.9: FIX Escudo placeholder não usa mais logo do sistema
// ✅ v6.8: FIX Comparação de tipos (string vs number) em timeId
// ✅ v6.7: Cache-first com IndexedDB para carregamento instantâneo
// Integrado com HTML template - Layout Cards + Correção "não está nesta fase"
// Nota: Mata-mata não requer tratamento especial de inativos pois é por eliminação
// =====================================================================

import { CURRENT_SEASON } from "/js/config/seasons-client.js";

const EDICOES_MATA_MATA = [
  { id: 1, nome: "1ª Edição", rodadaInicial: 3, rodadaFinal: 7 },   // FIX: R2 é definição, competição começa R3
  { id: 2, nome: "2ª Edição", rodadaInicial: 10, rodadaFinal: 14 }, // FIX: R9 é definição, competição começa R10
  { id: 3, nome: "3ª Edição", rodadaInicial: 16, rodadaFinal: 21 }, // FIX: R15 é definição, competição começa R16
  { id: 4, nome: "4ª Edição", rodadaInicial: 22, rodadaFinal: 26 },
  { id: 5, nome: "5ª Edição", rodadaInicial: 31, rodadaFinal: 35 },
];

// ✅ v7.3: Fases dinâmicas baseadas no tamanho do torneio
const TODAS_FASES = ["primeira", "oitavas", "quartas", "semis", "final"];

// ✅ v7.3: Retorna fases aplicáveis para o tamanho do torneio (espelho do admin)
function getFasesParaTamanho(tamanho) {
  if (tamanho >= 32) return ["primeira", "oitavas", "quartas", "semis", "final"];
  if (tamanho >= 16) return ["oitavas", "quartas", "semis", "final"];
  if (tamanho >= 8)  return ["quartas", "semis", "final"];
  return [];
}

// ✅ v7.3: Getter para fases atuais (usa tamanhoTorneio do estado)
function getFasesAtuais() {
  return getFasesParaTamanho(estado.tamanhoTorneio);
}

// Compatibilidade: FASES agora é getter dinâmico
const FASES = TODAS_FASES; // Fallback para código legado que itera todas

// ✅ v6.8: FIX - Sempre retorna number para comparação consistente
// Banco tem timeId inconsistente: às vezes string "1323370", às vezes number 1323370
function extrairTimeId(time) {
  if (!time) return null;
  const id = time.time_id || time.timeId || time.id || null;
  return id ? parseInt(id, 10) : null;
}

// ✅ v6.9: FIX - Fallback de escudo não usa logo do sistema
// Placeholder: círculo cinza com ícone de escudo (data URI SVG)
const ESCUDO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%232a2a2a' stroke='%233a3a3a' stroke-width='2'/%3E%3Cpath d='M50 20 L70 30 L70 50 C70 65 60 75 50 80 C40 75 30 65 30 50 L30 30 Z' fill='%234a4a4a' stroke='%235a5a5a' stroke-width='1'/%3E%3C/svg%3E";

function getEscudoUrl(time) {
  const escudo = time?.url_escudo_png || time?.escudo;
  // Se escudo existe e não é string vazia, usar
  if (escudo && escudo.trim() !== '') {
    return escudo;
  }
  // Fallback: placeholder SVG
  return ESCUDO_PLACEHOLDER;
}

// ✅ v6.8: Recalcular historico de participação a partir do cache em memória
// Isso corrige o bug onde historicoParticipacao foi salvo com comparação de tipos errada
function recalcularHistoricoEdicao(edicao) {
  const meuTimeId = estado.timeId ? parseInt(estado.timeId) : null;
  if (!meuTimeId) return;

  let ultimaFaseParticipada = null;
  let foiEliminado = false;

  FASES.forEach((f) => {
    const cacheKey = `${edicao}-${f}`;
    const confrontos = estado.cacheConfrontos[cacheKey];

    if (confrontos && Array.isArray(confrontos)) {
      const participou = confrontos.some(
        (c) =>
          extrairTimeId(c.timeA) === meuTimeId ||
          extrairTimeId(c.timeB) === meuTimeId,
      );

      if (participou) {
        ultimaFaseParticipada = f;

        const meuConfronto = confrontos.find(
          (c) =>
            extrairTimeId(c.timeA) === meuTimeId ||
            extrairTimeId(c.timeB) === meuTimeId,
        );

        if (meuConfronto) {
          const souTimeA = extrairTimeId(meuConfronto.timeA) === meuTimeId;
          const meusPts = parseFloat(
            souTimeA ? meuConfronto.timeA?.pontos : meuConfronto.timeB?.pontos,
          ) || 0;
          const advPts = parseFloat(
            souTimeA ? meuConfronto.timeB?.pontos : meuConfronto.timeA?.pontos,
          ) || 0;

          if (meusPts < advPts) foiEliminado = true;
        }
      }
    }
  });

  estado.historicoParticipacao[edicao] = {
    ultimaFase: ultimaFaseParticipada,
    eliminado: foiEliminado,
  };

  if (window.Log)
    Log.debug(`[MATA-MATA] 📊 Historico recalculado edição ${edicao}:`, estado.historicoParticipacao[edicao]);
}

let estado = {
  ligaId: null,
  timeId: null,
  rodadaAtual: 1,
  edicaoSelecionada: null,
  faseSelecionada: null, // ✅ v7.3: Será definida dinamicamente baseada no tamanhoTorneio
  edicoesDisponiveis: [],
  cacheConfrontos: {},
  historicoParticipacao: {},
  tamanhoTorneio: 8, // ✅ v7.2: Carregado da config do módulo
};

// =====================================================================
// INICIALIZAÇÃO
// =====================================================================
export async function inicializarMataMata(params) {
  if (window.Log) Log.info("[MATA-MATA] 🚀 Inicializando v7.0...", params);

  // ✅ v7.0: Aguardar DOM estar renderizado (double RAF)
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  // ✅ CORREÇÃO: Usar participanteAuth como fallback em vez de localStorage (evita dados cruzados entre ligas)
  estado.ligaId = params?.ligaId || window.participanteAuth?.ligaId;
  estado.timeId = params?.timeId || window.participanteAuth?.timeId;

  if (!estado.ligaId) {
    if (window.Log) Log.error("[MATA-MATA] ❌ Liga ID não encontrado");
    renderErro("Sessão inválida. Faça login novamente.");
    return;
  }

  // ✅ v7.2: Carregar tamanho do torneio da config do módulo
  try {
    const configRes = await fetch(`/api/liga/${estado.ligaId}/modulos/mata_mata`);
    if (configRes.ok) {
      const configData = await configRes.json();
      const totalTimes = configData?.config?.wizard_respostas?.total_times;
      if (totalTimes) estado.tamanhoTorneio = Number(totalTimes);
      if (window.Log) Log.info(`[MATA-MATA] ⚙️ Tamanho torneio: ${estado.tamanhoTorneio}`);
    }
  } catch (e) {
    if (window.Log) Log.warn("[MATA-MATA] ⚠️ Config não carregada, usando default:", estado.tamanhoTorneio);
  }

  // ✅ v7.3: Atualizar navegação de fases após carregar tamanho do torneio
  atualizarNavegacaoFases();
  atualizarContador();

  // ✅ v6.8: CACHE-FIRST - Tentar carregar do IndexedDB primeiro
  // ⚠️ v6.8: NÃO usar historicoParticipacao do cache (pode estar com bug de tipos antigo)
  let usouCache = false;

  if (window.OfflineCache) {
    try {
      const mmCache = await window.OfflineCache.get('mataMata', estado.ligaId, true);
      if (mmCache && mmCache.edicoes && mmCache.confrontos) {
        usouCache = true;
        estado.edicoesDisponiveis = mmCache.edicoes;
        estado.cacheConfrontos = mmCache.confrontos;
        // ✅ v6.8: IGNORAR historico do cache - será recalculado com fix de tipos
        estado.historicoParticipacao = {};

        // Renderizar IMEDIATAMENTE com dados do cache
        if (window.Log)
          Log.info(`[MATA-MATA] ⚡ Cache IndexedDB: ${mmCache.edicoes.length} edições`);

        popularSelectEdicoes();
        atualizarContador();
        setupEventListeners();

        // ✅ v6.8: Recalcular historicoParticipacao ANTES de renderizar
        if (estado.edicoesDisponiveis.length > 0) {
          for (const ed of estado.edicoesDisponiveis) {
            await recalcularHistoricoEdicao(ed.edicao);
          }

          const ultimaEdicao = estado.edicoesDisponiveis[estado.edicoesDisponiveis.length - 1];
          estado.edicaoSelecionada = ultimaEdicao.edicao;

          const select = document.getElementById("mmEditionSelect");
          if (select) select.value = ultimaEdicao.edicao;

          // ✅ v7.3: Usar primeira fase válida para o tamanho do torneio
          const primeiraFaseValida = getFasesAtuais()[0] || "quartas";
          await carregarFase(estado.edicaoSelecionada, primeiraFaseValida);
        }
      }
    } catch (e) {
      if (window.Log) Log.warn("[MATA-MATA] ⚠️ Erro ao ler cache:", e);
    }
  }

  try {
    await carregarStatusMercado();
    await carregarEdicoesDisponiveis(usouCache);
    if (!usouCache) {
      setupEventListeners();
    }
  } catch (error) {
    if (window.Log) Log.error("[MATA-MATA] Erro:", error);
    if (!usouCache) {
      renderErro("Erro ao carregar mata-mata");
    }
  }
}

export const inicializarMataMataParticipante = inicializarMataMata;

// =====================================================================
// CARREGAR STATUS DO MERCADO
// =====================================================================
async function carregarStatusMercado() {
  try {
    const res = await fetch("/api/cartola/mercado/status");
    if (res.ok) {
      const data = await res.json();
      estado.rodadaAtual = data.rodada_atual || 37;
    }
  } catch (e) {
    estado.rodadaAtual = 37;
  }
}

// =====================================================================
// CARREGAR EDIÇÕES DISPONÍVEIS DO MONGODB
// =====================================================================
async function carregarEdicoesDisponiveis(usouCache = false) {
  try {
    const temporada = window.participanteAuth?.temporadaSelecionada || CURRENT_SEASON;
    const res = await fetch(`/api/mata-mata/cache/${estado.ligaId}/edicoes?temporada=${temporada}`);
    if (!res.ok) throw new Error("Erro ao buscar edições");

    const data = await res.json();
    const edicoesNovas = data.edicoes || [];

    // Verificar se dados mudaram
    const dadosMudaram = !usouCache ||
      estado.edicoesDisponiveis.length !== edicoesNovas.length;

    estado.edicoesDisponiveis = edicoesNovas;

    if (window.Log)
      Log.info(
        `[MATA-MATA] ✅ ${estado.edicoesDisponiveis.length} edições encontradas`,
      );

    if (!usouCache) {
      popularSelectEdicoes();
      atualizarContador();
    }

    if (estado.edicoesDisponiveis.length > 0) {
      // Carregar histórico de TODAS as edições
      for (const ed of estado.edicoesDisponiveis) {
        await carregarTodasFases(ed.edicao);
      }

      // ✅ v6.7: Salvar no IndexedDB para próxima visita
      if (window.OfflineCache) {
        try {
          await window.OfflineCache.set('mataMata', estado.ligaId, {
            edicoes: estado.edicoesDisponiveis,
            confrontos: estado.cacheConfrontos,
            historico: estado.historicoParticipacao
          });
          if (window.Log) Log.info("[MATA-MATA] 💾 Cache IndexedDB atualizado");
        } catch (e) {
          if (window.Log) Log.warn("[MATA-MATA] ⚠️ Erro ao salvar cache:", e);
        }
      }

      if (!usouCache) {
        const ultimaEdicao =
          estado.edicoesDisponiveis[estado.edicoesDisponiveis.length - 1];
        estado.edicaoSelecionada = ultimaEdicao.edicao;

        const select = document.getElementById("mmEditionSelect");
        if (select) select.value = ultimaEdicao.edicao;

        // ✅ v7.3: Usar primeira fase válida para o tamanho do torneio
        const primeiraFaseValida = getFasesAtuais()[0] || "quartas";
        await carregarFase(estado.edicaoSelecionada, primeiraFaseValida);
      } else if (dadosMudaram) {
        // Re-renderizar se dados mudaram
        popularSelectEdicoes();
        const ultimaEdicao =
          estado.edicoesDisponiveis[estado.edicoesDisponiveis.length - 1];
        await carregarFase(ultimaEdicao.edicao, estado.faseSelecionada);
        if (window.Log) Log.info("[MATA-MATA] 🔄 Re-renderizado com dados frescos");
      }
    } else {
      // ✅ v7.4: Tratar caso de zero edições disponíveis
      if (!usouCache) {
        const temporada = window.participanteAuth?.temporadaSelecionada || CURRENT_SEASON;
        renderSemEdicoes(temporada);
      }
    }
  } catch (error) {
    if (window.Log) Log.error("[MATA-MATA] Erro ao carregar edições:", error);
    if (!usouCache) {
      renderErro("Nenhuma edição disponível");
    }
  }
}

// =====================================================================
// CARREGAR TODAS AS FASES PARA MAPEAR PARTICIPAÇÃO
// =====================================================================
async function carregarTodasFases(edicao) {
  try {
    const temporada = window.participanteAuth?.temporadaSelecionada || CURRENT_SEASON;
    const res = await fetch(`/api/mata-mata/cache/${estado.ligaId}/${edicao}?temporada=${temporada}`);
    if (!res.ok) {
      if (window.Log) Log.warn(`[MATA-MATA] ⚠️ Resposta não OK: ${res.status}`);
      return;
    }

    const data = await res.json();
    if (window.Log) Log.info("[MATA-MATA] 📦 Dados recebidos:", data);

    const dadosFases = data.dados || data.dados_torneio || data;

    if (!dadosFases || typeof dadosFases !== "object") {
      if (window.Log) Log.warn("[MATA-MATA] ⚠️ Estrutura de dados inválida");
      return;
    }

    const meuTimeId = estado.timeId ? parseInt(estado.timeId) : null;
    let ultimaFaseParticipada = null;
    let foiEliminado = false;

    FASES.forEach((f) => {
      if (dadosFases[f]) {
        estado.cacheConfrontos[`${edicao}-${f}`] = dadosFases[f];

        const confrontos = dadosFases[f];
        const participou = confrontos.some(
          (c) =>
            extrairTimeId(c.timeA) === meuTimeId ||
            extrairTimeId(c.timeB) === meuTimeId,
        );

        if (participou) {
          ultimaFaseParticipada = f;

          const meuConfronto = confrontos.find(
            (c) =>
              extrairTimeId(c.timeA) === meuTimeId ||
              extrairTimeId(c.timeB) === meuTimeId,
          );

          if (meuConfronto) {
            const souTimeA = extrairTimeId(meuConfronto.timeA) === meuTimeId;
            const meusPts =
              parseFloat(
                souTimeA
                  ? meuConfronto.timeA?.pontos
                  : meuConfronto.timeB?.pontos,
              ) || 0;
            const advPts =
              parseFloat(
                souTimeA
                  ? meuConfronto.timeB?.pontos
                  : meuConfronto.timeA?.pontos,
              ) || 0;

            if (meusPts < advPts) foiEliminado = true;
          }
        }
      }
    });

    estado.historicoParticipacao[edicao] = {
      ultimaFase: ultimaFaseParticipada,
      eliminado: foiEliminado,
    };

    if (window.Log)
      Log.info(
        `[MATA-MATA] 📊 Histórico edição ${edicao}:`,
        estado.historicoParticipacao[edicao],
      );
  } catch (error) {
    if (window.Log) Log.error("[MATA-MATA] Erro ao carregar histórico:", error);
  }
}

// =====================================================================
// POPULAR SELECT DE EDIÇÕES
// =====================================================================
function popularSelectEdicoes() {
  const select = document.getElementById("mmEditionSelect");
  if (!select) return;

  select.innerHTML = estado.edicoesDisponiveis
    .map((ed) => {
      const config = EDICOES_MATA_MATA.find((e) => e.id === ed.edicao);
      const nome = config ? config.nome : `${ed.edicao}ª Edição`;
      return `<option value="${ed.edicao}">${nome}</option>`;
    })
    .join("");
}

// =====================================================================
// ATUALIZAR CONTADOR DE PARTICIPANTES
// =====================================================================
function atualizarContador() {
  const el = document.getElementById("mmTimesCount");
  // ✅ v7.3: Usar tamanho real do torneio em vez de hardcoded
  if (el) el.textContent = `${estado.tamanhoTorneio} participante(s)`;
}

// =====================================================================
// SETUP EVENT LISTENERS
// =====================================================================
function setupEventListeners() {
  const select = document.getElementById("mmEditionSelect");
  if (select) {
    select.addEventListener("change", async (e) => {
      estado.edicaoSelecionada = parseInt(e.target.value);
      // ✅ v7.3: Usar primeira fase válida para o tamanho do torneio
      const primeiraFaseValida = getFasesAtuais()[0] || "quartas";
      estado.faseSelecionada = primeiraFaseValida;
      atualizarBotoesFases();
      await carregarTodasFases(estado.edicaoSelecionada);
      await carregarFase(estado.edicaoSelecionada, primeiraFaseValida);
    });
  }

  const phasesNav = document.getElementById("mmPhasesNav");
  if (phasesNav) {
    phasesNav.addEventListener("click", async (e) => {
      const btn = e.target.closest(".mm-phase-btn");
      if (!btn || btn.classList.contains("disabled")) return;

      const fase = btn.dataset.fase;
      if (!fase) return;

      estado.faseSelecionada = fase;
      atualizarBotoesFases();
      await carregarFase(estado.edicaoSelecionada, fase);
    });
  }

  const buttons = document.querySelectorAll(".mm-phase-btn");
  FASES.forEach((fase, i) => {
    if (buttons[i]) buttons[i].dataset.fase = fase;
  });

  // ✅ v7.4: Botão Classificados
  const btnClassificados = document.getElementById("btnClassificados");
  if (btnClassificados) {
    btnClassificados.addEventListener("click", () => {
      if (estado.edicaoSelecionada) {
        toggleClassificados();
      } else {
        if (window.Log) Log.warn("[MATA-MATA] Nenhuma edição selecionada");
      }
    });
  }
}

// =====================================================================
// ATUALIZAR BOTÕES DE FASES
// =====================================================================
function atualizarBotoesFases() {
  const buttons = document.querySelectorAll(".mm-phase-btn");
  buttons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.fase === estado.faseSelecionada) {
      btn.classList.add("active");
    }
  });
}

// =====================================================================
// ✅ v7.3: ATUALIZAR NAVEGAÇÃO DE FASES DINAMICAMENTE
// =====================================================================
function atualizarNavegacaoFases() {
  const phasesNav = document.getElementById("mmPhasesNav");
  if (!phasesNav) return;

  const fasesAtivas = getFasesAtuais();
  const faseLabels = {
    primeira: "1ª FASE",
    oitavas: "OITAVAS",
    quartas: "QUARTAS",
    semis: "SEMIFINAL",
    final: "FINAL",
  };

  // Recriar botões com apenas as fases válidas
  phasesNav.innerHTML = fasesAtivas
    .map((fase, idx) => `
      <button class="mm-phase-btn${idx === 0 ? ' active' : ''}" data-fase="${fase}">
        ${faseLabels[fase] || fase.toUpperCase()}
      </button>
    `)
    .join('');

  // Definir primeira fase como selecionada se não houver
  if (!estado.faseSelecionada || !fasesAtivas.includes(estado.faseSelecionada)) {
    estado.faseSelecionada = fasesAtivas[0];
  }

  if (window.Log) Log.info(`[MATA-MATA] 🔄 Navegação atualizada: ${fasesAtivas.join(', ')}`);
}

// =====================================================================
// ✅ v7.4: TOGGLE CLASSIFICADOS
// =====================================================================
let classificadosAberto = false;

function toggleClassificados() {
  const container = document.getElementById("mata-mata-container");
  if (!container) return;

  // Se já está aberto, fechar
  const existente = document.querySelector(".mm-classificados-container");
  if (existente) {
    existente.remove();
    classificadosAberto = false;
    return;
  }

  // Buscar classificados da fase "primeira" da edição selecionada
  const primeiraFase = getFasesAtuais()[0] || "primeira";
  const cacheKey = `${estado.edicaoSelecionada}-${primeiraFase}`;
  const confrontos = estado.cacheConfrontos[cacheKey];

  if (!confrontos || confrontos.length === 0) {
    if (window.Log) Log.warn("[MATA-MATA] Sem dados de classificados para esta edição");
    return;
  }

  // Extrair todos os times únicos e ordenar por rankR2 (posição na classificação)
  const classificados = [];
  confrontos.forEach(c => {
    if (c.timeA) classificados.push({ ...c.timeA, adversario: c.timeB });
    if (c.timeB) classificados.push({ ...c.timeB, adversario: c.timeA });
  });

  // Ordenar por rankR2 (posição na rodada de classificação)
  classificados.sort((a, b) => (a.rankR2 || 999) - (b.rankR2 || 999));

  // Renderizar lista
  renderClassificados(classificados, container);
  classificadosAberto = true;

  if (window.Log) Log.info(`[MATA-MATA] 📋 ${classificados.length} classificados exibidos`);
}

function renderClassificados(classificados, container) {
  const meuTimeId = estado.timeId ? parseInt(estado.timeId) : null;
  const config = EDICOES_MATA_MATA.find(e => e.id === estado.edicaoSelecionada);
  const nomeEdicao = config ? config.nome : `${estado.edicaoSelecionada}ª Edição`;
  const rodadaClass = config ? config.rodadaInicial - 1 : "?"; // Rodada anterior à 1ª Fase é a classificatória

  let html = `
    <div class="mm-classificados-container">
      <div class="mm-classificados-header">
        <div class="mm-classificados-title">
          <span class="material-symbols-outlined">format_list_numbered</span>
          <span>Classificados - ${nomeEdicao}</span>
        </div>
        <button class="mm-classificados-close" id="btnFecharClassificados">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <p class="mm-classificados-info">
        Top ${estado.tamanhoTorneio} da Rodada ${rodadaClass} (Classificatória)
        <br><small>1º enfrenta ${estado.tamanhoTorneio}º, 2º enfrenta ${estado.tamanhoTorneio - 1}º...</small>
      </p>
      <div class="mm-classificados-list">
  `;

  classificados.forEach(time => {
    const isMeuTime = extrairTimeId(time) === meuTimeId;
    const posAdv = time.adversario?.rankR2 || "?";

    html += `
      <div class="mm-classificado-item ${isMeuTime ? 'meu-time' : ''}">
        <span class="mm-classificado-pos">${time.rankR2 || "?"}</span>
        <img class="mm-classificado-escudo" src="${getEscudoUrl(time)}" alt="" onerror="this.onerror=null;this.src='${ESCUDO_PLACEHOLDER}'">
        <div class="mm-classificado-info">
          <div class="mm-classificado-nome">${truncate(time.nome_time || "Time", 18)}</div>
          <div class="mm-classificado-cartola">${truncate(time.nome_cartola || time.nome_cartoleiro || "", 20)}</div>
        </div>
        <div class="mm-classificado-adversario">
          vs <strong>${posAdv}º</strong>
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  // Inserir antes do conteúdo existente
  container.insertAdjacentHTML("afterbegin", html);

  // Event listener para fechar
  document.getElementById("btnFecharClassificados")?.addEventListener("click", () => {
    document.querySelector(".mm-classificados-container")?.remove();
    classificadosAberto = false;
  });
}

// =====================================================================
// ATUALIZAR INFO DA FASE
// =====================================================================
function atualizarInfoFase(fase) {
  const infoEl = document.getElementById("mmPhaseInfo");
  if (!infoEl) return;

  const config = EDICOES_MATA_MATA.find(
    (e) => e.id === estado.edicaoSelecionada,
  );
  const nomeEdicao = config
    ? config.nome
    : `${estado.edicaoSelecionada}ª Edição`;

  const nomeFase =
    {
      primeira: "1ª FASE",
      oitavas: "OITAVAS",
      quartas: "QUARTAS",
      semis: "SEMIFINAL",
      final: "FINAL",
    }[fase] || fase.toUpperCase();

  let rodadaFase = estado.rodadaAtual;
  if (config) {
    // ✅ v7.3: Usar fases dinâmicas para calcular índice
    const fasesAtivas = getFasesAtuais();
    const faseIndex = fasesAtivas.indexOf(fase);
    rodadaFase = config.rodadaInicial + (faseIndex >= 0 ? faseIndex : 0);
  }

  infoEl.innerHTML = `
    <p class="mm-edition-name">${nomeEdicao}</p>
    <p class="mm-phase-name">${nomeFase}</p>
    <p class="mm-round-info">Rodada ${rodadaFase}</p>
  `;
}

// =====================================================================
// CARREGAR FASE
// =====================================================================
async function carregarFase(edicao, fase) {
  const container = document.getElementById("mata-mata-container");
  if (!container) return;

  atualizarInfoFase(fase);

  container.innerHTML = `
    <div class="mm-loading">
      <div class="mm-spinner"></div>
      <p>Carregando confrontos...</p>
    </div>
  `;

  try {
    const cacheKey = `${edicao}-${fase}`;
    let confrontos = estado.cacheConfrontos[cacheKey];

    if (!confrontos) {
      const temporada = window.participanteAuth?.temporadaSelecionada || CURRENT_SEASON;
      const res = await fetch(
        `/api/mata-mata/cache/${estado.ligaId}/${edicao}?temporada=${temporada}`,
      );
      if (!res.ok) throw new Error("Erro ao buscar dados");

      const data = await res.json();
      if (window.Log)
        Log.info("[MATA-MATA] 📦 Resposta carregarFase:", Object.keys(data));

      const dadosFases = data.dados || data.dados_torneio || data;

      if (!dadosFases || typeof dadosFases !== "object") {
        throw new Error("Dados não encontrados");
      }

      FASES.forEach((f) => {
        if (dadosFases[f]) {
          estado.cacheConfrontos[`${edicao}-${f}`] = dadosFases[f];
        }
      });

      confrontos = dadosFases[fase];
    }

    if (!confrontos || confrontos.length === 0) {
      // ✅ v7.2: Se é a primeira fase, mostrar opções de parciais
      if (fase === "primeira") {
        renderParciaisOptionsApp(container, edicao);
        return;
      }
      container.innerHTML = `
        <div class="mm-vazio">
          <span class="material-symbols-outlined">sports_mma</span>
          <h3>Aguardando</h3>
          <p>Confrontos desta fase ainda não disponíveis</p>
        </div>
      `;
      return;
    }

    renderConfrontosCards(confrontos, fase);
  } catch (error) {
    if (window.Log) Log.error("[MATA-MATA] Erro:", error);
    container.innerHTML = `
      <div class="mm-vazio">
        <span class="material-symbols-outlined">error_outline</span>
        <h3>Erro</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// =====================================================================
// RENDERIZAR CONFRONTOS EM CARDS
// =====================================================================
function renderConfrontosCards(confrontos, fase) {
  const container = document.getElementById("mata-mata-container");
  if (!container) return;

  const meuTimeId = estado.timeId ? parseInt(estado.timeId) : null;

  const meuConfronto = confrontos.find(
    (c) =>
      extrairTimeId(c.timeA) === meuTimeId ||
      extrairTimeId(c.timeB) === meuTimeId,
  );

  let html = "";

  if (meuConfronto) {
    html += renderMeuConfrontoCard(meuConfronto, meuTimeId);
  } else {
    const historico = estado.historicoParticipacao[estado.edicaoSelecionada];

    if (historico && historico.ultimaFase && historico.eliminado) {
      const nomeFaseEliminacao =
        {
          primeira: "1ª Fase",
          oitavas: "Oitavas",
          quartas: "Quartas",
          semis: "Semifinal",
          final: "Final",
        }[historico.ultimaFase] || historico.ultimaFase;

      html += `
        <div class="mm-eliminado-card">
          <span class="material-symbols-outlined">block</span>
          <div class="mm-elim-texto">
            <p class="mm-elim-titulo">Você foi eliminado</p>
            <p class="mm-elim-fase">na ${nomeFaseEliminacao}</p>
          </div>
        </div>
      `;
    } else if (historico && historico.ultimaFase) {
      html += `
        <div class="mm-nao-classificado">
          <span class="material-symbols-outlined">sports_soccer</span>
          <p>Você não está nesta fase</p>
        </div>
      `;
    } else {
      html += `
        <div class="mm-nao-classificado">
          <span class="material-symbols-outlined">person_off</span>
          <p>Você não participou desta edição</p>
        </div>
      `;
    }
  }

  html += renderConfrontosListaCards(confrontos, meuTimeId, fase);
  html += renderCardDesempenho();

  container.innerHTML = html;
}

// =====================================================================
// RENDER MEU CONFRONTO EM CARD
// =====================================================================
function renderMeuConfrontoCard(confronto, meuTimeId) {
  const souTimeA = extrairTimeId(confronto.timeA) === meuTimeId;
  const eu = souTimeA ? confronto.timeA : confronto.timeB;
  const adv = souTimeA ? confronto.timeB : confronto.timeA;

  const meusPts = parseFloat(eu?.pontos) || 0;
  const advPts = parseFloat(adv?.pontos) || 0;

  const ganhando = meusPts > advPts;
  const perdendo = meusPts < advPts;

  const statusClass = ganhando
    ? "passando"
    : perdendo
      ? "sendo-eliminado"
      : "empatando";
  const statusText = ganhando
    ? "Você está passando!"
    : perdendo
      ? "Você está sendo eliminado"
      : "Empate técnico";
  const statusIcon = ganhando
    ? "check_circle"
    : perdendo
      ? "warning"
      : "drag_handle";

  return `
    <div class="mm-meu-confronto-card">
      <div class="mm-mc-header-card">
        <span class="material-symbols-outlined mm-mc-icon ${statusClass}">${ganhando ? "trending_up" : perdendo ? "trending_down" : "remove"}</span>
        <span class="mm-mc-titulo">Seu Confronto</span>
      </div>

      <div class="mm-mc-versus">
        <!-- Meu Time -->
        <div class="mm-mc-time-card eu">
          <img class="mm-mc-escudo-card" src="${getEscudoUrl(eu)}" alt="" onerror="this.onerror=null;this.src='${ESCUDO_PLACEHOLDER}'">
          <div class="mm-mc-time-info">
            <span class="mm-mc-label">Você</span>
            <span class="mm-mc-nome-cartoleiro">${truncate(eu?.nome_cartola || eu?.nome_cartoleiro || "", 14)}</span>
            <span class="mm-mc-nome">${truncate(eu?.nome_time || "Meu Time", 16)}</span>
          </div>
          <span class="mm-mc-pts ${ganhando ? "vencedor" : perdendo ? "perdedor" : "empate"}">${typeof truncarPontos === 'function' ? truncarPontos(meusPts) : meusPts.toFixed(2)}</span>
        </div>

        <div class="mm-mc-x">VS</div>

        <!-- Adversário -->
        <div class="mm-mc-time-card adv">
          <img class="mm-mc-escudo-card" src="${getEscudoUrl(adv)}" alt="" onerror="this.onerror=null;this.src='${ESCUDO_PLACEHOLDER}'">
          <div class="mm-mc-time-info">
            <span class="mm-mc-label">Adversário</span>
            <span class="mm-mc-nome-cartoleiro">${truncate(adv?.nome_cartola || adv?.nome_cartoleiro || "", 14)}</span>
            <span class="mm-mc-nome">${truncate(adv?.nome_time || "Adversário", 16)}</span>
          </div>
          <span class="mm-mc-pts ${perdendo ? "vencedor" : ganhando ? "perdedor" : "empate"}">${typeof truncarPontos === 'function' ? truncarPontos(advPts) : advPts.toFixed(2)}</span>
        </div>
      </div>

      <div class="mm-mc-status-card ${statusClass}">
        <span class="material-symbols-outlined">${statusIcon}</span>
        <span>${statusText}</span>
      </div>
    </div>
  `;
}

// =====================================================================
// RENDER LISTA DE CONFRONTOS EM CARDS
// =====================================================================
function renderConfrontosListaCards(confrontos, meuTimeId, fase) {
  let html = "";

  if (fase === "final" && confrontos.length > 0) {
    const finalConfronto = confrontos[0];
    const timeA = finalConfronto.timeA || {};
    const timeB = finalConfronto.timeB || {};
    const ptsA = parseFloat(timeA.pontos) || 0;
    const ptsB = parseFloat(timeB.pontos) || 0;

    if (ptsA > 0 || ptsB > 0) {
      const campeao = ptsA >= ptsB ? timeA : timeB;
      const ptsCampeao = ptsA >= ptsB ? ptsA : ptsB;
      const campeaoId = extrairTimeId(campeao);
      const souCampeao = campeaoId === meuTimeId;

      html += `
        <div class="mm-campeao-card ${souCampeao ? "sou-eu" : ""}">
          <div class="mm-campeao-trofeu">🏆</div>
          <p class="mm-campeao-titulo">${souCampeao ? "Você é o Campeão!" : "Campeão"}</p>
          <div class="mm-campeao-time">
            <img class="mm-campeao-escudo" src="${getEscudoUrl(campeao)}" alt="" onerror="this.onerror=null;this.src='${ESCUDO_PLACEHOLDER}'">
            <div class="mm-campeao-info">
              <p class="mm-campeao-nome">${campeao.nome_time || "Time"}</p>
              <p class="mm-campeao-cartola">${campeao.nome_cartola || campeao.nome_cartoleiro || ""}</p>
              <p class="mm-campeao-pts">${typeof truncarPontos === 'function' ? truncarPontos(ptsCampeao) : ptsCampeao.toFixed(2)} pts</p>
            </div>
          </div>
          <div class="mm-campeao-badge">
            <span class="material-symbols-outlined">emoji_events</span>
            <span>${estado.edicaoSelecionada}ª Edição</span>
          </div>
        </div>
      `;
    }
  }

  html += `
    <div class="mm-outros-header">
      <span>${fase === "final" ? "A Grande Final" : "Todos os Confrontos"}</span>
    </div>
    <div class="mm-confrontos-lista">
  `;

  confrontos.forEach((c, idx) => {
    const timeA = c.timeA || {};
    const timeB = c.timeB || {};
    const ptsA = parseFloat(timeA.pontos) || 0;
    const ptsB = parseFloat(timeB.pontos) || 0;
    const diff = typeof truncarPontos === 'function' ? truncarPontos(Math.abs(ptsA - ptsB)) : Math.abs(ptsA - ptsB).toFixed(2);

    const vencedorA = ptsA > ptsB;
    const vencedorB = ptsB > ptsA;
    const isMinha =
      extrairTimeId(timeA) === meuTimeId || extrairTimeId(timeB) === meuTimeId;

    html += `
      <div class="mm-confronto-card ${isMinha ? "minha" : ""}">
        <div class="mm-conf-numero">${idx + 1}</div>

        <div class="mm-conf-times">
          <!-- Time A -->
          <div class="mm-conf-time ${vencedorA ? "vencedor" : vencedorB ? "perdedor" : ""}">
            <img class="mm-conf-escudo" src="${getEscudoUrl(timeA)}" alt="" onerror="this.onerror=null;this.src='${ESCUDO_PLACEHOLDER}'">
            <div class="mm-conf-info">
              <span class="mm-conf-nome">${truncate(timeA.nome_time || "A definir", 14)}</span>
              <span class="mm-conf-cartola">${truncate(timeA.nome_cartola || timeA.nome_cartoleiro || "", 16)}</span>
            </div>
            <span class="mm-conf-pts ${vencedorA ? "vencedor" : vencedorB ? "perdedor" : "empate"}">${typeof truncarPontos === 'function' ? truncarPontos(ptsA) : ptsA.toFixed(2)}</span>
          </div>

          <div class="mm-conf-vs">×</div>

          <!-- Time B -->
          <div class="mm-conf-time ${vencedorB ? "vencedor" : vencedorA ? "perdedor" : ""}">
            <img class="mm-conf-escudo" src="${getEscudoUrl(timeB)}" alt="" onerror="this.onerror=null;this.src='${ESCUDO_PLACEHOLDER}'">
            <div class="mm-conf-info">
              <span class="mm-conf-nome">${truncate(timeB.nome_time || "A definir", 14)}</span>
              <span class="mm-conf-cartola">${truncate(timeB.nome_cartola || timeB.nome_cartoleiro || "", 16)}</span>
            </div>
            <span class="mm-conf-pts ${vencedorB ? "vencedor" : vencedorA ? "perdedor" : "empate"}">${typeof truncarPontos === 'function' ? truncarPontos(ptsB) : ptsB.toFixed(2)}</span>
          </div>
        </div>

        <div class="mm-conf-diff">Diferença: ${diff} pts</div>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

// =====================================================================
// RENDER CARD "SEU DESEMPENHO" - VERSÃO 2
// =====================================================================
function renderCardDesempenho() {
  if (window.Log) Log.info("[MATA-MATA] 🎯 Renderizando card de desempenho...");

  const meuTimeId = estado.timeId ? parseInt(estado.timeId) : null;
  if (!meuTimeId) {
    if (window.Log) Log.warn("[MATA-MATA] ⚠️ TimeId não encontrado");
    return "";
  }

  if (window.Log) Log.info("[MATA-MATA] 📊 TimeId:", meuTimeId);

  let vitoriasTotal = 0;
  let derrotasTotal = 0;
  let pontosTotal = 0;
  const historicoEdicoes = [];

  // Percorrer todas as edições para montar histórico completo
  Object.keys(estado.historicoParticipacao).forEach((edicao) => {
    const historico = estado.historicoParticipacao[edicao];

    if (historico && historico.ultimaFase) {
      let vitoriasEdicao = 0;
      let derrotasEdicao = 0;
      let pontosEdicao = 0;

      // Calcular stats da edição
      FASES.forEach((f) => {
        const chaveCache = `${edicao}-${f}`;
        const confrontos = estado.cacheConfrontos[chaveCache];

        if (confrontos) {
          const meuConfronto = confrontos.find(
            (c) =>
              extrairTimeId(c.timeA) === meuTimeId ||
              extrairTimeId(c.timeB) === meuTimeId,
          );

          if (meuConfronto) {
            const souTimeA = extrairTimeId(meuConfronto.timeA) === meuTimeId;
            const meusPts =
              parseFloat(
                souTimeA
                  ? meuConfronto.timeA?.pontos
                  : meuConfronto.timeB?.pontos,
              ) || 0;
            const advPts =
              parseFloat(
                souTimeA
                  ? meuConfronto.timeB?.pontos
                  : meuConfronto.timeA?.pontos,
              ) || 0;

            pontosEdicao += meusPts;

            if (meusPts > advPts) vitoriasEdicao++;
            else if (meusPts < advPts) derrotasEdicao++;
          }
        }
      });

      // Mapear fase para badge
      const faseMap = {
        primeira: { label: "1ª Fase", class: "primeira" },
        oitavas: { label: "Oitavas", class: "oitavas" },
        quartas: { label: "Quartas", class: "quartas" },
        semis: { label: "Semis", class: "semis" },
        final: { label: "Campeão", class: "campeao" },
      };

      const faseInfo = faseMap[historico.ultimaFase] || {
        label: historico.ultimaFase,
        class: "primeira",
      };

      historicoEdicoes.push({
        edicao: edicao,
        vitorias: vitoriasEdicao,
        derrotas: derrotasEdicao,
        pontos: pontosEdicao,
        fase: faseInfo.label,
        faseClass: faseInfo.class,
      });

      vitoriasTotal += vitoriasEdicao;
      derrotasTotal += derrotasEdicao;
      pontosTotal += pontosEdicao;
    }
  });

  // Ordenar edições por número
  historicoEdicoes.sort((a, b) => parseInt(a.edicao) - parseInt(b.edicao));

  if (window.Log)
    Log.info("[MATA-MATA] 📊 Stats Totais:", {
      vitoriasTotal,
      derrotasTotal,
      pontosTotal,
      edicoes: historicoEdicoes.length,
    });

  const aproveitamento =
    vitoriasTotal + derrotasTotal > 0
      ? ((vitoriasTotal / (vitoriasTotal + derrotasTotal)) * 100).toFixed(0)
      : 0;

  // Renderizar histórico de edições
  let historicoHTML = "";
  if (historicoEdicoes.length > 0) {
    historicoHTML = `
      <div class="mm-desemp-history">
        <div class="mm-desemp-history-title">
          <span class="material-symbols-outlined">history</span>
          <span>Histórico por Edição</span>
        </div>
        <div class="mm-desemp-edition-list">
          ${historicoEdicoes
            .map(
              (ed) => `
            <div class="mm-desemp-edition-item">
              <span class="mm-desemp-edition-name">${ed.edicao}ª Edição</span>
              <div class="mm-desemp-edition-stats">
                <span class="mm-desemp-edition-record">${ed.vitorias}V-${ed.derrotas}D</span>
                <span class="mm-desemp-edition-phase ${ed.faseClass}">${ed.fase}</span>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  return `
    <div class="mm-desempenho-card">
      <div class="mm-desemp-header">
        <span class="material-symbols-outlined">bar_chart</span>
        <span>Seu Desempenho</span>
      </div>

      <div class="mm-desemp-main-stats">
        <div class="mm-desemp-main-stat">
          <span class="mm-desemp-main-icon win material-symbols-outlined">emoji_events</span>
          <div class="mm-desemp-main-info">
            <span class="mm-desemp-main-label">Vitórias</span>
            <span class="mm-desemp-main-value">${vitoriasTotal}</span>
          </div>
        </div>

        <div class="mm-desemp-main-stat">
          <span class="mm-desemp-main-icon loss material-symbols-outlined">close</span>
          <div class="mm-desemp-main-info">
            <span class="mm-desemp-main-label">Derrotas</span>
            <span class="mm-desemp-main-value">${derrotasTotal}</span>
          </div>
        </div>
      </div>

      <div class="mm-desemp-secondary-stats">
        <div class="mm-desemp-secondary-stat">
          <div class="mm-desemp-secondary-value success">${aproveitamento}%</div>
          <div class="mm-desemp-secondary-label">Aproveit.</div>
        </div>
        <div class="mm-desemp-secondary-stat">
          <div class="mm-desemp-secondary-value">${typeof truncarPontos === 'function' ? truncarPontos(pontosTotal) : pontosTotal.toFixed(2)}</div>
          <div class="mm-desemp-secondary-label">Pts Total</div>
        </div>
        <div class="mm-desemp-secondary-stat">
          <div class="mm-desemp-secondary-value highlight">${historicoEdicoes.length}</div>
          <div class="mm-desemp-secondary-label">Edições</div>
        </div>
      </div>

      ${historicoHTML}
    </div>
  `;
}

// =====================================================================
// PARCIAIS AO VIVO (v7.2)
// =====================================================================

function renderParciaisOptionsApp(container, edicao) {
  const edicaoConfig = EDICOES_MATA_MATA.find(e => e.id === edicao);
  const edicaoNome = edicaoConfig ? edicaoConfig.nome : `${edicao}ª Edição`;

  container.innerHTML = `
    <div class="mm-vazio mm-parciais-menu">
      <span class="material-symbols-outlined" style="font-size:40px;color:var(--app-amber);">sports_score</span>
      <h3>Rodada de Classificação</h3>
      <p>As chaves serão definidas ao final da rodada.</p>
      <div class="mm-parciais-actions">
        <button class="mm-parciais-btn" id="btnParcClassificados">
          <span class="material-symbols-outlined">leaderboard</span>
          <span>Classificados da ${edicaoNome}</span>
          <span class="mm-parciais-badge">PARCIAIS</span>
        </button>
        <button class="mm-parciais-btn" id="btnParcConfrontos">
          <span class="material-symbols-outlined">account_tree</span>
          <span>Confrontos da 1ª Fase</span>
          <span class="mm-parciais-badge">PARCIAIS</span>
        </button>
      </div>
    </div>
  `;

  document.getElementById("btnParcClassificados")?.addEventListener("click", () => {
    carregarClassificadosParciais(container, edicao);
  });
  document.getElementById("btnParcConfrontos")?.addEventListener("click", () => {
    carregarConfrontosParciais(container, edicao);
  });
}

async function carregarClassificadosParciais(container, edicao) {
  container.innerHTML = `
    <div class="mm-loading">
      <div class="mm-spinner"></div>
      <p>Buscando parciais...</p>
    </div>`;

  try {
    const res = await fetch(`/api/matchday/parciais/${estado.ligaId}`);
    const data = res.ok ? await res.json() : null;

    if (!data || !data.disponivel) {
      const msg = data?.message || "Parciais não disponíveis no momento.";
      container.innerHTML = `
        <div class="mm-vazio">
          <span class="material-symbols-outlined">info</span>
          <h3>${msg}</h3>
          <div class="mm-parciais-voltar">
            <button class="mm-parciais-voltar-btn" id="btnVoltarParc">← Voltar</button>
          </div>
        </div>`;
      document.getElementById("btnVoltarParc")?.addEventListener("click", () => {
        renderParciaisOptionsApp(container, edicao);
      });
      return;
    }

    const ranking = data.ranking || [];
    const tamanho = estado.tamanhoTorneio;
    const classificados = ranking.slice(0, tamanho);
    const eliminados = ranking.slice(tamanho, tamanho + 5);
    const edicaoConfig = EDICOES_MATA_MATA.find(e => e.id === edicao);
    const edicaoNome = edicaoConfig ? edicaoConfig.nome : `${edicao}ª Edição`;
    const meuTimeId = estado.timeId ? parseInt(estado.timeId) : null;

    let html = `
      <div class="mm-parciais-live-header">
        <span class="mm-live-dot"></span>
        <span class="mm-live-text">AO VIVO</span>
        <span class="mm-live-info">Classificados — ${edicaoNome} (Rodada ${data.rodada})</span>
      </div>
      <p class="mm-parciais-sub">Top ${tamanho} classificam para o Mata-Mata</p>
      <div class="mm-parciais-ranking">`;

    classificados.forEach((t, i) => {
      const isMeu = parseInt(t.timeId) === meuTimeId;
      const isCutoff = i === tamanho - 1;
      html += `
        <div class="mm-parciais-rank-item ${isMeu ? "meu" : ""} ${isCutoff ? "cutoff" : ""}">
          <span class="mm-parciais-pos">${i + 1}º</span>
          <img class="mm-parciais-escudo" src="/escudos/${t.clube_id}.png" alt="" onerror="this.onerror=null;this.src='${ESCUDO_PLACEHOLDER}'">
          <div class="mm-parciais-rank-info">
            <span class="mm-parciais-rank-nome">${truncate(t.nome_time || "—", 16)}</span>
            <span class="mm-parciais-rank-cartola">${truncate(t.nome_cartola || "—", 18)}</span>
          </div>
          <span class="mm-parciais-rank-pts">${typeof truncarPontos === 'function' ? truncarPontos(t.pontos || 0) : (t.pontos?.toFixed(2) || "0.00")}</span>
        </div>`;
    });

    if (eliminados.length > 0) {
      html += `<div class="mm-parciais-eliminados-label">Fora do corte</div>`;
      eliminados.forEach((t, i) => {
        html += `
          <div class="mm-parciais-rank-item eliminado">
            <span class="mm-parciais-pos">${tamanho + i + 1}º</span>
            <img class="mm-parciais-escudo" src="/escudos/${t.clube_id}.png" alt="" onerror="this.onerror=null;this.src='${ESCUDO_PLACEHOLDER}'">
            <div class="mm-parciais-rank-info">
              <span class="mm-parciais-rank-nome">${truncate(t.nome_time || "—", 16)}</span>
              <span class="mm-parciais-rank-cartola">${truncate(t.nome_cartola || "—", 18)}</span>
            </div>
            <span class="mm-parciais-rank-pts">${typeof truncarPontos === 'function' ? truncarPontos(t.pontos || 0) : (t.pontos?.toFixed(2) || "0.00")}</span>
          </div>`;
      });
    }

    html += `</div>
      <div class="mm-parciais-voltar">
        <button class="mm-parciais-voltar-btn" id="btnVoltarParc">← Voltar</button>
      </div>`;

    container.innerHTML = html;
    document.getElementById("btnVoltarParc")?.addEventListener("click", () => {
      renderParciaisOptionsApp(container, edicao);
    });

    if (window.Log) Log.info(`[MATA-MATA] 📊 Parciais classificados: ${classificados.length}/${ranking.length}`);
  } catch (err) {
    if (window.Log) Log.error("[MATA-MATA] Erro parciais:", err);
    container.innerHTML = `
      <div class="mm-vazio">
        <span class="material-symbols-outlined">error_outline</span>
        <h3>Erro ao buscar parciais</h3>
        <p>${err.message}</p>
        <div class="mm-parciais-voltar">
          <button class="mm-parciais-voltar-btn" id="btnVoltarParc">← Voltar</button>
        </div>
      </div>`;
    document.getElementById("btnVoltarParc")?.addEventListener("click", () => {
      renderParciaisOptionsApp(container, edicao);
    });
  }
}

async function carregarConfrontosParciais(container, edicao) {
  container.innerHTML = `
    <div class="mm-loading">
      <div class="mm-spinner"></div>
      <p>Montando confrontos parciais...</p>
    </div>`;

  try {
    const res = await fetch(`/api/matchday/parciais/${estado.ligaId}`);
    const data = res.ok ? await res.json() : null;

    if (!data || !data.disponivel) {
      const msg = data?.message || "Parciais não disponíveis no momento.";
      container.innerHTML = `
        <div class="mm-vazio">
          <span class="material-symbols-outlined">info</span>
          <h3>${msg}</h3>
          <div class="mm-parciais-voltar">
            <button class="mm-parciais-voltar-btn" id="btnVoltarParc">← Voltar</button>
          </div>
        </div>`;
      document.getElementById("btnVoltarParc")?.addEventListener("click", () => {
        renderParciaisOptionsApp(container, edicao);
      });
      return;
    }

    const ranking = data.ranking || [];
    const tamanho = estado.tamanhoTorneio;

    if (ranking.length < tamanho) {
      container.innerHTML = `
        <div class="mm-vazio">
          <span class="material-symbols-outlined">group</span>
          <h3>Dados insuficientes</h3>
          <p>${ranking.length} de ${tamanho} times nas parciais.</p>
          <div class="mm-parciais-voltar">
            <button class="mm-parciais-voltar-btn" id="btnVoltarParc">← Voltar</button>
          </div>
        </div>`;
      document.getElementById("btnVoltarParc")?.addEventListener("click", () => {
        renderParciaisOptionsApp(container, edicao);
      });
      return;
    }

    // Montar confrontos 1vs último, 2vs penúltimo, etc.
    const classificados = ranking.slice(0, tamanho);
    const metade = tamanho / 2;
    const confrontos = [];

    for (let i = 0; i < metade; i++) {
      const timeA = classificados[i];
      const timeB = classificados[tamanho - 1 - i];
      confrontos.push({
        timeA: {
          time_id: timeA.timeId,
          timeId: timeA.timeId,
          nome_time: timeA.nome_time,
          nome_cartola: timeA.nome_cartola,
          nome_cartoleiro: timeA.nome_cartola,
          clube_id: timeA.clube_id,
          url_escudo_png: `/escudos/${timeA.clube_id}.png`,
          pontos: 0,
        },
        timeB: {
          time_id: timeB.timeId,
          timeId: timeB.timeId,
          nome_time: timeB.nome_time,
          nome_cartola: timeB.nome_cartola,
          nome_cartoleiro: timeB.nome_cartola,
          clube_id: timeB.clube_id,
          url_escudo_png: `/escudos/${timeB.clube_id}.png`,
          pontos: 0,
        },
      });
    }

    const edicaoConfig = EDICOES_MATA_MATA.find(e => e.id === edicao);
    const edicaoNome = edicaoConfig ? edicaoConfig.nome : `${edicao}ª Edição`;

    // Renderizar com header AO VIVO + confrontos em cards
    let html = `
      <div class="mm-parciais-live-header">
        <span class="mm-live-dot"></span>
        <span class="mm-live-text">AO VIVO</span>
        <span class="mm-live-info">Confrontos da 1ª Fase — ${edicaoNome} (Rodada ${data.rodada})</span>
      </div>
      <p class="mm-parciais-sub">Baseado nas parciais. Sujeito a alteração.</p>`;

    html += `
      <div class="mm-outros-header">
        <span>Confrontos Projetados</span>
      </div>
      <div class="mm-confrontos-lista">`;

    const meuTimeId = estado.timeId ? parseInt(estado.timeId) : null;

    confrontos.forEach((c, idx) => {
      const timeA = c.timeA || {};
      const timeB = c.timeB || {};
      const posA = idx + 1;
      const posB = tamanho - idx;
      const isMinha = extrairTimeId(timeA) === meuTimeId || extrairTimeId(timeB) === meuTimeId;

      html += `
        <div class="mm-confronto-card ${isMinha ? "minha" : ""}">
          <div class="mm-conf-numero">${idx + 1}</div>
          <div class="mm-conf-times">
            <div class="mm-conf-time">
              <img class="mm-conf-escudo" src="${getEscudoUrl(timeA)}" alt="" onerror="this.onerror=null;this.src='${ESCUDO_PLACEHOLDER}'">
              <div class="mm-conf-info">
                <span class="mm-conf-nome">${truncate(timeA.nome_time || "A definir", 14)}</span>
                <span class="mm-conf-cartola">${truncate(timeA.nome_cartola || "", 16)}</span>
              </div>
              <span class="mm-conf-pts empate">${posA}º</span>
            </div>
            <div class="mm-conf-vs">×</div>
            <div class="mm-conf-time">
              <img class="mm-conf-escudo" src="${getEscudoUrl(timeB)}" alt="" onerror="this.onerror=null;this.src='${ESCUDO_PLACEHOLDER}'">
              <div class="mm-conf-info">
                <span class="mm-conf-nome">${truncate(timeB.nome_time || "A definir", 14)}</span>
                <span class="mm-conf-cartola">${truncate(timeB.nome_cartola || "", 16)}</span>
              </div>
              <span class="mm-conf-pts empate">${posB}º</span>
            </div>
          </div>
          <div class="mm-conf-diff">Parcial: ${posA}º vs ${posB}º</div>
        </div>`;
    });

    html += `</div>
      <div class="mm-parciais-voltar">
        <button class="mm-parciais-voltar-btn" id="btnVoltarParc">← Voltar</button>
      </div>`;

    container.innerHTML = html;
    document.getElementById("btnVoltarParc")?.addEventListener("click", () => {
      renderParciaisOptionsApp(container, edicao);
    });

    if (window.Log) Log.info(`[MATA-MATA] ⚔️ Confrontos parciais: ${confrontos.length} jogos montados`);
  } catch (err) {
    if (window.Log) Log.error("[MATA-MATA] Erro confrontos parciais:", err);
    container.innerHTML = `
      <div class="mm-vazio">
        <span class="material-symbols-outlined">error_outline</span>
        <h3>Erro ao montar confrontos</h3>
        <p>${err.message}</p>
        <div class="mm-parciais-voltar">
          <button class="mm-parciais-voltar-btn" id="btnVoltarParc">← Voltar</button>
        </div>
      </div>`;
    document.getElementById("btnVoltarParc")?.addEventListener("click", () => {
      renderParciaisOptionsApp(container, edicao);
    });
  }
}

// =====================================================================
// ✅ v7.4: RENDER SEM EDIÇÕES DISPONÍVEIS
// =====================================================================
function renderSemEdicoes(temporada) {
  const container = document.getElementById("mata-mata-container");
  if (!container) return;

  // Esconder select de edições e info quando não há edições
  const selectWrapper = document.querySelector(".mm-edition-select-wrapper");
  const phaseInfo = document.getElementById("mmPhaseInfo");
  if (selectWrapper) selectWrapper.style.display = "none";
  if (phaseInfo) phaseInfo.innerHTML = "";

  container.innerHTML = `
    <div class="mm-vazio">
      <span class="material-symbols-outlined">sports_kabaddi</span>
      <h3>Mata-Mata ainda não calculado</h3>
      <p>As chaves do Mata-Mata ${temporada} ainda não foram geradas pelo administrador.</p>
      <p class="mm-vazio-sub">Aguarde a publicação dos confrontos!</p>
    </div>
  `;

  if (window.Log) Log.info(`[MATA-MATA] 📭 Sem edições para temporada ${temporada}`);
}

// =====================================================================
// RENDER ERRO
// =====================================================================
function renderErro(msg) {
  const container = document.getElementById("mata-mata-container");
  if (!container) return;

  container.innerHTML = `
    <div class="mm-vazio">
      <span class="material-symbols-outlined">error_outline</span>
      <h3>Erro</h3>
      <p>${msg}</p>
    </div>
  `;
}

// =====================================================================
// UTILS
// =====================================================================
function truncate(str, len) {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "..." : str;
}

if (window.Log) Log.info("[MATA-MATA] ✅ Módulo v7.5 carregado (Botão Classificados)");
