// MÓDULO RODADAS MELHORADO - Mini Cards + UX Aprimorada

// VERIFICAÇÃO DE AMBIENTE
const isBackend = typeof window === "undefined";
const isFrontend = typeof window !== "undefined";

// DECLARAÇÕES CONDICIONAIS
let urlParams, ligaId;

// ==============================
// VARIÁVEIS PARA IMPORTS DINÂMICOS
// ==============================
let getMercadoStatus = null;
let getLigaId = null;
let criarBotaoExportacaoRodada = null;
let exportarRodadaComoImagem = null;
let modulosCarregados = false;

// ==============================
// ESTADO DO MÓDULO
// ==============================
let rodadaAtualSelecionada = null;
let statusMercadoGlobal = { rodada_atual: 1, status_mercado: 4 };

// ==============================
// FUNÇÃO PARA CARREGAR MÓDULOS DINAMICAMENTE
// ==============================
async function carregarModulos() {
  if (modulosCarregados || isBackend) return;

  try {
    const [pontosCorridosModule, exportModule] = await Promise.all([
      import("./pontos-corridos-utils.js"),
      import("./exports/export-exports.js"),
    ]);

    getMercadoStatus = pontosCorridosModule.buscarStatusMercado;
    getLigaId = pontosCorridosModule.getLigaId;
    criarBotaoExportacaoRodada = exportModule.criarBotaoExportacaoRodada;
    exportarRodadaComoImagem = exportModule.exportarRodadaComoImagem;

    modulosCarregados = true;
    console.log("[RODADAS] ✅ Módulos carregados com sucesso");
  } catch (error) {
    console.warn("[RODADAS] ⚠️ Erro ao carregar módulos:", error);
  }
}

// ==============================
// INICIALIZAÇÃO DO MÓDULO
// ==============================
if (isFrontend) {
  carregarModulos()
    .then(() => {
      console.log("[RODADAS] ✅ Inicialização assíncrona completa");
    })
    .catch((error) => {
      console.warn("[RODADAS] ⚠️ Erro na inicialização assíncrona:", error);
    });

  urlParams = new URLSearchParams(window.location.search);
  ligaId = urlParams.get("id");
} else {
  console.log("[RODADAS] Executando no backend - modo limitado");
  urlParams = null;
  ligaId = null;
}

// ==============================
// VALORES DE BANCO PADRÃO
// ==============================
const valoresBancoPadrao = {
  1: 20.0,
  2: 19.0,
  3: 18.0,
  4: 17.0,
  5: 16.0,
  6: 15.0,
  7: 14.0,
  8: 13.0,
  9: 12.0,
  10: 11.0,
  11: 10.0,
  12: 0.0,
  13: 0.0,
  14: 0.0,
  15: 0.0,
  16: 0.0,
  17: 0.0,
  18: 0.0,
  19: 0.0,
  20: 0.0,
  21: 0.0,
  22: -10.0,
  23: -11.0,
  24: -12.0,
  25: -13.0,
  26: -14.0,
  27: -15.0,
  28: -16.0,
  29: -17.0,
  30: -18.0,
  31: -19.0,
  32: -20.0,
};

const valoresBancoCartoleirosSobral = {
  1: 7.0,
  2: 4.0,
  3: 0.0,
  4: -2.0,
  5: -5.0,
  6: -10.0,
};

// ==============================
// FUNÇÃO PRINCIPAL - CARREGAR RODADAS COM MINI CARDS
// ==============================
export async function carregarRodadas(forceRefresh = false) {
  console.log("🎯 [RODADAS] carregarRodadas chamada com forceRefresh:", forceRefresh);
  
  if (isBackend) {
    console.log("[RODADAS] carregarRodadas: executando no backend - ignorando");
    return;
  }

  console.log("📦 [RODADAS] Aguardando carregamento de módulos...");
  await carregarModulos();

  const rodadasContainer = document.getElementById("rodadas");
  console.log("🔍 [RODADAS] Container rodadas encontrado:", !!rodadasContainer);
  console.log("✅ [RODADAS] Container ativo:", rodadasContainer?.classList.contains("active"));
  
  if (!rodadasContainer || !rodadasContainer.classList.contains("active")) {
    console.log("⏭️ [RODADAS] Container não ativo, saindo da função");
    return;
  }

  console.log("🌐 [RODADAS] Buscando status do mercado...");
  await atualizarStatusMercado();

  console.log("🎨 [RODADAS] Renderizando mini cards...");
  await renderizarMiniCardsRodadas();
  
  console.log("✅ [RODADAS] carregarRodadas concluída com sucesso");
}

// ==============================
// ATUALIZAR STATUS DO MERCADO
// ==============================
async function atualizarStatusMercado() {
  try {
    const resMercado = await fetch("/api/cartola/mercado/status");
    if (resMercado.ok) {
      const mercadoData = await resMercado.json();
      statusMercadoGlobal = {
        rodada_atual: mercadoData.rodada_atual,
        status_mercado: mercadoData.status_mercado,
      };
    } else {
      console.warn("Não foi possível buscar status do mercado.");
    }
  } catch (err) {
    console.error("Erro ao buscar status do mercado:", err);
  }
}

// ==============================
// RENDERIZAR MINI CARDS DAS RODADAS
// ==============================
async function renderizarMiniCardsRodadas() {
  console.log("🎨 [RODADAS] renderizarMiniCardsRodadas iniciada");
  
  const cardsContainer = document.getElementById("rodadasCards");
  console.log("📦 [RODADAS] Container rodadasCards encontrado:", !!cardsContainer);
  
  if (!cardsContainer) {
    console.error("❌ [RODADAS] Container rodadasCards não encontrado!");
    return;
  }

  const { rodada_atual, status_mercado } = statusMercadoGlobal;
  console.log("⚽ [RODADAS] Status do mercado:", { rodada_atual, status_mercado });
  
  const mercadoAberto = status_mercado === 1;

  let cardsHTML = "";

  for (let i = 1; i <= 38; i++) {
    let statusClass = "";
    let statusText = "";
    let isDisabled = false;

    if (i < rodada_atual) {
      statusClass = "encerrada";
      statusText = "Encerrada";
    } else if (i === rodada_atual) {
      if (mercadoAberto) {
        statusClass = "vigente";
        statusText = "Aberta";
      } else {
        statusClass = "parcial";
        statusText = "Parciais";
      }
    } else {
      statusClass = "futura";
      statusText = "Futura";
      isDisabled = true;
    }

    cardsHTML += `
      <div class="rodada-mini-card ${isDisabled ? "disabled" : ""}" 
           data-rodada="${i}" 
           onclick="${isDisabled ? "" : `selecionarRodada(${i})`}">
        <div class="rodada-numero">${i}</div>
        <div class="rodada-status ${statusClass}">${statusText}</div>
      </div>
    `;
  }

  cardsContainer.innerHTML = cardsHTML;
}

// ==============================
// SELECIONAR RODADA
// ==============================
window.selecionarRodada = async function (rodada) {
  if (rodadaAtualSelecionada === rodada) return;

  // Atualizar seleção visual
  document.querySelectorAll(".rodada-mini-card").forEach((card) => {
    card.classList.remove("selected");
  });

  const cardSelecionado = document.querySelector(`[data-rodada="${rodada}"]`);
  if (cardSelecionado) {
    cardSelecionado.classList.add("selected");
  }

  rodadaAtualSelecionada = rodada;

  // Mostrar seção de conteúdo
  const contentSection = document.getElementById("rodadaContentSection");
  if (contentSection) {
    contentSection.style.display = "block";
  }

  // Atualizar título
  const titulo = document.getElementById("rodadaTituloAtual");
  if (titulo) {
    titulo.textContent = `Rodada ${rodada}`;
  }

  // Carregar dados da rodada
  await carregarDadosRodada(rodada);
};

// ==============================
// CARREGAR DADOS DA RODADA SELECIONADA
// ==============================
async function carregarDadosRodada(rodadaSelecionada) {
  const rankingBody = document.getElementById("rankingBody");
  const loading = document.getElementById("loading");

  if (!rankingBody) return;

  const { rodada_atual, status_mercado } = statusMercadoGlobal;
  const mercadoAberto = status_mercado === 1;

  try {
    loading.style.display = "block";
    rankingBody.innerHTML = "";

    if (rodadaSelecionada < rodada_atual) {
      // Rodada encerrada
      const rankingsDaRodada = await fetchAndProcessRankingRodada(
        ligaId,
        rodadaSelecionada,
      );
      exibirRanking(rankingsDaRodada, rodadaSelecionada);
    } else if (rodadaSelecionada === rodada_atual) {
      if (mercadoAberto) {
        // Mercado aberto
        rankingBody.innerHTML =
          '<tr><td colspan="6" style="color: #e67e22; text-align: center; padding: 20px;">O mercado está aberto. A rodada ainda não começou!</td></tr>';
        limparExportContainer();
      } else {
        // Rodada atual com parciais
        const liga = await buscarLiga(ligaId);
        if (!liga)
          throw new Error(
            "Erro ao buscar dados da liga para calcular parciais",
          );
        const rankingsParciais = await calcularPontosParciais(
          liga,
          rodada_atual,
        );
        exibirRankingParciais(rankingsParciais, rodada_atual);
      }
    } else {
      // Rodada futura
      rankingBody.innerHTML =
        '<tr><td colspan="6" style="color: #bbb; text-align: center; padding: 20px;">Esta rodada ainda não aconteceu.</td></tr>';
      limparExportContainer();
    }
  } catch (err) {
    console.error("Erro em carregarDadosRodada:", err);
    rankingBody.innerHTML = `<tr><td colspan="6" style="color: red; text-align: center; padding: 20px;">Erro: ${err.message}</td></tr>`;
    limparExportContainer();
  } finally {
    loading.style.display = "none";
  }
}

// ==============================
// HELPER FUNCTIONS (MANTIDAS ORIGINAIS)
// ==============================

function getPosLabel(index, total) {
  if (isBackend) return `${index + 1}º`;

  const pos = index + 1;
  const isLigaCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";

  if (isLigaCartoleirosSobral) {
    if (pos === 1)
      return `<span style="color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;">MITO</span>`;
    if (pos === 6)
      return `<span style="color:#fff; font-weight:bold; background:#dc3545; border-radius:4px; padding:1px 8px; font-size:12px;">MICO</span>`;
    if (pos === 2) return `<span class="pos-g">G2</span>`;
    return `${pos}º`;
  } else {
    if (pos === 1)
      return `<span style="color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;">MITO</span>`;
    if (pos >= 2 && pos <= 10) return `<span class="pos-g">G${pos}</span>`;
    if (pos === 11) return `<span class="pos-g">G11</span>`;
    if (pos >= total - 10 && pos < total) {
      const zPos = total - pos;
      return `<span class="pos-z">${pos}º | Z${zPos}</span>`;
    }
    if (pos === total && total > 1) return `<span class="pos-mico">MICO</span>`;
    return `${pos}º`;
  }
}

async function fetchAndProcessRankingRodada(ligaId, rodadaNum) {
  try {
    let fetchFunc;
    if (isBackend) {
      fetchFunc = (await import("node-fetch")).default;
    } else {
      fetchFunc = fetch;
    }

    const baseUrl = isBackend ? "http://localhost:3000" : "";
    
    // 🔧 CORREÇÃO 1: Testar múltiplos endpoints
    const endpoints = [
      `${baseUrl}/api/rodadas/${ligaId}/rodadas?inicio=${rodadaNum}&fim=${rodadaNum}`,
      `${baseUrl}/api/ligas/${ligaId}/rodadas?rodada=${rodadaNum}`,
      `${baseUrl}/api/ligas/${ligaId}/ranking/${rodadaNum}`
    ];

    let rankingsDataFromApi = null;
    let lastError = null;

    // Tentar endpoints até encontrar dados
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 [RODADAS] Tentando endpoint: ${endpoint}`);
        const resRodadas = await fetchFunc(endpoint);

        if (!resRodadas.ok) {
          console.warn(`⚠️ [RODADAS] Endpoint ${endpoint} retornou ${resRodadas.status}`);
          continue;
        }

        const data = await resRodadas.json();
        
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
          rankingsDataFromApi = data;
          console.log(`✅ [RODADAS] Dados encontrados no endpoint: ${endpoint}`);
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`⚠️ [RODADAS] Erro no endpoint ${endpoint}:`, err.message);
        continue;
      }
    }

    if (!rankingsDataFromApi) {
      // 🔧 CORREÇÃO 2: Verificar se rodada ainda não tem dados ou se houve erro real
      const { rodada_atual, status_mercado } = statusMercadoGlobal;
      
      if (rodadaNum > rodada_atual) {
        console.log(`📅 [RODADAS] Rodada ${rodadaNum} é futura (atual: ${rodada_atual})`);
        return [];
      } else if (rodadaNum === rodada_atual && status_mercado === 1) {
        console.log(`⏰ [RODADAS] Rodada ${rodadaNum} está em andamento - mercado aberto`);
        return [];
      } else {
        console.error(`❌ [RODADAS] Nenhum endpoint retornou dados para rodada ${rodadaNum}`);
        throw lastError || new Error(`Dados não encontrados para rodada ${rodadaNum} em nenhum endpoint`);
      }
    }

    // 🔧 CORREÇÃO 3: Normalizar estrutura de dados
    const dataArray = Array.isArray(rankingsDataFromApi) ? rankingsDataFromApi : [rankingsDataFromApi];

    if (dataArray.length === 0) {
      console.warn(`📊 [RODADAS] Dados vazios confirmados para rodada ${rodadaNum}`);
      return [];
    }

    // 🔧 CORREÇÃO 4: Filtro mais robusto
    const rankingsDaRodada = dataArray.filter((rank) => {
      if (!rank || typeof rank !== "object") {
        console.warn(`⚠️ [RODADAS] Item inválido encontrado:`, rank);
        return false;
      }
      
      if (!rank.hasOwnProperty("rodada")) {
        console.warn(`⚠️ [RODADAS] Item sem propriedade 'rodada':`, rank);
        return false;
      }

      const rodadaItem = parseInt(rank.rodada);
      const rodadaTarget = parseInt(rodadaNum);
      
      return rodadaItem === rodadaTarget;
    });

    // 🔧 CORREÇÃO 5: Log detalhado para debug
    console.log(`📈 [RODADAS] Processamento rodada ${rodadaNum}:`);
    console.log(`   - Dados brutos: ${dataArray.length} items`);
    console.log(`   - Após filtro: ${rankingsDaRodada.length} items`);
    console.log(`   - Rodadas únicas nos dados:`, [...new Set(dataArray.map(r => r.rodada))]);

    // Ordenar por pontos
    rankingsDaRodada.sort(
      (a, b) => parseFloat(b.pontos || 0) - parseFloat(a.pontos || 0),
    );

    return rankingsDaRodada;
    
  } catch (err) {
    console.error(`❌ [RODADAS] Erro crítico em fetchAndProcessRankingRodada(${rodadaNum}):`, err);
    
    // 🔧 CORREÇÃO 6: Retorno gracioso em caso de erro
    const { rodada_atual } = statusMercadoGlobal;
    if (rodadaNum <= rodada_atual) {
      // Para rodadas que deveriam ter dados, re-throw do erro
      throw new Error(`Falha ao carregar dados da rodada ${rodadaNum}: ${err.message}`);
    } else {
      // Para rodadas futuras, retornar array vazio
      return [];
    }
  }
}

function exibirRanking(rankingsDaRodada, rodadaSelecionada) {
  if (isBackend) return;

  const rankingBody = document.getElementById("rankingBody");

  if (!rankingsDaRodada || rankingsDaRodada.length === 0) {
    rankingBody.innerHTML = `<tr><td colspan="6">Nenhum dado encontrado para a rodada ${rodadaSelecionada}.</td></tr>`;
    limparExportContainer();
    return;
  }

  const isLigaCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";
  const bancoValores = isLigaCartoleirosSobral
    ? valoresBancoCartoleirosSobral
    : valoresBancoPadrao;

  const tableHTML = rankingsDaRodada
    .map((rank, index) => {
      const banco =
        bancoValores[index + 1] !== undefined ? bancoValores[index + 1] : 0.0;
      const posLabel = getPosLabel(index, rankingsDaRodada.length);
      const nomeCartoleiro = rank.nome_cartola || rank.nome_cartoleiro || "N/D";
      const nomeTime = rank.nome_time || "N/D";
      const pontos =
        rank.pontos != null ? parseFloat(rank.pontos).toFixed(2) : "-";

      return `
      <tr>
        <td style="text-align:center; padding:2px; font-size:11px; width:45px;">${posLabel}</td>
        <td style="text-align:center; padding:2px; width:35px;">
          ${rank.clube_id ? `<img src="/escudos/${rank.clube_id}.png" alt="" title="${rank.clube_id}" style="width:16px; height:16px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>` : "–"}
        </td>
        <td style="text-align:left; padding:2px 4px; font-size:11px; max-width:150px; overflow:hidden; text-overflow:ellipsis;" title="${nomeCartoleiro}">${nomeCartoleiro}</td>
        <td style="text-align:left; padding:2px 4px; font-size:11px; max-width:150px; overflow:hidden; text-overflow:ellipsis;" title="${nomeTime}">${nomeTime}</td>
        <td style="text-align:center; padding:2px; font-size:11px;">
          <span style="font-weight:600; color:${pontos > 0 ? "#198754" : pontos < 0 ? "#dc3545" : "#333"};">${pontos}</span>
        </td>
        <td style="text-align:center; padding:2px; font-size:10px;">
          <span style="font-weight:600; color:${banco > 0 ? "#198754" : banco < 0 ? "#dc3545" : "#333"};">
            ${banco >= 0 ? `R$ ${banco.toFixed(2)}` : `-R$ ${Math.abs(banco).toFixed(2)}`}
          </span>
        </td>
      </tr>`;
    })
    .join("");

  rankingBody.innerHTML = tableHTML;

  // Criar botão de exportação
  criarBotaoExportacao(rankingsDaRodada, rodadaSelecionada, false);
}

function exibirRankingParciais(rankingsParciais, rodada) {
  if (isBackend) return;

  const rankingBody = document.getElementById("rankingBody");

  if (
    !rankingsParciais ||
    !Array.isArray(rankingsParciais) ||
    rankingsParciais.length === 0
  ) {
    rankingBody.innerHTML = `<tr><td colspan="6">Nenhum dado parcial encontrado para a rodada ${rodada}.</td></tr>`;
    limparExportContainer();
    return;
  }

  rankingsParciais.sort(
    (a, b) => parseFloat(b.totalPontos) - parseFloat(a.totalPontos),
  );

  const tableHTML = rankingsParciais
    .map((rank, index) => {
      const posLabel = getPosLabel(index, rankingsParciais.length);
      const nomeCartoleiro = rank.nome_cartola || rank.nome_cartoleiro || "N/D";
      const nomeTime = rank.nome_time || "N/D";
      const pontos =
        rank.totalPontos != null
          ? parseFloat(rank.totalPontos).toFixed(2)
          : "-";

      return `
      <tr>
        <td style="text-align:center; padding:2px; font-size:11px; width:45px;">${posLabel}</td>
        <td style="text-align:center; padding:2px; width:35px;">
          ${rank.clube_id ? `<img src="/escudos/${rank.clube_id}.png" alt="" title="${rank.clube_id}" style="width:16px; height:16px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>` : "–"}
        </td>
        <td style="text-align:left; padding:2px 4px; font-size:11px; max-width:150px; overflow:hidden; text-overflow:ellipsis;" title="${nomeCartoleiro}">${nomeCartoleiro}</td>
        <td style="text-align:left; padding:2px 4px; font-size:11px; max-width:150px; overflow:hidden; text-overflow:ellipsis;" title="${nomeTime}">${nomeTime}</td>
        <td style="text-align:center; padding:2px; font-size:11px;">
          <span style="font-weight:600; color:${pontos > 0 ? "#198754" : pontos < 0 ? "#dc3545" : "#333"};">${pontos} (Parcial)</span>
        </td>
        <td style="text-align:center; padding:2px; font-size:10px;">
          <span style="font-weight:600; color:#333;">-</span>
        </td>
      </tr>`;
    })
    .join("");

  rankingBody.innerHTML = tableHTML;

  // Criar botão de exportação para parciais
  criarBotaoExportacao(rankingsParciais, rodada, true);
}

// ==============================
// CRIAR BOTÃO DE EXPORTAÇÃO
// ==============================
function criarBotaoExportacao(rankings, rodada, isParciais) {
  if (!criarBotaoExportacaoRodada || !exportarRodadaComoImagem) {
    setTimeout(() => criarBotaoExportacao(rankings, rodada, isParciais), 1000);
    return;
  }

  const rankingsParaExportar = rankings.map((rank, index) => ({
    ...rank,
    nome_cartola: rank.nome_cartola || rank.nome_cartoleiro || "N/D",
    nome_time: rank.nome_time || "N/D",
    pontos: isParciais
      ? rank.totalPontos != null
        ? parseFloat(rank.totalPontos)
        : 0
      : rank.pontos != null
        ? parseFloat(rank.pontos)
        : 0,
    banco: isParciais
      ? null
      : valoresBancoPadrao[index + 1] !== undefined
        ? valoresBancoPadrao[index + 1]
        : 0.0,
  }));

  criarBotaoExportacaoRodada({
    containerId: "rodadasExportBtnContainer",
    rodada: rodada,
    rankings: rankingsParaExportar,
    tipo: "rodada",
    customExport: exportarRodadaComoImagem,
  });
}

function limparExportContainer() {
  const exportContainer = document.getElementById("rodadasExportBtnContainer");
  if (exportContainer) exportContainer.innerHTML = "";
}

// ==============================
// FUNÇÕES AUXILIARES (MANTIDAS ORIGINAIS)
// ==============================

export async function getRankingRodadaEspecifica(ligaId, rodadaNum) {
  console.log(`[rodadas.js] Solicitado ranking para rodada ${rodadaNum}`);
  return await fetchAndProcessRankingRodada(ligaId, rodadaNum);
}

async function buscarLiga(ligaId) {
  try {
    let fetchFunc = isBackend ? (await import("node-fetch")).default : fetch;
    const baseUrl = isBackend ? "http://localhost:3000" : "";
    const res = await fetchFunc(`${baseUrl}/api/ligas/${ligaId}`);
    if (!res.ok) throw new Error(`Erro ${res.status} ao buscar liga`);
    return await res.json();
  } catch (err) {
    console.error("Erro em buscarLiga:", err);
    return null;
  }
}

async function buscarPontuacoesParciais() {
  try {
    let fetchFunc = isBackend ? (await import("node-fetch")).default : fetch;
    const baseUrl = isBackend ? "http://localhost:3000" : "";
    const res = await fetchFunc(`${baseUrl}/api/cartola/atletas/pontuados`);
    if (!res.ok) throw new Error(`Erro ${res.status} ao buscar parciais`);
    const data = await res.json();
    return data.atletas || {};
  } catch (err) {
    console.error("Erro em buscarPontuacoesParciais:", err);
    return {};
  }
}

async function calcularPontosParciais(liga, rodada) {
  const atletasPontuados = await buscarPontuacoesParciais();
  const times = liga.times || [];
  const rankingsParciais = [];

  for (const time of times) {
    try {
      let fetchFunc = isBackend ? (await import("node-fetch")).default : fetch;
      const baseUrl = isBackend ? "http://localhost:3000" : "";
      const resTime = await fetchFunc(
        `${baseUrl}/api/cartola/time/id/${time.time_id}/${rodada}`,
      );

      if (!resTime.ok) {
        console.warn(
          `Erro ${resTime.status} ao buscar escalação do time ${time.time_id} para rodada ${rodada}`,
        );
        continue;
      }

      const escalacaoData = await resTime.json();
      const atletasEscalados = escalacaoData.atletas || [];
      const capitaoId = escalacaoData.capitao_id;

      let totalPontos = 0;
      atletasEscalados.forEach((atleta) => {
        const pontuacaoAtleta =
          atletasPontuados[atleta.atleta_id]?.pontuacao || 0;
        if (atleta.atleta_id === capitaoId) {
          totalPontos += pontuacaoAtleta * 1.5;
        } else {
          totalPontos += pontuacaoAtleta;
        }
      });

      rankingsParciais.push({
        ...time,
        totalPontos: totalPontos,
      });
    } catch (err) {
      console.error(
        `Erro ao processar parciais para o time ${time.time_id}:`,
        err,
      );
    }
  }

  return rankingsParciais;
}

// ==============================
// NOVAS FUNÇÕES PARA DEBUG E EXIBIÇÃO
// ==============================

// Função auxiliar para obter ID da liga da URL
function getLigaIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get('id');
  console.log("🔗 URL params:", window.location.search);
  console.log("🆔 Liga ID extraído:", ligaId);
  return ligaId;
}

// Buscar rodadas da API
async function buscarRodadas() {
  try {
    const ligaId = getLigaIdFromUrl();
    if (!ligaId) {
      console.error("ID da liga não encontrado na URL");
      return [];
    }

    console.log(`🔍 Buscando rodadas para liga: ${ligaId}`);
    const response = await fetch(`/api/ligas/${ligaId}/rodadas?inicio=1&fim=38`);

    if (!response.ok) {
      console.error(`❌ Erro HTTP: ${response.status} - ${response.statusText}`);
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const rodadas = await response.json();
    console.log(`✅ Rodadas recebidas: ${rodadas.length} registros`);

    if (rodadas.length > 0) {
      console.log("📊 Primeira rodada:", rodadas[0]);
      console.log("📊 Última rodada:", rodadas[rodadas.length - 1]);

      // Agrupar por rodada para verificar estrutura
      const rodadasAgrupadas = {};
      rodadas.forEach(r => {
        if (!rodadasAgrupadas[r.rodada]) {
          rodadasAgrupadas[r.rodada] = 0;
        }
        rodadasAgrupadas[r.rodada]++;
      });
      console.log("📈 Rodadas por número:", rodadasAgrupadas);
    } else {
      console.warn("⚠️ Nenhuma rodada encontrada no banco de dados");
    }

    return rodadas;
  } catch (error) {
    console.error("❌ Erro ao buscar rodadas:", error);
    return [];
  }
}

// Exibir rodadas na interface
function exibirRodadas(rodadas) {
  console.log("🎨 Iniciando exibição de rodadas...");
  console.log("📦 Dados recebidos:", rodadas);

  const container = document.getElementById("rodadas-lista");
  if (!container) {
    console.error("❌ Container 'rodadas-lista' não encontrado no DOM");
    return;
  }

  console.log("✅ Container encontrado:", container);

  if (!rodadas || rodadas.length === 0) {
    console.warn("⚠️ Nenhuma rodada para exibir");
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        Nenhuma rodada encontrada. Use o botão "Popular Rodadas" para carregar os dados.
      </div>
    `;
    return;
  }

  console.log(`🔢 Exibindo ${rodadas.length} registros de rodadas`);
  // A lógica original para criar os cards de rodada seria aqui, mas o código fornecido só inclui logs
  // Para fins deste exemplo, assumimos que a exibição correta é feita pelo 'renderizarMiniCardsRodadas'
  // Se houver um 'rodadas-lista' e 'rodadasCards', pode haver uma duplicação de funcionalidade ou um erro de design.
  // O 'renderizarMiniCardsRodadas' parece lidar com os mini cards na parte superior.
  // Se 'rodadas-lista' for para uma exibição mais detalhada, a lógica de mapeamento e criação de elementos estaria aqui.
  // Por exemplo:
  /*
  const rodadaCardsHTML = Object.entries(rodadas).map(([rodadaNum, jogos]) => {
    return `
      <div class="rodada-item" data-rodada="${rodadaNum}">
        <h3>Rodada ${rodadaNum}</h3>
        <ul>
          ${jogos.map(jogo => `<li>${jogo.time_casa} vs ${jogo.time_visitante}</li>`).join('')}
        </ul>
      </div>
    `;
  }).join('');
  container.innerHTML = rodadaCardsHTML;
  */
}

// Inicializar módulo de rodadas
async function inicializarRodadas() {
  console.log("🚀 [RODADAS] Inicializando módulo de rodadas...");
  console.log("🌐 [RODADAS] URL atual:", window.location.href);
  console.log("📍 [RODADAS] Pathname:", window.location.pathname);
  console.log("🔍 [RODADAS] Search:", window.location.search);

  // Verificar se estamos na página correta
  const naRodadas = window.location.pathname.includes('rodadas') || window.location.search.includes('secao=rodadas');
  console.log("✅ [RODADAS] Está na seção de rodadas?", naRodadas);

  if (!naRodadas) {
    console.log("⏭️ [RODADAS] Não está na seção de rodadas, pulando inicialização");
    return;
  }

  console.log("📥 [RODADAS] Chamando função principal de carregamento...");
  await carregarRodadas(false); // Usar a função principal exportada
  
  console.log("🔧 [RODADAS] Executando debug adicional...");
  await carregarRodadasDebug(); // Função de debug separada
}

// Carregar e exibir rodadas para debug
async function carregarRodadasDebug() {
  console.log("📊 [DEBUG] Iniciando carregamento de rodadas...");
  
  try {
    console.log("🌐 [DEBUG] Fazendo busca na API...");
    const rodadas = await buscarRodadas();
    console.log("📦 [DEBUG] Dados brutos recebidos:", rodadas?.length || 0, "registros");

    console.log("🔄 [DEBUG] Agrupando rodadas por número...");
    const rodadasAgrupadas = agruparRodadasPorNumero(rodadas);
    console.log("📊 [DEBUG] Rodadas agrupadas:", Object.keys(rodadasAgrupadas).length, "rodadas diferentes");

    console.log("🎨 [DEBUG] Iniciando exibição...");
    exibirRodadas(rodadasAgrupadas);
    console.log("✅ [DEBUG] Carregamento concluído com sucesso");

  } catch (error) {
    console.error("❌ [DEBUG] Erro ao carregar rodadas:", error);
    console.error("❌ [DEBUG] Erro completo:", error.stack);
  }
}

// Função para agrupar rodadas por número (necessária para exibirRodadas)
function agruparRodadasPorNumero(rodadas) {
  if (!rodadas) return {};
  const grouped = {};
  rodadas.forEach(rodada => {
    if (!grouped[rodada.rodada]) {
      grouped[rodada.rodada] = [];
    }
    grouped[rodada.rodada].push(rodada);
  });
  return grouped;
}

// Funções placeholder para loader e erro (assumindo que existem em outro lugar)
function mostrarLoader(message) { console.log(`[LOADER] ${message}`); }
function esconderLoader() { console.log("[LOADER] Escondendo..."); }
function mostrarErro(message) { console.error(`[ERRO] ${message}`); }


// Expor funções para debug global
if (isFrontend) {
  window.rodadasDebug = {
    carregarRodadasDebug,
    buscarRodadas,
    inicializarRodadas,
    agruparRodadasPorNumero,
    exibirRodadas,
    statusMercadoGlobal: () => statusMercadoGlobal,
    getLigaIdFromUrl,
  };
}

console.log(
  "[RODADAS] ✅ Módulo melhorado carregado - Mini Cards implementados",
);
console.log("[RODADAS] 🔧 Funções de debug disponíveis em window.rodadasDebug");